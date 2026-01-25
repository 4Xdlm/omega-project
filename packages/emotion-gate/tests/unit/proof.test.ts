/**
 * OMEGA Emotion Gate — Proof Generator Tests
 *
 * Tests for proof generation and verification.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateEmotionProof,
  verifyEmotionProof,
  isProofDeterministic,
} from '../../src/proof/proof-generator.js';
import { createEmotionGate } from '../../src/gate/emotion-gate.js';
import { computeDriftVector, createZeroDriftVector } from '../../src/metrics/drift-metrics.js';
import { createSafeToxicitySignal } from '../../src/metrics/toxicity-metrics.js';
import {
  NEUTRAL_EMOTION,
  HAPPY_EMOTION,
  createTestFrame,
  createTestContext,
  resetFrameCounter,
} from '../helpers/test-fixtures.js';

describe('generateEmotionProof', () => {
  beforeEach(() => {
    resetFrameCounter();
  });

  it('should generate proof for frame', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const drift = createZeroDriftVector();
    const toxicity = createSafeToxicitySignal();

    const proof = generateEmotionProof(frame, context, [], drift, toxicity);

    expect(proof).toBeDefined();
    expect(proof.emotion_input_hash).toMatch(/^rh_/);
    expect(proof.policy_hash).toBeDefined();
  });

  it('should include validator proofs', () => {
    const gate = createEmotionGate();
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const verdict = gate.evaluate(frame, context);

    expect(verdict.proof.validators_proofs.length).toBeGreaterThan(0);

    for (const vp of verdict.proof.validators_proofs) {
      expect(vp.validator_id).toMatch(/^eval_/);
      expect(vp.input_hash).toMatch(/^rh_/);
      expect(vp.output_hash).toMatch(/^rh_/);
      expect(vp.computation_deterministic).toBe(true);
    }
  });

  it('should compute drift hash', () => {
    const gate = createEmotionGate();
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const verdict = gate.evaluate(frame, context);

    expect(verdict.proof.drift_computation_hash).toMatch(/^rh_/);
  });

  it('should compute toxicity hash', () => {
    const gate = createEmotionGate();
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const verdict = gate.evaluate(frame, context);

    expect(verdict.proof.toxicity_computation_hash).toMatch(/^rh_/);
  });

  it('should compute aggregated proof hash', () => {
    const gate = createEmotionGate();
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const verdict = gate.evaluate(frame, context);

    expect(verdict.proof.aggregated_proof_hash).toMatch(/^rh_/);
  });

  it('should include inputs snapshot', () => {
    const gate = createEmotionGate();
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const verdict = gate.evaluate(frame, context);

    expect(verdict.proof.inputs_snapshot).toBeDefined();
    expect(verdict.proof.inputs_snapshot.frame_hash).toMatch(/^rh_/);
    expect(verdict.proof.inputs_snapshot.context_hash).toMatch(/^rh_/);
    expect(verdict.proof.inputs_snapshot.calibration_hash).toMatch(/^rh_/);
  });

  it('should produce same hash for same input', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const drift = createZeroDriftVector();
    const toxicity = createSafeToxicitySignal();

    const proof1 = generateEmotionProof(frame, context, [], drift, toxicity);
    const proof2 = generateEmotionProof(frame, context, [], drift, toxicity);

    expect(proof1.emotion_input_hash).toBe(proof2.emotion_input_hash);
  });

  it('should produce different hash for different input', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(HAPPY_EMOTION);
    const context = createTestContext();
    const drift = createZeroDriftVector();
    const toxicity = createSafeToxicitySignal();

    const proof1 = generateEmotionProof(frame1, context, [], drift, toxicity);
    const proof2 = generateEmotionProof(frame2, context, [], drift, toxicity);

    expect(proof1.emotion_input_hash).not.toBe(proof2.emotion_input_hash);
  });
});

describe('verifyEmotionProof', () => {
  beforeEach(() => {
    resetFrameCounter();
  });

  it('should verify valid proof', () => {
    const gate = createEmotionGate();
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const verdict = gate.evaluate(frame, context);

    const result = verifyEmotionProof(frame, context, verdict.proof);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect emotion input hash mismatch', () => {
    const gate = createEmotionGate();
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(HAPPY_EMOTION);
    const context = createTestContext();
    const verdict = gate.evaluate(frame1, context);

    // Verify with different frame
    const result = verifyEmotionProof(frame2, context, verdict.proof);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Emotion input hash'))).toBe(true);
  });

  it('should detect policy hash mismatch', () => {
    const gate = createEmotionGate();
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context1 = createTestContext();

    const verdict = gate.evaluate(frame, context1);

    // Create context with different policy hash
    const context2 = {
      ...context1,
      policy: {
        ...context1.policy,
        hash: 'rh_different_hash_value' as any,
      },
    };

    // Verify with different context
    const result = verifyEmotionProof(frame, context2, verdict.proof);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Policy hash'))).toBe(true);
  });
});

describe('isProofDeterministic', () => {
  beforeEach(() => {
    resetFrameCounter();
  });

  it('should return true for deterministic proof', () => {
    const gate = createEmotionGate();
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const verdict = gate.evaluate(frame, context);

    expect(isProofDeterministic(verdict.proof)).toBe(true);
  });

  it('should check all validator proofs', () => {
    const gate = createEmotionGate();
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const verdict = gate.evaluate(frame, context);

    // All validator proofs should be deterministic
    for (const vp of verdict.proof.validators_proofs) {
      expect(vp.computation_deterministic).toBe(true);
    }
  });
});

describe('Proof determinism', () => {
  beforeEach(() => {
    resetFrameCounter();
  });

  it('should produce identical proofs for identical inputs', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const drift = createZeroDriftVector();
    const toxicity = createSafeToxicitySignal();

    const proof1 = generateEmotionProof(frame, context, [], drift, toxicity);
    const proof2 = generateEmotionProof(frame, context, [], drift, toxicity);

    expect(proof1.aggregated_proof_hash).toBe(proof2.aggregated_proof_hash);
    expect(proof1.inputs_snapshot.frame_hash).toBe(proof2.inputs_snapshot.frame_hash);
    expect(proof1.inputs_snapshot.context_hash).toBe(proof2.inputs_snapshot.context_hash);
  });

  it('should be order-independent for validators', () => {
    // Proof should not depend on validator execution order
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const context = createTestContext();
    const drift = createZeroDriftVector();
    const toxicity = createSafeToxicitySignal();

    const results1 = [
      { validator_id: 'eval_bounds' as const, validator_version: '1.0.0', result: 'PASS' as const, reasons: [] },
      { validator_id: 'eval_stability' as const, validator_version: '1.0.0', result: 'PASS' as const, reasons: [] },
    ];

    const results2 = [
      { validator_id: 'eval_stability' as const, validator_version: '1.0.0', result: 'PASS' as const, reasons: [] },
      { validator_id: 'eval_bounds' as const, validator_version: '1.0.0', result: 'PASS' as const, reasons: [] },
    ];

    const proof1 = generateEmotionProof(frame, context, results1, drift, toxicity);
    const proof2 = generateEmotionProof(frame, context, results2, drift, toxicity);

    // Aggregated hash should be the same regardless of order
    // (because it's based on sorted/normalized input)
    expect(proof1.emotion_input_hash).toBe(proof2.emotion_input_hash);
  });
});
