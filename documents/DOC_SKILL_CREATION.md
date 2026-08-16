# Guida alla Creazione di Skill di Ricerca Lavoro per Agenti AI

Questa guida spiega come progettare e sviluppare uno **Skill di Ricerca** compatibile con la struttura di questo progetto e con i moderni agenti AI (come Gemini/Antigravity o Claude Code). 

Lo scopo di uno Skill è fornire all'AI uno "strumento" (un tool CLI) per cercare in modo autonomo offerte di lavoro su un portale specifico e consumarle in formato JSON standardizzato.

---

## 1. Architettura di uno Skill

Ogni Skill del progetto risiede nella cartella `.agents/skills/<nome-portale-search>/` e segue questa struttura canonica:

```
<nome-portale>-search/
├── SKILL.md              # Contratto e trigger per l'agente AI (Cervello)
├── url-reference.md      # Riferimento tecnico delle chiamate HTTP/API
└── cli/                  # Codice sorgente del tool CLI
    ├── package.json      # Configurazione ed eventuali dipendenze (preferibile zero dipendenze)
    ├── tsconfig.json     # Configurazione di TypeScript
    ├── README.md         # Documentazione d'uso per gli umani
    └── src/
        ├── cli.ts        # Punto di ingresso del comando, parsing argomenti
        ├── helpers.ts    # Funzioni di utilità (fetch resiliente, parser regex)
        └── commands/
            ├── search.ts # Logica del comando "search"
            └── detail.ts # Logica del comando "detail"
```

---

## 2. Il Contratto dello Skill (`SKILL.md`)

Il file `SKILL.md` è il punto di contatto tra l'AI e il tuo strumento. Descrive le frasi di attivazione (trigger) e le regole per comporre i comandi.

### Esempio di Struttura di `SKILL.md`:

```markdown
---
name: indeed-italy-search
version: 1.0.0
description: >
  Usa questo skill per cercare offerte di lavoro su Indeed Italia. 
  Supporta filtri per parola chiave, località e lavoro remoto.
  Trigger phrases: "cerca lavoro su indeed", "trova annunci in italia su indeed", "indeed search"
context: fork
enabled: true
allowed-tools: Bash(bun run .agents/skills/indeed-italy-search/cli/src/cli.ts *)
---

# Indeed Italy Search Skill

Questo skill interroga la versione italiana di Indeed pubblica senza necessità di login o chiavi API.

## Comandi Supportati

### 1. Ricerca Annunci
```bash
bun run .agents/skills/indeed-italy-search/cli/src/cli.ts search --query "<chiave>" -l "<località>" [flags]
```
**Flag principali:**
* `--query <testo>` / `-q <testo>`: Parole chiave (es. "developer .net").
* `--location <testo>` / `-l <testo>`: Città o "Remote" per il lavoro da remoto.
* `--jobage <giorni>`: Annunci pubblicati negli ultimi N giorni (es. 14).
* `--format json|table`: Formato di output. Default `json`.

### 2. Dettaglio Annuncio
```bash
bun run .agents/skills/indeed-italy-search/cli/src/cli.ts detail <ID|URL>
```
Scarica l'intera descrizione testuale associata all'ID dell'annuncio.
```

---

## 3. Il Contratto di Output per l'AI

Affinché l'AI possa concatenare i comandi (es. fare una ricerca, prendere gli ID e scaricare i dettagli), il tool CLI deve rispettare regole rigide di Input/Output:

1. **Output in caso di Successo (stdout):**
   * Il comando `search` deve restituire un JSON con questa forma:
     ```json
     {
       "meta": { "count": 10, "page": 1 },
       "results": [
         {
           "id": "12345678",
           "title": "Senior .NET Developer",
           "company": "Tech Company S.r.l.",
           "location": "Milano, Lombardia",
           "date": "2026-08-16",
           "url": "https://it.indeed.com/viewjob?jk=12345678"
         }
       ]
     }
     ```
2. **Output in caso di Errore (stderr):**
   * Qualsiasi errore non deve essere stampato sullo standard output (`stdout`), ma solo sullo standard error (`stderr`) in formato JSON ed il processo deve uscire con codice `1`:
     ```json
     { "error": "La località è richiesta", "code": "MISSING_LOCATION" }
     ```

---

## 4. Esempio di Logica del Parser (TypeScript con Bun)

Consigliamo di implementare il tool con **zero dipendenze esterne** (usando solo il runtime di Bun ed espressioni regolari per il parsing), per due motivi:
1. **Velocità:** Bun esegue all'istante senza build step.
2. **Portabilità:** Non rischia di rompersi a causa di aggiornamenti di librerie di terze parti.

### Esempio del file `src/commands/search.ts` (Logica di Scraping):

```typescript
export async function runSearch(options: { query: string; location: string; limit: number }) {
  // 1. Costruisci l'URL di ricerca del portale
  const searchUrl = `https://it.indeed.com/jobs?q=${encodeURIComponent(options.query)}&l=${encodeURIComponent(options.location)}`;
  
  // 2. Esegui la fetch con un User-Agent credibile
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; indeed-italy-cli/1.0)"
    }
  });

  if (!response.ok) {
    throw new Error(`Errore HTTP: ${response.status}`);
  }

  const html = await response.text();
  const results = [];

  // 3. Estrai le informazioni usando Regex mirate o parsing di stringhe
  // Nota: I portali racchiudono spesso i dati strutturati degli annunci dentro dei blocchi JSON interni (es. <script type="application/ld+json">)
  const scriptRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data["@type"] === "JobPosting") {
        results.push({
          id: data.identifier?.value || Math.random().toString(),
          title: data.title,
          company: data.hiringOrganization?.name,
          location: data.jobLocation?.address?.addressLocality || options.location,
          date: data.datePosted ? data.datePosted.split("T")[0] : null,
          url: data.url
        });
      }
    } catch (e) {
      // Ignora blocchi JSON non validi o non inerenti agli annunci
    }
  }

  // 4. Stampa l'output finale in formato JSON su stdout
  console.log(JSON.stringify({
    meta: { count: results.length, page: 1 },
    results: results.slice(0, options.limit)
  }, null, 2));
}
```

---

## 5. Come Integrare il Nuovo Skill nel Flusso Automatico `/scrape`

Una volta creato il tuo skill sotto la cartella `.agents/skills/`:
1. Il modulo principale del progetto (il workflow `/scrape`) **rileverà automaticamente** il nuovo skill leggendo il file `SKILL.md`.
2. Verrà eseguito in parallelo agli altri scraper (come LinkedIn).
3. I risultati del nuovo portale verranno unificati e passati al modulo di valutazione fit (`04-job-evaluation.md`), escludendo i duplicati grazie alla sincronizzazione con `job_scraper/seen_jobs.json`.
