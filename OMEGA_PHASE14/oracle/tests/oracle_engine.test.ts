/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Oracle Engine Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Integration tests for OracleEngine covering all invariants.
 * 
 * Total: 10 tests
 * 
 * @module oracle/tests/oracle_engine.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OracleEngine,
  createOracleEngine,
  type OracleRouter,
  type OracleBridge,
  type OracleAudit,
} from '../oracle_engine.js';
import { EMOTION_V2_VERSION } from '../emotion_v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

function createMockRouter(): OracleRouter {
  return {
    route: vi.fn().mockReturnValue({
      provider_id: 'test-provider',
      estimated_latency_ms: 100,
      estimated_cost: 0.01,
    }),
    rerouteOnFailure: vi.fn().mockReturnValue({
      provider_id: 'fallback-provider',
    }),
    recordSuccess: vi.fn(),
  };
}

function createMockBridge(response?: string): OracleBridge {
  const defaultResponse = JSON.stringify({
    schema_version: EMOTION_V2_VERSION,
    trace_id: 'test',
    created_at_ms: 1000,
    signals: [{ channel: 'semantic', valence: -0.3, arousal: 0.6, confidence: 0.8 }],
    appraisal: {
      emotions: [{ label: 'fear', family: 'fear_family', weight: 1, polarity: -1 }],
      dominant: 'fear',
      ambiguity: 0,
      valence_aggregate: -0.3,
      arousal_aggregate: 0.6,
    },
    model: { provider_id: 'test-provider', model_name: 'test-model', latency_ms: 50 },
    rationale: 'Detected fear signals',
    input_hash: 'HASH',
    cached: false,
    calibrated: false,
  });
  
  return {
    call: vi.fn().mockResolvedValue(response ?? defaultResponse),
    isReady: vi.fn().mockReturnValue(true),
  };
}

function createMockAudit(): OracleAudit & { events: any[] } {
  const events: any[] = [];
  return {
    events,
    append: vi.fn((event) => events.push(event)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Oracle Engine', () => {
  let router: OracleRouter;
  let bridge: OracleBridge;
  let audit: OracleAudit & { events: any[] };
  let engine: OracleEngine;
  
  beforeEach(() => {
    router = createMockRouter();
    bridge = createMockBridge();
    audit = createMockAudit();
    engine = createOracleEngine(router, bridge, audit, {
      enable_cache: true,
      enable_calibration: true,
      enable_audit: true,
      enable_fallback: true,
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Basic Analysis (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Basic Analysis', () => {
    it('analyzes text and returns EmotionStateV2', async () => {
      const result = await engine.analyze({
        trace_id: 'test-1',
        text: 'I am scared of the dark.',
        now_ms: 1000,
      });
      
      expect(result.state.appraisal.dominant).toBe('fear');
      expect(result.provider_id).toBe('test-provider');
      expect(result.cached).toBe(false);
      expect(result.fallback).toBe(false);
    });
    
    it('validates input', async () => {
      await expect(engine.analyze({
        trace_id: '',
        text: 'test',
        now_ms: 1000,
      })).rejects.toThrow(/trace_id/);
      
      await expect(engine.analyze({
        trace_id: 'test',
        text: '',
        now_ms: 1000,
      })).rejects.toThrow(/empty/);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Router Integration - INV-ORC-08 (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Router Integration - INV-ORC-08', () => {
    it('uses router to select provider', async () => {
      await engine.analyze({
        trace_id: 'test',
        text: 'Test text',
        now_ms: 1000,
      });
      
      expect(router.route).toHaveBeenCalled();
      const routeCall = (router.route as any).mock.calls[0][0];
      expect(routeCall.ctx.request_id).toBe('test');
    });
    
    it('records success with router', async () => {
      await engine.analyze({
        trace_id: 'test',
        text: 'Test text',
        now_ms: 1000,
      });
      
      expect(router.recordSuccess).toHaveBeenCalled();
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Cache - INV-ORC-04 (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Cache - INV-ORC-04', () => {
    it('caches results and returns cached on second call', async () => {
      const input = {
        trace_id: 'test-cache',
        text: 'Cached text',
        now_ms: 1000,
      };
      
      const result1 = await engine.analyze(input);
      expect(result1.cached).toBe(false);
      expect(bridge.call).toHaveBeenCalledTimes(1);
      
      const result2 = await engine.analyze({ ...input, now_ms: 2000 });
      expect(result2.cached).toBe(true);
      expect(bridge.call).toHaveBeenCalledTimes(1); // No new call
    });
    
    it('skip_cache forces fresh analysis', async () => {
      const input = {
        trace_id: 'test-skip',
        text: 'Fresh text',
        now_ms: 1000,
      };
      
      await engine.analyze(input);
      await engine.analyze({ ...input, now_ms: 2000, skip_cache: true });
      
      expect(bridge.call).toHaveBeenCalledTimes(2);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Fallback - INV-ORC-05 (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Fallback - INV-ORC-05', () => {
    it('returns neutral state on LLM error', async () => {
      const errorBridge = createMockBridge();
      (errorBridge.call as any).mockRejectedValue(new Error('LLM error'));
      
      const errorEngine = createOracleEngine(router, errorBridge, audit, {
        enable_fallback: true,
      });
      
      const result = await errorEngine.analyze({
        trace_id: 'test-fallback',
        text: 'Error text',
        now_ms: 1000,
      });
      
      expect(result.fallback).toBe(true);
      expect(result.state.appraisal.dominant).toBe('anticipation'); // Neutral
    });
    
    it('throws when fallback disabled', async () => {
      const errorBridge = createMockBridge();
      (errorBridge.call as any).mockRejectedValue(new Error('LLM error'));
      
      const noFallbackEngine = createOracleEngine(router, errorBridge, audit, {
        enable_fallback: false,
      });
      
      await expect(noFallbackEngine.analyze({
        trace_id: 'test-no-fallback',
        text: 'Error text',
        now_ms: 1000,
      })).rejects.toThrow('LLM error');
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: Audit - INV-ORC-06 (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Audit - INV-ORC-06', () => {
    it('logs all audit events', async () => {
      await engine.analyze({
        trace_id: 'test-audit',
        text: 'Audit text',
        now_ms: 1000,
      });
      
      const actions = audit.events.map(e => e.action);
      expect(actions).toContain('ORACLE_ANALYZE_START');
      expect(actions).toContain('ORACLE_ROUTE');
      expect(actions).toContain('ORACLE_LLM_CALL');
      expect(actions).toContain('ORACLE_LLM_SUCCESS');
      expect(actions).toContain('ORACLE_COMPLETE');
    });
    
    it('logs cache hit event', async () => {
      const input = { trace_id: 'audit-cache', text: 'Cache test', now_ms: 1000 };
      
      await engine.analyze(input);
      audit.events.length = 0; // Clear
      
      await engine.analyze({ ...input, now_ms: 2000 });
      
      const actions = audit.events.map(e => e.action);
      expect(actions).toContain('ORACLE_CACHE_HIT');
    });
  });
});
