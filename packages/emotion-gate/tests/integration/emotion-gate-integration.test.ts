/**
 * OMEGA Emotion Gate — Integration Tests
 *
 * End-to-end integration tests for the complete emotion gate pipeline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEmotionGate } from '../../src/gate/emotion-gate.js';
import { createEmotionVerdictLedger, EmotionVerdictLedger } from '../../src/ledger/verdict-ledger.js';
import { createEmotionPolicyManager, EmotionPolicyManager } from '../../src/policy/policy-manager.js';
import { verifyEmotionProof } from '../../src/proof/proof-generator.js';
import {
  NEUTRAL_EMOTION,
  HAPPY_EMOTION,
  SAD_EMOTION,
  ANGRY_EMOTION,
  createTestFrame,
  createStableSequence,
  createOscillatingSequence,
  createTransitionSequence,
  createTestAxiom,
  resetFrameCounter,
} from '../helpers/test-fixtures.js';

describe('EmotionGate Integration', () => {
  beforeEach(() => {
    resetFrameCounter();
  });

  describe('Full Pipeline: Gate → Ledger → Policy', () => {
    it('should process valid frame through entire pipeline', () => {
      const manager = createEmotionPolicyManager();
      // Use permissive policy to avoid DEFER from sequence-dependent validators
      const policy = manager.createPermissivePolicy();
      const context = manager.createContext(policy);

      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();

      const frame = createTestFrame(NEUTRAL_EMOTION);
      const verdict = gate.evaluate(frame, context);
      const entry = ledger.append(verdict);

      expect(verdict.type).toBe('ALLOW');
      expect(entry.index).toBe(0);
      expect(ledger.verifyIntegrity().valid).toBe(true);
    });

    it('should process sequence of frames', () => {
      const manager = createEmotionPolicyManager();
      // Use permissive policy for predictable ALLOW
      const policy = manager.createPermissivePolicy();

      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();

      const sequence = createStableSequence(NEUTRAL_EMOTION, 10);
      let previousFrame: any = undefined;

      for (const frame of sequence.frames) {
        const context = manager.createContext(
          policy,
          undefined,
          undefined,
          undefined,
          previousFrame
        );
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
        previousFrame = frame;
      }

      expect(ledger.getCount()).toBe(10);
      expect(ledger.verifyIntegrity().valid).toBe(true);

      const stats = ledger.getStats();
      expect(stats.allow_count).toBe(10);
      expect(stats.deny_count).toBe(0);
    });

    it('should block invalid frames', () => {
      const manager = createEmotionPolicyManager();
      const policy = manager.createDefaultPolicy();
      const context = manager.createContext(policy);

      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();

      const invalidFrame = createTestFrame({ ...NEUTRAL_EMOTION, joy: -0.5 });
      const verdict = gate.evaluate(invalidFrame, context);
      ledger.append(verdict);

      expect(verdict.type).toBe('DENY');
      expect(ledger.getStats().deny_count).toBe(1);
    });
  });

  describe('Policy Enforcement', () => {
    it('should enforce strict policy', () => {
      const manager = createEmotionPolicyManager();
      const policy = manager.createStrictPolicy();

      const gate = createEmotionGate();

      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const frame2 = createTestFrame(HAPPY_EMOTION); // Large change

      const context1 = manager.createContext(policy);
      const context2 = manager.createContext(policy, undefined, undefined, undefined, frame1);

      gate.evaluate(frame1, context1);
      const verdict2 = gate.evaluate(frame2, context2);

      // Strict policy should deny large change
      expect(verdict2.type).toBe('DENY');
    });

    it('should enforce permissive policy', () => {
      const manager = createEmotionPolicyManager();
      const policy = manager.createPermissivePolicy();

      const gate = createEmotionGate();

      const frame1 = createTestFrame(NEUTRAL_EMOTION);
      const frame2 = createTestFrame(HAPPY_EMOTION);

      const context1 = manager.createContext(policy);
      const context2 = manager.createContext(policy, undefined, undefined, undefined, frame1);

      gate.evaluate(frame1, context1);
      const verdict2 = gate.evaluate(frame2, context2);

      // Permissive policy only checks bounds
      expect(verdict2.type).toBe('ALLOW');
    });

    it('should enforce axiom constraints', () => {
      const manager = createEmotionPolicyManager();
      // Use permissive + axiom validator for clear results
      const policy = manager.createPermissivePolicy();
      // Add axiom_compat to the permissive policy validators
      const policyWithAxiom = {
        ...policy,
        validators: ['eval_bounds', 'eval_axiom_compat'] as any,
      };
      const axiom = createTestAxiom('anger < 0.3', ['anger']);

      const gate = createEmotionGate();

      // Valid frame (anger within constraint)
      const frame1 = createTestFrame({ ...NEUTRAL_EMOTION, anger: 0.2 });
      const context1 = manager.createContext(policyWithAxiom, undefined, [axiom]);
      const verdict1 = gate.evaluate(frame1, context1);
      expect(verdict1.type).toBe('ALLOW');

      // Invalid frame (anger violates constraint)
      const frame2 = createTestFrame({ ...NEUTRAL_EMOTION, anger: 0.8 });
      const context2 = manager.createContext(policyWithAxiom, undefined, [axiom]);
      const verdict2 = gate.evaluate(frame2, context2);
      expect(verdict2.type).toBe('DENY');
    });
  });

  describe('Proof Verification', () => {
    it('should generate and verify proof', () => {
      const manager = createEmotionPolicyManager();
      const policy = manager.createDefaultPolicy();
      const context = manager.createContext(policy);

      const gate = createEmotionGate();

      const frame = createTestFrame(NEUTRAL_EMOTION);
      const verdict = gate.evaluate(frame, context);

      const verification = verifyEmotionProof(frame, context, verdict.proof);

      expect(verification.valid).toBe(true);
      expect(verification.errors).toHaveLength(0);
    });

    it('should detect proof tampering', () => {
      const manager = createEmotionPolicyManager();
      const policy = manager.createDefaultPolicy();
      const context = manager.createContext(policy);

      const gate = createEmotionGate();

      const frame = createTestFrame(NEUTRAL_EMOTION);
      const verdict = gate.evaluate(frame, context);

      // Tamper with frame
      const tamperedFrame = createTestFrame(HAPPY_EMOTION);

      const verification = verifyEmotionProof(tamperedFrame, context, verdict.proof);

      expect(verification.valid).toBe(false);
      expect(verification.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics and Statistics', () => {
    it('should track gate metrics', () => {
      const manager = createEmotionPolicyManager();
      // Use permissive policy for predictable ALLOW
      const policy = manager.createPermissivePolicy();
      const context = manager.createContext(policy);

      const gate = createEmotionGate();

      // Process multiple frames
      for (let i = 0; i < 5; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        gate.evaluate(frame, context);
      }

      const metrics = gate.getMetrics();

      expect(metrics.total_evaluations).toBe(5);
      expect(metrics.allow_count).toBe(5);
      expect(metrics.drift_stats.total_measurements).toBe(5);
    });

    it('should track ledger statistics', () => {
      const manager = createEmotionPolicyManager();
      // Use permissive policy for predictable ALLOW/DENY
      const policy = manager.createPermissivePolicy();
      const context = manager.createContext(policy);

      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();

      // Process valid frames
      for (let i = 0; i < 3; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      // Process invalid frame
      const invalidFrame = createTestFrame({ ...NEUTRAL_EMOTION, fear: NaN });
      const invalidVerdict = gate.evaluate(invalidFrame, context);
      ledger.append(invalidVerdict);

      const stats = ledger.getStats();

      expect(stats.total_entries).toBe(4);
      expect(stats.allow_count).toBe(3);
      expect(stats.deny_count).toBe(1);
    });
  });

  describe('Verdict Explanation', () => {
    it('should explain ALLOW verdict', () => {
      const manager = createEmotionPolicyManager();
      // Use permissive policy for predictable ALLOW
      const policy = manager.createPermissivePolicy();
      const context = manager.createContext(policy);

      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();

      const frame = createTestFrame(NEUTRAL_EMOTION);
      const verdict = gate.evaluate(frame, context);
      ledger.append(verdict);

      const explanation = ledger.explainVerdict(verdict.verdict_id);

      expect(explanation).toBeDefined();
      expect(explanation?.summary).toContain('passed');
    });

    it('should explain DENY verdict', () => {
      const manager = createEmotionPolicyManager();
      const policy = manager.createDefaultPolicy();
      const context = manager.createContext(policy);

      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();

      const invalidFrame = createTestFrame({ ...NEUTRAL_EMOTION, contempt: 1.5 });
      const verdict = gate.evaluate(invalidFrame, context);
      ledger.append(verdict);

      const explanation = ledger.explainVerdict(verdict.verdict_id);

      expect(explanation).toBeDefined();
      expect(explanation?.summary).toContain('blocked');
    });
  });

  describe('Export and Import', () => {
    it('should export and import ledger', () => {
      const manager = createEmotionPolicyManager();
      // Use permissive policy for predictable results
      const policy = manager.createPermissivePolicy();
      const context = manager.createContext(policy);

      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();

      // Process frames
      for (let i = 0; i < 5; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      // Export
      const json = ledger.exportToJSON();

      // Import
      const imported = EmotionVerdictLedger.importFromJSON(json);

      expect(imported.getCount()).toBe(5);
      expect(imported.verifyIntegrity().valid).toBe(true);
    });

    it('should export and import policies', () => {
      const manager = createEmotionPolicyManager();
      manager.createDefaultPolicy();
      const strict = manager.createStrictPolicy();
      manager.setActivePolicy(strict.policy_id);

      // Export
      const json = manager.exportToJSON();

      // Import
      const imported = EmotionPolicyManager.importFromJSON(json);

      expect(imported.getAllPolicies()).toHaveLength(2);
      expect(imported.getActivePolicy()?.policy_id).toBe(strict.policy_id);
    });
  });

  describe('Multi-Entity Scenarios', () => {
    it('should handle multiple entities independently', () => {
      const manager = createEmotionPolicyManager();
      // Use permissive policy for predictable ALLOW
      const policy = manager.createPermissivePolicy();

      const gate = createEmotionGate();
      const ledger = createEmotionVerdictLedger();

      // Entity A: stable
      for (let i = 0; i < 5; i++) {
        const frame = createTestFrame(NEUTRAL_EMOTION, { entity_id: 'ent_a' });
        const context = manager.createContext(policy);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      // Entity B: stable but different state
      for (let i = 0; i < 5; i++) {
        const frame = createTestFrame(HAPPY_EMOTION, { entity_id: 'ent_b' });
        const context = manager.createContext(policy);
        const verdict = gate.evaluate(frame, context);
        ledger.append(verdict);
      }

      const statsA = ledger.getByEntityId('ent_a' as any);
      const statsB = ledger.getByEntityId('ent_b' as any);

      expect(statsA).toHaveLength(5);
      expect(statsB).toHaveLength(5);
    });
  });
});
