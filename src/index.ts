#!/usr/bin/env node

import { search, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';
import cliProgress from 'cli-progress';
import qrcode from 'qrcode-terminal';

import { BaileysAdapter } from './adapters/baileys-adapter.js';
import type { Contact } from './adapters/whatsapp-adapter.js';
import { listScripts, loadScript, sendScript } from './main.js';

function contactLabel(contact: Contact): string {
  return contact.name ? `${contact.name} (${contact.number})` : contact.number;
}

async function pickRecipient(contacts: Contact[]): Promise<{ jid: string; label: string }> {
  const jid = await search<string>({
    message: 'Search a contact (or type a phone number with country code):',
    source: (term) => {
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
        .slice(0, 50)
        .map((c) => ({ name: contactLabel(c), value: c.id }));

      // Always allow sending to a raw number that isn't in the contact list.
      if (digits.length >= 8 && !contacts.some((c) => c.number === digits)) {
        choices.unshift({
          name: `Send to ${digits} (manual number)`,
          value: `${digits}@s.whatsapp.net`,
        });
      }

      return choices;
    },
  });

  const chosen = contacts.find((c) => c.id === jid);
  return { jid, label: chosen ? contactLabel(chosen) : jid.replace(/@.*/, '') };
}

async function run(): Promise<void> {
  console.clear();
  console.log(
    chalk.green(
      figlet.textSync('WhatsTalks', { horizontalLayout: 'controlled smushing' })
    )
  );
  console.log();

  const scripts = listScripts();
  if (scripts.length === 0) {
    console.error(chalk.red('No talk scripts found in talks/.'));
    process.exit(1);
  }

  // 1. Connect first so we can pull the contact list.
  const spinner = ora('Connecting to WhatsApp...').start();
  const adapter = new BaileysAdapter({
    onQr: (qr) => {
      spinner.stop();
      console.log('\nScan this QR code with WhatsApp to log in:\n');
      qrcode.generate(qr, { small: true });
      spinner.start('Waiting for you to scan the QR code...');
    },
  });

  try {
    await adapter.connect();
    spinner.succeed('Connected to WhatsApp.');
  } catch (err) {
    spinner.fail('Failed to connect.');
    throw err;
  }

  // 2. Load contacts, then let the user search/select the recipient.
  spinner.start('Loading contacts...');
  const contacts = await adapter.listContacts();
  if (contacts.length > 0) {
    spinner.succeed(`Loaded ${contacts.length} contacts.`);
  } else {
    spinner.warn(
      'No contacts synced yet — type a phone number below. ' +
        '(Tip: delete the auth/ folder and re-scan to sync your contact list.)'
    );
  }

  const { jid, label } = await pickRecipient(contacts);

  // 3. Pick the script, confirm, then send.
  const script = await select({
    message: 'Which talk script do you want to send?',
    choices: scripts.map((name) => ({ name, value: name })),
  });

  const lines = loadScript(script);

  const proceed = await confirm({
    message: `Send ${chalk.bold(String(lines.length))} messages from ${chalk.bold(
      script
    )} to ${chalk.bold(label)}?`,
  });

  if (!proceed) {
    console.log(chalk.yellow('Aborted.'));
    await adapter.disconnect();
    return;
  }

  const bar = new cliProgress.SingleBar(
    {
      format: `Sending |${chalk.green('{bar}')}| {value}/{total} messages`,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  bar.start(lines.length, 0);

  try {
    await sendScript(adapter, jid, lines, (sent) => bar.update(sent));
  } finally {
    bar.stop();
    await adapter.disconnect();
  }

  console.log(chalk.green('\nDone! Messages sent.'));
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    // Inquirer throws this when the user hits Ctrl-C at a prompt.
    if (err instanceof Error && err.name === 'ExitPromptError') {
      console.log(chalk.yellow('\nBYE BYE !!!'));
      process.exit(0);
    }
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  });
