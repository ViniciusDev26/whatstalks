import { describe, it, expect, vi, afterEach } from 'vitest';

import { isSignalNoise, installSignalLogFilter } from '../src/signal-log-filter.js';

describe('isSignalNoise', () => {
  it('matches libsignal session-lifecycle messages', () => {
    expect(isSignalNoise(['Closing session:', {}])).toBe(true);
    expect(isSignalNoise(['Opening session:', {}])).toBe(true);
    expect(isSignalNoise(['Migrating session to:', 'v2'])).toBe(true);
    expect(isSignalNoise(['Removing old closed session:', {}])).toBe(true);
    expect(isSignalNoise(['Session already closed'])).toBe(true);
    expect(isSignalNoise(['Session already open'])).toBe(true);
    expect(isSignalNoise(['Closing open session in favor of incoming prekey bundle'])).toBe(true);
  });

  it('does not match normal output', () => {
    expect(isSignalNoise(['Connected to WhatsApp.'])).toBe(false);
    expect(isSignalNoise(['something about a session in the middle'])).toBe(false);
    expect(isSignalNoise([{ not: 'a string' }])).toBe(false);
    expect(isSignalNoise([])).toBe(false);
  });
});

describe('installSignalLogFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('suppresses noise but passes normal logs through', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    installSignalLogFilter();

    console.info('Closing session:', { big: 'object' });
    console.info('a real message');

    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('a real message');
  });
});
