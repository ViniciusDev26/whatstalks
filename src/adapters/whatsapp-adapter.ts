/**
 * Port for a WhatsApp messaging backend.
 *
 * Concrete adapters (Baileys, Puppeteer, ...) implement this so `main` can
 * drive the send flow without knowing which transport is underneath.
 *
 * Note: `recipient` semantics are adapter-specific. The Baileys adapter expects
 * a phone number (digits, with country code); the Puppeteer adapter expects a
 * contact display name as it appears in the WhatsApp chat list.
 */
export interface WhatsAppAdapter {
  /** Establish the session, handling QR-code login as needed. Resolves once ready to send. */
  connect(): Promise<void>;

  /** Send a single text message to `recipient`. */
  sendMessage(recipient: string, text: string): Promise<void>;

  /** Tear down the session / close any resources. */
  disconnect(): Promise<void>;
}
