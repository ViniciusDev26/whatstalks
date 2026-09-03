#!/usr/bin/env node

import readline from 'readline';
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';

import { main } from './main.js';

clear();
console.log(
  chalk.green(
    figlet.textSync('WhatsTalks', { horizontalLayout: 'controlled smushing' })
  )
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  'which phone number do you want to send the messages? (digits with country code, e.g. 5511987654321)\n',
  function (phone: string) {
    main(phone.trim())
      .catch((err) => console.error(err))
      .finally(() => rl.close());
  }
);

rl.on('close', function () {
  console.log('\nBYE BYE !!!');
  process.exit(0);
});
