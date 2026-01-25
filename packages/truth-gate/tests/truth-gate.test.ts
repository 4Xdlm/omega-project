/**
 * OMEGA Truth Gate — TruthGate Engine Tests
 *
 * Tests for the main TruthGate engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TruthGate, createTruthGate } from '../src/gate/truth-gate.js';
import type { TruthGateConfig, PolicyPack, ValidatorId, Validator, ValidationContext } from '../src/gate/types.js';
import { createValidatorResult } from '../src/gate/verdict-factory.js';
import {
  TEST_CALIBRATION,
  createCanonTx,
  createCanonOp,
  GENESIS_HASH,
  createDeterministicId,
  type TxId,
  type OpId,
  type EntityId,
  type CanonTx,
  type CanonOp,
} from '@omega/canon-kernel';

// Test helpers
const TEST_SEED = 'test-seed-truth-gate-v1';
const TEST_NAMESPACE = 'truth-gate-tests';

let txCounter = 0;
let opCounter = 0;

function createTestTxId(name?: string): TxId {
  const id = name ?? `tx-${++txCounter}`;
  return createDeterministicId('tx', TEST_SEED, TEST_NAMESPACE, { name: id });
}

function createTestOpId(name?: string): OpId {
  const id = name ?? `op-${++opCounter}`;
  return createDeterministicId('op', TEST_SEED, TEST_NAMESPACE, { name: id });
}

function createTestEntityId(name: string): EntityId {
  return createDeterministicId('ent', TEST_SEED, TEST_NAMESPACE, { name });
}

function createTestOp(entityName: string, fieldPath: string[], value: unknown): CanonOp {
  return createCanonOp(createTestOpId(), 'SET', createTestEntityId(entityName), {
    field_path: fieldPath,
    value,
  });
}

function createTestTx(parentHash: string = GENESIS_HASH, rail: 'truth' | 'interpretation' = 'truth'): CanonTx {
  const op = createTestOp('entity1', ['field'], 'value');
  return createCanonTx(createTestTxId(), [op], 'test-actor', 'Test transaction', parentHash, rail);
}

// Mock validator for testing
class MockValidator implements Validator {
  constructor(
    public readonly id: ValidatorId,
    public readonly verdict: 'ALLOW' | 'DENY' | 'DEFER' = 'ALLOW'
  ) {}

  readonly name = 'Mock Validator';
  readonly description = 'Test validator';
  readonly version = '1.0.0';

  validate(tx: CanonTx, context: ValidationContext) {
    return createValidatorResult(this.id, this.verdict, [], 1);
  }
}

describe('TruthGate', () => {
  let config: TruthGateConfig;
  let defaultPolicy: PolicyPack;

  beforeEach(() => {
    // Reset counters
    txCounter = 0;
    opCounter = 0;

    defaultPolicy = {
      policy_id: 'P-TEST-v1' as any,
      version: '1.0.0',
      validators_enabled: ['V-MOCK-1' as ValidatorId, 'V-MOCK-2' as ValidatorId],
      rules: {
        require_all_validators: true,
        defer_on_any_defer: true,
        deny_on_any_deny: true,
        max_drift_score: 0.3,
        max_toxicity_score: 0.1,
        allowed_schemas: [],
        blocked_patterns: [],
      },
      created_at: Date.now(),
      hash: 'policy-hash' as any,
    };

    config = {
      default_policy: defaultPolicy,
      calibration: TEST_CALIBRATION,
      strict_mode: false,
      enable_proof_carrying: false,
    };
  });

  describe('constructor', () => {
    it('should create TruthGate with config', () => {
      const gate = new TruthGate(config);
      expect(gate).toBeDefined();
      expect(gate.getPolicy()).toBe(defaultPolicy);
    });

    it('should initialize empty validator registry', () => {
      const gate = new TruthGate(config);
      expect(gate.getValidatorCount()).toBe(0);
    });
  });

  describe('registerValidator', () => {
    it('should register validator', () => {
      const gate = new TruthGate(config);
      const validator = new MockValidator('V-MOCK-1' as ValidatorId);
      gate.registerValidator(validator);
      expect(gate.hasValidator('V-MOCK-1' as ValidatorId)).toBe(true);
    });

    it('should throw on duplicate registration', () => {
      const gate = new TruthGate(config);
      const validator = new MockValidator('V-MOCK-1' as ValidatorId);
      gate.registerValidator(validator);
      expect(() => gate.registerValidator(validator)).toThrow('already registered');
    });

    it('should retrieve registered validator', () => {
      const gate = new TruthGate(config);
      const validator = new MockValidator('V-MOCK-1' as ValidatorId);
      gate.registerValidator(validator);
      expect(gate.getValidator('V-MOCK-1' as ValidatorId)).toBe(validator);
    });
  });

  describe('unregisterValidator', () => {
    it('should unregister validator', () => {
      const gate = new TruthGate(config);
      const validator = new MockValidator('V-MOCK-1' as ValidatorId);
      gate.registerValidator(validator);
      expect(gate.unregisterValidator('V-MOCK-1' as ValidatorId)).toBe(true);
      expect(gate.hasValidator('V-MOCK-1' as ValidatorId)).toBe(false);
    });

    it('should return false for non-existent validator', () => {
      const gate = new TruthGate(config);
      expect(gate.unregisterValidator('V-NONEXISTENT' as ValidatorId)).toBe(false);
    });
  });

  describe('getRegisteredValidators', () => {
    it('should return all registered validators', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId));
      const validators = gate.getRegisteredValidators();
      expect(validators).toHaveLength(2);
    });
  });

  describe('setPolicy', () => {
    it('should update active policy', () => {
      const gate = new TruthGate(config);
      const newPolicy: PolicyPack = { ...defaultPolicy, policy_id: 'P-NEW-v1' as any };
      gate.setPolicy(newPolicy);
      expect(gate.getPolicy()).toBe(newPolicy);
    });
  });

  describe('validate', () => {
    it('should return ALLOW when all validators pass', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'ALLOW'));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'ALLOW'));

      const tx = createTestTx();
      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('ALLOW');
    });

    it('should return DENY when any validator denies', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'ALLOW'));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'DENY'));

      const tx = createTestTx();
      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('DENY');
    });

    it('should return DEFER when any validator defers (no deny)', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'ALLOW'));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'DEFER'));

      const tx = createTestTx();
      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('DEFER');
    });

    it('should record verdict in ledger', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'ALLOW'));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'ALLOW'));

      const tx = createTestTx();
      gate.validate(tx);
      expect(gate.getLedger().getEntryCount()).toBe(1);
    });

    it('should include validator results in verdict', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'ALLOW'));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'ALLOW'));

      const tx = createTestTx();
      const verdict = gate.validate(tx);
      expect(verdict.validator_results).toHaveLength(2);
    });
  });

  describe('validateDryRun', () => {
    it('should not record verdict in ledger', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'ALLOW'));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'ALLOW'));

      const tx = createTestTx();
      gate.validateDryRun(tx);
      expect(gate.getLedger().getEntryCount()).toBe(0);
    });
  });

  describe('wouldAllow', () => {
    it('should return true when validation would pass', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'ALLOW'));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'ALLOW'));

      const tx = createTestTx();
      expect(gate.wouldAllow(tx)).toBe(true);
    });

    it('should return false when validation would fail', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'DENY'));

      const tx = createTestTx();
      expect(gate.wouldAllow(tx)).toBe(false);
    });
  });

  describe('strict_mode', () => {
    it('should deny when enabled validator is missing in strict mode', () => {
      const strictConfig = { ...config, strict_mode: true };
      const gate = new TruthGate(strictConfig);
      // Don't register V-MOCK-1 or V-MOCK-2

      const tx = createTestTx();
      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('DENY');
    });

    it('should skip missing validators when not in strict mode', () => {
      const gate = new TruthGate(config);
      // Don't register any validators

      const tx = createTestTx();
      const verdict = gate.validate(tx);
      // No validators ran, no results, so DENY (empty results)
      expect(verdict.final_verdict).toBe('DENY');
    });
  });

  describe('getLedgerStats', () => {
    it('should return correct statistics', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'ALLOW'));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'ALLOW'));

      // Add ALLOW verdict
      gate.validate(createTestTx());

      // Change to DENY
      gate.unregisterValidator('V-MOCK-2' as ValidatorId);
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'DENY'));

      // Add DENY verdict
      gate.validate(createTestTx());

      const stats = gate.getLedgerStats();
      expect(stats.total_verdicts).toBe(2);
      expect(stats.allow_count).toBe(1);
      expect(stats.deny_count).toBe(1);
    });
  });

  describe('getVerdictHistory', () => {
    it('should return verdicts for specific tx_id', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'ALLOW'));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'ALLOW'));

      const txId = createTestTxId('specific-tx');
      const op = createTestOp('entity1', ['field'], 'value');
      const tx = createCanonTx(txId, [op], 'test-actor', 'Test', GENESIS_HASH, 'truth');

      gate.validate(tx);
      const history = gate.getVerdictHistory(txId);
      expect(history).toHaveLength(1);
      expect(history[0].tx_id).toBe(txId);
    });
  });

  describe('verifyLedgerIntegrity', () => {
    it('should return true for valid ledger', () => {
      const gate = new TruthGate(config);
      gate.registerValidator(new MockValidator('V-MOCK-1' as ValidatorId, 'ALLOW'));
      gate.registerValidator(new MockValidator('V-MOCK-2' as ValidatorId, 'ALLOW'));

      gate.validate(createTestTx());
      expect(gate.verifyLedgerIntegrity()).toBe(true);
    });
  });

  describe('createTruthGate', () => {
    it('should create TruthGate instance', () => {
      const gate = createTruthGate(config);
      expect(gate).toBeInstanceOf(TruthGate);
    });
  });
});
