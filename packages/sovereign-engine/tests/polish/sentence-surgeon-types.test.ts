/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SENTENCE SURGEON TYPES TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/polish/sentence-surgeon-types.test.ts
 * Version: 1.0.0 (Sprint 10 Commit 10.1)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariants: ART-POL-01, ART-POL-02
 *
 * Tests for sentence surgeon types and exports.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  type MicroPatchReason,
  type MicroPatch,
  type SurgeonConfig,
  type SurgeonResult,
  DEFAULT_MAX_CORRECTIONS,
  DEFAULT_MAX_PASSES,
  DEFAULT_MIN_IMPROVEMENT,
  DEFAULT_DRY_RUN,
  DEFAULT_SURGEON_CONFIG,
} from '../../src/polish/sentence-surgeon.js';

describe('Sentence Surgeon Types (ART-POL-01, ART-POL-02)', () => {
  it('TYPE-01: compiles TypeScript and all exports visible', () => {
    // Verify MicroPatchReason type (union)
    const reason: MicroPatchReason = 'cliche';
    expect(reason).toBe('cliche');

    // Verify all reason values compile
    const reasons: MicroPatchReason[] = [
      'cliche',
      'rhythm',
      'redundancy',
      'vague',
      'signature',
      'transition',
      'telling',
      'ia_smell',
    ];
    expect(reasons.length).toBe(8);

    // Verify MicroPatch interface shape
    const patch: MicroPatch = {
      sentence_index: 0,
      original: 'Le cœur battait.',
      rewritten: 'Son cœur cognait contre ses côtes.',
      reason: 'cliche',
      score_before: 70.0,
      score_after: 75.0,
      delta: 5.0,
      accepted: true,
    };
    expect(patch.sentence_index).toBe(0);
    expect(patch.accepted).toBe(true);

    // Verify SurgeonConfig interface shape
    const config: SurgeonConfig = {
      max_corrections_per_pass: 15,
      max_passes: 1,
      min_improvement: 2.0,
      dry_run: false,
    };
    expect(config.max_corrections_per_pass).toBe(15);

    // Verify SurgeonResult interface shape
    const result: SurgeonResult = {
      patches_attempted: 5,
      patches_accepted: 3,
      patches_reverted: 2,
      total_score_delta: 10.5,
      patches: [patch],
      prose_before: 'Original prose.',
      prose_after: 'Modified prose.',
    };
    expect(result.patches_attempted).toBe(5);
    expect(result.patches.length).toBe(1);

    // Verify constants exported
    expect(DEFAULT_MAX_CORRECTIONS).toBe(15);
    expect(DEFAULT_MAX_PASSES).toBe(1);
    expect(DEFAULT_MIN_IMPROVEMENT).toBe(2.0);
    expect(DEFAULT_DRY_RUN).toBe(false);

    // Verify DEFAULT_SURGEON_CONFIG
    expect(DEFAULT_SURGEON_CONFIG.max_corrections_per_pass).toBe(15);
    expect(DEFAULT_SURGEON_CONFIG.max_passes).toBe(1);
    expect(DEFAULT_SURGEON_CONFIG.min_improvement).toBe(2.0);
    expect(DEFAULT_SURGEON_CONFIG.dry_run).toBe(false);
  });

  it('TYPE-02: DEFAULT_MAX_CORRECTIONS enforces hard limit (ART-POL-02)', () => {
    // Invariant ART-POL-02: max 15 corrections per pass
    expect(DEFAULT_MAX_CORRECTIONS).toBe(15);
    expect(DEFAULT_MAX_CORRECTIONS).toBeLessThanOrEqual(15);
  });

  it('TYPE-03: DEFAULT_MAX_PASSES enforces hard limit (ART-POL-02)', () => {
    // Invariant ART-POL-02: max 1 pass
    expect(DEFAULT_MAX_PASSES).toBe(1);
  });

  it('TYPE-04: DEFAULT_MIN_IMPROVEMENT positive threshold (ART-POL-01)', () => {
    // Invariant ART-POL-01: min improvement > 0
    expect(DEFAULT_MIN_IMPROVEMENT).toBeGreaterThan(0);
    expect(DEFAULT_MIN_IMPROVEMENT).toBe(2.0);
  });
});
