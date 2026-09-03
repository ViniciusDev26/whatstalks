import { describe, it, expect } from 'vitest';

import { toJid, jidToNumber, isUserJid, USER_JID_SUFFIX } from '../src/adapters/jid.js';

describe('toJid', () => {
  it('appends the user suffix to a bare number', () => {
    expect(toJid('5511987654321')).toBe(`5511987654321${USER_JID_SUFFIX}`);
  });

  it('strips formatting characters from a number', () => {
    expect(toJid('+55 (11) 98765-4321')).toBe(`5511987654321${USER_JID_SUFFIX}`);
  });

  it('leaves an existing JID untouched', () => {
    const jid = `5511987654321${USER_JID_SUFFIX}`;
    expect(toJid(jid)).toBe(jid);
    expect(toJid('123@g.us')).toBe('123@g.us');
  });
});

describe('jidToNumber', () => {
  it('extracts digits from a user JID', () => {
    expect(jidToNumber(`5511987654321${USER_JID_SUFFIX}`)).toBe('5511987654321');
  });

  it('returns the input when it is not a user JID', () => {
    expect(jidToNumber('5511987654321')).toBe('5511987654321');
  });
});

describe('isUserJid', () => {
  it('is true only for individual user JIDs', () => {
    expect(isUserJid(`123${USER_JID_SUFFIX}`)).toBe(true);
    expect(isUserJid('123@g.us')).toBe(false);
    expect(isUserJid('123@lid')).toBe(false);
    expect(isUserJid(undefined)).toBe(false);
    expect(isUserJid(null)).toBe(false);
  });
});
