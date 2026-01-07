/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — PROOF STRENGTH TAXONOMY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module foundation/proof_strength
 * @version 3.26.0
 * @license MIT
 * 
 * TAXONOMIE DES PREUVES (Ω > Λ > Σ > Δ > Ε)
 * ==========================================
 * 
 * All proofs are NOT equal. A formal impossibility proof (Ω) is stronger
 * than empirical observation (Ε). This module defines the hierarchy.
 * 
 * INVARIANTS:
 * - INV-PROOF-01: Proof strengths form a total order (Ω > Λ > Σ > Δ > Ε)
 * - INV-PROOF-02: Each strength level has explicit criteria
 * - INV-PROOF-03: Strength comparison is deterministic
 * - INV-PROOF-04: Composite strength is dominated by weakest link
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { PROOF_STRENGTH_WEIGHTS } from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Proof strength levels in descending order
 * 
 * Ω (Omega)   — Formal impossibility proof (strongest)
 * Λ (Lambda)  — Mathematical/logical proof
 * Σ (Sigma)   — Exhaustive enumeration on finite space
 * Δ (Delta)   — Statistical sampling with bounded confidence
 * Ε (Epsilon) — Empirical observation (weakest)
 */
export type ProofStrength = 'Ω' | 'Λ' | 'Σ' | 'Δ' | 'Ε';

/**
 * Detailed definition of a proof strength level
 */
export interface ProofStrengthDefinition {
  /** Symbol (Greek letter) */
  readonly symbol: ProofStrength;
  
  /** Full name */
  readonly name: string;
  
  /** Numeric weight for comparison (higher = stronger) */
  readonly weight: number;
  
  /** Human-readable description */
  readonly description: string;
  
  /** What qualifies as this level of proof */
  readonly criteria: readonly string[];
  
  /** Example of this proof type */
  readonly example: string;
  
  /** Typical tools/methods used */
  readonly methods: readonly string[];
  
  /** Can this proof type prove impossibilities? */
  readonly canProveImpossibility: boolean;
  
  /** Is this proof type deterministically reproducible? */
  readonly isDeterministic: boolean;
}

/**
 * Result of comparing two proof strengths
 */
export type StrengthComparison = 'STRONGER' | 'EQUAL' | 'WEAKER';

/**
 * Composite proof strength (for proofs with multiple evidence types)
 */
export interface CompositeProofStrength {
  /** The dominant (weakest) strength in the chain */
  readonly dominant: ProofStrength;
  
  /** All strength levels present */
  readonly levels: readonly ProofStrength[];
  
  /** Whether the composite is consistent (no contradictions) */
  readonly isConsistent: boolean;
  
  /** Overall weight (based on dominant) */
  readonly weight: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF STRENGTH DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ω (Omega) — FORMAL IMPOSSIBILITY PROOF
 * 
 * The strongest form of proof. Proves that something CANNOT happen,
 * not just that it doesn't happen in tested cases.
 */
const STRENGTH_OMEGA: ProofStrengthDefinition = Object.freeze({
  symbol: 'Ω',
  name: 'Formal Impossibility',
  weight: PROOF_STRENGTH_WEIGHTS.OMEGA,
  
  description:
    'A formal proof that a behavior is impossible given the system\'s structure. ' +
    'No amount of testing can achieve this level; it requires logical analysis ' +
    'that covers ALL possible executions, not just tested ones.',
  
  criteria: Object.freeze([
    'Proof covers ALL possible inputs, not just tested inputs',
    'Based on structural/architectural properties, not behavior',
    'Formally verified by proof assistant or SMT solver',
    'Demonstrates impossibility, not just absence of observed failure'
  ]),
  
  example:
    'Lock hierarchy proof: "Deadlock is impossible because locks are always ' +
    'acquired in order A→B→C, and this order is enforced by the type system."',
  
  methods: Object.freeze([
    'Type system proofs',
    'Architectural invariants',
    'Coq/Lean/Isabelle proofs',
    'TLA+ model checking (exhaustive)',
    'SPARK/Ada formal verification'
  ]),
  
  canProveImpossibility: true,
  isDeterministic: true
});

/**
 * Λ (Lambda) — MATHEMATICAL/LOGICAL PROOF
 * 
 * A formal proof of correctness, but not necessarily of impossibility.
 * Strong but may not cover all edge cases if preconditions are wrong.
 */
const STRENGTH_LAMBDA: ProofStrengthDefinition = Object.freeze({
  symbol: 'Λ',
  name: 'Mathematical Proof',
  weight: PROOF_STRENGTH_WEIGHTS.LAMBDA,
  
  description:
    'A mathematical or logical proof that a property holds. ' +
    'Stronger than testing because it reasons about structure, not samples. ' +
    'However, may depend on preconditions that must be verified separately.',
  
  criteria: Object.freeze([
    'Based on mathematical reasoning or logic',
    'Verified by SMT solver or proof assistant',
    'Covers the property formally, given stated preconditions',
    'Preconditions must be explicitly stated'
  ]),
  
  example:
    'SMT proof: "Given valid input (precondition), the function always ' +
    'returns a value within [0, 1] (postcondition)." Verified by Z3.',
  
  methods: Object.freeze([
    'Z3/CVC5 SMT solvers',
    'Property-based testing with formal specs',
    'Contract verification',
    'Refinement types'
  ]),
  
  canProveImpossibility: true,
  isDeterministic: true
});

/**
 * Σ (Sigma) — EXHAUSTIVE ENUMERATION
 * 
 * Tests ALL possible cases on a finite space.
 * Strong because it's exhaustive, but only as strong as the space definition.
 */
const STRENGTH_SIGMA: ProofStrengthDefinition = Object.freeze({
  symbol: 'Σ',
  name: 'Exhaustive Enumeration',
  weight: PROOF_STRENGTH_WEIGHTS.SIGMA,
  
  description:
    'Complete enumeration of all cases in a finite space. ' +
    'Every possible input/state has been tested. ' +
    'As strong as the definition of the space is accurate.',
  
  criteria: Object.freeze([
    'The space is provably finite',
    'Every element in the space has been tested',
    'Results are deterministically reproducible',
    'Space boundaries are explicitly defined'
  ]),
  
  example:
    'Enum validation: "All 14 emotion types have been tested. ' +
    'Space size = 14. Tests executed = 14. Coverage = 100%."',
  
  methods: Object.freeze([
    'Enum iteration',
    'Boundary value analysis (complete)',
    'State machine exhaustion',
    'Combinatorial testing (small spaces)'
  ]),
  
  canProveImpossibility: false,
  isDeterministic: true
});

/**
 * Δ (Delta) — STATISTICAL SAMPLING
 * 
 * Tests a sample of a large/infinite space with statistical confidence.
 * Provides probabilistic bounds, not certainty.
 */
const STRENGTH_DELTA: ProofStrengthDefinition = Object.freeze({
  symbol: 'Δ',
  name: 'Statistical Sampling',
  weight: PROOF_STRENGTH_WEIGHTS.DELTA,
  
  description:
    'Statistical sampling of a large or infinite input space. ' +
    'Provides confidence bounds but not certainty. ' +
    'Strength depends on sample size and distribution.',
  
  criteria: Object.freeze([
    'Sample size is stated',
    'Sampling method is defined (random, stratified, etc.)',
    'Confidence interval is calculated',
    'Results are reproducible with same seed'
  ]),
  
  example:
    'Fuzzing: "1,000,000 random inputs tested. Zero failures. ' +
    '95% confidence that failure rate < 0.0003%."',
  
  methods: Object.freeze([
    'Fuzzing (random/guided)',
    'Property-based testing',
    'Monte Carlo testing',
    'Mutation testing'
  ]),
  
  canProveImpossibility: false,
  isDeterministic: true  // With fixed seed
});

/**
 * Ε (Epsilon) — EMPIRICAL OBSERVATION
 * 
 * The weakest form: "it worked when we tried it."
 * Necessary but insufficient for certification.
 */
const STRENGTH_EPSILON: ProofStrengthDefinition = Object.freeze({
  symbol: 'Ε',
  name: 'Empirical Observation',
  weight: PROOF_STRENGTH_WEIGHTS.EPSILON,
  
  description:
    'Empirical evidence from testing or production observation. ' +
    'The weakest form of proof. Necessary but not sufficient. ' +
    '"No bugs found" ≠ "No bugs exist".',
  
  criteria: Object.freeze([
    'Tests have been executed',
    'Results have been recorded',
    'Environment is documented',
    'Inputs are documented'
  ]),
  
  example:
    'Unit test: "login_test passed with input {user: "test", pass: "1234"}. ' +
    'This proves the function works for THIS input."',
  
  methods: Object.freeze([
    'Unit testing',
    'Integration testing',
    'Manual testing',
    'Production monitoring'
  ]),
  
  canProveImpossibility: false,
  isDeterministic: true
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRENGTH REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All proof strength definitions indexed by symbol
 */
const STRENGTH_MAP: ReadonlyMap<ProofStrength, ProofStrengthDefinition> = new Map([
  ['Ω', STRENGTH_OMEGA],
  ['Λ', STRENGTH_LAMBDA],
  ['Σ', STRENGTH_SIGMA],
  ['Δ', STRENGTH_DELTA],
  ['Ε', STRENGTH_EPSILON]
]);

/**
 * Ordered array of strengths from strongest to weakest
 */
export const STRENGTH_ORDER: readonly ProofStrength[] = Object.freeze([
  'Ω', 'Λ', 'Σ', 'Δ', 'Ε'
]);

/**
 * All strength definitions as an array (strongest first)
 */
export const ALL_STRENGTHS: readonly ProofStrengthDefinition[] = Object.freeze(
  STRENGTH_ORDER.map(s => {
    const def = STRENGTH_MAP.get(s);
    if (!def) throw new Error(`Strength ${s} not defined`);
    return def;
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESSOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the definition of a proof strength level
 * @param strength The strength symbol
 * @returns The strength definition or undefined
 */
export function getStrengthDefinition(
  strength: ProofStrength
): ProofStrengthDefinition | undefined {
  return STRENGTH_MAP.get(strength);
}

/**
 * Get the numeric weight of a strength level
 * @param strength The strength symbol
 * @returns The weight (higher = stronger)
 */
export function getStrengthWeight(strength: ProofStrength): number {
  const def = STRENGTH_MAP.get(strength);
  return def?.weight ?? 0;
}

/**
 * Get the name of a strength level
 * @param strength The strength symbol
 * @returns The human-readable name
 */
export function getStrengthName(strength: ProofStrength): string {
  const def = STRENGTH_MAP.get(strength);
  return def?.name ?? 'Unknown';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare two proof strengths
 * @param a First strength
 * @param b Second strength
 * @returns STRONGER if a > b, EQUAL if a == b, WEAKER if a < b
 */
export function compareStrengths(
  a: ProofStrength,
  b: ProofStrength
): StrengthComparison {
  const weightA = getStrengthWeight(a);
  const weightB = getStrengthWeight(b);
  
  if (weightA > weightB) return 'STRONGER';
  if (weightA < weightB) return 'WEAKER';
  return 'EQUAL';
}

/**
 * Check if strength a is stronger than or equal to strength b
 * @param a First strength
 * @param b Second strength
 * @returns true if a >= b
 */
export function isAtLeast(a: ProofStrength, b: ProofStrength): boolean {
  return getStrengthWeight(a) >= getStrengthWeight(b);
}

/**
 * Check if strength a is strictly stronger than strength b
 * @param a First strength
 * @param b Second strength
 * @returns true if a > b
 */
export function isStrongerThan(a: ProofStrength, b: ProofStrength): boolean {
  return getStrengthWeight(a) > getStrengthWeight(b);
}

/**
 * Get the stronger of two strengths
 * @param a First strength
 * @param b Second strength
 * @returns The stronger strength
 */
export function maxStrength(a: ProofStrength, b: ProofStrength): ProofStrength {
  return getStrengthWeight(a) >= getStrengthWeight(b) ? a : b;
}

/**
 * Get the weaker of two strengths
 * @param a First strength
 * @param b Second strength
 * @returns The weaker strength
 */
export function minStrength(a: ProofStrength, b: ProofStrength): ProofStrength {
  return getStrengthWeight(a) <= getStrengthWeight(b) ? a : b;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE STRENGTH FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the composite strength of multiple proofs
 * 
 * The composite strength is dominated by the WEAKEST link.
 * A chain of proofs is only as strong as its weakest proof.
 * 
 * @param strengths Array of individual proof strengths
 * @returns Composite strength analysis
 */
export function computeCompositeStrength(
  strengths: readonly ProofStrength[]
): CompositeProofStrength {
  if (strengths.length === 0) {
    return {
      dominant: 'Ε',  // No proofs = weakest
      levels: [],
      isConsistent: true,
      weight: PROOF_STRENGTH_WEIGHTS.EPSILON
    };
  }
  
  // Find the weakest (dominant) strength
  let dominant: ProofStrength = strengths[0] ?? 'Ε';
  for (const s of strengths) {
    if (getStrengthWeight(s) < getStrengthWeight(dominant)) {
      dominant = s;
    }
  }
  
  // Deduplicate and sort levels
  const uniqueLevels = [...new Set(strengths)].sort(
    (a, b) => getStrengthWeight(b) - getStrengthWeight(a)
  );
  
  return {
    dominant,
    levels: uniqueLevels,
    isConsistent: true,  // Multiple strengths are always consistent
    weight: getStrengthWeight(dominant)
  };
}

/**
 * Check if a set of proofs meets a minimum strength requirement
 * @param strengths Array of proof strengths
 * @param minimum Minimum required strength
 * @returns true if ALL proofs meet the minimum
 */
export function meetsMinimumStrength(
  strengths: readonly ProofStrength[],
  minimum: ProofStrength
): boolean {
  return strengths.every(s => isAtLeast(s, minimum));
}

/**
 * Get the dominant (weakest) strength from a set
 * @param strengths Array of proof strengths
 * @returns The weakest strength, or 'Ε' if empty
 */
export function getDominantStrength(
  strengths: readonly ProofStrength[]
): ProofStrength {
  return computeCompositeStrength(strengths).dominant;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a string is a valid proof strength symbol
 * @param value The value to check
 * @returns true if it's a valid ProofStrength
 */
export function isProofStrength(value: unknown): value is ProofStrength {
  return typeof value === 'string' && STRENGTH_MAP.has(value as ProofStrength);
}

/**
 * Parse a string to a proof strength, returning undefined if invalid
 * @param value The string to parse
 * @returns The ProofStrength or undefined
 */
export function parseProofStrength(value: string): ProofStrength | undefined {
  if (STRENGTH_MAP.has(value as ProofStrength)) {
    return value as ProofStrength;
  }
  
  // Try to match by name
  for (const def of ALL_STRENGTHS) {
    if (def.name.toLowerCase() === value.toLowerCase()) {
      return def.symbol;
    }
  }
  
  // Try common aliases
  const aliases: Record<string, ProofStrength> = {
    'omega': 'Ω',
    'lambda': 'Λ',
    'sigma': 'Σ',
    'delta': 'Δ',
    'epsilon': 'Ε',
    'formal': 'Ω',
    'math': 'Λ',
    'mathematical': 'Λ',
    'exhaustive': 'Σ',
    'statistical': 'Δ',
    'empirical': 'Ε',
    'test': 'Ε'
  };
  
  return aliases[value.toLowerCase()];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a human-readable strength hierarchy diagram
 */
export function generateStrengthHierarchy(): string {
  const lines: string[] = [
    '╔═══════════════════════════════════════════════════════════════════════════════╗',
    '║                    PROOF STRENGTH HIERARCHY (Ω > Λ > Σ > Δ > Ε)               ║',
    '╠═══════════════════════════════════════════════════════════════════════════════╣',
    '║                                                                               ║'
  ];
  
  for (const def of ALL_STRENGTHS) {
    const bar = '█'.repeat(def.weight * 3);
    const spaces = ' '.repeat(15 - def.weight * 3);
    lines.push(
      `║  ${def.symbol} │ ${bar}${spaces} │ ${def.name.padEnd(25)} │ Weight: ${def.weight}  ║`
    );
  }
  
  lines.push('║                                                                               ║');
  lines.push('║  Ω = Impossibility   Λ = Mathematical   Σ = Exhaustive                       ║');
  lines.push('║  Δ = Statistical     Ε = Empirical                                           ║');
  lines.push('╚═══════════════════════════════════════════════════════════════════════════════╝');
  
  return lines.join('\n');
}

/**
 * Generate a comparison table of all strength levels
 */
export function generateStrengthTable(): string {
  const lines: string[] = [
    '| Symbol | Name | Weight | Can Prove ¬∃ | Deterministic |',
    '|--------|------|--------|--------------|---------------|'
  ];
  
  for (const def of ALL_STRENGTHS) {
    lines.push(
      `| ${def.symbol} | ${def.name} | ${def.weight} | ${def.canProveImpossibility ? 'Yes' : 'No'} | ${def.isDeterministic ? 'Yes' : 'No'} |`
    );
  }
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT INDIVIDUAL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  STRENGTH_OMEGA,
  STRENGTH_LAMBDA,
  STRENGTH_SIGMA,
  STRENGTH_DELTA,
  STRENGTH_EPSILON
};
