import { htmlFetch, parseJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string // Can be a numeric ID or the full URL
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  let url = opts.id
  
  if (!url.startsWith("http")) {
    // If it's a bare ID, we can't fetch it directly because the site requires the URL slug.
    // Check if it's numeric.
    if (/^\d+$/.test(url)) {
      writeError(`iProgrammatori requires the full job URL to fetch details, got numeric ID: "${opts.id}"`, "URL_REQUIRED")
      return 1
    } else {
      writeError(`Invalid URL or job ID: "${opts.id}"`, "BAD_ID")
      return 1
    }
  }

  try {
    const html = await htmlFetch(url)
    if (!html) {
      writeError("Job details page not found", "NOT_FOUND")
      return 1
    }
    const job = parseJobDetail(html, url)

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}`,
        `Modalità: ${job.workMode || "—"} · Impegno: ${job.commitment || "—"}`,
        job.salary ? `Retribuzione: ${job.salary}` : "",
        job.contractType ? `Contratto: ${job.contractType}` : "",
        "",
        "DESCRIZIONE:",
        job.description || "(no description)",
        "",
        job.requirements ? "COMPETENZE RICHIESTE:\n" + job.requirements : "",
        "",
        `URL: ${job.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
