/**
 * OMEGA Truth Gate — Policy Manager
 *
 * Manages versioned policy packs.
 * Policies are immutable once created.
 *
 * RULE: Policies are versioned and append-only.
 * RULE: Only one policy can be active at a time.
 */

import { canonicalize, sha256, type RootHash } from '@omega/canon-kernel';
import type { PolicyId, PolicyPack, PolicyRules, ValidatorId } from '../gate/types.js';
import type { PolicyInput, PolicyHistoryEntry } from './types.js';
import { DEFAULT_POLICY_RULES } from './types.js';

/**
 * PolicyManager — Manages versioned policies.
 */
export class PolicyManager {
  private readonly policies: Map<PolicyId, PolicyPack> = new Map();
  private readonly history: PolicyHistoryEntry[] = [];
  private activePolicy: PolicyPack | null = null;

  /**
   * Create a new policy.
   */
  createPolicy(input: PolicyInput): PolicyPack {
    const policy_id = this.generatePolicyId(input.name, input.version);

    if (this.policies.has(policy_id)) {
      throw new Error(`Policy already exists: ${policy_id}`);
    }

    const rules: PolicyRules = {
      ...DEFAULT_POLICY_RULES,
      ...input.rules,
    };

    const policy: PolicyPack = {
      policy_id,
      version: input.version,
      validators_enabled: input.validators_enabled,
      rules,
      created_at: Date.now(),
      hash: '' as RootHash, // Will be computed
    };

    // Compute hash
    const hash = this.computePolicyHash(policy);
    const finalPolicy: PolicyPack = { ...policy, hash };

    this.policies.set(policy_id, finalPolicy);

    return finalPolicy;
  }

  /**
   * Get policy by ID.
   */
  getPolicy(policy_id: PolicyId): PolicyPack | undefined {
    return this.policies.get(policy_id);
  }

  /**
   * Check if policy exists.
   */
  hasPolicy(policy_id: PolicyId): boolean {
    return this.policies.has(policy_id);
  }

  /**
   * Get all policies.
   */
  getAllPolicies(): readonly PolicyPack[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy count.
   */
  getPolicyCount(): number {
    return this.policies.size;
  }

  /**
   * Activate a policy.
   */
  activatePolicy(policy_id: PolicyId, reason: string): PolicyPack {
    const policy = this.policies.get(policy_id);

    if (!policy) {
      throw new Error(`Policy not found: ${policy_id}`);
    }

    // Deactivate current policy
    if (this.activePolicy) {
      const lastEntry = this.history[this.history.length - 1];
      if (lastEntry && lastEntry.deactivated_at === null) {
        this.history[this.history.length - 1] = {
          ...lastEntry,
          deactivated_at: Date.now(),
        };
      }
    }

    // Add to history
    this.history.push({
      policy,
      activated_at: Date.now(),
      deactivated_at: null,
      reason,
    });

    this.activePolicy = policy;

    return policy;
  }

  /**
   * Get active policy.
   */
  getActivePolicy(): PolicyPack | null {
    return this.activePolicy;
  }

  /**
   * Get policy history.
   */
  getHistory(): readonly PolicyHistoryEntry[] {
    return this.history;
  }

  /**
   * Get policies by version pattern.
   */
  getPoliciesByVersion(pattern: string): readonly PolicyPack[] {
    return Array.from(this.policies.values()).filter(p =>
      p.version.includes(pattern)
    );
  }

  /**
   * Verify policy integrity.
   */
  verifyPolicyIntegrity(policy_id: PolicyId): boolean {
    const policy = this.policies.get(policy_id);

    if (!policy) {
      return false;
    }

    const recomputed = this.computePolicyHash({ ...policy, hash: '' as RootHash });
    return recomputed === policy.hash;
  }

  /**
   * Clone a policy with modifications.
   */
  clonePolicy(
    source_policy_id: PolicyId,
    new_version: string,
    modifications: Partial<PolicyInput>
  ): PolicyPack {
    const source = this.policies.get(source_policy_id);

    if (!source) {
      throw new Error(`Source policy not found: ${source_policy_id}`);
    }

    return this.createPolicy({
      name: modifications.name || source_policy_id.replace('P-', '').replace(/-v.*/, ''),
      version: new_version,
      validators_enabled: modifications.validators_enabled || source.validators_enabled,
      rules: {
        ...source.rules,
        ...modifications.rules,
      },
    });
  }

  /**
   * Generate policy ID.
   */
  private generatePolicyId(name: string, version: string): PolicyId {
    const sanitized = name.toUpperCase().replace(/[^A-Z0-9]/g, '-');
    return `P-${sanitized}-v${version}` as PolicyId;
  }

  /**
   * Compute policy hash.
   */
  private computePolicyHash(policy: PolicyPack): RootHash {
    const sortedValidators = [...policy.validators_enabled].sort();

    const hashInput = canonicalize({
      policy_id: policy.policy_id,
      version: policy.version,
      validators_enabled: sortedValidators,
      rules: {
        require_all_validators: policy.rules.require_all_validators,
        defer_on_any_defer: policy.rules.defer_on_any_defer,
        deny_on_any_deny: policy.rules.deny_on_any_deny,
        max_drift_score: policy.rules.max_drift_score,
        max_toxicity_score: policy.rules.max_toxicity_score,
        allowed_schemas: [...policy.rules.allowed_schemas].sort(),
        blocked_patterns: [...policy.rules.blocked_patterns].sort(),
      },
    });

    return sha256(hashInput) as RootHash;
  }
}

/**
 * Create a policy manager.
 */
export function createPolicyManager(): PolicyManager {
  return new PolicyManager();
}

/**
 * Create a default policy pack.
 */
export function createDefaultPolicy(validators: readonly ValidatorId[]): PolicyPack {
  const manager = new PolicyManager();
  return manager.createPolicy({
    name: 'DEFAULT',
    version: '1.0.0',
    validators_enabled: validators,
    rules: DEFAULT_POLICY_RULES,
  });
}
