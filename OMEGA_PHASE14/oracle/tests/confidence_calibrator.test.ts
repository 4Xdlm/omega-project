/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Confidence Calibrator Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for confidence calibration.
 * INV-ORC-07: Max confidence capped, no false certainty
 * 
 * Total: 6 tests
 * 
 * @module oracle/tests/confidence_calibrator.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConfidenceCalibrator,
  createConfidenceCalibrator,
} from '../confidence_calibrator.js';
import {
  validateEmotionStateV2,
  EMOTION_V2_VERSION,
} from '../emotion_v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function mockState(confidence: number = 0.9) {
  return validateEmotionStateV2({
    schema_version: EMOTION_V2_VERSION,
    trace_id: 'test',
    created_at_ms: 1000,
    signals: [
      { channel: 'semantic', valence: -0.3, arousal: 0.6, confidence },
    ],
    appraisal: {
      emotions: [{ label: 'fear', family: 'fear_family', weight: 1, polarity: -1 }],
      dominant: 'fear',
      ambiguity: 0,
      valence_aggregate: -0.3,
      arousal_aggregate: 0.6,
    },
    model: { provider_id: 'p', model_name: 'm', latency_ms: 100 },
    rationale: 'Test',
    input_hash: 'HASH',
    cached: false,
    calibrated: false,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Confidence Calibrator - INV-ORC-07', () => {
  let calibrator: ConfidenceCalibrator;
  
  beforeEach(() => {
    calibrator = createConfidenceCalibrator({
      max_confidence: 0.95,
      min_confidence: 0.1,
      model_bias_factor: 0.85,
      short_text_penalty: 0.15,
      short_text_threshold: 100,
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Confidence Capping (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Confidence Capping', () => {
    it('caps confidence at max_confidence', () => {
      const state = mockState(1.0); // Very high confidence
      const result = calibrator.calibrate(state, 500);
      
      expect(result.state.signals[0].confidence).toBeLessThanOrEqual(0.95);
      expect(result.calibrated_confidence).toBeLessThanOrEqual(0.95);
    });
    
    it('floors confidence at min_confidence', () => {
      const state = mockState(0.05); // Very low confidence
      const result = calibrator.calibrate(state, 500);
      
      expect(result.state.signals[0].confidence).toBeGreaterThanOrEqual(0.1);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Adjustments (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Adjustments', () => {
    it('applies model bias factor', () => {
      const state = mockState(0.9);
      const result = calibrator.calibrate(state, 500);
      
      // 0.9 * 0.85 = 0.765 before other adjustments
      expect(result.original_confidence).toBe(0.9);
      expect(result.calibrated_confidence).toBeLessThan(0.9);
      
      const biasAdjustment = result.adjustments.find(a => a.type === 'model_bias');
      expect(biasAdjustment).toBeDefined();
    });
    
    it('penalizes short text', () => {
      const state = mockState(0.9);
      const result = calibrator.calibrate(state, 50); // Short text
      
      const shortTextAdjustment = result.adjustments.find(a => a.type === 'short_text');
      expect(shortTextAdjustment).toBeDefined();
      expect(result.calibrated_confidence).toBeLessThan(0.8);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Output (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Output', () => {
    it('marks state as calibrated', () => {
      const state = mockState(0.8);
      const result = calibrator.calibrate(state, 500);
      
      expect(result.state.calibrated).toBe(true);
    });
    
    it('quickCalibrate only caps confidence', () => {
      const state = mockState(1.0);
      const result = calibrator.quickCalibrate(state);
      
      expect(result.calibrated).toBe(true);
      expect(result.signals[0].confidence).toBeLessThanOrEqual(0.95);
    });
  });
});
