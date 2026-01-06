/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Chaos Algebra - Mathematical Foundation
 * 
 * Phase 23 - Sprint 23.0
 * 
 * This module defines the formal algebra for chaos injection.
 * All perturbations are algebraically composable with proven properties.
 * 
 * INVARIANTS:
 * - INV-CHAOS-01: Fermeture - ∀p₁,p₂ ∈ P, compose(p₁,p₂) ∈ P
 * - INV-CHAOS-02: Bornitude - ∀p ∈ P, ||effect(p)|| ≤ K
 * - INV-CHAOS-03: Déterminisme - same_seed(p) ⇒ same_effect(p)
 * - INV-CHAOS-04: Isolation - effect(p, module_A) ∩ state(module_B) = ∅
 * - INV-CHAOS-05: Récupération - ∀p, ◇(system_state = nominal)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES - Type safety at compile time
// ═══════════════════════════════════════════════════════════════════════════════

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Unique identifier for a perturbation */
export type PerturbationId = Brand<string, 'PerturbationId'>;

/** Seed for deterministic chaos generation */
export type ChaosSeed = Brand<number, 'ChaosSeed'>;

/** Bounded magnitude [0, 1] */
export type Magnitude = Brand<number, 'Magnitude'>;

/** Duration in milliseconds */
export type DurationMs = Brand<number, 'DurationMs'>;

/** Timestamp in milliseconds since epoch */
export type TimestampMs = Brand<number, 'TimestampMs'>;

// ═══════════════════════════════════════════════════════════════════════════════
// PERTURBATION TAXONOMY - Exhaustive classification
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Perturbation domains - what aspect of the system is affected
 */
export const PerturbationDomain = {
  CLOCK: 'CLOCK',           // Time-related perturbations
  NETWORK: 'NETWORK',       // Communication perturbations
  MEMORY: 'MEMORY',         // State/storage perturbations
  LOGIC: 'LOGIC',           // Control flow perturbations
  RESOURCE: 'RESOURCE',     // Resource availability perturbations
} as const;

export type PerturbationDomain = typeof PerturbationDomain[keyof typeof PerturbationDomain];

/**
 * Perturbation effects - how the system is affected
 */
export const PerturbationEffect = {
  DELAY: 'DELAY',           // Increase latency
  SKIP: 'SKIP',             // Omit operation
  CORRUPT: 'CORRUPT',       // Alter data
  FAIL: 'FAIL',             // Force failure
  EXHAUST: 'EXHAUST',       // Deplete resource
  RACE: 'RACE',             // Create race condition
} as const;

export type PerturbationEffect = typeof PerturbationEffect[keyof typeof PerturbationEffect];

/**
 * System response to perturbation
 */
export const SystemResponse = {
  ABSORB: 'ABSORB',         // System handles gracefully
  REJECT: 'REJECT',         // System explicitly rejects
  DEGRADE: 'DEGRADE',       // System degrades bounded
  CRASH: 'CRASH',           // System fails (INVALID - should never happen)
} as const;

export type SystemResponse = typeof SystemResponse[keyof typeof SystemResponse];

// ═══════════════════════════════════════════════════════════════════════════════
// PERTURBATION CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Target specification for a perturbation
 */
export interface PerturbationTarget {
  /** Module ID to target (or '*' for any) */
  readonly moduleId: string;
  /** Operation to target (or '*' for any) */
  readonly operation: string;
  /** Probability of application [0, 1] */
  readonly probability: Magnitude;
}

/**
 * Temporal bounds for perturbation
 */
export interface TemporalBounds {
  /** Start time (relative to injection start) */
  readonly startOffset: DurationMs;
  /** Duration of perturbation */
  readonly duration: DurationMs;
  /** Repeat interval (0 = no repeat) */
  readonly repeatInterval: DurationMs;
  /** Maximum repetitions */
  readonly maxRepetitions: number;
}

/**
 * Core perturbation definition - immutable
 */
export interface Perturbation {
  /** Unique identifier */
  readonly id: PerturbationId;
  /** Domain of effect */
  readonly domain: PerturbationDomain;
  /** Type of effect */
  readonly effect: PerturbationEffect;
  /** Target specification */
  readonly target: PerturbationTarget;
  /** Effect magnitude [0, 1] */
  readonly magnitude: Magnitude;
  /** Temporal bounds */
  readonly temporal: TemporalBounds;
  /** Deterministic seed */
  readonly seed: ChaosSeed;
  /** Human-readable description */
  readonly description: string;
}

/**
 * Result of perturbation application
 */
export interface PerturbationResult {
  /** The perturbation applied */
  readonly perturbation: Perturbation;
  /** System response */
  readonly response: SystemResponse;
  /** Timestamp of application */
  readonly appliedAt: TimestampMs;
  /** Measured effect magnitude */
  readonly measuredMagnitude: Magnitude;
  /** Side effects observed */
  readonly sideEffects: ReadonlyArray<string>;
  /** Recovery time (if applicable) */
  readonly recoveryTime: DurationMs | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Composition operators
 */
export const CompositionOperator = {
  SEQUENCE: 'SEQUENCE',     // p1 then p2
  PARALLEL: 'PARALLEL',     // p1 and p2 simultaneously
  CHOICE: 'CHOICE',         // p1 or p2 (probabilistic)
  REPEAT: 'REPEAT',         // p repeated n times
  CONDITIONAL: 'CONDITIONAL', // p if condition
} as const;

export type CompositionOperator = typeof CompositionOperator[keyof typeof CompositionOperator];

/**
 * Composed perturbation - recursive structure
 */
export interface ComposedPerturbation {
  /** Unique identifier */
  readonly id: PerturbationId;
  /** Composition operator */
  readonly operator: CompositionOperator;
  /** Operands (perturbations or composed perturbations) */
  readonly operands: ReadonlyArray<Perturbation | ComposedPerturbation>;
  /** Operator-specific parameters */
  readonly params: CompositionParams;
  /** Computed bounds */
  readonly bounds: ComputedBounds;
}

/**
 * Parameters for composition operators
 */
export type CompositionParams = 
  | { readonly type: 'SEQUENCE'; readonly gap: DurationMs }
  | { readonly type: 'PARALLEL'; readonly synchronize: boolean }
  | { readonly type: 'CHOICE'; readonly weights: ReadonlyArray<number> }
  | { readonly type: 'REPEAT'; readonly count: number; readonly interval: DurationMs }
  | { readonly type: 'CONDITIONAL'; readonly condition: string };

/**
 * Computed bounds for composed perturbation
 */
export interface ComputedBounds {
  /** Maximum magnitude */
  readonly maxMagnitude: Magnitude;
  /** Total duration */
  readonly totalDuration: DurationMs;
  /** Affected domains */
  readonly domains: ReadonlySet<PerturbationDomain>;
  /** Affected effects */
  readonly effects: ReadonlySet<PerturbationEffect>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALGEBRAIC PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Proof that a perturbation satisfies algebraic properties
 */
export interface AlgebraicProof {
  /** Property name */
  readonly property: AlgebraicProperty;
  /** Whether the property holds */
  readonly holds: boolean;
  /** Witness/counterexample */
  readonly witness: string;
  /** Timestamp of verification */
  readonly verifiedAt: TimestampMs;
}

/**
 * Algebraic properties to verify
 */
export const AlgebraicProperty = {
  CLOSURE: 'CLOSURE',           // compose(p1, p2) ∈ P
  ASSOCIATIVITY: 'ASSOCIATIVITY', // (p1∘p2)∘p3 = p1∘(p2∘p3)
  IDENTITY: 'IDENTITY',         // e∘p = p∘e = p
  BOUNDEDNESS: 'BOUNDEDNESS',   // ||effect(p)|| ≤ K
  DETERMINISM: 'DETERMINISM',   // same seed → same effect
  ISOLATION: 'ISOLATION',       // no cross-module effects
  RECOVERY: 'RECOVERY',         // eventually nominal
} as const;

export type AlgebraicProperty = typeof AlgebraicProperty[keyof typeof AlgebraicProperty];

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS - Type-safe constructors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a PerturbationId
 */
export function perturbationId(value: string): PerturbationId {
  if (!value || value.length === 0) {
    throw new Error('PerturbationId cannot be empty');
  }
  return value as PerturbationId;
}

/**
 * Create a ChaosSeed
 */
export function chaosSeed(value: number): ChaosSeed {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('ChaosSeed must be a non-negative integer');
  }
  return value as ChaosSeed;
}

/**
 * Create a Magnitude (bounded [0, 1])
 */
export function magnitude(value: number): Magnitude {
  if (value < 0 || value > 1) {
    throw new Error('Magnitude must be in [0, 1]');
  }
  return value as Magnitude;
}

/**
 * Create a DurationMs
 */
export function durationMs(value: number): DurationMs {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('DurationMs must be a non-negative integer');
  }
  return value as DurationMs;
}

/**
 * Create a TimestampMs
 */
export function timestampMs(value: number): TimestampMs {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('TimestampMs must be a non-negative integer');
  }
  return value as TimestampMs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a value is a base Perturbation (not composed)
 */
export function isPerturbation(value: Perturbation | ComposedPerturbation): value is Perturbation {
  return 'domain' in value && 'effect' in value && !('operator' in value);
}

/**
 * Check if a value is a ComposedPerturbation
 */
export function isComposedPerturbation(value: Perturbation | ComposedPerturbation): value is ComposedPerturbation {
  return 'operator' in value && 'operands' in value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum allowed magnitude for any perturbation */
export const MAX_MAGNITUDE = magnitude(1.0);

/** Identity perturbation (no effect) */
export const IDENTITY_MAGNITUDE = magnitude(0.0);

/** Default temporal bounds */
export const DEFAULT_TEMPORAL_BOUNDS: TemporalBounds = {
  startOffset: durationMs(0),
  duration: durationMs(1000),
  repeatInterval: durationMs(0),
  maxRepetitions: 1,
};

/** All valid domains */
export const ALL_DOMAINS: ReadonlyArray<PerturbationDomain> = Object.values(PerturbationDomain);

/** All valid effects */
export const ALL_EFFECTS: ReadonlyArray<PerturbationEffect> = Object.values(PerturbationEffect);

/** All valid system responses */
export const ALL_RESPONSES: ReadonlyArray<SystemResponse> = Object.values(SystemResponse);

/** Valid (non-crashing) responses */
export const VALID_RESPONSES: ReadonlyArray<SystemResponse> = [
  SystemResponse.ABSORB,
  SystemResponse.REJECT,
  SystemResponse.DEGRADE,
];
