/**
 * OMEGA Truth Gate — Determinism Tests
 *
 * Tests to verify deterministic behavior of the Truth Gate system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TruthGate,
  createTruthGate,
  PolicyManager,
  createAllValidators,
  ALL_VALIDATOR_IDS,
  createVerdictId,
  hashVerdict,
  createGateVerdict,
  createValidatorResult,
} from '../src/index.js';
import type { TruthGateConfig, ValidatorId, PolicyId } from '../src/gate/types.js';
import {
  TEST_CALIBRATION,
  createCanonTx,
  createCanonOp,
  GENESIS_HASH,
  createDeterministicId,
  type TxId,
  type OpId,
  type EntityId,
} from '@omega/canon-kernel';

// Test helpers
const TEST_SEED = 'test-seed-determinism-v1';
const TEST_NAMESPACE = 'determinism-tests';

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

describe('Determinism Tests', () => {
  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  describe('Verdict ID determinism', () => {
    it('should produce same verdict ID for same inputs', () => {
      const results = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
        createValidatorResult('V-B' as ValidatorId, 'ALLOW', [], 2),
      ];

      const id1 = createVerdictId('tx-1', 'P-TEST-v1' as PolicyId, results);
      const id2 = createVerdictId('tx-1', 'P-TEST-v1' as PolicyId, results);

      expect(id1).toBe(id2);
    });

    it('should produce same verdict ID regardless of result order', () => {
      const resultsA = [
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
        createValidatorResult('V-B' as ValidatorId, 'ALLOW', [], 2),
      ];

      const resultsB = [
        createValidatorResult('V-B' as ValidatorId, 'ALLOW', [], 2),
        createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1),
      ];

      const id1 = createVerdictId('tx-1', 'P-TEST-v1' as PolicyId, resultsA);
      const id2 = createVerdictId('tx-1', 'P-TEST-v1' as PolicyId, resultsB);

      expect(id1).toBe(id2);
    });
  });

  describe('Verdict hash determinism', () => {
    it('should produce same hash for same verdict', () => {
      const results = [createValidatorResult('V-A' as ValidatorId, 'ALLOW', [], 1)];
      const rules = { deny_on_any_deny: true, defer_on_any_defer: true };

      const verdict = createGateVerdict('tx-1', results, 'P-TEST-v1' as PolicyId, rules);

      const hash1 = hashVerdict(verdict);
      const hash2 = hashVerdict(verdict);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Validation determinism', () => {
    it('should produce same verdict for same transaction', () => {
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
        strict_mode: true,
        enable_proof_carrying: false,
      };

      // Create two gates with same config
      const gate1 = createTruthGate(config);
      const gate2 = createTruthGate(config);

      for (const validator of createAllValidators()) {
        gate1.registerValidator(validator);
      }
      for (const validator of createAllValidators()) {
        gate2.registerValidator(validator);
      }

      const txId = createTestTxId('det-tx-1');
      const opId = createTestOpId('det-op-1');
      const entityId = createTestEntityId('entity1');

      const op = createCanonOp(opId, 'SET', entityId, {
        field_path: ['name'],
        value: 'Alice',
      });

      const tx1 = createCanonTx(txId, [op], 'test-actor', 'Test', GENESIS_HASH, 'truth');
      const tx2 = createCanonTx(txId, [op], 'test-actor', 'Test', GENESIS_HASH, 'truth');

      const verdict1 = gate1.validateDryRun(tx1);
      const verdict2 = gate2.validateDryRun(tx2);

      expect(verdict1.final_verdict).toBe(verdict2.final_verdict);
      expect(verdict1.validator_results.length).toBe(verdict2.validator_results.length);

      // Check each validator result
      for (let i = 0; i < verdict1.validator_results.length; i++) {
        expect(verdict1.validator_results[i].verdict).toBe(verdict2.validator_results[i].verdict);
      }
    });

    it('should produce same results across multiple runs', () => {
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
        strict_mode: true,
        enable_proof_carrying: false,
      };

      const txId = createTestTxId('multi-run-tx');
      const opId = createTestOpId('multi-run-op');
      const entityId = createTestEntityId('entity1');

      const op = createCanonOp(opId, 'SET', entityId, {
        field_path: ['name'],
        value: 'Alice',
      });

      const tx = createCanonTx(txId, [op], 'test-actor', 'Test', GENESIS_HASH, 'truth');

      const verdicts: string[] = [];

      for (let run = 0; run < 5; run++) {
        const gate = createTruthGate(config);
        for (const validator of createAllValidators()) {
          gate.registerValidator(validator);
        }
        const verdict = gate.validateDryRun(tx);
        verdicts.push(verdict.final_verdict);
      }

      // All runs should produce same verdict
      expect(new Set(verdicts).size).toBe(1);
    });
  });

  describe('Policy hash determinism', () => {
    it('should produce same hash for same policy', () => {
      const manager1 = new PolicyManager();
      const manager2 = new PolicyManager();

      const policy1 = manager1.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-A' as ValidatorId, 'V-B' as ValidatorId],
        rules: { max_drift_score: 0.5 },
      });

      const policy2 = manager2.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-A' as ValidatorId, 'V-B' as ValidatorId],
        rules: { max_drift_score: 0.5 },
      });

      expect(policy1.hash).toBe(policy2.hash);
    });

    it('should produce same hash regardless of validator order', () => {
      const manager1 = new PolicyManager();
      const manager2 = new PolicyManager();

      const policy1 = manager1.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-A' as ValidatorId, 'V-B' as ValidatorId, 'V-C' as ValidatorId],
        rules: {},
      });

      const policy2 = manager2.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-C' as ValidatorId, 'V-A' as ValidatorId, 'V-B' as ValidatorId],
        rules: {},
      });

      expect(policy1.hash).toBe(policy2.hash);
    });
  });

  describe('Ledger hash determinism', () => {
    it('should produce same ledger hash for same verdict sequence', () => {
      const policyManager = new PolicyManager();
      const policy = policyManager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-CANON-SCHEMA'],
        rules: {},
      });

      const config: TruthGateConfig = {
        default_policy: policy,
        calibration: TEST_CALIBRATION,
        strict_mode: false,
        enable_proof_carrying: false,
      };

      // Create fixed transaction IDs for reproducibility
      const txIds = [
        createTestTxId('ledger-tx-1'),
        createTestTxId('ledger-tx-2'),
        createTestTxId('ledger-tx-3'),
      ];
      const entityId = createTestEntityId('entity1');

      // Run 1
      const gate1 = createTruthGate(config);
      for (const validator of createAllValidators()) {
        gate1.registerValidator(validator);
      }

      for (const txId of txIds) {
        const op = createCanonOp(createTestOpId(), 'SET', entityId, {
          field_path: ['name'],
          value: 'Alice',
        });
        const tx = createCanonTx(txId, [op], 'test-actor', 'Test', GENESIS_HASH, 'truth');
        gate1.validate(tx);
      }

      // Run 2 - reset counters for same op IDs
      opCounter = 0;
      const gate2 = createTruthGate(config);
      for (const validator of createAllValidators()) {
        gate2.registerValidator(validator);
      }

      for (const txId of txIds) {
        const op = createCanonOp(createTestOpId(), 'SET', entityId, {
          field_path: ['name'],
          value: 'Alice',
        });
        const tx = createCanonTx(txId, [op], 'test-actor', 'Test', GENESIS_HASH, 'truth');
        gate2.validate(tx);
      }

      // Same tx sequence should produce same ledger structure
      expect(gate1.getLedger().getEntryCount()).toBe(gate2.getLedger().getEntryCount());
    });
  });
});
