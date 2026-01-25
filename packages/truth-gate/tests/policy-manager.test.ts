/**
 * OMEGA Truth Gate — Policy Manager Tests
 *
 * Tests for policy management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyManager, createPolicyManager, createDefaultPolicy } from '../src/policy/policy-manager.js';
import { DEFAULT_POLICY_RULES } from '../src/policy/types.js';
import type { ValidatorId, PolicyId } from '../src/gate/types.js';

describe('PolicyManager', () => {
  let manager: PolicyManager;

  beforeEach(() => {
    manager = new PolicyManager();
  });

  describe('createPolicy', () => {
    it('should create policy with default rules', () => {
      const policy = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-TEST' as ValidatorId],
        rules: {},
      });

      expect(policy.policy_id).toMatch(/^P-TEST-v1\.0\.0$/);
      expect(policy.version).toBe('1.0.0');
      expect(policy.validators_enabled).toContain('V-TEST');
      expect(policy.rules).toEqual(expect.objectContaining(DEFAULT_POLICY_RULES));
    });

    it('should create policy with custom rules', () => {
      const policy = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-TEST' as ValidatorId],
        rules: {
          max_drift_score: 0.5,
          max_toxicity_score: 0.2,
        },
      });

      expect(policy.rules.max_drift_score).toBe(0.5);
      expect(policy.rules.max_toxicity_score).toBe(0.2);
    });

    it('should generate deterministic policy ID', () => {
      const policy = manager.createPolicy({
        name: 'My-Policy',
        version: '2.0.0',
        validators_enabled: [],
        rules: {},
      });

      expect(policy.policy_id).toBe('P-MY-POLICY-v2.0.0');
    });

    it('should compute policy hash', () => {
      const policy = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-TEST' as ValidatorId],
        rules: {},
      });

      expect(policy.hash).toBeDefined();
      expect(policy.hash.length).toBeGreaterThan(0);
    });

    it('should throw on duplicate policy ID', () => {
      manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: [],
        rules: {},
      });

      expect(() => manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: [],
        rules: {},
      })).toThrow('already exists');
    });

    it('should set created_at timestamp', () => {
      const before = Date.now();
      const policy = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: [],
        rules: {},
      });
      const after = Date.now();

      expect(policy.created_at).toBeGreaterThanOrEqual(before);
      expect(policy.created_at).toBeLessThanOrEqual(after);
    });
  });

  describe('getPolicy', () => {
    it('should return policy by ID', () => {
      const created = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: [],
        rules: {},
      });

      const retrieved = manager.getPolicy(created.policy_id);
      expect(retrieved).toBe(created);
    });

    it('should return undefined for unknown ID', () => {
      expect(manager.getPolicy('P-UNKNOWN-v1' as PolicyId)).toBeUndefined();
    });
  });

  describe('hasPolicy', () => {
    it('should return true for existing policy', () => {
      const policy = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: [],
        rules: {},
      });

      expect(manager.hasPolicy(policy.policy_id)).toBe(true);
    });

    it('should return false for non-existent policy', () => {
      expect(manager.hasPolicy('P-UNKNOWN-v1' as PolicyId)).toBe(false);
    });
  });

  describe('getAllPolicies', () => {
    it('should return all policies', () => {
      manager.createPolicy({ name: 'A', version: '1.0', validators_enabled: [], rules: {} });
      manager.createPolicy({ name: 'B', version: '1.0', validators_enabled: [], rules: {} });
      manager.createPolicy({ name: 'C', version: '1.0', validators_enabled: [], rules: {} });

      expect(manager.getAllPolicies()).toHaveLength(3);
    });

    it('should return empty array when no policies', () => {
      expect(manager.getAllPolicies()).toHaveLength(0);
    });
  });

  describe('getPolicyCount', () => {
    it('should return correct count', () => {
      expect(manager.getPolicyCount()).toBe(0);
      manager.createPolicy({ name: 'A', version: '1.0', validators_enabled: [], rules: {} });
      expect(manager.getPolicyCount()).toBe(1);
      manager.createPolicy({ name: 'B', version: '1.0', validators_enabled: [], rules: {} });
      expect(manager.getPolicyCount()).toBe(2);
    });
  });

  describe('activatePolicy', () => {
    it('should activate policy', () => {
      const policy = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: [],
        rules: {},
      });

      manager.activatePolicy(policy.policy_id, 'Initial activation');
      expect(manager.getActivePolicy()).toBe(policy);
    });

    it('should throw for non-existent policy', () => {
      expect(() => manager.activatePolicy('P-UNKNOWN-v1' as PolicyId, 'test'))
        .toThrow('not found');
    });

    it('should record activation in history', () => {
      const policy = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: [],
        rules: {},
      });

      manager.activatePolicy(policy.policy_id, 'Initial');
      const history = manager.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].policy).toBe(policy);
      expect(history[0].reason).toBe('Initial');
      expect(history[0].deactivated_at).toBeNull();
    });

    it('should deactivate previous policy when activating new', () => {
      const policy1 = manager.createPolicy({
        name: 'TEST1',
        version: '1.0.0',
        validators_enabled: [],
        rules: {},
      });
      const policy2 = manager.createPolicy({
        name: 'TEST2',
        version: '1.0.0',
        validators_enabled: [],
        rules: {},
      });

      manager.activatePolicy(policy1.policy_id, 'First');
      manager.activatePolicy(policy2.policy_id, 'Second');

      const history = manager.getHistory();
      expect(history[0].deactivated_at).not.toBeNull();
      expect(history[1].deactivated_at).toBeNull();
    });
  });

  describe('getActivePolicy', () => {
    it('should return null when no policy active', () => {
      expect(manager.getActivePolicy()).toBeNull();
    });

    it('should return active policy', () => {
      const policy = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: [],
        rules: {},
      });

      manager.activatePolicy(policy.policy_id, 'test');
      expect(manager.getActivePolicy()).toBe(policy);
    });
  });

  describe('getHistory', () => {
    it('should return full policy history', () => {
      const p1 = manager.createPolicy({ name: 'A', version: '1.0', validators_enabled: [], rules: {} });
      const p2 = manager.createPolicy({ name: 'B', version: '1.0', validators_enabled: [], rules: {} });
      const p3 = manager.createPolicy({ name: 'C', version: '1.0', validators_enabled: [], rules: {} });

      manager.activatePolicy(p1.policy_id, 'First');
      manager.activatePolicy(p2.policy_id, 'Second');
      manager.activatePolicy(p3.policy_id, 'Third');

      const history = manager.getHistory();
      expect(history).toHaveLength(3);
    });
  });

  describe('getPoliciesByVersion', () => {
    it('should filter by version pattern', () => {
      manager.createPolicy({ name: 'A', version: '1.0.0', validators_enabled: [], rules: {} });
      manager.createPolicy({ name: 'B', version: '1.0.1', validators_enabled: [], rules: {} });
      manager.createPolicy({ name: 'C', version: '2.0.0', validators_enabled: [], rules: {} });

      const v1Policies = manager.getPoliciesByVersion('1.0');
      expect(v1Policies).toHaveLength(2);

      const v2Policies = manager.getPoliciesByVersion('2.0');
      expect(v2Policies).toHaveLength(1);
    });
  });

  describe('verifyPolicyIntegrity', () => {
    it('should return true for valid policy', () => {
      const policy = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-TEST' as ValidatorId],
        rules: {},
      });

      expect(manager.verifyPolicyIntegrity(policy.policy_id)).toBe(true);
    });

    it('should return false for unknown policy', () => {
      expect(manager.verifyPolicyIntegrity('P-UNKNOWN-v1' as PolicyId)).toBe(false);
    });
  });

  describe('clonePolicy', () => {
    it('should clone policy with new version', () => {
      const original = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-A' as ValidatorId],
        rules: { max_drift_score: 0.5 },
      });

      const clone = manager.clonePolicy(original.policy_id, '2.0.0', {});

      expect(clone.version).toBe('2.0.0');
      expect(clone.validators_enabled).toEqual(original.validators_enabled);
      expect(clone.rules.max_drift_score).toBe(0.5);
    });

    it('should clone policy with modifications', () => {
      const original = manager.createPolicy({
        name: 'TEST',
        version: '1.0.0',
        validators_enabled: ['V-A' as ValidatorId],
        rules: {},
      });

      const clone = manager.clonePolicy(original.policy_id, '2.0.0', {
        validators_enabled: ['V-B' as ValidatorId, 'V-C' as ValidatorId],
        rules: { max_drift_score: 0.8 },
      });

      expect(clone.validators_enabled).toContain('V-B');
      expect(clone.validators_enabled).toContain('V-C');
      expect(clone.rules.max_drift_score).toBe(0.8);
    });

    it('should throw for non-existent source policy', () => {
      expect(() => manager.clonePolicy('P-UNKNOWN-v1' as PolicyId, '2.0.0', {}))
        .toThrow('not found');
    });
  });

  describe('createPolicyManager', () => {
    it('should create new manager instance', () => {
      const newManager = createPolicyManager();
      expect(newManager).toBeInstanceOf(PolicyManager);
      expect(newManager.getPolicyCount()).toBe(0);
    });
  });

  describe('createDefaultPolicy', () => {
    it('should create default policy with validators', () => {
      const validators: ValidatorId[] = ['V-A' as ValidatorId, 'V-B' as ValidatorId];
      const policy = createDefaultPolicy(validators);

      expect(policy.policy_id).toBe('P-DEFAULT-v1.0.0');
      expect(policy.validators_enabled).toEqual(validators);
      expect(policy.rules).toEqual(expect.objectContaining(DEFAULT_POLICY_RULES));
    });
  });
});
