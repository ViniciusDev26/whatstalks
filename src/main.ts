import type { WhatsAppAdapter } from './adapters/whatsapp-adapter.js';
import { TALKS } from './talks.generated.js';

/** Names of the talk scripts embedded at build time (see scripts/embed-talks.mjs). */
export function listScripts(): string[] {
  return Object.keys(TALKS).sort();
}

/** Return a talk script's non-empty lines by name. Throws if it doesn't exist. */
export function loadScript(name: string): string[] {
  const lines = TALKS[name];
  if (!lines) throw new Error(`Unknown talk script: ${name}`);
  return lines;
}

/**
 * Send each line to `recipient` through the adapter, invoking `onProgress`
 * after every message. Assumes the adapter is already connected. `delayMs`
 * throttles between messages (default 100ms; pass 0 in tests).
 */
export async function sendScript(
  adapter: WhatsAppAdapter,
  recipient: string,
  lines: string[],
  onProgress?: (sent: number, total: number) => void,
  delayMs = 100
): Promise<void> {
  const total = lines.length;
  for (const [index, line] of lines.entries()) {
    await adapter.sendMessage(recipient, line);
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    onProgress?.(index + 1, total);
  }
}
