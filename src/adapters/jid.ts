/** Suffix of a WhatsApp user JID (individual chat, not group/broadcast/lid). */
export const USER_JID_SUFFIX = '@s.whatsapp.net';

/** Normalize a phone number (or raw JID) into a WhatsApp user JID. */
export function toJid(recipient: string): string {
  if (recipient.includes('@')) return recipient;
  const digits = recipient.replace(/\D/g, '');
  return `${digits}${USER_JID_SUFFIX}`;
}

/** Extract the bare phone number (digits) from a user JID. */
export function jidToNumber(jid: string): string {
  return jid.endsWith(USER_JID_SUFFIX) ? jid.slice(0, -USER_JID_SUFFIX.length) : jid;
}

/** Whether a JID refers to an individual WhatsApp user (not a group/broadcast/lid). */
export function isUserJid(jid: string | undefined | null): jid is string {
  return typeof jid === 'string' && jid.endsWith(USER_JID_SUFFIX);
}
