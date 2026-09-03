import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync } from 'fs';

import type { WhatsAppAdapter } from './adapters/whatsapp-adapter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TALKS_DIR = join(__dirname, '..', 'talks');

/** Names (without extension) of the talk scripts available under `talks/`. */
export function listScripts(): string[] {
  return readdirSync(TALKS_DIR)
    .filter((file) => file.endsWith('.txt'))
    .map((file) => file.replace(/\.txt$/, ''))
    .sort();
}

/** Read a talk script by name and return its non-empty lines. */
export function loadScript(name: string): string[] {
  const raw = readFileSync(join(TALKS_DIR, `${name}.txt`), 'utf8');
  return raw.split('\n').filter((line) => line.trim().length > 0);
}

/**
 * Send each line to `recipient` through the adapter, invoking `onProgress`
 * after every message. Assumes the adapter is already connected.
 */
export async function sendScript(
  adapter: WhatsAppAdapter,
  recipient: string,
  lines: string[],
  onProgress?: (sent: number, total: number) => void
): Promise<void> {
  const total = lines.length;
  for (const [index, line] of lines.entries()) {
    await adapter.sendMessage(recipient, line);
    await new Promise((resolve) => setTimeout(resolve, 100));
    onProgress?.(index + 1, total);
  }
}
