import puppeteer from 'puppeteer';
import { join, dirname } from 'path';
import { readFileSync } from 'fs';

async function main(name) {
  const [, __dirname] = dirname(import.meta.url).split('file://');
  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36');
  await page.goto('https://web.whatsapp.com', {
    waitUntil: 'load',
  });

  const path = join(__dirname, "qr.png");
  const qr = await page.waitForSelector("canvas");
  await qr.screenshot({ path });
  console.log(`
    scan QR Code to do Login on Whatsapp and continue.
    access: file://${path}
  `);

  await page.waitForNavigation({
    timeout: 50000000
  });

  await page.waitForTimeout(2000);

  const contact = await page.waitForSelector(`span[title='${name}']`);
  contact.click();

  const chat = await page.waitForSelector("div[class='_1UWac _1LbR4']");
  await chat.click();

  const script = readFileSync(join(__dirname, 'talks', 'shrek.txt'), 'utf8')
  const talks = script.split('\n')

  const total = talks.length;
  for (const [index, talk] of talks.entries()) {
    await chat.type(talk);
    await page.waitForTimeout(100);
    await chat.press('Enter');

    console.log(`${index} / ${total} messages sent`);
  }

  console.log("finish");
  await browser.close();
}

export { main };