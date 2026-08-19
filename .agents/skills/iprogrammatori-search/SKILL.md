---
name: iprogrammatori-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for jobs on iProgrammatori (specifically IT jobs in Italy). 
  Invoke for open positions, vacancies, and hiring for developers, engineers, and programmers. 
  The search criterion is s/<KeyWord>.
  Trigger phrases: find a job on iprogrammatori, iprogrammatori job search, cerca lavoro su iprogrammatori,
  iprogrammatori search, csharp jobs.
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/iprogrammatori-search/cli/src/cli.ts *)
---

# iProgrammatori Search Skill

Cerca annunci di lavoro attivi sul portale italiano iProgrammatori.it per qualsiasi parola chiave, senza necessità di autenticazione o chiavi API. Funziona tramite `bun` con zero dipendenze esterne.

## Quando usare questo skill

- Cercare annunci di lavoro su iProgrammatori.it.
- Filtrare per parola chiave (`--query`).
- Filtrare opzionalmente per località (`--location`) e recensione/pubblicazione recente degli annunci (`--jobage`).
- Ottenere la descrizione completa di un annuncio specifico tramite il suo URL o ID numerico.

## Comandi

### 1. Ricerca annunci

```bash
bun run .agents/skills/iprogrammatori-search/cli/src/cli.ts search --query "<parola_chiave>" [flags]
```

**Flag principali:**
- `--query <text>` / `-q <text>` — **consigliato.** Parola chiave della ricerca (es. `"csharp"`, `"dotnet"`, `"java"`). Se non passata, cerca annunci per "csharp" di default.
- `--location <text>` / `-l <text>` — Località dell'annuncio (es. `"Milano"`, `"Roma"`, o `"Remoto"`).
- `--jobage <days>` — Pubblicati negli ultimi N giorni (es. `1`, `3`, `7`, `14`).
- `--limit <n>` / `-n <n>` — Limite del numero di risultati da restituire.
- `--format json|table|plain` — default `json`.

### 2. Dettaglio annuncio

```bash
bun run .agents/skills/iprogrammatori-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

Accetta come parametro sia l'ID numerico dell'annuncio (es. `170803`) sia l'URL completo (es. `https://www.iprogrammatori.it/lavoro/ricerca_sviluppatore-dotnet-angular-smart-working_170803.aspx`). Restituisce la descrizione completa dell'annuncio.

## Esempi d'uso

```bash
# Cerca ruoli C#
bun run .agents/skills/iprogrammatori-search/cli/src/cli.ts search -q "csharp" --format table

# Cerca sviluppatori Java con località "Remoto"
bun run .agents/skills/iprogrammatori-search/cli/src/cli.ts search -q "java" -l "Remoto" --format table

# Mostra i dettagli completi di un annuncio tramite il suo ID
bun run .agents/skills/iprogrammatori-search/cli/src/cli.ts detail 170803 --format plain
```

## Formati di Output

| Formato | Utilizzo ottimale |
|--------|-------------------|
| `json` | Default — per uso programmatico dell'agente AI (passa gli ID/URL a `detail`) |
| `table` | Scansione rapida leggibile da un operatore umano |
| `plain` | Lettura del testo completo del dettaglio del lavoro |

Ogni errore viene scritto su **stderr** come `{ "error": "...", "code": "..." }` e il processo esce con codice `1`.
