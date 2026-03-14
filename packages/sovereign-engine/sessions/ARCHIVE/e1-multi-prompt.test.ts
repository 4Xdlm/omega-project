/**
 * ===============================================================================
 * OMEGA SOVEREIGN STYLE ENGINE — E1 Multi-Prompt Tests (W5b)
 * ===============================================================================
 *
 * Phase T — W5b: E1 Multi-Prompt Runner
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * CALC-only tests — mock provider, 0 HTTP calls.
 *
 * Invariants:
 * - E1-MP-01: computeChecksum is deterministic (same input -> same hash)
 * - E1-MP-02: validateContinuityPlan rejects invalid plans
 * - E1-MP-03: tension_curve.length must be exactly 10
 * - E1-MP-04: applyStateDelta produces correct state transitions
 * - E1-MP-05: runE1MultiPrompt falls back on invalid plan
 * - E1-MP-06: validateStateDelta rejects malformed deltas
 *
 * ===============================================================================
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateContinuityPlan,
  computeChecksum,
  createInitialState,
  applyStateDelta,
  validateStateDelta,
  type ContinuityPlanJSON,
  type ContinuityState,
  type StateDelta,
} from '../../src/validation/continuity-plan.js';
import { runE1MultiPrompt } from '../../src/validation/e1-multi-prompt-runner.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import type { LLMProvider, LLMProviderResult } from '../../src/validation/validation-types.js';

// ===============================================================================
// TEST FIXTURES
// ===============================================================================

function makeValidPlan(): Omit<ContinuityPlanJSON, 'checksum'> {
  return {
    plan_id: 'plan_test_001',
    experiment_id: 'E1_continuity_impossible',
    scene_count: 10,
    tension_curve: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    scenes: Array.from({ length: 10 }, (_, i) => ({
      scene_index: i,
      emotional_target: `emotion_${i}`,
      narrative_beat: `beat_${i}`,
      sensory_anchor: `anchor_${i}`,
      tension_target: (i + 1) / 10,
    })),
    global_arc: 'Arc narratif de test',
  };
}

function makeValidPlanWithChecksum(): ContinuityPlanJSON {
  const plan = makeValidPlan();
  return { ...plan, checksum: computeChecksum(plan) };
}

function makeSceneResponse(sceneIndex: number): string {
  return JSON.stringify({
    prose: `Prose de la scene ${sceneIndex + 1}. Le vent soufflait.`,
    state_delta: {
      advance_scene: true,
      set: { protagonist: `state_after_scene_${sceneIndex}` },
    },
  });
}

function makeMockProvider(options?: {
  planResponse?: string;
  sceneResponses?: string[];
  failPlan?: boolean;
  failSceneAt?: number;
}): LLMProvider {
  const plan = makeValidPlanWithChecksum();
  const planJson = options?.planResponse ?? JSON.stringify(plan);

  let generateTextCallCount = 0;

  return {
    model_id: 'mock-model-test',

    generateText: vi.fn().mockImplementation(async (_prompt: string, _maxTokens: number, seed: string) => {
      generateTextCallCount++;

      // First call is plan
      if (seed.startsWith('plan_')) {
        if (options?.failPlan) return 'not valid json';
        return planJson;
      }

      // Scene calls
      const sceneMatch = seed.match(/^scene_(\d+)_/);
      if (sceneMatch) {
        const sceneIdx = parseInt(sceneMatch[1], 10);
        if (options?.failSceneAt === sceneIdx) return 'not valid json';
        if (options?.sceneResponses && options.sceneResponses[sceneIdx]) {
          return options.sceneResponses[sceneIdx];
        }
        return makeSceneResponse(sceneIdx);
      }

      return 'unexpected call';
    }),

    generateDraft: vi.fn().mockImplementation(async (_packet, _seed): Promise<LLMProviderResult> => ({
      prose: 'Fallback one-shot prose',
      prompt_hash: 'fallback_hash_001',
    })),

    judgeLLMAxis: vi.fn().mockResolvedValue(0.75),
  };
}

// ===============================================================================
// E1-MP-01: computeChecksum is deterministic
// ===============================================================================

describe('E1-MP-01: computeChecksum determinism', () => {
  it('same input produces same checksum', () => {
    const plan = makeValidPlan();
    const hash1 = computeChecksum(plan);
    const hash2 = computeChecksum(plan);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('different input produces different checksum', () => {
    const plan1 = makeValidPlan();
    const plan2 = { ...makeValidPlan(), plan_id: 'plan_test_002' };
    expect(computeChecksum(plan1)).not.toBe(computeChecksum(plan2));
  });
});

// ===============================================================================
// E1-MP-02: validateContinuityPlan rejects invalid plans
// ===============================================================================

describe('E1-MP-02: validateContinuityPlan', () => {
  it('accepts valid plan', () => {
    const plan = makeValidPlanWithChecksum();
    const errors = validateContinuityPlan(plan);
    expect(errors).toHaveLength(0);
  });

  it('rejects null', () => {
    const errors = validateContinuityPlan(null);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('root');
  });

  it('rejects plan with missing fields', () => {
    const errors = validateContinuityPlan({ plan_id: 'x' });
    expect(errors.length).toBeGreaterThan(0);
    const fields = errors.map(e => e.field);
    expect(fields).toContain('experiment_id');
    expect(fields).toContain('scene_count');
    expect(fields).toContain('tension_curve');
    expect(fields).toContain('scenes');
    expect(fields).toContain('global_arc');
  });

  it('rejects scene_count !== 10', () => {
    const plan = { ...makeValidPlan(), scene_count: 5, checksum: 'x' };
    const errors = validateContinuityPlan(plan);
    expect(errors.some(e => e.field === 'scene_count')).toBe(true);
  });

  it('rejects empty global_arc', () => {
    const plan = { ...makeValidPlan(), global_arc: '  ', checksum: 'x' };
    const errors = validateContinuityPlan(plan);
    expect(errors.some(e => e.field === 'global_arc')).toBe(true);
  });
});

// ===============================================================================
// E1-MP-03: tension_curve.length must be exactly 10
// ===============================================================================

describe('E1-MP-03: tension_curve length === 10', () => {
  it('accepts tension_curve of length 10', () => {
    const plan = makeValidPlanWithChecksum();
    const errors = validateContinuityPlan(plan);
    const curveErrors = errors.filter(e => e.field === 'tension_curve');
    expect(curveErrors).toHaveLength(0);
  });

  it('rejects tension_curve of length 5', () => {
    const plan = {
      ...makeValidPlan(),
      tension_curve: [0.1, 0.2, 0.3, 0.4, 0.5],
      checksum: 'x',
    };
    const errors = validateContinuityPlan(plan);
    expect(errors.some(e => e.field === 'tension_curve' && e.message.includes('10'))).toBe(true);
  });

  it('rejects tension_curve with out-of-range values', () => {
    const plan = {
      ...makeValidPlan(),
      tension_curve: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.5],
      checksum: 'x',
    };
    const errors = validateContinuityPlan(plan);
    expect(errors.some(e => e.field === 'tension_curve[9]')).toBe(true);
  });

  it('rejects non-array tension_curve', () => {
    const plan = {
      ...makeValidPlan(),
      tension_curve: 'not_an_array',
      checksum: 'x',
    };
    const errors = validateContinuityPlan(plan);
    expect(errors.some(e => e.field === 'tension_curve' && e.message.includes('array'))).toBe(true);
  });
});

// ===============================================================================
// E1-MP-04: applyStateDelta produces correct state transitions
// ===============================================================================

describe('E1-MP-04: applyStateDelta', () => {
  it('advances scene when advance_scene is true', () => {
    const state = createInitialState();
    const delta: StateDelta = { advance_scene: true };
    const next = applyStateDelta(state, delta);
    expect(next.current_scene).toBe(1);
    expect(state.current_scene).toBe(0); // original unchanged
  });

  it('does not advance scene when advance_scene is false', () => {
    const state = createInitialState();
    const delta: StateDelta = { advance_scene: false };
    const next = applyStateDelta(state, delta);
    expect(next.current_scene).toBe(0);
  });

  it('sets character states via set', () => {
    const state = createInitialState();
    const delta: StateDelta = {
      advance_scene: true,
      set: { hero: 'wounded', villain: 'triumphant' },
    };
    const next = applyStateDelta(state, delta);
    expect(next.character_states['hero']).toBe('wounded');
    expect(next.character_states['villain']).toBe('triumphant');
  });

  it('pushes new thread', () => {
    const state = createInitialState();
    const delta: StateDelta = {
      advance_scene: false,
      push_thread: 'mystery_door',
    };
    const next = applyStateDelta(state, delta);
    expect(next.open_threads).toContain('mystery_door');
  });

  it('does not duplicate existing thread', () => {
    const state: ContinuityState = {
      ...createInitialState(),
      open_threads: ['mystery_door'],
    };
    const delta: StateDelta = {
      advance_scene: false,
      push_thread: 'mystery_door',
    };
    const next = applyStateDelta(state, delta);
    expect(next.open_threads.filter(t => t === 'mystery_door')).toHaveLength(1);
  });

  it('closes thread', () => {
    const state: ContinuityState = {
      ...createInitialState(),
      open_threads: ['thread_a', 'thread_b'],
    };
    const delta: StateDelta = {
      advance_scene: false,
      close_thread: 'thread_a',
    };
    const next = applyStateDelta(state, delta);
    expect(next.open_threads).not.toContain('thread_a');
    expect(next.open_threads).toContain('thread_b');
  });

  it('creates initial state with correct defaults', () => {
    const state = createInitialState();
    expect(state.current_scene).toBe(0);
    expect(state.accumulated_prose).toHaveLength(0);
    expect(state.tension_realized).toHaveLength(0);
    expect(Object.keys(state.character_states)).toHaveLength(0);
    expect(state.open_threads).toHaveLength(0);
  });
});

// ===============================================================================
// E1-MP-05: runE1MultiPrompt falls back on invalid plan
// ===============================================================================

describe('E1-MP-05: runE1MultiPrompt fallback', () => {
  it('falls back to one-shot when plan generation fails', async () => {
    const provider = makeMockProvider({ failPlan: true });
    const packet = createTestPacket();
    (packet as any).experiment_id = 'E1_continuity_impossible';

    const result = await runE1MultiPrompt(packet, provider);

    expect(result.prose).toBe('Fallback one-shot prose');
    expect(provider.generateDraft).toHaveBeenCalled();
  });

  it('falls back to one-shot when scene generation fails', async () => {
    const provider = makeMockProvider({ failSceneAt: 3 });
    const packet = createTestPacket();
    (packet as any).experiment_id = 'E1_continuity_impossible';

    const result = await runE1MultiPrompt(packet, provider);

    expect(result.prose).toBe('Fallback one-shot prose');
    expect(provider.generateDraft).toHaveBeenCalled();
  });

  it('succeeds with valid plan and scenes', async () => {
    const provider = makeMockProvider();
    const packet = createTestPacket();
    (packet as any).experiment_id = 'E1_continuity_impossible';

    const result = await runE1MultiPrompt(packet, provider);

    expect(result.prose).toContain('Prose de la scene 1');
    expect(result.prose).toContain('Prose de la scene 10');
    expect(result.prompt_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(provider.generateDraft).not.toHaveBeenCalled();
  });
});

// ===============================================================================
// E1-MP-06: validateStateDelta rejects malformed deltas
// ===============================================================================

describe('E1-MP-06: validateStateDelta', () => {
  it('accepts valid delta', () => {
    const errors = validateStateDelta({
      advance_scene: true,
      set: { hero: 'rested' },
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects null delta', () => {
    const errors = validateStateDelta(null);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('root');
  });

  it('rejects delta without advance_scene', () => {
    const errors = validateStateDelta({ set: { hero: 'rested' } });
    expect(errors.some(e => e.field === 'advance_scene')).toBe(true);
  });

  it('rejects delta with non-boolean advance_scene', () => {
    const errors = validateStateDelta({ advance_scene: 'yes' });
    expect(errors.some(e => e.field === 'advance_scene')).toBe(true);
  });

  it('rejects delta with non-object set', () => {
    const errors = validateStateDelta({ advance_scene: true, set: 'bad' });
    expect(errors.some(e => e.field === 'set')).toBe(true);
  });

  it('rejects delta with non-string push_thread', () => {
    const errors = validateStateDelta({ advance_scene: true, push_thread: 42 });
    expect(errors.some(e => e.field === 'push_thread')).toBe(true);
  });

  it('accepts minimal delta with only advance_scene', () => {
    const errors = validateStateDelta({ advance_scene: false });
    expect(errors).toHaveLength(0);
  });
});
