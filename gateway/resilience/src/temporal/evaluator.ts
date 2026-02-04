/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Temporal Logic - Evaluator
 * 
 * Phase 23 - Sprint 23.2
 * 
 * Evaluates LTL formulas against execution traces.
 * Uses a direct semantics-based approach.
 */

import {
  LTLFormula,
  State,
  Trace,
  EvaluationResult,
  TracePosition,
  isAtomicProposition,
  isUnaryFormula,
  isBinaryFormula,
  isBooleanConstant,
  stateId,
  traceTime,
  TraceTime,
  StateId,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * LTL Formula Evaluator
 * 
 * Evaluates formulas on finite traces using the standard LTL semantics.
 * For infinite behaviors on finite traces, we assume the last state repeats.
 */
export class LTLEvaluator {
  private readonly trace: Trace;
  private readonly cache: Map<string, boolean[]> = new Map();

  constructor(trace: Trace) {
    this.trace = trace;
  }

  /**
   * Evaluate a formula and return detailed result
   */
  evaluate(formula: LTLFormula): EvaluationResult {
    const satisfyingStates: number[] = [];
    const violatingStates: number[] = [];
    let counterexample: TracePosition | null = null;

    // Evaluate at each position
    for (let i = 0; i < this.trace.states.length; i++) {
      const holds = this.evaluateAt(formula, i);
      if (holds) {
        satisfyingStates.push(i);
      } else {
        violatingStates.push(i);
        if (!counterexample) {
          counterexample = {
            stateIndex: i,
            state: this.trace.states[i]!,
            reason: `Formula violated at state ${i}`,
          };
        }
      }
    }

    // Overall result is whether formula holds at initial state
    const result = this.trace.states.length === 0 ? true : this.evaluateAt(formula, 0);

    return {
      formula,
      trace: this.trace,
      result,
      satisfyingStates,
      violatingStates,
      counterexample: result ? null : counterexample,
    };
  }

  /**
   * Evaluate formula at a specific position in the trace
   */
  evaluateAt(formula: LTLFormula, position: number): boolean {
    // Check cache
    const cacheKey = `${formula.id}_${position}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached[0]!;
    }

    const result = this.doEvaluate(formula, position);
    this.cache.set(cacheKey, [result]);
    return result;
  }

  private doEvaluate(formula: LTLFormula, position: number): boolean {
    if (isBooleanConstant(formula)) {
      return formula.value;
    }

    if (isAtomicProposition(formula)) {
      // Use the atom's name for lookup in propositions map
      return this.evaluateAtom(formula.name, position);
    }

    if (isUnaryFormula(formula)) {
      return this.evaluateUnary(formula, position);
    }

    if (isBinaryFormula(formula)) {
      return this.evaluateBinary(formula, position);
    }

    throw new Error(`Unknown formula type: ${(formula as unknown as { type: string }).type}`);
  }

  private evaluateAtom(predicate: string, position: number): boolean {
    if (position >= this.trace.states.length) {
      // Beyond trace: assume last state repeats
      position = this.trace.states.length - 1;
    }
    if (position < 0 || this.trace.states.length === 0) {
      return false;
    }

    const state = this.trace.states[position]!;
    return state.propositions.get(predicate) ?? false;
  }

  private evaluateUnary(formula: LTLFormula & { type: 'UNARY' }, position: number): boolean {
    switch (formula.operator) {
      case 'NOT':
        return !this.evaluateAt(formula.operand, position);

      case 'ALWAYS':
        // □φ: φ holds at all states from position onwards
        for (let i = position; i < this.trace.states.length; i++) {
          if (!this.evaluateAt(formula.operand, i)) {
            return false;
          }
        }
        return true;

      case 'EVENTUALLY':
        // ◇φ: φ holds at some state from position onwards
        for (let i = position; i < this.trace.states.length; i++) {
          if (this.evaluateAt(formula.operand, i)) {
            return true;
          }
        }
        return false;

      case 'NEXT':
        // ○φ: φ holds at the next state
        if (position + 1 >= this.trace.states.length) {
          // Weak next: true if no next state (finite trace semantics)
          return true;
        }
        return this.evaluateAt(formula.operand, position + 1);

      case 'HISTORICALLY':
        // □⁻φ: φ held at all past states
        for (let i = 0; i <= position; i++) {
          if (!this.evaluateAt(formula.operand, i)) {
            return false;
          }
        }
        return true;

      case 'ONCE':
        // ◇⁻φ: φ held at some past state
        for (let i = 0; i <= position; i++) {
          if (this.evaluateAt(formula.operand, i)) {
            return true;
          }
        }
        return false;

      case 'PREVIOUS':
        // ○⁻φ: φ held at the previous state
        if (position === 0) {
          return true; // No previous state
        }
        return this.evaluateAt(formula.operand, position - 1);

      default:
        throw new Error(`Unknown unary operator: ${formula.operator}`);
    }
  }

  private evaluateBinary(formula: LTLFormula & { type: 'BINARY' }, position: number): boolean {
    switch (formula.operator) {
      case 'AND':
        return this.evaluateAt(formula.left, position) && this.evaluateAt(formula.right, position);

      case 'OR':
        return this.evaluateAt(formula.left, position) || this.evaluateAt(formula.right, position);

      case 'IMPLIES':
        // φ → ψ ≡ ¬φ ∨ ψ
        return !this.evaluateAt(formula.left, position) || this.evaluateAt(formula.right, position);

      case 'IFF':
        // φ ↔ ψ ≡ (φ → ψ) ∧ (ψ → φ)
        const left = this.evaluateAt(formula.left, position);
        const right = this.evaluateAt(formula.right, position);
        return left === right;

      case 'UNTIL':
        // φ U ψ: ψ eventually holds and φ holds until then
        for (let i = position; i < this.trace.states.length; i++) {
          if (this.evaluateAt(formula.right, i)) {
            // Found ψ, check φ held until now
            for (let j = position; j < i; j++) {
              if (!this.evaluateAt(formula.left, j)) {
                return false;
              }
            }
            return true;
          }
        }
        return false; // ψ never held

      case 'WEAK_UNTIL':
        // φ W ψ ≡ (φ U ψ) ∨ □φ
        // ψ may never happen; if it does, φ held until then
        for (let i = position; i < this.trace.states.length; i++) {
          if (this.evaluateAt(formula.right, i)) {
            // Found ψ, check φ held until now
            for (let j = position; j < i; j++) {
              if (!this.evaluateAt(formula.left, j)) {
                return false;
              }
            }
            return true;
          }
          if (!this.evaluateAt(formula.left, i)) {
            return false;
          }
        }
        return true; // φ held forever (ψ never occurred)

      case 'RELEASE':
        // φ R ψ ≡ ψ W (φ ∧ ψ)
        // ψ holds until and including when φ first holds
        for (let i = position; i < this.trace.states.length; i++) {
          if (!this.evaluateAt(formula.right, i)) {
            // ψ failed before φ released it
            return false;
          }
          if (this.evaluateAt(formula.left, i)) {
            // φ holds and ψ holds - release happens
            return true;
          }
        }
        return true; // ψ held forever

      case 'SINCE':
        // φ S ψ: ψ held at some past state and φ held since
        for (let i = position; i >= 0; i--) {
          if (this.evaluateAt(formula.right, i)) {
            // Found ψ in the past, check φ held since then
            for (let j = i + 1; j <= position; j++) {
              if (!this.evaluateAt(formula.left, j)) {
                return false;
              }
            }
            return true;
          }
        }
        return false; // ψ never held in the past

      default:
        throw new Error(`Unknown binary operator: ${formula.operator}`);
    }
  }

  /**
   * Clear evaluation cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a trace from a sequence of proposition sets
 */
export function buildTrace(
  id: string,
  propositionSequence: Array<Record<string, boolean>>,
  metadata: Record<string, unknown> = {}
): Trace {
  const states: State[] = propositionSequence.map((props, index) => ({
    id: stateId(`S${index}`),
    timestamp: traceTime(index),
    propositions: new Map(Object.entries(props)),
    data: {},
  }));

  return {
    id,
    states,
    startTime: traceTime(0),
    endTime: traceTime(states.length > 0 ? states.length - 1 : 0),
    metadata,
  };
}

/**
 * Build a trace from events
 */
export function buildTraceFromEvents(
  id: string,
  events: Array<{ timestamp: number; type: string; data?: Record<string, unknown> }>,
  propositionExtractor: (event: { type: string; data?: Record<string, unknown> }) => Record<string, boolean>
): Trace {
  const states: State[] = events.map((event, index) => ({
    id: stateId(`S${index}`),
    timestamp: traceTime(event.timestamp),
    propositions: new Map(Object.entries(propositionExtractor(event))),
    data: event.data ?? {},
  }));

  return {
    id,
    states,
    startTime: states.length > 0 ? states[0]!.timestamp : traceTime(0),
    endTime: states.length > 0 ? states[states.length - 1]!.timestamp : traceTime(0),
    metadata: {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an evaluator for a trace
 */
export function createEvaluator(trace: Trace): LTLEvaluator {
  return new LTLEvaluator(trace);
}

/**
 * Quick evaluation helper
 */
export function evaluateFormula(formula: LTLFormula, trace: Trace): boolean {
  const evaluator = new LTLEvaluator(trace);
  return evaluator.evaluate(formula).result;
}

/**
 * Evaluate multiple formulas on a trace
 */
export function evaluateAll(
  formulas: LTLFormula[],
  trace: Trace
): Map<string, EvaluationResult> {
  const evaluator = new LTLEvaluator(trace);
  const results = new Map<string, EvaluationResult>();
  
  for (const formula of formulas) {
    results.set(formula.id, evaluator.evaluate(formula));
  }
  
  return results;
}
