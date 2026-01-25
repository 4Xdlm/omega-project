/**
 * OMEGA Truth Gate — V-CANON-SCHEMA Validator
 *
 * Validates that transactions conform to the Canon schema.
 *
 * Checks:
 * - tx_id format
 * - ops array structure
 * - op_id format
 * - Required fields presence
 * - Rail type validity
 */

import type { CanonTx, CanonOp } from '@omega/canon-kernel';
import { isOpId, isTxId } from '@omega/canon-kernel';
import type { ValidatorId, ValidationContext, VerdictType, VerdictEvidence } from '../gate/types.js';
import { BaseValidator } from './base-validator.js';

export class VCanonSchemaValidator extends BaseValidator {
  readonly id: ValidatorId = 'V-CANON-SCHEMA';
  readonly name = 'Canon Schema Validator';
  readonly description = 'Validates transaction structure conforms to Canon schema';
  readonly version = '1.0.0';

  protected doValidate(
    tx: CanonTx,
    context: ValidationContext,
    evidence: VerdictEvidence[]
  ): VerdictType {
    let isValid = true;

    // Validate tx_id
    if (!tx.tx_id || typeof tx.tx_id !== 'string') {
      this.addEvidence(evidence, 'schema_violation', 'Missing or invalid tx_id', {
        location: 'tx.tx_id',
      });
      isValid = false;
    } else if (!isTxId(tx.tx_id)) {
      this.addEvidence(evidence, 'schema_violation', 'tx_id does not match expected format', {
        location: 'tx.tx_id',
        actual: tx.tx_id,
      });
      isValid = false;
    }

    // Validate ops array
    if (!Array.isArray(tx.ops)) {
      this.addEvidence(evidence, 'schema_violation', 'ops must be an array', {
        location: 'tx.ops',
      });
      isValid = false;
    } else {
      // Validate each operation
      for (let i = 0; i < tx.ops.length; i++) {
        const op = tx.ops[i];
        if (!this.validateOp(op, i, evidence)) {
          isValid = false;
        }
      }
    }

    // Validate rail
    if (!tx.rail || (tx.rail !== 'truth' && tx.rail !== 'interpretation')) {
      this.addEvidence(evidence, 'schema_violation', 'Invalid rail type', {
        location: 'tx.rail',
        actual: tx.rail,
        expected: 'truth | interpretation',
      });
      isValid = false;
    }

    // Validate parent_root_hash
    if (!tx.parent_root_hash || typeof tx.parent_root_hash !== 'string') {
      this.addEvidence(evidence, 'schema_violation', 'Missing or invalid parent_root_hash', {
        location: 'tx.parent_root_hash',
      });
      isValid = false;
    }

    // Validate timestamp
    if (typeof tx.timestamp !== 'number' || tx.timestamp <= 0) {
      this.addEvidence(evidence, 'schema_violation', 'Invalid timestamp', {
        location: 'tx.timestamp',
        actual: String(tx.timestamp),
      });
      isValid = false;
    }

    // Check allowed schemas if policy specifies
    if (context.policy.rules.allowed_schemas.length > 0) {
      const hasBlockedSchema = tx.ops.some(op => {
        if (op.type === 'SET' && op.target) {
          const entityType = op.target.split(':')[0];
          return !context.policy.rules.allowed_schemas.includes(entityType || '');
        }
        return false;
      });

      if (hasBlockedSchema) {
        this.addEvidence(evidence, 'schema_violation', 'Transaction contains blocked schema type', {
          location: 'tx.ops',
        });
        isValid = false;
      }
    }

    return isValid ? this.allow() : this.deny();
  }

  private validateOp(op: CanonOp, index: number, evidence: VerdictEvidence[]): boolean {
    let isValid = true;

    // Validate op_id
    if (!op.op_id || typeof op.op_id !== 'string') {
      this.addEvidence(evidence, 'schema_violation', `Missing or invalid op_id at index ${index}`, {
        location: `tx.ops[${index}].op_id`,
      });
      isValid = false;
    } else if (!isOpId(op.op_id)) {
      this.addEvidence(evidence, 'schema_violation', `op_id does not match expected format at index ${index}`, {
        location: `tx.ops[${index}].op_id`,
        actual: op.op_id,
      });
      isValid = false;
    }

    // Validate type (op_type)
    const validOpTypes = ['SET', 'DELETE', 'PROMOTE', 'LINK', 'UNLINK'];
    if (!op.type || !validOpTypes.includes(op.type)) {
      this.addEvidence(evidence, 'schema_violation', `Invalid op type at index ${index}`, {
        location: `tx.ops[${index}].type`,
        actual: op.type,
        expected: validOpTypes.join(' | '),
      });
      isValid = false;
    }

    // Validate target (entity_id) for non-DELETE ops
    if (op.type !== 'DELETE' && (!op.target || typeof op.target !== 'string')) {
      this.addEvidence(evidence, 'schema_violation', `Missing target at index ${index}`, {
        location: `tx.ops[${index}].target`,
      });
      isValid = false;
    }

    return isValid;
  }
}

export function createCanonSchemaValidator(): VCanonSchemaValidator {
  return new VCanonSchemaValidator();
}
