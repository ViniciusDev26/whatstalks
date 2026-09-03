#!/usr/bin/env node

import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';
import cliProgress from 'cli-progress';
import qrcode from 'qrcode-terminal';

import { BaileysAdapter } from './adapters/baileys-adapter.js';
import { listScripts, loadScript, sendScript } from './main.js';

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

  const phone = await input({
    message: 'Phone number (digits with country code, e.g. 5511987654321):',
    validate: (value) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 8) return 'Enter a valid phone number with country code.';
      return true;
    },
  });

  const script = await select({
    message: 'Which talk script do you want to send?',
    choices: scripts.map((name) => ({ name, value: name })),
  });

  const lines = loadScript(script);

  const proceed = await confirm({
    message: `Send ${chalk.bold(String(lines.length))} messages from ${chalk.bold(
      script
    )} to ${chalk.bold(phone)}?`,
  });

  if (!proceed) {
    console.log(chalk.yellow('Aborted.'));
    return;
  }

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

  const bar = new cliProgress.SingleBar(
    {
      format: `Sending |${chalk.green('{bar}')}| {value}/{total} messages`,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  bar.start(lines.length, 0);

  try {
    await sendScript(adapter, phone, lines, (sent) => bar.update(sent));
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
