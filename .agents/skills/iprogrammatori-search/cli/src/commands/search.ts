import {
  SEARCH_URL,
  htmlFetch,
  parseJobCards,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage?: number
  limit?: number
  format: "json" | "table" | "plain"
}

function buildUrl(opts: SearchOpts): string {
  // Search criterion: s/<KeyWord>
  const keyword = opts.query || "csharp"
  return `${SEARCH_URL}/${encodeURIComponent(keyword)}`
}

function matchesLocation(c: JobCard, loc: string): boolean {
  const normLoc = loc.toLowerCase().trim()
  const cLoc = (c.location || "").toLowerCase()
  const cMode = (c.workMode || "").toLowerCase()

  // Handle remote keyword variations
  if (normLoc === "remoto" || normLoc === "da remoto" || normLoc === "remote") {
    return (
      cLoc.includes("remoto") ||
      cLoc.includes("remote") ||
      cMode.includes("remote") ||
      cMode.includes("smart")
    );
  }

  return cLoc.includes(normLoc) || cMode.includes(normLoc)
}

function matchesJobage(c: JobCard, maxDays: number): boolean {
  if (!c.date) return true // Include if date is unknown
  
  const jobDate = new Date(c.date)
  if (isNaN(jobDate.getTime())) return true

  const today = new Date()
  // Reset hours to compare dates cleanly
  today.setHours(0, 0, 0, 0)
  jobDate.setHours(0, 0, 0, 0)

  const diffTime = Math.abs(today.getTime() - jobDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays <= maxDays
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 42).padEnd(42)
    const company = (c.company || "—").slice(0, 26).padEnd(26)
    const loc = (c.location || "—").slice(0, 24).padEnd(24)
    const date = c.date || "—"
    return `${c.id.padEnd(16)} ${title} ${company} ${loc} ${date}`
  })
  const header =
    "ID".padEnd(16) +
    " " +
    "TITLE".padEnd(42) +
    " " +
    "COMPANY".padEnd(26) +
    " " +
    "LOCATION".padEnd(24) +
    " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const url = buildUrl(opts)
    const html = await htmlFetch(url)
    let cards = parseJobCards(html)

    // Client-side filtering
    if (opts.location) {
      cards = cards.filter((c) => matchesLocation(c, opts.location!))
    }
    if (opts.jobage !== undefined && opts.jobage > 0) {
      cards = cards.filter((c) => matchesJobage(c, opts.jobage!))
    }
    if (opts.limit !== undefined && opts.limit >= 0) {
      cards = cards.slice(0, opts.limit)
    }

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.date || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length }, results: cards },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
