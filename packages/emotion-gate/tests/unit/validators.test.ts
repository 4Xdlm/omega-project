/**
 * OMEGA Emotion Gate — Validators Tests
 *
 * Tests for all 8 emotion validators.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBoundsValidator,
  createStabilityValidator,
  createCausalityValidator,
  createAmplificationValidator,
  createAxiomCompatValidator,
  createDriftVectorValidator,
  createToxicityValidator,
  createCoherenceValidator,
  VEmoAmplificationValidator,
  VEmoToxicityValidator,
  VEmoCoherenceValidator,
} from '../../src/validators/index.js';
import {
  NEUTRAL_EMOTION,
  HAPPY_EMOTION,
  SAD_EMOTION,
  ANGRY_EMOTION,
  ZERO_EMOTION,
  MAX_EMOTION,
  createTestFrame,
  createTestContext,
  createTestPolicy,
  createTestAxiom,
  createStableSequence,
  createOscillatingSequence,
  createInvalidEmotionState,
  createInvalidFrame,
  resetFrameCounter,
} from '../helpers/test-fixtures.js';
// Note: MAX_EMOTION and ZERO_EMOTION already imported
import { DEFAULT_EMOTION_CALIBRATION, OMEGA_EMO_STABILITY_THRESHOLD } from '../../src/gate/types.js';

describe('VEmoBoundsValidator', () => {
  const validator = createBoundsValidator();

  beforeEach(() => {
    resetFrameCounter();
  });

  it('should have correct id and version', () => {
    expect(validator.id).toBe('eval_bounds');
    expect(validator.version).toBe('1.0.0');
  });

  it('should PASS for valid neutral state', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
    expect(result.validator_id).toBe('eval_bounds');
  });

  it('should PASS for valid zero state', () => {
    const frame = createTestFrame(ZERO_EMOTION);
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
  });

  it('should PASS for valid max state', () => {
    const frame = createTestFrame(MAX_EMOTION);
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
  });

  it('should FAIL for negative value', () => {
    const frame = createTestFrame(createInvalidEmotionState('negative'));
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('FAIL');
    expect(result.reasons.some(r => r.includes('below 0'))).toBe(true);
  });

  it('should FAIL for value over 1', () => {
    const frame = createTestFrame(createInvalidEmotionState('over_one'));
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('FAIL');
    expect(result.reasons.some(r => r.includes('above 1'))).toBe(true);
  });

  it('should FAIL for NaN value', () => {
    const frame = createTestFrame(createInvalidEmotionState('nan'));
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('FAIL');
    expect(result.reasons.some(r => r.includes('NaN'))).toBe(true);
  });

  it('should FAIL for wrong source', () => {
    const frame = createInvalidFrame('wrong_source');
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('FAIL');
    expect(result.reasons.some(r => r.includes('Invalid source'))).toBe(true);
  });
});

describe('VEmoStabilityValidator', () => {
  const validator = createStabilityValidator();

  beforeEach(() => {
    resetFrameCounter();
  });

  it('should have correct id and version', () => {
    expect(validator.id).toBe('eval_stability');
    expect(validator.version).toBe('1.0.0');
  });

  it('should PASS for first frame (no previous)', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
    expect(result.reasons[0]).toContain('First frame');
  });

  it('should PASS for stable transition', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const state2 = { ...NEUTRAL_EMOTION, joy: 0.55 }; // Small change
    const frame2 = createTestFrame(state2);
    const context = createTestContext({ previous_frame: frame1 });
    const result = validator.evaluate(frame2, context);

    expect(result.result).toBe('PASS');
  });

  it('should FAIL for large sudden jump', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(HAPPY_EMOTION);
    const context = createTestContext({ previous_frame: frame1 });
    const result = validator.evaluate(frame2, context);

    expect(result.result).toBe('FAIL');
    expect(result.reasons.some(r => r.includes('too large'))).toBe(true);
  });

  it('should include drift metrics', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(HAPPY_EMOTION);
    const context = createTestContext({ previous_frame: frame1 });
    const result = validator.evaluate(frame2, context);

    expect(result.metrics?.drift_vector).toBeDefined();
    expect(result.metrics?.drift_vector?.magnitude).toBeGreaterThan(0);
  });
});

describe('VEmoCausalityValidator', () => {
  const validator = createCausalityValidator();

  beforeEach(() => {
    resetFrameCounter();
  });

  it('should have correct id and version', () => {
    expect(validator.id).toBe('eval_causality');
    expect(validator.version).toBe('1.0.0');
  });

  it('should PASS for first frame', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
  });

  it('should PASS for negligible change', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const state2 = { ...NEUTRAL_EMOTION, joy: 0.51 };
    const frame2 = createTestFrame(state2);
    const context = createTestContext({ previous_frame: frame1 });
    const result = validator.evaluate(frame2, context);

    expect(result.result).toBe('PASS');
  });

  it('should PASS when evidence is provided', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(HAPPY_EMOTION, {
      evidence_refs: ['evr_test_001'],
    });
    const context = createTestContext({ previous_frame: frame1 });
    const result = validator.evaluate(frame2, context);

    expect(result.result).toBe('PASS');
  });

  it('should FAIL for unexplained large change', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(HAPPY_EMOTION);
    const context = createTestContext({ previous_frame: frame1 });
    const result = validator.evaluate(frame2, context);

    expect(result.result).toBe('FAIL');
    expect(result.reasons.some(r => r.includes('without evidence'))).toBe(true);
  });
});

describe('VEmoAmplificationValidator', () => {
  let validator: VEmoAmplificationValidator;

  beforeEach(() => {
    validator = createAmplificationValidator();
    resetFrameCounter();
  });

  it('should have correct id and version', () => {
    expect(validator.id).toBe('eval_amplification');
    expect(validator.version).toBe('1.0.0');
  });

  it('should DEFER without sequence', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('DEFER');
  });

  it('should PASS for stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0); // No jitter
    validator.setSequence(sequence);

    const frame = sequence.frames[sequence.frames.length - 1];
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
  });

  it('should FAIL for oscillating sequence', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, ANGRY_EMOTION, 12);
    validator.setSequence(sequence);

    const frame = sequence.frames[sequence.frames.length - 1];
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('FAIL');
    expect(result.reasons.some(r => r.includes('Amplification loop'))).toBe(true);
  });
});

describe('VEmoAxiomCompatValidator', () => {
  const validator = createAxiomCompatValidator();

  beforeEach(() => {
    resetFrameCounter();
  });

  it('should have correct id and version', () => {
    expect(validator.id).toBe('eval_axiom_compat');
    expect(validator.version).toBe('1.0.0');
  });

  it('should PASS when no axioms', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext({ axioms: [] });
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
  });

  it('should PASS when axiom is satisfied', () => {
    const frame = createTestFrame({ ...NEUTRAL_EMOTION, joy: 0.3 });
    const axiom = createTestAxiom('joy < 0.5', ['joy']);
    const context = createTestContext({ axioms: [axiom] });
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
  });

  it('should FAIL when axiom is violated', () => {
    const frame = createTestFrame({ ...NEUTRAL_EMOTION, joy: 0.8 });
    const axiom = createTestAxiom('joy < 0.5', ['joy']);
    const context = createTestContext({ axioms: [axiom] });
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('FAIL');
    expect(result.reasons.some(r => r.includes('violated'))).toBe(true);
  });

  it('should support >= operator', () => {
    const frame = createTestFrame({ ...NEUTRAL_EMOTION, fear: 0.3 });
    const axiom = createTestAxiom('fear >= 0.5', ['fear']);
    const context = createTestContext({ axioms: [axiom] });
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('FAIL');
  });

  it('should support <= operator', () => {
    const frame = createTestFrame({ ...NEUTRAL_EMOTION, anger: 0.2 });
    const axiom = createTestAxiom('anger <= 0.5', ['anger']);
    const context = createTestContext({ axioms: [axiom] });
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
  });
});

describe('VEmoDriftVectorValidator', () => {
  const validator = createDriftVectorValidator();

  beforeEach(() => {
    resetFrameCounter();
  });

  it('should have correct id and version', () => {
    expect(validator.id).toBe('eval_drift_vector');
    expect(validator.version).toBe('1.0.0');
  });

  it('should PASS for first frame', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
    expect(result.metrics?.drift_vector?.magnitude).toBe(0);
  });

  it('should PASS for drift within threshold', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const state2 = { ...NEUTRAL_EMOTION, joy: 0.55, trust: 0.55 };
    const frame2 = createTestFrame(state2);
    const context = createTestContext({ previous_frame: frame1 });
    const result = validator.evaluate(frame2, context);

    expect(result.result).toBe('PASS');
  });

  it('should FAIL for drift above threshold', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(ANGRY_EMOTION);
    const context = createTestContext({ previous_frame: frame1 });
    const result = validator.evaluate(frame2, context);

    expect(result.result).toBe('FAIL');
    expect(result.reasons.some(r => r.includes('exceeds threshold'))).toBe(true);
  });

  it('should include drift metrics', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(HAPPY_EMOTION);
    const context = createTestContext({ previous_frame: frame1 });
    const result = validator.evaluate(frame2, context);

    expect(result.metrics?.drift_vector).toBeDefined();
  });
});

describe('VEmoToxicityValidator', () => {
  let validator: VEmoToxicityValidator;

  beforeEach(() => {
    validator = createToxicityValidator();
    resetFrameCounter();
  });

  it('should have correct id and version', () => {
    expect(validator.id).toBe('eval_toxicity');
    expect(validator.version).toBe('1.0.0');
  });

  it('should DEFER without sequence', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('DEFER');
  });

  it('should PASS for stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0); // No jitter
    validator.setSequence(sequence);

    const frame = sequence.frames[sequence.frames.length - 1];
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
  });

  it('should include toxicity signal', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0); // No jitter
    validator.setSequence(sequence);

    const frame = sequence.frames[sequence.frames.length - 1];
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.metrics?.toxicity_signal).toBeDefined();
    expect(result.metrics?.toxicity_signal?.amplification_detected).toBe(false);
  });
});

describe('VEmoCoherenceValidator', () => {
  let validator: VEmoCoherenceValidator;

  beforeEach(() => {
    validator = createCoherenceValidator();
    resetFrameCounter();
  });

  it('should have correct id and version', () => {
    expect(validator.id).toBe('eval_coherence');
    expect(validator.version).toBe('1.0.0');
  });

  it('should PASS when no related entities', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('PASS');
  });

  it('should DEFER when related frames not available', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = {
      ...createTestContext(),
      related_entities: ['ent_other_001'] as any,
    };
    const result = validator.evaluate(frame, context);

    expect(result.result).toBe('DEFER');
  });

  it('should PASS when coherent with related', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION, { entity_id: 'ent_test_001' });
    const frame2 = createTestFrame({ ...NEUTRAL_EMOTION, joy: 0.55 }, { entity_id: 'ent_related_001' });

    validator.setRelatedFrames([frame2]);

    const context = {
      ...createTestContext(),
      related_entities: ['ent_related_001'] as any,
    };
    const result = validator.evaluate(frame1, context);

    expect(result.result).toBe('PASS');
  });

  it('should FAIL when incoherent with related', () => {
    // Use extreme contrasting emotions: max vs zero for clear incoherence
    const frame1 = createTestFrame(MAX_EMOTION, { entity_id: 'ent_test_001' });
    const frame2 = createTestFrame(ZERO_EMOTION, { entity_id: 'ent_related_001' });

    validator.setRelatedFrames([frame2]);

    const context = {
      ...createTestContext(),
      related_entities: ['ent_related_001'] as any,
    };
    const result = validator.evaluate(frame1, context);

    expect(result.result).toBe('FAIL');
    expect(result.reasons.some(r => r.includes('Incoherent'))).toBe(true);
  });
});
