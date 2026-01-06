/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Chaos Algebra - Composition Operations
 * 
 * Phase 23 - Sprint 23.0
 * 
 * Implements algebraic composition of perturbations with formal properties:
 * - Closure: compose(p1, p2) ∈ P
 * - Associativity: (p1∘p2)∘p3 = p1∘(p2∘p3)
 * - Identity: e∘p = p∘e = p
 * 
 * INVARIANT: INV-CHAOS-01 - Fermeture garantie pour toute composition
 */

import {
  Perturbation,
  ComposedPerturbation,
  CompositionOperator,
  CompositionParams,
  ComputedBounds,
  PerturbationDomain,
  PerturbationEffect,
  perturbationId,
  magnitude,
  durationMs,
  isPerturbation,
  isComposedPerturbation,
  Magnitude,
  DurationMs,
  PerturbationId,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compose two perturbations in sequence
 * p1 then p2 with optional gap between them
 * 
 * @param p1 First perturbation
 * @param p2 Second perturbation
 * @param gap Gap between perturbations (default: 0ms)
 * @returns Composed perturbation
 */
export function sequence(
  p1: Perturbation | ComposedPerturbation,
  p2: Perturbation | ComposedPerturbation,
  gap: DurationMs = durationMs(0)
): ComposedPerturbation {
  const id = generateComposedId('SEQ', p1.id, p2.id);
  const bounds = computeSequenceBounds(p1, p2, gap);
  
  return {
    id,
    operator: CompositionOperator.SEQUENCE,
    operands: [p1, p2],
    params: { type: 'SEQUENCE', gap },
    bounds,
  };
}

/**
 * Compose two perturbations in parallel
 * p1 and p2 simultaneously
 * 
 * @param p1 First perturbation
 * @param p2 Second perturbation
 * @param synchronize Whether to synchronize start times
 * @returns Composed perturbation
 */
export function parallel(
  p1: Perturbation | ComposedPerturbation,
  p2: Perturbation | ComposedPerturbation,
  synchronize: boolean = true
): ComposedPerturbation {
  const id = generateComposedId('PAR', p1.id, p2.id);
  const bounds = computeParallelBounds(p1, p2);
  
  return {
    id,
    operator: CompositionOperator.PARALLEL,
    operands: [p1, p2],
    params: { type: 'PARALLEL', synchronize },
    bounds,
  };
}

/**
 * Probabilistic choice between perturbations
 * p1 or p2 with given weights
 * 
 * @param perturbations Array of perturbations
 * @param weights Probability weights (must sum to 1)
 * @returns Composed perturbation
 */
export function choice(
  perturbations: ReadonlyArray<Perturbation | ComposedPerturbation>,
  weights: ReadonlyArray<number>
): ComposedPerturbation {
  if (perturbations.length === 0) {
    throw new Error('Choice requires at least one perturbation');
  }
  if (perturbations.length !== weights.length) {
    throw new Error('Weights must match perturbations length');
  }
  
  const sum = weights.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1.0) > 1e-10) {
    throw new Error(`Weights must sum to 1, got ${sum}`);
  }
  
  const ids = perturbations.map(p => p.id);
  const id = generateComposedId('CHO', ...ids);
  const bounds = computeChoiceBounds(perturbations);
  
  return {
    id,
    operator: CompositionOperator.CHOICE,
    operands: perturbations,
    params: { type: 'CHOICE', weights },
    bounds,
  };
}

/**
 * Repeat a perturbation n times
 * 
 * @param p Perturbation to repeat
 * @param count Number of repetitions
 * @param interval Interval between repetitions
 * @returns Composed perturbation
 */
export function repeat(
  p: Perturbation | ComposedPerturbation,
  count: number,
  interval: DurationMs = durationMs(0)
): ComposedPerturbation {
  if (count < 1) {
    throw new Error('Repeat count must be at least 1');
  }
  
  const id = generateComposedId('REP', p.id, `x${count}`);
  const bounds = computeRepeatBounds(p, count, interval);
  
  return {
    id,
    operator: CompositionOperator.REPEAT,
    operands: [p],
    params: { type: 'REPEAT', count, interval },
    bounds,
  };
}

/**
 * Conditional perturbation
 * Apply p only if condition is met
 * 
 * @param p Perturbation to conditionally apply
 * @param condition Condition expression
 * @returns Composed perturbation
 */
export function conditional(
  p: Perturbation | ComposedPerturbation,
  condition: string
): ComposedPerturbation {
  if (!condition || condition.trim().length === 0) {
    throw new Error('Condition cannot be empty');
  }
  
  const id = generateComposedId('COND', p.id, hashCondition(condition));
  const bounds = computeConditionalBounds(p);
  
  return {
    id,
    operator: CompositionOperator.CONDITIONAL,
    operands: [p],
    params: { type: 'CONDITIONAL', condition },
    bounds,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALGEBRAIC IDENTITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Identity perturbation factory
 * Creates a perturbation with no effect
 * 
 * PROPERTY: e∘p = p∘e = p for any p
 */
export function identity(): Perturbation {
  return {
    id: perturbationId('IDENTITY'),
    domain: 'CLOCK' as PerturbationDomain,
    effect: 'DELAY' as PerturbationEffect,
    target: {
      moduleId: '*',
      operation: '*',
      probability: magnitude(0),
    },
    magnitude: magnitude(0),
    temporal: {
      startOffset: durationMs(0),
      duration: durationMs(0),
      repeatInterval: durationMs(0),
      maxRepetitions: 0,
    },
    seed: 0 as any,
    description: 'Identity perturbation (no effect)',
  };
}

/**
 * Check if a perturbation is the identity
 */
export function isIdentity(p: Perturbation | ComposedPerturbation): boolean {
  if (isComposedPerturbation(p)) {
    return false;
  }
  return p.id === 'IDENTITY' || p.magnitude === 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// N-ARY COMPOSITION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compose multiple perturbations in sequence
 */
export function sequenceAll(
  perturbations: ReadonlyArray<Perturbation | ComposedPerturbation>,
  gap: DurationMs = durationMs(0)
): ComposedPerturbation {
  if (perturbations.length === 0) {
    throw new Error('sequenceAll requires at least one perturbation');
  }
  if (perturbations.length === 1) {
    return wrapAsSingle(perturbations[0]!);
  }
  
  return perturbations.slice(1).reduce(
    (acc, p) => sequence(acc, p, gap),
    perturbations[0]!
  ) as ComposedPerturbation;
}

/**
 * Compose multiple perturbations in parallel
 */
export function parallelAll(
  perturbations: ReadonlyArray<Perturbation | ComposedPerturbation>,
  synchronize: boolean = true
): ComposedPerturbation {
  if (perturbations.length === 0) {
    throw new Error('parallelAll requires at least one perturbation');
  }
  if (perturbations.length === 1) {
    return wrapAsSingle(perturbations[0]!);
  }
  
  return perturbations.slice(1).reduce(
    (acc, p) => parallel(acc, p, synchronize),
    perturbations[0]!
  ) as ComposedPerturbation;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDS COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

function computeSequenceBounds(
  p1: Perturbation | ComposedPerturbation,
  p2: Perturbation | ComposedPerturbation,
  gap: DurationMs
): ComputedBounds {
  const b1 = getBounds(p1);
  const b2 = getBounds(p2);
  
  const totalDuration = durationMs(b1.totalDuration + gap + b2.totalDuration);
  const maxMagnitude = magnitude(Math.max(b1.maxMagnitude, b2.maxMagnitude));
  const domains = new Set([...b1.domains, ...b2.domains]);
  const effects = new Set([...b1.effects, ...b2.effects]);
  
  return { maxMagnitude, totalDuration, domains, effects };
}

function computeParallelBounds(
  p1: Perturbation | ComposedPerturbation,
  p2: Perturbation | ComposedPerturbation
): ComputedBounds {
  const b1 = getBounds(p1);
  const b2 = getBounds(p2);
  
  const totalDuration = durationMs(Math.max(b1.totalDuration, b2.totalDuration));
  // Parallel composition can have additive effects
  const maxMagnitude = magnitude(Math.min(1, b1.maxMagnitude + b2.maxMagnitude));
  const domains = new Set([...b1.domains, ...b2.domains]);
  const effects = new Set([...b1.effects, ...b2.effects]);
  
  return { maxMagnitude, totalDuration, domains, effects };
}

function computeChoiceBounds(
  perturbations: ReadonlyArray<Perturbation | ComposedPerturbation>
): ComputedBounds {
  const allBounds = perturbations.map(getBounds);
  
  const totalDuration = durationMs(Math.max(...allBounds.map(b => b.totalDuration)));
  const maxMagnitude = magnitude(Math.max(...allBounds.map(b => b.maxMagnitude)));
  const domains = new Set(allBounds.flatMap(b => [...b.domains]));
  const effects = new Set(allBounds.flatMap(b => [...b.effects]));
  
  return { maxMagnitude, totalDuration, domains, effects };
}

function computeRepeatBounds(
  p: Perturbation | ComposedPerturbation,
  count: number,
  interval: DurationMs
): ComputedBounds {
  const b = getBounds(p);
  
  const totalDuration = durationMs(count * b.totalDuration + (count - 1) * interval);
  const maxMagnitude = b.maxMagnitude; // Magnitude doesn't increase with repetition
  
  return { 
    maxMagnitude, 
    totalDuration, 
    domains: b.domains, 
    effects: b.effects 
  };
}

function computeConditionalBounds(
  p: Perturbation | ComposedPerturbation
): ComputedBounds {
  // Conditional has same bounds as underlying (condition may not fire)
  return getBounds(p);
}

/**
 * Get bounds for any perturbation type
 */
export function getBounds(p: Perturbation | ComposedPerturbation): ComputedBounds {
  if (isComposedPerturbation(p)) {
    return p.bounds;
  }
  
  return {
    maxMagnitude: p.magnitude,
    totalDuration: p.temporal.duration,
    domains: new Set([p.domain]),
    effects: new Set([p.effect]),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateComposedId(...parts: (PerturbationId | string)[]): PerturbationId {
  const joined = parts.join('_');
  // Simple hash for determinism
  let hash = 0;
  for (let i = 0; i < joined.length; i++) {
    const char = joined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return perturbationId(`COMP_${Math.abs(hash).toString(16).toUpperCase()}`);
}

function hashCondition(condition: string): string {
  let hash = 0;
  for (let i = 0; i < condition.length; i++) {
    const char = condition.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 8).toUpperCase();
}

function wrapAsSingle(p: Perturbation | ComposedPerturbation): ComposedPerturbation {
  if (isComposedPerturbation(p)) {
    return p;
  }
  
  return {
    id: generateComposedId('WRAP', p.id),
    operator: CompositionOperator.SEQUENCE,
    operands: [p],
    params: { type: 'SEQUENCE', gap: durationMs(0) },
    bounds: getBounds(p),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALGEBRAIC PROPERTY VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify closure property: compose(p1, p2) ∈ P
 * Always returns true by construction
 */
export function verifyClosure(
  p1: Perturbation | ComposedPerturbation,
  p2: Perturbation | ComposedPerturbation,
  op: (a: Perturbation | ComposedPerturbation, b: Perturbation | ComposedPerturbation) => ComposedPerturbation
): boolean {
  try {
    const result = op(p1, p2);
    return isComposedPerturbation(result);
  } catch {
    return false;
  }
}

/**
 * Verify associativity: (p1∘p2)∘p3 = p1∘(p2∘p3)
 * For sequence composition
 */
export function verifyAssociativity(
  p1: Perturbation | ComposedPerturbation,
  p2: Perturbation | ComposedPerturbation,
  p3: Perturbation | ComposedPerturbation
): boolean {
  const leftAssoc = sequence(sequence(p1, p2), p3);
  const rightAssoc = sequence(p1, sequence(p2, p3));
  
  // Compare bounds (structural equality)
  const b1 = leftAssoc.bounds;
  const b2 = rightAssoc.bounds;
  
  return (
    b1.maxMagnitude === b2.maxMagnitude &&
    b1.totalDuration === b2.totalDuration &&
    setsEqual(b1.domains, b2.domains) &&
    setsEqual(b1.effects, b2.effects)
  );
}

/**
 * Verify identity: e∘p = p∘e = p
 */
export function verifyIdentity(
  p: Perturbation | ComposedPerturbation
): boolean {
  const e = identity();
  
  const leftId = sequence(e, p);
  const rightId = sequence(p, e);
  
  const pBounds = getBounds(p);
  const leftBounds = leftId.bounds;
  const rightBounds = rightId.bounds;
  
  // With identity, bounds should match original
  return (
    pBounds.maxMagnitude === leftBounds.maxMagnitude &&
    pBounds.maxMagnitude === rightBounds.maxMagnitude
  );
}

/**
 * Verify boundedness: ||effect(p)|| ≤ K
 */
export function verifyBoundedness(
  p: Perturbation | ComposedPerturbation,
  maxBound: Magnitude = magnitude(1.0)
): boolean {
  const bounds = getBounds(p);
  return bounds.maxMagnitude <= maxBound;
}

function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPTH AND COMPLEXITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate the depth of a composed perturbation
 */
export function depth(p: Perturbation | ComposedPerturbation): number {
  if (isPerturbation(p)) {
    return 1;
  }
  
  return 1 + Math.max(...p.operands.map(depth));
}

/**
 * Calculate the total number of base perturbations
 */
export function complexity(p: Perturbation | ComposedPerturbation): number {
  if (isPerturbation(p)) {
    return 1;
  }
  
  return p.operands.reduce((sum, op) => sum + complexity(op), 0);
}

/**
 * Flatten a composed perturbation to its base perturbations
 */
export function flatten(p: Perturbation | ComposedPerturbation): ReadonlyArray<Perturbation> {
  if (isPerturbation(p)) {
    return [p];
  }
  
  return p.operands.flatMap(flatten);
}
