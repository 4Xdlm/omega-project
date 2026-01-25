/**
 * OMEGA Truth Gate — Main Engine
 *
 * The TruthGate is the primary validation layer.
 * All transactions must pass through the gate before acceptance.
 *
 * RULE: No transaction bypasses the gate.
 * RULE: All verdicts are recorded in the append-only ledger.
 */

import type { CanonTx, CalibrationConfig } from '@omega/canon-kernel';
import type {
  Validator,
  ValidationContext,
  ValidatorResult,
  GateVerdict,
  TruthGateConfig,
  PolicyPack,
  VerdictType,
  ValidatorId,
  StoreSnapshotRef,
} from './types.js';
import { createGateVerdict, createValidatorResult } from './verdict-factory.js';
import { VerdictLedger } from '../ledger/verdict-ledger.js';

/**
 * TruthGate — Primary validation engine.
 */
export class TruthGate {
  private readonly validators: Map<ValidatorId, Validator> = new Map();
  private readonly config: TruthGateConfig;
  private readonly ledger: VerdictLedger;
  private currentPolicy: PolicyPack;

  constructor(config: TruthGateConfig) {
    this.config = config;
    this.currentPolicy = config.default_policy;
    this.ledger = new VerdictLedger();
  }

  /**
   * Register a validator.
   * Validators must have unique IDs.
   */
  registerValidator(validator: Validator): void {
    if (this.validators.has(validator.id)) {
      throw new Error(`Validator already registered: ${validator.id}`);
    }
    this.validators.set(validator.id, validator);
  }

  /**
   * Unregister a validator.
   */
  unregisterValidator(validator_id: ValidatorId): boolean {
    return this.validators.delete(validator_id);
  }

  /**
   * Get registered validator by ID.
   */
  getValidator(validator_id: ValidatorId): Validator | undefined {
    return this.validators.get(validator_id);
  }

  /**
   * Get all registered validators.
   */
  getRegisteredValidators(): readonly Validator[] {
    return Array.from(this.validators.values());
  }

  /**
   * Get count of registered validators.
   */
  getValidatorCount(): number {
    return this.validators.size;
  }

  /**
   * Check if a validator is registered.
   */
  hasValidator(validator_id: ValidatorId): boolean {
    return this.validators.has(validator_id);
  }

  /**
   * Update the active policy.
   */
  setPolicy(policy: PolicyPack): void {
    this.currentPolicy = policy;
  }

  /**
   * Get the current policy.
   */
  getPolicy(): PolicyPack {
    return this.currentPolicy;
  }

  /**
   * Get the verdict ledger.
   */
  getLedger(): VerdictLedger {
    return this.ledger;
  }

  /**
   * Validate a transaction through the gate.
   * Returns the gate verdict and records it in the ledger.
   */
  validate(
    tx: CanonTx,
    storeSnapshot?: StoreSnapshotRef,
    previousTx?: CanonTx
  ): GateVerdict {
    const context: ValidationContext = {
      calibration: this.config.calibration,
      policy: this.currentPolicy,
      store_snapshot: storeSnapshot,
      previous_tx: previousTx,
    };

    const results = this.runValidators(tx, context);
    const verdict = createGateVerdict(
      tx.tx_id,
      results,
      this.currentPolicy.policy_id,
      this.currentPolicy.rules
    );

    // Record in ledger
    this.ledger.append(verdict);

    return verdict;
  }

  /**
   * Validate without recording (for preview/dry-run).
   */
  validateDryRun(
    tx: CanonTx,
    storeSnapshot?: StoreSnapshotRef,
    previousTx?: CanonTx
  ): GateVerdict {
    const context: ValidationContext = {
      calibration: this.config.calibration,
      policy: this.currentPolicy,
      store_snapshot: storeSnapshot,
      previous_tx: previousTx,
    };

    const results = this.runValidators(tx, context);
    return createGateVerdict(
      tx.tx_id,
      results,
      this.currentPolicy.policy_id,
      this.currentPolicy.rules
    );
  }

  /**
   * Check if a transaction would pass the gate.
   */
  wouldAllow(
    tx: CanonTx,
    storeSnapshot?: StoreSnapshotRef,
    previousTx?: CanonTx
  ): boolean {
    const verdict = this.validateDryRun(tx, storeSnapshot, previousTx);
    return verdict.final_verdict === 'ALLOW';
  }

  /**
   * Get verdict history for a transaction.
   */
  getVerdictHistory(tx_id: string): readonly GateVerdict[] {
    return this.ledger.getVerdictsByTxId(tx_id);
  }

  /**
   * Verify ledger integrity.
   */
  verifyLedgerIntegrity(): boolean {
    return this.ledger.verifyIntegrity();
  }

  /**
   * Get ledger statistics.
   */
  getLedgerStats(): {
    total_verdicts: number;
    allow_count: number;
    deny_count: number;
    defer_count: number;
  } {
    const verdicts = this.ledger.getAllVerdicts();
    return {
      total_verdicts: verdicts.length,
      allow_count: verdicts.filter(v => v.final_verdict === 'ALLOW').length,
      deny_count: verdicts.filter(v => v.final_verdict === 'DENY').length,
      defer_count: verdicts.filter(v => v.final_verdict === 'DEFER').length,
    };
  }

  /**
   * Run all enabled validators.
   */
  private runValidators(tx: CanonTx, context: ValidationContext): readonly ValidatorResult[] {
    const enabledValidators = this.currentPolicy.validators_enabled;
    const results: ValidatorResult[] = [];

    for (const validatorId of enabledValidators) {
      const validator = this.validators.get(validatorId);

      if (!validator) {
        // Missing validator - handle based on strict mode
        if (this.config.strict_mode) {
          results.push(
            createValidatorResult(
              validatorId,
              'DENY',
              [{
                type: 'policy_violation',
                details: `Required validator not registered: ${validatorId}`,
              }],
              0
            )
          );
        }
        continue;
      }

      const startTime = performance.now();
      try {
        const result = validator.validate(tx, context);
        results.push(result);
      } catch (error) {
        // Validator error → DENY
        results.push(
          createValidatorResult(
            validatorId,
            'DENY',
            [{
              type: 'policy_violation',
              details: `Validator error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            performance.now() - startTime
          )
        );
      }
    }

    return results;
  }
}

/**
 * Create a TruthGate with default configuration.
 */
export function createTruthGate(config: TruthGateConfig): TruthGate {
  return new TruthGate(config);
}
