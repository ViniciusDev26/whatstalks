import type { Contact } from './adapters/whatsapp-adapter.js';
import { USER_JID_SUFFIX } from './adapters/jid.js';

/** A choice shown in the recipient search prompt. */
export interface RecipientChoice {
  name: string;
  value: string;
}

/** Minimum digit count before we treat a search term as a sendable number. */
export const MIN_PHONE_DIGITS = 8;

/** Human-readable label for a contact: "Name (number)" or just the number. */
export function contactLabel(contact: Contact): string {
  return contact.name ? `${contact.name} (${contact.number})` : contact.number;
}

/**
 * Build the recipient choices for a search term:
 * - empty term → all contacts (capped at `limit`)
 * - text term → contacts whose name or number contains it
 * - a long-enough numeric term that isn't already a contact → a top
 *   "manual number" choice so you can message someone not in your list
 */
export function buildRecipientChoices(
  contacts: Contact[],
  term: string | undefined,
  limit = 50
): RecipientChoice[] {
  const raw = (term ?? '').trim();
  const needle = raw.toLowerCase();
  const digits = raw.replace(/\D/g, '');

  const choices = contacts
    .filter((c) =>
      needle
        ? (c.name ?? '').toLowerCase().includes(needle) ||
          (digits.length > 0 && c.number.includes(digits))
        : true
    )
    .slice(0, limit)
    .map((c) => ({ name: contactLabel(c), value: c.id }));

  if (digits.length >= MIN_PHONE_DIGITS && !contacts.some((c) => c.number === digits)) {
    choices.unshift({
      name: `Send to ${digits} (manual number)`,
      value: `${digits}${USER_JID_SUFFIX}`,
    });
  }

  return choices;
}
