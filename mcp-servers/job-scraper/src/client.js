import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  console.log("Avvio del client di test MCP...");

  // Configura il trasporto Stdio per avviare il server MCP come processo figlio
  const transport = new StdioClientTransport({
    command: "node",
    args: [path.join(__dirname, "mcp-server.js")],
    env: process.env, // Passa l'ambiente corrente (necessario se ci sono path globali)
  });

  // Inizializza il client MCP
  const client = new Client(
    {
      name: "mcp-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    console.log("Connessione al server MCP in corso...");
    await client.connect(transport);
    console.log("Connesso al server MCP con successo!\n");

    // Elenca i tool disponibili per verificare che il server sia pronto
    const tools = await client.listTools();
    console.log("Tool esposti dal server:");
    tools.tools.forEach(t => console.log(`- ${t.name}: ${t.description}`));

    // Specifica un URL di test. Sostituire con un vero URL Indeed o iProgrammatori se si vuole testare a fondo.
    const testUrl = "https://www.linkedin.com/jobs/view/4417344977"

    console.log(`\nInvocazione del tool 'analyze_job_url' sull'URL: ${testUrl}...`);

    const startTime = Date.now();
    const result = await client.callTool({
      name: "analyze_job_url",
      arguments: {
        url: testUrl
      }
    });
    const durationMs = Date.now() - startTime;

    console.log(`\nRisultato del tool (in ${durationMs}ms):`);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("\nErrore durante l'esecuzione del test:", error);
  } finally {
    console.log("\nChiusura della connessione...");
    // Su stdio transport, terminare il processo è il modo più pulito
    process.exit(0);
  }
}

runTest();
