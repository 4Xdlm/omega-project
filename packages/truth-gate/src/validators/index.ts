/**
 * OMEGA Truth Gate — Validators Module Index
 *
 * 7 Required Validators:
 * 1. V-CANON-SCHEMA
 * 2. V-HASH-CHAIN
 * 3. V-RAIL-SEPARATION
 * 4. V-EMOTION-SSOT
 * 5. V-NO-MAGIC-NUMBERS
 * 6. V-POLICY-LOCK
 * 7. V-NARRATIVE-DRIFT-TOXICITY
 */

export * from './base-validator.js';
export * from './v-canon-schema.js';
export * from './v-hash-chain.js';
export * from './v-rail-separation.js';
export * from './v-emotion-ssot.js';
export * from './v-no-magic-numbers.js';
export * from './v-policy-lock.js';
export * from './v-narrative-drift-toxicity.js';

// Convenience imports
import { VCanonSchemaValidator } from './v-canon-schema.js';
import { VHashChainValidator } from './v-hash-chain.js';
import { VRailSeparationValidator } from './v-rail-separation.js';
import { VEmotionSSOTValidator } from './v-emotion-ssot.js';
import { VNoMagicNumbersValidator } from './v-no-magic-numbers.js';
import { VPolicyLockValidator } from './v-policy-lock.js';
import { VNarrativeDriftToxicityValidator } from './v-narrative-drift-toxicity.js';
import type { Validator, ValidatorId } from '../gate/types.js';

/**
 * All validator IDs.
 */
export const ALL_VALIDATOR_IDS: readonly ValidatorId[] = [
  'V-CANON-SCHEMA',
  'V-HASH-CHAIN',
  'V-RAIL-SEPARATION',
  'V-EMOTION-SSOT',
  'V-NO-MAGIC-NUMBERS',
  'V-POLICY-LOCK',
  'V-NARRATIVE-DRIFT-TOXICITY',
];

/**
 * Create all validators.
 */
export function createAllValidators(): readonly Validator[] {
  return [
    new VCanonSchemaValidator(),
    new VHashChainValidator(),
    new VRailSeparationValidator(),
    new VEmotionSSOTValidator(),
    new VNoMagicNumbersValidator(),
    new VPolicyLockValidator(),
    new VNarrativeDriftToxicityValidator(),
  ];
}

/**
 * Create validator by ID.
 */
export function createValidatorById(id: ValidatorId): Validator | null {
  switch (id) {
    case 'V-CANON-SCHEMA':
      return new VCanonSchemaValidator();
    case 'V-HASH-CHAIN':
      return new VHashChainValidator();
    case 'V-RAIL-SEPARATION':
      return new VRailSeparationValidator();
    case 'V-EMOTION-SSOT':
      return new VEmotionSSOTValidator();
    case 'V-NO-MAGIC-NUMBERS':
      return new VNoMagicNumbersValidator();
    case 'V-POLICY-LOCK':
      return new VPolicyLockValidator();
    case 'V-NARRATIVE-DRIFT-TOXICITY':
      return new VNarrativeDriftToxicityValidator();
    default:
      return null;
  }
}
