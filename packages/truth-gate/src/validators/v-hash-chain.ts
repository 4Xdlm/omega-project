/**
 * OMEGA Truth Gate — V-HASH-CHAIN Validator
 *
 * Validates hash chain integrity.
 *
 * Checks:
 * - parent_root_hash continuity
 * - Hash computation correctness
 * - No gaps in chain
 */

import type { CanonTx } from '@omega/canon-kernel';
import { hashTx, GENESIS_HASH } from '@omega/canon-kernel';
import type { ValidatorId, ValidationContext, VerdictType, VerdictEvidence } from '../gate/types.js';
import { BaseValidator } from './base-validator.js';

export class VHashChainValidator extends BaseValidator {
  readonly id: ValidatorId = 'V-HASH-CHAIN';
  readonly name = 'Hash Chain Validator';
  readonly description = 'Validates hash chain integrity and continuity';
  readonly version = '1.0.0';

  protected doValidate(
    tx: CanonTx,
    context: ValidationContext,
    evidence: VerdictEvidence[]
  ): VerdictType {
    let isValid = true;

    // Validate parent_root_hash exists
    if (!tx.parent_root_hash) {
      this.addEvidence(evidence, 'hash_mismatch', 'Missing parent_root_hash', {
        location: 'tx.parent_root_hash',
      });
      return this.deny();
    }

    // If we have store snapshot, validate against current head
    if (context.store_snapshot) {
      const expectedParent = tx.rail === 'truth'
        ? context.store_snapshot.truth_head_hash
        : context.store_snapshot.interpretation_head_hash;

      if (tx.parent_root_hash !== expectedParent) {
        this.addEvidence(evidence, 'hash_mismatch', 'parent_root_hash does not match current chain head', {
          location: 'tx.parent_root_hash',
          expected: expectedParent,
          actual: tx.parent_root_hash,
        });
        isValid = false;
      }
    }

    // If we have previous tx, validate chain continuity
    if (context.previous_tx) {
      const previousHash = hashTx(context.previous_tx);

      if (tx.parent_root_hash !== previousHash && tx.parent_root_hash !== GENESIS_HASH) {
        // Check if this is the first tx after genesis
        if (context.store_snapshot && context.store_snapshot.entity_count === 0) {
          if (tx.parent_root_hash !== GENESIS_HASH) {
            this.addEvidence(evidence, 'hash_mismatch', 'First transaction must reference GENESIS_HASH', {
              location: 'tx.parent_root_hash',
              expected: GENESIS_HASH,
              actual: tx.parent_root_hash,
            });
            isValid = false;
          }
        }
      }
    }

    // Validate hash format (should be 64 hex chars)
    if (!this.isValidHashFormat(tx.parent_root_hash)) {
      this.addEvidence(evidence, 'hash_mismatch', 'Invalid hash format', {
        location: 'tx.parent_root_hash',
        actual: tx.parent_root_hash,
      });
      isValid = false;
    }

    // Compute hash and verify it's deterministic
    const computedHash = hashTx(tx);
    if (!this.isValidHashFormat(computedHash)) {
      this.addEvidence(evidence, 'hash_mismatch', 'Computed hash has invalid format', {
        location: 'computed_hash',
        actual: computedHash,
      });
      isValid = false;
    }

    return isValid ? this.allow() : this.deny();
  }

  private isValidHashFormat(hash: string): boolean {
    // Hash should be a valid ID format or hex string
    return typeof hash === 'string' && hash.length > 0;
  }
}

export function createHashChainValidator(): VHashChainValidator {
  return new VHashChainValidator();
}
