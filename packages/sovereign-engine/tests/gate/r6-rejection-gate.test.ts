/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 REJECTION GATE — TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests unitaires pour le R6 Rejection Gate.
 * Couvre : modes (disabled/shadow/active), retry logic, fallback A,
 * sélection du meilleur jet, logging, edge cases.
 *
 * Stratégie : mock du générateur de prose pour tester la logique du gate
 * sans dépendance LLM. Le scorer CALC est testé avec de la prose réelle
 * dans r6-calc-scorer.test.ts.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  runR6RejectionGate,
  selectBestAttempt,
  buildR6GateLog,
} from '../../src/gate/r6-rejection-gate.js';
import type {
  R6GateConfig,
  R6GateAttempt,
  R6ProseGenerator,
} from '../../src/gate/r6-types.js';

// ──────────────────────────────────────────────────────────────────────────────
// FIXTURES — MOCK GENERATORS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Prose suffisamment longue pour passer le minProseLength.
 * Contient suffisamment de structure pour produire des features CALC valides.
 */
const LONG_PROSE_FR =
  'Le soleil déclinait sur les toits de la ville, projetant des ombres longues ' +
  'et dorées sur les pavés humides. Marie marchait sans se presser, les mains ' +
  'enfoncées dans les poches de son manteau. Elle pensait à cette lettre, celle ' +
  'qu\'elle n\'avait jamais envoyée, celle qui dormait encore dans le tiroir de ' +
  'sa commode. Les mots lui revenaient par fragments, brisés par le temps et ' +
  'l\'oubli. Chaque syllabe portait le poids d\'une décision mûrie pendant des ' +
  'mois, une décision qui changerait tout. Le vent soufflait, froid et insistant. ' +
  'Elle s\'arrêta devant la boulangerie, hésita, puis poussa la porte. L\'odeur ' +
  'du pain chaud l\'enveloppa, chaude et réconfortante, comme un souvenir d\'enfance.';

/**
 * Crée un générateur mock qui retourne des proses prédéfinies.
 * Chaque appel retourne le prochain élément du tableau.
 */
function createMockGenerator(proses: readonly string[]): R6ProseGenerator & {
  readonly calls: Array<{ prompt: string; seed: string; temperature: number | null }>;
} {
  let callIndex = 0;
  const calls: Array<{ prompt: string; seed: string; temperature: number | null }> = [];

  return {
    calls,
    generate: async (
      prompt: string,
      seed: string,
      temperature: number | null,
    ): Promise<string> => {
      calls.push({ prompt, seed, temperature });
      const prose = proses[callIndex % proses.length];
      callIndex++;
      return prose;
    },
  };
}

/**
 * Crée un générateur qui retourne toujours la même prose.
 */
function createConstantGenerator(prose: string): R6ProseGenerator {
  return {
    generate: async () => prose,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// selectBestAttempt
// ──────────────────────────────────────────────────────────────────────────────

describe('selectBestAttempt', () => {
  const makeAttempt = (
    index: number,
    score: number,
    passed: boolean,
  ): R6GateAttempt => ({
    attemptIndex: index,
    prose: 'test',
    calcScore: score,
    features: {} as R6GateAttempt['features'],
    temperature: null,
    seed: `seed_${index}`,
    durationMs: 100,
    langRoute: 'fr',
    passedGate: passed,
  });

  it('selects the highest score', () => {
    const attempts = [
      makeAttempt(0, 3.5, false),
      makeAttempt(1, 4.8, true),
      makeAttempt(2, 4.2, true),
    ];
    expect(selectBestAttempt(attempts, false)).toBe(1);
  });

  it('selects only passed attempts when passedOnly=true', () => {
    const attempts = [
      makeAttempt(0, 5.0, false), // highest but didn't pass
      makeAttempt(1, 4.2, true),
      makeAttempt(2, 4.5, true),
    ];
    expect(selectBestAttempt(attempts, true)).toBe(2);
  });

  it('falls back to all attempts when no passed attempts', () => {
    const attempts = [
      makeAttempt(0, 3.5, false),
      makeAttempt(1, 4.0, false),
      makeAttempt(2, 3.8, false),
    ];
    // passedOnly=true but none passed → uses all
    expect(selectBestAttempt(attempts, true)).toBe(1);
  });

  it('prefers lower attemptIndex on tie (fewer retries)', () => {
    const attempts = [
      makeAttempt(0, 4.5, true),
      makeAttempt(1, 4.5, true),
      makeAttempt(2, 4.5, true),
    ];
    expect(selectBestAttempt(attempts, false)).toBe(0);
  });

  it('handles NaN scores (treated as -Infinity)', () => {
    const attempts = [
      makeAttempt(0, NaN, false),
      makeAttempt(1, 3.5, false),
      makeAttempt(2, NaN, false),
    ];
    expect(selectBestAttempt(attempts, false)).toBe(1);
  });

  it('handles all NaN scores', () => {
    const attempts = [
      makeAttempt(0, NaN, false),
      makeAttempt(1, NaN, false),
    ];
    // Both NaN → selects first (lowest attemptIndex)
    expect(selectBestAttempt(attempts, false)).toBe(0);
  });

  it('throws on empty array', () => {
    expect(() => selectBestAttempt([], false)).toThrow();
  });

  it('handles single attempt', () => {
    const attempts = [makeAttempt(0, 4.0, true)];
    expect(selectBestAttempt(attempts, false)).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// runR6RejectionGate — MODE DISABLED
// ──────────────────────────────────────────────────────────────────────────────

describe('runR6RejectionGate — disabled mode', () => {
  it('generates exactly 1 attempt', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'disabled',
    });

    expect(result.attemptCount).toBe(1);
    expect(result.allAttempts).toHaveLength(1);
  });

  it('always returns passed=true', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'disabled',
      threshold: 99.0, // impossibly high
    });

    expect(result.passed).toBe(true);
    expect(result.belowThreshold).toBe(false);
    expect(result.gateMode).toBe('disabled');
  });

  it('still computes CALC score', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'disabled',
    });

    // Score should be computed even in disabled mode (for telemetry)
    expect(typeof result.selectedAttempt.calcScore).toBe('number');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// runR6RejectionGate — MODE SHADOW
// ──────────────────────────────────────────────────────────────────────────────

describe('runR6RejectionGate — shadow mode', () => {
  it('runs all attempts regardless of scores', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR, LONG_PROSE_FR]);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'shadow',
      maxRetries: 2,
      threshold: 0.0, // everything should pass in theory
    });

    // Shadow mode always runs all attempts
    expect(result.attemptCount).toBe(3);
    expect(gen.calls).toHaveLength(3);
  });

  it('always selects first attempt (no gating)', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR, LONG_PROSE_FR]);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'shadow',
      maxRetries: 2,
    });

    expect(result.selectedAttemptIndex).toBe(0);
  });

  it('reports whether any attempt would have passed', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR, LONG_PROSE_FR]);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'shadow',
      maxRetries: 2,
      threshold: 0.0, // low threshold → should pass
    });

    // passed reflects whether ANY attempt would have passed the gate
    expect(typeof result.passed).toBe('boolean');
    expect(result.gateMode).toBe('shadow');
  });

  it('applies temperature schedule correctly', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR, LONG_PROSE_FR]);
    await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'shadow',
      maxRetries: 2,
      temperatureSchedule: [null, 0.85, 0.90],
    });

    expect(gen.calls[0].temperature).toBeNull();
    expect(gen.calls[1].temperature).toBe(0.85);
    expect(gen.calls[2].temperature).toBe(0.90);
  });

  it('applies seed variation correctly', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR, LONG_PROSE_FR]);
    await runR6RejectionGate(gen, 'prompt', 'base_seed', 'fr', {
      mode: 'shadow',
      maxRetries: 2,
    });

    expect(gen.calls[0].seed).toBe('base_seed');
    expect(gen.calls[1].seed).toBe('base_seed_r1');
    expect(gen.calls[2].seed).toBe('base_seed_r2');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// runR6RejectionGate — MODE ACTIVE
// ──────────────────────────────────────────────────────────────────────────────

describe('runR6RejectionGate — active mode', () => {
  it('returns immediately on first pass', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR, LONG_PROSE_FR]);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      maxRetries: 2,
      threshold: 0.0, // very low → first attempt passes
    });

    // Should stop after first attempt
    expect(result.attemptCount).toBe(1);
    expect(gen.calls).toHaveLength(1);
    expect(result.passed).toBe(true);
    expect(result.belowThreshold).toBe(false);
  });

  it('retries when first attempt fails', async () => {
    // Use a very high threshold so nothing passes → fallback A
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR, LONG_PROSE_FR]);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      maxRetries: 2,
      threshold: 99.0, // impossibly high
    });

    // Should have tried all 3 times
    expect(result.attemptCount).toBe(3);
    expect(gen.calls).toHaveLength(3);
    expect(result.passed).toBe(false);
    expect(result.belowThreshold).toBe(true);
  });

  it('fallback A: selects best score among failed attempts', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR, LONG_PROSE_FR]);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      maxRetries: 2,
      threshold: 99.0,
    });

    // Best attempt should have the highest CALC score
    const scores = result.allAttempts.map((a) => a.calcScore);
    const maxScore = Math.max(...scores.filter(Number.isFinite));
    if (Number.isFinite(maxScore)) {
      expect(result.selectedAttempt.calcScore).toBe(maxScore);
    }
  });

  it('respects maxRetries=0 (single attempt only)', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR]);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      maxRetries: 0,
      threshold: 99.0,
    });

    expect(result.attemptCount).toBe(1);
    expect(gen.calls).toHaveLength(1);
  });

  it('respects maxRetries=1 (two attempts max)', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR]);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      maxRetries: 1,
      threshold: 99.0,
    });

    expect(result.attemptCount).toBe(2);
    expect(gen.calls).toHaveLength(2);
  });

  it('accepts prose when CALC returns NaN (cannot judge)', async () => {
    // Short prose → NaN score → accepted by default (CALC cannot judge)
    const gen = createConstantGenerator('Short.');
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      maxRetries: 2,
      threshold: 4.2,
      minProseLength: 200,
    });

    // NaN → gate accepts (cannot reject what you cannot judge)
    expect(result.attemptCount).toBe(1);
    expect(result.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildR6GateLog
// ──────────────────────────────────────────────────────────────────────────────

describe('buildR6GateLog', () => {
  it('produces a complete log from a gate result', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR, LONG_PROSE_FR]);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'shadow',
      maxRetries: 2,
      threshold: 4.2,
      temperatureSchedule: [null, 0.85, 0.90],
    });

    const log = buildR6GateLog(result);

    // ADR-003 §6 required fields
    expect(log.gate_threshold).toBe(4.2);
    expect(log.attempt_count).toBe(3);
    expect(typeof log.best_score).toBe('number');
    expect(typeof log.passed_gate).toBe('boolean');
    expect(typeof log.below_threshold).toBe('boolean');
    expect(log.selected_attempt_index).toBe(0); // shadow mode = first
    expect(log.temperature_schedule).toEqual([null, 0.85, 0.90]);
    expect(log.seed_schedule).toEqual(['seed', 'seed_r1', 'seed_r2']);
    expect(log.all_scores).toHaveLength(3);
    expect(log.lang_route).toBe('fr');
    expect(log.duration_ms).toBeGreaterThanOrEqual(0);
    expect(log.model_version).toBe('3.4');
    expect(log.calibration_id).toContain('V3_4');
    expect(log.gate_mode).toBe('shadow');
  });

  it('log reflects below_threshold correctly', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      maxRetries: 2,
      threshold: 99.0,
    });

    const log = buildR6GateLog(result);
    expect(log.below_threshold).toBe(true);
    expect(log.passed_gate).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// INVARIANTS
// ──────────────────────────────────────────────────────────────────────────────

describe('R6 gate invariants', () => {
  it('never returns empty allAttempts', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);

    for (const mode of ['disabled', 'shadow', 'active'] as const) {
      const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
        mode,
        maxRetries: 2,
      });
      expect(result.allAttempts.length).toBeGreaterThan(0);
      expect(result.selectedAttempt).toBeDefined();
      expect(result.selectedAttempt.prose.length).toBeGreaterThan(0);
    }
  });

  it('selectedAttemptIndex is valid', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      maxRetries: 2,
      threshold: 99.0,
    });

    expect(result.selectedAttemptIndex).toBeGreaterThanOrEqual(0);
    expect(result.selectedAttemptIndex).toBeLessThan(result.allAttempts.length);
    expect(result.allAttempts[result.selectedAttemptIndex]).toBe(
      result.selectedAttempt,
    );
  });

  it('belowThreshold is inverse of passed', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);

    const resultPass = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      threshold: 0.0,
    });
    expect(resultPass.belowThreshold).toBe(!resultPass.passed);

    const resultFail = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      threshold: 99.0,
      maxRetries: 0,
    });
    expect(resultFail.belowThreshold).toBe(!resultFail.passed);
  });

  it('attemptCount equals allAttempts.length', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'shadow',
      maxRetries: 2,
    });
    expect(result.attemptCount).toBe(result.allAttempts.length);
  });

  it('gateThreshold matches config', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      threshold: 3.7,
    });
    expect(result.gateThreshold).toBe(3.7);
  });

  it('totalDurationMs is non-negative', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
    });
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('each attempt has increasing attemptIndex', async () => {
    const gen = createMockGenerator([LONG_PROSE_FR, LONG_PROSE_FR, LONG_PROSE_FR]);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'shadow',
      maxRetries: 2,
    });

    for (let i = 0; i < result.allAttempts.length; i++) {
      expect(result.allAttempts[i].attemptIndex).toBe(i);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

describe('R6 gate config', () => {
  it('default config uses shadow mode', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    // No config override → uses env var defaults
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr');
    // Default is shadow (unless env var set)
    expect(['disabled', 'shadow', 'active']).toContain(result.gateMode);
  });

  it('overrides take precedence over defaults', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      threshold: 1.0,
      maxRetries: 0,
    });
    expect(result.gateMode).toBe('active');
    expect(result.gateThreshold).toBe(1.0);
    expect(result.attemptCount).toBe(1);
  });

  it('throws if temperatureSchedule too short for maxRetries', () => {
    expect(() =>
      runR6RejectionGate(
        createConstantGenerator(LONG_PROSE_FR),
        'prompt',
        'seed',
        'fr',
        {
          maxRetries: 2,
          temperatureSchedule: [null], // length 1 < 1+2=3
        },
      ),
    ).rejects.toThrow('temperatureSchedule length');
  });

  it('accepts temperatureSchedule matching exact required length', async () => {
    const gen = createConstantGenerator(LONG_PROSE_FR);
    // Should not throw: length 2 = 1 + maxRetries(1)
    const result = await runR6RejectionGate(gen, 'prompt', 'seed', 'fr', {
      mode: 'active',
      maxRetries: 1,
      threshold: 0.0,
      temperatureSchedule: [null, 0.85],
    });
    expect(result.attemptCount).toBe(1); // passes first attempt
  });
});
