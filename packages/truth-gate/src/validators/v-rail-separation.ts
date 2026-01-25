/**
 * OMEGA Truth Gate — V-RAIL-SEPARATION Validator
 *
 * Validates rail separation between truth and interpretation.
 *
 * Checks:
 * - No cross-rail references
 * - PROMOTE operations are valid
 * - Rail consistency within transaction
 */

import type { CanonTx } from '@omega/canon-kernel';
import type { ValidatorId, ValidationContext, VerdictType, VerdictEvidence } from '../gate/types.js';
import { BaseValidator } from './base-validator.js';

export class VRailSeparationValidator extends BaseValidator {
  readonly id: ValidatorId = 'V-RAIL-SEPARATION';
  readonly name = 'Rail Separation Validator';
  readonly description = 'Validates truth/interpretation rail separation';
  readonly version = '1.0.0';

  protected doValidate(
    tx: CanonTx,
    context: ValidationContext,
    evidence: VerdictEvidence[]
  ): VerdictType {
    let isValid = true;

    // Validate rail type
    if (tx.rail !== 'truth' && tx.rail !== 'interpretation') {
      this.addEvidence(evidence, 'rail_violation', 'Invalid rail type', {
        location: 'tx.rail',
        actual: tx.rail,
        expected: 'truth | interpretation',
      });
      return this.deny();
    }

    // Check for PROMOTE operations
    const promoteOps = tx.ops.filter(op => op.type === 'PROMOTE');

    for (const op of promoteOps) {
      // PROMOTE can only go from interpretation to truth
      if (tx.rail !== 'truth') {
        this.addEvidence(evidence, 'rail_violation', 'PROMOTE operation must be on truth rail', {
          location: `op.${op.op_id}`,
          actual: tx.rail,
          expected: 'truth',
        });
        isValid = false;
      }

      // PROMOTE must reference an interpretation entity
      if (op.evidence_refs && op.evidence_refs.length > 0) {
        const sourceEvidence = op.evidence_refs.find(e => e.type === 'interpretation_source');
        if (!sourceEvidence) {
          this.addEvidence(evidence, 'rail_violation', 'PROMOTE must have interpretation_source evidence', {
            location: `op.${op.op_id}`,
          });
          isValid = false;
        }
      }
    }

    // Non-PROMOTE ops on truth rail should not reference interpretation entities
    if (tx.rail === 'truth') {
      for (const op of tx.ops) {
        if (op.type !== 'PROMOTE' && op.target) {
          // Check if target suggests interpretation (heuristic)
          if (op.target.startsWith('interp:') || op.target.includes(':interpretation:')) {
            this.addEvidence(evidence, 'rail_violation', 'Truth rail cannot directly reference interpretation entities', {
              location: `op.${op.op_id}`,
              actual: op.target,
            });
            isValid = false;
          }
        }
      }
    }

    // Interpretation rail cannot contain canonical truth modifications
    if (tx.rail === 'interpretation') {
      for (const op of tx.ops) {
        if (op.target && (op.target.startsWith('canon:') || op.target.startsWith('truth:'))) {
          this.addEvidence(evidence, 'rail_violation', 'Interpretation rail cannot modify canonical entities', {
            location: `op.${op.op_id}`,
            actual: op.target,
          });
          isValid = false;
        }
      }
    }

    // Validate previous_tx rail if provided
    if (context.previous_tx && context.previous_tx.rail !== tx.rail) {
      // Different rails - this is fine, but parent_root_hash must match the correct rail
      // This is handled by V-HASH-CHAIN, so just note it here
    }

    return isValid ? this.allow() : this.deny();
  }
}

export function createRailSeparationValidator(): VRailSeparationValidator {
  return new VRailSeparationValidator();
}
