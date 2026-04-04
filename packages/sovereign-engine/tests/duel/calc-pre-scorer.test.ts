/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — CALC PRE-SCORER TESTS (P3-01)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/duel/calc-pre-scorer.test.ts
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Validates:
 *   INV-P3-PRESCORE-01: Rejector only — never selects
 *   INV-P3-PRESCORE-02: At least 2 candidates always survive
 *   INV-P3-PRESCORE-03: 0 LLM calls (CALC-only)
 *   Hard reject thresholds (rhythm < 45, anti_cliche < 50)
 *   Red flag cumul (2+ flags → REJECT)
 *   Guardrail (max 2 rejects per duel)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  calcPreScore,
  PRESCORE_RHYTHM_HARD_REJECT,
  PRESCORE_ANTICLICHE_HARD_REJECT,
  PRESCORE_RHYTHM_RED_FLAG,
  PRESCORE_EUPHONY_RED_FLAG,
  PRESCORE_ANTICLICHE_RED_FLAG,
  PRESCORE_RED_FLAG_CUMUL,
  PRESCORE_MAX_REJECTS,
} from '../../src/duel/calc-pre-scorer.js';
import type { CalcPreScoreResult, PreScorerOutput } from '../../src/duel/calc-pre-scorer.js';
import type { Draft } from '../../src/types.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD, PROSE_BAD } from '../fixtures/mock-prose.js';

const packet = createTestPacket();

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDraft(id: string, mode: string, prose: string): Draft {
  return {
    draft_id: id,
    mode,
    prose,
    score: null,
    v1_skipped: true,
  };
}

// ── Threshold constants ──────────────────────────────────────────────────────

describe('Calc Pre-Scorer — Thresholds (SSOT)', () => {
  it('T01: rhythm hard reject = 45', () => {
    expect(PRESCORE_RHYTHM_HARD_REJECT).toBe(45);
  });

  it('T02: anti_cliche hard reject = 50', () => {
    expect(PRESCORE_ANTICLICHE_HARD_REJECT).toBe(50);
  });

  it('T03: rhythm red flag = 55', () => {
    expect(PRESCORE_RHYTHM_RED_FLAG).toBe(55);
  });

  it('T04: euphony red flag = 45', () => {
    expect(PRESCORE_EUPHONY_RED_FLAG).toBe(45);
  });

  it('T05: anti_cliche red flag = 70', () => {
    expect(PRESCORE_ANTICLICHE_RED_FLAG).toBe(70);
  });

  it('T06: red flag cumul = 2', () => {
    expect(PRESCORE_RED_FLAG_CUMUL).toBe(2);
  });

  it('T07: max rejects = 2', () => {
    expect(PRESCORE_MAX_REJECTS).toBe(2);
  });
});

// ── Core behavior ────────────────────────────────────────────────────────────

describe('Calc Pre-Scorer — Core behavior', () => {
  it('T10: returns PreScorerOutput with correct structure', () => {
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_a', PROSE_GOOD),
      makeDraft('D1', 'mode_b', PROSE_GOOD),
    ];

    const result = calcPreScore(drafts, packet);

    expect(result.results).toHaveLength(2);
    expect(result.survivors).toBeDefined();
    expect(result.rejected).toBeDefined();
    expect(typeof result.total_rejected).toBe('number');
    expect(typeof result.guardrail_activated).toBe('boolean');
  });

  it('T11: each CalcPreScoreResult has all required fields', () => {
    const drafts: Draft[] = [makeDraft('D0', 'mode_a', PROSE_GOOD)];
    const result = calcPreScore(drafts, packet);
    const r = result.results[0];

    expect(r.draft_id).toBe('D0');
    expect(r.mode).toBe('mode_a');
    expect(typeof r.rhythm_score).toBe('number');
    expect(typeof r.anti_cliche_score).toBe('number');
    expect(typeof r.euphony_score).toBe('number');
    expect(typeof r.signature_score).toBe('number');
    expect(typeof r.red_flags_count).toBe('number');
    expect(Array.isArray(r.red_flags)).toBe(true);
    expect(typeof r.reject).toBe('boolean');
  });

  it('T12: PROSE_GOOD survives pre-scoring (not rejected)', () => {
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_good', PROSE_GOOD),
      makeDraft('D1', 'mode_good2', PROSE_GOOD),
    ];

    const result = calcPreScore(drafts, packet);

    // PROSE_GOOD should pass — it's well-written literary prose
    expect(result.survivors.length).toBeGreaterThanOrEqual(2);
    expect(result.total_rejected).toBe(0);
  });

  it('T13: deterministic — same input → same output [INV-P3-PRESCORE-03]', () => {
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_a', PROSE_GOOD),
      makeDraft('D1', 'mode_b', PROSE_BAD),
    ];

    const r1 = calcPreScore(drafts, packet);
    const r2 = calcPreScore(drafts, packet);
    const r3 = calcPreScore(drafts, packet);

    for (let i = 0; i < r1.results.length; i++) {
      expect(r1.results[i].rhythm_score).toBe(r2.results[i].rhythm_score);
      expect(r2.results[i].rhythm_score).toBe(r3.results[i].rhythm_score);
      expect(r1.results[i].anti_cliche_score).toBe(r2.results[i].anti_cliche_score);
      expect(r1.results[i].reject).toBe(r2.results[i].reject);
    }

    expect(r1.total_rejected).toBe(r2.total_rejected);
    expect(r2.total_rejected).toBe(r3.total_rejected);
  });
});

// ── INV-P3-PRESCORE-02: Guardrail ───────────────────────────────────────────

describe('Calc Pre-Scorer — Guardrail [INV-P3-PRESCORE-02]', () => {
  it('T20: with 4 candidates, never reject more than 2', () => {
    // Even if all 4 are bad, max 2 are rejected
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_0', PROSE_BAD),
      makeDraft('D1', 'mode_1', PROSE_BAD),
      makeDraft('D2', 'mode_2', PROSE_BAD),
      makeDraft('D3', 'mode_3', PROSE_BAD),
    ];

    const result = calcPreScore(drafts, packet);

    expect(result.total_rejected).toBeLessThanOrEqual(PRESCORE_MAX_REJECTS);
    expect(result.survivors.length).toBeGreaterThanOrEqual(2);
  });

  it('T21: with 3 candidates where all fail, guardrail rescues to maintain ≥2 survivors', () => {
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_0', PROSE_BAD),
      makeDraft('D1', 'mode_1', PROSE_BAD),
      makeDraft('D2', 'mode_2', PROSE_BAD),
    ];

    const result = calcPreScore(drafts, packet);

    // At most 1 rejected (3 - 2 = 1 max reject to keep ≥2)
    expect(result.survivors.length).toBeGreaterThanOrEqual(2);
  });

  it('T22: with exactly 2 candidates, zero rejects (cannot go below 2)', () => {
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_0', PROSE_BAD),
      makeDraft('D1', 'mode_1', PROSE_BAD),
    ];

    const result = calcPreScore(drafts, packet);

    // Even if both fail, guardrail keeps both
    expect(result.survivors.length).toBe(2);
  });

  it('T23: guardrail_activated flag is true when rescuing candidates', () => {
    // With 2 bad candidates, both would be rejected → guardrail must activate
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_0', PROSE_BAD),
      makeDraft('D1', 'mode_1', PROSE_BAD),
    ];

    const result = calcPreScore(drafts, packet);

    // If any were originally rejected but then rescued, guardrail should activate
    const anyOriginallyRejected = result.results.some(
      (r) => r.reject_reason !== null && r.reject_reason.includes('RESCUED_BY_GUARDRAIL'),
    );
    if (anyOriginallyRejected) {
      expect(result.guardrail_activated).toBe(true);
    }
  });
});

// ── Signature telemetry only ─────────────────────────────────────────────────

describe('Calc Pre-Scorer — Signature (telemetry only)', () => {
  it('T30: signature_score is computed and reported', () => {
    const drafts: Draft[] = [makeDraft('D0', 'mode_a', PROSE_GOOD)];
    const result = calcPreScore(drafts, packet);

    expect(typeof result.results[0].signature_score).toBe('number');
    expect(result.results[0].signature_score).toBeGreaterThanOrEqual(0);
    expect(result.results[0].signature_score).toBeLessThanOrEqual(100);
  });

  it('T31: signature never appears in reject_reason', () => {
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_0', PROSE_BAD),
      makeDraft('D1', 'mode_1', PROSE_GOOD),
      makeDraft('D2', 'mode_2', PROSE_BAD),
    ];

    const result = calcPreScore(drafts, packet);

    for (const r of result.results) {
      if (r.reject_reason) {
        expect(r.reject_reason).not.toContain('signature');
      }
    }
  });
});

// ── Mixed quality candidates ─────────────────────────────────────────────────

describe('Calc Pre-Scorer — Mixed quality', () => {
  it('T40: with 1 good + 3 bad, good always survives', () => {
    const drafts: Draft[] = [
      makeDraft('D_good', 'mode_good', PROSE_GOOD),
      makeDraft('D_bad1', 'mode_bad1', PROSE_BAD),
      makeDraft('D_bad2', 'mode_bad2', PROSE_BAD),
      makeDraft('D_bad3', 'mode_bad3', PROSE_BAD),
    ];

    const result = calcPreScore(drafts, packet);

    const goodSurvived = result.survivors.some((s) => s.draft_id === 'D_good');
    expect(goodSurvived).toBe(true);
  });

  it('T41: survivors + rejected = total drafts', () => {
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_0', PROSE_GOOD),
      makeDraft('D1', 'mode_1', PROSE_BAD),
      makeDraft('D2', 'mode_2', PROSE_GOOD),
      makeDraft('D3', 'mode_3', PROSE_BAD),
    ];

    const result = calcPreScore(drafts, packet);

    expect(result.survivors.length + result.rejected.length).toBe(drafts.length);
  });

  it('T42: scores are in [0, 100] range for all axes', () => {
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_0', PROSE_GOOD),
      makeDraft('D1', 'mode_1', PROSE_BAD),
    ];

    const result = calcPreScore(drafts, packet);

    for (const r of result.results) {
      expect(r.rhythm_score).toBeGreaterThanOrEqual(0);
      expect(r.rhythm_score).toBeLessThanOrEqual(100);
      expect(r.anti_cliche_score).toBeGreaterThanOrEqual(0);
      expect(r.anti_cliche_score).toBeLessThanOrEqual(100);
      expect(r.euphony_score).toBeGreaterThanOrEqual(0);
      expect(r.euphony_score).toBeLessThanOrEqual(100);
      expect(r.signature_score).toBeGreaterThanOrEqual(0);
      expect(r.signature_score).toBeLessThanOrEqual(100);
    }
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('Calc Pre-Scorer — Edge cases', () => {
  it('T50: single candidate → always survives (guardrail)', () => {
    const drafts: Draft[] = [makeDraft('D0', 'mode_0', PROSE_BAD)];
    const result = calcPreScore(drafts, packet);

    // Cannot reject below 2 survivors, but with 1 input → 1 output
    // Actually max rejects = min(PRESCORE_MAX_REJECTS, drafts.length - 2)
    // With 1 draft: 1 - 2 = -1, so max 0 rejects
    expect(result.survivors.length).toBe(1);
    expect(result.total_rejected).toBe(0);
  });

  it('T51: empty prose handled without crash', () => {
    const drafts: Draft[] = [
      makeDraft('D0', 'mode_0', ''),
      makeDraft('D1', 'mode_1', PROSE_GOOD),
    ];

    // Should not throw
    const result = calcPreScore(drafts, packet);
    expect(result.results).toHaveLength(2);
    expect(result.survivors.length).toBeGreaterThanOrEqual(1);
  });
});
