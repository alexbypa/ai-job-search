/**
 * Interfaccia ScrapingProvider (Classe Astratta)
 * Definisce il contratto per qualsiasi servizio di scraping (Playwright, Puppeteer, JSDOM, ecc.)
 */
export class ScrapingProvider {
    /**
     * Visita un URL ed estrae il contenuto testuale della pagina.
     * @param {string} url - L'indirizzo web dell'annuncio di lavoro da scansionare.
     * @returns {Promise<string>} Il testo estratto dalla pagina web.
     */
    async scrape(url) {
        throw new Error("Metodo 'scrape(url)' deve essere implementato");
    }
}
