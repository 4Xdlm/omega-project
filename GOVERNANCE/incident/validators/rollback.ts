/**
 * PHASE J — ROLLBACK VALIDATOR
 * Specification: INCIDENT_PROCESS.md
 *
 * Validates rollback plans:
 * INV-J-06: Rollback requires human decision
 * INV-J-07: Rollback target must be verified stable
 */

import type { RollbackPlan } from '../types.js';
import { ROLLBACK_STATUSES, VERIFICATION_STATUSES } from '../types.js';

/**
 * Rollback validation result.
 */
export interface RollbackValidation {
  readonly valid: boolean;
  readonly human_decision_valid: boolean;
  readonly target_stable_valid: boolean;
  readonly execution_valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate rollback plan comprehensively.
 * @param rollback - Rollback plan to validate
 * @returns Validation result
 */
export function validateRollback(rollback: RollbackPlan): RollbackValidation {
  const errors: string[] = [];

  // INV-J-06: Human decision validation
  const humanDecisionValid = validateHumanDecision(rollback, errors);

  // INV-J-07: Target stability validation
  const targetStableValid = validateTargetStability(rollback, errors);

  // Execution validation
  const executionValid = validateExecution(rollback, errors);

  return {
    valid: errors.length === 0,
    human_decision_valid: humanDecisionValid,
    target_stable_valid: targetStableValid,
    execution_valid: executionValid,
    errors
  };
}

/**
 * Validate human decision requirement.
 * INV-J-06: Rollback requires human decision.
 */
function validateHumanDecision(rollback: RollbackPlan, errors: string[]): boolean {
  let valid = true;

  if (!rollback.human_decision.approver || rollback.human_decision.approver.trim() === '') {
    errors.push('INV-J-06: Rollback requires human approver identity');
    valid = false;
  }

  if (!rollback.human_decision.approver_role || rollback.human_decision.approver_role.trim() === '') {
    errors.push('INV-J-06: Rollback requires approver role');
    valid = false;
  }

  if (!rollback.human_decision.approved_at || rollback.human_decision.approved_at.trim() === '') {
    errors.push('INV-J-06: Rollback requires approval timestamp');
    valid = false;
  }

  if (!rollback.human_decision.rationale || rollback.human_decision.rationale.trim() === '') {
    errors.push('INV-J-06: Rollback requires documented rationale');
    valid = false;
  }

  // Rationale should be meaningful (minimum length)
  if (rollback.human_decision.rationale && rollback.human_decision.rationale.trim().length < 20) {
    errors.push('INV-J-06: Rollback rationale is too short (min 20 chars)');
    valid = false;
  }

  return valid;
}

/**
 * Validate target stability.
 * INV-J-07: Rollback target must be verified stable.
 */
function validateTargetStability(rollback: RollbackPlan, errors: string[]): boolean {
  let valid = true;

  if (!rollback.verification.target_was_stable) {
    errors.push('INV-J-07: Rollback target must be verified as stable');
    valid = false;
  }

  if (!rollback.verification.stability_evidence_ref || rollback.verification.stability_evidence_ref.trim() === '') {
    errors.push('INV-J-07: Stability evidence reference is required');
    valid = false;
  }

  if (!rollback.target_state.tag || rollback.target_state.tag.trim() === '') {
    errors.push('INV-J-07: Target state must have a tag (SEALED)');
    valid = false;
  }

  if (!rollback.target_state.last_known_good || rollback.target_state.last_known_good.trim() === '') {
    errors.push('INV-J-07: Target state last_known_good timestamp is required');
    valid = false;
  }

  // Verify tests are defined for post-rollback
  if (!rollback.verification.tests_to_run_post_rollback ||
      rollback.verification.tests_to_run_post_rollback.length === 0) {
    errors.push('INV-J-07: Post-rollback verification tests must be defined');
    valid = false;
  }

  return valid;
}

/**
 * Validate execution details.
 */
function validateExecution(rollback: RollbackPlan, errors: string[]): boolean {
  let valid = true;

  if (!ROLLBACK_STATUSES.includes(rollback.execution.status)) {
    errors.push(`Invalid execution status: ${rollback.execution.status}`);
    valid = false;
  }

  if (!rollback.execution.planned_at || rollback.execution.planned_at.trim() === '') {
    errors.push('Execution planned_at timestamp is required');
    valid = false;
  }

  // If completed or failed, executed_at is required
  if ((rollback.execution.status === 'completed' || rollback.execution.status === 'failed') &&
      !rollback.execution.executed_at) {
    errors.push('Execution executed_at timestamp is required for completed/failed rollbacks');
    valid = false;
  }

  // If completed, verification status should not be pending
  if (rollback.execution.status === 'completed' &&
      rollback.post_rollback.verification_status === 'pending') {
    errors.push('Completed rollback should have verification result');
    valid = false;
  }

  return valid;
}

/**
 * Check if rollback is safe to execute.
 * Pre-execution safety check.
 */
export function isRollbackSafe(rollback: RollbackPlan): {
  safe: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Must have human approval
  if (!rollback.human_decision.approver) {
    reasons.push('No human approval');
  }

  // Target must be verified stable
  if (!rollback.verification.target_was_stable) {
    reasons.push('Target not verified as stable');
  }

  // Must have tests defined
  if (!rollback.verification.tests_to_run_post_rollback?.length) {
    reasons.push('No post-rollback tests defined');
  }

  // Must have valid trigger
  if (!rollback.trigger.incident_id) {
    reasons.push('No triggering incident');
  }

  // Versions must be different
  if (rollback.current_state.version === rollback.target_state.version) {
    reasons.push('Current and target versions are identical');
  }

  return {
    safe: reasons.length === 0,
    reasons
  };
}

/**
 * Validate rollback post-execution.
 */
export function validateRollbackPostExecution(rollback: RollbackPlan): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (rollback.execution.status !== 'completed') {
    errors.push('Rollback is not completed');
    return { valid: false, errors };
  }

  if (rollback.post_rollback.verification_status !== 'passed') {
    errors.push(`Post-rollback verification: ${rollback.post_rollback.verification_status}`);
  }

  if (!rollback.post_rollback.verification_ref) {
    errors.push('Post-rollback verification reference is missing');
  }

  if (!rollback.post_rollback.services_restored?.length) {
    errors.push('No services marked as restored');
  }

  return { valid: errors.length === 0, errors };
}
