import puppeteer, { type Browser, type Page, type ElementHandle } from 'puppeteer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import type { WhatsAppAdapter } from './whatsapp-adapter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * WhatsApp backend backed by Puppeteer + WhatsApp Web (the original transport).
 * Recipients are contact display names as they appear in the chat list.
 *
 * Fragile: relies on hardcoded WhatsApp Web DOM selectors that break on UI
 * changes. Kept behind the adapter port as a fallback; Baileys is the default.
 */
export class PuppeteerAdapter implements WhatsAppAdapter {
  private browser?: Browser;
  private page?: Page;
  private chat?: ElementHandle;

  async connect(): Promise<void> {
    this.browser = await puppeteer.launch({ headless: true });
    const page = await this.browser.newPage();
    this.page = page;

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36'
    );
    await page.goto('https://web.whatsapp.com', { waitUntil: 'load' });

    const qrPath = join(__dirname, '..', 'qr.png');
    const qr = await page.waitForSelector('canvas');
    await qr!.screenshot({ path: qrPath });
    console.log(`
    scan QR Code to do Login on Whatsapp and continue.
    access: file://${qrPath}
  `);

    await page.waitForNavigation({ timeout: 50000000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  async sendMessage(recipient: string, text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Not connected. Call connect() before sendMessage().');
    }

    // Open the contact's chat on first send, then reuse the message box.
    if (!this.chat) {
      const contact = await this.page.waitForSelector(`span[title='${recipient}']`);
      await contact!.click();
      const chat = await this.page.waitForSelector("div[class='_1UWac _1LbR4']");
      await chat!.click();
      this.chat = chat!;
    }

    await this.chat.type(text);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await this.chat.press('Enter');
  }

  async disconnect(): Promise<void> {
    await this.browser?.close();
    this.browser = undefined;
    this.page = undefined;
    this.chat = undefined;
  }
}
