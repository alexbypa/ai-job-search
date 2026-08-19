// Data source: iProgrammatori public job board. No authentication required.
// Search and details are parsed directly from public HTML layouts using Windows native curl.exe.

import os from "os"
import path from "path"
import { execFileSync } from "child_process"

export const BASE_URL = "https://www.iprogrammatori.it"
export const SEARCH_URL = "https://www.iprogrammatori.it/lavoro/s"

const COOKIE_FILE = path.join(os.tmpdir(), "iprogrammatori-search-cookies.txt")

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

/** Fetch HTML using curl.exe to bypass TLS fingerprinting and TLS errors. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 3
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
        "-e", "https://www.iprogrammatori.it/lavoro/",
        url
      ]

      const stdout = execFileSync("curl.exe", args, { 
        encoding: "utf-8", 
        maxBuffer: 10 * 1024 * 1024 
      })
      
      if (stdout.includes("<html") || stdout.includes("<table")) {
        return stdout
      }
      
      if (attempt === maxRetries) {
        throw new Error("Empty or invalid HTML response from iProgrammatori")
      }
    } catch (e) {
      if (attempt === maxRetries) {
        throw e
      }
    }
    
    const jitter = Math.floor(Math.random() * 300)
    await new Promise((r) => setTimeout(r, delay + jitter))
    delay = Math.min(delay * 2, 4000)
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  companyUrl: string | null
  location: string | null
  workMode: string | null
  date: string | null
  url: string
}

export interface JobDetail extends JobCard {
  description: string | null
  requirements: string | null
  contractType: string | null
  commitment: string | null
  salary: string | null
  applyUrl: string | null
}

/**
 * Convert a Unicode code point to a string.
 */
function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&euro;/g, "€")
    .replace(/&deg;/g, "°")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&ograve;/g, "ò")
    .replace(/&ugrave;/g, "ù")
    .replace(/&igrave;/g, "ì")
    // Numeric character references: decimal (&#233;) and hexadecimal (&#xE9;).
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

export function clean(html: string): string {
  return decodeHtmlEntities(stripTags(html))
}

/** Parse search results page. */
export function parseJobCards(html: string): JobCard[] {
  const results: JobCard[] = []

  // Extract the main jobs table rows
  const tableRegex = /<table[^>]*class="[^"]*table[^"]*"[^>]*>([\s\S]*?)<\/table>/i
  const tableMatch = html.match(tableRegex)
  if (!tableMatch) return results

  const tableHtml = tableMatch[1]
  const trRegex = /<tr>([\s\S]*?)<\/tr>/gi
  let match

  while ((match = trRegex.exec(tableHtml)) !== null) {
    const rowHtml = match[1]
    
    // Skip headers (which have <th> tags instead of <td>)
    if (rowHtml.includes("<th")) continue

    // Extract Date
    const dateMatch = rowHtml.match(/data-label="Data">([\s\S]*?)<\/td>/i)
    let date: string | null = null
    if (dateMatch) {
      const timeMatch = dateMatch[1].match(/datetime="([^"]+)"/i)
      if (timeMatch) {
        date = timeMatch[1].split("T")[0]
      } else {
        date = clean(dateMatch[1])
      }
    }

    // Extract Title and URL
    const titleMatch = rowHtml.match(/data-label="Ruolo">([\s\S]*?)<\/td>/i)
    let title = ""
    let url = ""
    if (titleMatch) {
      const linkMatch = titleMatch[1].match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
      if (linkMatch) {
        url = linkMatch[1]
        // Ensure absolute URL
        if (url.startsWith("/")) {
          url = BASE_URL + url
        }
        title = clean(linkMatch[2])
      } else {
        title = clean(titleMatch[1])
      }
    }

    if (!url) continue

    // Extract Company
    const compMatch = rowHtml.match(/data-label="Azienda">([\s\S]*?)<\/td>/i)
    const company = compMatch ? clean(compMatch[1]) : null

    // Extract Location
    const locMatch = rowHtml.match(/data-label="Sede di lavoro">([\s\S]*?)<\/td>/i)
    const location = locMatch ? clean(locMatch[1]) : null

    // Extract Work Mode
    const modeMatch = rowHtml.match(/data-label="Modalità">([\s\S]*?)<\/td>/i)
    const workMode = modeMatch ? clean(modeMatch[1]) : null

    // Extract ID from URL
    const idMatch = url.match(/_(\d+)\.aspx/)
    const id = idMatch ? idMatch[1] : url

    results.push({
      id,
      title,
      company,
      companyUrl: null,
      location,
      workMode,
      date,
      url,
    })
  }

  return results
}

/** Parse detail page. */
export function parseJobDetail(html: string, idOrUrl: string): JobDetail {
  let url = idOrUrl
  let id = idOrUrl
  if (!idOrUrl.includes("http")) {
    // If it's just an numeric ID, we don't have the slug but we can save it as ID.
    // Detail page is fetched using URL, so if we only had ID, we would have failed to fetch unless we had the URL.
    // But since detail fetches a URL, idOrUrl is likely the URL.
    url = idOrUrl
  } else {
    const idMatch = idOrUrl.match(/_(\d+)\.aspx/)
    if (idMatch) id = idMatch[1]
  }

  // Parse header title
  const h1Match = html.match(/<header[^>]*class="box-content-headline"[^>]*>[\s\S]*?<h1>([\s\S]*?)<\/h1>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const title = h1Match ? clean(h1Match[1]) : "(untitled)"

  // Parse job facts (Azienda, Aggiornato il, Ruolo, Luogo lavoro, Modalità, Impegno, Retribuzione, Tipo di contratto)
  let company: string | null = null
  let date: string | null = null
  let location: string | null = null
  let workMode: string | null = null
  let commitment: string | null = null
  let salary: string | null = null
  let contractType: string | null = null

  const factsRegex = /<dl[^>]*class="[^"]*job-facts[^"]*"[^>]*>([\s\S]*?)<\/dl>/i
  const factsMatch = html.match(factsRegex)
  if (factsMatch) {
    const factsHtml = factsMatch[1]
    const factBlocksRegex = /<div>([\s\S]*?)<\/div>/gi
    let factMatch
    while ((factMatch = factBlocksRegex.exec(factsHtml)) !== null) {
      const blockHtml = factMatch[1]
      const dtMatch = blockHtml.match(/<dt>([\s\S]*?)<\/dt>/i)
      const ddMatch = blockHtml.match(/<dd>([\s\S]*?)<\/dd>/i)
      if (dtMatch && ddMatch) {
        const key = clean(dtMatch[1]).toLowerCase()
        const value = ddMatch[1]

        if (key.includes("azienda")) {
          company = clean(value)
        } else if (key.includes("aggiornato")) {
          const timeMatch = value.match(/datetime="([^"]+)"/i)
          date = timeMatch ? timeMatch[1].split("T")[0] : clean(value)
        } else if (key.includes("luogo")) {
          location = clean(value)
        } else if (key.includes("modalità")) {
          workMode = clean(value)
        } else if (key.includes("impegno")) {
          commitment = clean(value)
        } else if (key.includes("retribuzione")) {
          salary = clean(value)
        } else if (key.includes("contratto")) {
          contractType = clean(value)
        }
      }
    }
  }

  // Extract description section
  const descMatch = html.match(/<section[^>]*aria-labelledby="job-description-title"[^>]*>([\s\S]*?)<\/section>/i)
  let description: string | null = null
  if (descMatch) {
    const content = descMatch[1]
      .replace(/<h2[^>]*>.*?<\/h2>/i, "") // Remove the description title heading
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
    description = decodeHtmlEntities(clean(content)).replace(/\n{3,}/g, "\n\n").trim()
  }

  // Extract requirements section
  const reqMatch = html.match(/<section[^>]*aria-labelledby="requirements-skills-title"[^>]*>([\s\S]*?)<\/section>/i)
  let requirements: string | null = null
  if (reqMatch) {
    const content = reqMatch[1]
      .replace(/<h2[^>]*>.*?<\/h2>/i, "") // Remove requirements title heading
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
    requirements = decodeHtmlEntities(clean(content)).replace(/\n{3,}/g, "\n\n").trim()
  }

  return {
    id,
    title,
    company,
    companyUrl: null,
    location,
    workMode,
    date,
    url,
    description,
    requirements,
    contractType,
    commitment,
    salary,
    applyUrl: url,
  }
}
