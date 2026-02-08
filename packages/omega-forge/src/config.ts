/**
 * OMEGA Forge — Configuration
 * Phase C.5 — 14 configurable symbols
 * Values marked CALIBRATE use documented defaults for testing.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { F5Config, F5ConfigSymbol } from './types.js';

export function createDefaultF5Config(): F5Config {
  return {
    TAU_COSINE_DEVIATION: {
      value: 0.3,
      unit: 'distance (0-1)',
      rule: 'F5-INV-04: max cosine distance between target and actual trajectory',
      derivation: 'SEED VALUE — CALIBRATE on reference corpus. Default 0.3.',
    },
    TAU_EUCLIDEAN_DEVIATION: {
      value: 1.5,
      unit: 'distance (R+)',
      rule: 'F5-INV-04: max euclidean distance in R14',
      derivation: 'SEED VALUE — CALIBRATE. Default 1.5.',
    },
    TAU_VAD_DEVIATION: {
      value: 0.5,
      unit: 'distance (R+)',
      rule: 'F5-INV-04: max VAD distance',
      derivation: 'SEED VALUE — CALIBRATE. Default 0.5.',
    },
    TAU_DECAY_TOLERANCE: {
      value: 0.1,
      unit: 'MSE',
      rule: 'F5-INV-07: max deviation between theoretical I(t) and measured I(t)',
      derivation: 'SEED VALUE — CALIBRATE. Default 0.1.',
    },
    TAU_FLUX_BALANCE: {
      value: 0.05,
      unit: 'absolute error',
      rule: 'F5-INV-08: max flux conservation imbalance',
      derivation: 'SEED VALUE — CALIBRATE. Default 0.05.',
    },
    TAU_NECESSITY: {
      value: 0.95,
      unit: 'ratio (0-1)',
      rule: 'F5-INV-10: M8 >= 95% sentence necessity',
      derivation: 'From OMEGA_METRICS_SUPERIORITY M8 specification.',
    },
    TAU_DISCOMFORT_MIN: {
      value: 0.3,
      unit: 'ratio (0-1)',
      rule: 'F5-INV-11: M11 minimum discomfort index',
      derivation: 'From OMEGA_METRICS_SUPERIORITY M11: [0.3, 0.7].',
    },
    TAU_DISCOMFORT_MAX: {
      value: 0.7,
      unit: 'ratio (0-1)',
      rule: 'F5-INV-11: M11 maximum discomfort index',
      derivation: 'From OMEGA_METRICS_SUPERIORITY M11: [0.3, 0.7].',
    },
    DEAD_ZONE_MIN_LENGTH: {
      value: 3,
      unit: 'consecutive_paragraphs',
      rule: 'F5-INV-05: minimum length for dead zone detection',
      derivation: 'SEED VALUE — CALIBRATE. Default 3.',
    },
    DEAD_ZONE_Z_THRESHOLD: {
      value: 0.8,
      unit: 'Z persistence ratio',
      rule: 'Dead zone = Z plateau with lambda_eff approximately 0',
      derivation: 'SEED VALUE — CALIBRATE. Default 0.8 (Z/C ratio).',
    },
    WEIGHT_EMOTION: {
      value: 0.6,
      unit: 'weight',
      rule: 'F5-INV-14: 60% emotion physics compliance',
      derivation: 'Architecte Supreme decision: emotion = 60% of final verdict.',
    },
    WEIGHT_QUALITY: {
      value: 0.4,
      unit: 'weight',
      rule: 'F5-INV-14: 40% quality envelope',
      derivation: 'Architecte Supreme decision: quality = 40% of final verdict.',
    },
    SATURATION_CAPACITY_C: {
      value: 100,
      unit: 'capacity',
      rule: 'OMEGA V4.4: Z_max = C. If Z approaches C then burnout.',
      derivation: 'SEED VALUE — CALIBRATE. Default 100.',
    },
    COMPOSITE_PASS_THRESHOLD: {
      value: 0.7,
      unit: 'score (0-1)',
      rule: 'ForgeResult verdict = PASS if composite >= threshold',
      derivation: 'SEED VALUE — CALIBRATE. Default 0.7.',
    },
  };
}

export function resolveF5ConfigValue(symbol: F5ConfigSymbol): number {
  const v = symbol.value;
  if (typeof v === 'number') return v;
  return 0;
}

export function validateF5Config(config: F5Config): boolean {
  const keys: (keyof F5Config)[] = [
    'TAU_COSINE_DEVIATION', 'TAU_EUCLIDEAN_DEVIATION', 'TAU_VAD_DEVIATION',
    'TAU_DECAY_TOLERANCE', 'TAU_FLUX_BALANCE', 'TAU_NECESSITY',
    'TAU_DISCOMFORT_MIN', 'TAU_DISCOMFORT_MAX',
    'DEAD_ZONE_MIN_LENGTH', 'DEAD_ZONE_Z_THRESHOLD',
    'WEIGHT_EMOTION', 'WEIGHT_QUALITY',
    'SATURATION_CAPACITY_C', 'COMPOSITE_PASS_THRESHOLD',
  ];
  for (const key of keys) {
    if (!config[key]) return false;
    const sym = config[key];
    if (sym.value === undefined || sym.value === null) return false;
    if (!sym.unit || !sym.rule || !sym.derivation) return false;
  }
  return true;
}

export function hashF5Config(config: F5Config): string {
  return sha256(canonicalize(config));
}
