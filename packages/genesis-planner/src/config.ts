/**
 * OMEGA Genesis Planner — Configuration Symbol Resolution
 * Phase C.1 — No magic numbers. Every threshold has rule + derivation.
 */

import type { GConfig, GConfigSymbol } from './types.js';

const CONFIG_PREFIX = 'CONFIG:';

const VALID_KEYS: ReadonlySet<string> = new Set([
  'MAX_TENSION_PLATEAU',
  'MAX_TENSION_DROP',
  'MIN_BEATS_PER_SCENE',
  'MAX_BEATS_PER_SCENE',
  'MIN_SEEDS',
  'SEED_BLOOM_MAX_DISTANCE',
  'MIN_CONFLICT_TYPES',
  'EMOTION_COVERAGE_THRESHOLD',
]);

export function createDefaultConfig(): GConfig {
  return {
    MAX_TENSION_PLATEAU: {
      value: 3,
      unit: 'scenes',
      rule: 'G-INV-04: no flat tension for more than 3 consecutive scenes',
      derivation: 'Narrative theory: reader engagement drops after 3 scenes of stasis (McKee, Truby)',
    },
    MAX_TENSION_DROP: {
      value: 3,
      unit: 'tension_units',
      rule: 'G-INV-04: tension cannot drop more than 3 units between adjacent scenes',
      derivation: 'Prevents narrative whiplash. Controlled release only.',
    },
    MIN_BEATS_PER_SCENE: {
      value: 2,
      unit: 'beats',
      rule: 'Scene must contain at least 2 beats (action + reaction minimum)',
      derivation: 'Scene/sequel theory: every scene needs at least goal + conflict',
    },
    MAX_BEATS_PER_SCENE: {
      value: 12,
      unit: 'beats',
      rule: 'Scene cannot exceed 12 beats (complexity ceiling)',
      derivation: 'Cognitive load limit: >12 beats = scene should be split',
    },
    MIN_SEEDS: {
      value: 3,
      unit: 'seeds',
      rule: 'G-INV-03: plan must plant at least 3 narrative seeds',
      derivation: 'Minimum for layered storytelling: 1 plot + 1 character + 1 thematic',
    },
    SEED_BLOOM_MAX_DISTANCE: {
      value: 0.7,
      unit: 'ratio (0-1 of plan length)',
      rule: 'G-INV-03: seed and bloom cannot be more than 70% of plan apart',
      derivation: "Reader forgets seeds planted too early. Chekhov's gun principle.",
    },
    MIN_CONFLICT_TYPES: {
      value: 2,
      unit: 'unique types',
      rule: 'G-INV-05: plan must use at least 2 distinct conflict types',
      derivation: 'Single conflict type = monotonous. Diversity = richness.',
    },
    EMOTION_COVERAGE_THRESHOLD: {
      value: 1.0,
      unit: 'ratio',
      rule: 'G-INV-06: 100% scenes must have emotion assignment',
      derivation: 'Fail-closed: unassigned emotion = uncontrolled emotion',
    },
  };
}

export function resolveConfigRef(config: GConfig, ref: string): number {
  const key = ref.startsWith(CONFIG_PREFIX) ? ref.slice(CONFIG_PREFIX.length) : ref;
  if (!VALID_KEYS.has(key)) {
    throw new Error(`Unknown config key: ${key}`);
  }
  const symbol: GConfigSymbol = config[key as keyof GConfig];
  const val = symbol.value;
  if (typeof val !== 'number') {
    throw new Error(`Config key ${key} value is not a number: ${String(val)}`);
  }
  return val;
}

export function validateConfig(config: GConfig): readonly string[] {
  const errors: string[] = [];
  for (const key of VALID_KEYS) {
    const symbol = config[key as keyof GConfig] as GConfigSymbol | undefined;
    if (!symbol) {
      errors.push(`Missing config key: ${key}`);
      continue;
    }
    if (symbol.value === undefined || symbol.value === null) {
      errors.push(`Config key ${key} has no value`);
    }
    if (!symbol.unit || symbol.unit.trim() === '') {
      errors.push(`Config key ${key} has no unit`);
    }
    if (!symbol.rule || symbol.rule.trim() === '') {
      errors.push(`Config key ${key} has no rule`);
    }
    if (!symbol.derivation || symbol.derivation.trim() === '') {
      errors.push(`Config key ${key} has no derivation`);
    }
  }
  return errors;
}
