/**
 * OMEGA Truth Gate — Validators Tests
 *
 * Tests for all 7 validators.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VCanonSchemaValidator,
  VHashChainValidator,
  VRailSeparationValidator,
  VEmotionSSOTValidator,
  VNoMagicNumbersValidator,
  VPolicyLockValidator,
  VNarrativeDriftToxicityValidator,
  ALL_VALIDATOR_IDS,
  createAllValidators,
  createValidatorById,
} from '../src/validators/index.js';
import type { ValidationContext, PolicyPack, ValidatorId } from '../src/gate/types.js';
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
const TEST_SEED = 'test-seed-validators-v1';
const TEST_NAMESPACE = 'validator-tests';

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

// Helper for creating ops with raw entity IDs (for protected entity tests)
function createTestOpWithRawEntityId(rawEntityId: string, fieldPath: string[], value: unknown, type: 'SET' | 'PROMOTE' = 'SET'): CanonOp {
  return createCanonOp(createTestOpId(), type, rawEntityId as EntityId, {
    field_path: fieldPath,
    value,
  });
}

function createTestTx(
  ops: CanonOp[],
  rail: 'truth' | 'interpretation' = 'truth',
  parentHash: string = GENESIS_HASH
): CanonTx {
  return createCanonTx(createTestTxId(), ops, 'test-actor', 'Test transaction', parentHash, rail);
}

function createTestContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
  const defaultPolicy: PolicyPack = {
    policy_id: 'P-TEST-v1' as any,
    version: '1.0.0',
    validators_enabled: ALL_VALIDATOR_IDS,
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
    hash: 'test-hash' as any,
  };

  return {
    calibration: TEST_CALIBRATION,
    policy: defaultPolicy,
    ...overrides,
  };
}

describe('V-CANON-SCHEMA Validator', () => {
  const validator = new VCanonSchemaValidator();

  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  it('should have correct ID', () => {
    expect(validator.id).toBe('V-CANON-SCHEMA');
  });

  it('should ALLOW valid transaction', () => {
    const tx = createTestTx([createTestOp('entity1', ['field'], 'value')]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });

  it('should DENY transaction with invalid rail', () => {
    const op = createTestOp('entity1', ['field'], 'value');
    const tx = {
      tx_id: createTestTxId(),
      ops: [op],
      actor: 'test-actor',
      reason: 'Test',
      evidence_refs: [],
      rail: 'invalid' as any,
      parent_root_hash: GENESIS_HASH,
      timestamp: Date.now(),
    };

    const result = validator.validate(tx as any, createTestContext());
    expect(result.verdict).toBe('DENY');
    expect(result.evidence.some(e => e.type === 'schema_violation')).toBe(true);
  });

  it('should DENY transaction with missing parent_root_hash', () => {
    const op = createTestOp('entity1', ['field'], 'value');
    const tx = {
      tx_id: createTestTxId(),
      ops: [op],
      actor: 'test-actor',
      reason: 'Test',
      evidence_refs: [],
      rail: 'truth',
      parent_root_hash: '',
      timestamp: Date.now(),
    };

    const result = validator.validate(tx as any, createTestContext());
    expect(result.verdict).toBe('DENY');
  });

  it('should DENY transaction with invalid timestamp', () => {
    const op = createTestOp('entity1', ['field'], 'value');
    const tx = {
      tx_id: createTestTxId(),
      ops: [op],
      actor: 'test-actor',
      reason: 'Test',
      evidence_refs: [],
      rail: 'truth',
      parent_root_hash: GENESIS_HASH,
      timestamp: -1,
    };

    const result = validator.validate(tx as any, createTestContext());
    expect(result.verdict).toBe('DENY');
  });

  it('should check allowed schemas when specified', () => {
    const tx = createTestTx([createTestOp('blocked1', ['field'], 'value')]);

    const context = createTestContext({
      policy: {
        ...createTestContext().policy,
        rules: {
          ...createTestContext().policy.rules,
          allowed_schemas: ['allowed'],
        },
      },
    });

    const result = validator.validate(tx, context);
    expect(result.verdict).toBe('DENY');
  });
});

describe('V-HASH-CHAIN Validator', () => {
  const validator = new VHashChainValidator();

  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  it('should have correct ID', () => {
    expect(validator.id).toBe('V-HASH-CHAIN');
  });

  it('should ALLOW valid transaction', () => {
    const tx = createTestTx([createTestOp('entity1', ['field'], 'value')]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });

  it('should DENY transaction with missing parent_root_hash', () => {
    const op = createTestOp('entity1', ['field'], 'value');
    const tx = {
      tx_id: createTestTxId(),
      ops: [op],
      actor: 'test-actor',
      reason: 'Test',
      evidence_refs: [],
      rail: 'truth',
      parent_root_hash: '',
      timestamp: Date.now(),
    };

    const result = validator.validate(tx as any, createTestContext());
    expect(result.verdict).toBe('DENY');
    expect(result.evidence.some(e => e.type === 'hash_mismatch')).toBe(true);
  });

  it('should validate against store snapshot when provided', () => {
    const tx = createTestTx([createTestOp('entity1', ['field'], 'value')], 'truth', 'wrong-hash' as any);

    const context = createTestContext({
      store_snapshot: {
        truth_head_hash: GENESIS_HASH,
        interpretation_head_hash: GENESIS_HASH,
        entity_count: 0,
        getEntityFacts: () => new Map(),
      },
    });

    const result = validator.validate(tx, context);
    expect(result.verdict).toBe('DENY');
  });
});

describe('V-RAIL-SEPARATION Validator', () => {
  const validator = new VRailSeparationValidator();

  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  it('should have correct ID', () => {
    expect(validator.id).toBe('V-RAIL-SEPARATION');
  });

  it('should ALLOW valid truth rail transaction', () => {
    const tx = createTestTx([createTestOp('entity1', ['field'], 'value')], 'truth');
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });

  it('should ALLOW valid interpretation rail transaction', () => {
    const tx = createTestTx([createTestOp('entity1', ['field'], 'value')], 'interpretation');
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });

  it('should DENY PROMOTE on interpretation rail', () => {
    const tx = createTestTx([createTestOp('entity1', ['field'], 'value', 'PROMOTE')], 'interpretation');
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('DENY');
    expect(result.evidence.some(e => e.type === 'rail_violation')).toBe(true);
  });

  it('should DENY canonical modification on interpretation rail', () => {
    const tx = createTestTx([createTestOpWithRawEntityId('canon:1', ['field'], 'value')], 'interpretation');
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('DENY');
  });

  it('should DENY invalid rail type', () => {
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

    const result = validator.validate(tx as any, createTestContext());
    expect(result.verdict).toBe('DENY');
  });
});

describe('V-EMOTION-SSOT Validator', () => {
  const validator = new VEmotionSSOTValidator();

  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  it('should have correct ID', () => {
    expect(validator.id).toBe('V-EMOTION-SSOT');
  });

  it('should ALLOW transaction without emotion fields', () => {
    const tx = createTestTx([createTestOp('entity1', ['name'], 'John')]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });

  it('should ALLOW valid emotion update', () => {
    const tx = createTestTx([createTestOp('character1', ['emotion_primary'], 'joy')]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });

  it('should DENY conflicting emotion updates', () => {
    const ops = [
      createTestOp('character1', ['emotion'], 'joy'),
      createTestOp('character1', ['emotion'], 'sadness'),
    ];
    const tx = createTestTx(ops);

    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('DENY');
    expect(result.evidence.some(e => e.type === 'emotion_ssot_violation')).toBe(true);
  });

  it('should DENY emotion intensity out of range', () => {
    const tx = createTestTx([createTestOp('character1', ['emotion_intensity'], 1.5)]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('DENY');
  });
});

describe('V-NO-MAGIC-NUMBERS Validator', () => {
  const validator = new VNoMagicNumbersValidator();

  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  it('should have correct ID', () => {
    expect(validator.id).toBe('V-NO-MAGIC-NUMBERS');
  });

  it('should ALLOW transaction without magic numbers', () => {
    const tx = createTestTx([createTestOp('entity1', ['score'], 0.8)]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });

  it('should ALLOW safe numeric values', () => {
    const tx = createTestTx([createTestOp('entity1', ['count'], 5)]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });

  it('should warn on potential magic numbers', () => {
    const tx = createTestTx([createTestOp('entity1', ['threshold'], 42.5)]);
    const result = validator.validate(tx, createTestContext());
    // Warnings don't cause failure, but evidence is recorded
    expect(result.evidence.some(e => e.type === 'magic_number')).toBe(true);
  });

  it('should exempt index/count fields', () => {
    const tx = createTestTx([createTestOp('entity1', ['index'], 999)]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });
});

describe('V-POLICY-LOCK Validator', () => {
  const validator = new VPolicyLockValidator();

  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  it('should have correct ID', () => {
    expect(validator.id).toBe('V-POLICY-LOCK');
  });

  it('should ALLOW valid transaction', () => {
    const tx = createTestTx([createTestOp('entity1', ['field'], 'value')]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });

  it('should DENY transaction matching blocked pattern', () => {
    const tx = createTestTx([createTestOpWithRawEntityId('blocked_entity:1', ['field'], 'value')]);

    const context = createTestContext({
      policy: {
        ...createTestContext().policy,
        rules: {
          ...createTestContext().policy.rules,
          blocked_patterns: ['blocked_*'],
        },
      },
    });

    const result = validator.validate(tx, context);
    expect(result.verdict).toBe('DENY');
    expect(result.evidence.some(e => e.type === 'policy_violation')).toBe(true);
  });

  it('should DENY modification of protected entities', () => {
    const tx = createTestTx([createTestOpWithRawEntityId('policy:1', ['field'], 'value')]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('DENY');
  });

  it('should DENY modification of system entities', () => {
    const tx = createTestTx([createTestOpWithRawEntityId('system:config', ['setting'], 'value')]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('DENY');
  });

  it('should enforce allowed_schemas when specified', () => {
    const tx = createTestTx([createTestOp('blocked1', ['field'], 'value')]);

    const context = createTestContext({
      policy: {
        ...createTestContext().policy,
        rules: {
          ...createTestContext().policy.rules,
          allowed_schemas: ['entity', 'character'],
        },
      },
    });

    const result = validator.validate(tx, context);
    expect(result.verdict).toBe('DENY');
  });
});

describe('V-NARRATIVE-DRIFT-TOXICITY Validator', () => {
  const validator = new VNarrativeDriftToxicityValidator();

  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  it('should have correct ID', () => {
    expect(validator.id).toBe('V-NARRATIVE-DRIFT-TOXICITY');
  });

  it('should ALLOW clean transaction', () => {
    const tx = createTestTx([createTestOp('character1', ['name'], 'Alice')]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('ALLOW');
  });

  it('should DENY transaction with toxic content', () => {
    const tx = createTestTx([createTestOp('message1', ['content'], 'how to make a bomb')]);
    const result = validator.validate(tx, createTestContext());
    expect(result.verdict).toBe('DENY');
    expect(result.evidence.some(e => e.type === 'toxicity_detected')).toBe(true);
  });

  it('should detect narrative drift', () => {
    const previousTx = createTestTx([createTestOp('character1', ['alive'], true)]);
    const tx = createTestTx([createTestOp('character1', ['alive'], false)]);

    const context = createTestContext({
      previous_tx: previousTx,
    });

    const result = validator.validate(tx, context);
    // Drift is detected but may be DEFER or DENY depending on severity
    expect(result.evidence.some(e => e.type === 'drift_detected')).toBe(true);
  });
});

describe('Validator Factory Functions', () => {
  it('should list all 7 validator IDs', () => {
    expect(ALL_VALIDATOR_IDS).toHaveLength(7);
    expect(ALL_VALIDATOR_IDS).toContain('V-CANON-SCHEMA');
    expect(ALL_VALIDATOR_IDS).toContain('V-HASH-CHAIN');
    expect(ALL_VALIDATOR_IDS).toContain('V-RAIL-SEPARATION');
    expect(ALL_VALIDATOR_IDS).toContain('V-EMOTION-SSOT');
    expect(ALL_VALIDATOR_IDS).toContain('V-NO-MAGIC-NUMBERS');
    expect(ALL_VALIDATOR_IDS).toContain('V-POLICY-LOCK');
    expect(ALL_VALIDATOR_IDS).toContain('V-NARRATIVE-DRIFT-TOXICITY');
  });

  it('should create all validators', () => {
    const validators = createAllValidators();
    expect(validators).toHaveLength(7);
  });

  it('should create validator by ID', () => {
    const validator = createValidatorById('V-CANON-SCHEMA');
    expect(validator).toBeInstanceOf(VCanonSchemaValidator);
  });

  it('should return null for unknown validator ID', () => {
    const validator = createValidatorById('V-UNKNOWN' as ValidatorId);
    expect(validator).toBeNull();
  });
});
