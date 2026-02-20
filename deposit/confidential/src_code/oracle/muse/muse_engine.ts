/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Main orchestrator — ZERO MAGIC.
 * 
 * MUSE is not an AI that "invents ideas".
 * It's a DETERMINISTIC PROPOSAL ENGINE based on:
 * - ORACLE v2 emotion analysis
 * - Multi-strategy generation
 * - Multi-axis scoring
 * - Anti-clone diversification
 * - Automatic rejection of vague/risky proposals
 * - Complete audit trail
 * 
 * Objective: 5 suggestions max, each executable, justified, non-redundant.
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionStateV2 } from '../emotion_v2';
import { validateEmotionStateV2 } from '../emotion_v2';
import type {
  SuggestInput,
  SuggestOutput,
  AssessInput,
  AssessOutput,
  ProjectInput,
  ProjectOutput,
  MuseConfig,
  MuseAuditEvent,
  MuseAuditAction,
  NarrativeContext,
  NarrativeArc,
  StyleProfile,
} from './types';
import { DEFAULT_MUSE_CONFIG, MIN_SUGGESTIONS } from './constants';
import { suggest } from './suggest';
import { assess } from './assess';
import { project } from './project';
import { generateOutputHash, sha256 } from './fingerprint';

// ═══════════════════════════════════════════════════════════════════════════════
// MUSE ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class MuseEngine {
  private config: MuseConfig;
  private auditLog: MuseAuditEvent[] = [];
  private currentTraceId: string = '';
  
  constructor(config: Partial<MuseConfig> = {}) {
    this.config = { ...DEFAULT_MUSE_CONFIG, ...config };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // F1: SUGGEST
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate narrative suggestions based on emotional state
   * 
   * INV-MUSE-01: All suggestions have traceable justification
   * INV-MUSE-02: 1-5 suggestions returned
   * INV-MUSE-04: Deterministic (same input+seed = same output)
   * INV-MUSE-08: Depends on validated ORACLE v2 input
   */
  suggest(input: SuggestInput): SuggestOutput {
    this.currentTraceId = sha256(`${Date.now()}:${input.seed}`).substring(0, 16);
    const startTime = Date.now();
    
    // Audit: Start
    this.audit('MUSE_SUGGEST_START', input.seed, {
      scene_id: input.context.scene_id,
      dominant_emotion: input.emotion.appraisal.emotions[0]?.id,
    });
    
    // INV-MUSE-08: Validate ORACLE v2 input
    const validation = validateEmotionStateV2(input.emotion);
    if (!validation.valid) {
      this.audit('MUSE_ERROR', input.seed, { error: 'Invalid EmotionStateV2', details: validation.errors });
      throw new Error(`INV-MUSE-08 violation: Invalid EmotionStateV2 - ${validation.errors.join(', ')}`);
    }
    
    // Execute suggestion pipeline
    const result = suggest({
      emotion: input.emotion,
      context: input.context,
      seed: input.seed,
      previousSuggestions: input.previous_suggestions,
    });
    
    // Audit: Strategy traces
    for (const trace of result.meta.strategy_trace) {
      this.audit('MUSE_SUGGEST_STRATEGY', input.seed, {
        strategy: trace.strategy,
        candidates: trace.candidates_count,
        survivors: trace.survivors_count,
      });
    }
    
    // Audit: Rejections
    for (const rejection of result.meta.rejections) {
      this.audit('MUSE_SUGGEST_REJECT', input.seed, {
        strategy: rejection.strategy,
        reason: rejection.reason,
        score: rejection.score,
      });
    }
    
    // Audit: Harmonic analysis
    this.audit('MUSE_SUGGEST_HARMONIC', input.seed, {
      consonance: result.meta.harmonic_analysis.consonance,
      diversity: result.meta.harmonic_analysis.diversity_score,
      distinct_types: result.meta.harmonic_analysis.distinct_types,
      wild_card: result.meta.harmonic_analysis.wild_card_id,
    });
    
    // INV-MUSE-02: Ensure 1-5 suggestions
    if (result.suggestions.length < MIN_SUGGESTIONS) {
      this.audit('MUSE_ERROR', input.seed, { 
        error: 'INV-MUSE-02 violation', 
        suggestion_count: result.suggestions.length 
      });
      // Don't throw - return what we have, let caller decide
    }
    
    // Build output
    const output: SuggestOutput = {
      suggestions: result.suggestions,
      output_hash: generateOutputHash(result.suggestions.map(s => s.id)),
      input_hash: result.inputHash,
      seed: input.seed,
      meta: result.meta,
    };
    
    // Audit: Complete
    this.audit('MUSE_SUGGEST_COMPLETE', input.seed, {
      suggestion_count: output.suggestions.length,
      duration_ms: Date.now() - startTime,
      output_hash: output.output_hash,
    });
    
    return output;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // F2: ASSESS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Assess narrative health and identify risks
   * 
   * INV-MUSE-05: All risks have concrete remediation
   */
  assess(input: AssessInput): AssessOutput {
    this.currentTraceId = sha256(`${Date.now()}:assess`).substring(0, 16);
    const startTime = Date.now();
    
    // Audit: Start
    this.audit('MUSE_ASSESS_START', undefined, {
      history_length: input.history.length,
      arc_id: input.arc.id,
      arc_progress: input.arc.progress,
    });
    
    // INV-MUSE-08: Validate current state
    const validation = validateEmotionStateV2(input.current);
    if (!validation.valid) {
      this.audit('MUSE_ERROR', undefined, { error: 'Invalid EmotionStateV2' });
      throw new Error(`INV-MUSE-08 violation: Invalid EmotionStateV2`);
    }
    
    // Execute assessment
    const result = assess(input);
    
    // Audit: Each risk
    for (const risk of result.risks) {
      this.audit('MUSE_ASSESS_RISK', undefined, {
        type: risk.type,
        severity: risk.severity,
        priority: risk.priority,
      });
    }
    
    // Audit: Complete
    this.audit('MUSE_ASSESS_COMPLETE', undefined, {
      risk_count: result.risks.length,
      health_score: result.health_score,
      duration_ms: Date.now() - startTime,
    });
    
    return result;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // F3: PROJECT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Project emotional trends and scenarios
   * 
   * INV-MUSE-03: All outputs are probabilities (never certainty)
   * INV-MUSE-06: Projections bounded
   */
  project(input: ProjectInput): ProjectOutput {
    this.currentTraceId = sha256(`${Date.now()}:${input.seed}`).substring(0, 16);
    const startTime = Date.now();
    
    // Audit: Start
    this.audit('MUSE_PROJECT_START', input.seed, {
      history_length: input.history.length,
      horizon_requested: input.horizon,
    });
    
    // Execute projection
    const result = project(input);
    
    // Audit: Trends
    for (const trend of result.trends) {
      this.audit('MUSE_PROJECT_TREND', input.seed, {
        emotion: trend.emotion,
        direction: trend.direction,
        strength: trend.strength,
      });
    }
    
    // Audit: Scenarios
    for (const scenario of result.scenarios) {
      this.audit('MUSE_PROJECT_SCENARIO', input.seed, {
        id: scenario.id,
        emotion: scenario.dominant_emotion,
        probability: scenario.probability,
      });
    }
    
    // INV-MUSE-06: Verify bounds
    const totalProb = result.scenarios.reduce((sum, s) => sum + s.probability, 0);
    if (totalProb > 1.01) { // Small tolerance for rounding
      this.audit('MUSE_ERROR', input.seed, { 
        error: 'INV-MUSE-06 violation', 
        total_probability: totalProb 
      });
    }
    
    // Audit: Complete
    this.audit('MUSE_PROJECT_COMPLETE', input.seed, {
      trend_count: result.trends.length,
      scenario_count: result.scenarios.length,
      horizon_actual: result.horizon_actual,
      confidence: result.confidence,
      duration_ms: Date.now() - startTime,
    });
    
    return result;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT
  // ═══════════════════════════════════════════════════════════════════════════
  
  private audit(
    action: MuseAuditAction,
    seed: number | undefined,
    details: Record<string, unknown>
  ): void {
    if (!this.config.enable_audit) return;
    
    const event: MuseAuditEvent = {
      type: 'MUSE',
      action,
      timestamp_ms: Date.now(),
      trace_id: this.currentTraceId,
      input_hash: '', // Set by caller if needed
      seed,
      details,
    };
    
    this.auditLog.push(event);
  }
  
  /**
   * Get audit log
   */
  getAuditLog(): MuseAuditEvent[] {
    return [...this.auditLog];
  }
  
  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }
  
  /**
   * Get audit log for specific trace
   */
  getTraceLog(traceId: string): MuseAuditEvent[] {
    return this.auditLog.filter(e => e.trace_id === traceId);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Update configuration
   */
  configure(config: Partial<MuseConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): MuseConfig {
    return { ...this.config };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new MUSE engine instance
 */
export function createMuseEngine(config?: Partial<MuseConfig>): MuseEngine {
  return new MuseEngine(config);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE FUNCTIONS (for convenience)
// ═══════════════════════════════════════════════════════════════════════════════

const defaultEngine = new MuseEngine();

/**
 * Suggest using default engine
 */
export function museSuggest(input: SuggestInput): SuggestOutput {
  return defaultEngine.suggest(input);
}

/**
 * Assess using default engine
 */
export function museAssess(input: AssessInput): AssessOutput {
  return defaultEngine.assess(input);
}

/**
 * Project using default engine
 */
export function museProject(input: ProjectInput): ProjectOutput {
  return defaultEngine.project(input);
}
