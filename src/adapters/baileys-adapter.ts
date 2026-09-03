import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
  type Contact as BaileysContact,
} from 'baileys';
import qrcode from 'qrcode-terminal';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

import '../signal-log-filter.js'; // silence libsignal's console session chatter
import type { Contact, WhatsAppAdapter } from './whatsapp-adapter.js';

export interface BaileysAdapterOptions {
  /** Directory where the multi-file auth state (creds/keys) is persisted. */
  authDir?: string;
  /**
   * Called with the raw QR string whenever WhatsApp asks the user to log in.
   * Lets the caller coordinate rendering (e.g. pause a spinner). When omitted,
   * the QR is printed to the terminal directly.
   */
  onQr?: (qr: string) => void;
  /** How long `listContacts()` waits for the history sync before giving up (ms). */
  contactSyncTimeoutMs?: number;
}

const USER_JID_SUFFIX = '@s.whatsapp.net';

/** No-op logger so Baileys doesn't spam the CLI with pino JSON output. */
const silentLogger = {
  level: 'silent',
  child: () => silentLogger,
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
} as unknown as Parameters<typeof makeWASocket>[0]['logger'];

/**
 * WhatsApp backend backed by Baileys — talks to WhatsApp's WebSocket directly,
 * no headless browser required. Recipients are phone numbers (digits, with
 * country code, no `+`), e.g. "5511987654321", or full JIDs.
 */
export class BaileysAdapter implements WhatsAppAdapter {
  private sock?: WASocket;
  private readonly authDir: string;
  private readonly contactsFile: string;
  private readonly onQr?: (qr: string) => void;
  private readonly contactSyncTimeoutMs: number;

  private readonly contacts = new Map<string, Contact>();
  private contactsSynced = false;
  private syncWaiters: Array<() => void> = [];

  constructor(options: BaileysAdapterOptions = {}) {
    this.authDir = options.authDir ?? 'auth';
    this.contactsFile = join(this.authDir, 'contacts.json');
    this.onQr = options.onQr;
    this.contactSyncTimeoutMs = options.contactSyncTimeoutMs ?? 8000;
  }

  async connect(): Promise<void> {
    // Seed from previously-synced contacts. WhatsApp only sends the full
    // contact list during the first login's history sync, so on reconnects
    // this cache is the only source until live updates arrive.
    this.loadPersistedContacts();

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    await new Promise<void>((resolve, reject) => {
      const sock = makeWASocket({
        auth: state,
        logger: silentLogger,
        // Ask for the full history on first login so the contact list is
        // delivered (and then persisted) rather than only recent chats.
        syncFullHistory: true,
      });
      this.sock = sock;

      sock.ev.on('creds.update', saveCreds);

      // Collect contacts as they stream in during the initial history sync
      // and from live app-state updates; persist so later runs have them.
      sock.ev.on('messaging-history.set', ({ contacts }) => {
        this.ingestBatch(contacts);
      });
      sock.ev.on('contacts.upsert', (contacts) => {
        this.ingestBatch(contacts);
      });
      sock.ev.on('contacts.update', (contacts) => {
        this.ingestBatch(contacts);
      });
      sock.ev.on('messaging-history.status', ({ status }) => {
        if (status === 'complete') this.markContactsSynced();
      });

      sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          if (this.onQr) {
            this.onQr(qr);
          } else {
            console.log('\nScan this QR code with WhatsApp to log in:\n');
            qrcode.generate(qr, { small: true });
          }
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

  async listContacts(): Promise<Contact[]> {
    // If nothing is cached yet (first login), wait for the history sync to
    // deliver contacts. When we already have some (seeded from disk), return
    // them immediately rather than blocking on a sync that may never re-run.
    if (this.contacts.size === 0 && !this.contactsSynced) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, this.contactSyncTimeoutMs);
        this.syncWaiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }

    return [...this.contacts.values()].sort((a, b) => {
      // Named contacts first, then alphabetical / numeric.
      const named = Number(Boolean(b.name)) - Number(Boolean(a.name));
      if (named !== 0) return named;
      return (a.name ?? a.number).localeCompare(b.name ?? b.number);
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

  /** Merge a batch of Baileys contacts, then persist if anything changed. */
  private ingestBatch(contacts: Partial<BaileysContact>[]): void {
    let changed = false;
    for (const contact of contacts) {
      if (this.ingestContact(contact)) changed = true;
    }
    if (changed) this.persistContacts();
  }

  /** Merge a single Baileys contact into the map, keyed by its user JID. */
  private ingestContact(contact: Partial<BaileysContact>): boolean {
    const jid = contact.phoneNumber ?? contact.id;
    if (!jid || !jid.endsWith(USER_JID_SUFFIX)) return false; // skip groups, @lid, broadcast

    const name = contact.name ?? contact.notify ?? contact.verifiedName;
    const existing = this.contacts.get(jid);
    const merged: Contact = {
      id: jid,
      number: jid.slice(0, -USER_JID_SUFFIX.length),
      name: name ?? existing?.name,
    };

    if (existing && existing.name === merged.name) return false;
    this.contacts.set(jid, merged);
    return true;
  }

  private loadPersistedContacts(): void {
    if (!existsSync(this.contactsFile)) return;
    try {
      const parsed: Contact[] = JSON.parse(readFileSync(this.contactsFile, 'utf8'));
      for (const contact of parsed) {
        if (contact?.id) this.contacts.set(contact.id, contact);
      }
    } catch {
      // Corrupt cache is non-fatal — it will be rebuilt from live events.
    }
  }

  private persistContacts(): void {
    try {
      mkdirSync(this.authDir, { recursive: true });
      writeFileSync(this.contactsFile, JSON.stringify([...this.contacts.values()]));
    } catch {
      // Persistence is best-effort; ignore write failures.
    }
  }

  private markContactsSynced(): void {
    this.contactsSynced = true;
    const waiters = this.syncWaiters;
    this.syncWaiters = [];
    waiters.forEach((resolve) => resolve());
  }
}

/** Normalize a phone number (or raw JID) into a WhatsApp user JID. */
function toJid(recipient: string): string {
  if (recipient.includes('@')) return recipient;
  const digits = recipient.replace(/\D/g, '');
  return `${digits}${USER_JID_SUFFIX}`;
}
