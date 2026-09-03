import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
} from 'baileys';
import qrcode from 'qrcode-terminal';

import type { WhatsAppAdapter } from './whatsapp-adapter.js';

export interface BaileysAdapterOptions {
  /** Directory where the multi-file auth state (creds/keys) is persisted. */
  authDir?: string;
}

/**
 * WhatsApp backend backed by Baileys — talks to WhatsApp's WebSocket directly,
 * no headless browser required. Recipients are phone numbers (digits, with
 * country code, no `+`), e.g. "5511987654321".
 */
export class BaileysAdapter implements WhatsAppAdapter {
  private sock?: WASocket;
  private readonly authDir: string;

  constructor(options: BaileysAdapterOptions = {}) {
    this.authDir = options.authDir ?? 'auth';
  }

  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    await new Promise<void>((resolve, reject) => {
      const sock = makeWASocket({ auth: state });
      this.sock = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('\nScan this QR code with WhatsApp to log in:\n');
          qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
          resolve();
          return;
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })
            ?.output?.statusCode;

          if (statusCode === DisconnectReason.loggedOut) {
            reject(
              new Error(
                `Logged out by WhatsApp. Delete the "${this.authDir}" folder and re-authenticate.`
              )
            );
            return;
          }

          // Transient drop — reconnect by opening a fresh session.
          console.log('Connection closed, reconnecting...');
          this.connect().then(resolve).catch(reject);
        }
      });
    });
  }

  async sendMessage(recipient: string, text: string): Promise<void> {
    if (!this.sock) {
      throw new Error('Not connected. Call connect() before sendMessage().');
    }

    await this.sock.sendMessage(toJid(recipient), { text });
  }

  async disconnect(): Promise<void> {
    this.sock?.end(undefined);
    this.sock = undefined;
  }
}

/** Normalize a phone number (or raw JID) into a WhatsApp user JID. */
function toJid(recipient: string): string {
  if (recipient.includes('@')) return recipient;
  const digits = recipient.replace(/\D/g, '');
  return `${digits}@s.whatsapp.net`;
}
