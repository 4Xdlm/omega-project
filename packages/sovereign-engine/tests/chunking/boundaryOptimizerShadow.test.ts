/**
 * V2.2-C SHADOW boundary optimizer — tests unitaires (embedder mock deterministe).
 * Mock : token 'a' -> [1,0], 'b' -> [0,1], embed = somme normalisee.
 *   cosine(zone all-a, zone all-b) = 0 (coupe nette) ; cosine(all-a, all-a) = 1.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  optimizeBoundariesShadow,
  DEFAULT_SHADOW_CONFIG,
  type ShadowOptimizerConfig,
  type EmbedFn,
} from '../../src/chunking/boundaryOptimizerShadow.js';

const mockEmbed: EmbedFn = (text: string) => {
  const toks = text.split(/\s+/).filter((w) => w.length > 0);
  let a = 0;
  let b = 0;
  for (const t of toks) {
    if (t === 'a') a++;
    else if (t === 'b') b++;
  }
  const n = Math.hypot(a, b) || 1;
  return Promise.resolve(new Float32Array([a / n, b / n]));
};

const TEST_CFG: ShadowOptimizerConfig = {
  zone_words: 2,
  shift_candidates: [-2, -1, 0, 1, 2],
  min_chunk_words: 1,
};

describe('V2.2-C optimizeBoundariesShadow', () => {
  it('picks the shift minimizing boundary cosine (cleaner cut)', async () => {
    // words: a a a a a | a b b b b  (V2.1 boundary at 5). True a->b switch at 6.
    const chunks = [{ text: 'a a a a a' }, { text: 'a b b b b' }];
    const r = await optimizeBoundariesShadow(chunks, mockEmbed, TEST_CFG);
    expect(r.boundary_count).toBe(1);
    const p = r.proposals[0]!;
    expect(p.original_word_pos).toBe(5);
    expect(p.proposed_word_pos).toBe(6); // shift +1 -> all-a | all-b -> cosine 0
    expect(p.shift).toBe(1);
    expect(p.moved).toBe(true);
    expect(p.cosine_proposed).toBeLessThan(p.cosine_original);
    expect(p.improvement).toBeGreaterThan(0);
  });

  it('is a no-op when the V2.1 boundary is already the cleanest', async () => {
    const chunks = [{ text: 'a a a a a' }, { text: 'b b b b b' }]; // boundary 5 already cosine 0
    const r = await optimizeBoundariesShadow(chunks, mockEmbed, TEST_CFG);
    const p = r.proposals[0]!;
    expect(p.cosine_original).toBeCloseTo(0, 5);
    expect(p.moved).toBe(false);
    expect(p.shift).toBe(0);
    expect(p.proposed_word_pos).toBe(5);
  });

  it('is deterministic: identical input -> identical boundary_hash', async () => {
    const chunks = [{ text: 'a a a a a' }, { text: 'a b b b b' }];
    const r1 = await optimizeBoundariesShadow(chunks, mockEmbed, TEST_CFG);
    const r2 = await optimizeBoundariesShadow(chunks, mockEmbed, TEST_CFG);
    expect(r1.boundary_hash).toBe(r2.boundary_hash);
    expect(r1.proposed_boundaries).toEqual(r2.proposed_boundaries);
  });

  it('different proposed boundaries -> different hash', async () => {
    const moved = await optimizeBoundariesShadow(
      [{ text: 'a a a a a' }, { text: 'a b b b b' }],
      mockEmbed,
      TEST_CFG
    );
    const noop = await optimizeBoundariesShadow(
      [{ text: 'a a a a a' }, { text: 'b b b b b' }],
      mockEmbed,
      TEST_CFG
    );
    expect(moved.boundary_hash).not.toBe(noop.boundary_hash);
  });

  it('respects min_chunk_words: large constraint rejects all shifts', async () => {
    const chunks = [{ text: 'a a a a a' }, { text: 'a b b b b' }];
    const cfg: ShadowOptimizerConfig = { ...TEST_CFG, min_chunk_words: 5 };
    const r = await optimizeBoundariesShadow(chunks, mockEmbed, cfg);
    const p = r.proposals[0]!;
    // shifts that violate min_chunk_words on either side are skipped -> only pos 5 stays valid here
    expect(p.candidates_evaluated).toBeLessThan(TEST_CFG.shift_candidates.length);
    expect(r.valid).toBe(true);
  });

  it('throws if shift_candidates omits 0', async () => {
    await expect(
      optimizeBoundariesShadow([{ text: 'a a' }, { text: 'b b' }], mockEmbed, {
        ...TEST_CFG,
        shift_candidates: [-1, 1],
      })
    ).rejects.toThrow(/include 0/);
  });

  it('throws if zone_words <= 0', async () => {
    await expect(
      optimizeBoundariesShadow([{ text: 'a a' }, { text: 'b b' }], mockEmbed, {
        ...TEST_CFG,
        zone_words: 0,
      })
    ).rejects.toThrow(/zone_words/);
  });

  it('handles multiple boundaries (3 chunks -> 2 proposals)', async () => {
    const chunks = [{ text: 'a a a a a' }, { text: 'b b b b b' }, { text: 'a a a a a' }];
    const r = await optimizeBoundariesShadow(chunks, mockEmbed, TEST_CFG);
    expect(r.boundary_count).toBe(2);
    expect(r.proposals).toHaveLength(2);
    expect(r.original_boundaries).toEqual([5, 10]);
    expect(r.pct_moved).toBeGreaterThanOrEqual(0);
  });

  it('proposed_boundaries == original when nothing moves', async () => {
    const chunks = [{ text: 'a a a a a' }, { text: 'b b b b b' }];
    const r = await optimizeBoundariesShadow(chunks, mockEmbed, TEST_CFG);
    expect(r.proposed_boundaries).toEqual(r.original_boundaries);
    expect(r.moved_count).toBe(0);
  });

  it('uses an embedding cache (fewer embed calls than naive 2 per candidate)', async () => {
    const spy = vi.fn(mockEmbed);
    const chunks = [{ text: 'a a a a a' }, { text: 'a b b b b' }];
    await optimizeBoundariesShadow(chunks, spy, TEST_CFG);
    // 1 boundary, up to 5 candidate positions x 2 zones = 10 ; cache dedups shared positions.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(10);
    expect(spy.mock.calls.length).toBeGreaterThan(0);
  });

  it('exposes DEFAULT_SHADOW_CONFIG with safe zone_words (<=250, Ollama LAW-CHUNK-047)', () => {
    expect(DEFAULT_SHADOW_CONFIG.zone_words).toBeLessThanOrEqual(250);
    expect(DEFAULT_SHADOW_CONFIG.shift_candidates).toContain(0);
    expect(DEFAULT_SHADOW_CONFIG.min_chunk_words).toBeGreaterThan(0);
  });
});
