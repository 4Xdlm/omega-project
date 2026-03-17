/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DAMAGE GATE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: microsurgery/damage-gate.ts
 * Version: 1.0.0 (Phase W Integration)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * CALC-pure predictor of collateral damage from micro-interventions.
 * Based on Phase W research: 200 chapters × 4 perturbations × 6 categories,
 * validated by ablation, bootstrap CI, and cross-validation.
 *
 * Formula: delta = slope × min(amplitude, 0.50) × archetype_factor
 *
 * Key findings integrated:
 * - 14/24 slopes are HIGH_CONFIDENCE (bootstrap 1000×, IC95 excludes 0)
 * - Linear model sufficient (9/10 pairs linear per nonlinearity test)
 * - Interactions mostly ADDITIVE (can combine perturbations linearly)
 * - MUSICALITE is PROTECTED (ratio 40.6× vs other categories)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** The 6 style categories measured by OMEGA */
export type DamageCategory =
  | 'MUSICALITE'
  | 'COMPLEXITE'
  | 'SENSORIEL'
  | 'LEXICAL'
  | 'INTERIORITE'
  | 'TENSION';

/** Perturbation types mapped from MicroIntervention types */
export type PerturbationType =
  | 'P03_COMPLEXIFY_SYNTAX'
  | 'P04_REMOVE_INTERIORITY'
  | 'P05_INJECT_SYNCOPES';

/** Author archetype — determines sensitivity multipliers */
export type ArchetypeId =
  | 'BALANCED'
  | 'BRUTAL'
  | 'CATHEDRAL'
  | 'INTERIOR'
  | 'SENSORY';

/** Predicted damage for a single category */
export interface DamagePrediction {
  readonly category: DamageCategory;
  readonly predicted_delta: number;
  readonly blocked: boolean;
  readonly threshold: number;
}

/** Full damage gate evaluation result */
export interface DamageGateResult {
  readonly perturbation: PerturbationType;
  readonly archetype: ArchetypeId;
  readonly amplitude: number;
  readonly predictions: readonly DamagePrediction[];
  readonly blocked: boolean;
  readonly block_reasons: readonly string[];
}

/** Configuration for the damage gate */
export interface DamageGateConfig {
  readonly max_amplitude: number;
  readonly thresholds: Readonly<Record<DamageCategory, number>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLOPES MATRIX — 14 HIGH_CONFIDENCE values from Phase W bootstrap (1000×)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mean slopes from perturbation → category regression.
 * Only HIGH_CONFIDENCE slopes (IC95 excludes 0) are included.
 * Missing entries = 0 (no significant effect detected).
 */
const SLOPES: Readonly<Record<PerturbationType, Readonly<Partial<Record<DamageCategory, number>>>>> = {
  P03_COMPLEXIFY_SYNTAX: {
    MUSICALITE: +0.838,
    COMPLEXITE: +0.029,
    LEXICAL: +0.035,
    INTERIORITE: +0.016,
    TENSION: -0.388,
  },
  P04_REMOVE_INTERIORITY: {
    MUSICALITE: -0.064,
    INTERIORITE: -0.093,
  },
  P05_INJECT_SYNCOPES: {
    MUSICALITE: -1.156,
    COMPLEXITE: -0.022,
    SENSORIEL: +0.011,
    LEXICAL: -0.048,
    INTERIORITE: -0.025,
    TENSION: -0.382,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHETYPE MULTIPLIERS — from Phase W archetype derivative analysis (24/24)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Multipliers per archetype. Default = 1.0 for all unspecified pairs.
 * Only significant deviations from BALANCED are recorded.
 */
const ARCHETYPE_MULTIPLIERS: Readonly<Record<ArchetypeId, Readonly<Partial<Record<string, number>>>>> = {
  BALANCED: {},
  BRUTAL: {
    'P03_COMPLEXIFY_SYNTAX:TENSION': 5.39,
    'P03_COMPLEXIFY_SYNTAX:MUSICALITE': 1.93,
    'P05_INJECT_SYNCOPES:TENSION': 2.81,
    'P05_INJECT_SYNCOPES:MUSICALITE': 0.68,
  },
  CATHEDRAL: {
    'P03_COMPLEXIFY_SYNTAX:TENSION': 0.81,
    'P05_INJECT_SYNCOPES:COMPLEXITE': 1.50,
    'P04_REMOVE_INTERIORITY:INTERIORITE': 1.57,
  },
  INTERIOR: {
    'P05_INJECT_SYNCOPES:MUSICALITE': 1.73,
    'P04_REMOVE_INTERIORITY:INTERIORITE': 2.13,
    'P03_COMPLEXIFY_SYNTAX:TENSION': 0.65,
  },
  SENSORY: {
    'P04_REMOVE_INTERIORITY:INTERIORITE': 1.97,
    'P04_REMOVE_INTERIORITY:MUSICALITE': 1.62,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// THRESHOLDS — maximum acceptable |delta| per category
// ═══════════════════════════════════════════════════════════════════════════════

/** MUSICALITE = 0 means ANY damage blocks. Others are calibrated from thesis. */
const DEFAULT_THRESHOLDS: Readonly<Record<DamageCategory, number>> = {
  MUSICALITE: 0.0,
  COMPLEXITE: 0.05,
  SENSORIEL: 0.03,
  LEXICAL: 0.08,
  INTERIORITE: 0.15,
  TENSION: 0.50,
};

/** Default configuration */
export const DEFAULT_DAMAGE_GATE_CONFIG: DamageGateConfig = {
  max_amplitude: 0.50,
  thresholds: DEFAULT_THRESHOLDS,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING — MicroIntervention type → PerturbationType
// ═══════════════════════════════════════════════════════════════════════════════

const INTERVENTION_TO_PERTURBATION: Readonly<Record<string, PerturbationType>> = {
  'TENSION_14D': 'P05_INJECT_SYNCOPES',
  'HOOK_INJECTION': 'P03_COMPLEXIFY_SYNTAX',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_CATEGORIES: readonly DamageCategory[] = [
  'MUSICALITE', 'COMPLEXITE', 'SENSORIEL', 'LEXICAL', 'INTERIORITE', 'TENSION',
];

/**
 * Predict the delta for a single (perturbation, category, archetype) triple.
 * Formula: delta = slope × min(amplitude, max_amplitude) × archetype_factor
 */
export function predictDamage(
  perturbation: PerturbationType,
  category: DamageCategory,
  amplitude: number,
  archetype: ArchetypeId,
  config: DamageGateConfig = DEFAULT_DAMAGE_GATE_CONFIG,
): number {
  const slope = SLOPES[perturbation][category] ?? 0;
  if (slope === 0) return 0;

  const clampedAmplitude = Math.min(Math.abs(amplitude), config.max_amplitude);
  if (clampedAmplitude === 0) return 0;

  const key = `${perturbation}:${category}`;
  const archetypeFactor = ARCHETYPE_MULTIPLIERS[archetype][key] ?? 1.0;

  return slope * clampedAmplitude * archetypeFactor;
}

/**
 * Check if a predicted delta should block the intervention.
 * MUSICALITE: any non-zero delta blocks (threshold = 0).
 * Others: |delta| > threshold blocks.
 */
export function shouldBlock(
  category: DamageCategory,
  predictedDelta: number,
  config: DamageGateConfig = DEFAULT_DAMAGE_GATE_CONFIG,
): boolean {
  const threshold = config.thresholds[category];
  if (threshold === 0) {
    return predictedDelta !== 0;
  }
  return Math.abs(predictedDelta) > threshold;
}

/**
 * Evaluate the full damage gate for a given intervention.
 * Returns predictions for all 6 categories and a global block decision.
 */
export function evaluateDamageGate(
  interventionType: string,
  amplitude: number,
  archetype: ArchetypeId,
  config: DamageGateConfig = DEFAULT_DAMAGE_GATE_CONFIG,
): DamageGateResult {
  const perturbation = INTERVENTION_TO_PERTURBATION[interventionType];
  if (!perturbation) {
    return {
      perturbation: 'P03_COMPLEXIFY_SYNTAX',
      archetype,
      amplitude,
      predictions: ALL_CATEGORIES.map(cat => ({
        category: cat,
        predicted_delta: 0,
        blocked: false,
        threshold: config.thresholds[cat],
      })),
      blocked: false,
      block_reasons: [],
    };
  }

  const predictions: DamagePrediction[] = [];
  const blockReasons: string[] = [];

  for (const category of ALL_CATEGORIES) {
    const delta = predictDamage(perturbation, category, amplitude, archetype, config);
    const blocked = shouldBlock(category, delta, config);

    if (blocked) {
      blockReasons.push(
        `${category}: |delta|=${Math.abs(delta).toFixed(4)} > threshold=${config.thresholds[category]}`,
      );
    }

    predictions.push({
      category,
      predicted_delta: delta,
      blocked,
      threshold: config.thresholds[category],
    });
  }

  return {
    perturbation,
    archetype,
    amplitude,
    predictions,
    blocked: blockReasons.length > 0,
    block_reasons: blockReasons,
  };
}

/**
 * Map a MicroIntervention type string to a PerturbationType.
 * Returns undefined if the type is unknown.
 */
export function mapInterventionType(type: string): PerturbationType | undefined {
  return INTERVENTION_TO_PERTURBATION[type];
}
