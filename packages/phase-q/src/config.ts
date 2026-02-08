/**
 * OMEGA Phase Q — Symbolic Configuration
 *
 * Every threshold has rule + derivation. No magic numbers.
 * Config values are resolved from string references like "CONFIG:UNSUPPORTED_MAX".
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { QConfig, QConfigSymbol } from './types.js';

/**
 * Default Phase Q configuration.
 * Each symbol carries its own justification.
 */
export function createDefaultConfig(): QConfig {
  return {
    UNSUPPORTED_MAX: {
      value: 0,
      unit: 'count',
      rule: 'Q-INV-01: zero unsupported claims in strict mode',
      derivation: 'Fail-closed: any unsupported claim is a precision failure',
      override: 'WAIVER required (human-signed)',
    },
    NECESSITY_MIN_RATIO: {
      value: 0.85,
      unit: 'ratio',
      rule: 'Q-INV-02: at least 85% segments must be necessary',
      derivation: 'Empirical: below 0.85 indicates padding/filler content',
    },
    STABILITY_FACTOR: {
      value: 3,
      unit: 'multiplier',
      rule: 'Q-INV-04: delta_segments <= STABILITY_FACTOR * changed_fields',
      derivation: 'Conservative bound: 3x allows reasonable propagation without global collapse',
    },
    ABLATION_STRATEGY: {
      value: 'single-segment',
      unit: 'strategy',
      rule: 'Q-INV-02: default to single-segment for determinism',
      derivation: 'Single-segment ablation is the minimal deterministic unit of analysis',
      alternatives: ['single-segment', 'pair-segment', 'random-k'],
    },
  };
}

/**
 * Resolve a config reference string like "CONFIG:UNSUPPORTED_MAX" to its numeric value.
 * Throws if the reference is invalid or the key does not exist.
 */
export function resolveConfigRef(config: QConfig, ref: string): number {
  if (!ref.startsWith('CONFIG:')) {
    throw new Error(`Invalid config reference: "${ref}" (must start with "CONFIG:")`);
  }

  const key = ref.slice(7) as keyof QConfig;
  const symbol: QConfigSymbol | undefined = config[key];

  if (!symbol) {
    throw new Error(`Unknown config key: "${key}"`);
  }

  if (typeof symbol.value !== 'number') {
    throw new Error(`Config key "${key}" is not numeric (value: ${String(symbol.value)})`);
  }

  return symbol.value;
}

/**
 * Validate config completeness. Returns array of error messages (empty = valid).
 */
export function validateConfig(config: QConfig): readonly string[] {
  const errors: string[] = [];
  const requiredKeys: ReadonlyArray<keyof QConfig> = [
    'UNSUPPORTED_MAX',
    'NECESSITY_MIN_RATIO',
    'STABILITY_FACTOR',
    'ABLATION_STRATEGY',
  ];

  for (const key of requiredKeys) {
    const symbol = config[key];
    if (!symbol) {
      errors.push(`Missing config key: ${key}`);
      continue;
    }
    if (!symbol.rule) {
      errors.push(`Config key "${key}" missing rule`);
    }
    if (!symbol.derivation) {
      errors.push(`Config key "${key}" missing derivation`);
    }
    if (symbol.value === undefined || symbol.value === null) {
      errors.push(`Config key "${key}" missing value`);
    }
    if (!symbol.unit) {
      errors.push(`Config key "${key}" missing unit`);
    }
  }

  return errors;
}

/**
 * Compute deterministic hash of the config for report traceability.
 */
export function hashConfig(config: QConfig): string {
  return sha256(canonicalize(config));
}
