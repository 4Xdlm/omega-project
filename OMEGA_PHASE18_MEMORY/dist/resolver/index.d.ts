/**
 * OMEGA CONFLICT_RESOLVER — Public API
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */
export { ConflictResolver, createConflictResolver } from './conflict-resolver.js';
export type { ClockFn } from './conflict-resolver.js';
export type { Conflict, ConflictParty, ConflictMetadata, ConflictResolution, DetectConflictInput, ResolveConflictInput, ConflictFilter, ResolverResult, ResolverError, ResolverMetrics, ResolutionAuditEntry, ConflictEvent, ConflictListener, } from './types.js';
export { ResolverErrorCode } from './types.js';
export { RESOLVER_VERSION, ConflictCategory, ConflictSeverity, ConflictStatus, ResolutionStrategy, ConflictFlag, SEVERITY_VALUES, RESOLVER_LIMITS, } from './constants.js';
//# sourceMappingURL=index.d.ts.map