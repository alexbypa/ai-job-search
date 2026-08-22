import { JobMatcher } from "../interfaces/JobMatcher.js";

export class RegexJobMatcher extends JobMatcher {
    /**
     * Verifica se un annuncio di lavoro corrisponde ai criteri di interesse dell'utente usando una Regex.
     * @param {string} jobDescription - La descrizione testuale dell'annuncio.
     * @param {string} pattern - La stringa della regular expression da testare.
     * @returns {Promise<boolean>} True se l'annuncio corrisponde ai criteri, altrimenti false.
     */
    async match(jobDescription, pattern) {
        console.log("[RegexJobMatcher] Avvio verifica dei criteri sul testo dell'annuncio...");
        
        if (!jobDescription) {
            console.log("[RegexJobMatcher] Descrizione annuncio vuota o non valida. Match fallito.");
            return false;
        }

        if (!pattern) {
            console.log("[RegexJobMatcher] Nessun pattern specificato. Match fallito.");
            return false;
        }

        try {
            const regex = new RegExp(pattern, "i"); // 'i' per rendere la ricerca case-insensitive
            const isMatch = regex.test(jobDescription);
            console.log(`[RegexJobMatcher] Verifica completata. Esito: ${isMatch ? "MATCH TROVATO" : "NESSUN MATCH"}`);
            return isMatch;
        } catch (error) {
            console.error("[RegexJobMatcher] Errore durante la compilazione o il test della Regex:", error);
            return false;
        }
    }
}
