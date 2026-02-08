import { describe, it, expect } from 'vitest';
import { validateIntentPack, normalizeIntentPack, hashIntentPack } from '../src/intent-pack.js';
import { INTENT_PACK_A, INTENT_PACK_B, TIMESTAMP } from './fixtures.js';

describe('IntentPack', () => {
  it('validates valid pack A', () => {
    const r = validateIntentPack(INTENT_PACK_A);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('validates valid pack B', () => {
    const r = validateIntentPack(INTENT_PACK_B);
    expect(r.valid).toBe(true);
  });

  it('rejects null', () => {
    const r = validateIntentPack(null);
    expect(r.valid).toBe(false);
  });

  it('rejects missing intent', () => {
    const r = validateIntentPack({ ...INTENT_PACK_A, intent: undefined });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'intent')).toBe(true);
  });

  it('rejects missing canon', () => {
    const r = validateIntentPack({ ...INTENT_PACK_A, canon: undefined });
    expect(r.valid).toBe(false);
  });

  it('rejects missing genome', () => {
    const r = validateIntentPack({ ...INTENT_PACK_A, genome: undefined });
    expect(r.valid).toBe(false);
  });

  it('rejects missing emotion', () => {
    const r = validateIntentPack({ ...INTENT_PACK_A, emotion: undefined });
    expect(r.valid).toBe(false);
  });

  it('rejects missing constraints', () => {
    const r = validateIntentPack({ ...INTENT_PACK_A, constraints: undefined });
    expect(r.valid).toBe(false);
  });

  it('rejects missing metadata', () => {
    const r = validateIntentPack({ ...INTENT_PACK_A, metadata: undefined });
    expect(r.valid).toBe(false);
  });

  it('rejects empty intent title', () => {
    const r = validateIntentPack({ ...INTENT_PACK_A, intent: { ...INTENT_PACK_A.intent, title: '' } });
    expect(r.valid).toBe(false);
  });

  it('normalizes whitespace', () => {
    const pack = { ...INTENT_PACK_A, intent: { ...INTENT_PACK_A.intent, title: '  Le  Gardien  ' } };
    const n = normalizeIntentPack(pack);
    expect(n.intent.title).toBe('Le Gardien');
  });

  it('hash is deterministic', () => {
    const h1 = hashIntentPack(INTENT_PACK_A);
    const h2 = hashIntentPack(INTENT_PACK_A);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});
