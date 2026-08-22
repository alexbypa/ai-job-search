# Roadmap: Integrazione MCP Server in Node.js (Corso Pratico)

Questo documento funge da "Syllabus" (Programma del corso). Lo useremo per tenere traccia dei nostri progressi e potrai riprenderlo in qualsiasi sessione futura. 

Essendo io il tuo "Professore", **non ti fornirò il codice finale da copiare e incollare**. Invece, per ogni modulo ti spiegherò:
1. L'obiettivo e i concetti teorici.
2. I link alla documentazione ufficiale `@modelcontextprotocol/sdk`.
3. Le istruzioni su cosa devi implementare nel codice.
Tu scriverai le righe per ripassare Node.js, e io correggerò o darò suggerimenti.

## User Review Required
> [!IMPORTANT]
> Leggi i moduli qui sotto. Se l'organizzazione didattica ti piace e ti è chiara, clicca su "Proceed" (Approva) e inizieremo subito la lezione del **Modulo 1**.

---

## Moduli del Corso

### [ ] Modulo 1: Setup e Inizializzazione del Server MCP (Express + SSE)
**Obiettivo**: Installare le dipendenze necessarie e creare lo scheletro di un server MCP indipendente usando Server-Sent Events (SSE) su HTTP.
**Argomenti Trattati**:
- `Server` e `SSEServerTransport` del pacchetto MCP.
- Integrazione con un web server Node.js (`express`).
- Lifecycle del server: connessione SSE (`/sse`) e ricezione messaggi (`/messages`).
**Riferimenti Ufficiali**: 
- [Model Context Protocol - Node.js SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Server Architecture & Transports (SSE)](https://modelcontextprotocol.io/docs/concepts/architecture#sse)

---

### [ ] Modulo 2: Definizione del Tool `analyze_job_url`
**Obiettivo**: Istruire il server a rispondere alla richiesta "Quali tool possiedi?", definendo il nostro strumento di analisi degli annunci.
**Argomenti Trattati**:
- Intercettare il gestore `ListToolsRequestSchema`.
- Scrivere un JSON Schema rigoroso (Zod o puro JSON) per gli argomenti che Claude dovrà passare (`url`, `evidenceKeywords`, ecc.).
**Riferimenti Ufficiali**:
- [Defining Tools in MCP](https://modelcontextprotocol.io/docs/concepts/tools)
- Documentazione TypeScript SDK: `Server.setRequestHandler`

---

### [ ] Modulo 3: Integrazione della Business Logic (Domain)
**Obiettivo**: Ricevere l'esecuzione del tool da Claude, far partire Playwright, valutare il Matcher e restituire il risultato.
**Argomenti Trattati**:
- Intercettare il gestore `CallToolRequestSchema`.
- Istanziare `PlaywrightScraper` e `WeightedJobMatcher` per analizzare l'URL richiesto.
- **Calcolo del FIT**: Trasformare lo score numerico (es. `score >= 6`) e la presenza di `evidenceKeywords` (es. "68/99") nei valori standard richiesti da Claude: **High, Medium, Low**.
- Formattare l'output nel tipo standard MCP (`CallToolResult`).
**Riferimenti Ufficiali**:
- [Handling Tool Calls in MCP](https://modelcontextprotocol.io/docs/concepts/tools#handling-tool-calls)

---

### [ ] Modulo 4: Configurazione in Claude 
**Obiettivo**: Registrare il tuo nuovo server MCP all'interno del sistema (es. Claude Desktop o Claude Code CLI).
**Argomenti Trattati**:
- Aggiunta del path del comando (es. `node D:\Work\Crawl\mcp-server.js`) nel file di configurazione MCP di sistema.
- Verifica del corretto caricamento del tool nell'agente.

---

### [ ] Modulo 5: Ottimizzazione e Refactoring (SKILL.md)
**Obiettivo**: Risolvere finalmente il problema dei token sprecati (Obiettivo 2)!
**Argomenti Trattati**:
- Modificare `.claude/skills/job-scraper/SKILL.md` (Step 3).
- Dire a Claude di non passare più interi testi a `GrepContentText`, ma di passare semplicemente l'URL al tuo nuovo tool `analyze_job_url`.
- Spiegare a Claude come usare la nuova stringa `fit` (High, Medium, Low) fornita direttamente dal Server Node.js per classificare e ordinare i risultati.
- Refactoring finale e test del flusso completo.

---
> [!NOTE]
> *Aggiorneremo questo file spuntando `[x]` ad ogni traguardo raggiunto!*
