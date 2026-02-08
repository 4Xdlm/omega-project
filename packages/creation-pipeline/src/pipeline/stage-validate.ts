/**
 * OMEGA Creation Pipeline — F0: Validate Inputs
 * Phase C.4 — C4-INV-09: Input schema validation
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { IntentPack, C4Config, StageResult, ValidationResult } from '../types.js';
import { validateIntentPack, normalizeIntentPack, hashIntentPack } from '../intent-pack.js';

export function stageValidate(
  input: IntentPack,
  _config: C4Config,
  timestamp: string,
): StageResult & { readonly validation: ValidationResult; readonly normalizedInput: IntentPack } {
  const validation = validateIntentPack(input);

  if (!validation.valid) {
    return {
      stage: 'F0',
      verdict: 'FAIL',
      input_hash: '',
      output_hash: sha256('FAIL'),
      duration_ms: 0,
      details: `Validation failed: ${validation.errors.map((e) => e.message).join('; ')}`,
      timestamp_deterministic: timestamp,
      validation,
      normalizedInput: input,
    };
  }

  const normalized = normalizeIntentPack(input);
  const inputHash = hashIntentPack(normalized);

  return {
    stage: 'F0',
    verdict: 'PASS',
    input_hash: inputHash,
    output_hash: sha256(canonicalize({ validated: true, hash: inputHash })),
    duration_ms: 0,
    details: 'All inputs validated and normalized',
    timestamp_deterministic: timestamp,
    validation,
    normalizedInput: normalized,
  };
}
