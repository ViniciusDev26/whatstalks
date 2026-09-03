/** A selectable WhatsApp contact. */
export interface Contact {
  /** JID to send to, e.g. "5511987654321@s.whatsapp.net". */
  id: string;
  /** Best-available display name, if the contact has one. */
  name?: string;
  /** Bare phone number (digits only). */
  number: string;
}

/**
 * Port for a WhatsApp messaging backend.
 *
 * Concrete adapters (Baileys, ...) implement this so `main` can drive the send
 * flow without knowing which transport is underneath.
 *
 * Note: `recipient` semantics are adapter-specific. The Baileys adapter expects
 * a phone number (digits, with country code) or a full JID.
 */
export interface WhatsAppAdapter {
  /** Establish the session, handling QR-code login as needed. Resolves once ready to send. */
  connect(): Promise<void>;

  /** Contacts known after login (populated during the initial history sync). */
  listContacts(): Promise<Contact[]>;

  /** Send a single text message to `recipient`. */
  sendMessage(recipient: string, text: string): Promise<void>;

  /** Tear down the session / close any resources. */
  disconnect(): Promise<void>;
}
