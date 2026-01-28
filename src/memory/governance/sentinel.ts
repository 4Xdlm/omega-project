/**
 * OMEGA Memory System - Sentinel Placeholder
 * Phase D5 - NASA-Grade L4
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   SENTINEL-PLACEHOLDER RULE (PHASE D)                                         ║
 * ║                                                                               ║
 * ║   Sentinel.authorize():                                                       ║
 * ║   - NE DÉCIDE JAMAIS                                                          ║
 * ║   - NE RETOURNE JAMAIS ALLOW en Phase D                                       ║
 * ║   - RETOURNE UNIQUEMENT DENY avec reason SENTINEL_NOT_IMPLEMENTED             ║
 * ║                                                                               ║
 * ║   INV-D5-01: Sentinel.authorize() retourne DENY                               ║
 * ║   INV-D5-02: Aucune écriture canonique possible                               ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  AuthorizationRequest,
  AuthorizationResponse,
  AuthorityVerdict,
  MemoryEntry,
  Timestamp,
} from '../types.js';
import { nowTimestamp } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SENTINEL STATUS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sentinel implementation status.
 * In Phase D, this is always NOT_IMPLEMENTED.
 */
export const SENTINEL_IMPLEMENTATION_STATUS = 'NOT_IMPLEMENTED' as const;

/**
 * Phase identifier.
 */
export const CURRENT_PHASE = 'D' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SENTINEL INTERFACE (STUB)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sentinel authority interface.
 * In Phase D, all methods return DENY.
 */
export interface Sentinel {
  /**
   * Authorize a write operation.
   * STUB: Always returns DENY in Phase D.
   */
  authorize(request: AuthorizationRequest): AuthorizationResponse;

  /**
   * Check if Sentinel is implemented.
   * Returns false in Phase D.
   */
  isImplemented(): boolean;

  /**
   * Get implementation status.
   */
  getStatus(): string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENTINEL IMPLEMENTATION (STUB - ALL DENY)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create Sentinel instance.
 *
 * In Phase D, this is a STUB that always denies.
 * Real implementation will be in Phase C.
 */
export function createSentinel(): Sentinel {
  return {
    authorize(request: AuthorizationRequest): AuthorizationResponse {
      // ALWAYS DENY in Phase D
      return {
        verdict: 'DENY',
        reason: 'SENTINEL_NOT_IMPLEMENTED',
        trace: `Phase ${CURRENT_PHASE}: Sentinel authorization not available. ` +
               `Requested action "${request.action}" by "${request.requestedBy}" denied. ` +
               `Entry ID: ${request.entry.id}`,
        respondedAt: nowTimestamp(),
      };
    },

    isImplemented(): boolean {
      return false;
    },

    getStatus(): string {
      return SENTINEL_IMPLEMENTATION_STATUS;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an authorization request.
 */
export function createAuthorizationRequest(
  entry: MemoryEntry,
  requestedBy: string
): AuthorizationRequest {
  return {
    action: 'APPEND',
    entry,
    requestedBy,
    requestedAt: nowTimestamp(),
  };
}

/**
 * Check if a response is ALLOW.
 * In Phase D, this always returns false.
 */
export function isAllowed(response: AuthorizationResponse): boolean {
  return response.verdict === 'ALLOW';
}

/**
 * Check if a response is DENY.
 */
export function isDenied(response: AuthorizationResponse): boolean {
  return response.verdict === 'DENY';
}

/**
 * Check if a response is DEFER.
 */
export function isDeferred(response: AuthorizationResponse): boolean {
  return response.verdict === 'DEFER';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE D ASSERTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assert that Sentinel is NOT implemented (Phase D invariant).
 * Throws if somehow Sentinel claims to be implemented.
 */
export function assertSentinelNotImplemented(sentinel: Sentinel): void {
  if (sentinel.isImplemented()) {
    throw new Error(
      'INVARIANT VIOLATION: Sentinel claims to be implemented in Phase D. ' +
      'This is a critical configuration error.'
    );
  }
}

/**
 * Assert that authorization was denied (Phase D invariant).
 * Throws if somehow an ALLOW response was generated.
 */
export function assertDenied(response: AuthorizationResponse): void {
  if (response.verdict !== 'DENY') {
    throw new Error(
      `INVARIANT VIOLATION: Sentinel returned "${response.verdict}" in Phase D. ` +
      'Only DENY is allowed. This is a critical security violation.'
    );
  }
}
