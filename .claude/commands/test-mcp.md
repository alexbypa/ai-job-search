---
name: test-mcp
description: Invoca direttamente il tool analyze_job_url dal server MCP per testare un annuncio di lavoro.
---

# /test-mcp - Invocazione diretta dell'MCP

Questo comando permette di testare direttamente il tool MCP `analyze_job_url` su un singolo URL bypassando il normale processo di scraping e ranking.

## Step 1: Richiedi URL se mancante

Se `$ARGUMENTS` è vuoto, chiedi all'utente:

> Fornisci l'URL dell'annuncio di lavoro che vuoi analizzare tramite l'MCP.

Attendi la risposta dell'utente prima di continuare. Se `$ARGUMENTS` contiene già un URL, usa quello e procedi direttamente allo Step 2.

## Step 2: Esecuzione del Tool

Invoca il tool `analyze_job_url` (fornito dal server MCP) passando come parametro `url` l'URL fornito.

## Step 3: Mostra i Risultati

Una volta ricevuta la risposta dall'MCP (che dovrebbe includere un flag di match, le metriche `executionTimeMs`, `processedBytes` e l'array `matchedDetails`), formatta e stampa i risultati per l'utente in questo modo:

### Riepilogo Analisi MCP

- **URL:** [URL analizzato]
- **Match:** [Sì/No]
- **Tempo di esecuzione:** [executionTimeMs] ms
- **Byte scaricati:** [processedBytes] bytes

### Dettagli del Match (High-Match Highlights)

Elenca qui il contenuto di `matchedDetails` come elenco puntato (es. Keyword: `[keyword]` - Peso: `[peso]`), in modo che l'utente possa visualizzare il punteggio parziale di ogni parola chiave che ha contribuito alla valutazione.
