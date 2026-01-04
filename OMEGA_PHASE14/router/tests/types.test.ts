/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Types Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for type utilities and constants.
 * 
 * Total: 4 tests
 * 
 * @module router/tests/types.test
 * @version 3.14.0
 */

import { describe, it, expect } from 'vitest';
import {
  QUALITY_RANK,
  PRIORITY_TO_QUALITY,
  meetsQuality,
  DEFAULT_HEALTH,
  DEFAULT_CONSTRAINTS,
} from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Quality Ranking (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Quality Ranking', () => {
  it('QUALITY_RANK has correct ordering', () => {
    expect(QUALITY_RANK.FAST).toBe(1);
    expect(QUALITY_RANK.BALANCED).toBe(2);
    expect(QUALITY_RANK.QUALITY).toBe(3);
    
    expect(QUALITY_RANK.FAST).toBeLessThan(QUALITY_RANK.BALANCED);
    expect(QUALITY_RANK.BALANCED).toBeLessThan(QUALITY_RANK.QUALITY);
  });
  
  it('meetsQuality checks minimum correctly', () => {
    // FAST accepts all
    expect(meetsQuality('FAST', 'FAST')).toBe(true);
    expect(meetsQuality('FAST', 'BALANCED')).toBe(true);
    expect(meetsQuality('FAST', 'QUALITY')).toBe(true);
    
    // BALANCED requires >= BALANCED
    expect(meetsQuality('BALANCED', 'FAST')).toBe(false);
    expect(meetsQuality('BALANCED', 'BALANCED')).toBe(true);
    expect(meetsQuality('BALANCED', 'QUALITY')).toBe(true);
    
    // QUALITY requires QUALITY
    expect(meetsQuality('QUALITY', 'FAST')).toBe(false);
    expect(meetsQuality('QUALITY', 'BALANCED')).toBe(false);
    expect(meetsQuality('QUALITY', 'QUALITY')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Defaults (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Defaults', () => {
  it('DEFAULT_HEALTH is properly initialized', () => {
    expect(DEFAULT_HEALTH.up).toBe(true);
    expect(DEFAULT_HEALTH.consecutive_failures).toBe(0);
    expect(DEFAULT_HEALTH.consecutive_successes).toBe(0);
    expect(DEFAULT_HEALTH.observed_latency_ms).toBe(0);
    expect(DEFAULT_HEALTH.daily_requests).toBe(0);
  });
  
  it('DEFAULT_CONSTRAINTS has reasonable values', () => {
    expect(DEFAULT_CONSTRAINTS.max_latency_ms).toBeGreaterThan(0);
    expect(DEFAULT_CONSTRAINTS.max_cost_per_call).toBeGreaterThan(0);
    expect(DEFAULT_CONSTRAINTS.min_quality).toBe('FAST');
  });
});
