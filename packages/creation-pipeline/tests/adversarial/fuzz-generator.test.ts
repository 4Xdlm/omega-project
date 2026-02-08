import { describe, it, expect } from 'vitest';
import { generateFuzzedPacks } from '../../src/adversarial/fuzz-generator.js';
import { INTENT_PACK_A } from '../fixtures.js';
import type { FuzzCategory } from '../../src/types.js';

const CATEGORIES: FuzzCategory[] = ['contradiction', 'ambiguity', 'impossible_constraints', 'empty_fields', 'overflow', 'type_mismatch', 'circular_reference', 'hostile_content'];

describe('FuzzGenerator', () => {
  it('generates requested count', () => {
    const packs = generateFuzzedPacks(INTENT_PACK_A, 10, CATEGORIES);
    expect(packs.length).toBe(10);
  });

  it('covers all categories', () => {
    const packs = generateFuzzedPacks(INTENT_PACK_A, 16, CATEGORIES);
    const cats = new Set(packs.map(p => p.category));
    expect(cats.size).toBe(8);
  });

  it('generates contradiction', () => {
    const packs = generateFuzzedPacks(INTENT_PACK_A, 8, CATEGORIES);
    const c = packs.find(p => p.category === 'contradiction');
    expect(c).toBeTruthy();
    expect(c!.mutation).toBeTruthy();
  });

  it('generates ambiguity', () => {
    const packs = generateFuzzedPacks(INTENT_PACK_A, 8, CATEGORIES);
    const c = packs.find(p => p.category === 'ambiguity');
    expect(c).toBeTruthy();
  });

  it('generates impossible constraints', () => {
    const packs = generateFuzzedPacks(INTENT_PACK_A, 8, CATEGORIES);
    const c = packs.find(p => p.category === 'impossible_constraints');
    expect(c).toBeTruthy();
  });

  it('generates empty fields', () => {
    const packs = generateFuzzedPacks(INTENT_PACK_A, 8, CATEGORIES);
    const c = packs.find(p => p.category === 'empty_fields');
    expect(c).toBeTruthy();
    expect(c!.pack.intent.title).toBe('');
  });

  it('generates overflow', () => {
    const packs = generateFuzzedPacks(INTENT_PACK_A, 8, CATEGORIES);
    const c = packs.find(p => p.category === 'overflow');
    expect(c).toBeTruthy();
    expect(c!.pack.intent.themes.length).toBe(100);
  });

  it('generates type mismatch', () => {
    const packs = generateFuzzedPacks(INTENT_PACK_A, 8, CATEGORIES);
    const c = packs.find(p => p.category === 'type_mismatch');
    expect(c).toBeTruthy();
    expect(c!.pack.genome.target_burstiness).toBe(-1);
  });

  it('generates hostile content', () => {
    const packs = generateFuzzedPacks(INTENT_PACK_A, 8, CATEGORIES);
    const c = packs.find(p => p.category === 'hostile_content');
    expect(c).toBeTruthy();
    expect(c!.pack.intent.title).toContain('script');
  });

  it('deterministic', () => {
    const p1 = generateFuzzedPacks(INTENT_PACK_A, 8, CATEGORIES);
    const p2 = generateFuzzedPacks(INTENT_PACK_A, 8, CATEGORIES);
    expect(p1.map(p => p.fuzz_id)).toEqual(p2.map(p => p.fuzz_id));
  });
});
