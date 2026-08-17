# Roadmap: Integrazione MCP Server per Filtro Annunci (`GrepContentText`)

Questa roadmap descrive i passaggi necessari per aggiungere il tool `GrepContentText` al tuo server MCP C# `LoggerHelperMcp` e configurare lo skill `job-scraper` per utilizzarlo come filtro preventivo prima della valutazione semantica (`/rank`).

---

## Step 1: Aggiunta del Tool `GrepContentText` in C# (.NET 10)
**Obiettivo:** Estendere la classe `LogTools` del tuo server MCP in `D:\Work\LoggerHelperMcp` per esporre un nuovo tool che analizza stringhe di testo.

- [ ] **TODO** / **[ ] DONE**

### Azione da compiere:
Apri il file [LogTools.cs](file:///D:/Work/LoggerHelperMcp/src/LoggerHelper.Mcp.Server/Tools/LogTools.cs) del tuo server MCP e aggiungi le seguenti righe di codice:

1. **Definisci il record per strutturare la risposta JSON:**
   ```csharp
   public record JobGrepResult(
       bool IsEligible,
       string[] MatchedTechKeywords,
       string[] MatchedProtectedKeywords,
       string Details
   );
   ```

2. **Aggiungi il metodo del tool all'interno della classe `LogTools`:**
   ```csharp
   [McpServerTool, Description("Analizza il testo di un annuncio per verificare la presenza di parole chiave tecniche (es. C#/.NET) e categorie protette.")]
   public async Task<JobGrepResult> GrepContentTextAsync(
       [Description("Il testo completo dell'annuncio di lavoro.")] string text,
       [Description("Parole chiave tecnologiche richieste (opzionali).")] string[]? techKeywords = null,
       [Description("Parole chiave categorie protette richieste (opzionali).")] string[]? protectedKeywords = null,
       CancellationToken cancellationToken = default)
   {
       // Default se non forniti dall'agente
       techKeywords ??= ["c#", ".net", "dotnet", "dot-net"];
       protectedKeywords ??= ["68/99", "protett", "mirat", "legge 68", "collocamento mirato"];

       var normalizedText = text.ToLowerInvariant();

       var matchedTech = techKeywords
           .Where(kw => normalizedText.Contains(kw.ToLowerInvariant()))
           .ToArray();

       var matchedProt = protectedKeywords
           .Where(kw => normalizedText.Contains(kw.ToLowerInvariant()))
           .ToArray();

       bool isEligible = matchedTech.Length > 0 && matchedProt.Length > 0;

       var details = $"Tech match: {(matchedTech.Length > 0 ? "YES (" + string.Join(", ", matchedTech) + ")" : "NO")}. " +
                     $"Protected Category match: {(matchedProt.Length > 0 ? "YES (" + string.Join(", ", matchedProt) + ")" : "NO")}.";

       return new JobGrepResult(isEligible, matchedTech, matchedProt, details);
   }
   ```

3. **Compila il progetto:**
   Assicurati che il progetto compili senza errori eseguendo `dotnet build` nella cartella `D:\Work\LoggerHelperMcp`.

---

## Step 2: Registrazione e Configurazione del Server MCP
**Obiettivo:** Registrare il server MCP nel file di configurazione dell'agente AI affinché il tool `GrepContentText` sia visibile e utilizzabile.

- [ ] **TODO** / **[ ] DONE**

### Azione da compiere:
Modifica il file di configurazione dei server MCP del tuo client AI (ad esempio `.mcp.json` o la configurazione globale di Claude Code / Antigravity IDE) registrando il server `LoggerHelperMcp`.

Esempio di configurazione stdio:
```json
{
  "mcpServers": {
    "logger-helper-mcp": {
      "command": "dotnet",
      "args": [
        "run",
        "--project",
        "D:\\Work\\LoggerHelperMcp\\src\\LoggerHelper.Mcp.Server\\LoggerHelper.Mcp.Server.csproj"
      ]
    }
  }
}
```

*Nota: Se preferisci eseguire direttamente l'eseguibile compilato (apphost) invece di compilare ogni volta tramite dotnet run:*
```json
{
  "mcpServers": {
    "logger-helper-mcp": {
      "command": "D:\\Work\\LoggerHelperMcp\\src\\LoggerHelper.Mcp.Server\\bin\\Debug\\net10.0\\LoggerHelper.Mcp.Server.exe"
    }
  }
}
```

---

## Step 3: Modifica dello Skill `job-scraper`
**Obiettivo:** Configurare lo skill in Markdown per forzare l'agente a utilizzare lo strumento MCP durante lo scraping.

- [ ] **TODO** / **[ ] DONE**

### Azione da compiere:
Apri il file [SKILL.md](file:///d:/Work/ai-job-search/.claude/skills/job-scraper/SKILL.md) in questo workspace e apporta le seguenti due modifiche:

1. **Aggiungi il tool al frontmatter YAML:**
   Trova la riga `allowed-tools:` (riga 8) e inserisci `GrepContentText` all'elenco dei tool permessi:
   ```yaml
   allowed-tools: Read, Write, Edit, Glob, Grep, GrepContentText, Bash(bun --version), ...
   ```

2. **Istruisci l'agente ad applicare il filtro nello Step 3 (Quick Fit Assessment):**
   Sostituisci la sezione dello *Step 3* con il seguente schema operativo:
   ```markdown
   ### Step 3: Quick Fit Assessment

   For each new job, perform the eligibility filters using the custom MCP tool:

   1. **Invoke the MCP Tool**: Call the tool `GrepContentText` from your registered `logger-helper-mcp` server.
      * Pass the full job description text to the `text` parameter.
      * Use default or configured keywords.

   2. **Evaluate the Tool Output**:
      * If the tool returns `IsEligible: false`, classify the job as **Low match** and immediately set its status to `"skipped"` (meaning it will be written to `seen_jobs.json` to prevent re-scraping but will NOT be shown to the user).
      * If the tool returns `IsEligible: true`, proceed to assess the match level (High/Medium) based on technical specifics.
   ```

---

## Step 4: Test e Verifica
**Obiettivo:** Avviare lo scraper e verificare che gli annunci privi di requisiti vengano effettivamente saltati e salvati come `skipped`.

- [ ] **TODO** / **[ ] DONE**

### Azione da compiere:
1. Avvia una sessione dello scraper eseguendo il comando `/scrape` o dicendo "Cerca nuovi annunci".
2. Verifica nei log dell'agente che venga chiamato lo strumento `GrepContentText`.
3. Controlla il file [seen_jobs.json](file:///d:/Work/ai-job-search/job_scraper/seen_jobs.json): i nuovi annunci non compatibili con C#/.NET o Categorie Protette dovrebbero essere salvati con `"status": "skipped"`.
