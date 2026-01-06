/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Temporal Logic - Types
 * 
 * Phase 23 - Sprint 23.2
 * 
 * Implements Linear Temporal Logic (LTL) for expressing and verifying
 * properties that hold over time.
 * 
 * INVARIANTS:
 * - INV-TEMP-01: Safety - □(valid_input ⇒ valid_output)
 * - INV-TEMP-02: Liveness - □(request_received ⇒ ◇response_sent)
 * - INV-TEMP-03: Fairness - □◇(handler_executed) for all active handlers
 * - INV-TEMP-04: Causality - □(chronicle[i].time < chronicle[i+1].time)
 * - INV-TEMP-05: Recovery - □(circuit_open ⇒ ◇circuit_half_open)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Unique identifier for a temporal formula */
export type FormulaId = Brand<string, 'FormulaId'>;

/** Timestamp in trace */
export type TraceTime = Brand<number, 'TraceTime'>;

/** State identifier */
export type StateId = Brand<string, 'StateId'>;

// ═══════════════════════════════════════════════════════════════════════════════
// LTL OPERATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * LTL Operators
 * 
 * □ (ALWAYS/GLOBALLY) - Property holds at all future states
 * ◇ (EVENTUALLY/FINALLY) - Property holds at some future state
 * ○ (NEXT) - Property holds at the next state
 * U (UNTIL) - Property A holds until property B holds
 * W (WEAK_UNTIL) - Like Until but B may never happen
 * R (RELEASE) - Dual of Until
 */
export const LTLOperator = {
  // Propositional
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  IMPLIES: 'IMPLIES',
  IFF: 'IFF',
  
  // Temporal (future)
  ALWAYS: 'ALWAYS',       // □ - Globally
  EVENTUALLY: 'EVENTUALLY', // ◇ - Finally
  NEXT: 'NEXT',           // ○ - neXt
  UNTIL: 'UNTIL',         // U - Until
  WEAK_UNTIL: 'WEAK_UNTIL', // W - Weak until
  RELEASE: 'RELEASE',     // R - Release
  
  // Temporal (past - optional extension)
  HISTORICALLY: 'HISTORICALLY', // □⁻ - Always in the past
  ONCE: 'ONCE',           // ◇⁻ - Sometime in the past
  PREVIOUS: 'PREVIOUS',   // ○⁻ - Previous
  SINCE: 'SINCE',         // S - Since
} as const;

export type LTLOperator = typeof LTLOperator[keyof typeof LTLOperator];

// ═══════════════════════════════════════════════════════════════════════════════
// FORMULA TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Atomic proposition - a basic predicate
 */
export interface AtomicProposition {
  readonly type: 'ATOMIC';
  readonly id: FormulaId;
  readonly name: string;
  readonly predicate: string;
  readonly description: string;
}

/**
 * Unary formula - operator with single operand
 */
export interface UnaryFormula {
  readonly type: 'UNARY';
  readonly id: FormulaId;
  readonly operator: 'NOT' | 'ALWAYS' | 'EVENTUALLY' | 'NEXT' | 'HISTORICALLY' | 'ONCE' | 'PREVIOUS';
  readonly operand: LTLFormula;
}

/**
 * Binary formula - operator with two operands
 */
export interface BinaryFormula {
  readonly type: 'BINARY';
  readonly id: FormulaId;
  readonly operator: 'AND' | 'OR' | 'IMPLIES' | 'IFF' | 'UNTIL' | 'WEAK_UNTIL' | 'RELEASE' | 'SINCE';
  readonly left: LTLFormula;
  readonly right: LTLFormula;
}

/**
 * Boolean constant
 */
export interface BooleanConstant {
  readonly type: 'CONSTANT';
  readonly id: FormulaId;
  readonly value: boolean;
}

/**
 * Union type for all LTL formulas
 */
export type LTLFormula = AtomicProposition | UnaryFormula | BinaryFormula | BooleanConstant;

// ═══════════════════════════════════════════════════════════════════════════════
// TRACE AND STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A state in the system
 */
export interface State {
  readonly id: StateId;
  readonly timestamp: TraceTime;
  readonly propositions: ReadonlyMap<string, boolean>;
  readonly data: Readonly<Record<string, unknown>>;
}

/**
 * A trace is a sequence of states
 */
export interface Trace {
  readonly id: string;
  readonly states: ReadonlyArray<State>;
  readonly startTime: TraceTime;
  readonly endTime: TraceTime;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Result of evaluating a formula on a trace
 */
export interface EvaluationResult {
  readonly formula: LTLFormula;
  readonly trace: Trace;
  readonly result: boolean;
  readonly satisfyingStates: ReadonlyArray<number>;
  readonly violatingStates: ReadonlyArray<number>;
  readonly counterexample: TracePosition | null;
}

/**
 * Position in a trace
 */
export interface TracePosition {
  readonly stateIndex: number;
  readonly state: State;
  readonly reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Temporal invariant - an LTL property with metadata
 */
export interface TemporalInvariant {
  readonly id: string;
  readonly name: string;
  readonly formula: LTLFormula;
  readonly severity: InvariantSeverity;
  readonly category: InvariantCategory;
  readonly description: string;
  readonly expectedToHold: boolean;
}

/**
 * Severity of an invariant violation
 */
export const InvariantSeverity = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type InvariantSeverity = typeof InvariantSeverity[keyof typeof InvariantSeverity];

/**
 * Category of invariant
 */
export const InvariantCategory = {
  SAFETY: 'SAFETY',       // Bad things never happen
  LIVENESS: 'LIVENESS',   // Good things eventually happen
  FAIRNESS: 'FAIRNESS',   // No starvation
  CAUSALITY: 'CAUSALITY', // Correct ordering
  RECOVERY: 'RECOVERY',   // System recovers from faults
} as const;

export type InvariantCategory = typeof InvariantCategory[keyof typeof InvariantCategory];

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of verifying an invariant
 */
export interface VerificationResult {
  readonly invariant: TemporalInvariant;
  readonly holds: boolean;
  readonly evaluations: ReadonlyArray<EvaluationResult>;
  readonly counterexamples: ReadonlyArray<TracePosition>;
  readonly verifiedAt: Date;
  readonly executionTimeMs: number;
}

/**
 * Summary of verification run
 */
export interface VerificationSummary {
  readonly totalInvariants: number;
  readonly passed: number;
  readonly failed: number;
  readonly results: ReadonlyArray<VerificationResult>;
  readonly criticalViolations: ReadonlyArray<VerificationResult>;
  readonly allPassed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

let formulaCounter = 0;

/**
 * Create a FormulaId
 */
export function formulaId(value?: string): FormulaId {
  return (value ?? `F_${++formulaCounter}`) as FormulaId;
}

/**
 * Create a TraceTime
 */
export function traceTime(value: number): TraceTime {
  if (value < 0) {
    throw new Error('TraceTime must be non-negative');
  }
  return value as TraceTime;
}

/**
 * Create a StateId
 */
export function stateId(value: string): StateId {
  if (!value) {
    throw new Error('StateId cannot be empty');
  }
  return value as StateId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export function isAtomicProposition(f: LTLFormula): f is AtomicProposition {
  return f.type === 'ATOMIC';
}

export function isUnaryFormula(f: LTLFormula): f is UnaryFormula {
  return f.type === 'UNARY';
}

export function isBinaryFormula(f: LTLFormula): f is BinaryFormula {
  return f.type === 'BINARY';
}

export function isBooleanConstant(f: LTLFormula): f is BooleanConstant {
  return f.type === 'CONSTANT';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const TRUE: BooleanConstant = {
  type: 'CONSTANT',
  id: formulaId('TRUE'),
  value: true,
};

export const FALSE: BooleanConstant = {
  type: 'CONSTANT',
  id: formulaId('FALSE'),
  value: false,
};

export const ALL_OPERATORS = Object.values(LTLOperator);
export const ALL_SEVERITIES_TEMPORAL = Object.values(InvariantSeverity);
export const ALL_CATEGORIES_TEMPORAL = Object.values(InvariantCategory);
