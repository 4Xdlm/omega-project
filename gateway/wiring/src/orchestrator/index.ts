// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — ORCHESTRATOR INDEX
// Version: 1.0.0
// Date: 06 janvier 2026
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Registry ─────────────────────────────────────────────────────────────────
export type {
  HandlerCapabilities,
  HandlerRegistration,
  ResolveResult,
} from './registry.js';

export {
  HandlerRegistry,
  RegistryErrorCodes,
  createHandlerRegistry,
} from './registry.js';

// ─── Chronicle ────────────────────────────────────────────────────────────────
export type {
  ChronicleEventType,
  ChronicleRecord,
  DispatchReceivedRecord,
  ValidationOkRecord,
  ValidationFailedRecord,
  PolicyOkRecord,
  PolicyRejectedRecord,
  ReplayOkRecord,
  ReplayRejectedRecord,
  HandlerResolvedRecord,
  HandlerNotFoundRecord,
  ExecutionStartRecord,
  ExecutionOkRecord,
  ExecutionErrorRecord,
  DispatchCompleteRecord,
  Chronicle,
} from './chronicle.js';

export {
  InMemoryChronicle,
  ChronicleWriter,
  createChronicle,
  createChronicleWriter,
} from './chronicle.js';

// ─── Replay Guard ─────────────────────────────────────────────────────────────
export type {
  ReplayStrategy,
  ReplayEntry,
  ReplayCheckResult,
  ReplayStore,
  ReplayGuardConfig,
} from './replay_guard.js';

export {
  ReplayGuard,
  InMemoryReplayStore,
  ReplayErrorCodes,
  createReplayGuard,
  createStrictReplayGuard,
  createIdempotentReplayGuard,
} from './replay_guard.js';

// ─── Orchestrator ─────────────────────────────────────────────────────────────
export type {
  CircuitState,
  CircuitBreakerConfig,
  OrchestratorConfig,
  DispatchResult,
} from './orchestrator.js';

export {
  Orchestrator,
  CircuitBreaker,
  OrchestratorErrorCodes,
  createOrchestrator,
} from './orchestrator.js';
