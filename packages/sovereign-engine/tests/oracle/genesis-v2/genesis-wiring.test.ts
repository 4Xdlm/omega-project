// tests/oracle/genesis-v2/genesis-wiring.test.ts
// GENESIS v2 wiring — 7 tests
// W3a-fix2 — Phase T

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateTranscendentPlan } from '../../../src/oracle/genesis-v2/transcendent-planner.js';
import { applyParadoxGate } from '../../../src/oracle/genesis-v2/paradox-gate.js';
import { isRefusal, REFUSAL_PATTERNS } from '../../../src/validation/real-llm-provider.js';
import type { TranscendentPlanJSON } from '../../../src/oracle/genesis-v2/transcendent-planner.js';

const VALID_PLAN: TranscendentPlanJSON = {
  subtext_truth: 'La peur de perdre ce qui reste de lien familial',
  objective_correlative: 'tasse ébréchée',
  forbidden_lexicon: ['peur', 'amour', 'tristesse', 'solitude', 'abandon'],
  forbidden_lemmes: ['trembl', 'pleur', 'souffr'],
  forbidden_bigrammes: ['il savait', 'elle comprit', 'le silence'],
  likely_metaphor: 'un mur invisible entre eux',
  subversion_angle: 'Le mur est en fait une porte restée ouverte',
  master_axes_targets: { tension_14d: 0.8, signature: 0.7, interiorite: 0.75 },
};

describe('genesis-wiring — GENESIS v2 pipeline integration', () => {

  // Test 1: GENESIS_V2=0 → transcendent_plan undefined safe
  it('GENESIS_V2=0 → transcendent_plan undefined → no paradox gate', () => {
    // When transcendent_plan is undefined, paradox gate should not be called
    // This simulates the non-Genesis flow
    const prose = 'La tasse ébréchée reposait. Le vent portait les cendres. La peur montait.';
    // Calling applyParadoxGate directly would reject (has "peur"),
    // but when plan is undefined the gate is skipped entirely in scoreV2.
    // We verify by checking validateTranscendentPlan(undefined) → false
    expect(validateTranscendentPlan(undefined)).toBe(false);
    expect(validateTranscendentPlan(null)).toBe(false);
  });

  // Test 2: GENESIS_V2=1 + valid plan → validateTranscendentPlan returns true
  it('valid plan JSON → validateTranscendentPlan returns true', () => {
    expect(validateTranscendentPlan(VALID_PLAN)).toBe(true);
    // Verify all required fields checked
    expect(VALID_PLAN.forbidden_lexicon).toHaveLength(5);
    expect(VALID_PLAN.forbidden_lemmes.length).toBeGreaterThanOrEqual(3);
    expect(VALID_PLAN.forbidden_bigrammes.length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(VALID_PLAN.master_axes_targets).length).toBeGreaterThanOrEqual(3);
  });

  // Test 3: Plan invalide (JSON malformé ou incomplet) → fallback gracieux
  it('invalid plan → validateTranscendentPlan returns false, no throw', () => {
    // Missing fields
    expect(validateTranscendentPlan({})).toBe(false);
    // Partially complete
    expect(validateTranscendentPlan({
      subtext_truth: 'short',  // too short (<=10)
      objective_correlative: 'tasse',
      forbidden_lexicon: ['a'],  // too few (<5)
      forbidden_lemmes: [],
      forbidden_bigrammes: [],
      likely_metaphor: 'mur',  // too short (<=5)
      subversion_angle: 'door',
      master_axes_targets: {},  // too few (<3)
    })).toBe(false);
    // Non-object
    expect(validateTranscendentPlan('string')).toBe(false);
    expect(validateTranscendentPlan(42)).toBe(false);
  });

  // Test 4: scoreV2 avec plan valide → paradox gate appelée et rejette les violations
  it('paradox gate active with valid plan → detects forbidden word', () => {
    const prose = 'La tasse ébréchée sur la table. La peur montait en lui, irrésistible.';
    const result = applyParadoxGate(prose, VALID_PLAN);
    expect(result.passed).toBe(false);
    expect(result.verdict).toBe('REJECT');
    // "peur" is in forbidden_lexicon
    const paradox01 = result.violations.filter(v => v.invariant === 'INV-PARADOX-01');
    expect(paradox01.length).toBeGreaterThanOrEqual(1);
    expect(paradox01[0].evidence).toBe('peur');
  });

  // Test 5: W3a-fix2 — empty prose → paradox gate no crash (INV-PARADOX-03 fires)
  it('empty prose → paradox gate graceful (INV-PARADOX-03 only)', () => {
    const result = applyParadoxGate('', VALID_PLAN);
    // No forbidden words to find in empty prose
    const paradox01 = result.violations.filter(v => v.invariant === 'INV-PARADOX-01');
    expect(paradox01).toHaveLength(0);
    // Objective correlative absent
    const paradox03 = result.violations.filter(v => v.invariant === 'INV-PARADOX-03');
    expect(paradox03).toHaveLength(1);
    expect(result.passed).toBe(false);
  });

  // Test 6: W3a-fix2 — violation context contains ~30 chars around match
  it('violation context field contains surrounding text', () => {
    const prose = 'La tasse ébréchée sur la table. La peur montait en lui, irrésistible.';
    const result = applyParadoxGate(prose, VALID_PLAN);
    const paradox01 = result.violations.filter(v => v.invariant === 'INV-PARADOX-01');
    expect(paradox01.length).toBeGreaterThanOrEqual(1);
    const peurViolation = paradox01.find(v => v.evidence === 'peur');
    expect(peurViolation).toBeDefined();
    expect(peurViolation!.context).toBeTruthy();
    expect(peurViolation!.context.length).toBeGreaterThan(0);
    // Context should contain the matched term (normalized)
    expect(peurViolation!.context.toLowerCase()).toContain('peur');
  });

  // Test 7: W3a-fix2 — isRefusal detects safety refusal patterns
  it('isRefusal detects known safety refusal patterns', () => {
    // Empty text = refusal
    expect(isRefusal('')).toBe(true);
    expect(isRefusal('   ')).toBe(true);
    // Known patterns
    expect(isRefusal('Je ne peux pas écrire ce contenu.')).toBe(true);
    expect(isRefusal('I cannot generate that.')).toBe(true);
    expect(isRefusal('As an AI, I must decline.')).toBe(true);
    expect(isRefusal('This violates content policy.')).toBe(true);
    // Normal prose = not refusal
    expect(isRefusal('La tasse ébréchée reposait sur la table.')).toBe(false);
    expect(isRefusal('Le vent soufflait entre les arbres.')).toBe(false);
    // Verify REFUSAL_PATTERNS is non-empty
    expect(REFUSAL_PATTERNS.length).toBeGreaterThanOrEqual(5);
  });
});
