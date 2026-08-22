export class JobMatcher {
    /**
     * Verifica se un annuncio di lavoro corrisponde ai criteri di interesse dell'utente.
     * @param {string} jobDescription - La descrizione testuale dell'annuncio.
     * @param {string[]} keywords - L'array di parole chiave da cercare (es. 'Python', 'React', 'Senior').
     * @returns {Promise<boolean>} True se l'annuncio corrisponde ai criteri, altrimenti false.
     */
    async match(jobDescription, keywords) {
        throw new Error("Metodo 'match(jobDescription, keywords)' deve essere implementato");
    }
}