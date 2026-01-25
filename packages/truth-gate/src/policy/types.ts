/**
 * OMEGA Truth Gate — Policy Types
 *
 * Types for versioned policy management.
 */

import type { RootHash } from '@omega/canon-kernel';
import type { PolicyId, PolicyPack, PolicyRules, ValidatorId } from '../gate/types.js';

/**
 * Policy creation input.
 */
export interface PolicyInput {
  readonly name: string;
  readonly version: string;
  readonly validators_enabled: readonly ValidatorId[];
  readonly rules: Partial<PolicyRules>;
}

/**
 * Policy history entry.
 */
export interface PolicyHistoryEntry {
  readonly policy: PolicyPack;
  readonly activated_at: number;
  readonly deactivated_at: number | null;
  readonly reason: string;
}

/**
 * Default policy rules.
 */
export const DEFAULT_POLICY_RULES: PolicyRules = {
  require_all_validators: true,
  defer_on_any_defer: true,
  deny_on_any_deny: true,
  max_drift_score: 0.3,
  max_toxicity_score: 0.1,
  allowed_schemas: [],
  blocked_patterns: [],
};
