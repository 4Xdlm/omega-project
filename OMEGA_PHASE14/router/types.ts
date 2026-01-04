/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Router Types
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-grade type definitions for LLM Smart Router.
 * 
 * @module router/types
 * @version 3.14.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER IDENTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Unique provider identifier */
export type ProviderId = string;

/** Provider deployment tier */
export type ProviderTier = 'LOCAL' | 'CLOUD';

/** Provider quality level */
export type ProviderQuality = 'FAST' | 'BALANCED' | 'QUALITY';

/** Request priority */
export type RequestPriority = 'FAST' | 'NORMAL' | 'QUALITY';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER CAPABILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Provider capabilities (immutable) */
export interface ProviderCaps {
  readonly tier: ProviderTier;
  readonly quality: ProviderQuality;
  readonly max_input_chars: number;
  readonly max_output_tokens: number;
  readonly supports_json: boolean;
  readonly supports_tools: boolean;
  readonly supports_streaming: boolean;
}

/** Provider pricing model */
export interface ProviderPricing {
  /** Cost per 1k input tokens */
  readonly cost_per_1k_in: number;
  /** Cost per 1k output tokens */
  readonly cost_per_1k_out: number;
  /** Daily rate limit (0 = unlimited) */
  readonly daily_limit: number;
}

/** Static provider configuration (immutable after registration) */
export interface ProviderStatic {
  readonly id: ProviderId;
  readonly name: string;
  readonly caps: ProviderCaps;
  readonly pricing: ProviderPricing;
  /** Expected baseline latency in ms */
  readonly baseline_latency_ms: number;
  /** Weight for load balancing (1-100) */
  readonly weight: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER HEALTH & STATE
// ═══════════════════════════════════════════════════════════════════════════════

/** Provider health status */
export interface ProviderHealth {
  readonly up: boolean;
  readonly last_error_ts_ms: number;
  readonly last_success_ts_ms: number;
  readonly consecutive_failures: number;
  readonly consecutive_successes: number;
  /** Observed average latency (EMA) */
  readonly observed_latency_ms: number;
  /** Today's request count (for rate limiting) */
  readonly daily_requests: number;
  /** Day marker for daily reset */
  readonly daily_reset_day: number;
}

/** Default health for new providers */
export const DEFAULT_HEALTH: ProviderHealth = Object.freeze({
  up: true,
  last_error_ts_ms: 0,
  last_success_ts_ms: 0,
  consecutive_failures: 0,
  consecutive_successes: 0,
  observed_latency_ms: 0,
  daily_requests: 0,
  daily_reset_day: 0,
});

/** Provider runtime state (static + health) */
export interface ProviderRuntime {
  readonly static: ProviderStatic;
  readonly health: ProviderHealth;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════════

/** Circuit breaker state */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** Circuit breaker configuration */
export interface CircuitBreakerConfig {
  /** Failures before opening circuit */
  readonly failure_threshold: number;
  /** Successes in half-open to close */
  readonly success_threshold: number;
  /** Time before half-open (ms) */
  readonly reset_timeout_ms: number;
  /** Cooldown after marking down (ms) */
  readonly cooldown_ms: number;
}

/** Default circuit breaker config */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = Object.freeze({
  failure_threshold: 3,
  success_threshold: 2,
  reset_timeout_ms: 30000,
  cooldown_ms: 10000,
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-FLAP
// ═══════════════════════════════════════════════════════════════════════════════

/** Anti-flap configuration */
export interface AntiFlipConfig {
  /** Minimum time to stick with a provider (ms) */
  readonly sticky_duration_ms: number;
  /** Score difference required to switch */
  readonly switch_threshold: number;
  /** Maximum switches per time window */
  readonly max_switches: number;
  /** Time window for switch limit (ms) */
  readonly switch_window_ms: number;
}

/** Default anti-flap config */
export const DEFAULT_ANTI_FLAP_CONFIG: AntiFlipConfig = Object.freeze({
  sticky_duration_ms: 60000,
  switch_threshold: 50,
  max_switches: 3,
  switch_window_ms: 300000,
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING CONSTRAINTS & CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/** Routing constraints (caller-specified limits) */
export interface RouteConstraints {
  /** Maximum acceptable latency (ms) */
  readonly max_latency_ms: number;
  /** Maximum cost per call */
  readonly max_cost_per_call: number;
  /** Minimum quality level required */
  readonly min_quality: ProviderQuality;
  /** Require JSON output support */
  readonly require_json?: boolean;
  /** Require tool calling support */
  readonly require_tools?: boolean;
  /** Require streaming support */
  readonly require_streaming?: boolean;
  /** Force specific tier */
  readonly force_tier?: ProviderTier;
  /** Force specific provider (bypass routing) */
  readonly force_provider?: ProviderId;
}

/** Default constraints */
export const DEFAULT_CONSTRAINTS: RouteConstraints = Object.freeze({
  max_latency_ms: 30000,
  max_cost_per_call: 1.0,
  min_quality: 'FAST',
});

/** Request context for routing decision */
export interface RouteContext {
  /** Unique request ID for tracing */
  readonly request_id: string;
  /** Input text character count (deterministic) */
  readonly text_chars: number;
  /** Expected output tokens (estimate) */
  readonly expected_out_tokens: number;
  /** Request priority */
  readonly priority: RequestPriority;
  /** Contains sensitive data (prefer LOCAL) */
  readonly sensitive: boolean;
  /** Request category for sticky routing */
  readonly category?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/** Score breakdown for transparency */
export interface ScoreBreakdown {
  readonly quality_score: number;
  readonly priority_bonus: number;
  readonly tier_bonus: number;
  readonly latency_penalty: number;
  readonly cost_penalty: number;
  readonly health_bonus: number;
  readonly load_balance_bonus: number;
  readonly constraint_penalty: number;
}

/** Scored provider result */
export interface ScoredProvider {
  readonly provider: ProviderRuntime;
  readonly score: number;
  readonly breakdown: ScoreBreakdown;
  readonly estimated_latency_ms: number;
  readonly estimated_cost: number;
  readonly constraint_ok: boolean;
  readonly constraint_reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING DECISION
// ═══════════════════════════════════════════════════════════════════════════════

/** Final routing decision */
export interface RoutingDecision {
  readonly provider_id: ProviderId;
  readonly reason: string;
  readonly score: number;
  readonly score_breakdown: ScoreBreakdown;
  readonly estimated_latency_ms: number;
  readonly estimated_cost: number;
  readonly fallback_used: boolean;
  readonly sticky_applied: boolean;
  readonly alternatives_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimal audit interface for router */
export interface RouterAudit {
  append(event: RouterAuditEvent): void;
  getEvents(): RouterAuditEvent[];
}

/** Router audit event */
export interface RouterAuditEvent {
  readonly type: 'ROUTING';
  readonly action: 'ROUTE_DECISION' | 'ROUTE_FALLBACK' | 'CIRCUIT_OPEN' | 'CIRCUIT_CLOSE' | 'PROVIDER_DOWN' | 'PROVIDER_UP';
  readonly timestamp_ms: number;
  readonly data: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUALITY RANKING UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

/** Quality rank lookup (higher = better) */
export const QUALITY_RANK: Record<ProviderQuality, number> = {
  FAST: 1,
  BALANCED: 2,
  QUALITY: 3,
};

/** Check if provider meets minimum quality */
export function meetsQuality(required: ProviderQuality, actual: ProviderQuality): boolean {
  return QUALITY_RANK[actual] >= QUALITY_RANK[required];
}

/** Priority to quality mapping */
export const PRIORITY_TO_QUALITY: Record<RequestPriority, ProviderQuality> = {
  FAST: 'FAST',
  NORMAL: 'BALANCED',
  QUALITY: 'QUALITY',
};
