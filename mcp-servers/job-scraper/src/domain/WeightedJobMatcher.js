import { JobMatcher } from "../interfaces/JobMatcher.js";

export class WeightedJobMatcher extends JobMatcher {
    /**
     * Calcola il punteggio pesato basato sulla frequenza delle parole chiave nell'annuncio.
     * @param {string} jobDescription - La descrizione testuale dell'annuncio.
     * @param {string} filterKeywordsStr - Stringa con parole chiave e pesi (es. "node:3,javascript:2").
     * @param {string} excludeKeywordsStr - Stringa con parole di esclusione e pesi (es. "junior:3,stage:3").
     * @param {number} minScore - Il punteggio minimo per considerare l'annuncio un match.
     * @returns {Promise<boolean>} True se lo score finale >= minScore, altrimenti false.
     */
    async match(jobDescription, filterKeywordsStr, excludeKeywordsStr, minScore = 3) {
        console.error("[WeightedJobMatcher] Avvio valutazione pesata dell'annuncio...");

        if (!jobDescription) {
            console.error("[WeightedJobMatcher] Descrizione annuncio vuota. Valutazione fallita.");
            return false;
        }

        const positiveKeywords = this._parseKeywords(filterKeywordsStr);
        const negativeKeywords = this._parseKeywords(excludeKeywordsStr);

        let positiveScore = 0;
        let negativeScore = 0;
        const matchedDetails = [];

        console.error("[WeightedJobMatcher] --- Calcolo Parole Chiave Positive ---");
        for (const { keyword, weight } of positiveKeywords) {
            const count = this._countOccurrences(jobDescription, keyword);
            if (count > 0) {
                const points = count * weight;
                positiveScore += points;
                matchedDetails.push(`+ ${keyword} (${count}x): +${points} pts`);
                console.error(`  + "${keyword}" (peso ${weight}) trovato ${count} volte -> \x1b[32m+${points} punti\x1b[0m`);
            }
        }

        console.error("[WeightedJobMatcher] --- Calcolo Penalità Esclusioni ---");
        for (const { keyword, weight } of negativeKeywords) {
            const count = this._countOccurrences(jobDescription, keyword);
            if (count > 0) {
                const points = count * weight;
                negativeScore += points;
                matchedDetails.push(`- ${keyword} (${count}x): -${points} pts`);
                console.error(`  - "${keyword}" (penalità ${weight}) trovato ${count} volte -> \x1b[31m-${points} punti\x1b[0m`);
            }
        }

        const finalScore = positiveScore - negativeScore;
        console.error(`[WeightedJobMatcher] Risultato: Positivi = ${positiveScore}, Negativi = ${negativeScore} | Score Finale = \x1b[33m${finalScore}\x1b[0m (Minimo richiesto: ${minScore})`);

        const isMatch = finalScore >= minScore;
        console.error(`[WeightedJobMatcher] Esito: ${isMatch ? "\x1b[32mMATCH TROVATO\x1b[0m" : "\x1b[31mMATCH SCARTATO\x1b[0m"}`);
        return {
            isMatch: isMatch,
            finalScore: finalScore,
            matchedDetails: matchedDetails
        }
    }

    /**
     * Converte la stringa di configurazione (es. "node:3,js:2") in una lista di oggetti { keyword, weight }
     * @param {string} str
     * @returns {Array<{keyword: string, weight: number}>}
     * @private
     */
    _parseKeywords(str) {
        if (!str) return [];
        return str.split(",")
            .map(item => {
                const parts = item.trim().split(":");
                const keyword = parts[0] ? parts[0].trim() : "";
                const weightStr = parts[1] ? parts[1].trim() : "1";
                const weight = parseInt(weightStr, 10);
                return { keyword, weight: isNaN(weight) ? 1 : weight };
            })
            .filter(item => item.keyword.length > 0);
    }

    /**
     * Conta le occorrenze di una parola chiave (case-insensitive ed escaped) all'interno del testo
     * @param {string} text
     * @param {string} keyword
     * @returns {number}
     * @private
     */
    _countOccurrences(text, keyword) {
        // Escapizziamo i caratteri speciali della regex (es. c#, .net, c++)
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "gi");
        const matches = text.match(regex);
        return matches ? matches.length : 0;
    }
}
