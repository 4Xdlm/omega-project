/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — NEGATIVE SPACE ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module negative/space
 * @version 2.0.0
 * @license MIT
 * 
 * NEGATIVE SPACE — WHAT IS EXPLICITLY FORBIDDEN
 * ==============================================
 * 
 * The negative space defines what an invariant CANNOT do, MUST NOT produce,
 * or what situations are IMPOSSIBLE. This is complementary to positive proofs:
 * 
 * Positive: "This invariant produces correct output for valid inputs"
 * Negative: "This invariant NEVER produces X under any circumstances"
 * 
 * Negative space is critical because:
 * 1. It bounds the behavior explicitly
 * 2. It makes impossibilities testable
 * 3. It strengthens certification claims
 * 
 * INVARIANTS:
 * - INV-NEG-01: Every negative bound has explicit condition
 * - INV-NEG-02: Negative score is computed deterministically
 * - INV-NEG-03: Violations are tracked with evidence
 * - INV-NEG-04: Negative space is immutable after definition
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { 
  IMPOSSIBILITY_CLASSES, 
  type ImpossibilityClass,
  isImpossibilityClass,
  MAX_NEGATIVE_SCORE
} from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Severity of negative bound
 */
export type NegativeSeverity = 
  | 'CATASTROPHIC'   // System failure if violated
  | 'CRITICAL'       // Major impact, certification invalid
  | 'SERIOUS'        // Significant impact
  | 'MODERATE'       // Notable but manageable
  | 'MINOR';         // Low impact

/**
 * A negative bound - something that must NEVER happen
 */
export interface NegativeBound {
  /** Unique ID for this bound */
  readonly id: string;
  
  /** Invariant this bound applies to */
  readonly invariantId: string;
  
  /** What must never happen (natural language) */
  readonly description: string;
  
  /** Formal condition that must always be false */
  readonly formalCondition: string;
  
  /** Impossibility class */
  readonly impossibilityClass: ImpossibilityClass;
  
  /** Severity if violated */
  readonly severity: NegativeSeverity;
  
  /** Impact score [1-10] */
  readonly impactScore: number;
  
  /** Why this is impossible/forbidden */
  readonly justification: string;
  
  /** Example of violation (for testing) */
  readonly violationExample?: string;
  
  /** Tags for categorization */
  readonly tags: readonly string[];
  
  /** Creation timestamp */
  readonly createdAt: string;
}

/**
 * A violation of a negative bound
 */
export interface NegativeViolation {
  /** ID of the violated bound */
  readonly boundId: string;
  
  /** When the violation was detected */
  readonly detectedAt: string;
  
  /** Description of what happened */
  readonly description: string;
  
  /** Evidence hash */
  readonly evidenceHash: string;
  
  /** Input that caused violation */
  readonly triggerInput?: string;
  
  /** Actual output that violated the bound */
  readonly actualOutput?: string;
  
  /** Severity inherited from bound */
  readonly severity: NegativeSeverity;
  
  /** Impact score inherited from bound */
  readonly impactScore: number;
}

/**
 * Negative space definition for an invariant
 */
export interface NegativeSpace {
  /** Invariant ID */
  readonly invariantId: string;
  
  /** All negative bounds */
  readonly bounds: readonly NegativeBound[];
  
  /** All recorded violations */
  readonly violations: readonly NegativeViolation[];
  
  /** Computed negative score */
  readonly negativeScore: number;
  
  /** Is the negative space violated? */
  readonly isViolated: boolean;
  
  /** Creation timestamp */
  readonly createdAt: string;
  
  /** Last update timestamp */
  readonly updatedAt: string;
}

/**
 * Input for creating a negative bound
 */
export interface CreateBoundInput {
  readonly invariantId: string;
  readonly description: string;
  readonly formalCondition: string;
  readonly impossibilityClass: ImpossibilityClass;
  readonly severity: NegativeSeverity;
  readonly impactScore: number;
  readonly justification: string;
  readonly violationExample?: string;
  readonly tags?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEVERITY WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Weight multipliers for severity levels
 */
export const SEVERITY_WEIGHTS: Readonly<Record<NegativeSeverity, number>> = Object.freeze({
  CATASTROPHIC: 5.0,
  CRITICAL: 4.0,
  SERIOUS: 3.0,
  MODERATE: 2.0,
  MINOR: 1.0
});

/**
 * Severity order (highest to lowest)
 */
export const SEVERITY_ORDER: readonly NegativeSeverity[] = Object.freeze([
  'CATASTROPHIC',
  'CRITICAL', 
  'SERIOUS',
  'MODERATE',
  'MINOR'
]);

// ═══════════════════════════════════════════════════════════════════════════════
// BOUND CREATION
// ═══════════════════════════════════════════════════════════════════════════════

let boundCounter = 0;

/**
 * Generate unique bound ID
 */
export function generateBoundId(invariantId: string): string {
  boundCounter++;
  const suffix = String(boundCounter).padStart(3, '0');
  return `NEG-${invariantId}-${suffix}`;
}

/**
 * Reset bound counter (for testing)
 */
export function resetBoundCounter(): void {
  boundCounter = 0;
}

/**
 * Create a negative bound
 */
export function createNegativeBound(input: CreateBoundInput): NegativeBound {
  // Validate impact score
  if (input.impactScore < 1 || input.impactScore > 10) {
    throw new Error('Impact score must be between 1 and 10');
  }
  
  // Validate impossibility class
  if (!isImpossibilityClass(input.impossibilityClass)) {
    throw new Error(`Invalid impossibility class: ${input.impossibilityClass}`);
  }
  
  return Object.freeze({
    id: generateBoundId(input.invariantId),
    invariantId: input.invariantId,
    description: input.description,
    formalCondition: input.formalCondition,
    impossibilityClass: input.impossibilityClass,
    severity: input.severity,
    impactScore: input.impactScore,
    justification: input.justification,
    violationExample: input.violationExample,
    tags: Object.freeze(input.tags ?? []),
    createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SPACE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an empty negative space for an invariant
 */
export function createNegativeSpace(invariantId: string): NegativeSpace {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  return Object.freeze({
    invariantId,
    bounds: Object.freeze([]),
    violations: Object.freeze([]),
    negativeScore: 0,
    isViolated: false,
    createdAt: now,
    updatedAt: now
  });
}

/**
 * Add a bound to negative space
 */
export function addBound(
  space: NegativeSpace,
  bound: NegativeBound
): NegativeSpace {
  if (bound.invariantId !== space.invariantId) {
    throw new Error('Bound invariant ID does not match space invariant ID');
  }
  
  // Check for duplicate bound ID
  if (space.bounds.some(b => b.id === bound.id)) {
    throw new Error(`Duplicate bound ID: ${bound.id}`);
  }
  
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  return Object.freeze({
    ...space,
    bounds: Object.freeze([...space.bounds, bound]),
    updatedAt: now
  });
}

/**
 * Record a violation
 */
export function recordViolation(
  space: NegativeSpace,
  boundId: string,
  description: string,
  evidenceHash: string,
  triggerInput?: string,
  actualOutput?: string
): NegativeSpace {
  // Find the bound
  const bound = space.bounds.find(b => b.id === boundId);
  if (!bound) {
    throw new Error(`Unknown bound ID: ${boundId}`);
  }
  
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  const violation: NegativeViolation = Object.freeze({
    boundId,
    detectedAt: now,
    description,
    evidenceHash,
    triggerInput,
    actualOutput,
    severity: bound.severity,
    impactScore: bound.impactScore
  });
  
  const newViolations = Object.freeze([...space.violations, violation]);
  const newScore = computeNegativeScore(space.bounds, newViolations);
  
  return Object.freeze({
    ...space,
    violations: newViolations,
    negativeScore: newScore,
    isViolated: true,
    updatedAt: now
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute negative score from violations
 * Score = Σ(impactScore × severityWeight)
 * Capped at MAX_NEGATIVE_SCORE
 */
export function computeNegativeScore(
  bounds: readonly NegativeBound[],
  violations: readonly NegativeViolation[]
): number {
  if (violations.length === 0) {
    return 0;
  }
  
  let score = 0;
  
  for (const violation of violations) {
    const bound = bounds.find(b => b.id === violation.boundId);
    if (!bound) continue;
    
    const severityWeight = SEVERITY_WEIGHTS[violation.severity];
    
    score += violation.impactScore * severityWeight;
  }
  
  // Cap at maximum
  return Math.min(score, MAX_NEGATIVE_SCORE);
}

/**
 * Compute potential maximum score (if all bounds violated)
 */
export function computeMaxPotentialScore(bounds: readonly NegativeBound[]): number {
  let score = 0;
  
  for (const bound of bounds) {
    const severityWeight = SEVERITY_WEIGHTS[bound.severity];
    score += bound.impactScore * severityWeight;
  }
  
  return Math.min(score, MAX_NEGATIVE_SCORE);
}

/**
 * Get violation ratio (violations / bounds)
 */
export function getViolationRatio(space: NegativeSpace): number {
  if (space.bounds.length === 0) {
    return 0;
  }
  
  const violatedBoundIds = new Set(space.violations.map(v => v.boundId));
  return violatedBoundIds.size / space.bounds.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get bounds by impossibility class
 */
export function getBoundsByClass(
  space: NegativeSpace,
  impossibilityClass: ImpossibilityClass
): readonly NegativeBound[] {
  return space.bounds.filter(b => b.impossibilityClass === impossibilityClass);
}

/**
 * Get bounds by severity
 */
export function getBoundsBySeverity(
  space: NegativeSpace,
  severity: NegativeSeverity
): readonly NegativeBound[] {
  return space.bounds.filter(b => b.severity === severity);
}

/**
 * Get bounds by tag
 */
export function getBoundsByTag(
  space: NegativeSpace,
  tag: string
): readonly NegativeBound[] {
  return space.bounds.filter(b => b.tags.includes(tag));
}

/**
 * Get violated bounds
 */
export function getViolatedBounds(space: NegativeSpace): readonly NegativeBound[] {
  const violatedIds = new Set(space.violations.map(v => v.boundId));
  return space.bounds.filter(b => violatedIds.has(b.id));
}

/**
 * Get unviolated bounds
 */
export function getUnviolatedBounds(space: NegativeSpace): readonly NegativeBound[] {
  const violatedIds = new Set(space.violations.map(v => v.boundId));
  return space.bounds.filter(b => !violatedIds.has(b.id));
}

/**
 * Get violations for a specific bound
 */
export function getViolationsForBound(
  space: NegativeSpace,
  boundId: string
): readonly NegativeViolation[] {
  return space.violations.filter(v => v.boundId === boundId);
}

/**
 * Count bounds
 */
export function countBounds(space: NegativeSpace): number {
  return space.bounds.length;
}

/**
 * Count violations
 */
export function countViolations(space: NegativeSpace): number {
  return space.violations.length;
}

/**
 * Count unique violated bounds
 */
export function countViolatedBounds(space: NegativeSpace): number {
  const violatedIds = new Set(space.violations.map(v => v.boundId));
  return violatedIds.size;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if space has any CATASTROPHIC violations
 */
export function hasCatastrophicViolation(space: NegativeSpace): boolean {
  return space.violations.some(v => v.severity === 'CATASTROPHIC');
}

/**
 * Check if space has any CRITICAL or worse violations
 */
export function hasCriticalOrWorse(space: NegativeSpace): boolean {
  return space.violations.some(v => 
    v.severity === 'CATASTROPHIC' || v.severity === 'CRITICAL'
  );
}

/**
 * Get highest severity among violations
 */
export function getHighestViolationSeverity(
  space: NegativeSpace
): NegativeSeverity | null {
  if (space.violations.length === 0) {
    return null;
  }
  
  for (const severity of SEVERITY_ORDER) {
    if (space.violations.some(v => v.severity === severity)) {
      return severity;
    }
  }
  
  return 'MINOR';
}

/**
 * Get bounds by impossibility class distribution
 */
export function getBoundsDistribution(
  space: NegativeSpace
): ReadonlyMap<ImpossibilityClass, number> {
  const distribution = new Map<ImpossibilityClass, number>();
  
  for (const cls of IMPOSSIBILITY_CLASSES) {
    const count = space.bounds.filter(b => b.impossibilityClass === cls).length;
    if (count > 0) {
      distribution.set(cls, count);
    }
  }
  
  return distribution;
}

/**
 * Is the negative space clean? (no violations)
 */
export function isClean(space: NegativeSpace): boolean {
  return space.violations.length === 0;
}

/**
 * Is the negative space comprehensively defined?
 * (has bounds for multiple impossibility classes)
 */
export function isComprehensive(space: NegativeSpace): boolean {
  const distribution = getBoundsDistribution(space);
  return distribution.size >= 3;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if value is valid negative severity
 */
export function isNegativeSeverity(value: unknown): value is NegativeSeverity {
  return typeof value === 'string' && SEVERITY_ORDER.includes(value as NegativeSeverity);
}

/**
 * Check if bound ID is valid format
 */
export function isValidBoundId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^NEG-INV-[A-Z]+-\d+-\d{3}$/.test(value);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a bound for display
 */
export function formatBound(bound: NegativeBound): string {
  return [
    `[${bound.severity}] ${bound.id}`,
    `Description: ${bound.description}`,
    `Formal: ${bound.formalCondition}`,
    `Class: ${bound.impossibilityClass}`,
    `Impact: ${bound.impactScore}/10`,
    `Justification: ${bound.justification}`
  ].join('\n');
}

/**
 * Format a violation for display
 */
export function formatViolation(violation: NegativeViolation): string {
  const lines = [
    `[${violation.severity}] Violation of ${violation.boundId}`,
    `Detected: ${violation.detectedAt}`,
    `Description: ${violation.description}`,
    `Evidence: ${violation.evidenceHash}`
  ];
  
  if (violation.triggerInput) {
    lines.push(`Trigger: ${violation.triggerInput}`);
  }
  
  if (violation.actualOutput) {
    lines.push(`Output: ${violation.actualOutput}`);
  }
  
  return lines.join('\n');
}

/**
 * Generate negative space summary
 */
export function generateNegativeSpaceSummary(space: NegativeSpace): string {
  const lines = [
    `Negative Space for ${space.invariantId}`,
    `═════════════════════════════════════`,
    `Bounds: ${space.bounds.length}`,
    `Violations: ${space.violations.length}`,
    `Violated Bounds: ${countViolatedBounds(space)}`,
    `Negative Score: ${space.negativeScore}/${MAX_NEGATIVE_SCORE}`,
    `Status: ${space.isViolated ? 'VIOLATED' : 'CLEAN'}`,
    ''
  ];
  
  if (space.violations.length > 0) {
    lines.push('Highest Severity: ' + getHighestViolationSeverity(space));
    lines.push('Catastrophic: ' + (hasCatastrophicViolation(space) ? 'YES' : 'No'));
  }
  
  return lines.join('\n');
}
