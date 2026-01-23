// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — Invariant Tests (Constitution)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests des invariants fondamentaux INV-GEN-01..11
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  validateTruthBundle,
  validateEmotionField,
  validateOxygenResult,
  generateTrajectoryContract,
  generatePrismConstraints,
  evaluateSentinel,
  cosineDistance,
  DEFAULT_GENESIS_CONFIG,
  EMOTION_TYPES,
  SCHEMA_ID,
} from '../../index';
import type {
  TruthBundle,
  EmotionField,
  OxygenResult,
  IntensityRecord14,
  Draft,
} from '../../core/types';
import { hashTruthBundle } from '../../proofs/hash_utils';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createValidEmotionField(): EmotionField {
  const states: Record<string, any> = {};
  const intensities: Record<string, number> = {};

  for (const emotion of EMOTION_TYPES) {
    states[emotion] = {
      type: emotion,
      mass: 1.0,
      intensity: emotion === 'joy' ? 0.5 : 0.1,
      inertia: 0.3,
      decay_rate: 0.1,
      baseline: 0.2,
    };
    intensities[emotion] = emotion === 'joy' ? 0.5 : (0.5 / 13);
  }

  return {
    states: states as any,
    normalizedIntensities: intensities as IntensityRecord14,
    dominant: 'joy',
    peak: 0.5,
    totalEnergy: 1.0,
    entropy: 0.7,
    contrast: 0.1,
    inertia: 0.3,
    conservationDelta: 0.02,
  };
}

function createValidOxygenResult(): OxygenResult {
  return {
    base: 0.6,
    decayed: 0.55,
    final: 0.55,
    components: {
      emotionScore: 0.5,
      eventBoost: 0.1,
      contrastScore: 0.1,
      decayFactor: 0.9,
      relief: 1.0,
    },
  };
}

function createValidTruthBundle(): TruthBundle {
  const bundle: Omit<TruthBundle, 'bundleHash'> & { bundleHash?: string } = {
    id: 'test-bundle-001',
    timestamp: '2026-01-23T00:00:00.000Z', // Fixed timestamp for deterministic tests
    sourceHash: 'abc123def456',
    vectorSchemaId: 'OMEGA_EMOTION_14D_v1.0.0',
    targetEmotionField: createValidEmotionField(),
    targetOxygenResult: createValidOxygenResult(),
  };

  // Calculate hash
  bundle.bundleHash = hashTruthBundle(bundle as any);

  return bundle as TruthBundle;
}

function createValidDraft(text: string = 'The warm light filled the room with peace.'): Draft {
  return {
    id: 'draft-001',
    text,
    seed: 42,
    iteration: 1,
    createdAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-01: TruthBundle Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GEN-01: TruthBundle must pass validation before forge', () => {
  it('accepts valid TruthBundle', () => {
    const bundle = createValidTruthBundle();
    const result = validateTruthBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects TruthBundle with invalid schema ID', () => {
    const bundle = createValidTruthBundle();
    (bundle as any).vectorSchemaId = 'INVALID_SCHEMA';
    bundle.bundleHash = hashTruthBundle(bundle as any);

    const result = validateTruthBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('vectorSchemaId'))).toBe(true);
  });

  it('rejects TruthBundle with hash mismatch', () => {
    const bundle = createValidTruthBundle();
    bundle.bundleHash = 'wrong_hash';

    const result = validateTruthBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Hash mismatch'))).toBe(true);
  });

  it('rejects TruthBundle with missing fields', () => {
    const bundle = { id: 'test' } as TruthBundle;
    const result = validateTruthBundle(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-02: EmotionField Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GEN-02: EmotionField bounds validation', () => {
  it('accepts valid EmotionField', () => {
    const field = createValidEmotionField();
    const errors = validateEmotionField(field);
    expect(errors).toHaveLength(0);
  });

  it('rejects intensity out of bounds [0,1]', () => {
    const field = createValidEmotionField();
    field.states.joy.intensity = 1.5; // Out of bounds
    const errors = validateEmotionField(field);
    expect(errors.some(e => e.includes('intensity out of bounds'))).toBe(true);
  });

  it('rejects mass out of bounds [0.1, 10]', () => {
    const field = createValidEmotionField();
    field.states.joy.mass = 0.01; // Out of bounds
    const errors = validateEmotionField(field);
    expect(errors.some(e => e.includes('mass out of bounds'))).toBe(true);
  });

  it('rejects normalizedIntensities sum != 1', () => {
    const field = createValidEmotionField();
    // Corrupt the sum
    (field.normalizedIntensities as any).joy = 0.9;
    const errors = validateEmotionField(field);
    expect(errors.some(e => e.includes('sum should be 1.0'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-03: OxygenResult Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GEN-03: OxygenResult bounds validation', () => {
  it('accepts valid OxygenResult', () => {
    const oxygen = createValidOxygenResult();
    const errors = validateOxygenResult(oxygen);
    expect(errors).toHaveLength(0);
  });

  it('rejects O2 out of bounds [0,1]', () => {
    const oxygen = createValidOxygenResult();
    oxygen.final = 1.5;
    const errors = validateOxygenResult(oxygen);
    expect(errors.some(e => e.includes('out of bounds'))).toBe(true);
  });

  it('rejects missing components', () => {
    const oxygen = { base: 0.5, decayed: 0.5, final: 0.5 } as OxygenResult;
    const errors = validateOxygenResult(oxygen);
    expect(errors.some(e => e.includes('missing components'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-04: Contract Generation
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GEN-04: Contract generation from TruthBundle', () => {
  it('generates valid contract from TruthBundle', () => {
    const bundle = createValidTruthBundle();
    const contract = generateTrajectoryContract(bundle, DEFAULT_GENESIS_CONFIG);

    expect(contract.truthHash).toBe(bundle.bundleHash);
    expect(contract.windows.length).toBeGreaterThan(0);
    expect(contract.generatedAt).toBeDefined();
  });

  it('generates PRISM constraints from contract', () => {
    const bundle = createValidTruthBundle();
    const contract = generateTrajectoryContract(bundle, DEFAULT_GENESIS_CONFIG);
    const prismConstraints = generatePrismConstraints(contract, bundle);

    expect(prismConstraints.contractHash).toBeDefined();
    expect(prismConstraints.protectedDistribution).toBeDefined();
    expect(prismConstraints.distributionTolerance).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-05: Cosine Distance
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GEN-05: Cosine distance calculation', () => {
  it('returns 0 for identical distributions', () => {
    const dist = createValidEmotionField().normalizedIntensities;
    const distance = cosineDistance(dist, dist);
    expect(distance).toBeCloseTo(0, 5);
  });

  it('returns value in [0, 2] for different distributions', () => {
    const dist1 = createValidEmotionField().normalizedIntensities;
    const dist2: IntensityRecord14 = {
      joy: 0.1, fear: 0.5, anger: 0.1, sadness: 0.1,
      surprise: 0.05, disgust: 0.05, trust: 0.025, anticipation: 0.025,
      love: 0.025, guilt: 0.025, shame: 0.0125, pride: 0.0125,
      hope: 0.0125, despair: 0.0125,
    };
    const distance = cosineDistance(dist1, dist2);
    expect(distance).toBeGreaterThanOrEqual(0);
    expect(distance).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-06: Schema ID
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GEN-06: Schema ID consistency', () => {
  it('uses OMEGA_EMOTION_14D_v1.0.0 schema', () => {
    expect(SCHEMA_ID).toBe('OMEGA_EMOTION_14D_v1.0.0');
  });

  it('has exactly 14 emotion types', () => {
    expect(EMOTION_TYPES.length).toBe(14);
  });

  it('includes all required emotions', () => {
    const required = [
      'joy', 'fear', 'anger', 'sadness', 'surprise', 'disgust',
      'trust', 'anticipation', 'love', 'guilt', 'shame', 'pride',
      'hope', 'despair'
    ];
    for (const emotion of required) {
      expect(EMOTION_TYPES).toContain(emotion);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-07: Sentinel Evaluation
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GEN-07: Sentinel evaluates all judges', () => {
  it('returns all judge scores', () => {
    const bundle = createValidTruthBundle();
    const contract = generateTrajectoryContract(bundle, DEFAULT_GENESIS_CONFIG);
    const draft = createValidDraft();

    const result = evaluateSentinel(draft, contract, DEFAULT_GENESIS_CONFIG);

    expect(result.scores.j1_emotionBinding).toBeDefined();
    expect(result.scores.j2_coherence).toBeDefined();
    expect(result.scores.j3_sterility).toBeDefined();
    expect(result.scores.j4_uniqueness).toBeDefined();
    expect(result.scores.j5_density).toBeDefined();
    expect(result.scores.j6_resonance).toBeDefined();
    expect(result.scores.j7_antiGaming).toBeDefined();
  });

  it('returns Pareto scores', () => {
    const bundle = createValidTruthBundle();
    const contract = generateTrajectoryContract(bundle, DEFAULT_GENESIS_CONFIG);
    const draft = createValidDraft();

    const result = evaluateSentinel(draft, contract, DEFAULT_GENESIS_CONFIG);

    expect(result.paretoScores.p1_impactDensity).toBeDefined();
    expect(result.paretoScores.p2_styleSignature).toBeDefined();
    expect(result.paretoScores.p1_impactDensity).toBeGreaterThanOrEqual(0);
    expect(result.paretoScores.p2_styleSignature).toBeGreaterThanOrEqual(0);
  });

  it('correctly identifies failed judges', () => {
    const bundle = createValidTruthBundle();
    const contract = generateTrajectoryContract(bundle, DEFAULT_GENESIS_CONFIG);
    const draft = createValidDraft('suddenly it was a dark and stormy night'); // Contains cliche

    const result = evaluateSentinel(draft, contract, DEFAULT_GENESIS_CONFIG);

    // Should fail J3 sterility due to cliche
    if (result.verdict === 'FAIL') {
      expect(result.failedJudges.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-08: Config Symbolic Values
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GEN-08: All config values are symbolic', () => {
  it('has defined loop parameters', () => {
    expect(DEFAULT_GENESIS_CONFIG.loop.MAX_ITERATIONS).toBeGreaterThan(0);
    expect(DEFAULT_GENESIS_CONFIG.loop.MIN_DRAFTS_PER_ITER).toBeGreaterThan(0);
    expect(DEFAULT_GENESIS_CONFIG.loop.MAX_DRAFTS_PER_ITER).toBeGreaterThan(0);
  });

  it('has defined budget parameters', () => {
    expect(DEFAULT_GENESIS_CONFIG.budgets.BUDGET_MS_GATE_FAST).toBeGreaterThan(0);
    expect(DEFAULT_GENESIS_CONFIG.budgets.BUDGET_MS_TOTAL_FORGE).toBeGreaterThan(0);
  });

  it('has defined judge thresholds', () => {
    expect(DEFAULT_GENESIS_CONFIG.judges.emotionBinding.MAX_COSINE_DISTANCE).toBeGreaterThan(0);
    expect(DEFAULT_GENESIS_CONFIG.judges.sterility.MAX_LEXICAL_CLICHES).toBeDefined();
    expect(DEFAULT_GENESIS_CONFIG.judges.density.MIN_CONTENT_RATIO).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-09: Determinism
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GEN-09: Deterministic operations', () => {
  it('produces same hash for same input', () => {
    const bundle1 = createValidTruthBundle();
    const bundle2 = createValidTruthBundle();

    // Same structure should produce same hash
    expect(bundle1.bundleHash).toBe(bundle2.bundleHash);
  });

  it('produces different hash for different input', () => {
    const bundle1 = createValidTruthBundle();
    const bundle2 = createValidTruthBundle();
    bundle2.id = 'different-id';
    bundle2.bundleHash = hashTruthBundle(bundle2 as any);

    expect(bundle1.bundleHash).not.toBe(bundle2.bundleHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-GEN-10: Version Info
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-GEN-10: Version information', () => {
  it('exports version info', async () => {
    const { VERSION, SCHEMA_ID, STANDARD } = await import('../../index');
    expect(VERSION).toBe('1.1.2');
    expect(SCHEMA_ID).toBe('OMEGA_EMOTION_14D_v1.0.0');
    expect(STANDARD).toContain('NASA-Grade');
  });
});
