import { DETAIL_URL, SEARCH_URL, htmlFetch, parseJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a raw job ID or Indeed URL and normalize it to a jk value. */
function normalizeId(input: string): string | null {
  // Se è un URL di Indeed, estrai jk o vjk
  const jkMatch = input.match(/[?&](?:jk|vjk)=([a-f0-9]{16})(?:&|$)/i)
  if (jkMatch) return jkMatch[1]
  
  // Se viene passato direttamente un ID alfanumerico esadecimale (solitamente 16 caratteri)
  const bareMatch = input.match(/^[a-f0-9]{16}$/i)
  if (bareMatch) return input

  // Fallback generico per chiavi alfanumeriche lunghe
  const fallbackMatch = input.match(/[a-f0-9]{12,24}/i)
  if (fallbackMatch) return fallbackMatch[0]

  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a job ID from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    // Pass standard search referer to simulate full browser flow and avoid captcha block
    const referer = `${SEARCH_URL}?q=developer&l=Da+Remoto`
    const html = await htmlFetch(`${DETAIL_URL}?jk=${id}`, referer)
    if (!html) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const job = parseJobDetail(html, id)

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}`,
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
        job.applyUrl ? `Apply: ${job.applyUrl}` : "",
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
