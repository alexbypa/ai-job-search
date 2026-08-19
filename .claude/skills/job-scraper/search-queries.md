# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first (e.g. `linkedin-search` and `indeed-search`).

The query terms below are **platform-agnostic** and must be used identically across all recruiting portals. When running a search:
1. Pass the terms below as the query parameter (`--query` / `-q`) to the portal CLIs.
2. Set the location and remote filters using the portal's specific command flags (e.g., `--location "Remote" --remote remote` for LinkedIn, or `--location "Da Remoto"` for Indeed), rather than embedding location words in the query itself.
3. For the **WebSearch fallback** (when a CLI is unavailable or fails), the agent should dynamically prepend the appropriate site filter (e.g., `site:linkedin.com/jobs` or `site:it.indeed.com/jobs`) to these query terms.

**Language scope:** write every query category in every language listed in your CLAUDE.md Languages table (typically 1-2, sometimes more). Translate each category's keywords rather than machine-translating word-for-word.

## Search Sites

Primary:
- **linkedin.com/jobs** - Covered by `linkedin-search` CLI
- **it.indeed.com** - Covered by `indeed-search` CLI
- **iprogrammatori.it** - Covered by `iprogrammatori-search` CLI
- **[YOUR_JOB_BOARD]** - your market's largest general job board (if any)

Secondary (company career pages via Google):
- Direct Google searches with `site:` filters for known target companies

## Query Categories

Queries are grouped by priority. Write **each category in every language from your Languages table** (Italian / English).

### Priority 1: Senior .NET Backend Developer (Italian / English)

These match your strongest and most desired career direction.

```
"Senior .NET Developer" "categorie protette"
"C# Backend Developer" "categorie protette"
"Senior Backend Developer" C# "categorie protette"
```

### Priority 2: AI Backend Engineering & Integrations

These match your domain expertise in LLMs, MCP, and messaging pipelines.

```
"AI Backend Engineer" "categorie protette"
"Model Context Protocol" C# "categorie protette"
"Semantic Kernel" C# "categorie protette"
.NET RabbitMQ Kafka "categorie protette"
```

### Priority 3: Lead Software Developer / System Architect

Adjacent roles or leadership roles.

```
"Lead Developer" .NET "categorie protette"
"Software Architect" .NET "categorie protette"
```

### Priority 4: Broader Technical roles in .NET

Wider net for general .NET / backend developer roles.

```
".NET Developer" "categorie protette"
"C# Developer" "categorie protette"
"C#" "68/99"
".NET" "68/99"
```

## Location Filter

When evaluating results, verify the job location is within acceptable commute/remote requirements:
- **Preferred:** Full Remote (Italia / Europe-compatible timezones)
- **Acceptable:** Hybrid in Palermo, Italy (if any exists, though Remote is highly preferred)
- **Too Far:** Any mandatory on-site role outside Palermo, Italy.

## Language Filter

Your working languages and levels are in CLAUDE.md's Languages table. When filtering scraped results, apply `04-job-evaluation.md`'s Language Gate: a posting requiring a language you haven't declared at all is excluded; a posting requiring a higher level than you declared in a language you do work in is not excluded, flag it clearly instead (see `job-scraper/SKILL.md`'s Step 3 "Quick Fit Assessment" for how the flag surfaces in `/scrape` output). Postings simply *written* in a language you don't work in, that don't require it on the job, are fine.

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
