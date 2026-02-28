/**
 * ===============================================================================
 * OMEGA SOVEREIGN STYLE ENGINE — CONTINUITY PLAN (W5b Multi-Prompt)
 * ===============================================================================
 *
 * Module: validation/continuity-plan.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Phase T — W5b: E1 Multi-Prompt Continuity Plan
 *
 * CALC-only module: deterministic, testable offline, zero LLM dependency.
 * - ContinuityPlanJSON: structure for 10-scene plan
 * - ContinuityState: mutable state tracked across scenes
 * - computeChecksum(): SHA256 of canonical plan (without checksum field)
 * - applyStateDelta(): apply mini-DSL JSON delta to state
 * - validateContinuityPlan(): hard validation of plan structure
 *
 * ===============================================================================
 */

import { sha256, canonicalize } from '@omega/canon-kernel';

// ===============================================================================
// TYPES
// ===============================================================================

export interface ContinuityScenePlan {
  readonly scene_index: number;
  readonly emotional_target: string;
  readonly narrative_beat: string;
  readonly sensory_anchor: string;
  readonly tension_target: number;
}

export interface ContinuityPlanJSON {
  readonly plan_id: string;
  readonly experiment_id: string;
  readonly scene_count: number;
  readonly tension_curve: readonly number[];
  readonly scenes: readonly ContinuityScenePlan[];
  readonly global_arc: string;
  readonly checksum: string;
}

export interface ContinuityState {
  current_scene: number;
  accumulated_prose: string[];
  tension_realized: number[];
  character_states: Record<string, string>;
  open_threads: string[];
}

export interface StateDelta {
  readonly set?: Readonly<Record<string, string | number>>;
  readonly push_thread?: string | null;
  readonly close_thread?: string | null;
  readonly advance_scene: boolean;
}

// ===============================================================================
// VALIDATION
// ===============================================================================

const REQUIRED_PLAN_FIELDS = [
  'plan_id', 'experiment_id', 'scene_count',
  'tension_curve', 'scenes', 'global_arc',
] as const;

const REQUIRED_SCENE_FIELDS = [
  'scene_index', 'emotional_target', 'narrative_beat',
  'sensory_anchor', 'tension_target',
] as const;

export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Hard validation of ContinuityPlanJSON structure.
 * Returns array of errors (empty = valid).
 */
export function validateContinuityPlan(raw: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (raw === null || typeof raw !== 'object') {
    errors.push({ field: 'root', message: 'plan must be a non-null object' });
    return errors;
  }

  const plan = raw as Record<string, unknown>;

  // Required top-level fields
  for (const field of REQUIRED_PLAN_FIELDS) {
    if (!(field in plan) || plan[field] === undefined || plan[field] === null) {
      errors.push({ field, message: `missing required field "${field}"` });
    }
  }

  // scene_count must be 10
  if (typeof plan.scene_count === 'number' && plan.scene_count !== 10) {
    errors.push({ field: 'scene_count', message: `scene_count must be 10, got ${plan.scene_count}` });
  }

  // tension_curve must be array of length 10
  if (Array.isArray(plan.tension_curve)) {
    if (plan.tension_curve.length !== 10) {
      errors.push({
        field: 'tension_curve',
        message: `tension_curve.length must be 10, got ${plan.tension_curve.length}`,
      });
    }
    for (let i = 0; i < plan.tension_curve.length; i++) {
      const v = plan.tension_curve[i];
      if (typeof v !== 'number' || v < 0 || v > 1) {
        errors.push({
          field: `tension_curve[${i}]`,
          message: `tension_curve[${i}] must be number in [0,1], got ${v}`,
        });
      }
    }
  } else if ('tension_curve' in plan) {
    errors.push({ field: 'tension_curve', message: 'tension_curve must be an array' });
  }

  // scenes must be array of length 10 with required fields
  if (Array.isArray(plan.scenes)) {
    if (plan.scenes.length !== 10) {
      errors.push({
        field: 'scenes',
        message: `scenes.length must be 10, got ${plan.scenes.length}`,
      });
    }
    for (let i = 0; i < plan.scenes.length; i++) {
      const scene = plan.scenes[i] as Record<string, unknown> | null;
      if (scene === null || typeof scene !== 'object') {
        errors.push({ field: `scenes[${i}]`, message: `scenes[${i}] must be an object` });
        continue;
      }
      for (const field of REQUIRED_SCENE_FIELDS) {
        if (!(field in scene) || scene[field] === undefined || scene[field] === null) {
          errors.push({ field: `scenes[${i}].${field}`, message: `missing required field "${field}"` });
        }
      }
      if (typeof scene.tension_target === 'number' && (scene.tension_target < 0 || scene.tension_target > 1)) {
        errors.push({
          field: `scenes[${i}].tension_target`,
          message: `tension_target must be in [0,1], got ${scene.tension_target}`,
        });
      }
    }
  } else if ('scenes' in plan) {
    errors.push({ field: 'scenes', message: 'scenes must be an array' });
  }

  // global_arc must be non-empty string
  if ('global_arc' in plan && typeof plan.global_arc === 'string' && plan.global_arc.trim().length === 0) {
    errors.push({ field: 'global_arc', message: 'global_arc must be non-empty' });
  }

  return errors;
}

// ===============================================================================
// CHECKSUM (CALC)
// ===============================================================================

/**
 * Compute checksum of a ContinuityPlanJSON.
 * Excludes the `checksum` field itself — canonical form without it.
 */
export function computeChecksum(plan: Omit<ContinuityPlanJSON, 'checksum'>): string {
  const canonical = canonicalize({
    plan_id: plan.plan_id,
    experiment_id: plan.experiment_id,
    scene_count: plan.scene_count,
    tension_curve: plan.tension_curve,
    scenes: plan.scenes,
    global_arc: plan.global_arc,
  });
  return sha256(canonical);
}

// ===============================================================================
// STATE DELTA (DSL)
// ===============================================================================

/**
 * Create initial ContinuityState for a new multi-prompt run.
 */
export function createInitialState(): ContinuityState {
  return {
    current_scene: 0,
    accumulated_prose: [],
    tension_realized: [],
    character_states: {},
    open_threads: [],
  };
}

/**
 * Apply a StateDelta to a ContinuityState.
 * Returns a new state (immutable pattern).
 */
export function applyStateDelta(state: ContinuityState, delta: StateDelta): ContinuityState {
  const next: ContinuityState = {
    current_scene: state.current_scene,
    accumulated_prose: [...state.accumulated_prose],
    tension_realized: [...state.tension_realized],
    character_states: { ...state.character_states },
    open_threads: [...state.open_threads],
  };

  // Apply set operations
  if (delta.set) {
    for (const [key, value] of Object.entries(delta.set)) {
      next.character_states[key] = String(value);
    }
  }

  // Push thread
  if (delta.push_thread && !next.open_threads.includes(delta.push_thread)) {
    next.open_threads.push(delta.push_thread);
  }

  // Close thread
  if (delta.close_thread) {
    next.open_threads = next.open_threads.filter(t => t !== delta.close_thread);
  }

  // Advance scene
  if (delta.advance_scene) {
    next.current_scene += 1;
  }

  return next;
}

/**
 * Validate a StateDelta from LLM output.
 * Returns errors array (empty = valid).
 */
export function validateStateDelta(raw: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (raw === null || typeof raw !== 'object') {
    errors.push({ field: 'root', message: 'state_delta must be a non-null object' });
    return errors;
  }

  const delta = raw as Record<string, unknown>;

  if (!('advance_scene' in delta) || typeof delta.advance_scene !== 'boolean') {
    errors.push({ field: 'advance_scene', message: 'advance_scene must be a boolean' });
  }

  if ('set' in delta && delta.set !== undefined) {
    if (typeof delta.set !== 'object' || delta.set === null) {
      errors.push({ field: 'set', message: 'set must be an object' });
    }
  }

  if ('push_thread' in delta && delta.push_thread !== undefined && delta.push_thread !== null) {
    if (typeof delta.push_thread !== 'string') {
      errors.push({ field: 'push_thread', message: 'push_thread must be a string or null' });
    }
  }

  if ('close_thread' in delta && delta.close_thread !== undefined && delta.close_thread !== null) {
    if (typeof delta.close_thread !== 'string') {
      errors.push({ field: 'close_thread', message: 'close_thread must be a string or null' });
    }
  }

  return errors;
}
