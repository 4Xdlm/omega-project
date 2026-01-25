/**
 * OMEGA Emotion Gate — Policy Manager Tests
 *
 * Tests for policy management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmotionPolicyManager,
  EmotionPolicyManager,
  DEFAULT_POLICY_RULES,
  DEFAULT_THRESHOLDS,
  ALL_VALIDATOR_IDS,
} from '../../src/policy/policy-manager.js';
import { DEFAULT_EMOTION_CALIBRATION } from '../../src/gate/types.js';
import {
  NEUTRAL_EMOTION,
  createTestFrame,
  createTestAxiom,
  resetFrameCounter,
} from '../helpers/test-fixtures.js';

describe('EmotionPolicyManager', () => {
  let manager: EmotionPolicyManager;

  beforeEach(() => {
    manager = createEmotionPolicyManager();
    resetFrameCounter();
  });

  describe('createPolicy', () => {
    it('should create policy with defaults', () => {
      const policy = manager.createPolicy('Test Policy');

      expect(policy).toBeDefined();
      expect(policy.policy_id).toMatch(/^epol_/);
      expect(policy.name).toBe('Test Policy');
      expect(policy.version).toBe('1.0.0');
    });

    it('should include all validators by default', () => {
      const policy = manager.createPolicy('Full Policy');

      for (const validatorId of ALL_VALIDATOR_IDS) {
        expect(policy.validators).toContain(validatorId);
      }
    });

    it('should use default rules', () => {
      const policy = manager.createPolicy('Default Rules Policy');

      expect(policy.rules).toEqual(DEFAULT_POLICY_RULES);
    });

    it('should use default thresholds', () => {
      const policy = manager.createPolicy('Default Thresholds Policy');

      expect(policy.thresholds).toEqual(DEFAULT_THRESHOLDS);
    });

    it('should compute policy hash', () => {
      const policy = manager.createPolicy('Hashed Policy');

      expect(policy.hash).toMatch(/^rh_/);
    });

    it('should create policy with custom validators', () => {
      const policy = manager.createPolicy('Custom Validators', ['eval_bounds', 'eval_stability'] as any);

      expect(policy.validators).toHaveLength(2);
      expect(policy.validators).toContain('eval_bounds');
      expect(policy.validators).toContain('eval_stability');
    });

    it('should create policy with custom rules', () => {
      const policy = manager.createPolicy(
        'Custom Rules',
        undefined,
        { ...DEFAULT_POLICY_RULES, fail_on_toxicity: false }
      );

      expect(policy.rules.fail_on_toxicity).toBe(false);
    });

    it('should create policy with custom thresholds', () => {
      const policy = manager.createPolicy(
        'Custom Thresholds',
        undefined,
        undefined,
        { ...DEFAULT_THRESHOLDS, stability_threshold: 0.5 }
      );

      expect(policy.thresholds.stability_threshold).toBe(0.5);
    });
  });

  describe('getPolicy', () => {
    it('should get policy by ID', () => {
      const created = manager.createPolicy('Get Test');
      const retrieved = manager.getPolicy(created.policy_id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.policy_id).toBe(created.policy_id);
    });

    it('should return undefined for unknown ID', () => {
      const retrieved = manager.getPolicy('epol_unknown');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllPolicies', () => {
    it('should return empty array initially', () => {
      expect(manager.getAllPolicies()).toHaveLength(0);
    });

    it('should return all created policies', () => {
      manager.createPolicy('Policy 1');
      manager.createPolicy('Policy 2');
      manager.createPolicy('Policy 3');

      expect(manager.getAllPolicies()).toHaveLength(3);
    });
  });

  describe('activePolicy', () => {
    it('should have no active policy initially', () => {
      expect(manager.getActivePolicy()).toBeNull();
    });

    it('should set active policy', () => {
      const policy = manager.createPolicy('Active Policy');
      const result = manager.setActivePolicy(policy.policy_id);

      expect(result).toBe(true);
      expect(manager.getActivePolicy()?.policy_id).toBe(policy.policy_id);
    });

    it('should return false for unknown policy', () => {
      const result = manager.setActivePolicy('epol_unknown');
      expect(result).toBe(false);
    });
  });

  describe('preset policies', () => {
    it('should create strict policy', () => {
      const policy = manager.createStrictPolicy();

      expect(policy.name).toBe('Strict Policy');
      expect(policy.rules.require_all_pass).toBe(true);
      expect(policy.rules.allow_defer).toBe(false);
      expect(policy.rules.fail_on_drift_above_threshold).toBe(true);
      expect(policy.thresholds.stability_threshold).toBe(0.15);
    });

    it('should create permissive policy', () => {
      const policy = manager.createPermissivePolicy();

      expect(policy.name).toBe('Permissive Policy');
      expect(policy.validators).toHaveLength(1);
      expect(policy.validators).toContain('eval_bounds');
      expect(policy.rules.fail_on_toxicity).toBe(false);
    });

    it('should create default policy', () => {
      const policy = manager.createDefaultPolicy();

      expect(policy.name).toBe('Default Policy');
      expect(policy.validators).toHaveLength(8);
    });
  });

  describe('createContext', () => {
    it('should create context with policy', () => {
      const policy = manager.createDefaultPolicy();
      const context = manager.createContext(policy);

      expect(context.policy).toBe(policy);
      expect(context.calibration).toEqual(DEFAULT_EMOTION_CALIBRATION);
      expect(context.axioms).toHaveLength(0);
    });

    it('should create context with custom calibration', () => {
      const policy = manager.createDefaultPolicy();
      const customCalibration = { ...DEFAULT_EMOTION_CALIBRATION };
      const context = manager.createContext(policy, customCalibration);

      expect(context.calibration).toEqual(customCalibration);
    });

    it('should create context with axioms', () => {
      const policy = manager.createDefaultPolicy();
      const axioms = [createTestAxiom('joy < 0.5', ['joy'])];
      const context = manager.createContext(policy, undefined, axioms);

      expect(context.axioms).toHaveLength(1);
    });

    it('should create context with previous frame', () => {
      const policy = manager.createDefaultPolicy();
      const previousFrame = createTestFrame(NEUTRAL_EMOTION);
      const context = manager.createContext(
        policy,
        undefined,
        undefined,
        undefined,
        previousFrame
      );

      expect(context.previous_frame).toBe(previousFrame);
    });
  });

  describe('verifyPolicyHash', () => {
    it('should verify valid policy hash', () => {
      const policy = manager.createPolicy('Verified Policy');
      const isValid = manager.verifyPolicyHash(policy);

      expect(isValid).toBe(true);
    });

    it('should detect tampered policy', () => {
      const policy = manager.createPolicy('Tampered Policy');
      // Change a field that affects the hash (validators, rules, thresholds)
      const tampered = {
        ...policy,
        thresholds: { ...policy.thresholds, stability_threshold: 0.99 }
      };
      const isValid = manager.verifyPolicyHash(tampered);

      expect(isValid).toBe(false);
    });
  });

  describe('upgradePolicy', () => {
    it('should upgrade policy version', () => {
      const original = manager.createPolicy('Original Policy');
      const upgraded = manager.upgradePolicy(original.policy_id, '2.0.0', {});

      expect(upgraded).toBeDefined();
      expect(upgraded?.version).toBe('2.0.0');
      expect(upgraded?.policy_id).not.toBe(original.policy_id);
    });

    it('should upgrade with new validators', () => {
      const original = manager.createPolicy('To Upgrade');
      const upgraded = manager.upgradePolicy(original.policy_id, '2.0.0', {
        validators: ['eval_bounds', 'eval_stability'] as any,
      });

      expect(upgraded?.validators).toHaveLength(2);
    });

    it('should upgrade with new rules', () => {
      const original = manager.createPolicy('To Upgrade Rules');
      const upgraded = manager.upgradePolicy(original.policy_id, '2.0.0', {
        rules: { fail_on_toxicity: false },
      });

      expect(upgraded?.rules.fail_on_toxicity).toBe(false);
      expect(upgraded?.rules.require_all_pass).toBe(true); // Unchanged
    });

    it('should return undefined for unknown policy', () => {
      const upgraded = manager.upgradePolicy('epol_unknown', '2.0.0', {});
      expect(upgraded).toBeUndefined();
    });
  });

  describe('export/import', () => {
    it('should export to JSON', () => {
      manager.createPolicy('Policy 1');
      manager.createPolicy('Policy 2');

      const json = manager.exportToJSON();
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.policies).toHaveLength(2);
    });

    it('should export active policy ID', () => {
      const policy = manager.createPolicy('Active');
      manager.setActivePolicy(policy.policy_id);

      const json = manager.exportToJSON();
      const parsed = JSON.parse(json);

      expect(parsed.active_policy_id).toBe(policy.policy_id);
    });

    it('should import from JSON', () => {
      manager.createPolicy('Policy A');
      manager.createPolicy('Policy B');

      const json = manager.exportToJSON();
      const imported = EmotionPolicyManager.importFromJSON(json);

      expect(imported.getAllPolicies()).toHaveLength(2);
    });

    it('should restore active policy on import', () => {
      const policy = manager.createPolicy('Active Import');
      manager.setActivePolicy(policy.policy_id);

      const json = manager.exportToJSON();
      const imported = EmotionPolicyManager.importFromJSON(json);

      expect(imported.getActivePolicy()?.policy_id).toBe(policy.policy_id);
    });
  });
});

describe('DEFAULT_POLICY_RULES', () => {
  it('should have all required properties', () => {
    expect(DEFAULT_POLICY_RULES.require_all_pass).toBeDefined();
    expect(DEFAULT_POLICY_RULES.allow_defer).toBeDefined();
    expect(DEFAULT_POLICY_RULES.fail_on_toxicity).toBeDefined();
    expect(DEFAULT_POLICY_RULES.fail_on_drift_above_threshold).toBeDefined();
    expect(DEFAULT_POLICY_RULES.require_causality_for_changes).toBeDefined();
  });
});

describe('DEFAULT_THRESHOLDS', () => {
  it('should have all required thresholds', () => {
    expect(DEFAULT_THRESHOLDS.stability_threshold).toBeDefined();
    expect(DEFAULT_THRESHOLDS.delta_max).toBeDefined();
    expect(DEFAULT_THRESHOLDS.amplification_cycles).toBeDefined();
    expect(DEFAULT_THRESHOLDS.toxicity_threshold).toBeDefined();
    expect(DEFAULT_THRESHOLDS.drift_threshold).toBeDefined();
  });

  it('should have valid threshold ranges', () => {
    expect(DEFAULT_THRESHOLDS.stability_threshold).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.stability_threshold).toBeLessThanOrEqual(1);
    expect(DEFAULT_THRESHOLDS.amplification_cycles).toBeGreaterThan(0);
  });
});

describe('ALL_VALIDATOR_IDS', () => {
  it('should have 8 validators', () => {
    expect(ALL_VALIDATOR_IDS).toHaveLength(8);
  });

  it('should contain all validator IDs', () => {
    const expected = [
      'eval_bounds',
      'eval_stability',
      'eval_causality',
      'eval_amplification',
      'eval_axiom_compat',
      'eval_drift_vector',
      'eval_toxicity',
      'eval_coherence',
    ];
    for (const id of expected) {
      expect(ALL_VALIDATOR_IDS).toContain(id);
    }
  });
});
