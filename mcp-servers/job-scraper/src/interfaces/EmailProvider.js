/**
 * Interfaccia EmailProvider (Classe Astratta)
 * Definisce il contratto per qualsiasi fornitore di servizi email (IMAP, Gmail API, Outlook, ecc.)
 */
export class EmailProvider {
    /**
     * Connette al server di posta.
     * @returns {Promise<void>}
     */
    async connect() {
        throw new Error("Metodo 'connect()' deve essere implementato");
    }

    /**
     * Recupera i messaggi non letti o che corrispondono a determinati criteri.
     * @returns {Promise<Array<{ id: string, from: string, subject: string, body: string }>>}
     */
    async fetchEmails() {
        throw new Error("Metodo 'fetchEmails()' deve essere implementato");
    }

    /**
     * Elimina o sposta nel cestino un thread/messaggio specifico tramite ID.
     * @param {string} emailId - L'ID dell'email o del thread da eliminare.
     * @returns {Promise<void>}
     */
    async deleteEmail(emailId) {
        throw new Error("Metodo 'deleteEmail()' deve essere implementato");
    }

    /**
     * Chiude la connessione con il server.
     * @returns {Promise<void>}
     */
    async disconnect() {
        throw new Error("Metodo 'disconnect()' deve essere implementato");
    }
}
