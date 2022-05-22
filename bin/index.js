#!/usr/bin/env node

import readline from 'readline';
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';

import { main } from '../lib/main.js';

clear();
console.log(
  chalk.green(
    figlet.textSync('WhatsTalks', { horizontalLayout: 'controlled smushing' })
  )
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('which contact do you want to send the messages?\n', function (name) {
  main(name)
});

rl.on('close', function () {
  console.log('\nBYE BYE !!!');
  process.exit(0);
});