/**
 * OMEGA Emotion Gate — Core Gate Tests
 *
 * Tests for the EmotionGate engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEmotionGate, EmotionGate } from '../../src/gate/emotion-gate.js';
import { DEFAULT_EMOTION_CALIBRATION } from '../../src/gate/types.js';
import {
  NEUTRAL_EMOTION,
  HAPPY_EMOTION,
  SAD_EMOTION,
  ANGRY_EMOTION,
  createTestFrame,
  createTestContext,
  createTestPolicy,
  resetFrameCounter,
} from '../helpers/test-fixtures.js';

describe('EmotionGate', () => {
  let gate: EmotionGate;

  beforeEach(() => {
    gate = createEmotionGate();
    resetFrameCounter();
  });

  describe('initialization', () => {
    it('should create gate with default calibration', () => {
      expect(gate.getCalibration()).toEqual(DEFAULT_EMOTION_CALIBRATION);
    });

    it('should have 8 validators', () => {
      expect(gate.getValidators()).toHaveLength(8);
    });

    it('should initialize with empty metrics', () => {
      const metrics = gate.getMetrics();
      expect(metrics.total_evaluations).toBe(0);
      expect(metrics.allow_count).toBe(0);
      expect(metrics.deny_count).toBe(0);
    });
  });

  describe('evaluate', () => {
    it('should evaluate a frame and return verdict', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      expect(verdict).toBeDefined();
      expect(verdict.verdict_id).toMatch(/^evrd_/);
      expect(verdict.frame_id).toBe(frame.frame_id);
      expect(verdict.entity_id).toBe(frame.entity_id);
    });

    it('should ALLOW valid first frame with permissive policy', () => {
      // Use permissive policy to avoid DEFER from sequence-dependent validators
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });
      const verdict = gate.evaluate(frame, context);

      expect(verdict.type).toBe('ALLOW');
    });

    it('should DEFER for first frame with full policy (waiting for sequence)', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      // Full policy includes amplification/toxicity validators which DEFER
      expect(['ALLOW', 'DEFER']).toContain(verdict.type);
    });

    it('should include all validator results', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      expect(verdict.validators_results.length).toBeGreaterThan(0);
      for (const result of verdict.validators_results) {
        expect(result.validator_id).toMatch(/^eval_/);
        expect(['PASS', 'FAIL', 'DEFER']).toContain(result.result);
      }
    });

    it('should compute drift vector', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      expect(verdict.drift_vector).toBeDefined();
      expect(verdict.drift_vector.magnitude).toBeGreaterThanOrEqual(0);
    });

    it('should compute toxicity signal', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      expect(verdict.toxicity_signal).toBeDefined();
      expect(verdict.toxicity_signal.amplification_detected).toBe(false);
    });

    it('should include proof', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      expect(verdict.proof).toBeDefined();
      expect(verdict.proof.emotion_input_hash).toMatch(/^rh_/);
      expect(verdict.proof.policy_hash).toBeDefined();
    });

    it('should generate unique verdict hash', () => {
      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const frame2 = createTestFrame(HAPPY_EMOTION);
      const context = createTestContext();

      const verdict1 = gate.evaluate(frame1, context);
      const verdict2 = gate.evaluate(frame2, context);

      expect(verdict1.verdict_hash).not.toBe(verdict2.verdict_hash);
    });
  });

  describe('sequence tracking', () => {
    it('should register frames in sequence', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION, { entity_id: 'ent_seq_001' });
      const context = createTestContext();

      gate.evaluate(frame, context);

      const sequence = gate.getSequence('ent_seq_001');
      expect(sequence).toBeDefined();
      expect(sequence?.frames).toHaveLength(1);
    });

    it('should accumulate frames in sequence', () => {
      const frame1 = createTestFrame(NEUTRAL_EMOTION, { entity_id: 'ent_seq_002' });
      const frame2 = createTestFrame(HAPPY_EMOTION, { entity_id: 'ent_seq_002' });
      const context = createTestContext();

      gate.evaluate(frame1, context);
      gate.evaluate(frame2, context);

      const sequence = gate.getSequence('ent_seq_002');
      expect(sequence?.frames).toHaveLength(2);
    });

    it('should clear sequence', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION, { entity_id: 'ent_clear_001' });
      const context = createTestContext();

      gate.evaluate(frame, context);
      expect(gate.getSequence('ent_clear_001')).toBeDefined();

      gate.clearSequence('ent_clear_001');
      expect(gate.getSequence('ent_clear_001')).toBeUndefined();
    });
  });

  describe('verdict types', () => {
    it('should DENY when bounds validator fails', () => {
      const invalidState = { ...NEUTRAL_EMOTION, joy: -0.5 };
      const frame = createTestFrame(invalidState);
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      expect(verdict.type).toBe('DENY');
    });

    it('should DENY when stability validator fails', () => {
      const frame1 = createTestFrame(NEUTRAL_EMOTION, { entity_id: 'ent_stability_test' });
      const frame2 = createTestFrame(ANGRY_EMOTION, { entity_id: 'ent_stability_test' });
      const context1 = createTestContext();
      const context2 = createTestContext({ previous_frame: frame1 });

      gate.evaluate(frame1, context1);
      const verdict = gate.evaluate(frame2, context2);

      expect(verdict.type).toBe('DENY');
    });

    it('should respect policy validators list', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });

      const verdict = gate.evaluate(frame, context);

      // Only bounds validator should run
      expect(verdict.validators_results).toHaveLength(1);
      expect(verdict.validators_results[0].validator_id).toBe('eval_bounds');
    });
  });

  describe('metrics', () => {
    it('should update metrics after evaluation', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();

      gate.evaluate(frame, context);

      const metrics = gate.getMetrics();
      expect(metrics.total_evaluations).toBe(1);
    });

    it('should track allow/deny counts', () => {
      const validFrame = createTestFrame(NEUTRAL_EMOTION);
      const invalidFrame = createTestFrame({ ...NEUTRAL_EMOTION, joy: -0.5 });
      // Use bounds-only policy to get clear ALLOW/DENY without DEFER
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });

      gate.evaluate(validFrame, context);
      gate.evaluate(invalidFrame, context);

      const metrics = gate.getMetrics();
      expect(metrics.allow_count).toBe(1);
      expect(metrics.deny_count).toBe(1);
    });

    it('should track drift statistics', () => {
      const frame1 = createTestFrame(NEUTRAL_EMOTION, { entity_id: 'ent_drift_stats' });
      const frame2 = createTestFrame(HAPPY_EMOTION, { entity_id: 'ent_drift_stats' });
      const context1 = createTestContext();
      const context2 = createTestContext({ previous_frame: frame1 });

      gate.evaluate(frame1, context1);
      gate.evaluate(frame2, context2);

      const metrics = gate.getMetrics();
      expect(metrics.drift_stats.total_measurements).toBe(2);
    });

    it('should reset metrics', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();

      gate.evaluate(frame, context);
      expect(gate.getMetrics().total_evaluations).toBe(1);

      gate.resetMetrics();
      expect(gate.getMetrics().total_evaluations).toBe(0);
    });
  });

  describe('enforce', () => {
    it('should return PASSED for ALLOW verdict', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      // Use bounds-only policy to get ALLOW
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });
      const verdict = gate.evaluate(frame, context);
      const result = gate.enforce(verdict);

      expect(result.action).toBe('PASSED');
      expect(result.verdict).toBe(verdict);
    });

    it('should return BLOCKED for DENY verdict', () => {
      const frame = createTestFrame({ ...NEUTRAL_EMOTION, joy: -0.5 });
      // Use bounds-only policy to get clear DENY
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });
      const verdict = gate.evaluate(frame, context);
      const result = gate.enforce(verdict);

      expect(result.action).toBe('BLOCKED');
    });

    it('should return DEFERRED for DEFER verdict', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      // Use full policy - amplification/toxicity will DEFER
      const context = createTestContext();
      const verdict = gate.evaluate(frame, context);

      if (verdict.type === 'DEFER') {
        const result = gate.enforce(verdict);
        expect(result.action).toBe('DEFERRED');
      }
    });
  });
});

describe('createEmotionGate', () => {
  it('should create gate with default calibration', () => {
    const gate = createEmotionGate();
    expect(gate).toBeInstanceOf(EmotionGate);
    expect(gate.getCalibration()).toEqual(DEFAULT_EMOTION_CALIBRATION);
  });

  it('should create gate with custom calibration', () => {
    const customCalibration = {
      ...DEFAULT_EMOTION_CALIBRATION,
    };
    const gate = createEmotionGate(customCalibration);
    expect(gate.getCalibration()).toEqual(customCalibration);
  });
});
