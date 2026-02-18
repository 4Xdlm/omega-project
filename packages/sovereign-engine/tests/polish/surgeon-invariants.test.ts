/**
 * ART-10 — Surgeon Invariant Tests
 * INV-01 to INV-06
 *
 * Edge-case invariant tests for surgeonPass, patchParagraph,
 * and SurgeonConfig defaults.
 */
import { describe, it, expect } from 'vitest';
import {
  surgeonPass,
  DEFAULT_SURGEON_CONFIG,
  DEFAULT_MAX_CORRECTIONS,
  DEFAULT_MAX_PASSES,
  DEFAULT_MIN_IMPROVEMENT,
} from '../../src/polish/sentence-surgeon.js';
import { patchParagraph } from '../../src/polish/paragraph-patch.js';
import { MockSovereignProvider } from '../fixtures/mock-provider.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';

describe('Surgeon Invariants (ART-POL-01, ART-POL-02, ART-POL-03)', () => {

  it('INV-01: surgeonPass with empty prose returns zero patches', async () => {
    const provider = new MockSovereignProvider();
    const scorer = async (_p: string): Promise<number> => 50;

    const result = await surgeonPass('', MOCK_PACKET, provider, scorer, DEFAULT_SURGEON_CONFIG);

    expect(result.patches_attempted).toBe(0);
    expect(result.patches_accepted).toBe(0);
    expect(result.patches_reverted).toBe(0);
    expect(result.patches).toHaveLength(0);
    expect(result.prose_before).toBe('');
    expect(result.prose_after).toBe('');
  });

  it('INV-02: surgeonPass is deterministic (same input → same output)', async () => {
    const provider = new MockSovereignProvider();
    const prose = 'Phrase un. Phrase deux. Phrase trois.';
    const scorer = async (p: string): Promise<number> => {
      return p.includes('[CORR:vague]') ? 80 : 70;
    };

    const config = { ...DEFAULT_SURGEON_CONFIG, max_corrections_per_pass: 2, min_improvement: 5.0 };

    const result1 = await surgeonPass(prose, MOCK_PACKET, provider, scorer, config);
    const result2 = await surgeonPass(prose, MOCK_PACKET, provider, scorer, config);

    expect(result1.patches_attempted).toBe(result2.patches_attempted);
    expect(result1.patches_accepted).toBe(result2.patches_accepted);
    expect(result1.prose_after).toBe(result2.prose_after);
    expect(result1.total_score_delta).toBe(result2.total_score_delta);
  });

  it('INV-03: patchParagraph with out-of-bounds index returns original prose', async () => {
    const provider = new MockSovereignProvider();
    const prose = 'Para un.\n\nPara deux.\n\nPara trois.';

    // Negative index
    const result1 = await patchParagraph(prose, -1, 'test', 'fix', MOCK_PACKET, provider);
    expect(result1.accepted).toBe(false);
    expect(result1.patched_prose).toBe(prose);

    // Index too large
    const result2 = await patchParagraph(prose, 99, 'test', 'fix', MOCK_PACKET, provider);
    expect(result2.accepted).toBe(false);
    expect(result2.patched_prose).toBe(prose);
  });

  it('INV-04: all MicroPatch deltas match score_after - score_before', async () => {
    const provider = new MockSovereignProvider();
    const prose = 'Phrase un. Phrase deux. Phrase trois.';
    let callCount = 0;
    const scorer = async (_p: string): Promise<number> => {
      callCount++;
      // Varying scores to create different deltas
      return 50 + callCount * 3;
    };

    const config = { ...DEFAULT_SURGEON_CONFIG, max_corrections_per_pass: 3, min_improvement: 1.0 };
    const result = await surgeonPass(prose, MOCK_PACKET, provider, scorer, config);

    for (const patch of result.patches) {
      const expectedDelta = patch.score_after - patch.score_before;
      expect(patch.delta).toBe(expectedDelta);
    }
  });

  it('INV-05: total_score_delta equals sum of accepted deltas', async () => {
    const provider = new MockSovereignProvider();
    const prose = 'Phrase un. Phrase deux. Phrase trois.';
    const scorer = async (p: string): Promise<number> => {
      return p.includes('[CORR:vague]') ? 80 : 70;
    };

    const config = { ...DEFAULT_SURGEON_CONFIG, max_corrections_per_pass: 3, min_improvement: 5.0 };
    const result = await surgeonPass(prose, MOCK_PACKET, provider, scorer, config);

    const expectedTotal = result.patches
      .filter(p => p.accepted)
      .reduce((sum, p) => sum + p.delta, 0);

    expect(result.total_score_delta).toBe(expectedTotal);
  });

  it('INV-06: DEFAULT_SURGEON_CONFIG enforces hard limits', () => {
    expect(DEFAULT_MAX_CORRECTIONS).toBe(15);
    expect(DEFAULT_MAX_PASSES).toBe(1);
    expect(DEFAULT_MIN_IMPROVEMENT).toBe(2.0);
    expect(DEFAULT_SURGEON_CONFIG.max_corrections_per_pass).toBe(DEFAULT_MAX_CORRECTIONS);
    expect(DEFAULT_SURGEON_CONFIG.max_passes).toBe(DEFAULT_MAX_PASSES);
    expect(DEFAULT_SURGEON_CONFIG.min_improvement).toBe(DEFAULT_MIN_IMPROVEMENT);
    expect(DEFAULT_SURGEON_CONFIG.dry_run).toBe(false);
  });
});
