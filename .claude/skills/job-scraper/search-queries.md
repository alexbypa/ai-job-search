# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. Shipped country-agnostic CLIs include `linkedin-search` and `freehire-search`; Danish demos and any skill you add with `/add-portal` are included the same way. You do **not** need a matching `site:` line below for those CLIs to run.

The `site:` query templates in this file are the **WebSearch fallback** — for portals without a CLI, company career pages, or when a CLI fails.

**Language scope:** write every query category in every language listed in your CLAUDE.md Languages table (typically 1-2, sometimes more). A posting requiring a language you have *not* declared, as a job condition, is excluded before scoring; a posting requiring a *higher level* than you declared in a language you *do* work in is flagged for your own judgment, not excluded — see `04-job-evaluation.md`'s Language Gate, the single source of truth for this rule. Translate each category's keywords rather than machine-translating word-for-word (e.g. "Frontend Developer" -> "Desarrollador Frontend", not a literal word-for-word translation) if you work in more than one language.

## Search Sites

Primary (your market's job boards - scaffold one with `/add-portal`):
- **[YOUR_JOB_BOARD]** - your market's largest general job board
- **linkedin.com/jobs** - LinkedIn job listings (filter: [YOUR_COUNTRY] / [YOUR_CITY]); also covered by `linkedin-search` CLI
- **[YOUR_INDUSTRY_JOB_BOARD]** - a niche/industry board for your field (optional)
- **[YOUR_ADDITIONAL_JOB_BOARD]** - another major board for your market (optional)

Secondary (company career pages via Google):
- Direct Google searches with `site:` filters for known target companies

## Query Categories

Queries are grouped by priority. Write **each category in every language from your Languages table** (see Language scope above). Combine each query with your location terms (e.g. your city, region, or metro area) where the site supports it.

### Priority 1: Senior .NET Backend Developer (Italian / English)

These match your strongest and most desired career direction.

```
site:linkedin.com/jobs "Senior .NET Developer" "Italy"
site:linkedin.com/jobs "C# Backend Developer" "Italy"
site:linkedin.com/jobs "Senior Backend Developer" C# "Italy"
```

### Priority 2: AI Backend Engineering & Integrations

These match your domain expertise in LLMs, MCP, and messaging pipelines.

```
site:linkedin.com/jobs "AI Backend Engineer" "Italy"
site:linkedin.com/jobs "Model Context Protocol" C#
site:linkedin.com/jobs "Semantic Kernel" C#
site:linkedin.com/jobs .NET RabbitMQ Kafka "Italy"
```

### Priority 3: Lead Software Developer / System Architect

Adjacent roles or leadership roles.

```
site:linkedin.com/jobs "Lead Developer" .NET "Italy"
site:linkedin.com/jobs "Software Architect" .NET "Italy"
```

### Priority 4: Broader Technical roles in .NET

Wider net for general .NET / backend developer roles.

```
site:linkedin.com/jobs ".NET Developer" Remote "Italy"
site:linkedin.com/jobs "C# Developer" Remote "Italy"
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
