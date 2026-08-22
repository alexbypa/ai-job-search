/**
 * Interfaccia NotificationProvider (Classe Astratta)
 * Definisce il contratto per qualsiasi servizio di invio notifiche (Telegram, Slack, Email, ecc.)
 */
export class NotificationProvider {
    /**
     * Invia un messaggio di notifica.
     * @param {string} message - Il testo del messaggio da inviare.
     * @returns {Promise<void>}
     */
    async sendNotification(message) {
        throw new Error("Metodo 'sendNotification(message)' deve essere implementato");
    }
}
