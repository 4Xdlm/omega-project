// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PROJECT — SAFE MODE MODULE
// Phase 12 — Industrial Deployment
// Standard: NASA-Grade L4 / DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS COVERED:
// - INV-SAFE-01: SAFE MODE true par défaut (via config)
// - INV-SAFE-02: 8 actions critiques refusées en SAFE MODE
// - INV-SAFE-03: Refus journalisé (action, role, reason, trace_id)
//
// LINKS TO PHASE 11:
// - INV-GOV-03: Human-in-the-loop obligatoire (8 actions)
// - INV-GOV-04: Fail-safe par défaut (6 actions interdites)
// - INV-TRACE-01: Toute décision critique tracée
//
// ═══════════════════════════════════════════════════════════════════════════════

import { randomUUID } from "node:crypto";

/**
 * Roles from Phase 11 governance (INV-GOV-01)
 */
export type OmegaRole = "USER" | "AUDITOR" | "ADMIN" | "ARCHITECT";

/**
 * Critical actions requiring Human-in-the-Loop (Phase 11 INV-GOV-03)
 * These are BLOCKED in SAFE MODE (INV-SAFE-02)
 */
export const HITL_ACTIONS = Object.freeze([
  "DELETE_PROJECT",
  "DELETE_RUN",
  "OVERRIDE_INVARIANT",
  "MODIFY_CANON",
  "BYPASS_TRUTH_GATE",
  "FORCE_VALIDATION",
  "EXPORT_SENSITIVE",
  "MODIFY_GOVERNANCE",
] as const);

export type HITLAction = typeof HITL_ACTIONS[number];

/**
 * Strictly forbidden actions (Phase 11 INV-GOV-04)
 * These are ALWAYS blocked, regardless of SAFE MODE
 */
export const FORBIDDEN_ACTIONS = Object.freeze([
  "DISABLE_LOGGING",
  "DISABLE_HASH_VERIFICATION",
  "MODIFY_FROZEN_INVARIANT",
  "BYPASS_ALL_GATES",
  "DELETE_AUDIT_TRAIL",
  "IMPERSONATE_ROLE",
] as const);

export type ForbiddenAction = typeof FORBIDDEN_ACTIONS[number];

/**
 * All critical actions (union of HITL and FORBIDDEN)
 */
export type CriticalAction = HITLAction | ForbiddenAction;

/**
 * Action check result status
 * Supports INV-HARD-04 (explicit states)
 */
export type ActionStatus = "ALLOWED" | "BLOCKED_SAFE_MODE" | "BLOCKED_FORBIDDEN" | "BLOCKED_PERMISSION";

/**
 * Refusal log entry structure (INV-SAFE-03)
 * Contains all required fields for forensic audit
 */
export interface RefusalLogEntry {
  /** Unique trace identifier */
  readonly trace_id: string;
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Action that was attempted */
  readonly action: string;
  /** Role of the requester */
  readonly role: OmegaRole;
  /** Reason for refusal */
  readonly reason: string;
  /** Status code */
  readonly status: ActionStatus;
  /** Whether SAFE MODE was active */
  readonly safe_mode_active: boolean;
  /** Additional context */
  readonly context?: Record<string, unknown>;
}

/**
 * Action check result
 */
export interface ActionCheckResult {
  /** Whether action is allowed */
  readonly allowed: boolean;
  /** Status of the check */
  readonly status: ActionStatus;
  /** Reason if blocked */
  readonly reason?: string;
  /** Refusal log entry if blocked */
  readonly refusal_log?: RefusalLogEntry;
}

/**
 * SAFE MODE controller
 * Manages action permissions based on SAFE MODE state
 */
export class SafeModeController {
  private readonly _safeModeEnabled: boolean;
  private readonly _refusalLogs: RefusalLogEntry[] = [];
  private readonly _timeProvider: () => string;
  private readonly _uuidProvider: () => string;

  /**
   * Create a new SafeModeController
   * 
   * @param safeModeEnabled - Whether SAFE MODE is active (INV-SAFE-01: must be true by default)
   * @param timeProvider - Optional time provider for deterministic testing
   * @param uuidProvider - Optional UUID provider for deterministic testing
   */
  constructor(
    safeModeEnabled: boolean,
    timeProvider?: () => string,
    uuidProvider?: () => string
  ) {
    this._safeModeEnabled = safeModeEnabled;
    this._timeProvider = timeProvider ?? (() => new Date().toISOString());
    this._uuidProvider = uuidProvider ?? (() => randomUUID());
  }

  /**
   * Check if SAFE MODE is enabled
   */
  get isSafeModeEnabled(): boolean {
    return this._safeModeEnabled;
  }

  /**
   * Get all refusal logs (for audit/forensic purposes)
   * Returns frozen copy to prevent tampering (INV-TRACE-02)
   */
  get refusalLogs(): readonly RefusalLogEntry[] {
    return Object.freeze([...this._refusalLogs]);
  }

  /**
   * Check if an action is allowed
   * 
   * @param action - The action to check
   * @param role - The role attempting the action
   * @param context - Optional context for logging
   * @returns ActionCheckResult with allowed status and reason
   * 
   * INVARIANTS:
   * - INV-SAFE-02: HITL actions blocked in SAFE MODE
   * - INV-SAFE-03: Refusals are logged
   * - INV-GOV-04: Forbidden actions always blocked
   */
  checkAction(
    action: string,
    role: OmegaRole,
    context?: Record<string, unknown>
  ): ActionCheckResult {
    const trace_id = this._uuidProvider();
    const timestamp = this._timeProvider();

    // Check 1: Forbidden actions are ALWAYS blocked (INV-GOV-04)
    if (this.isForbiddenAction(action)) {
      const refusal_log = this.createRefusalLog(
        trace_id,
        timestamp,
        action,
        role,
        "Action is strictly forbidden for all roles",
        "BLOCKED_FORBIDDEN",
        context
      );
      this._refusalLogs.push(refusal_log);

      return {
        allowed: false,
        status: "BLOCKED_FORBIDDEN",
        reason: refusal_log.reason,
        refusal_log,
      };
    }

    // Check 2: HITL actions blocked in SAFE MODE (INV-SAFE-02)
    if (this._safeModeEnabled && this.isHITLAction(action)) {
      const refusal_log = this.createRefusalLog(
        trace_id,
        timestamp,
        action,
        role,
        "Action requires human approval and is blocked in SAFE MODE",
        "BLOCKED_SAFE_MODE",
        context
      );
      this._refusalLogs.push(refusal_log);

      return {
        allowed: false,
        status: "BLOCKED_SAFE_MODE",
        reason: refusal_log.reason,
        refusal_log,
      };
    }

    // Action is allowed
    return {
      allowed: true,
      status: "ALLOWED",
    };
  }

  /**
   * Check if action is a HITL action
   */
  isHITLAction(action: string): action is HITLAction {
    return HITL_ACTIONS.includes(action as HITLAction);
  }

  /**
   * Check if action is a forbidden action
   */
  isForbiddenAction(action: string): action is ForbiddenAction {
    return FORBIDDEN_ACTIONS.includes(action as ForbiddenAction);
  }

  /**
   * Create a refusal log entry (INV-SAFE-03)
   */
  private createRefusalLog(
    trace_id: string,
    timestamp: string,
    action: string,
    role: OmegaRole,
    reason: string,
    status: ActionStatus,
    context?: Record<string, unknown>
  ): RefusalLogEntry {
    const entry: RefusalLogEntry = {
      trace_id,
      timestamp,
      action,
      role,
      reason,
      status,
      safe_mode_active: this._safeModeEnabled,
      ...(context && { context: Object.freeze({ ...context }) }),
    };

    return Object.freeze(entry);
  }

  /**
   * Export refusal logs for forensic audit (INV-TRACE-05)
   * Returns JSON string with all refusal entries
   */
  exportRefusalLogs(): string {
    return JSON.stringify(this._refusalLogs, null, 2);
  }

  /**
   * Get count of refusals by action
   */
  getRefusalCountByAction(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const log of this._refusalLogs) {
      counts[log.action] = (counts[log.action] ?? 0) + 1;
    }
    return Object.freeze(counts);
  }

  /**
   * Get count of refusals by status
   */
  getRefusalCountByStatus(): Record<ActionStatus, number> {
    const counts: Record<string, number> = {
      ALLOWED: 0,
      BLOCKED_SAFE_MODE: 0,
      BLOCKED_FORBIDDEN: 0,
      BLOCKED_PERMISSION: 0,
    };
    for (const log of this._refusalLogs) {
      counts[log.status] = (counts[log.status] ?? 0) + 1;
    }
    return Object.freeze(counts) as Record<ActionStatus, number>;
  }
}

/**
 * Create a SafeModeController with SAFE MODE enabled (default for Phase 12)
 * Convenience factory function
 */
export function createSafeModeController(
  timeProvider?: () => string,
  uuidProvider?: () => string
): SafeModeController {
  return new SafeModeController(true, timeProvider, uuidProvider);
}

/**
 * Validate that all required fields are present in a refusal log
 * Used for testing INV-SAFE-03
 */
export function validateRefusalLog(log: unknown): log is RefusalLogEntry {
  if (typeof log !== "object" || log === null) return false;
  
  const entry = log as Record<string, unknown>;
  
  return (
    typeof entry.trace_id === "string" &&
    typeof entry.timestamp === "string" &&
    typeof entry.action === "string" &&
    typeof entry.role === "string" &&
    typeof entry.reason === "string" &&
    typeof entry.status === "string" &&
    typeof entry.safe_mode_active === "boolean"
  );
}
