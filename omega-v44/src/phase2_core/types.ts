/**
 * OMEGA V4.4 — Phase 2: Core Types
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Types specific to the Core engine.
 * Core is a MECHANICAL engine - no intelligence, no heuristics.
 */

import type {
  EmotionId,
  EmotionParamsFull,
  EmotionPosition,
  RawAxes,
  RuntimeConfig,
  InjectedConfig,
  ValidationStatus,
} from '../phase1_contract/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// TEXT INPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input text for emotional analysis
 */
export interface TextInput {
  readonly text: string;
  readonly timestamp: number;
  readonly sourceId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTED EMOTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computed emotion values from Core
 */
export interface ComputedEmotion {
  readonly id: EmotionId;
  readonly intensity: number;
  readonly position: EmotionPosition;
  readonly params: EmotionParamsFull;
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE OUTPUT (Phase 2 specific)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Full output from CoreEngine.compute()
 */
export interface CoreComputeOutput {
  readonly emotions: ReadonlyMap<EmotionId, ComputedEmotion>;
  readonly dominantEmotion: EmotionId;
  readonly axes: RawAxes;
  readonly totalIntensity: number;
  readonly timestamp: number;
  readonly configHash: string;
  readonly computeHash: string; // Deterministic hash of this specific output
  readonly validationStatus: ValidationStatus;
  readonly validationErrors: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE CONFIG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Core-specific configuration
 */
export interface CoreConfig extends InjectedConfig {
  readonly emotionWeights?: ReadonlyMap<EmotionId, number>;
}

/**
 * Default runtime bounds for V4.4
 */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  defaultC: 100,
  defaultOmega: 0,
  defaultPhi: 0,
};

/**
 * Default bounds for V4.4
 */
export const DEFAULT_BOUNDS = {
  X: { min: -10, max: 10 },
  Y: { min: 0, max: 100 },
  Z: { min: 0, max: 1 },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// LAW VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result of verifying a single law
 */
export interface LawVerificationResult {
  readonly lawId: string;
  readonly passed: boolean;
  readonly message: string;
  readonly value?: number;
  readonly bound?: { min: number; max: number };
}

/**
 * Result of verifying all laws
 */
export interface AllLawsVerificationResult {
  readonly allPassed: boolean;
  readonly results: readonly LawVerificationResult[];
}
