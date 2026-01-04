/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Scoring Engine Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Test coverage for INV-RTR-01 (deterministic scoring) and INV-RTR-03 (constraints).
 * 
 * Total: 10 tests
 * 
 * @module router/tests/scoring_engine.test
 * @version 3.14.0
 */

import { describe, it, expect } from 'vitest';
import {
  estimateCost,
  estimateLatency,
  checkConstraints,
  scoreProviders,
  pickBest,
  getViableProviders,
  NoViableProviderError,
} from '../scoring_engine.js';
import type { ProviderRuntime, RouteContext, RouteConstraints } from '../types.js';
import { DEFAULT_HEALTH } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function mkRuntime(
  id: string,
  quality: 'FAST' | 'BALANCED' | 'QUALITY',
  latency: number,
  costIn: number,
  costOut: number,
  overrides?: Partial<{ tier: 'LOCAL' | 'CLOUD'; up: boolean; observed_latency_ms: number }>
): ProviderRuntime {
  return {
    static: {
      id,
      name: `Provider ${id}`,
      caps: {
        tier: overrides?.tier ?? 'CLOUD',
        quality,
        max_input_chars: 100000,
        max_output_tokens: 4096,
        supports_json: true,
        supports_tools: true,
        supports_streaming: true,
      },
      pricing: {
        cost_per_1k_in: costIn,
        cost_per_1k_out: costOut,
        daily_limit: 0,
      },
      baseline_latency_ms: latency,
      weight: 50,
    },
    health: {
      ...DEFAULT_HEALTH,
      up: overrides?.up ?? true,
      observed_latency_ms: overrides?.observed_latency_ms ?? 0,
    },
  };
}

function mkContext(overrides?: Partial<RouteContext>): RouteContext {
  return {
    request_id: 'test-1',
    text_chars: 1000,
    expected_out_tokens: 200,
    priority: 'NORMAL',
    sensitive: false,
    ...overrides,
  };
}

function mkConstraints(overrides?: Partial<RouteConstraints>): RouteConstraints {
  return {
    max_latency_ms: 500,
    max_cost_per_call: 1.0,
    min_quality: 'FAST',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Cost & Latency Estimation (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cost & Latency Estimation', () => {
  it('estimateCost is deterministic', () => {
    const provider = mkRuntime('A', 'BALANCED', 200, 0.01, 0.03);
    
    // 1000 chars / 4 = 250 tokens in
    // 200 tokens out
    // Cost = (250/1000) * 0.01 + (200/1000) * 0.03 = 0.0025 + 0.006 = 0.0085
    const cost = estimateCost(provider, 1000, 200);
    expect(cost).toBe(0.0085);
    
    // Same inputs = same output (determinism)
    expect(estimateCost(provider, 1000, 200)).toBe(cost);
  });
  
  it('estimateLatency uses observed or baseline', () => {
    const p1 = mkRuntime('A', 'BALANCED', 200, 0.01, 0.01);
    expect(estimateLatency(p1)).toBe(200); // baseline
    
    const p2 = mkRuntime('A', 'BALANCED', 200, 0.01, 0.01, { observed_latency_ms: 150 });
    expect(estimateLatency(p2)).toBe(150); // observed
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Constraint Checking - INV-RTR-03 (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Constraint Checking - INV-RTR-03', () => {
  it('checkConstraints passes valid provider', () => {
    const provider = mkRuntime('A', 'BALANCED', 200, 0.01, 0.01);
    const ctx = mkContext();
    const constraints = mkConstraints();
    
    const result = checkConstraints(provider, ctx, constraints, 200, 0.01);
    expect(result.ok).toBe(true);
  });
  
  it('checkConstraints rejects provider exceeding limits', () => {
    const provider = mkRuntime('A', 'BALANCED', 200, 0.01, 0.01);
    const ctx = mkContext();
    
    // Latency exceeded
    const r1 = checkConstraints(provider, ctx, mkConstraints({ max_latency_ms: 100 }), 200, 0.01);
    expect(r1.ok).toBe(false);
    expect(r1.reason).toBe('latency_cap_exceeded');
    
    // Cost exceeded
    const r2 = checkConstraints(provider, ctx, mkConstraints({ max_cost_per_call: 0.001 }), 200, 0.01);
    expect(r2.ok).toBe(false);
    expect(r2.reason).toBe('cost_cap_exceeded');
    
    // Quality not met
    const r3 = checkConstraints(
      mkRuntime('A', 'FAST', 200, 0.01, 0.01),
      ctx,
      mkConstraints({ min_quality: 'QUALITY' }),
      200, 0.01
    );
    expect(r3.ok).toBe(false);
    expect(r3.reason).toBe('min_quality not met');
  });
  
  it('checkConstraints rejects down provider', () => {
    const provider = mkRuntime('A', 'BALANCED', 200, 0.01, 0.01, { up: false });
    const result = checkConstraints(provider, mkContext(), mkConstraints(), 200, 0.01);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('provider_down');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Scoring - INV-RTR-01 (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring - INV-RTR-01', () => {
  it('scoreProviders is deterministic (same inputs = same order)', () => {
    const providers = [
      mkRuntime('B', 'BALANCED', 200, 0.01, 0.01),
      mkRuntime('A', 'BALANCED', 200, 0.01, 0.01),
      mkRuntime('C', 'QUALITY', 300, 0.02, 0.02),
    ];
    
    const scored1 = scoreProviders({ providers, ctx: mkContext(), constraints: mkConstraints() });
    const scored2 = scoreProviders({ providers, ctx: mkContext(), constraints: mkConstraints() });
    
    expect(scored1.map(s => s.provider.static.id)).toEqual(scored2.map(s => s.provider.static.id));
  });
  
  it('scoreProviders uses stable tie-break (id alphabetical)', () => {
    // Same quality, same everything - should use ID
    const providers = [
      mkRuntime('B', 'BALANCED', 200, 0.01, 0.01),
      mkRuntime('A', 'BALANCED', 200, 0.01, 0.01),
    ];
    
    const scored = scoreProviders({ providers, ctx: mkContext(), constraints: mkConstraints() });
    
    // Both have same score, so A should come before B (alphabetical)
    expect(scored[0].provider.static.id).toBe('A');
    expect(scored[1].provider.static.id).toBe('B');
  });
  
  it('scoreProviders prefers higher quality with matching priority', () => {
    const providers = [
      mkRuntime('FAST', 'FAST', 100, 0.001, 0.001),
      mkRuntime('QUALITY', 'QUALITY', 300, 0.02, 0.02),
    ];
    
    // QUALITY priority → prefer QUALITY provider
    const scored = scoreProviders({
      providers,
      ctx: mkContext({ priority: 'QUALITY' }),
      constraints: mkConstraints(),
    });
    
    const viable = getViableProviders(scored);
    expect(viable[0].provider.static.id).toBe('QUALITY');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Pick Best - INV-RTR-03 (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pick Best - INV-RTR-03', () => {
  it('pickBest returns best viable provider', () => {
    const providers = [
      mkRuntime('A', 'BALANCED', 200, 0.01, 0.01),
      mkRuntime('B', 'QUALITY', 300, 0.02, 0.02),
    ];
    
    const scored = scoreProviders({ providers, ctx: mkContext(), constraints: mkConstraints() });
    const best = pickBest(scored);
    
    expect(best.constraint_ok).toBe(true);
  });
  
  it('pickBest throws NoViableProviderError when no viable', () => {
    const providers = [
      mkRuntime('A', 'FAST', 1000, 10, 10), // Will exceed latency and cost
    ];
    
    const scored = scoreProviders({
      providers,
      ctx: mkContext(),
      constraints: mkConstraints({ max_latency_ms: 100, max_cost_per_call: 0.001 }),
    });
    
    expect(() => pickBest(scored)).toThrow(NoViableProviderError);
  });
});
