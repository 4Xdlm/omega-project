/**
 * OMEGA Emotion Gate — Policy Manager
 *
 * Manages emotion validation policies.
 * Policies are versioned and hashed for auditability.
 */

import type {
  EmotionPolicy,
  EmotionPolicyId,
  EmotionPolicyRules,
  EmotionThresholds,
  EmotionValidatorId,
  EmotionCalibration,
  EmotionGateContext,
  Axiom,
  NarrativeContext,
  EmotionFrame,
} from '../gate/types.js';
import { DEFAULT_EMOTION_CALIBRATION } from '../gate/types.js';
import type { RootHash } from '@omega/canon-kernel';

/**
 * Compute hash for policy.
 */
function computePolicyHash(
  policyId: EmotionPolicyId,
  version: string,
  validators: readonly EmotionValidatorId[],
  rules: EmotionPolicyRules,
  thresholds: EmotionThresholds
): RootHash {
  const data = JSON.stringify({
    policy_id: policyId,
    version,
    validators: [...validators].sort(),
    rules,
    thresholds,
  });

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `rh_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * Default policy rules.
 */
export const DEFAULT_POLICY_RULES: EmotionPolicyRules = {
  require_all_pass: true,
  allow_defer: true,
  fail_on_toxicity: true,
  fail_on_drift_above_threshold: false,
  require_causality_for_changes: true,
};

/**
 * Default thresholds.
 */
export const DEFAULT_THRESHOLDS: EmotionThresholds = {
  stability_threshold: 0.2,
  delta_max: 0.4,
  amplification_cycles: 3,
  toxicity_threshold: 0.6,
  drift_threshold: 0.3,
};

/**
 * All validator IDs.
 */
export const ALL_VALIDATOR_IDS: readonly EmotionValidatorId[] = [
  'eval_bounds',
  'eval_stability',
  'eval_causality',
  'eval_amplification',
  'eval_axiom_compat',
  'eval_drift_vector',
  'eval_toxicity',
  'eval_coherence',
];

/**
 * EmotionPolicyManager — Policy management.
 *
 * Manages:
 * - Policy creation and versioning
 * - Policy storage and retrieval
 * - Context creation for validation
 */
export class EmotionPolicyManager {
  private policies: Map<EmotionPolicyId, EmotionPolicy> = new Map();
  private activePolicy: EmotionPolicy | null = null;

  /**
   * Create a new policy.
   */
  createPolicy(
    name: string,
    validators: readonly EmotionValidatorId[] = ALL_VALIDATOR_IDS,
    rules: EmotionPolicyRules = DEFAULT_POLICY_RULES,
    thresholds: EmotionThresholds = DEFAULT_THRESHOLDS
  ): EmotionPolicy {
    const policyId: EmotionPolicyId = `epol_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const version = '1.0.0';
    const hash = computePolicyHash(policyId, version, validators, rules, thresholds);

    const policy: EmotionPolicy = {
      policy_id: policyId,
      version,
      name,
      validators,
      rules,
      thresholds,
      hash,
    };

    this.policies.set(policyId, policy);
    return policy;
  }

  /**
   * Get policy by ID.
   */
  getPolicy(policyId: EmotionPolicyId): EmotionPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies.
   */
  getAllPolicies(): readonly EmotionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Set active policy.
   */
  setActivePolicy(policyId: EmotionPolicyId): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;
    this.activePolicy = policy;
    return true;
  }

  /**
   * Get active policy.
   */
  getActivePolicy(): EmotionPolicy | null {
    return this.activePolicy;
  }

  /**
   * Create a strict policy (all validators, all rules).
   */
  createStrictPolicy(): EmotionPolicy {
    return this.createPolicy(
      'Strict Policy',
      ALL_VALIDATOR_IDS,
      {
        require_all_pass: true,
        allow_defer: false,
        fail_on_toxicity: true,
        fail_on_drift_above_threshold: true,
        require_causality_for_changes: true,
      },
      {
        stability_threshold: 0.15,
        delta_max: 0.3,
        amplification_cycles: 2,
        toxicity_threshold: 0.4,
        drift_threshold: 0.2,
      }
    );
  }

  /**
   * Create a permissive policy (minimal validation).
   */
  createPermissivePolicy(): EmotionPolicy {
    return this.createPolicy(
      'Permissive Policy',
      ['eval_bounds'] as EmotionValidatorId[],
      {
        require_all_pass: true,
        allow_defer: true,
        fail_on_toxicity: false,
        fail_on_drift_above_threshold: false,
        require_causality_for_changes: false,
      },
      {
        stability_threshold: 0.5,
        delta_max: 0.8,
        amplification_cycles: 5,
        toxicity_threshold: 0.9,
        drift_threshold: 0.6,
      }
    );
  }

  /**
   * Create a default policy.
   */
  createDefaultPolicy(): EmotionPolicy {
    return this.createPolicy('Default Policy');
  }

  /**
   * Create context for validation.
   */
  createContext(
    policy: EmotionPolicy,
    calibration: EmotionCalibration = DEFAULT_EMOTION_CALIBRATION,
    axioms: readonly Axiom[] = [],
    narrativeContext?: NarrativeContext,
    previousFrame?: EmotionFrame,
    relatedEntities?: readonly string[]
  ): EmotionGateContext {
    return {
      policy,
      calibration,
      axioms,
      narrative_context: narrativeContext,
      previous_frame: previousFrame,
      related_entities: relatedEntities as any, // EntityId type
    };
  }

  /**
   * Verify policy hash.
   */
  verifyPolicyHash(policy: EmotionPolicy): boolean {
    const expectedHash = computePolicyHash(
      policy.policy_id,
      policy.version,
      policy.validators,
      policy.rules,
      policy.thresholds
    );
    return policy.hash === expectedHash;
  }

  /**
   * Clone and upgrade policy version.
   */
  upgradePolicy(
    policyId: EmotionPolicyId,
    newVersion: string,
    updates: Partial<{
      name: string;
      validators: readonly EmotionValidatorId[];
      rules: Partial<EmotionPolicyRules>;
      thresholds: Partial<EmotionThresholds>;
    }>
  ): EmotionPolicy | undefined {
    const existing = this.policies.get(policyId);
    if (!existing) return undefined;

    const newValidators = updates.validators ?? existing.validators;
    const newRules = { ...existing.rules, ...updates.rules };
    const newThresholds = { ...existing.thresholds, ...updates.thresholds };
    const newName = updates.name ?? `${existing.name} (v${newVersion})`;

    const newPolicyId: EmotionPolicyId = `epol_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const newHash = computePolicyHash(newPolicyId, newVersion, newValidators, newRules, newThresholds);

    const newPolicy: EmotionPolicy = {
      policy_id: newPolicyId,
      version: newVersion,
      name: newName,
      validators: newValidators,
      rules: newRules,
      thresholds: newThresholds,
      hash: newHash,
    };

    this.policies.set(newPolicyId, newPolicy);
    return newPolicy;
  }

  /**
   * Export policies to JSON.
   */
  exportToJSON(): string {
    return JSON.stringify({
      version: '1.0.0',
      policies: Array.from(this.policies.values()),
      active_policy_id: this.activePolicy?.policy_id ?? null,
      exported_at: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import policies from JSON.
   */
  static importFromJSON(json: string): EmotionPolicyManager {
    const data = JSON.parse(json);
    const manager = new EmotionPolicyManager();

    for (const policy of data.policies) {
      manager.policies.set(policy.policy_id, policy);
    }

    if (data.active_policy_id) {
      manager.setActivePolicy(data.active_policy_id);
    }

    return manager;
  }
}

/**
 * Create an EmotionPolicyManager instance.
 */
export function createEmotionPolicyManager(): EmotionPolicyManager {
  return new EmotionPolicyManager();
}
