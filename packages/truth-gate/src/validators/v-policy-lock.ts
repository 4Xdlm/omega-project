/**
 * OMEGA Truth Gate — V-POLICY-LOCK Validator
 *
 * Validates that transactions comply with active policy.
 *
 * Checks:
 * - Transaction respects blocked patterns
 * - Required validators are all present
 * - Policy constraints are satisfied
 */

import type { CanonTx } from '@omega/canon-kernel';
import type { ValidatorId, ValidationContext, VerdictType, VerdictEvidence } from '../gate/types.js';
import { BaseValidator } from './base-validator.js';

export class VPolicyLockValidator extends BaseValidator {
  readonly id: ValidatorId = 'V-POLICY-LOCK';
  readonly name = 'Policy Lock Validator';
  readonly description = 'Validates transaction complies with active policy constraints';
  readonly version = '1.0.0';

  protected doValidate(
    tx: CanonTx,
    context: ValidationContext,
    evidence: VerdictEvidence[]
  ): VerdictType {
    let isValid = true;
    const policy = context.policy;

    // Check blocked patterns
    if (policy.rules.blocked_patterns.length > 0) {
      for (const op of tx.ops) {
        for (const pattern of policy.rules.blocked_patterns) {
          if (this.matchesPattern(op, pattern)) {
            this.addEvidence(evidence, 'policy_violation', `Operation matches blocked pattern: ${pattern}`, {
              location: `op.${op.op_id}`,
            });
            isValid = false;
          }
        }
      }
    }

    // Check allowed schemas
    if (policy.rules.allowed_schemas.length > 0) {
      for (const op of tx.ops) {
        if (op.target) {
          const entityType = op.target.split(':')[0];
          if (entityType && !policy.rules.allowed_schemas.includes(entityType)) {
            this.addEvidence(evidence, 'policy_violation', `Entity type not in allowed schemas: ${entityType}`, {
              location: `op.${op.op_id}.target`,
              actual: entityType,
            });
            isValid = false;
          }
        }
      }
    }

    // Verify policy hash is valid (not corrupted)
    if (!policy.hash || policy.hash.length === 0) {
      this.addEvidence(evidence, 'policy_violation', 'Policy has invalid or missing hash', {
        location: 'policy.hash',
      });
      isValid = false;
    }

    // Check if all required validators are enabled
    if (policy.rules.require_all_validators) {
      const requiredValidators: ValidatorId[] = [
        'V-CANON-SCHEMA',
        'V-HASH-CHAIN',
        'V-RAIL-SEPARATION',
      ];

      for (const validatorId of requiredValidators) {
        if (!policy.validators_enabled.includes(validatorId)) {
          this.addEvidence(evidence, 'policy_violation', `Required validator not enabled: ${validatorId}`, {
            location: 'policy.validators_enabled',
          });
          // This is a policy configuration issue, not a tx issue
          // So we don't fail the validation, just warn
        }
      }
    }

    // Validate transaction doesn't try to modify policy-protected entities
    const protectedPrefixes = ['policy:', 'system:', 'config:'];
    for (const op of tx.ops) {
      if (op.target) {
        for (const prefix of protectedPrefixes) {
          if (op.target.startsWith(prefix)) {
            this.addEvidence(evidence, 'policy_violation', `Cannot modify protected entity: ${op.target}`, {
              location: `op.${op.op_id}.target`,
            });
            isValid = false;
          }
        }
      }
    }

    return isValid ? this.allow() : this.deny();
  }

  private matchesPattern(op: { target?: string; field_path?: readonly string[]; type: string }, pattern: string): boolean {
    // Simple pattern matching
    // Pattern format: "entity:*" or "*:field" or "type:*"

    const patternLower = pattern.toLowerCase();

    // Check target (entity_id)
    if (op.target && op.target.toLowerCase().includes(patternLower.replace('*', ''))) {
      return true;
    }

    // Check field_path
    const fieldPathStr = op.field_path?.join('.') ?? '';
    if (fieldPathStr && fieldPathStr.toLowerCase().includes(patternLower.replace('*', ''))) {
      return true;
    }

    // Check type (op_type)
    if (op.type.toLowerCase() === patternLower) {
      return true;
    }

    // Regex pattern support
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
      if (op.target && regex.test(op.target)) {
        return true;
      }
      if (fieldPathStr && regex.test(fieldPathStr)) {
        return true;
      }
    }

    return false;
  }
}

export function createPolicyLockValidator(): VPolicyLockValidator {
  return new VPolicyLockValidator();
}
