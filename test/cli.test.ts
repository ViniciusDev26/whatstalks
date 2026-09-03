import { describe, it, expect, vi } from 'vitest';

import { parseFlag, resolveVersion, helpText } from '../src/cli.js';

describe('parseFlag', () => {
  it('maps version flags', () => {
    expect(parseFlag('--version')).toBe('version');
    expect(parseFlag('-v')).toBe('version');
  });

  it('maps help flags', () => {
    expect(parseFlag('--help')).toBe('help');
    expect(parseFlag('-h')).toBe('help');
  });

  it('defaults to run for no/unknown args', () => {
    expect(parseFlag(undefined)).toBe('run');
    expect(parseFlag('')).toBe('run');
    expect(parseFlag('shrek')).toBe('run');
    expect(parseFlag('--nope')).toBe('run');
  });
});

describe('resolveVersion', () => {
  it('prefers the injected version', () => {
    const reader = vi.fn(() => '9.9.9');
    expect(resolveVersion('2.0.1', reader)).toBe('2.0.1');
    expect(reader).not.toHaveBeenCalled();
  });

  it('falls back to the package reader when not injected', () => {
    expect(resolveVersion(undefined, () => '2.0.1')).toBe('2.0.1');
    expect(resolveVersion('', () => '2.0.1')).toBe('2.0.1');
  });
});

describe('helpText', () => {
  it('includes the version and session path', () => {
    const text = helpText('2.0.1', '/home/me/.config/whatstalks/auth');
    expect(text).toContain('whatstalks v2.0.1');
    expect(text).toContain('/home/me/.config/whatstalks/auth');
    expect(text).toContain('--version');
    expect(text).toContain('--help');
  });
});
