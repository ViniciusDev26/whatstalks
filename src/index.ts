#!/usr/bin/env node

import { createRequire } from 'node:module';

import { search, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';
import cliProgress from 'cli-progress';
import qrcode from 'qrcode-terminal';

import { BaileysAdapter } from './adapters/baileys-adapter.js';
import { jidToNumber } from './adapters/jid.js';
import type { Contact } from './adapters/whatsapp-adapter.js';
import { parseFlag, resolveVersion, helpText } from './cli.js';
import { buildRecipientChoices, contactLabel } from './contact-search.js';
import { listScripts, loadScript, sendScript } from './main.js';
import { authDir } from './paths.js';

// __WHATSTALKS_VERSION__ is injected at binary build time (e.g. Bun --define);
// otherwise fall back to package.json for the npm-distributed build.
declare const __WHATSTALKS_VERSION__: string;
const VERSION: string = resolveVersion(
  typeof __WHATSTALKS_VERSION__ === 'string' ? __WHATSTALKS_VERSION__ : undefined,
  () => createRequire(import.meta.url)('../package.json').version
);

async function pickRecipient(contacts: Contact[]): Promise<{ jid: string; label: string }> {
  const jid = await search<string>({
    message: 'Search a contact (or type a phone number with country code):',
    source: (term) => buildRecipientChoices(contacts, term),
  });

  const chosen = contacts.find((c) => c.id === jid);
  return { jid, label: chosen ? contactLabel(chosen) : jidToNumber(jid) };
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
    authDir: authDir(),
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

const action = parseFlag(process.argv[2]);
if (action === 'version') {
  console.log(VERSION);
  process.exit(0);
}
if (action === 'help') {
  console.log(helpText(VERSION, authDir()));
  process.exit(0);
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
