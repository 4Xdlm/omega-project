/**
 * OMEGA Emotion Gate — SSOT Compliance Tests
 *
 * CRITICAL: These tests verify the Single Source of Truth principle.
 * EmotionGate OBSERVES, MEASURES, VALIDATES, BLOCKS but NEVER modifies EmotionV2.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEmotionGate } from '../../src/gate/emotion-gate.js';
import { createEmotionVerdictLedger } from '../../src/ledger/verdict-ledger.js';
import { createEmotionPolicyManager } from '../../src/policy/policy-manager.js';
import { verifyEmotionProof } from '../../src/proof/proof-generator.js';
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
  createStableSequence,
  createOscillatingSequence,
  resetFrameCounter,
} from '../helpers/test-fixtures.js';
import type { EmotionFrame, EmotionStateV2 } from '../../src/gate/types.js';

describe('SSOT Compliance - EmotionGate', () => {
  beforeEach(() => {
    resetFrameCounter();
  });

  describe('INV-EG-A3-001: EmotionV2 Immutability', () => {
    it('should NOT modify frame emotion_state after evaluation', () => {
      const gate = createEmotionGate();
      const originalState = { ...NEUTRAL_EMOTION };
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();

      gate.evaluate(frame, context);

      // Verify state is unchanged
      for (const key of Object.keys(originalState) as (keyof EmotionStateV2)[]) {
        expect(frame.emotion_state[key]).toBe(originalState[key]);
      }
    });

    it('should NOT modify frame emotion_state even on DENY', () => {
      const gate = createEmotionGate();
      const invalidState = { ...NEUTRAL_EMOTION, joy: -0.5 };
      const originalState = { ...invalidState };
      const frame = createTestFrame(invalidState);
      const context = createTestContext();

      const verdict = gate.evaluate(frame, context);
      expect(verdict.type).toBe('DENY');

      // Verify state is unchanged (still invalid)
      expect(frame.emotion_state.joy).toBe(-0.5);
      expect(frame.emotion_state).toEqual(originalState);
    });

    it('should NOT correct out-of-bounds values', () => {
      const gate = createEmotionGate();
      const tooHigh = { ...NEUTRAL_EMOTION, anger: 1.5 };
      const frame = createTestFrame(tooHigh);
      const context = createTestContext();

      gate.evaluate(frame, context);

      // Value should NOT be clamped to 1.0
      expect(frame.emotion_state.anger).toBe(1.5);
    });

    it('should NOT modify frame across multiple evaluations', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(HAPPY_EMOTION);
      const originalState = { ...HAPPY_EMOTION };
      const context = createTestContext();

      // Evaluate multiple times
      for (let i = 0; i < 5; i++) {
        gate.evaluate(frame, context);
      }

      // State should remain unchanged
      expect(frame.emotion_state).toEqual(originalState);
    });
  });

  describe('INV-EG-A3-002: No State Calculation', () => {
    it('should NOT create new emotion values', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();

      const verdict = gate.evaluate(frame, context);

      // Verdict should not contain a "corrected" or "calculated" emotion state
      expect((verdict as any).corrected_state).toBeUndefined();
      expect((verdict as any).calculated_emotion).toBeUndefined();
      expect((verdict as any).suggested_emotion).toBeUndefined();
    });

    it('should NOT interpolate emotion values', () => {
      const gate = createEmotionGate();
      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const frame2 = createTestFrame(HAPPY_EMOTION);
      const context = createTestContext({ previous_frame: frame1 });

      const verdict = gate.evaluate(frame2, context);

      // No interpolated state
      expect((verdict as any).interpolated_state).toBeUndefined();
      expect((verdict as any).smoothed_state).toBeUndefined();
    });

    it('should NOT predict next emotion state', () => {
      const gate = createEmotionGate();
      const sequence = createStableSequence(NEUTRAL_EMOTION, 10);

      for (const frame of sequence.frames) {
        const context = createTestContext();
        const verdict = gate.evaluate(frame, context);

        expect((verdict as any).predicted_state).toBeUndefined();
        expect((verdict as any).expected_next).toBeUndefined();
      }
    });
  });

  describe('INV-EG-A3-003: Observe Only', () => {
    it('should only observe drift, not modify it', () => {
      const gate = createEmotionGate();
      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const frame2 = createTestFrame(HAPPY_EMOTION);
      const context = createTestContext({ previous_frame: frame1 });

      const verdict = gate.evaluate(frame2, context);

      // Drift is observed/measured
      expect(verdict.drift_vector.magnitude).toBeGreaterThan(0);

      // But frame states are unchanged
      expect(frame1.emotion_state).toEqual(NEUTRAL_EMOTION);
      expect(frame2.emotion_state).toEqual(HAPPY_EMOTION);
    });

    it('should only observe toxicity, not modify source', () => {
      const gate = createEmotionGate();
      const sequence = createOscillatingSequence(NEUTRAL_EMOTION, ANGRY_EMOTION, 10);
      const context = createTestContext();

      for (let i = 0; i < sequence.frames.length; i++) {
        const frame = sequence.frames[i];
        const ctx = i > 0 ? createTestContext({ previous_frame: sequence.frames[i - 1] }) : context;
        const verdict = gate.evaluate(frame, ctx);

        // Toxicity is observed
        expect(verdict.toxicity_signal).toBeDefined();

        // But frame is unchanged
        const expectedState = i % 2 === 0 ? NEUTRAL_EMOTION : ANGRY_EMOTION;
        expect(frame.emotion_state).toEqual(expectedState);
      }
    });
  });

  describe('INV-EG-A3-004: Block Without Modify', () => {
    it('should DENY invalid state without modifying it', () => {
      const gate = createEmotionGate();
      const invalidState = { ...NEUTRAL_EMOTION, fear: NaN };
      const frame = createTestFrame(invalidState);
      const context = createTestContext();

      const verdict = gate.evaluate(frame, context);

      expect(verdict.type).toBe('DENY');
      expect(Number.isNaN(frame.emotion_state.fear)).toBe(true); // Still NaN
    });

    it('should DENY unstable transition without correcting', () => {
      const gate = createEmotionGate();
      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const frame2 = createTestFrame(ANGRY_EMOTION); // Large jump
      const context = createTestContext({ previous_frame: frame1 });

      const verdict = gate.evaluate(frame2, context);

      expect(verdict.type).toBe('DENY');
      // Original states preserved
      expect(frame1.emotion_state).toEqual(NEUTRAL_EMOTION);
      expect(frame2.emotion_state).toEqual(ANGRY_EMOTION);
    });
  });

  describe('INV-EG-A3-005: Verdict Independence', () => {
    it('should not share state between verdicts', () => {
      const gate = createEmotionGate();
      const frame1 = createTestFrame(NEUTRAL_EMOTION, { entity_id: 'ent_a' });
      const frame2 = createTestFrame(HAPPY_EMOTION, { entity_id: 'ent_b' });
      const context = createTestContext();

      const verdict1 = gate.evaluate(frame1, context);
      const verdict2 = gate.evaluate(frame2, context);

      // Verdicts should be independent
      expect(verdict1.verdict_id).not.toBe(verdict2.verdict_id);
      expect(verdict1.entity_id).not.toBe(verdict2.entity_id);
    });

    it('should not modify previous frame reference', () => {
      const gate = createEmotionGate();
      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const frame2 = createTestFrame(HAPPY_EMOTION);
      const originalFrame1State = { ...frame1.emotion_state };

      const context1 = createTestContext();
      gate.evaluate(frame1, context1);

      const context2 = createTestContext({ previous_frame: frame1 });
      gate.evaluate(frame2, context2);

      // Previous frame should not be modified
      expect(frame1.emotion_state).toEqual(originalFrame1State);
    });
  });
});

describe('SSOT Compliance - Ledger', () => {
  beforeEach(() => {
    resetFrameCounter();
  });

  describe('INV-EG-A3-006: Append-Only', () => {
    it('should preserve verdicts in ledger', () => {
      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      // Use bounds-only policy for predictable verdict type
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });

      const verdict = gate.evaluate(frame, context);
      const entry = ledger.append(verdict);

      // Verify verdict is stored correctly
      const retrieved = ledger.getByVerdictId(verdict.verdict_id);
      expect(retrieved?.verdict.type).toBe(verdict.type);
      expect(retrieved?.verdict.verdict_id).toBe(verdict.verdict_id);
    });

    it('should not allow entry deletion', () => {
      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();

      const verdict = gate.evaluate(frame, context);
      ledger.append(verdict);

      // No delete method should exist
      expect((ledger as any).delete).toBeUndefined();
      expect((ledger as any).remove).toBeUndefined();

      // Count should remain 1
      expect(ledger.getCount()).toBe(1);
    });

    it('should maintain chain integrity', () => {
      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();
      const context = createTestContext();

      for (let i = 0; i < 5; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      const integrity = ledger.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });
  });

  describe('INV-EG-A3-007: No Retroactive Changes', () => {
    it('should not modify past entries when new entry added', () => {
      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();
      const context = createTestContext();

      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const verdict1 = gate.evaluate(frame1, context);
      const entry1 = ledger.append(verdict1);
      const originalHash1 = entry1.entry_hash;

      // Add more entries
      for (let i = 0; i < 3; i++) {
        const frame = createTestFrame(HAPPY_EMOTION);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      // First entry should be unchanged
      const retrieved1 = ledger.getAtIndex(0);
      expect(retrieved1?.entry_hash).toBe(originalHash1);
    });
  });
});

describe('SSOT Compliance - Policy', () => {
  beforeEach(() => {
    resetFrameCounter();
  });

  describe('INV-EG-A3-008: Policy Immutability', () => {
    it('should not modify policy after creation', () => {
      const manager = createEmotionPolicyManager();
      const policy = manager.createPolicy('Immutable Policy');
      const originalHash = policy.hash;

      // Attempt to modify (should fail)
      try {
        (policy as any).name = 'Modified Name';
      } catch {
        // Expected
      }

      // Hash should verify against original
      expect(manager.verifyPolicyHash(policy)).toBe(true);
    });

    it('should create new policy for upgrades', () => {
      const manager = createEmotionPolicyManager();
      const original = manager.createPolicy('Original');
      const upgraded = manager.upgradePolicy(original.policy_id, '2.0.0', {
        name: 'Upgraded',
      });

      // Should be different policies
      expect(upgraded?.policy_id).not.toBe(original.policy_id);

      // Both should exist
      expect(manager.getPolicy(original.policy_id)).toBeDefined();
      expect(manager.getPolicy(upgraded!.policy_id)).toBeDefined();
    });
  });
});

describe('SSOT Compliance - Frame Source', () => {
  beforeEach(() => {
    resetFrameCounter();
  });

  describe('INV-EG-A3-009: Source Validation', () => {
    it('should reject frames with invalid source', () => {
      const gate = createEmotionGate();
      const frame = {
        ...createTestFrame(NEUTRAL_EMOTION),
        source: 'InvalidSource',
      } as any;
      const context = createTestContext();

      const verdict = gate.evaluate(frame, context);

      expect(verdict.type).toBe('DENY');
      expect(
        verdict.validators_results.some(
          r => r.validator_id === 'eval_bounds' && r.result === 'FAIL'
        )
      ).toBe(true);
    });

    it('should accept only EmotionV2 source', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      // Use bounds-only policy to get clear ALLOW (avoids DEFER from sequence validators)
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });

      expect(frame.source).toBe('EmotionV2');

      const verdict = gate.evaluate(frame, context);
      expect(verdict.type).toBe('ALLOW');
    });
  });
});

describe('SSOT Compliance - Determinism', () => {
  beforeEach(() => {
    resetFrameCounter();
  });

  describe('INV-EG-A3-010: Deterministic Evaluation', () => {
    it('should produce same verdict for same input', () => {
      // Note: Each evaluation gets a new frame due to counter, so we need same frame
      const state = { ...NEUTRAL_EMOTION };
      const frame = createTestFrame(state);
      // Use bounds-only policy for deterministic results
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });

      const gate1 = createEmotionGate();
      const gate2 = createEmotionGate();

      const verdict1 = gate1.evaluate(frame, context);
      const verdict2 = gate2.evaluate(frame, context);

      // Type should be same
      expect(verdict1.type).toBe(verdict2.type);

      // Validator results should match
      expect(verdict1.validators_results.length).toBe(verdict2.validators_results.length);
      for (let i = 0; i < verdict1.validators_results.length; i++) {
        expect(verdict1.validators_results[i].result).toBe(verdict2.validators_results[i].result);
      }
    });

    it('should produce same drift for same frames', () => {
      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const frame2 = createTestFrame(HAPPY_EMOTION);
      const context = createTestContext({ previous_frame: frame1 });

      const gate1 = createEmotionGate();
      const gate2 = createEmotionGate();

      const verdict1 = gate1.evaluate(frame2, context);
      const verdict2 = gate2.evaluate(frame2, context);

      expect(verdict1.drift_vector.magnitude).toBe(verdict2.drift_vector.magnitude);
    });
  });

  describe('INV-EG-A3-011: No Side Effects', () => {
    it('should not modify gate state visible externally', () => {
      const gate = createEmotionGate();
      const frame = createTestFrame(NEUTRAL_EMOTION);
      const context = createTestContext();

      const validatorsBefore = gate.getValidators().length;
      const calibrationBefore = { ...gate.getCalibration() };

      gate.evaluate(frame, context);

      expect(gate.getValidators().length).toBe(validatorsBefore);
      // Calibration values should be same (check a few)
      expect(gate.getCalibration()).toEqual(calibrationBefore);
    });
  });

  describe('INV-EG-A3-012: Proof Reproducibility', () => {
    it('should generate reproducible proofs', () => {
      const frame = createTestFrame(NEUTRAL_EMOTION);
      // Use bounds-only policy for consistent proofs
      const policy = createTestPolicy({ validators: ['eval_bounds'] });
      const context = createTestContext({ policy });

      const gate = createEmotionGate();
      const verdict = gate.evaluate(frame, context);

      // Verify proof can be reproduced
      const verifyResult = verifyEmotionProof(frame, context, verdict.proof);

      expect(verifyResult.valid).toBe(true);
    });
  });
});
