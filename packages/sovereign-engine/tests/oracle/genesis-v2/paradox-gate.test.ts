// tests/oracle/genesis-v2/paradox-gate.test.ts
// INV-PARADOX-01/02/03 — 8 tests
// W3a — Phase T

import { describe, it, expect } from 'vitest';
import { applyParadoxGate } from '../../../src/oracle/genesis-v2/paradox-gate.js';
import { validateTranscendentPlan } from '../../../src/oracle/genesis-v2/transcendent-planner.js';
import type { TranscendentPlanJSON } from '../../../src/oracle/genesis-v2/transcendent-planner.js';

const VALID_PLAN: TranscendentPlanJSON = {
  subtext_truth: 'La peur de perdre ce qui reste de lien familial',
  objective_correlative: 'tasse ébréchée',
  forbidden_lexicon: ['peur', 'amour', 'tristesse', 'solitude', 'abandon'],
  forbidden_lemmes: ['trembl', 'pleur', 'souffr'],
  forbidden_bigrammes: ['il savait', 'elle comprit', 'le silence'],
  likely_metaphor: 'un mur invisible entre eux',
  subversion_angle: 'Le mur est en fait une porte restée ouverte que personne ne franchit',
  master_axes_targets: { tension_14d: 0.8, signature: 0.7, interiorite: 0.75 },
};

const CLEAN_PROSE = `La tasse ébréchée reposait sur le rebord de la fenêtre. L'air du soir portait l'odeur des pins.
Il avait posé ses mains à plat sur le bois de la table, les doigts écartés.
Le froid descendait des montagnes. La lumière changeait.`;

describe('paradox-gate — INV-PARADOX-01/02/03', () => {

  // Test 1: prose propre, ancre présente → PASS
  it('prose sans mots bannis + ancre présente → PASS', () => {
    const result = applyParadoxGate(CLEAN_PROSE, VALID_PLAN);
    expect(result.passed).toBe(true);
    expect(result.verdict).toBe('PASS');
    expect(result.violations).toHaveLength(0);
  });

  // Test 2: mot banni "peur" → REJECT INV-PARADOX-01
  it('mot banni "peur" → REJECT INV-PARADOX-01', () => {
    const prose = CLEAN_PROSE + ' La peur montait en lui.';
    const result = applyParadoxGate(prose, VALID_PLAN);
    expect(result.passed).toBe(false);
    expect(result.verdict).toBe('REJECT');
    const v = result.violations.find(v => v.evidence === 'peur');
    expect(v).toBeDefined();
    expect(v!.invariant).toBe('INV-PARADOX-01');
  });

  // Test 3: lemme banni "trembl" → REJECT INV-PARADOX-01
  it('lemme banni "trembl" → REJECT INV-PARADOX-01', () => {
    const prose = CLEAN_PROSE + ' Ses doigts tremblaient.';
    const result = applyParadoxGate(prose, VALID_PLAN);
    expect(result.passed).toBe(false);
    const v = result.violations.find(v => v.evidence === 'trembl');
    expect(v).toBeDefined();
    expect(v!.invariant).toBe('INV-PARADOX-01');
  });

  // Test 4: bigramme banni "il savait" → REJECT INV-PARADOX-01
  it('bigramme banni "il savait" → REJECT INV-PARADOX-01', () => {
    const prose = CLEAN_PROSE + ' Il savait que rien ne changerait.';
    const result = applyParadoxGate(prose, VALID_PLAN);
    expect(result.passed).toBe(false);
    const v = result.violations.find(v => v.evidence === 'il savait');
    expect(v).toBeDefined();
    expect(v!.invariant).toBe('INV-PARADOX-01');
  });

  // Test 5: métaphore prévisible (60%+ tokens) → REJECT INV-PARADOX-02
  it('métaphore prévisible (60%+ tokens) → REJECT INV-PARADOX-02', () => {
    // likely_metaphor = "un mur invisible entre eux" → tokens>4: "invisible", "entre"
    const prose = CLEAN_PROSE + ' Un mur invisible se dressait entre eux, infranchissable.';
    const result = applyParadoxGate(prose, VALID_PLAN);
    expect(result.passed).toBe(false);
    const v = result.violations.find(v => v.invariant === 'INV-PARADOX-02');
    expect(v).toBeDefined();
  });

  // Test 6: ancre sensorielle absente → REJECT INV-PARADOX-03
  it('ancre sensorielle absente → REJECT INV-PARADOX-03', () => {
    const prose = 'Le vent soufflait sur la plaine. Rien ne bougeait. La nuit tombait lentement.';
    const result = applyParadoxGate(prose, VALID_PLAN);
    expect(result.passed).toBe(false);
    const v = result.violations.find(v => v.invariant === 'INV-PARADOX-03');
    expect(v).toBeDefined();
  });

  // Test 7: violations multiples → toutes listées
  it('violations multiples → toutes listées', () => {
    const prose = 'La peur montait. Il savait que la solitude le rattrapait. Un mur invisible entre eux.';
    const result = applyParadoxGate(prose, VALID_PLAN);
    expect(result.passed).toBe(false);
    // Au moins 3 types de violations: forbidden word + bigramme + métaphore + ancre absente
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
    const invariants = new Set(result.violations.map(v => v.invariant));
    expect(invariants.has('INV-PARADOX-01')).toBe(true);
    expect(invariants.has('INV-PARADOX-03')).toBe(true);
  });

  // Test 8: validateTranscendentPlan: plan incomplet → false
  it('validateTranscendentPlan: plan incomplet → false', () => {
    expect(validateTranscendentPlan(null)).toBe(false);
    expect(validateTranscendentPlan({})).toBe(false);
    expect(validateTranscendentPlan({ subtext_truth: 'trop court' })).toBe(false);
    // Plan complet → true
    expect(validateTranscendentPlan(VALID_PLAN)).toBe(true);
  });
});
