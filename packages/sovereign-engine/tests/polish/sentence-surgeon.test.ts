/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SENTENCE SURGEON TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/polish/sentence-surgeon.test.ts
 * Version: 1.0.0 (Sprint 10 Commit 10.2)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariants: ART-POL-01, ART-POL-02, ART-POL-03
 *
 * Tests for sentence surgeon micro-rewrite engine.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  surgeonPass,
  DEFAULT_SURGEON_CONFIG,
  type MicroPatch,
} from '../../src/polish/sentence-surgeon.js';
import { MockSovereignProvider } from '../fixtures/mock-provider.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';

describe('Sentence Surgeon (ART-POL-01, ART-POL-02, ART-POL-03)', () => {
  it('SURG-01: prose with 1 weak sentence → sentence corrected', async () => {
    const provider = new MockSovereignProvider();
    const prose = 'Le cœur battait. Elle marchait lentement.';

    // Scorer mock: improved prose scores higher
    const scorer = async (p: string): Promise<number> => {
      // If prose contains [CORR:vague], it's been rewritten → higher score
      return p.includes('[CORR:vague]') ? 80 : 70;
    };

    const config = {
      ...DEFAULT_SURGEON_CONFIG,
      max_corrections_per_pass: 1, // Only correct 1 sentence
      min_improvement: 5.0,
    };

    const result = await surgeonPass(prose, MOCK_PACKET, provider, scorer, config);

    // Should have attempted 1 correction
    expect(result.patches_attempted).toBe(1);

    // Should have accepted 1 correction (delta = 80 - 70 = 10 > 5)
    expect(result.patches_accepted).toBe(1);
    expect(result.patches_reverted).toBe(0);

    // Prose should be modified
    expect(result.prose_after).not.toBe(result.prose_before);
    expect(result.prose_after).toContain('[CORR:vague]');

    // Patch should be accepted
    expect(result.patches[0].accepted).toBe(true);
    expect(result.patches[0].delta).toBeGreaterThanOrEqual(5.0);
  });

  it('SURG-02: correction that degrades → reverted (ART-POL-01)', async () => {
    const provider = new MockSovereignProvider();
    const prose = 'La phrase est excellente. Elle brille.';

    // Scorer mock: rewritten prose scores LOWER
    const scorer = async (p: string): Promise<number> => {
      // If prose contains [CORR:vague], it's been degraded → lower score
      return p.includes('[CORR:vague]') ? 60 : 80;
    };

    const config = {
      ...DEFAULT_SURGEON_CONFIG,
      max_corrections_per_pass: 1,
      min_improvement: 2.0,
    };

    const result = await surgeonPass(prose, MOCK_PACKET, provider, scorer, config);

    // Should have attempted 1 correction
    expect(result.patches_attempted).toBe(1);

    // Should have reverted 1 correction (delta = 60 - 80 = -20 < 2)
    expect(result.patches_accepted).toBe(0);
    expect(result.patches_reverted).toBe(1);

    // Prose should be UNCHANGED (reverted)
    expect(result.prose_after).toBe(result.prose_before);

    // Patch should be rejected
    expect(result.patches[0].accepted).toBe(false);
    expect(result.patches[0].delta).toBeLessThan(2.0);
  });

  it('SURG-03: 20 weak sentences → max 15 corrections applied (ART-POL-02)', async () => {
    const provider = new MockSovereignProvider();

    // Create prose with 20 sentences
    const sentences: string[] = [];
    for (let i = 0; i < 20; i++) {
      sentences.push(`Phrase ${i + 1}.`);
    }
    const prose = sentences.join(' ');

    // Scorer mock: always improves
    const scorer = async (p: string): Promise<number> => {
      // Count corrections
      const corrections = (p.match(/\[CORR:vague\]/g) || []).length;
      return 70 + corrections * 2; // Each correction adds 2 points
    };

    const config = {
      ...DEFAULT_SURGEON_CONFIG,
      max_corrections_per_pass: 15, // Hard limit
      min_improvement: 1.0,
    };

    const result = await surgeonPass(prose, MOCK_PACKET, provider, scorer, config);

    // Should have attempted exactly 15 corrections (not 20)
    expect(result.patches_attempted).toBe(15);
    expect(result.patches_attempted).toBeLessThanOrEqual(15);

    // All should be accepted (scorer always improves)
    expect(result.patches_accepted).toBe(15);

    // Verify ART-POL-02: max 15 corrections per pass
    expect(result.patches.length).toBe(15);
  });

  it('SURG-04: dry_run=true → all patches rejected, prose unchanged', async () => {
    const provider = new MockSovereignProvider();
    const prose = 'Phrase faible. Autre phrase faible.';

    // Scorer mock: rewritten prose would score higher
    const scorer = async (p: string): Promise<number> => {
      return p.includes('[CORR:vague]') ? 90 : 70;
    };

    const config = {
      ...DEFAULT_SURGEON_CONFIG,
      max_corrections_per_pass: 2,
      min_improvement: 2.0,
      dry_run: true, // Dry run mode
    };

    const result = await surgeonPass(prose, MOCK_PACKET, provider, scorer, config);

    // Should have attempted 2 corrections
    expect(result.patches_attempted).toBe(2);

    // In dry_run, NO corrections should be accepted
    expect(result.patches_accepted).toBe(0);
    expect(result.patches_reverted).toBe(2);

    // Prose should be UNCHANGED
    expect(result.prose_after).toBe(result.prose_before);
    expect(result.prose_after).not.toContain('[CORR:vague]');

    // All patches should have accepted=false
    expect(result.patches[0].accepted).toBe(false);
    expect(result.patches[1].accepted).toBe(false);
  });

  it('SURG-05: SurgeonResult contains complete MicroPatch traceability (ART-POL-03)', async () => {
    const provider = new MockSovereignProvider();
    const prose = 'Première phrase. Deuxième phrase. Troisième phrase.';

    // Scorer mock: alternates between improve and degrade
    const scorer = async (p: string): Promise<number> => {
      const corrections = (p.match(/\[CORR:vague\]/g) || []).length;
      // First correction improves, second degrades, third improves
      if (corrections === 0) return 70;
      if (corrections === 1) return 75; // +5 (accept)
      if (corrections === 2) return 65; // -10 (reject)
      return 78; // +8 (accept)
    };

    const config = {
      ...DEFAULT_SURGEON_CONFIG,
      max_corrections_per_pass: 3,
      min_improvement: 3.0,
    };

    const result = await surgeonPass(prose, MOCK_PACKET, provider, scorer, config);

    // Verify complete traceability
    expect(result.patches.length).toBe(3);

    // Check each MicroPatch has all required fields
    for (const patch of result.patches) {
      expect(patch).toHaveProperty('sentence_index');
      expect(patch).toHaveProperty('original');
      expect(patch).toHaveProperty('rewritten');
      expect(patch).toHaveProperty('reason');
      expect(patch).toHaveProperty('score_before');
      expect(patch).toHaveProperty('score_after');
      expect(patch).toHaveProperty('delta');
      expect(patch).toHaveProperty('accepted');

      // Verify types
      expect(typeof patch.sentence_index).toBe('number');
      expect(typeof patch.original).toBe('string');
      expect(typeof patch.rewritten).toBe('string');
      expect(typeof patch.reason).toBe('string');
      expect(typeof patch.score_before).toBe('number');
      expect(typeof patch.score_after).toBe('number');
      expect(typeof patch.delta).toBe('number');
      expect(typeof patch.accepted).toBe('boolean');

      // Verify delta calculation
      expect(patch.delta).toBe(patch.score_after - patch.score_before);
    }

    // Verify statistics match patches
    const accepted_count = result.patches.filter((p) => p.accepted).length;
    const reverted_count = result.patches.filter((p) => !p.accepted).length;

    expect(result.patches_accepted).toBe(accepted_count);
    expect(result.patches_reverted).toBe(reverted_count);
    expect(result.patches_attempted).toBe(result.patches.length);
  });
});
