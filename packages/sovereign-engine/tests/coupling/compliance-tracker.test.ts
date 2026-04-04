/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * compliance-tracker.test.ts — Tests for Bridge-04 Compliance Tracker
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * INV-CT-01..15: Compliance measurement, failure tracking, downgrade signals.
 * CALC pur — zéro appel LLM.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Date: 2026-04-04 (P2-02 Bridge-04)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  measureCompliance,
  getDowngradeSignals,
  logCompliance,
  resetComplianceCounters,
} from '../../src/coupling/compliance-tracker.js';
import type {
  ComplianceSnapshot,
  DowngradeSignal,
} from '../../src/coupling/compliance-tracker.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Prose with high contrast markers density */
const PROSE_HIGH_CONTRAST = `
  Pierre entra mais ne dit rien. Pourtant il savait. Cependant Marie restait
  immobile. Tandis que le silence s'épaississait, elle sentit une pression
  monter. En revanche lui demeurait calme. Toutefois ses mains tremblaient.
  Néanmoins il avança. Au contraire de ce qu'elle attendait, il sourit.
  Malgré tout, le froid persistait entre eux. Or c'était la fin.
  Pierre observait le mur. Le plafond craqua. Les mots restaient coincés
  dans sa gorge. Il respirait lentement. La cuisine sentait le métal.
  Marie bougea enfin, lentement. Le robinet gouttait. Pierre ferma les yeux.
  Il se souvint des jours anciens. Le silence était devenu un mur.
`.trim();

/** Prose with zero contrast markers — should fail contrast compliance */
const PROSE_NO_CONTRAST = `
  Pierre entra dans la cuisine. Marie était assise. Il posa ses clés sur
  la table. Elle leva les yeux. Il dit bonjour. Elle répondit. Le repas
  était prêt. Ils mangèrent en silence. La soirée passa. Pierre monta
  se coucher. Marie resta en bas. La maison était calme. Les heures
  défilèrent. L'aube arriva. Pierre se leva. Marie dormait encore.
  Le café était froid. Pierre le réchauffa. Il avala une gorgée.
  Le journal était sur la table. Il le parcourut. Rien de neuf.
`.trim();

/** Very short prose — edge case */
const PROSE_SHORT = 'Pierre entra.';

/** Prose with strong opening hook */
const PROSE_STRONG_HOOK = `
  Quand Pierre ouvrit la porte, il ne reconnut rien. Soudain le silence
  le frappa. Jamais il n'avait ressenti un tel vide. Sans un mot, il avança
  dans le couloir sombre. Malgré la peur, il continua. Les murs suintaient.
  Le sol craquait sous ses pas. L'odeur de moisi envahissait tout.
`.trim();

/** Prose with no hook signals */
const PROSE_NO_HOOK = `
  Pierre marchait dans la rue. Le soleil brillait. Les oiseaux chantaient.
  Il portait un manteau gris. Sa mallette était lourde. Le bureau était
  loin encore. Les passants le croisaient. Personne ne le regardait.
`.trim();

/** Prose with high bigram repetition (low redundancy compliance) */
const PROSE_REPETITIVE = `
  Pierre marchait lentement. Pierre marchait lentement. Pierre marchait
  lentement dans la rue. Pierre marchait lentement dans la rue sombre.
  Pierre marchait lentement dans la rue sombre et froide. Pierre marchait
  lentement dans la rue sombre et froide ce soir. Il marchait lentement.
  Pierre marchait encore. Pierre marchait toujours. Pierre marchait sans fin.
  Pierre marchait lentement dans le silence. Pierre marchait lentement.
`.trim();

const ACTIVE_FEATURES_ALL = [
  'f24e_contrast_score',
  'f15b_redundancy_compression',
  'f16a_bigram_rarity',
  'f29d_ttr_score',
  'f35c_hook_score',
];

const EXPECTED_COMPLIANCE: Record<string, number> = {
  f24e_contrast_score: 0.80,
  f15b_redundancy_compression: 0.90,
  f16a_bigram_rarity: 0.85,
  f29d_ttr_score: 0.75,
  f35c_hook_score: 0.70,
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('compliance-tracker (Bridge-04)', () => {
  beforeEach(() => {
    resetComplianceCounters();
  });

  // ── INV-CT-01: Basic snapshot structure ──

  it('INV-CT-01: measureCompliance returns a valid ComplianceSnapshot', () => {
    const snapshot = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-001',
      ACTIVE_FEATURES_ALL,
      EXPECTED_COMPLIANCE,
    );

    expect(snapshot.timestamp).toBeTruthy();
    expect(snapshot.scene_id).toBe('scene-001');
    expect(snapshot.features).toHaveLength(5);
    expect(typeof snapshot.overall_compliance).toBe('number');
    expect(Array.isArray(snapshot.alerts)).toBe(true);
  });

  // ── INV-CT-02: Each feature has required fields ──

  it('INV-CT-02: each FeatureComplianceResult has all required fields', () => {
    const snapshot = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-002',
      ACTIVE_FEATURES_ALL,
      EXPECTED_COMPLIANCE,
    );

    for (const feat of snapshot.features) {
      expect(feat.feature).toBeTruthy();
      expect(typeof feat.expected_compliance).toBe('number');
      expect(typeof feat.measured_compliance).toBe('number');
      expect(typeof feat.compliant).toBe('boolean');
      expect(feat.method).toBe('CALC');
    }
  });

  // ── INV-CT-03: Unknown feature → NO_CHECKER ──

  it('INV-CT-03: unknown feature returns NO_CHECKER with measured=-1', () => {
    const snapshot = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-003',
      ['f99z_nonexistent'],
      { f99z_nonexistent: 0.80 },
    );

    expect(snapshot.features).toHaveLength(1);
    expect(snapshot.features[0].method).toBe('NO_CHECKER');
    expect(snapshot.features[0].measured_compliance).toBe(-1);
    expect(snapshot.features[0].compliant).toBe(false);
  });

  // ── INV-CT-04: Overall compliance is average of valid results ──

  it('INV-CT-04: overall_compliance = mean of valid measured values', () => {
    const snapshot = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-004',
      ACTIVE_FEATURES_ALL,
      EXPECTED_COMPLIANCE,
    );

    const validResults = snapshot.features.filter(f => f.measured_compliance >= 0);
    const expectedMean = validResults.reduce((s, f) => s + f.measured_compliance, 0) / validResults.length;
    expect(snapshot.overall_compliance).toBeCloseTo(expectedMean, 2);
  });

  // ── INV-CT-05: High-contrast prose → contrast feature compliant ──

  it('INV-CT-05: high-contrast prose passes f24e_contrast_score', () => {
    const snapshot = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-005',
      ['f24e_contrast_score'],
      { f24e_contrast_score: 0.80 },
    );

    expect(snapshot.features[0].measured_compliance).toBeGreaterThanOrEqual(0.50);
    expect(snapshot.features[0].compliant).toBe(true);
  });

  // ── INV-CT-06: No-contrast prose → contrast feature non-compliant ──

  it('INV-CT-06: no-contrast prose fails f24e_contrast_score', () => {
    const snapshot = measureCompliance(
      PROSE_NO_CONTRAST,
      'scene-006',
      ['f24e_contrast_score'],
      { f24e_contrast_score: 0.80 },
    );

    expect(snapshot.features[0].measured_compliance).toBeLessThan(0.50);
    expect(snapshot.features[0].compliant).toBe(false);
  });

  // ── INV-CT-07: Strong hook → f35c compliant ──

  it('INV-CT-07: strong hook prose passes f35c_hook_score', () => {
    const snapshot = measureCompliance(
      PROSE_STRONG_HOOK,
      'scene-007',
      ['f35c_hook_score'],
      { f35c_hook_score: 0.70 },
    );

    expect(snapshot.features[0].measured_compliance).toBeGreaterThanOrEqual(0.50);
    expect(snapshot.features[0].compliant).toBe(true);
  });

  // ── INV-CT-08: No hook → f35c non-compliant ──

  it('INV-CT-08: no-hook prose fails f35c_hook_score', () => {
    const snapshot = measureCompliance(
      PROSE_NO_HOOK,
      'scene-008',
      ['f35c_hook_score'],
      { f35c_hook_score: 0.70 },
    );

    expect(snapshot.features[0].measured_compliance).toBeLessThan(0.50);
    expect(snapshot.features[0].compliant).toBe(false);
  });

  // ── INV-CT-09: Short prose edge case — no crash ──

  it('INV-CT-09: short prose does not crash, returns valid snapshot', () => {
    const snapshot = measureCompliance(
      PROSE_SHORT,
      'scene-009',
      ACTIVE_FEATURES_ALL,
      EXPECTED_COMPLIANCE,
    );

    expect(snapshot.features).toHaveLength(5);
    expect(typeof snapshot.overall_compliance).toBe('number');
    expect(Number.isFinite(snapshot.overall_compliance)).toBe(true);
  });

  // ── INV-CT-10: Empty prose edge case ──

  it('INV-CT-10: empty prose returns zero compliance without crash', () => {
    const snapshot = measureCompliance(
      '',
      'scene-010',
      ['f24e_contrast_score'],
      { f24e_contrast_score: 0.80 },
    );

    expect(snapshot.features[0].measured_compliance).toBe(0);
    expect(snapshot.features[0].compliant).toBe(false);
  });

  // ── INV-CT-11: Consecutive failures trigger DOWNGRADE ──

  it('INV-CT-11: 3 consecutive failures → DOWNGRADE signal', () => {
    // Run 3 times with failing prose for contrast
    for (let i = 0; i < 3; i++) {
      measureCompliance(
        PROSE_NO_CONTRAST,
        `scene-011-${i}`,
        ['f24e_contrast_score'],
        { f24e_contrast_score: 0.80 },
      );
    }

    const signals = getDowngradeSignals();
    const contrastSignal = signals.find(s => s.feature === 'f24e_contrast_score');
    expect(contrastSignal).toBeDefined();
    expect(contrastSignal!.action).toBe('DOWNGRADE');
    expect(contrastSignal!.consecutive_failures).toBe(3);
  });

  // ── INV-CT-12: Success resets failure counter ──

  it('INV-CT-12: success after 2 failures resets counter (no DOWNGRADE)', () => {
    // 2 failures
    for (let i = 0; i < 2; i++) {
      measureCompliance(
        PROSE_NO_CONTRAST,
        `scene-012-fail-${i}`,
        ['f24e_contrast_score'],
        { f24e_contrast_score: 0.80 },
      );
    }

    // 1 success — resets counter
    measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-012-success',
      ['f24e_contrast_score'],
      { f24e_contrast_score: 0.80 },
    );

    const signals = getDowngradeSignals();
    const contrastSignal = signals.find(s => s.feature === 'f24e_contrast_score');
    // Either absent or counter = 0
    expect(contrastSignal).toBeUndefined();
  });

  // ── INV-CT-13: WATCH alert before DOWNGRADE threshold ──

  it('INV-CT-13: 1-2 failures produce WATCH alerts', () => {
    const snapshot = measureCompliance(
      PROSE_NO_CONTRAST,
      'scene-013',
      ['f24e_contrast_score'],
      { f24e_contrast_score: 0.80 },
    );

    expect(snapshot.alerts.length).toBeGreaterThan(0);
    expect(snapshot.alerts[0]).toContain('WATCH');
    expect(snapshot.alerts[0]).toContain('f24e_contrast_score');
  });

  // ── INV-CT-14: resetComplianceCounters clears all state ──

  it('INV-CT-14: resetComplianceCounters clears failure counters', () => {
    // Accumulate 2 failures
    for (let i = 0; i < 2; i++) {
      measureCompliance(
        PROSE_NO_CONTRAST,
        `scene-014-${i}`,
        ['f24e_contrast_score'],
        { f24e_contrast_score: 0.80 },
      );
    }

    resetComplianceCounters();

    const signals = getDowngradeSignals();
    expect(signals).toHaveLength(0);
  });

  // ── INV-CT-15: Repetitive prose → low redundancy compliance ──

  it('INV-CT-15: repetitive prose has lower f15b_redundancy_compression', () => {
    const snapshotRepetitive = measureCompliance(
      PROSE_REPETITIVE,
      'scene-015-rep',
      ['f15b_redundancy_compression'],
      { f15b_redundancy_compression: 0.90 },
    );

    const snapshotGood = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-015-good',
      ['f15b_redundancy_compression'],
      { f15b_redundancy_compression: 0.90 },
    );

    expect(snapshotRepetitive.features[0].measured_compliance)
      .toBeLessThan(snapshotGood.features[0].measured_compliance);
  });

  // ── INV-CT-16: logCompliance does not throw ──

  it('INV-CT-16: logCompliance runs without error', () => {
    const snapshot = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-016',
      ACTIVE_FEATURES_ALL,
      EXPECTED_COMPLIANCE,
    );

    expect(() => logCompliance(snapshot)).not.toThrow();
  });

  // ── INV-CT-17: Measured compliance capped at 1.0 ──

  it('INV-CT-17: measured_compliance never exceeds 1.0', () => {
    const snapshot = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-017',
      ACTIVE_FEATURES_ALL,
      EXPECTED_COMPLIANCE,
    );

    for (const feat of snapshot.features) {
      if (feat.measured_compliance >= 0) {
        expect(feat.measured_compliance).toBeLessThanOrEqual(1.0);
      }
    }
  });

  // ── INV-CT-18: Multiple features tracked independently ──

  it('INV-CT-18: downgrade counters are per-feature (independent)', () => {
    // Fail contrast 3x but succeed on hook
    for (let i = 0; i < 3; i++) {
      measureCompliance(
        PROSE_NO_CONTRAST, // fails contrast, but has some hook signals
        `scene-018-${i}`,
        ['f24e_contrast_score', 'f15b_redundancy_compression'],
        EXPECTED_COMPLIANCE,
      );
    }

    const signals = getDowngradeSignals();
    const contrastSignal = signals.find(s => s.feature === 'f24e_contrast_score');
    const redundancySignal = signals.find(s => s.feature === 'f15b_redundancy_compression');

    // Contrast should be DOWNGRADE (3 failures)
    expect(contrastSignal).toBeDefined();
    expect(contrastSignal!.action).toBe('DOWNGRADE');

    // Redundancy may or may not have failed — but should be tracked independently
    if (redundancySignal) {
      expect(redundancySignal.consecutive_failures).toBeLessThanOrEqual(3);
    }
  });

  // ── INV-CT-19: TTR compliance on diverse prose ──

  it('INV-CT-19: diverse prose has good f29d_ttr_score compliance', () => {
    // Use high-contrast prose which has diverse vocabulary
    const snapshot = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-019',
      ['f29d_ttr_score'],
      { f29d_ttr_score: 0.75 },
    );

    // Diverse prose should have reasonable TTR
    expect(snapshot.features[0].measured_compliance).toBeGreaterThan(0);
    expect(snapshot.features[0].method).toBe('CALC');
  });

  // ── INV-CT-20: Determinism — same input → same output ──

  it('INV-CT-20: same input produces identical compliance results', () => {
    resetComplianceCounters();
    const snap1 = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-020',
      ACTIVE_FEATURES_ALL,
      EXPECTED_COMPLIANCE,
    );

    resetComplianceCounters();
    const snap2 = measureCompliance(
      PROSE_HIGH_CONTRAST,
      'scene-020',
      ACTIVE_FEATURES_ALL,
      EXPECTED_COMPLIANCE,
    );

    // Compare feature-by-feature (timestamps will differ)
    for (let i = 0; i < snap1.features.length; i++) {
      expect(snap1.features[i].measured_compliance).toBe(snap2.features[i].measured_compliance);
      expect(snap1.features[i].compliant).toBe(snap2.features[i].compliant);
    }
    expect(snap1.overall_compliance).toBe(snap2.overall_compliance);
  });
});
