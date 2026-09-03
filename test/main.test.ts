import { describe, it, expect, vi } from 'vitest';

import { listScripts, loadScript, sendScript } from '../src/main.js';
import type { Contact, WhatsAppAdapter } from '../src/adapters/whatsapp-adapter.js';

/** Minimal in-memory adapter that records what it was asked to send. */
class FakeAdapter implements WhatsAppAdapter {
  sent: Array<{ recipient: string; text: string }> = [];
  connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }
  async listContacts(): Promise<Contact[]> {
    return [];
  }
  async sendMessage(recipient: string, text: string): Promise<void> {
    this.sent.push({ recipient, text });
  }
  async disconnect(): Promise<void> {
    this.connected = false;
  }
}

describe('listScripts', () => {
  it('discovers talk scripts from talks/ (includes shrek)', () => {
    const scripts = listScripts();
    expect(scripts).toContain('shrek');
    expect(scripts).toEqual([...scripts].sort());
  });
});

describe('loadScript', () => {
  it('returns only non-empty lines', () => {
    const lines = loadScript('shrek');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.trim().length > 0)).toBe(true);
  });

  it('throws for an unknown script', () => {
    expect(() => loadScript('does-not-exist')).toThrow();
  });
});

describe('sendScript', () => {
  it('sends every line to the recipient and reports progress', async () => {
    const adapter = new FakeAdapter();
    const lines = ['one', 'two', 'three'];
    const progress: Array<[number, number]> = [];

    await sendScript(adapter, '5511987654321', lines, (s, t) => progress.push([s, t]), 0);

    expect(adapter.sent).toEqual([
      { recipient: '5511987654321', text: 'one' },
      { recipient: '5511987654321', text: 'two' },
      { recipient: '5511987654321', text: 'three' },
    ]);
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('sends in order and stops if the adapter throws', async () => {
    const adapter = new FakeAdapter();
    vi.spyOn(adapter, 'sendMessage').mockImplementation(async (recipient, text) => {
      if (text === 'boom') throw new Error('send failed');
      adapter.sent.push({ recipient, text });
    });

    await expect(sendScript(adapter, 'r', ['ok', 'boom', 'never'], undefined, 0)).rejects.toThrow(
      'send failed'
    );
    expect(adapter.sent).toEqual([{ recipient: 'r', text: 'ok' }]);
  });
});
