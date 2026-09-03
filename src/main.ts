import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

import type { WhatsAppAdapter } from './adapters/whatsapp-adapter.js';
import { BaileysAdapter } from './adapters/baileys-adapter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Drive the send flow against any WhatsApp adapter: connect, stream the talk
 * file line by line to `recipient`, then disconnect.
 */
export async function main(
  recipient: string,
  adapter: WhatsAppAdapter = new BaileysAdapter()
): Promise<void> {
  await adapter.connect();

  const script = readFileSync(join(__dirname, '..', 'talks', 'shrek.txt'), 'utf8');
  const talks = script.split('\n');

  const total = talks.length;
  for (const [index, talk] of talks.entries()) {
    await adapter.sendMessage(recipient, talk);
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(`${index + 1} / ${total} messages sent`);
  }

  console.log('finish');
  await adapter.disconnect();
}
