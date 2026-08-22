import fs from "fs/promises";
import path from "path";

export class JobPipeline {
    /**
     * @param {EmailProvider} emailProvider
     * @param {ScrapingProvider} scraper
     * @param {JobMatcher} matcher
     * @param {NotificationProvider} notifier
     */
    constructor(emailProvider, scraper, matcher, notifier) {
        this.emailProvider = emailProvider;
        this.scraper = scraper;
        this.matcher = matcher;
        this.notifier = notifier;
    }

    /**
     * Esegue il flusso completo di scansione, scraping e notifica.
     * @param {Object} options
     * @param {string} options.linksCrawlPath - Percorso assoluto del file Links_Crawl.md.
     * @param {string} options.filterKeywords - Parole chiave desiderate e pesi (es. "node:3,javascript:2").
     * @param {string} options.excludeKeywords - Parole chiave escluse e pesi (es. "junior:3,php:1").
     * @param {number} options.minScore - Il punteggio minimo per considerare l'annuncio un match.
     */
    async execute(options) {
        const { linksCrawlPath, filterKeywords, excludeKeywords, evidenceKeywords, minScore } = options;

        console.log("[JobPipeline] Avvio esecuzione pipeline...");

        // 1. Carichiamo i mittenti consentiti da Links_Crawl.md
        const allowedSenders = await this._loadAllowedSenders(linksCrawlPath);
        console.log("[JobPipeline] Mittenti consentiti caricati:", allowedSenders);

        if (allowedSenders.length === 0) {
            console.log("[JobPipeline] Nessun mittente abilitato trovato in Links_Crawl.md. Fine esecuzione.");
            return;
        }

        try {
            // 2. Connessione a Gmail
            await this.emailProvider.connect();

            // 3. Recupero delle email non lette
            const emails = await this.emailProvider.fetchEmails();
            console.log(`[JobPipeline] Trovate ${emails.length} email da esaminare.`);

            for (const email of emails) {
                const sender = email.from.toLowerCase();

                // 4. Verifichiamo se il mittente è tra quelli autorizzati
                const isAuthorized = allowedSenders.some(allowed => sender.includes(allowed.toLowerCase()));
                if (!isAuthorized) {
                    console.log(`[JobPipeline] Email UID: ${email.id} scartata. Mittente "${email.from}" non abilitato.`);
                    continue;
                }

                console.log("-------------------------------------------------------------------------------");
                console.log(`[JobPipeline] Elaborazione email UID: ${email.id} da "${email.from}". Oggetto: "${email.subject}"`);

                // 5. Estraiamo i link di lavoro (Indeed/LinkedIn) dal corpo del messaggio
                const jobUrls = this._extractJobUrls(email.body);
                console.log(`[JobPipeline] Trovati ${jobUrls.length} link di annunci nell'email.`);

                let matchTrovatoInEmail = false;

                for (const url of jobUrls) {
                    try {
                        // 6. Scraping del testo dell'annuncio
                        const pageText = await this.scraper.scrape(url);

                        // 7. Verifica corrispondenza criteri
                        const isMatch = await this.matcher.match(pageText, filterKeywords, excludeKeywords, minScore);

                        if (isMatch) {
                            matchTrovatoInEmail = true;
                            
                            // Cerca se ci sono parole di evidenza nell'oggetto o nella descrizione
                            const foundEvidence = this._checkEvidenceKeywords(email.subject, pageText, evidenceKeywords);
                            
                            // 8. Invio della notifica su Telegram
                            let message = `<b>📢 MATCH ANNUNCIO DI LAVORO!</b>\n\n` +
                                `<b>Oggetto Email:</b> ${email.subject}\n` +
                                `<b>Mittente:</b> ${email.from}\n` +
                                `<b>Link Annuncio:</b> <a href="${url}">Vedi Offerta</a>`;

                            if (foundEvidence.length > 0) {
                                message += `\n\n⚠️ <b>Evidenziati nell'annuncio:</b> [${foundEvidence.join(", ")}]`;
                            }

                            await this.notifier.sendNotification(message);
                        }
                    } catch (scrapeError) {
                        console.error(`[JobPipeline] Errore durante l'elaborazione del link ${url}:`, scrapeError.message);
                    }
                }

                // 9. Eliminiamo/Archiviamo l'email una volta completata l'analisi
                // Cancelliamo l'email in ogni caso (sia con match che senza match) per non rielaborarla la prossima volta
                await this.emailProvider.deleteEmail(email.id);
            }

        } catch (error) {
            console.error("[JobPipeline] Errore critico durante l'esecuzione della pipeline:", error);
            throw error;
        } finally {
            // 10. Assicuriamoci di disconnettere la sessione IMAP
            await this.emailProvider.disconnect();
            console.log("[JobPipeline] Esecuzione completata. Sessione email chiusa.");
        }
    }

    /**
     * Estrae i mittenti email validi dal file Links_Crawl.md
     * @param {string} filePath
     * @private
     */
    async _loadAllowedSenders(filePath) {
        try {
            const content = await fs.readFile(filePath, "utf-8");
            // Regex per estrarre indirizzi email validi
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            return content.match(emailRegex) || [];
        } catch (error) {
            console.error(`[JobPipeline] Errore nel caricamento del file ${filePath}:`, error.message);
            return [];
        }
    }

    /**
     * Trova ed estrae i link di LinkedIn e Indeed all'interno del testo della mail.
     * @param {string} text
     * @private
     */
    _extractJobUrls(text) {
        if (!text) return [];
        // Regex generica per trovare URL
        const urlRegex = /https?:\/\/[^\s"'<>\(\)]+/g;
        const urls = text.match(urlRegex) || [];

        const jobUrls = [];
        for (const url of urls) {
            const lowerUrl = url.toLowerCase();
            if (lowerUrl.includes("linkedin.com/jobs/view") || lowerUrl.includes("linkedin.com/comm/jobs/view")) {
                // Estraiamo il Job ID numerico (es. 4416179496)
                const match = url.match(/\/view\/(\d+)/);
                if (match && match[1]) {
                    // Utilizziamo l'indirizzo standard (che funzionerà con la sessione di state.json)
                    jobUrls.push(`https://www.linkedin.com/jobs/view/${match[1]}/`);
                }
            } else if (lowerUrl.includes("indeed.com/rc/clk") || lowerUrl.includes("indeed.com/viewjob")) {
                jobUrls.push(url);
            }
        }

        // Eliminiamo i duplicati
        return [...new Set(jobUrls)];
    }

    /**
     * Cerca le parole chiave di evidenza all'interno del soggetto e della descrizione.
     * @param {string} subject 
     * @param {string} pageText 
     * @param {string} evidenceKeywordsStr 
     * @returns {string[]} Lista delle parole chiave trovate.
     * @private
     */
    _checkEvidenceKeywords(subject, pageText, evidenceKeywordsStr) {
        if (!evidenceKeywordsStr) return [];
        
        // Rimuoviamo eventuali parentesi tonde esterne se presenti
        let cleanStr = evidenceKeywordsStr.trim();
        if (cleanStr.startsWith("(")) cleanStr = cleanStr.slice(1);
        if (cleanStr.endsWith(")")) cleanStr = cleanStr.slice(0, -1);
        
        const keywords = cleanStr.split(",")
            .map(k => k.trim())
            .filter(k => k.length > 0);
            
        const found = [];
        const combinedText = `${subject || ""} ${pageText || ""}`;
        
        for (const keyword of keywords) {
            // Escape dei caratteri speciali per sicurezza nella regex (es. 68/99)
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escaped, "i");
            if (regex.test(combinedText)) {
                found.push(keyword);
            }
        }
        
        return found;
    }
}
