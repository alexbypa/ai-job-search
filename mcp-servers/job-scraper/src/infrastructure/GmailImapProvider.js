import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { EmailProvider } from "../interfaces/EmailProvider.js";

export class GmailImapProvider extends EmailProvider {
    constructor(config) {
        super();
        this.client = new ImapFlow(config);
    }

    async connect() {
        console.log("[GmailImapProvider] Connessione a Gmail IMAP in corso...");
        await this.client.connect();
        console.log("[GmailImapProvider] Connessione stabilita con successo.");
    }

    async fetchEmails() {
        console.log("[GmailImapProvider] Apertura mailbox INBOX...");
        await this.client.mailboxOpen("INBOX");

        const lock = await this.client.getMailboxLock("INBOX");
        console.log("[GmailImapProvider] Lock ottenuto. Ricerca email non lette...");

        try {
            // Otteniamo esplicitamente gli UID impostando { uid: true }
            const uids = await this.client.search({ all: true }, { uid: true });
            console.log(`[GmailImapProvider] Trovate ${uids.length} email non lette.`);
            const emails = [];

            for (const uid of uids) {
                console.log(`[GmailImapProvider] Fetching email UID: ${uid}...`);
                // Specifichiamo { uid: true } per indicare che la ricerca è basata su UID
                const msg = await this.client.fetchOne(uid, { source: true }, { uid: true });
                if (msg && msg.source) {
                    const parsed = await simpleParser(msg.source);
                    console.log(`[GmailImapProvider] Email letta con successo. Oggetto: "${parsed.subject}"`);
                    emails.push({
                        id: uid,
                        from: parsed.from?.value?.[0]?.address || "",
                        subject: parsed.subject || "",
                        body: parsed.text || parsed.html || ""
                    });
                }
            }

            return emails;
        } finally {
            lock.release();
            console.log("[GmailImapProvider] Lock rilasciato.");
        }
    }

    async deleteEmail(emailId) {
        console.log(`[GmailImapProvider] Apertura INBOX per eliminazione email UID: ${emailId}...`);
        await this.client.mailboxOpen("INBOX");
        const lock = await this.client.getMailboxLock("INBOX");
        try {

            const mailboxes = await this.client.list();
            let trashPath = null;

            for (const m of mailboxes) {
                if (m.specialUse === "\\Trash") {
                    trashPath = m.path;
                }
            }

            if (!trashPath) {
                trashPath = "[Gmail]/Trash";
            }
            await this.client.messageMove(String(emailId), trashPath, { uid: true });

            await this.client.messageDelete(String(emailId), { uid: true });

        } finally {
            lock.release();
            console.log("[GmailImapProvider] Lock rilasciato.");
        }
    }
    async disconnect() {
        console.log("[GmailImapProvider] Disconnessione da Gmail IMAP...");
        await this.client.logout();
        console.log("[GmailImapProvider] Disconnesso.");
    }
}