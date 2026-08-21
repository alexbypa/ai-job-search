---
name: indeed-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for jobs on Indeed (specifically Indeed Italy). 
  Invoke for open positions, vacancies, and hiring across any sector or role 
  (software, data, design, marketing, finance, legal, operations, etc.). 
  The location is always supplied explicitly by the user (e.g., a city or "Da Remoto"). 
  Trigger phrases: find a job on indeed, indeed job search, cerca lavoro su indeed, 
  trova annunci su indeed, indeed search.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/indeed-search/cli/src/cli.ts *)
---

# Indeed Search Skill

Cerca annunci di lavoro attivi dalla versione pubblica di Indeed Italia per qualsiasi parola chiave e località (incluso il lavoro da remoto), senza necessità di autenticazione o chiavi API. Funziona tramite `bun` con zero dipendenze esterne.

## Quando usare questo skill

- Cercare annunci di lavoro su Indeed Italia.
- Filtrare per parola chiave (`--query`) e località (`--location`).
- Filtrare per recensione/pubblicazione recente degli annunci (`--jobage`).
- Ottenere la descrizione completa di un annuncio specifico tramite il suo ID (`vjk` o `jk`).

## Comandi

### 1. Ricerca annunci

```bash
bun run .agents/skills/indeed-search/cli/src/cli.ts search --location "<località>" [flags]
```

**Flag principali:**
- `--location <text>` / `-l <text>` — **richiesto.** Località dell'annuncio (es. `"Milano"`, `"Roma"`, o `"Da Remoto"`).
- `--query <text>` / `-q <text>` — Parola chiave della ricerca (es. `".net"`, `"frontend"`).
- `--jobage <days>` — Pubblicati negli ultimi N giorni (es. `1`, `3`, `7`, `14`, `60`). Mappa al parametro `fromage` di Indeed.
- `--page <n>` — Numero di pagina (1-indexed, con offset `start = (page - 1) * 10`).
- `--limit <n>` / `-n <n>` — Limite del numero di risultati da restituire.
- `--format json|table|plain` — default `json`.

### 2. Dettaglio annuncio

```bash
bun run .agents/skills/indeed-search/cli/src/cli.ts detail <vjk|url> [--format json|plain]
```

Accetta come parametro sia l'ID dell'annuncio (`vjk` / `jk`, es. `b6c534ea757d54c7` o `485d356186c35e50`) sia l'URL completo (es. `https://it.indeed.com/viewjob?jk=b6c534ea757d54c7`). Restituisce la descrizione completa dell'annuncio.

## Esempi d'uso

```bash
# Cerca ruoli .NET con località "Da Remoto"
bun run .agents/skills/indeed-search/cli/src/cli.ts search -q ".net" -l "Da Remoto" --format table

# Cerca sviluppatori Java a Milano negli ultimi 7 giorni
bun run .agents/skills/indeed-search/cli/src/cli.ts search -q "Java" -l "Milano" --jobage 7 --format table

# Mostra i dettagli completi di un annuncio tramite il suo vjk/jk
bun run .agents/skills/indeed-search/cli/src/cli.ts detail 485d356186c35e50 --format plain
```

## Formati di Output

| Formato | Utilizzo ottimale |
|--------|-------------------|
| `json` | Default — per uso programmatico dell'agente AI (passa gli ID a `detail`) |
| `table` | Scansione rapida leggibile da un operatore umano |
| `plain` | Lettura del testo completo del dettaglio del lavoro |

Ogni errore viene scritto su **stderr** come `{ "error": "...", "code": "..." }` e il processo esce con codice `1`.

## Note

- I dati vengono prelevati pubblicamente da Indeed Italia (it.indeed.com) senza credenziali.
- Gli ID degli annunci su Indeed corrispondono al parametro `vjk` o `jk` (es. `b6c534ea757d54c7`).
- Per il dettaglio si può interrogare l'URL standard `https://it.indeed.com/viewjob?jk=<ID>` oppure `https://it.indeed.com/?vjk=<ID>`.
