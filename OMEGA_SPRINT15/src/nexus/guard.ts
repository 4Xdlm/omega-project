/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — GUARD
 * Hard stops non contournables
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Guard Rules:
 * - GUARD-01: MUSE sans snapshot ORACLE → REJECT
 * - GUARD-02: ORACLE sans contexte minimal → REJECT
 * - GUARD-03: Payload > 2MB → REJECT
 * - GUARD-04: Version incompatible → REJECT
 * - GUARD-05: Caller non autorisé → REJECT
 * - GUARD-06: Session expirée → REJECT
 */

import {
  NexusRequest,
  NexusError,
  NexusErrorCode,
  GuardResult,
  GuardContext,
  GuardRuleId,
  MAX_PAYLOAD_SIZE,
  createNexusError,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// GUARD RULES DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

interface GuardRule {
  id: GuardRuleId;
  name: string;
  check: (request: NexusRequest, context: GuardContext) => boolean;
  errorCode: NexusErrorCode;
  errorMessage: string;
  recoverable: boolean;
}

/**
 * All guard rules in order of evaluation
 */
const GUARD_RULES: GuardRule[] = [
  // GUARD-01: MUSE sans snapshot ORACLE
  {
    id: 'GUARD-01',
    name: 'MUSE requires ORACLE snapshot',
    check: (request, context) => {
      if (request.module !== 'MUSE') return true;
      return context.has_oracle_snapshot;
    },
    errorCode: NexusErrorCode.MUSE_WITHOUT_ORACLE,
    errorMessage: 'MUSE module requires a valid ORACLE snapshot. Run ORACLE.analyze first.',
    recoverable: true,
  },
  
  // GUARD-02: ORACLE sans contexte minimal
  {
    id: 'GUARD-02',
    name: 'ORACLE requires minimal context',
    check: (request, _context) => {
      if (request.module !== 'ORACLE') return true;
      if (request.action !== 'analyze') return true;
      
      const payload = request.payload as Record<string, unknown> | null;
      if (!payload) return false;
      
      // Must have text field with content
      const text = payload.text;
      if (typeof text !== 'string') return false;
      if (text.trim().length < 10) return false;  // Minimum 10 chars
      
      return true;
    },
    errorCode: NexusErrorCode.ORACLE_NO_CONTEXT,
    errorMessage: 'ORACLE.analyze requires payload.text with at least 10 characters.',
    recoverable: true,
  },
  
  // GUARD-03: Payload > 2MB
  {
    id: 'GUARD-03',
    name: 'Payload size limit',
    check: (request, _context) => {
      const size = getPayloadSize(request.payload);
      return size <= MAX_PAYLOAD_SIZE;
    },
    errorCode: NexusErrorCode.PAYLOAD_TOO_LARGE,
    errorMessage: `Payload exceeds maximum size of ${MAX_PAYLOAD_SIZE} bytes (2MB).`,
    recoverable: false,
  },
  
  // GUARD-04: Version incompatible
  {
    id: 'GUARD-04',
    name: 'Version compatibility',
    check: (request, context) => {
      if (!request.version_pin) return true;  // No pin = accept any
      
      const availableVersion = context.module_versions[request.module];
      if (!availableVersion) return false;
      
      return isVersionCompatible(request.version_pin, availableVersion);
    },
    errorCode: NexusErrorCode.VERSION_INCOMPATIBLE,
    errorMessage: 'Requested module version is not compatible with available version.',
    recoverable: false,
  },
  
  // GUARD-05: Caller non autorisé
  {
    id: 'GUARD-05',
    name: 'Caller authorization',
    check: (request, context) => {
      return context.allowed_callers.includes(request.caller_id);
    },
    errorCode: NexusErrorCode.UNAUTHORIZED,
    errorMessage: 'Caller is not authorized for this session.',
    recoverable: false,
  },
  
  // GUARD-06: Session expirée
  {
    id: 'GUARD-06',
    name: 'Session validity',
    check: (_request, context) => {
      const now = new Date();
      const expiry = new Date(context.session_expiry);
      return now < expiry;
    },
    errorCode: NexusErrorCode.SESSION_EXPIRED,
    errorMessage: 'Session has expired. Please start a new session.',
    recoverable: false,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate payload size in bytes
 */
function getPayloadSize(payload: unknown): number {
  if (payload === undefined || payload === null) {
    return 0;
  }
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

/**
 * Check if requested version is compatible with available version
 * Uses semantic versioning: major must match, minor can be >= requested
 */
function isVersionCompatible(requested: string, available: string): boolean {
  const reqParts = requested.split('.').map(Number);
  const avaParts = available.split('.').map(Number);
  
  if (reqParts.length !== 3 || avaParts.length !== 3) {
    return false;
  }
  
  const [reqMajor, reqMinor, reqPatch] = reqParts;
  const [avaMajor, avaMinor, avaPatch] = avaParts;
  
  // Major version must match exactly
  if (reqMajor !== avaMajor) return false;
  
  // Available minor must be >= requested
  if (avaMinor < reqMinor) return false;
  
  // If minor matches, available patch must be >= requested
  if (avaMinor === reqMinor && avaPatch < reqPatch) return false;
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GUARD FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply all guard rules to a request
 * Returns on first failure (fail-fast)
 */
export function applyGuards(request: NexusRequest, context: GuardContext): GuardResult {
  for (const rule of GUARD_RULES) {
    const passed = rule.check(request, context);
    
    if (!passed) {
      return {
        passed: false,
        failed_rule: rule.id,
        error: createNexusError(
          rule.errorCode,
          rule.errorMessage,
          rule.recoverable,
          { rule_id: rule.id, rule_name: rule.name }
        ),
      };
    }
  }
  
  return { passed: true };
}

/**
 * Check a specific guard rule
 */
export function checkGuard(
  ruleId: GuardRuleId, 
  request: NexusRequest, 
  context: GuardContext
): boolean {
  const rule = GUARD_RULES.find(r => r.id === ruleId);
  if (!rule) {
    throw new Error(`Unknown guard rule: ${ruleId}`);
  }
  return rule.check(request, context);
}

/**
 * Get all guard rule IDs
 */
export function getGuardRuleIds(): GuardRuleId[] {
  return GUARD_RULES.map(r => r.id);
}

/**
 * Get guard rule by ID
 */
export function getGuardRule(ruleId: GuardRuleId): GuardRule | undefined {
  return GUARD_RULES.find(r => r.id === ruleId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a default guard context
 */
export function createDefaultContext(overrides?: Partial<GuardContext>): GuardContext {
  const now = new Date();
  const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);  // 24h from now
  
  return {
    has_oracle_snapshot: false,
    session_start: now.toISOString(),
    session_expiry: expiry.toISOString(),
    allowed_callers: ['UI', 'SAGA', 'CANON', 'API', 'INTERNAL'],
    module_versions: {
      PIPELINE: '3.12.0',
      ORACLE: '3.14.0',
      MUSE: '3.14.0',
    },
    ...overrides,
  };
}

/**
 * Create context with ORACLE snapshot
 */
export function createContextWithSnapshot(baseContext?: Partial<GuardContext>): GuardContext {
  // Extract has_oracle_snapshot from base (we'll override it anyway)
  const { has_oracle_snapshot: _, ...restOfBase } = baseContext ?? {};
  
  return createDefaultContext({
    ...restOfBase,
    has_oracle_snapshot: true,  // Always true for this function
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS FOR TESTING
// ═══════════════════════════════════════════════════════════════════════════════

export { isVersionCompatible, getPayloadSize };
