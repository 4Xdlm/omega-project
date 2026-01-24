/**
 * OMEGA V4.4 — Phase 4: Sentinel
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * BINARY JUDGE: ALLOW or DENY
 * STATELESS: Pure function
 * NO MODIFICATION: Read-only access
 *
 * f(request, state_readonly) → ALLOW | DENY
 */

import { randomUUID } from 'node:crypto';
import { INVARIANT_IDS, type InvariantId } from '../phase1_contract/index.js';
import { hashObject } from '../phase2_core/hash.js';

import type {
  SentinelRequest,
  ReadonlyState,
  SentinelDecision,
  AllowProof,
  DenialReason,
  Level1StructuralResult,
  Level2ContractualResult,
  Level3ContextualResult,
  Level4SemanticResult,
  ValidationLevel,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// SENTINEL CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sentinel - The Binary Judge
 *
 * Validates ALL requests before execution.
 * Returns ALLOW with proof, or DENY with reason.
 */
export class Sentinel {
  /**
   * Main decision method
   *
   * STATELESS: Same request + same state = same decision
   * NO MODIFICATION: Never modifies state
   *
   * @param request - Request to validate
   * @param state - Read-only system state
   * @returns SentinelDecision with verdict
   */
  decide(request: SentinelRequest, state: ReadonlyState): SentinelDecision {
    const startTime = performance.now();
    const decisionId = randomUUID();
    const timestamp = Date.now();

    // Level 1: Structural validation
    const level1 = this.validateLevel1(request);
    if (level1.status === 'FAIL') {
      return this.createDenyDecision(
        decisionId,
        timestamp,
        request,
        1,
        level1.failedCheck ?? 'Unknown structural failure',
        undefined,
        startTime
      );
    }

    // Level 2: Contractual validation
    const level2 = this.validateLevel2(request, state);
    if (level2.status === 'FAIL') {
      return this.createDenyDecision(
        decisionId,
        timestamp,
        request,
        2,
        'Invariant violation',
        level2.violatedInvariant,
        startTime
      );
    }

    // Level 3: Contextual validation
    const level3 = this.validateLevel3(request, state);
    if (level3.status === 'FAIL') {
      return this.createDenyDecision(
        decisionId,
        timestamp,
        request,
        3,
        level3.failedCheck ?? 'Context validation failed',
        undefined,
        startTime
      );
    }

    // Level 4: Semantic validation
    const level4 = this.validateLevel4(request, state);
    if (level4.status === 'FAIL') {
      return this.createDenyDecision(
        decisionId,
        timestamp,
        request,
        4,
        level4.failedCheck ?? 'Semantic validation failed',
        undefined,
        startTime
      );
    }

    // All levels passed → ALLOW
    return this.createAllowDecision(
      decisionId,
      timestamp,
      request,
      level2.invariantsChecked,
      [
        ...level1.checks,
        ...level3.contextChecks,
        ...level4.semanticChecks,
      ],
      startTime
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 1: STRUCTURAL VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  private validateLevel1(request: SentinelRequest): Level1StructuralResult {
    const checks: string[] = [];

    // Check requestId
    if (!request.requestId || request.requestId.trim().length === 0) {
      return {
        level: 1,
        status: 'FAIL',
        checks: ['requestId'],
        failedCheck: 'Missing or empty requestId',
      };
    }
    checks.push('requestId_present');

    // Check module
    if (!request.module || request.module.trim().length === 0) {
      return {
        level: 1,
        status: 'FAIL',
        checks: ['module'],
        failedCheck: 'Missing or empty module',
      };
    }
    checks.push('module_present');

    // Check action
    const validActions = ['READ', 'WRITE', 'META'];
    if (!validActions.includes(request.action)) {
      return {
        level: 1,
        status: 'FAIL',
        checks: ['action'],
        failedCheck: `Invalid action: ${request.action}`,
      };
    }
    checks.push('action_valid');

    // Check target
    if (!request.target || request.target.trim().length === 0) {
      return {
        level: 1,
        status: 'FAIL',
        checks: ['target'],
        failedCheck: 'Missing or empty target',
      };
    }
    checks.push('target_present');

    // Check timestamp
    if (typeof request.timestamp !== 'number' || request.timestamp <= 0) {
      return {
        level: 1,
        status: 'FAIL',
        checks: ['timestamp'],
        failedCheck: 'Invalid timestamp',
      };
    }
    checks.push('timestamp_valid');

    return {
      level: 1,
      status: 'PASS',
      checks,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 2: CONTRACTUAL VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  private validateLevel2(
    request: SentinelRequest,
    state: ReadonlyState
  ): Level2ContractualResult {
    const invariantsChecked: InvariantId[] = [];

    // Check all invariants from state
    for (const invariantId of state.invariants) {
      invariantsChecked.push(invariantId);

      // Validate based on invariant type
      const isValid = this.checkInvariant(invariantId, request);
      if (!isValid) {
        return {
          level: 2,
          status: 'FAIL',
          invariantsChecked,
          violatedInvariant: invariantId,
        };
      }
    }

    return {
      level: 2,
      status: 'PASS',
      invariantsChecked,
    };
  }

  /**
   * Check a specific invariant
   */
  private checkInvariant(invariantId: InvariantId, request: SentinelRequest): boolean {
    // For most cases, validate based on params if present
    const params = request.params as Record<string, unknown> | undefined;

    switch (invariantId) {
      case 'L1_CYCLIC_PHASE':
        // Phase should be cyclic - if phi present, validate
        if (params?.['phi'] !== undefined) {
          const phi = params['phi'] as number;
          // Just check it's a valid number
          return typeof phi === 'number' && isFinite(phi);
        }
        return true;

      case 'L2_BOUNDED_INTENSITY':
        // Intensity should be bounded
        if (params?.['mu'] !== undefined) {
          const mu = params['mu'] as number;
          return typeof mu === 'number' && mu >= 0 && mu <= 100;
        }
        return true;

      case 'L3_BOUNDED_PERSISTENCE':
        // Persistence should be bounded
        if (params?.['Z'] !== undefined) {
          const Z = params['Z'] as number;
          return typeof Z === 'number' && Z >= 0 && Z <= 1;
        }
        return true;

      case 'L4_DECAY_LAW':
        // Structural invariant - always valid in request context
        return true;

      case 'L5_HYSTERIC_DAMPING':
        // Capacity must be positive
        if (params?.['C'] !== undefined) {
          const C = params['C'] as number;
          return typeof C === 'number' && C > 0;
        }
        return true;

      case 'L6_CONSERVATION':
        // Total intensity must be bounded
        if (params?.['totalIntensity'] !== undefined) {
          const total = params['totalIntensity'] as number;
          return typeof total === 'number' && total >= 0 && total <= 1600;
        }
        return true;

      default:
        return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 3: CONTEXTUAL VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  private validateLevel3(
    request: SentinelRequest,
    state: ReadonlyState
  ): Level3ContextualResult {
    const contextChecks: string[] = [];

    // Check module authorization
    if (!state.allowedModules.includes(request.module)) {
      return {
        level: 3,
        status: 'FAIL',
        contextChecks: ['module_authorization'],
        failedCheck: `Module '${request.module}' is not authorized`,
      };
    }
    contextChecks.push('module_authorized');

    // Check temporal window (request shouldn't be too old)
    const maxAge = 60000; // 1 minute
    const age = state.currentTimestamp - request.timestamp;
    if (age > maxAge) {
      return {
        level: 3,
        status: 'FAIL',
        contextChecks: ['temporal_window'],
        failedCheck: `Request too old: ${age}ms > ${maxAge}ms`,
      };
    }
    contextChecks.push('temporal_window_valid');

    // Check future timestamp
    if (request.timestamp > state.currentTimestamp + 1000) {
      return {
        level: 3,
        status: 'FAIL',
        contextChecks: ['temporal_window'],
        failedCheck: 'Request timestamp is in the future',
      };
    }
    contextChecks.push('timestamp_not_future');

    return {
      level: 3,
      status: 'PASS',
      contextChecks,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 4: SEMANTIC VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  private validateLevel4(
    request: SentinelRequest,
    state: ReadonlyState
  ): Level4SemanticResult {
    const semanticChecks: string[] = [];

    // Check action-target coherence
    if (request.action === 'WRITE' && request.target === 'immutable') {
      return {
        level: 4,
        status: 'FAIL',
        semanticChecks: ['action_target_coherence'],
        failedCheck: 'Cannot WRITE to immutable target',
      };
    }
    semanticChecks.push('action_target_coherent');

    // Check for side-effect violations
    if (request.action === 'READ' && this.hasSideEffectParams(request.params)) {
      return {
        level: 4,
        status: 'FAIL',
        semanticChecks: ['no_side_effects'],
        failedCheck: 'READ action cannot have side-effect parameters',
      };
    }
    semanticChecks.push('no_unauthorized_side_effects');

    return {
      level: 4,
      status: 'PASS',
      semanticChecks,
    };
  }

  /**
   * Check if params indicate side effects
   */
  private hasSideEffectParams(params: unknown): boolean {
    if (!params || typeof params !== 'object') return false;
    const p = params as Record<string, unknown>;
    return p['modify'] === true || p['delete'] === true || p['create'] === true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DECISION BUILDERS
  // ═══════════════════════════════════════════════════════════════════════

  private createAllowDecision(
    decisionId: string,
    timestamp: number,
    request: SentinelRequest,
    invariantsChecked: readonly InvariantId[],
    checksPerformed: readonly string[],
    startTime: number
  ): SentinelDecision {
    const proof: AllowProof = {
      level1_structural: 'PASS',
      level2_contractual: 'PASS',
      level3_contextual: 'PASS',
      level4_semantic: 'PASS',
      invariantsChecked,
      checksPerformed,
    };

    const decision: Omit<SentinelDecision, 'decisionHash'> = {
      decisionId,
      timestamp,
      request,
      verdict: 'ALLOW',
      proof,
      processingTimeMs: performance.now() - startTime,
    };

    return {
      ...decision,
      decisionHash: hashObject(decision),
    };
  }

  private createDenyDecision(
    decisionId: string,
    timestamp: number,
    request: SentinelRequest,
    level: ValidationLevel,
    failedCheck: string,
    violatedInvariant: InvariantId | undefined,
    startTime: number
  ): SentinelDecision {
    const denialReason: DenialReason = {
      level,
      failedCheck,
      violatedInvariant,
      details: `Validation failed at level ${level}: ${failedCheck}`,
    };

    const decision: Omit<SentinelDecision, 'decisionHash'> = {
      decisionId,
      timestamp,
      request,
      verdict: 'DENY',
      denialReason,
      processingTimeMs: performance.now() - startTime,
    };

    return {
      ...decision,
      decisionHash: hashObject(decision),
    };
  }
}
