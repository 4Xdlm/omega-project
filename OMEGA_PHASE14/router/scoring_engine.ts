/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Scoring Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Deterministic scoring engine for provider selection.
 * INV-RTR-01: Same input + same state = same output.
 * 
 * @module router/scoring_engine
 * @version 3.14.0
 */

import type {
  ProviderRuntime,
  ProviderQuality,
  RouteConstraints,
  RouteContext,
  ScoredProvider,
  ScoreBreakdown,
} from './types.js';
import { QUALITY_RANK, meetsQuality, PRIORITY_TO_QUALITY } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING CONSTANTS (deterministic weights)
// ═══════════════════════════════════════════════════════════════════════════════

const WEIGHTS = {
  /** Base score per quality level */
  QUALITY_BASE: 100,
  /** Bonus when priority matches quality */
  PRIORITY_MATCH: 50,
  /** Bonus for LOCAL when sensitive */
  SENSITIVE_LOCAL: 80,
  /** Penalty for CLOUD when sensitive */
  SENSITIVE_CLOUD: -200,
  /** Latency penalty divisor (latency_ms / this = penalty) */
  LATENCY_DIVISOR: 10,
  /** Cost penalty multiplier */
  COST_MULTIPLIER: 100,
  /** Bonus per consecutive success (max 50) */
  HEALTH_SUCCESS_BONUS: 5,
  /** Penalty for constraint violation */
  CONSTRAINT_VIOLATION: -1000000,
  /** Load balance bonus range */
  LOAD_BALANCE_MAX: 20,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COST ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estimate cost for a request (deterministic)
 */
export function estimateCost(
  provider: ProviderRuntime,
  text_chars: number,
  expected_out_tokens: number
): number {
  // Deterministic token estimation: ~4 chars per token
  const in_tokens = Math.ceil(text_chars / 4);
  const out_tokens = expected_out_tokens;
  
  const pricing = provider.static.pricing;
  const cost = (in_tokens / 1000) * pricing.cost_per_1k_in
             + (out_tokens / 1000) * pricing.cost_per_1k_out;
  
  // Round to 6 decimal places for determinism
  return Math.round(cost * 1000000) / 1000000;
}

/**
 * Estimate latency (use observed if available, else baseline)
 */
export function estimateLatency(provider: ProviderRuntime): number {
  const health = provider.health;
  return health.observed_latency_ms > 0
    ? health.observed_latency_ms
    : provider.static.baseline_latency_ms;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRAINT CHECKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConstraintResult {
  ok: boolean;
  reason?: string;
}

/**
 * Check all constraints for a provider
 */
export function checkConstraints(
  provider: ProviderRuntime,
  ctx: RouteContext,
  constraints: RouteConstraints,
  estimated_latency_ms: number,
  estimated_cost: number
): ConstraintResult {
  const caps = provider.static.caps;
  
  // Hard constraints first
  if (ctx.text_chars > caps.max_input_chars) {
    return { ok: false, reason: 'max_input_chars exceeded' };
  }
  
  if (!meetsQuality(constraints.min_quality, caps.quality)) {
    return { ok: false, reason: 'min_quality not met' };
  }
  
  if (constraints.require_json && !caps.supports_json) {
    return { ok: false, reason: 'json_required' };
  }
  
  if (constraints.require_tools && !caps.supports_tools) {
    return { ok: false, reason: 'tools_required' };
  }
  
  if (constraints.require_streaming && !caps.supports_streaming) {
    return { ok: false, reason: 'streaming_required' };
  }
  
  if (constraints.force_tier && caps.tier !== constraints.force_tier) {
    return { ok: false, reason: `tier_mismatch (required: ${constraints.force_tier})` };
  }
  
  // Provider must be up
  if (!provider.health.up) {
    return { ok: false, reason: 'provider_down' };
  }
  
  // Soft constraints (estimates)
  if (estimated_latency_ms > constraints.max_latency_ms) {
    return { ok: false, reason: 'latency_cap_exceeded' };
  }
  
  if (estimated_cost > constraints.max_cost_per_call) {
    return { ok: false, reason: 'cost_cap_exceeded' };
  }
  
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING - INV-RTR-01
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate score breakdown for a provider (deterministic)
 */
export function calculateScoreBreakdown(
  provider: ProviderRuntime,
  ctx: RouteContext,
  constraints: RouteConstraints,
  estimated_latency_ms: number,
  estimated_cost: number,
  constraint_ok: boolean
): ScoreBreakdown {
  const caps = provider.static.caps;
  const health = provider.health;
  
  // Quality score
  const quality_score = QUALITY_RANK[caps.quality] * WEIGHTS.QUALITY_BASE;
  
  // Priority match bonus
  const ideal_quality = PRIORITY_TO_QUALITY[ctx.priority];
  const priority_bonus = caps.quality === ideal_quality ? WEIGHTS.PRIORITY_MATCH : 0;
  
  // Tier bonus (sensitive data handling)
  let tier_bonus = 0;
  if (ctx.sensitive) {
    tier_bonus = caps.tier === 'LOCAL'
      ? WEIGHTS.SENSITIVE_LOCAL
      : WEIGHTS.SENSITIVE_CLOUD;
  }
  
  // Latency penalty (deterministic)
  const latency_penalty = -Math.round(estimated_latency_ms / WEIGHTS.LATENCY_DIVISOR);
  
  // Cost penalty (deterministic)
  const cost_penalty = -Math.round(estimated_cost * WEIGHTS.COST_MULTIPLIER);
  
  // Health bonus (reward stable providers)
  const health_bonus = Math.min(
    health.consecutive_successes * WEIGHTS.HEALTH_SUCCESS_BONUS,
    50
  );
  
  // Load balance bonus (based on weight, deterministic)
  const load_balance_bonus = Math.round(
    (provider.static.weight / 100) * WEIGHTS.LOAD_BALANCE_MAX
  );
  
  // Constraint penalty
  const constraint_penalty = constraint_ok ? 0 : WEIGHTS.CONSTRAINT_VIOLATION;
  
  return Object.freeze({
    quality_score,
    priority_bonus,
    tier_bonus,
    latency_penalty,
    cost_penalty,
    health_bonus,
    load_balance_bonus,
    constraint_penalty,
  });
}

/**
 * Calculate total score from breakdown
 */
export function calculateTotalScore(breakdown: ScoreBreakdown): number {
  return breakdown.quality_score
       + breakdown.priority_bonus
       + breakdown.tier_bonus
       + breakdown.latency_penalty
       + breakdown.cost_penalty
       + breakdown.health_bonus
       + breakdown.load_balance_bonus
       + breakdown.constraint_penalty;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE PROVIDERS - INV-RTR-01
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Score all providers (deterministic)
 */
export function scoreProviders(params: {
  providers: ProviderRuntime[];
  ctx: RouteContext;
  constraints: RouteConstraints;
}): ScoredProvider[] {
  const { providers, ctx, constraints } = params;
  
  if (providers.length === 0) {
    return [];
  }
  
  const scored: ScoredProvider[] = [];
  
  for (const provider of providers) {
    const estimated_latency_ms = estimateLatency(provider);
    const estimated_cost = estimateCost(provider, ctx.text_chars, ctx.expected_out_tokens);
    
    const constraint = checkConstraints(
      provider, ctx, constraints,
      estimated_latency_ms, estimated_cost
    );
    
    const breakdown = calculateScoreBreakdown(
      provider, ctx, constraints,
      estimated_latency_ms, estimated_cost,
      constraint.ok
    );
    
    const score = calculateTotalScore(breakdown);
    
    scored.push(Object.freeze({
      provider,
      score,
      breakdown,
      estimated_latency_ms,
      estimated_cost,
      constraint_ok: constraint.ok,
      constraint_reason: constraint.reason,
    }));
  }
  
  // Stable sort: score DESC, then provider ID ASC (deterministic tie-break)
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.provider.static.id.localeCompare(b.provider.static.id);
  });
  
  return scored;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PICK BEST - INV-RTR-03
// ═══════════════════════════════════════════════════════════════════════════════

export class NoViableProviderError extends Error {
  constructor(
    message: string,
    public readonly reasons: string[]
  ) {
    super(message);
    this.name = 'NoViableProviderError';
  }
}

/**
 * Pick the best provider that satisfies constraints
 * @throws NoViableProviderError if no provider satisfies constraints
 */
export function pickBest(scored: ScoredProvider[]): ScoredProvider {
  if (scored.length === 0) {
    throw new NoViableProviderError('No providers registered', []);
  }
  
  const viable = scored.find(s => s.constraint_ok);
  
  if (!viable) {
    const reasons = scored.map(s =>
      `${s.provider.static.id}: ${s.constraint_reason ?? 'blocked'}`
    );
    throw new NoViableProviderError(
      `No provider satisfies constraints: ${reasons.join(' | ')}`,
      reasons
    );
  }
  
  return viable;
}

/**
 * Get all viable providers (for alternatives count)
 */
export function getViableProviders(scored: ScoredProvider[]): ScoredProvider[] {
  return scored.filter(s => s.constraint_ok);
}
