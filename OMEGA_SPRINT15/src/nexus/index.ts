/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — INDEX
 * Public exports for the Universal Authority Module
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Types
export * from './types';

// Validator
export {
  validate,
  validateL1,
  validateL2,
  validateL3,
  formatValidationErrors,
  getPrimaryErrorCode,
} from './validator';

// Guard
export {
  applyGuards,
  checkGuard,
  getGuardRuleIds,
  getGuardRule,
  createDefaultContext,
  createContextWithSnapshot,
  isVersionCompatible,
  getPayloadSize,
} from './guard';

// Router
export {
  route,
  isValidModule,
  isValidAction,
  getValidActions,
  getAdapterId,
  registerAdapter,
  resolveAdapter,
  hasAdapter,
  clearAdapters,
  formatRoute,
  parseRoute,
  verifyDeterminism,
} from './router';
export type { RoutingResult } from './router';

// Executor
export {
  execute,
  createMockAdapter,
  verifyExecutionDeterminism,
} from './executor';
export type { ExecutionResult } from './executor';

// Audit
export {
  computeHash,
  computeHashSync,
  createAuditEntry,
  createAuditSummary,
  validateAuditEntry,
  verifyAuditHash,
  freezeAuditEntry,
  isAuditFrozen,
  getNexusVersion,
  createDeterministicId,
} from './audit';

// Chronicle
export {
  Chronicle,
  getGlobalChronicle,
  resetGlobalChronicle,
} from './chronicle';

// Replay
export {
  replay,
  replayWithPayload,
  replayBatch,
  verifyReplayDeterminism,
  generateReplayReport,
} from './replay';
export type { ReplayReport } from './replay';

// Nexus (main facade)
export {
  Nexus,
  getGlobalNexus,
  resetGlobalNexus,
  nexusCall,
} from './nexus';
export type { NexusConfig, NexusStats } from './nexus';
