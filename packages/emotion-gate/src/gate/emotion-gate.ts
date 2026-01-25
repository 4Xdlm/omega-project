/**
 * OMEGA Emotion Gate — Core Engine
 *
 * The EmotionGate is a validation layer that OBSERVES, MEASURES, VALIDATES, and BLOCKS
 * emotional states. It NEVER modifies EmotionV2 (SSOT principle).
 *
 * Pipeline: EmotionV2 → EmotionGate → TruthGate → Memory
 */

import type {
  EmotionFrame,
  EmotionGateContext,
  EmotionVerdict,
  EmotionVerdictId,
  EmotionVerdictType,
  EmotionEnforceResult,
  EmotionEnforceAction,
  EmotionValidatorResult,
  EmotionPolicy,
  EmotionCalibration,
  EmotionSequence,
  DriftVector,
  ToxicitySignal,
  EmotionProof,
  EmotionGateMetrics,
  DriftStatistics,
  ToxicityStatistics,
} from './types.js';
import { DEFAULT_EMOTION_CALIBRATION } from './types.js';
import type { EmotionValidator } from '../validators/validator-interface.js';
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
} from '../validators/index.js';
import { computeDriftVector, createZeroDriftVector } from '../metrics/drift-metrics.js';
import { computeToxicitySignal, createSafeToxicitySignal } from '../metrics/toxicity-metrics.js';
import { generateEmotionProof } from '../proof/proof-generator.js';

/**
 * Generate a unique verdict ID.
 */
function generateVerdictId(): EmotionVerdictId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `evrd_${timestamp}_${random}`;
}

/**
 * Compute emotion hash from frame.
 */
function computeEmotionHash(frame: EmotionFrame): `rh_${string}` {
  // Simple hash based on frame data
  const data = JSON.stringify({
    frame_id: frame.frame_id,
    entity_id: frame.entity_id,
    emotion_state: frame.emotion_state,
    timestamp: frame.timestamp,
  });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `rh_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * Compute verdict hash.
 */
function computeVerdictHash(
  verdictId: EmotionVerdictId,
  type: EmotionVerdictType,
  results: readonly EmotionValidatorResult[]
): `rh_${string}` {
  const data = JSON.stringify({
    verdict_id: verdictId,
    type,
    results: results.map(r => ({
      validator_id: r.validator_id,
      result: r.result,
    })),
  });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `rh_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * EmotionGate — Core validation engine.
 *
 * SSOT PRINCIPLE: This gate OBSERVES, MEASURES, VALIDATES, BLOCKS
 * but NEVER modifies EmotionV2.
 */
export class EmotionGate {
  private readonly validators: EmotionValidator[];
  private readonly calibration: EmotionCalibration;
  private sequences: Map<string, EmotionSequence> = new Map();
  private metrics: EmotionGateMetrics;

  constructor(calibration: EmotionCalibration = DEFAULT_EMOTION_CALIBRATION) {
    this.calibration = calibration;

    // Initialize all 8 validators
    this.validators = [
      createBoundsValidator(),
      createStabilityValidator(),
      createCausalityValidator(),
      createAmplificationValidator(),
      createAxiomCompatValidator(),
      createDriftVectorValidator(),
      createToxicityValidator(),
      createCoherenceValidator(),
    ];

    // Initialize metrics
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Create empty metrics.
   */
  private createEmptyMetrics(): EmotionGateMetrics {
    return {
      total_evaluations: 0,
      allow_count: 0,
      deny_count: 0,
      defer_count: 0,
      drift_stats: {
        total_measurements: 0,
        average_magnitude: 0,
        max_magnitude: 0,
        threshold_violations: 0,
      },
      toxicity_stats: {
        total_checks: 0,
        amplification_detected_count: 0,
        average_instability: 0,
        max_cycles_detected: 0,
      },
    };
  }

  /**
   * Register a frame in the entity's sequence (for temporal validators).
   */
  registerFrame(frame: EmotionFrame): void {
    const entityId = frame.entity_id;
    let sequence = this.sequences.get(entityId);

    if (!sequence) {
      sequence = {
        sequence_id: `seq_${entityId}_${Date.now().toString(36)}`,
        entity_id: entityId,
        frames: [],
      };
      this.sequences.set(entityId, sequence);
    }

    // Append frame (immutable update)
    this.sequences.set(entityId, {
      ...sequence,
      frames: [...sequence.frames, frame],
    });
  }

  /**
   * Get sequence for an entity.
   */
  getSequence(entityId: string): EmotionSequence | undefined {
    return this.sequences.get(entityId);
  }

  /**
   * Clear sequence for an entity.
   */
  clearSequence(entityId: string): void {
    this.sequences.delete(entityId);
  }

  /**
   * Evaluate a frame against all validators.
   * Returns a verdict with proof.
   */
  evaluate(frame: EmotionFrame, context: EmotionGateContext): EmotionVerdict {
    // Register frame in sequence
    this.registerFrame(frame);

    // Get sequence for temporal validators
    const sequence = this.sequences.get(frame.entity_id);

    // Configure sequence-aware validators
    for (const validator of this.validators) {
      if (validator instanceof VEmoAmplificationValidator && sequence) {
        validator.setSequence(sequence);
      }
      if (validator instanceof VEmoToxicityValidator && sequence) {
        validator.setSequence(sequence);
      }
    }

    // Run all validators
    const results: EmotionValidatorResult[] = [];
    for (const validator of this.validators) {
      // Only run validators in policy
      if (!context.policy.validators.includes(validator.id)) {
        continue;
      }
      const result = validator.evaluate(frame, context);
      results.push(result);
    }

    // Compute drift vector
    const drift = context.previous_frame
      ? computeDriftVector(context.previous_frame, frame)
      : createZeroDriftVector();

    // Compute toxicity signal
    const toxicity = computeToxicitySignal(frame, sequence, context.calibration);

    // Determine verdict type based on policy rules
    const verdictType = this.computeVerdictType(results, context, toxicity, drift);

    // Generate verdict ID
    const verdictId = generateVerdictId();

    // Compute hashes
    const emotionHash = computeEmotionHash(frame);
    const verdictHash = computeVerdictHash(verdictId, verdictType, results);

    // Generate proof
    const proof = generateEmotionProof(frame, context, results, drift, toxicity);

    // Create verdict
    const verdict: EmotionVerdict = {
      verdict_id: verdictId,
      frame_id: frame.frame_id,
      entity_id: frame.entity_id,
      type: verdictType,
      validators_results: results,
      policy_id: context.policy.policy_id,
      policy_hash: context.policy.hash,
      emotion_hash: emotionHash,
      drift_vector: drift,
      toxicity_signal: toxicity,
      proof,
      timestamp: Date.now(),
      verdict_hash: verdictHash,
    };

    // Update metrics
    this.updateMetrics(verdictType, drift, toxicity);

    return verdict;
  }

  /**
   * Compute verdict type based on validator results and policy rules.
   */
  private computeVerdictType(
    results: readonly EmotionValidatorResult[],
    context: EmotionGateContext,
    toxicity: ToxicitySignal,
    drift: DriftVector
  ): EmotionVerdictType {
    const rules = context.policy.rules;
    const thresholds = context.policy.thresholds;

    // Check for failures
    const failures = results.filter(r => r.result === 'FAIL');
    const defers = results.filter(r => r.result === 'DEFER');

    // Fail on toxicity if configured
    if (rules.fail_on_toxicity && toxicity.amplification_detected) {
      return 'DENY';
    }

    // Fail on drift above threshold if configured
    if (rules.fail_on_drift_above_threshold && drift.magnitude > thresholds.drift_threshold) {
      return 'DENY';
    }

    // Require all pass
    if (rules.require_all_pass && failures.length > 0) {
      return 'DENY';
    }

    // Allow defer
    if (rules.allow_defer && defers.length > 0 && failures.length === 0) {
      return 'DEFER';
    }

    // No failures and either no defers or defers not blocking
    if (failures.length === 0) {
      return 'ALLOW';
    }

    return 'DENY';
  }

  /**
   * Update internal metrics.
   */
  private updateMetrics(
    verdictType: EmotionVerdictType,
    drift: DriftVector,
    toxicity: ToxicitySignal
  ): void {
    this.metrics = {
      ...this.metrics,
      total_evaluations: this.metrics.total_evaluations + 1,
      allow_count: this.metrics.allow_count + (verdictType === 'ALLOW' ? 1 : 0),
      deny_count: this.metrics.deny_count + (verdictType === 'DENY' ? 1 : 0),
      defer_count: this.metrics.defer_count + (verdictType === 'DEFER' ? 1 : 0),
      drift_stats: this.updateDriftStats(drift),
      toxicity_stats: this.updateToxicityStats(toxicity),
    };
  }

  /**
   * Update drift statistics.
   */
  private updateDriftStats(drift: DriftVector): DriftStatistics {
    const prev = this.metrics.drift_stats;
    const n = prev.total_measurements;
    const newAvg = (prev.average_magnitude * n + drift.magnitude) / (n + 1);
    const driftThreshold = this.calibration[Symbol.for('OMEGA_EMO_DRIFT_THRESHOLD') as keyof EmotionCalibration] as number || 0.3;

    return {
      total_measurements: n + 1,
      average_magnitude: newAvg,
      max_magnitude: Math.max(prev.max_magnitude, drift.magnitude),
      threshold_violations: prev.threshold_violations + (drift.magnitude > driftThreshold ? 1 : 0),
    };
  }

  /**
   * Update toxicity statistics.
   */
  private updateToxicityStats(toxicity: ToxicitySignal): ToxicityStatistics {
    const prev = this.metrics.toxicity_stats;
    const n = prev.total_checks;
    const newAvgInstability = (prev.average_instability * n + toxicity.instability_score) / (n + 1);

    return {
      total_checks: n + 1,
      amplification_detected_count: prev.amplification_detected_count + (toxicity.amplification_detected ? 1 : 0),
      average_instability: newAvgInstability,
      max_cycles_detected: Math.max(prev.max_cycles_detected, toxicity.amplification_cycles),
    };
  }

  /**
   * Enforce a verdict (apply action).
   */
  enforce(verdict: EmotionVerdict): EmotionEnforceResult {
    let action: EmotionEnforceAction;

    switch (verdict.type) {
      case 'ALLOW':
        action = 'PASSED';
        break;
      case 'DENY':
        action = 'BLOCKED';
        break;
      case 'DEFER':
        action = 'DEFERRED';
        break;
    }

    return {
      verdict,
      action,
    };
  }

  /**
   * Get current metrics.
   */
  getMetrics(): EmotionGateMetrics {
    return this.metrics;
  }

  /**
   * Reset metrics.
   */
  resetMetrics(): void {
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Get validators.
   */
  getValidators(): readonly EmotionValidator[] {
    return this.validators;
  }

  /**
   * Get calibration.
   */
  getCalibration(): EmotionCalibration {
    return this.calibration;
  }
}

/**
 * Create an EmotionGate instance.
 */
export function createEmotionGate(
  calibration: EmotionCalibration = DEFAULT_EMOTION_CALIBRATION
): EmotionGate {
  return new EmotionGate(calibration);
}
