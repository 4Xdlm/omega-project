/**
 * OMEGA Creation Pipeline — Configuration
 * Phase C.4 — 12 config symbols, zero magic numbers
 */

import type { C4Config, C4ConfigSymbol } from './types.js';

export function createDefaultC4Config(): C4Config {
  return {
    PIPELINE_STRICT_MODE: {
      value: true,
      unit: 'boolean',
      rule: 'C4-INV-07: fail-closed mode always active',
      derivation: 'NASA-grade: no partial results. Either fully certified or rejected.',
    },
    UNIFIED_GATE_ORDER: {
      value: ['U_TRUTH', 'U_NECESSITY', 'U_CROSSREF', 'U_BANALITY', 'U_STYLE', 'U_EMOTION', 'U_DISCOMFORT', 'U_QUALITY'],
      unit: 'gate_sequence',
      rule: 'C4-INV-02: gates execute in fixed order, fail-fast',
      derivation: 'Truth first (facts), then necessity, then cross-references, then style.',
    },
    MERKLE_HASH_ALGORITHM: {
      value: 'SHA-256',
      unit: 'algorithm',
      rule: 'C4-INV-08: Merkle tree uses SHA-256',
      derivation: 'Consistent with entire OMEGA hash infrastructure.',
    },
    PROOF_PACK_VERSION: {
      value: '1.0.0',
      unit: 'semver',
      rule: 'C4-INV-08: proof-pack version for forward compatibility',
      derivation: 'Initial release.',
    },
    ADVERSARIAL_FUZZ_COUNT: {
      value: 50,
      unit: 'test_cases',
      rule: 'C4-INV-11: generate 50 fuzzed IntentPacks',
      derivation: '50 = sufficient coverage across 8 categories (~6 per category).',
    },
    ADVERSARIAL_CATEGORIES: {
      value: ['contradiction', 'ambiguity', 'impossible_constraints', 'empty_fields', 'overflow', 'type_mismatch', 'circular_reference', 'hostile_content'],
      unit: 'category_list',
      rule: 'C4-INV-11: all adversarial categories covered',
      derivation: 'Comprehensive threat model for narrative input.',
    },
    NECESSITY_ABLATION_THRESHOLD: {
      value: 0.85,
      unit: 'ratio',
      rule: 'C4-INV-05: removing a paragraph must degrade >=1 metric by 15%',
      derivation: 'Inherited from C.2 NECESSITY_MIN_RATIO.',
    },
    CROSSREF_MAX_ORPHANS: {
      value: 5,
      unit: 'count',
      rule: 'C4-INV-06: max 5 orphaned names/motifs allowed',
      derivation: 'Allows minor stylistic proper nouns introduced by generation pipeline.',
    },
    CANON_MAX_UNSUPPORTED: {
      value: 0,
      unit: 'count',
      rule: 'C4-INV-04: zero unsupported factual assertions',
      derivation: 'Inherited from C.2 TRUTH_MAX_UNSUPPORTED.',
    },
    PIPELINE_MAX_DURATION_MS: {
      value: 30000,
      unit: 'milliseconds',
      rule: 'Performance bound: pipeline must complete within 30s',
      derivation: 'Reasonable for deterministic text pipeline without LLM calls.',
    },
    E2E_TRUTH_THRESHOLD: {
      value: 1.0,
      unit: 'ratio (0-1)',
      rule: 'C4-INV-04: 100% truth compliance at E2E level',
      derivation: 'No compromise on factual accuracy.',
    },
    E2E_STYLE_THRESHOLD: {
      value: 0.75,
      unit: 'ratio (0-1)',
      rule: 'E2E style compliance threshold',
      derivation: 'Slightly relaxed vs C.3 (0.75 vs 0.25 deviation) because E2E re-check.',
    },
  };
}

export function resolveC4ConfigRef(config: C4Config, key: keyof C4Config): C4ConfigSymbol {
  const sym = config[key];
  if (!sym) {
    throw new Error(`C4Config key not found: ${key}`);
  }
  return sym;
}

export function validateC4Config(config: C4Config): boolean {
  const requiredKeys: readonly (keyof C4Config)[] = [
    'PIPELINE_STRICT_MODE', 'UNIFIED_GATE_ORDER', 'MERKLE_HASH_ALGORITHM',
    'PROOF_PACK_VERSION', 'ADVERSARIAL_FUZZ_COUNT', 'ADVERSARIAL_CATEGORIES',
    'NECESSITY_ABLATION_THRESHOLD', 'CROSSREF_MAX_ORPHANS', 'CANON_MAX_UNSUPPORTED',
    'PIPELINE_MAX_DURATION_MS', 'E2E_TRUTH_THRESHOLD', 'E2E_STYLE_THRESHOLD',
  ];
  for (const key of requiredKeys) {
    if (!config[key]) return false;
    const sym = config[key];
    if (sym.value === undefined || !sym.unit || !sym.rule || !sym.derivation) return false;
  }
  return true;
}
