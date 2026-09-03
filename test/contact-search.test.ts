import { describe, it, expect } from 'vitest';

import { buildRecipientChoices, contactLabel } from '../src/contact-search.js';
import type { Contact } from '../src/adapters/whatsapp-adapter.js';

const CONTACTS: Contact[] = [
  { id: '5511111111111@s.whatsapp.net', number: '5511111111111', name: 'Alice' },
  { id: '5522222222222@s.whatsapp.net', number: '5522222222222', name: 'Bob' },
  { id: '5533333333333@s.whatsapp.net', number: '5533333333333' }, // no name
];

describe('contactLabel', () => {
  it('shows "Name (number)" when named', () => {
    expect(contactLabel(CONTACTS[0])).toBe('Alice (5511111111111)');
  });

  it('shows just the number when unnamed', () => {
    expect(contactLabel(CONTACTS[2])).toBe('5533333333333');
  });
});

describe('buildRecipientChoices', () => {
  it('returns every contact for an empty term', () => {
    const choices = buildRecipientChoices(CONTACTS, '');
    expect(choices.map((c) => c.value)).toEqual(CONTACTS.map((c) => c.id));
  });

  it('filters by name (case-insensitive)', () => {
    const choices = buildRecipientChoices(CONTACTS, 'ali');
    expect(choices).toHaveLength(1);
    expect(choices[0].value).toBe(CONTACTS[0].id);
  });

  it('filters by partial number', () => {
    const choices = buildRecipientChoices(CONTACTS, '2222');
    expect(choices.map((c) => c.value)).toEqual([CONTACTS[1].id]);
  });

  it('offers a manual-number choice for an unknown number', () => {
    const choices = buildRecipientChoices(CONTACTS, '5599888877776');
    expect(choices[0]).toEqual({
      name: 'Send to 5599888877776 (manual number)',
      value: '5599888877776@s.whatsapp.net',
    });
  });

  it('does not add a manual choice when the number is already a contact', () => {
    const choices = buildRecipientChoices(CONTACTS, '5511111111111');
    expect(choices.every((c) => !c.name.includes('manual number'))).toBe(true);
    expect(choices[0].value).toBe(CONTACTS[0].id);
  });

  it('does not offer a manual choice for too-few digits', () => {
    const choices = buildRecipientChoices(CONTACTS, '12345');
    expect(choices.some((c) => c.name.includes('manual number'))).toBe(false);
  });

  it('respects the limit', () => {
    const many: Contact[] = Array.from({ length: 100 }, (_, i) => ({
      id: `${i}@s.whatsapp.net`,
      number: String(i),
      name: `C${i}`,
    }));
    expect(buildRecipientChoices(many, '', 10)).toHaveLength(10);
  });
});
