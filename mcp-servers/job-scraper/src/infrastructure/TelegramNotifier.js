import { NotificationProvider } from "../interfaces/NotificationProvider.js";

export class TelegramNotifier extends NotificationProvider {
    /**
     * @param {string} token - Il token del Bot Telegram.
     * @param {string} chatId - Il chat ID a cui inviare le notifiche.
     */
    constructor(token, chatId) {
        super();
        this.token = token;
        this.chatId = chatId;
    }

    /**
     * Invia una notifica al canale/chat di Telegram configurato.
     * @param {string} message - Il messaggio in formato testo o HTML.
     * @returns {Promise<void>}
     */
    async sendNotification(message) {
        console.log("[TelegramNotifier] Tentativo di invio notifica su Telegram...");

        if (!this.token || !this.chatId) {
            throw new Error("[TelegramNotifier] Token o Chat ID non configurati correttamente.");
        }

        const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
        
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: "HTML"
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.description || `HTTP Error ${response.status}`);
            }

            console.log("[TelegramNotifier] Notifica inviata con successo su Telegram.");
        } catch (error) {
            console.error("[TelegramNotifier] Errore durante l'invio della notifica:", error.message);
            throw error; // Rilanciamo l'errore per farlo gestire dall'orchestratore
        }
    }
}
