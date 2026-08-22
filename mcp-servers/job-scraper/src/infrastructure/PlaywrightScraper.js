import { chromium } from "playwright";
import fs from "fs";
import { ScrapingProvider } from "../interfaces/ScrapingProvider.js";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export class PlaywrightScraper extends ScrapingProvider {
    /**
     * Visita un URL ed estrae il contenuto testuale della pagina in modo ottimizzato.
     * @param {string} url - L'URL dell'annuncio di lavoro da grattare.
     * @returns {Promise<string>} Il testo estratto dalla pagina.
     */
    async scrape(url) {
        console.error(`[PlaywrightScraper] Avvio scraping per l'URL: ${url}`);

        let browser = null;
        try {
            // Avviamo Chromium in modalità headless (senza finestra grafica)
            browser = await chromium.launch({ headless: true });

            const contextOptions = {
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                viewport: { width: 1280, height: 800 }
            };

            const statePath = "state.json";
            if (fs.existsSync(statePath)) {
                console.error("[PlaywrightScraper] File state.json rilevato. Caricamento sessione autenticata...");
                contextOptions.storageState = statePath;
            } else {
                console.error("[PlaywrightScraper] ATTENZIONE: Nessun file state.json trovato. Scraping come guest (rischio login wall).");
            }

            // Creiamo un contesto
            const context = await browser.newContext(contextOptions);

            const page = await context.newPage();

            // Ottimizzazione (Strategia B): Intercettiamo le richieste e blocchiamo fogli di stile, immagini, font e media
            await page.route("**/*", (route) => {
                const resourceType = route.request().resourceType();
                if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
                    route.abort();
                } else {
                    route.continue();
                }
            });

            // Navighiamo all'URL dell'annuncio
            // Usiamo 'domcontentloaded' per non attendere il caricamento di script secondari o tracciatori
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

            // Opzionale: aspettiamo 1 secondo per dare il tempo ad eventuali script JS dinamici di popolare la pagina
            await page.waitForTimeout(5000);

            // Estraiamo l'intero HTML per processarlo con Readability
            const htmlContent = await page.content();

            // Usiamo JSDOM per creare un DOM virtuale interpretabile da Readability
            const doc = new JSDOM(htmlContent, { url }).window.document;
            const reader = new Readability(doc);
            const article = reader.parse();

            let textContent = "";
            if (article && article.textContent && article.textContent.trim().length > 200) {
                textContent = article.textContent.trim();
                console.error(`[PlaywrightScraper] Testo estratto tramite algoritmo Mozilla Readability.`);
            } else {
                console.error(`[PlaywrightScraper] ATTENZIONE: Readability fallito. Ripiego sui selettori di fallback...`);
                // Fallback di sicurezza: proviamo i selettori noti per i portali più complessi
                const selectors = [
                    ".show-more-less-html__markup", // LinkedIn (Guest)
                    ".jobs-description__content",   // LinkedIn (Auth / alternative)
                    "#jobDescriptionText",          // Indeed
                    ".description__text",           // Altri portali
                    "main",                         // HTML5 Semantic
                    "body"                          // Fallback totale
                ];

                for (const selector of selectors) {
                    try {
                        const count = await page.locator(selector).count();
                        if (count > 0) {
                            textContent = await page.locator(selector).first().innerText({ timeout: 2000 });
                            if (textContent.trim().length > 200) {
                                console.error(`[PlaywrightScraper] Testo estratto tramite selettore: '${selector}'`);
                                break;
                            }
                        }
                    } catch (e) {
                        // Passiamo al prossimo selettore
                    }
                }
            }

            console.error(`[PlaywrightScraper] Scraping completato con successo. Caratteri estratti: ${textContent.length}`);
            return textContent;

        } catch (error) {
            if (error.message.includes("playwright install") || error.message.includes("Executable doesn't exist")) {
                console.error(`\n======================================================`);
                console.error(`[PlaywrightScraper] 🚨 ERRORE: Browser Playwright mancanti!`);
                console.error(`======================================================`);
                console.error(`Devi scaricare i browser eseguendo il seguente comando nel terminale:\n`);
                console.error(`    npx playwright install\n`);
                console.error(`Per maggiori dettagli, leggi il file: outcome/playwright_setup.md\n`);
            } else {
                console.error(`[PlaywrightScraper] Errore durante lo scraping di ${url}:`, error.message);
            }
            throw error;
        } finally {
            if (browser) {
                await browser.close();
                console.error("[PlaywrightScraper] Browser chiuso.");
            }
        }
    }
}
