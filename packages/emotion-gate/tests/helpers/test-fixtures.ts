/**
 * OMEGA Emotion Gate — Test Fixtures
 *
 * Shared test data and helpers.
 */

import type {
  EmotionStateV2,
  EmotionFrame,
  EmotionSequence,
  EmotionPolicy,
  EmotionGateContext,
  EmotionCalibration,
  Axiom,
  FrameId,
  EmotionPolicyId,
} from '../../src/gate/types.js';
import { DEFAULT_EMOTION_CALIBRATION } from '../../src/gate/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION STATES
// ═══════════════════════════════════════════════════════════════════════════════

export const NEUTRAL_EMOTION: EmotionStateV2 = {
  joy: 0.5,
  trust: 0.5,
  fear: 0.5,
  surprise: 0.5,
  sadness: 0.5,
  disgust: 0.5,
  anger: 0.5,
  anticipation: 0.5,
  love: 0.5,
  submission: 0.5,
  awe: 0.5,
  disapproval: 0.5,
  remorse: 0.5,
  contempt: 0.5,
};

export const HAPPY_EMOTION: EmotionStateV2 = {
  joy: 0.9,
  trust: 0.8,
  fear: 0.1,
  surprise: 0.3,
  sadness: 0.1,
  disgust: 0.1,
  anger: 0.1,
  anticipation: 0.7,
  love: 0.8,
  submission: 0.3,
  awe: 0.5,
  disapproval: 0.1,
  remorse: 0.1,
  contempt: 0.1,
};

export const SAD_EMOTION: EmotionStateV2 = {
  joy: 0.1,
  trust: 0.3,
  fear: 0.4,
  surprise: 0.2,
  sadness: 0.9,
  disgust: 0.3,
  anger: 0.2,
  anticipation: 0.2,
  love: 0.3,
  submission: 0.6,
  awe: 0.2,
  disapproval: 0.4,
  remorse: 0.7,
  contempt: 0.2,
};

export const ANGRY_EMOTION: EmotionStateV2 = {
  joy: 0.1,
  trust: 0.1,
  fear: 0.3,
  surprise: 0.2,
  sadness: 0.3,
  disgust: 0.7,
  anger: 0.9,
  anticipation: 0.6,
  love: 0.1,
  submission: 0.1,
  awe: 0.1,
  disapproval: 0.8,
  remorse: 0.2,
  contempt: 0.8,
};

export const ZERO_EMOTION: EmotionStateV2 = {
  joy: 0,
  trust: 0,
  fear: 0,
  surprise: 0,
  sadness: 0,
  disgust: 0,
  anger: 0,
  anticipation: 0,
  love: 0,
  submission: 0,
  awe: 0,
  disapproval: 0,
  remorse: 0,
  contempt: 0,
};

export const MAX_EMOTION: EmotionStateV2 = {
  joy: 1,
  trust: 1,
  fear: 1,
  surprise: 1,
  sadness: 1,
  disgust: 1,
  anger: 1,
  anticipation: 1,
  love: 1,
  submission: 1,
  awe: 1,
  disapproval: 1,
  remorse: 1,
  contempt: 1,
};

// ═══════════════════════════════════════════════════════════════════════════════
// FRAME HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

let frameCounter = 0;

export function createTestFrame(
  emotion_state: EmotionStateV2,
  options: {
    entity_id?: string;
    timestamp?: number;
    evidence_refs?: readonly string[];
    previous_frame_id?: FrameId;
  } = {}
): EmotionFrame {
  frameCounter++;
  const frameId: FrameId = `frm_test_${frameCounter.toString().padStart(6, '0')}`;

  return {
    frame_id: frameId,
    entity_id: options.entity_id ?? 'ent_test_001' as any,
    emotion_state,
    timestamp: options.timestamp ?? Date.now(),
    source: 'EmotionV2',
    evidence_refs: (options.evidence_refs ?? []) as any,
    previous_frame_id: options.previous_frame_id,
  };
}

export function createFrameWithJitter(
  base: EmotionStateV2,
  jitter: number,
  options?: Parameters<typeof createTestFrame>[1]
): EmotionFrame {
  const state = { ...base };
  for (const key of Object.keys(state) as (keyof EmotionStateV2)[]) {
    const adjustment = (Math.random() - 0.5) * 2 * jitter;
    state[key] = Math.max(0, Math.min(1, base[key] + adjustment));
  }
  return createTestFrame(state as EmotionStateV2, options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function createTestSequence(
  frames: EmotionFrame[],
  entity_id?: string
): EmotionSequence {
  return {
    sequence_id: `seq_test_${Date.now()}`,
    entity_id: entity_id ?? frames[0]?.entity_id ?? 'ent_test_001' as any,
    frames,
  };
}

export function createStableSequence(
  state: EmotionStateV2,
  length: number,
  jitter: number = 0.01
): EmotionSequence {
  const frames: EmotionFrame[] = [];
  for (let i = 0; i < length; i++) {
    frames.push(createFrameWithJitter(state, jitter, {
      timestamp: Date.now() + i * 1000,
    }));
  }
  return createTestSequence(frames);
}

export function createOscillatingSequence(
  state1: EmotionStateV2,
  state2: EmotionStateV2,
  length: number
): EmotionSequence {
  const frames: EmotionFrame[] = [];
  for (let i = 0; i < length; i++) {
    const state = i % 2 === 0 ? state1 : state2;
    frames.push(createTestFrame(state, {
      timestamp: Date.now() + i * 1000,
    }));
  }
  return createTestSequence(frames);
}

export function createTransitionSequence(
  from: EmotionStateV2,
  to: EmotionStateV2,
  steps: number
): EmotionSequence {
  const frames: EmotionFrame[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const state: Record<string, number> = {};
    for (const key of Object.keys(from) as (keyof EmotionStateV2)[]) {
      state[key] = from[key] + (to[key] - from[key]) * t;
    }
    frames.push(createTestFrame(state as EmotionStateV2, {
      timestamp: Date.now() + i * 1000,
    }));
  }
  return createTestSequence(frames);
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function createTestPolicy(
  options: {
    validators?: string[];
    rules?: Partial<EmotionPolicy['rules']>;
    thresholds?: Partial<EmotionPolicy['thresholds']>;
  } = {}
): EmotionPolicy {
  const policyId: EmotionPolicyId = `epol_test_${Date.now()}`;

  return {
    policy_id: policyId,
    version: '1.0.0',
    name: 'Test Policy',
    validators: (options.validators ?? [
      'eval_bounds',
      'eval_stability',
      'eval_causality',
      'eval_amplification',
      'eval_axiom_compat',
      'eval_drift_vector',
      'eval_toxicity',
      'eval_coherence',
    ]) as any,
    rules: {
      require_all_pass: true,
      allow_defer: true,
      fail_on_toxicity: true,
      fail_on_drift_above_threshold: false,
      require_causality_for_changes: true,
      ...options.rules,
    },
    thresholds: {
      stability_threshold: 0.2,
      delta_max: 0.4,
      amplification_cycles: 3,
      toxicity_threshold: 0.6,
      drift_threshold: 0.3,
      ...options.thresholds,
    },
    hash: `rh_test_policy_${Date.now()}` as any,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function createTestContext(
  options: {
    policy?: EmotionPolicy;
    calibration?: EmotionCalibration;
    axioms?: Axiom[];
    previous_frame?: EmotionFrame;
  } = {}
): EmotionGateContext {
  return {
    policy: options.policy ?? createTestPolicy(),
    calibration: options.calibration ?? DEFAULT_EMOTION_CALIBRATION,
    axioms: options.axioms ?? [],
    narrative_context: undefined,
    previous_frame: options.previous_frame,
    related_entities: undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXIOM HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function createTestAxiom(
  constraint: string,
  dimensions: (keyof EmotionStateV2)[]
): Axiom {
  return {
    axiom_id: `axiom_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    constraint,
    affected_dimensions: dimensions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVALID STATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function createInvalidEmotionState(type: 'negative' | 'over_one' | 'nan' | 'missing'): any {
  switch (type) {
    case 'negative':
      return { ...NEUTRAL_EMOTION, joy: -0.5 };
    case 'over_one':
      return { ...NEUTRAL_EMOTION, joy: 1.5 };
    case 'nan':
      return { ...NEUTRAL_EMOTION, joy: NaN };
    case 'missing':
      const { joy, ...rest } = NEUTRAL_EMOTION;
      return rest;
  }
}

export function createInvalidFrame(type: 'wrong_source' | 'invalid_state'): any {
  const baseFrame = createTestFrame(NEUTRAL_EMOTION);

  switch (type) {
    case 'wrong_source':
      return { ...baseFrame, source: 'InvalidSource' };
    case 'invalid_state':
      return { ...baseFrame, emotion_state: createInvalidEmotionState('negative') };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET HELPER
// ═══════════════════════════════════════════════════════════════════════════════

export function resetFrameCounter(): void {
  frameCounter = 0;
}
