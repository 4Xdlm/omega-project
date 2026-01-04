/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Confidence Calibrator
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Calibrate LLM confidence to prevent overconfidence.
 * INV-ORC-07: Max confidence capped, no false certainty
 * 
 * @module oracle/confidence_calibrator
 * @version 3.14.0
 */

import type { EmotionStateV2, EmotionSignal, EmotionAppraisal } from './emotion_v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalibrationConfig {
  /** Maximum allowed confidence (hard cap) */
  readonly max_confidence: number;
  /** Minimum confidence floor */
  readonly min_confidence: number;
  /** Penalty for short text (less context = less confidence) */
  readonly short_text_penalty: number;
  /** Threshold for "short text" in chars */
  readonly short_text_threshold: number;
  /** Penalty for high ambiguity */
  readonly ambiguity_penalty: number;
  /** Boost for consistent signals */
  readonly consistency_boost: number;
  /** Model confidence bias correction (multiplicative) */
  readonly model_bias_factor: number;
}

export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = Object.freeze({
  max_confidence: 0.95,
  min_confidence: 0.1,
  short_text_penalty: 0.15,
  short_text_threshold: 100,
  ambiguity_penalty: 0.2,
  consistency_boost: 0.1,
  model_bias_factor: 0.85, // Most LLMs overestimate confidence
});

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalibrationResult {
  /** Calibrated state */
  readonly state: EmotionStateV2;
  /** Original average confidence */
  readonly original_confidence: number;
  /** Calibrated average confidence */
  readonly calibrated_confidence: number;
  /** Adjustments applied */
  readonly adjustments: readonly CalibrationAdjustment[];
}

export interface CalibrationAdjustment {
  readonly type: 'cap' | 'floor' | 'short_text' | 'ambiguity' | 'consistency' | 'model_bias';
  readonly field: string;
  readonly original: number;
  readonly adjusted: number;
  readonly reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATOR CLASS - INV-ORC-07
// ═══════════════════════════════════════════════════════════════════════════════

export class ConfidenceCalibrator {
  private config: CalibrationConfig;
  
  constructor(config?: Partial<CalibrationConfig>) {
    this.config = Object.freeze({ ...DEFAULT_CALIBRATION_CONFIG, ...config });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get current configuration
   */
  getConfig(): CalibrationConfig {
    return this.config;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CALIBRATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calibrate confidence values in EmotionStateV2
   */
  calibrate(state: EmotionStateV2, text_length: number): CalibrationResult {
    const adjustments: CalibrationAdjustment[] = [];
    
    // Calculate original average confidence
    const originalConfidences = state.signals.map(s => s.confidence);
    const original_confidence = originalConfidences.reduce((a, b) => a + b, 0) / originalConfidences.length;
    
    // Calibrate signals
    const calibratedSignals = state.signals.map((signal, i) => {
      let conf = signal.confidence;
      const originalConf = conf;
      
      // Step 1: Apply model bias factor
      conf = conf * this.config.model_bias_factor;
      if (conf !== originalConf) {
        adjustments.push({
          type: 'model_bias',
          field: `signals[${i}].confidence`,
          original: originalConf,
          adjusted: conf,
          reason: `Model bias correction (factor: ${this.config.model_bias_factor})`,
        });
      }
      
      // Step 2: Short text penalty
      if (text_length < this.config.short_text_threshold) {
        const penalty = this.config.short_text_penalty * (1 - text_length / this.config.short_text_threshold);
        const newConf = conf - penalty;
        if (newConf !== conf) {
          adjustments.push({
            type: 'short_text',
            field: `signals[${i}].confidence`,
            original: conf,
            adjusted: newConf,
            reason: `Short text (${text_length} chars < ${this.config.short_text_threshold})`,
          });
          conf = newConf;
        }
      }
      
      // Step 3: Apply cap
      if (conf > this.config.max_confidence) {
        adjustments.push({
          type: 'cap',
          field: `signals[${i}].confidence`,
          original: conf,
          adjusted: this.config.max_confidence,
          reason: `Capped at max (${this.config.max_confidence})`,
        });
        conf = this.config.max_confidence;
      }
      
      // Step 4: Apply floor
      if (conf < this.config.min_confidence) {
        adjustments.push({
          type: 'floor',
          field: `signals[${i}].confidence`,
          original: conf,
          adjusted: this.config.min_confidence,
          reason: `Floored at min (${this.config.min_confidence})`,
        });
        conf = this.config.min_confidence;
      }
      
      return {
        ...signal,
        confidence: Math.round(conf * 100) / 100,
      } as EmotionSignal;
    });
    
    // Calibrate appraisal based on ambiguity
    let appraisal = state.appraisal;
    
    if (appraisal.ambiguity > 0.5) {
      // High ambiguity = reduce confidence in emotion weights
      const penalty = this.config.ambiguity_penalty * (appraisal.ambiguity - 0.5) * 2;
      
      const adjustedEmotions = appraisal.emotions.map((e, i) => {
        const newWeight = Math.max(0.1, e.weight - penalty * e.weight);
        if (newWeight !== e.weight) {
          adjustments.push({
            type: 'ambiguity',
            field: `appraisal.emotions[${i}].weight`,
            original: e.weight,
            adjusted: newWeight,
            reason: `High ambiguity (${appraisal.ambiguity})`,
          });
        }
        return {
          ...e,
          weight: Math.round(newWeight * 100) / 100,
        };
      });
      
      appraisal = {
        ...appraisal,
        emotions: adjustedEmotions,
      };
    }
    
    // Check signal consistency (if all signals agree, boost confidence)
    const valences = calibratedSignals.map(s => s.valence);
    const allSameSign = valences.every(v => v >= 0) || valences.every(v => v <= 0);
    
    if (allSameSign && calibratedSignals.length > 1) {
      const boostedSignals = calibratedSignals.map((signal, i) => {
        const boost = Math.min(
          this.config.consistency_boost,
          this.config.max_confidence - signal.confidence
        );
        
        if (boost > 0) {
          adjustments.push({
            type: 'consistency',
            field: `signals[${i}].confidence`,
            original: signal.confidence,
            adjusted: signal.confidence + boost,
            reason: 'Consistent signals boost',
          });
        }
        
        return {
          ...signal,
          confidence: Math.round((signal.confidence + boost) * 100) / 100,
        } as EmotionSignal;
      });
      
      // Update calibrated signals
      calibratedSignals.length = 0;
      calibratedSignals.push(...boostedSignals);
    }
    
    // Calculate calibrated average
    const calibratedConfidences = calibratedSignals.map(s => s.confidence);
    const calibrated_confidence = calibratedConfidences.reduce((a, b) => a + b, 0) / calibratedConfidences.length;
    
    // Build calibrated state
    const calibratedState: EmotionStateV2 = {
      ...state,
      signals: calibratedSignals,
      appraisal,
      calibrated: true,
    };
    
    return {
      state: calibratedState,
      original_confidence: Math.round(original_confidence * 100) / 100,
      calibrated_confidence: Math.round(calibrated_confidence * 100) / 100,
      adjustments,
    };
  }
  
  /**
   * Quick calibration (just cap confidence)
   */
  quickCalibrate(state: EmotionStateV2): EmotionStateV2 {
    const signals = state.signals.map(s => ({
      ...s,
      confidence: Math.min(s.confidence, this.config.max_confidence),
    }));
    
    return {
      ...state,
      signals,
      calibrated: true,
    };
  }
  
  /**
   * Calculate overall confidence from state
   */
  calculateOverallConfidence(state: EmotionStateV2): number {
    const signalConf = state.signals.reduce((sum, s) => sum + s.confidence, 0) / state.signals.length;
    const ambiguityFactor = 1 - state.appraisal.ambiguity * 0.5;
    
    return Math.round(signalConf * ambiguityFactor * 100) / 100;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new confidence calibrator
 */
export function createConfidenceCalibrator(config?: Partial<CalibrationConfig>): ConfidenceCalibrator {
  return new ConfidenceCalibrator(config);
}
