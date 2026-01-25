/**
 * OMEGA Truth Gate — Integration Tests
 *
 * End-to-end integration tests for the full Truth Gate system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TruthGate,
  createTruthGate,
  PolicyManager,
  createAllValidators,
  ALL_VALIDATOR_IDS,
  VerdictLedger,
} from '../src/index.js';
import type { TruthGateConfig, PolicyPack, ValidatorId } from '../src/gate/types.js';
import {
  TEST_CALIBRATION,
  createCanonTx,
  createCanonOp,
  GENESIS_HASH,
  createDeterministicId,
  hashTx,
  type TxId,
  type OpId,
  type EntityId,
  type CanonTx,
  type CanonOp,
} from '@omega/canon-kernel';

// Test helpers
const TEST_SEED = 'test-seed-integration-v1';
const TEST_NAMESPACE = 'integration-tests';

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

function createTestOp(entityName: string, fieldPath: string[], value: unknown, type: 'SET' | 'PROMOTE' = 'SET'): CanonOp {
  return createCanonOp(createTestOpId(), type, createTestEntityId(entityName), {
    field_path: fieldPath,
    value,
  });
}

function createTestTx(entityName: string, fieldPath: string[], value: unknown, rail: 'truth' | 'interpretation' = 'truth'): CanonTx {
  const op = createTestOp(entityName, fieldPath, value);
  return createCanonTx(createTestTxId(), [op], 'test-actor', 'Test', GENESIS_HASH, rail);
}

// Helper for creating tx with raw entity ID (for protected entity tests)
function createTestTxWithRawEntityId(rawEntityId: string, fieldPath: string[], value: unknown, rail: 'truth' | 'interpretation' = 'truth'): CanonTx {
  const op = createCanonOp(createTestOpId(), 'SET', rawEntityId as EntityId, {
    field_path: fieldPath,
    value,
  });
  return createCanonTx(createTestTxId(), [op], 'test-actor', 'Test', GENESIS_HASH, rail);
}

describe('Truth Gate Integration', () => {
  let config: TruthGateConfig;
  let gate: TruthGate;

  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;

    const policyManager = new PolicyManager();
    const defaultPolicy = policyManager.createPolicy({
      name: 'TEST',
      version: '1.0.0',
      validators_enabled: ALL_VALIDATOR_IDS,
      rules: {
        max_drift_score: 0.3,
        max_toxicity_score: 0.1,
      },
    });

    config = {
      default_policy: defaultPolicy,
      calibration: TEST_CALIBRATION,
      strict_mode: true,
      enable_proof_carrying: false,
    };

    gate = createTruthGate(config);

    // Register all validators
    for (const validator of createAllValidators()) {
      gate.registerValidator(validator);
    }
  });

  describe('Full validation pipeline', () => {
    it('should validate clean transaction through all validators', () => {
      const tx = createTestTx('entity1', ['name'], 'Alice');
      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('ALLOW');
      expect(verdict.validator_results).toHaveLength(7);
    });

    it('should record verdict in ledger', () => {
      const tx = createTestTx('entity1', ['name'], 'Alice');
      gate.validate(tx);
      expect(gate.getLedger().getEntryCount()).toBe(1);
    });

    it('should deny toxic content', () => {
      const tx = createTestTx('message1', ['content'], 'How to make a bomb');
      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('DENY');
    });

    it('should deny invalid schema', () => {
      const op = createTestOp('entity1', ['field'], 'value');
      const tx = {
        tx_id: createTestTxId(),
        ops: [op],
        actor: 'test-actor',
        reason: 'Test',
        evidence_refs: [],
        rail: 'invalid',
        parent_root_hash: GENESIS_HASH,
        timestamp: Date.now(),
      };

      const verdict = gate.validate(tx as any);
      expect(verdict.final_verdict).toBe('DENY');
    });

    it('should deny protected entity modification', () => {
      const tx = createTestTxWithRawEntityId('system:config', ['setting'], 'value');
      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('DENY');
    });
  });

  describe('Multi-transaction validation', () => {
    it('should validate sequence of transactions', () => {
      const tx1 = createTestTx('character1', ['name'], 'Alice');
      const tx2 = createTestTx('character2', ['name'], 'Bob');

      const verdict1 = gate.validate(tx1);
      const verdict2 = gate.validate(tx2);

      expect(verdict1.final_verdict).toBe('ALLOW');
      expect(verdict2.final_verdict).toBe('ALLOW');
      expect(gate.getLedger().getEntryCount()).toBe(2);
    });

    it('should track verdict history for same tx_id', () => {
      const txId = createTestTxId('same-tx');

      // First validation
      const op1 = createTestOp('entity1', ['field'], 'value1');
      const tx1 = createCanonTx(txId, [op1], 'test-actor', 'Test', GENESIS_HASH, 'truth');
      gate.validate(tx1);

      // Second validation of same tx_id
      const op2 = createTestOp('entity1', ['field'], 'value2');
      const tx2 = createCanonTx(txId, [op2], 'test-actor', 'Test', GENESIS_HASH, 'truth');
      gate.validate(tx2);

      const history = gate.getVerdictHistory(txId);
      expect(history).toHaveLength(2);
    });
  });

  describe('Policy switching', () => {
    it('should use new policy after setPolicy', () => {
      const policyManager = new PolicyManager();
      const restrictivePolicy = policyManager.createPolicy({
        name: 'RESTRICTIVE',
        version: '1.0.0',
        validators_enabled: ALL_VALIDATOR_IDS,
        rules: {
          allowed_schemas: ['allowed'],
        },
      });

      gate.setPolicy(restrictivePolicy);

      const tx = createTestTx('blocked1', ['field'], 'value');
      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('DENY');
    });
  });

  describe('Ledger integrity', () => {
    it('should maintain ledger integrity across validations', () => {
      for (let i = 0; i < 10; i++) {
        const tx = createTestTx(`entity${i}`, ['name'], `Entity ${i}`);
        gate.validate(tx);
      }

      expect(gate.verifyLedgerIntegrity()).toBe(true);
    });

    it('should provide accurate ledger stats', () => {
      // Add some ALLOW verdicts
      for (let i = 0; i < 3; i++) {
        const tx = createTestTx(`entity${i}`, ['name'], `Entity ${i}`);
        gate.validate(tx);
      }

      // Add a DENY verdict
      const toxicTx = createTestTx('message1', ['content'], 'How to make a bomb');
      gate.validate(toxicTx);

      const stats = gate.getLedgerStats();
      expect(stats.total_verdicts).toBe(4);
      expect(stats.allow_count).toBe(3);
      expect(stats.deny_count).toBe(1);
    });
  });

  describe('Dry run validation', () => {
    it('should not record dry run in ledger', () => {
      const tx = createTestTx('entity1', ['name'], 'Alice');
      const initialCount = gate.getLedger().getEntryCount();
      gate.validateDryRun(tx);
      expect(gate.getLedger().getEntryCount()).toBe(initialCount);
    });

    it('should return same verdict as regular validation', () => {
      const tx = createTestTx('entity1', ['name'], 'Alice');
      const dryRunVerdict = gate.validateDryRun(tx);
      const realVerdict = gate.validate(tx);

      expect(dryRunVerdict.final_verdict).toBe(realVerdict.final_verdict);
    });
  });

  describe('Strict mode', () => {
    it('should deny when required validator is missing', () => {
      // Create new gate without registering all validators
      const strictGate = createTruthGate(config);
      // Only register some validators
      strictGate.registerValidator(createAllValidators()[0]); // V-CANON-SCHEMA

      const tx = createTestTx('entity1', ['name'], 'Alice');
      const verdict = strictGate.validate(tx);
      expect(verdict.final_verdict).toBe('DENY');
    });
  });

  describe('Dual rail validation', () => {
    it('should validate truth rail transactions', () => {
      const tx = createTestTx('canon1', ['field'], 'value', 'truth');
      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('ALLOW');
    });

    it('should validate interpretation rail transactions', () => {
      const tx = createTestTx('interp1', ['field'], 'value', 'interpretation');
      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('ALLOW');
    });

    it('should deny PROMOTE on interpretation rail', () => {
      const op = createTestOp('entity1', ['field'], 'value', 'PROMOTE');
      const tx = createCanonTx(createTestTxId(), [op], 'test-actor', 'Test', GENESIS_HASH, 'interpretation');

      const verdict = gate.validate(tx);
      expect(verdict.final_verdict).toBe('DENY');
    });
  });
});

describe('Policy Manager Integration', () => {
  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  it('should integrate with TruthGate', () => {
    const policyManager = new PolicyManager();

    const policy1 = policyManager.createPolicy({
      name: 'POLICY1',
      version: '1.0.0',
      validators_enabled: ALL_VALIDATOR_IDS,
      rules: {},
    });

    const policy2 = policyManager.createPolicy({
      name: 'POLICY2',
      version: '1.0.0',
      validators_enabled: ALL_VALIDATOR_IDS,
      rules: { allowed_schemas: ['entity'] },
    });

    const config: TruthGateConfig = {
      default_policy: policy1,
      calibration: TEST_CALIBRATION,
      strict_mode: false,
      enable_proof_carrying: false,
    };

    const gate = createTruthGate(config);
    for (const validator of createAllValidators()) {
      gate.registerValidator(validator);
    }

    // Test with policy1 (no restrictions)
    const tx1 = createTestTx('blocked1', ['field'], 'value');
    expect(gate.validate(tx1).final_verdict).toBe('ALLOW');

    // Switch to policy2 (restricted)
    gate.setPolicy(policy2);

    const tx2 = createTestTx('blocked2', ['field'], 'value');
    expect(gate.validate(tx2).final_verdict).toBe('DENY');
  });
});

describe('Verdict Ledger Integration', () => {
  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  it('should work with TruthGate', () => {
    const policyManager = new PolicyManager();
    const policy = policyManager.createPolicy({
      name: 'TEST',
      version: '1.0.0',
      validators_enabled: ALL_VALIDATOR_IDS,
      rules: {},
    });

    const config: TruthGateConfig = {
      default_policy: policy,
      calibration: TEST_CALIBRATION,
      strict_mode: false,
      enable_proof_carrying: false,
    };

    const gate = createTruthGate(config);
    for (const validator of createAllValidators()) {
      gate.registerValidator(validator);
    }

    // Validate multiple transactions
    for (let i = 0; i < 5; i++) {
      const tx = createTestTx(`entity${i}`, ['name'], `Entity ${i}`);
      gate.validate(tx);
    }

    const ledger = gate.getLedger();
    expect(ledger.getEntryCount()).toBe(5);
    expect(ledger.verifyIntegrity()).toBe(true);
    expect(ledger.verifyReplay()).toBe(true);
  });
});
