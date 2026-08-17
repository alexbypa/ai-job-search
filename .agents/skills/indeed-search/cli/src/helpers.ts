// Data source: Indeed public search and viewjob pages. No authentication required.
// Search parses the window.mosaic JSON block or application/ld+json script tags.
// Detail parses the application/ld+json block or jobsearch HTML layout.
// To bypass Cloudflare blocks, we fetch using Windows' native curl.exe with cookie session preservation.

import os from "os"
import path from "path"
import { execFileSync } from "child_process"

export const SEARCH_URL = "https://it.indeed.com/jobs"
export const DETAIL_URL = "https://it.indeed.com/viewjob"

const COOKIE_FILE = path.join(os.tmpdir(), "indeed-search-cookies.txt")

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

/** Fetch HTML using curl.exe to bypass TLS fingerprinting and maintain cookies. */
export async function htmlFetch(url: string, referer?: string): Promise<string> {
  const maxRetries = 6
  let delay = 1000
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const args = [
        "-s",
        "-L",
        "-c", COOKIE_FILE,
        "-b", COOKIE_FILE,
        "-A", UA,
        "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "-H", "Accept-Language: it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        "-H", "Upgrade-Insecure-Requests: 1",
        "-H", "Sec-Fetch-Dest: document",
        "-H", "Sec-Fetch-Mode: navigate",
        "-H", "Sec-Fetch-Site: same-origin",
        "-H", "Sec-Fetch-User: ?1",
      ]
      
      if (referer) {
        args.push("-e", referer)
      } else {
        // Default referer looks like we came from home page
        args.push("-e", "https://it.indeed.com/")
      }
      
      args.push(url)

      const stdout = execFileSync("curl.exe", args, { 
        encoding: "utf-8", 
        maxBuffer: 10 * 1024 * 1024 
      })
      
      const isCaptcha = stdout.includes("Security Check - Indeed.com") || stdout.includes("window.INDEED_CLOUDFLARE_STATIC_PAGE")
      if (isCaptcha) {
        throw new Error("Indeed requested captcha (403/Cloudflare Block)")
      }

      if (stdout.includes("window.mosaic") || stdout.includes("JobPosting") || stdout.includes("<html")) {
        return stdout
      }
      
      if (attempt === maxRetries) {
        throw new Error("Empty or invalid HTML response from Indeed")
      }
    } catch (e) {
      if (attempt === maxRetries) {
        throw e
      }
    }
    
    // Attesa con exponential backoff e jitter
    const jitter = Math.floor(Math.random() * 500)
    await new Promise((r) => setTimeout(r, delay + jitter))
    delay = Math.min(delay * 2, 8000)
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  companyUrl: string | null
  location: string | null
  date: string | null
  url: string
}

export interface JobDetail extends JobCard {
  description: string | null
  seniority: string | null
  employmentType: string | null
  jobFunction: string | null
  industries: string | null
  applyUrl: string | null
}

/**
 * Extract the inner HTML of a <div> identified by a CSS class name, correctly
 * handling nested <div> elements by tracking tag depth.
 */
export function extractDivContent(html: string, className: string): string | null {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const openRe = new RegExp(`<div[^>]*class="[^"]*${escaped}[^"]*"[^>]*>`, 'i')
  const open = openRe.exec(html)
  if (!open) return null

  let i = open.index + open[0].length
  let depth = 1

  while (depth > 0 && i < html.length) {
    const nextOpen = html.indexOf('<div', i)
    const nextClose = html.indexOf('</div>', i)

    if (nextClose === -1) return null

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen + 4
    } else {
      depth--
      i = nextClose + 6
    }
  }

  return html.slice(open.index + open[0].length, i - 6)
}

/**
 * Convert a Unicode code point to a string. Uses `fromCodePoint` (not
 * `fromCharCode`) so supplementary-plane code points (e.g. emoji, U+1F600)
 * decode correctly, and drops out-of-range values instead of throwing.
 */
function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Numeric character references: decimal (&#233;) and hexadecimal (&#xE9;).
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function clean(html: string): string {
  return decodeHtmlEntities(stripTags(html))
}

/** Parse Indeed search results. */
export function parseJobCards(html: string): JobCard[] {
  const results: JobCard[] = []

  // 1. Prova ad estrarre dal JSON di window.mosaic.providerData["mosaic-provider-jobcards"]
  const mosaicMatch = html.match(/window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*(\{[\s\S]*?\});/)
  if (mosaicMatch) {
    try {
      const data = JSON.parse(mosaicMatch[1])
      const listings = data?.metaData?.mosaicProviderJobCardsModel?.results || []
      for (const item of listings) {
        if (!item.jobkey) continue
        results.push({
          id: item.jobkey,
          title: clean(item.title || item.displayTitle || ""),
          company: item.company || null,
          companyUrl: item.companyRatingLink ? `https://it.indeed.com${item.companyRatingLink}` : null,
          location: item.formattedLocation || item.companyCity || null,
          date: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : null,
          url: `https://it.indeed.com/viewjob?jk=${item.jobkey}`,
        })
      }
    } catch (e) {
      // Ignora errori di parsing mosaic e passa al fallback
    }
  }

  // 2. Fallback su blocchi standard application/ld+json JobPosting
  if (results.length === 0) {
    const scriptRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    let match
    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1])
        if (data["@type"] === "JobPosting") {
          const id = data.identifier?.value || data.url?.match(/[?&]jk=([^&]+)/)?.[1] || Math.random().toString(36).substring(2, 10)
          results.push({
            id,
            title: clean(data.title || ""),
            company: data.hiringOrganization?.name || null,
            companyUrl: null,
            location: data.jobLocation?.address?.addressLocality || null,
            date: data.datePosted ? data.datePosted.split("T")[0] : null,
            url: data.url || `https://it.indeed.com/viewjob?jk=${id}`,
          })
        }
      } catch (e) {
        // Ignora blocchi malformati
      }
    }
  }

  return results
}

/** Parse the single-job detail page. */
export function parseJobDetail(html: string, id: string): JobDetail {
  let title = ""
  let company: string | null = null
  let location: string | null = null
  let description: string | null = null
  let date: string | null = null
  let applyUrl: string | null = null

  // Cerca il blocco JSON-LD del JobPosting
  const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  if (ldJsonMatch) {
    try {
      const data = JSON.parse(ldJsonMatch[1])
      if (data["@type"] === "JobPosting" || data["@context"]?.includes("schema.org")) {
        title = data.title || ""
        company = data.hiringOrganization?.name || null
        location = data.jobLocation?.address?.addressLocality || null
        date = data.datePosted ? data.datePosted.split("T")[0] : null
        applyUrl = data.url || null
        
        if (data.description) {
          const withBreaks = data.description
            .replace(/<\s*br\s*\/?>/gi, "\n")
            .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
          description = decodeHtmlEntities(clean(withBreaks)).replace(/\n{3,}/g, "\n\n").trim() || null
        }
      }
    } catch (e) {
      // Ignora errori e passa al fallback
    }
  }

  // Fallback se JSON-LD fallisce o mancano dettagli
  if (!title) {
    const titleMatch = html.match(/<h1[^>]*class="[^"]*jobsearch-JobInfoHeader-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
    if (titleMatch) title = clean(titleMatch[1])
  }
  if (!company) {
    const compMatch = html.match(/<div[^>]*class="[^"]*jobsearch-CompanyInfoContainer[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || html.match(/<div[^>]*data-company-name="true"[^>]*>([\s\S]*?)<\/div>/i)
    if (compMatch) company = clean(compMatch[1])
  }
  if (!location) {
    const locMatch = html.match(/<div[^>]*class="[^"]*jobsearch-JobInfoContainer-location[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    if (locMatch) location = clean(locMatch[1])
  }
  if (!description) {
    const descContent = extractDivContent(html, "jobsearch-jobDescriptionText")
    if (descContent) {
      const withBreaks = descContent
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
      description = decodeHtmlEntities(clean(withBreaks)).replace(/\n{3,}/g, "\n\n").trim() || null
    }
  }

  return {
    id,
    title: title || "(untitled)",
    company,
    companyUrl: null,
    location,
    date,
    url: `https://it.indeed.com/viewjob?jk=${id}`,
    description,
    seniority: null,
    employmentType: null,
    jobFunction: null,
    industries: null,
    applyUrl: applyUrl || `https://it.indeed.com/viewjob?jk=${id}`,
  }
}

/** Convert a job-age in days to Indeed fromage value. */
export function jobageToFromage(days: number): string | null {
  if (!days || days <= 0 || days >= 9999) return null
  return String(days)
}
