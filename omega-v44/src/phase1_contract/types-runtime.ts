/**
 * OMEGA V4.4 — Phase 1: Runtime Parameters
 *
 * REFERENCE: VISION_FINALE_SCELLEE v1.0
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * These parameters are NOT defined per emotion in the Vision.
 * They are configurable at runtime.
 *
 * RUNTIME PARAMS: C (capacity), ω (omega/pulsation), φ (phi/phase)
 */

import type { EmotionParamsCanon } from './types-canon.js';
import type { EmotionId, AxisX, AxisY, AxisZ, ValidationStatus } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// RUNTIME PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Runtime parameters - configurable, NOT defined per emotion in Vision
 */
export interface EmotionParamsRuntime {
  /** C: Capacité - Seuil de saturation */
  readonly C: number;
  /** ω: Pulsation - Fréquence d'oscillation */
  readonly omega: number;
  /** φ: Phase - Déphasage initial */
  readonly phi: number;
}

/**
 * Full parameters = Canon + Runtime
 */
export interface EmotionParamsFull extends EmotionParamsCanon, EmotionParamsRuntime {}

/**
 * Runtime configuration defaults
 */
export interface RuntimeConfig {
  readonly defaultC: number;
  readonly defaultOmega: number;
  readonly defaultPhi: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// POSITION AND STATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Emotional position in 3D space
 */
export interface EmotionPosition {
  /** X: Valence - Valence émotionnelle */
  readonly x: AxisX;
  /** Y: Intensité - Intensité émotionnelle */
  readonly y: AxisY;
  /** Z: Persistance - Persistance temporelle */
  readonly z: AxisZ;
}

/**
 * Raw axes without branding (for computation)
 */
export interface RawAxes {
  readonly X: number;
  readonly Y: number;
  readonly Z: number;
}

/**
 * State of a single emotion at time t
 */
export interface EmotionState {
  readonly id: EmotionId;
  readonly position: EmotionPosition;
  readonly paramsCanon: EmotionParamsCanon;
  readonly paramsRuntime: EmotionParamsRuntime;
  readonly timestamp: number;
}

/**
 * Complete emotion vector = exactly 16 emotions
 * Using Record to guarantee completeness
 */
export type EmotionVectorMap = {
  readonly [K in EmotionId]: EmotionState;
};

// ═══════════════════════════════════════════════════════════════════════════
// TRAJECTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Point on a trajectory
 */
export interface TrajectoryPoint {
  readonly t: number;
  readonly position: EmotionPosition;
  readonly intensity: number;
}

/**
 * Emotional trajectory over time
 */
export interface EmotionTrajectory {
  readonly emotionId: EmotionId;
  readonly points: readonly TrajectoryPoint[];
  readonly startTime: number;
  readonly endTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Simulation configuration
 */
export interface SimulationConfig {
  readonly dt: number;
  readonly steps: number;
  readonly I0: number;
  readonly runtimeConfig: RuntimeConfig;
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Output from Phase 2 Core engine
 */
export interface CoreOutput {
  readonly emotionalState: EmotionVectorMap;
  readonly axes: RawAxes;
  readonly timestamp: number;
  readonly configHash: string;
  readonly validationStatus: ValidationStatus;
}

// ═══════════════════════════════════════════════════════════════════════════
// INJECTED CONFIG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration injected at runtime
 */
export interface InjectedConfig {
  readonly configHash: string;
  readonly bounds: {
    readonly X: { readonly min: number; readonly max: number };
    readonly Y: { readonly min: number; readonly max: number };
    readonly Z: { readonly min: number; readonly max: number };
  };
  readonly runtimeDefaults: RuntimeConfig;
  readonly timestamp: number;
}

/**
 * Type guard for InjectedConfig
 */
export function isInjectedConfig(obj: unknown): obj is InjectedConfig {
  if (typeof obj !== 'object' || obj === null) return false;
  const config = obj as Record<string, unknown>;
  return (
    typeof config['configHash'] === 'string' &&
    typeof config['bounds'] === 'object' &&
    typeof config['runtimeDefaults'] === 'object' &&
    typeof config['timestamp'] === 'number'
  );
}
