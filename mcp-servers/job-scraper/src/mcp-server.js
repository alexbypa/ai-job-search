import "dotenv/config";
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { PlaywrightScraper } from "./infrastructure/PlaywrightScraper.js";
import { WeightedJobMatcher } from "./domain/WeightedJobMatcher.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const scraper = new PlaywrightScraper();
const matcher = new WeightedJobMatcher();


// 1. Inizializza l'app Express
const app = express();

// 2. Inizializza il Server MCP (stessa sintassi di Stdio)
const server = new Server(
    { name: "job-scraper-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // 1. Controllo di sicurezza
    if (request.params.name !== "analyze_job_url") {
        throw new Error(`Tool sconosciuto: ${request.params.name}`);
    }

    // 2. Estraiamo gli argomenti inviati da Claude
    const args = request.params.arguments || {};
    if (!args.url) {
        throw new Error("L'argomento 'url' è obbligatorio.");
    }

    console.error(`[MCP] Claude mi ha chiesto di analizzare: ${args.url}`);

    try {
        const startTime = Date.now();
        const pageHtml = await scraper.scrape(args.url);
        const processedBytes = pageHtml ? pageHtml.length : 0;
        console.error("[MCP] HO SCARICATO LA PAGINA:")
        const minScore = args.minScore || 3
        const filterKeywords = process.env.FILTER_KEYWORDS || "";
        const excludeKeywords = process.env.EXCLUDE_KEYWORDS || "";
        const matchResult = await matcher.match(pageHtml, filterKeywords, excludeKeywords, minScore);

        let fit = "Low";
        if (matchResult.isMatch === false) {
            fit = "Low";
        } else if (matchResult.isMatch === true && matchResult.finalScore > 0 && matchResult.finalScore < 30) {
            fit = "Medium";
        } else if (matchResult.isMatch === true && matchResult.finalScore >= 30) {
            fit = "High";
        }

        const executionTimeMs = Date.now() - startTime;
        const payload = {
            isMatch: matchResult.isMatch,
            fit: fit,
            url: args.url,
            score: matchResult.finalScore,
            matchedDetails: matchResult.matchedDetails,
            executionTimeMs: executionTimeMs,
            processedBytes: processedBytes
        };

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(payload)
                }
            ]
        }

    } catch (error) {
        console.error("[MCP] Errore durante l'analisi dell'annuncio:", error.message);
        throw error;
    }
});

// Registriamo la risposta alla richiesta "Quali tool hai?"
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "analyze_job_url",
                description: "Analizza un annuncio di lavoro scaricando la pagina e calcolando un match score basato su keyword.",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                            description: "L'URL dell'annuncio di lavoro (LinkedIn, Indeed, ecc.)"
                        },
                        minScore: {
                            type: "number",
                            description: "Punteggio minimo per considerare l'annuncio un match (default: 3)"
                        }
                    },
                    required: ["url"] // Diciamo a Claude che solo l'URL è strettamente obbligatorio!
                }
            }
        ]
    };
});


// Dobbiamo tenere traccia del trasporto attivo (globale a scopo didattico)
let transport;

// 3. Endpoint /sse: stabilisce la connessione con il client
app.get("/sse", async (req, res) => {
    // Inizializza SSEServerTransport
    // SUGGERIMENTO: il costruttore prende due parametri: (endpoint_messaggi_ritorno, response_object_express)
    transport = new SSEServerTransport("/messages", res);

    // Connetti il server MCP a questo trasporto
    await server.connect(transport);
    console.error("Nuovo client MCP connesso via SSE!");
});

// 4. Endpoint /messages: riceve i comandi (POST)
app.post("/messages", async (req, res) => {
    await transport.handlePostMessage(req, res);
    console.error("Comando MCP ricevuto e processato via SSE!");
});

// 5. Avvia il server web (Express) gestendo gli errori per non far crashare lo stdio
const expressServer = app.listen(3000, () => {
    console.error("MCP Server (SSE) in ascolto su http://localhost:3000");
});

expressServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[ATTENZIONE] La porta 3000 è già in uso. Il server SSE Express non è stato avviato, ma il server Stdio funzionerà normalmente.`);
    } else {
        console.error(`[ERRORE] Express server error:`, err);
    }
});

// Avvio tramite Stdio
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server Node.js in ascolto via Stdio!");
}
run().catch(console.error);