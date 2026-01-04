/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Router Module
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-grade LLM Smart Router.
 * 
 * @module router
 * @version 3.14.0
 */

// Types
export type {
  ProviderId,
  ProviderTier,
  ProviderQuality,
  RequestPriority,
  ProviderCaps,
  ProviderPricing,
  ProviderStatic,
  ProviderHealth,
  ProviderRuntime,
  CircuitState,
  CircuitBreakerConfig,
  AntiFlipConfig,
  RouteConstraints,
  RouteContext,
  ScoreBreakdown,
  ScoredProvider,
  RoutingDecision,
  RouterAudit,
  RouterAuditEvent,
} from './types.js';

// Constants
export {
  DEFAULT_HEALTH,
  DEFAULT_CIRCUIT_CONFIG,
  DEFAULT_ANTI_FLAP_CONFIG,
  DEFAULT_CONSTRAINTS,
  QUALITY_RANK,
  PRIORITY_TO_QUALITY,
  meetsQuality,
} from './types.js';

// Provider Registry
export { ProviderRegistry, RegistryError, validateProvider } from './provider_registry.js';

// Scoring Engine
export {
  estimateCost,
  estimateLatency,
  checkConstraints,
  calculateScoreBreakdown,
  calculateTotalScore,
  scoreProviders,
  pickBest,
  getViableProviders,
  NoViableProviderError,
} from './scoring_engine.js';

// Anti-Flap
export { AntiFlipController } from './anti_flap.js';

// Circuit Breaker
export { CircuitBreaker } from './circuit_breaker.js';

// Smart Router
export { SmartRouter, createSmartRouter } from './smart_router.js';
export type { SmartRouterConfig } from './smart_router.js';

// Audit Mock (for testing)
export { MockAudit, createMockAudit } from './audit_mock.js';
