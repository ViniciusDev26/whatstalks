/**
 * Port for a WhatsApp messaging backend.
 *
 * Concrete adapters (Baileys, ...) implement this so `main` can drive the send
 * flow without knowing which transport is underneath.
 *
 * Note: `recipient` semantics are adapter-specific. The Baileys adapter expects
 * a phone number (digits, with country code).
 */
export interface WhatsAppAdapter {
  /** Establish the session, handling QR-code login as needed. Resolves once ready to send. */
  connect(): Promise<void>;

  /** Send a single text message to `recipient`. */
  sendMessage(recipient: string, text: string): Promise<void>;

  /** Tear down the session / close any resources. */
  disconnect(): Promise<void>;
}
