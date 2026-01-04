/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — ORACLE Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Main orchestrator for emotion analysis.
 * Integrates: Router → IPC Bridge → Parser → Cache → Calibrator → Audit
 * 
 * Invariants:
 * - INV-ORC-01: Deterministic prompts (same input = same prompt)
 * - INV-ORC-02: Parse strict (invalid JSON = error)
 * - INV-ORC-03: Schema v2 validated
 * - INV-ORC-04: Cache hit = skip LLM
 * - INV-ORC-05: Fallback graceful (error = neutral state)
 * - INV-ORC-06: Audit complete
 * - INV-ORC-07: Confidence calibrated
 * - INV-ORC-08: Router enforced
 * 
 * @module oracle/oracle_engine
 * @version 3.14.0
 */

import type { EmotionStateV2 } from './emotion_v2.js';
import { createNeutralState, validateEmotionStateV2 } from './emotion_v2.js';
import { buildPrompt, calculateInputHash, type PromptInput } from './prompt_builder.js';
import { parseResponse, tryParseResponse, ParseError } from './response_parser.js';
import { EmotionCache, createEmotionCache, type CacheConfig } from './emotion_cache.js';
import { ConfidenceCalibrator, createConfidenceCalibrator, type CalibrationConfig } from './confidence_calibrator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EXTERNAL INTERFACES (Minimal dependency)
// ═══════════════════════════════════════════════════════════════════════════════

/** Router interface (compatible with Sprint 14.2) */
export interface OracleRouter {
  route(params: {
    ctx: {
      request_id: string;
      text_chars: number;
      expected_out_tokens: number;
      priority: 'FAST' | 'NORMAL' | 'QUALITY';
      sensitive: boolean;
    };
    constraints?: {
      max_latency_ms?: number;
      max_cost_per_call?: number;
      min_quality?: 'FAST' | 'BALANCED' | 'QUALITY';
      require_json?: boolean;
    };
    now_ms: number;
  }): {
    provider_id: string;
    estimated_latency_ms: number;
    estimated_cost: number;
  };
  
  rerouteOnFailure?(params: {
    failing_provider_id: string;
    ctx: {
      request_id: string;
      text_chars: number;
      expected_out_tokens: number;
      priority: 'FAST' | 'NORMAL' | 'QUALITY';
      sensitive: boolean;
    };
    constraints?: {
      max_latency_ms?: number;
      max_cost_per_call?: number;
      min_quality?: 'FAST' | 'BALANCED' | 'QUALITY';
      require_json?: boolean;
    };
    now_ms: number;
  }): { provider_id: string };
  
  recordSuccess?(provider_id: string, latency_ms: number, now_ms: number): void;
}

/** Bridge interface (compatible with Sprint 14.1) */
export interface OracleBridge {
  call<T>(method: string, params?: unknown, timeout_ms?: number): Promise<T>;
  isReady(): boolean;
}

/** Audit interface */
export interface OracleAudit {
  append(event: {
    type: 'ORACLE';
    action: OracleAuditAction;
    timestamp_ms: number;
    data: Record<string, unknown>;
  }): void;
}

export type OracleAuditAction =
  | 'ORACLE_ANALYZE_START'
  | 'ORACLE_CACHE_HIT'
  | 'ORACLE_ROUTE'
  | 'ORACLE_LLM_CALL'
  | 'ORACLE_LLM_SUCCESS'
  | 'ORACLE_LLM_ERROR'
  | 'ORACLE_PARSE_ERROR'
  | 'ORACLE_FALLBACK'
  | 'ORACLE_CALIBRATE'
  | 'ORACLE_COMPLETE';

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface OracleEngineConfig {
  /** Enable caching */
  readonly enable_cache: boolean;
  /** Enable confidence calibration */
  readonly enable_calibration: boolean;
  /** Enable audit logging */
  readonly enable_audit: boolean;
  /** Enable fallback on error */
  readonly enable_fallback: boolean;
  /** Default timeout for LLM calls (ms) */
  readonly default_timeout_ms: number;
  /** Default max emotions */
  readonly default_max_emotions: number;
  /** Cache configuration */
  readonly cache_config?: Partial<CacheConfig>;
  /** Calibration configuration */
  readonly calibration_config?: Partial<CalibrationConfig>;
}

export const DEFAULT_ENGINE_CONFIG: OracleEngineConfig = Object.freeze({
  enable_cache: true,
  enable_calibration: true,
  enable_audit: true,
  enable_fallback: true,
  default_timeout_ms: 30000,
  default_max_emotions: 5,
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS INPUT/OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnalyzeInput {
  /** Unique trace ID */
  readonly trace_id: string;
  /** Text to analyze */
  readonly text: string;
  /** Timestamp (required, never auto-generated) */
  readonly now_ms: number;
  /** Priority level */
  readonly priority?: 'FAST' | 'NORMAL' | 'QUALITY';
  /** Contains sensitive data */
  readonly sensitive?: boolean;
  /** Max emotions to return */
  readonly max_emotions?: number;
  /** Include dynamics layer */
  readonly include_dynamics?: boolean;
  /** Include narrative layer */
  readonly include_narrative?: boolean;
  /** Include legacy Plutchik */
  readonly include_legacy?: boolean;
  /** Language hint */
  readonly language?: string;
  /** Context (previous text) */
  readonly context?: string;
  /** Timeout override (ms) */
  readonly timeout_ms?: number;
  /** Skip cache (force fresh analysis) */
  readonly skip_cache?: boolean;
}

export interface AnalyzeResult {
  /** Emotion state (validated) */
  readonly state: EmotionStateV2;
  /** From cache */
  readonly cached: boolean;
  /** Fallback used */
  readonly fallback: boolean;
  /** Provider used */
  readonly provider_id: string;
  /** Total latency (ms) */
  readonly latency_ms: number;
  /** Calibration applied */
  readonly calibrated: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORACLE ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class OracleEngine {
  private config: OracleEngineConfig;
  private cache: EmotionCache;
  private calibrator: ConfidenceCalibrator;
  
  constructor(
    private readonly router: OracleRouter,
    private readonly bridge: OracleBridge,
    private readonly audit: OracleAudit,
    config?: Partial<OracleEngineConfig>
  ) {
    this.config = Object.freeze({ ...DEFAULT_ENGINE_CONFIG, ...config });
    this.cache = createEmotionCache(this.config.cache_config);
    this.calibrator = createConfidenceCalibrator(this.config.calibration_config);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN ANALYSIS METHOD
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Analyze text for emotions
   * @throws Error if analysis fails and fallback is disabled
   */
  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const startTime = input.now_ms;
    
    // Validate input
    this.validateInput(input);
    
    // Audit start - INV-ORC-06
    this.auditEvent('ORACLE_ANALYZE_START', input.now_ms, {
      trace_id: input.trace_id,
      text_length: input.text.length,
      priority: input.priority ?? 'NORMAL',
    });
    
    // Build prompt input
    const promptInput: PromptInput = {
      trace_id: input.trace_id,
      text: input.text,
      now_ms: input.now_ms,
      max_emotions: input.max_emotions ?? this.config.default_max_emotions,
      include_dynamics: input.include_dynamics ?? false,
      include_narrative: input.include_narrative ?? false,
      include_legacy: input.include_legacy ?? false,
      language: input.language,
      context: input.context,
    };
    
    // Calculate hash - INV-ORC-01
    const input_hash = calculateInputHash(promptInput);
    
    // Check cache - INV-ORC-04
    if (this.config.enable_cache && !input.skip_cache) {
      const cached = this.cache.get(input_hash, input.now_ms);
      if (cached) {
        this.auditEvent('ORACLE_CACHE_HIT', input.now_ms, {
          trace_id: input.trace_id,
          input_hash,
        });
        
        return {
          state: cached,
          cached: true,
          fallback: false,
          provider_id: cached.model.provider_id,
          latency_ms: 0,
          calibrated: cached.calibrated,
        };
      }
    }
    
    // Route - INV-ORC-08
    const routeDecision = this.router.route({
      ctx: {
        request_id: input.trace_id,
        text_chars: input.text.length,
        expected_out_tokens: 500,
        priority: input.priority ?? 'NORMAL',
        sensitive: input.sensitive ?? false,
      },
      constraints: {
        require_json: true,
      },
      now_ms: input.now_ms,
    });
    
    this.auditEvent('ORACLE_ROUTE', input.now_ms, {
      trace_id: input.trace_id,
      provider_id: routeDecision.provider_id,
      estimated_latency_ms: routeDecision.estimated_latency_ms,
    });
    
    // Build prompt - INV-ORC-01
    const prompt = buildPrompt(promptInput);
    
    // Call LLM
    let state: EmotionStateV2;
    let fallback = false;
    const timeout_ms = input.timeout_ms ?? this.config.default_timeout_ms;
    
    try {
      this.auditEvent('ORACLE_LLM_CALL', input.now_ms, {
        trace_id: input.trace_id,
        provider_id: routeDecision.provider_id,
        payload_hash: prompt.payload_hash,
        estimated_tokens: prompt.estimated_tokens,
      });
      
      const callStart = Date.now();
      
      // Call via bridge - INV-ORC-08
      const rawResponse = await this.bridge.call<string>(
        'oracle_analyze',
        {
          trace_id: input.trace_id,
          system_prompt: prompt.system_prompt,
          user_prompt: prompt.user_prompt,
          provider_id: routeDecision.provider_id,
        },
        timeout_ms
      );
      
      const llmLatency = Date.now() - callStart;
      
      // Parse response - INV-ORC-02, INV-ORC-03
      state = parseResponse(rawResponse, {
        trace_id: input.trace_id,
        created_at_ms: input.now_ms,
        input_hash,
        provider_id: routeDecision.provider_id,
        latency_ms: llmLatency,
      });
      
      this.auditEvent('ORACLE_LLM_SUCCESS', input.now_ms, {
        trace_id: input.trace_id,
        provider_id: routeDecision.provider_id,
        latency_ms: llmLatency,
        dominant_emotion: state.appraisal.dominant,
      });
      
      // Record success with router
      this.router.recordSuccess?.(routeDecision.provider_id, llmLatency, input.now_ms);
      
    } catch (error) {
      // Log error
      this.auditEvent('ORACLE_LLM_ERROR', input.now_ms, {
        trace_id: input.trace_id,
        provider_id: routeDecision.provider_id,
        error: error instanceof Error ? error.message : String(error),
        error_type: error instanceof ParseError ? 'parse' : 'call',
      });
      
      // Try fallback - INV-ORC-05
      if (this.config.enable_fallback) {
        state = createNeutralState({
          trace_id: input.trace_id,
          created_at_ms: input.now_ms,
          input_hash,
          provider_id: routeDecision.provider_id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
        fallback = true;
        
        this.auditEvent('ORACLE_FALLBACK', input.now_ms, {
          trace_id: input.trace_id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      } else {
        throw error;
      }
    }
    
    // Calibrate - INV-ORC-07
    if (this.config.enable_calibration && !fallback) {
      const calibrationResult = this.calibrator.calibrate(state, input.text.length);
      state = calibrationResult.state;
      
      if (calibrationResult.adjustments.length > 0) {
        this.auditEvent('ORACLE_CALIBRATE', input.now_ms, {
          trace_id: input.trace_id,
          original_confidence: calibrationResult.original_confidence,
          calibrated_confidence: calibrationResult.calibrated_confidence,
          adjustments_count: calibrationResult.adjustments.length,
        });
      }
    }
    
    // Store in cache - INV-ORC-04
    if (this.config.enable_cache && !fallback) {
      this.cache.set(input_hash, state, input.now_ms);
    }
    
    const totalLatency = Date.now() - startTime;
    
    // Audit complete - INV-ORC-06
    this.auditEvent('ORACLE_COMPLETE', input.now_ms, {
      trace_id: input.trace_id,
      cached: false,
      fallback,
      provider_id: routeDecision.provider_id,
      latency_ms: totalLatency,
      dominant_emotion: state.appraisal.dominant,
      ambiguity: state.appraisal.ambiguity,
    });
    
    return {
      state,
      cached: false,
      fallback,
      provider_id: routeDecision.provider_id,
      latency_ms: totalLatency,
      calibrated: state.calibrated,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  private validateInput(input: AnalyzeInput): void {
    if (!input.trace_id || input.trace_id.trim().length === 0) {
      throw new Error('ORACLE: trace_id required');
    }
    
    if (!input.text || input.text.trim().length === 0) {
      throw new Error('ORACLE: text required (empty input)');
    }
    
    if (input.text.length > 100000) {
      throw new Error('ORACLE: text too long (max 100000 chars)');
    }
    
    if (typeof input.now_ms !== 'number' || input.now_ms < 0) {
      throw new Error('ORACLE: now_ms required (positive integer)');
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT
  // ═══════════════════════════════════════════════════════════════════════════
  
  private auditEvent(action: OracleAuditAction, timestamp_ms: number, data: Record<string, unknown>): void {
    if (!this.config.enable_audit) return;
    
    this.audit.append({
      type: 'ORACLE',
      action,
      timestamp_ms,
      data,
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get engine configuration
   */
  getConfig(): OracleEngineConfig {
    return this.config;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create ORACLE engine instance
 */
export function createOracleEngine(
  router: OracleRouter,
  bridge: OracleBridge,
  audit: OracleAudit,
  config?: Partial<OracleEngineConfig>
): OracleEngine {
  return new OracleEngine(router, bridge, audit, config);
}
