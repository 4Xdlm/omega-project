/**
 * OMEGA Memory System - Governance Module
 * Phase D5 - NASA-Grade L4
 *
 * Barrel export for governance functionality.
 */

// Sentinel
export {
  type Sentinel,
  SENTINEL_IMPLEMENTATION_STATUS,
  CURRENT_PHASE,
  createSentinel,
  createAuthorizationRequest,
  isAllowed,
  isDenied,
  isDeferred,
  assertSentinelNotImplemented,
  assertDenied,
} from './sentinel.js';

// Audit
export {
  type AuditLogger,
  createAuditEvent,
  createFileAuditLogger,
  createMemoryAuditLogger,
  createNoOpAuditLogger,
} from './audit.js';
