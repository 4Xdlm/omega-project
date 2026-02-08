/**
 * OMEGA Forge — Canon Compliance Tests (M1 + M2)
 * Phase C.5 — 8 tests
 */

import { describe, it, expect } from 'vitest';
import { computeM1, computeM2 } from '../../src/quality/canon-compliance.js';
import { makeParagraph, INTENT_PACK_A } from '../fixtures.js';
import type { Canon } from '../../src/types.js';

const canon: Canon = INTENT_PACK_A.canon;

describe('computeM1 — canon contradiction rate', () => {
  it('returns 0 when no contradictions exist', () => {
    const paragraphs = [
      makeParagraph('The lighthouse stood on the remote island, far from the mainland.', 0),
      makeParagraph('Keeper Elias maintained the light with steady hands.', 1),
    ];
    const result = computeM1(paragraphs, canon);
    expect(result).toBe(0);
  });

  it('returns >0 when negation pattern precedes a canon keyword', () => {
    const paragraphs = [
      makeParagraph('There was not a lighthouse on the island at all.', 0),
      makeParagraph('He was never alone in the dark tower.', 1),
    ];
    const result = computeM1(paragraphs, canon);
    expect(result).toBeGreaterThan(0);
  });

  it('returns 0 for empty canon entries', () => {
    const emptyCanon: Canon = { entries: [] };
    const paragraphs = [makeParagraph('Any text goes here without contradiction.', 0)];
    const result = computeM1(paragraphs, emptyCanon);
    expect(result).toBe(0);
  });

  it('handles large canon with many entries', () => {
    const largeCanon: Canon = {
      entries: Array.from({ length: 50 }, (_, i) => ({
        id: `CANON-${String(i).padStart(3, '0')}`,
        category: 'world' as const,
        statement: `Statement number ${i} about unique topic alpha${i}`,
        immutable: true,
      })),
    };
    const paragraphs = [
      makeParagraph('This text mentions nothing relevant.', 0),
    ];
    const result = computeM1(paragraphs, largeCanon);
    expect(result).toBe(0);
  });

  it('handles edge case of empty paragraphs array', () => {
    const result = computeM1([], canon);
    expect(result).toBe(0);
  });

  it('is deterministic across multiple calls', () => {
    const paragraphs = [
      makeParagraph('The lighthouse was not remote at all but nearby.', 0),
      makeParagraph('Elias was never alone in the tower.', 1),
    ];
    const r1 = computeM1(paragraphs, canon);
    const r2 = computeM1(paragraphs, canon);
    expect(r1).toBe(r2);
  });
});

describe('computeM2 — canon compliance ratio', () => {
  it('returns 1.0 when all canon entries are referenced', () => {
    const paragraphs = [
      makeParagraph('The lighthouse on the remote island was 200km from the mainland.', 0),
      makeParagraph('Keeper Elias had been alone for years.', 1),
      makeParagraph('The light must never go out, that was the rule.', 2),
      makeParagraph('Previous keepers had disappeared without explanation.', 3),
      makeParagraph('The ocean around the island was abnormally deep.', 4),
    ];
    const result = computeM2(paragraphs, canon);
    expect(result).toBe(1);
  });

  it('returns <1.0 when some canon entries are missing', () => {
    const paragraphs = [
      makeParagraph('A simple text that mentions lighthouse only.', 0),
    ];
    const result = computeM2(paragraphs, canon);
    expect(result).toBeLessThan(1);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
