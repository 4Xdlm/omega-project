/**
 * OMEGA Truth Gate — Base Validator
 *
 * Abstract base class for all validators.
 */

import type { CanonTx } from '@omega/canon-kernel';
import type {
  Validator,
  ValidatorId,
  ValidatorResult,
  ValidationContext,
  VerdictType,
  VerdictEvidence,
} from '../gate/types.js';
import { createValidatorResult } from '../gate/verdict-factory.js';

/**
 * Base validator implementation.
 */
export abstract class BaseValidator implements Validator {
  abstract readonly id: ValidatorId;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly version: string;

  /**
   * Main validation entry point.
   */
  validate(tx: CanonTx, context: ValidationContext): ValidatorResult {
    const startTime = performance.now();
    const evidence: VerdictEvidence[] = [];

    try {
      const verdict = this.doValidate(tx, context, evidence);
      const duration = performance.now() - startTime;
      return createValidatorResult(this.id, verdict, evidence, duration);
    } catch (error) {
      const duration = performance.now() - startTime;
      evidence.push({
        type: 'policy_violation',
        details: `Validator error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return createValidatorResult(this.id, 'DENY', evidence, duration);
    }
  }

  /**
   * Abstract validation method - implement in subclasses.
   */
  protected abstract doValidate(
    tx: CanonTx,
    context: ValidationContext,
    evidence: VerdictEvidence[]
  ): VerdictType;

  /**
   * Helper to add evidence.
   * Filters out undefined values to satisfy canonicalize requirements.
   */
  protected addEvidence(
    evidence: VerdictEvidence[],
    type: VerdictEvidence['type'],
    details: string,
    options?: Partial<VerdictEvidence>
  ): void {
    const ev: VerdictEvidence = { type, details };
    if (options) {
      if (options.location !== undefined) {
        (ev as any).location = options.location;
      }
      if (options.expected !== undefined) {
        (ev as any).expected = options.expected;
      }
      if (options.actual !== undefined) {
        (ev as any).actual = options.actual;
      }
    }
    evidence.push(ev);
  }

  /**
   * Helper to allow with no evidence.
   */
  protected allow(): VerdictType {
    return 'ALLOW';
  }

  /**
   * Helper to deny.
   */
  protected deny(): VerdictType {
    return 'DENY';
  }

  /**
   * Helper to defer.
   */
  protected defer(): VerdictType {
    return 'DEFER';
  }
}
