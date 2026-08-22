# Modulo 6: Trasparenza, Punteggi e Architettura (Roadmap)

Questo documento definisce i prossimi step per portare il sistema di scraping a un livello di maturità definitivo. Per facilitare lo sviluppo in più sessioni separate, il lavoro è stato suddiviso in **Sotto-Moduli indipendenti**.

## Modulo 6.1: Centralizzazione delle Keyword e Fix del Bug `.env`

**Obiettivo:** Rimuovere l'hardcoding delle keyword da Claude e far leggere i pesi (inclusi quelli di esclusione) direttamente al server Node.js dal file `.env`.

> [!WARNING]
> **Bug Rilevato:** 
> Attualmente `SKILL.md` passa solo `filterKeywords` ed `evidenceKeywords` (con valori hardcoded) e dimentica `excludeKeywords`. Inoltre, `mcp-server.js` ignora completamente la configurazione delle regex presente nel file `.env`.

**Modifiche Proposte:**
- **[MODIFY] `D:\Work\Crawl\src\mcp-server.js`:**
  - Importare `dotenv/config`.
  - Ignorare gli argomenti delle keyword provenienti da Claude (`args.filterKeywords`, ecc.).
  - Iniettare `process.env.FILTER_KEYWORDS`, `process.env.EXCLUDE_KEYWORDS` e `process.env.EVIDENCE_KEYWORDS` direttamente nella chiamata al `matcher`.
- **[MODIFY] `D:\Work\ai-job-search\.claude\skills\job-scraper\SKILL.md`:**
  - Rimuovere dallo schema di invocazione (Step 3) il passaggio di `filterKeywords` ed `evidenceKeywords`, semplificando la richiesta di Claude.

---

## Modulo 6.2: Arricchimento dell'Output e Misurazione Metriche

**Obiettivo:** Restituire a Claude non solo il booleano del match, ma l'elenco testuale delle singole keyword trovate con i rispettivi punteggi. Inoltre, chiarire il consumo di risorse misurando i tempi e i byte su Node.js (poiché l'MCP **non** consuma token AI).

**Modifiche Proposte:**
- **[MODIFY] `D:\Work\Crawl\src\domain\WeightedJobMatcher.js`:**
  - Modificare il metodo `match` affinché tenga traccia in un array (es. `matchedDetails`) delle parole chiave trovate e del relativo peso (sia positive che negative).
  - Restituire `matchedDetails` nel risultato finale.
- **[MODIFY] `D:\Work\Crawl\src\mcp-server.js`:**
  - Aggiornare lo schema del tool (`ListToolsRequestSchema`) per notificare Claude che l'output conterrà anche le metriche `executionTimeMs`, `processedBytes` e l'array `matchedDetails`.
  - Calcolare il tempo di esecuzione e i byte di `pageHtml` scaricati, aggiungendoli al payload JSON.
- **[MODIFY] `D:\Work\ai-job-search\.claude\skills\job-scraper\SKILL.md`:**
  - Istruire Claude ad estrarre `matchedDetails` dalla risposta dell'MCP e stamparlo sotto forma di elenco puntato ("High-Match Highlights") nella tabella finale dei risultati.
  - Chiedere a Claude di stampare un riepilogo a fine run ("Analisi completata: X bytes scaricati in Y ms totali tramite Node.js").

---

## Modulo 6.3: Architettura e Migrazione del Server MCP

**Obiettivo:** Unificare il codice spostando l'MCP Server dalla vecchia directory `Crawl` al nuovo progetto `ai-job-search`, rendendo il pacchetto portatile e auto-contenuto.

> [!TIP]
> **Raccomandazione (Local Integration):**
> Spostare il codice dell'MCP direttamente dentro il progetto `ai-job-search` è preferibile rispetto a pubblicare un pacchetto NPM. Avrai un singolo repository GitHub da cui l'intero agente (prompt + tool) può essere clonato e installato con un semplice `npm install`.

**Modifiche Proposte:**
- **[NEW] Directory `D:\Work\ai-job-search\mcp-servers\job-scraper\`:**
  - Creare la nuova struttura per ospitare il server locale.
- **[MIGRATE] File da `Crawl`:**
  - Spostare `mcp-server.js`, la cartella `domain` (con `WeightedJobMatcher.js`), la cartella `infrastructure` (con `PlaywrightScraper.js`), e il file `package.json` / `.env`.
- **[MODIFY] `D:\Work\ai-job-search\.claude\settings.json` (o `claude.json`):**
  - Aggiornare i percorsi del comando `command` per puntare al nuovo percorso locale del server MCP, eliminando la dipendenza assoluta da `D:\Work\Crawl`.

---

## Piano di Verifica Generale
Alla chiusura di questi 3 sotto-moduli:
1. Lanceremo il server MCP migrato per validarne l'avvio.
2. Eseguiremo `/scrape` per assicurarci che Claude visualizzi correttamente a schermo le keyword intercettate dal `.env`.
3. Valuteremo i tempi di esecuzione e verificheremo che i token consumati rimangano minimali (circa 15k-20k).

---

## Modulo 7: Chiamata Diretta dell'MCP

Questo modulo definisce le procedure per interagire direttamente con l'MCP server bypassando il workflow completo, utile per il debugging e il test isolato.

### Modulo 7.1: Per chiamare direttamente come farebbe Claude

**Obiettivo:** Testare il tool MCP simulando il comportamento di Claude tramite uno script Node.js indipendente.

**Dettagli:**
- Creare uno script client MCP standalone che si colleghi al server via `stdio`.
- Formulare una richiesta `callTool` identica a quella che genererebbe Claude per il tool `scrape_and_match`.
- Permette di isolare i bug del server da quelli legati ai prompt o alle limitazioni di token.

### Modulo 7.2: Per chiamarlo direttamente da Claude

**Obiettivo:** Fornire a Claude un'istruzione diretta per invocare il singolo tool su un URL specifico a scopo di test o verifica rapida.

**Dettagli:**
- Implementare uno slash command dedicato (es. `/test-mcp`) in `.claude/commands/` o un prompt specifico.
- Istruire Claude a bypassare le fasi di ricerca e filtraggio e invocare immediatamente `scrape_and_match` su un URL fornito dall'utente.
- Verificare come Claude interpreta e visualizza i nuovi risultati strutturati (es. `matchedDetails` introdotti nel Modulo 6.2).
