/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Temporal Logic - Formula Builders
 * 
 * Phase 23 - Sprint 23.2
 * 
 * DSL for building LTL formulas.
 * Provides fluent API for constructing temporal properties.
 */

import {
  LTLFormula,
  AtomicProposition,
  UnaryFormula,
  BinaryFormula,
  BooleanConstant,
  formulaId,
  TRUE,
  FALSE,
  FormulaId,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMIC PROPOSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an atomic proposition
 */
export function atom(name: string, predicate?: string, description?: string): AtomicProposition {
  return {
    type: 'ATOMIC',
    id: formulaId(`ATOM_${name}`),
    name,
    predicate: predicate ?? name,
    description: description ?? `Predicate: ${name}`,
  };
}

/**
 * Create a boolean constant
 */
export function constant(value: boolean): BooleanConstant {
  return value ? TRUE : FALSE;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSITIONAL OPERATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Negation: ¬φ
 */
export function not(formula: LTLFormula): UnaryFormula {
  return {
    type: 'UNARY',
    id: formulaId(),
    operator: 'NOT',
    operand: formula,
  };
}

/**
 * Conjunction: φ ∧ ψ
 */
export function and(left: LTLFormula, right: LTLFormula): BinaryFormula {
  return {
    type: 'BINARY',
    id: formulaId(),
    operator: 'AND',
    left,
    right,
  };
}

/**
 * N-ary conjunction
 */
export function andAll(...formulas: LTLFormula[]): LTLFormula {
  if (formulas.length === 0) return TRUE;
  if (formulas.length === 1) return formulas[0]!;
  return formulas.reduce((acc, f) => and(acc, f));
}

/**
 * Disjunction: φ ∨ ψ
 */
export function or(left: LTLFormula, right: LTLFormula): BinaryFormula {
  return {
    type: 'BINARY',
    id: formulaId(),
    operator: 'OR',
    left,
    right,
  };
}

/**
 * N-ary disjunction
 */
export function orAll(...formulas: LTLFormula[]): LTLFormula {
  if (formulas.length === 0) return FALSE;
  if (formulas.length === 1) return formulas[0]!;
  return formulas.reduce((acc, f) => or(acc, f));
}

/**
 * Implication: φ → ψ
 */
export function implies(left: LTLFormula, right: LTLFormula): BinaryFormula {
  return {
    type: 'BINARY',
    id: formulaId(),
    operator: 'IMPLIES',
    left,
    right,
  };
}

/**
 * Bi-implication: φ ↔ ψ
 */
export function iff(left: LTLFormula, right: LTLFormula): BinaryFormula {
  return {
    type: 'BINARY',
    id: formulaId(),
    operator: 'IFF',
    left,
    right,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPORAL OPERATORS - FUTURE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Always/Globally: □φ
 * "φ holds at all future states"
 */
export function always(formula: LTLFormula): UnaryFormula {
  return {
    type: 'UNARY',
    id: formulaId(),
    operator: 'ALWAYS',
    operand: formula,
  };
}

/**
 * Eventually/Finally: ◇φ
 * "φ holds at some future state"
 */
export function eventually(formula: LTLFormula): UnaryFormula {
  return {
    type: 'UNARY',
    id: formulaId(),
    operator: 'EVENTUALLY',
    operand: formula,
  };
}

/**
 * Next: ○φ
 * "φ holds at the next state"
 */
export function next(formula: LTLFormula): UnaryFormula {
  return {
    type: 'UNARY',
    id: formulaId(),
    operator: 'NEXT',
    operand: formula,
  };
}

/**
 * Until: φ U ψ
 * "φ holds until ψ holds (and ψ must eventually hold)"
 */
export function until(left: LTLFormula, right: LTLFormula): BinaryFormula {
  return {
    type: 'BINARY',
    id: formulaId(),
    operator: 'UNTIL',
    left,
    right,
  };
}

/**
 * Weak Until: φ W ψ
 * "φ holds until ψ holds (ψ may never hold, in which case φ holds forever)"
 */
export function weakUntil(left: LTLFormula, right: LTLFormula): BinaryFormula {
  return {
    type: 'BINARY',
    id: formulaId(),
    operator: 'WEAK_UNTIL',
    left,
    right,
  };
}

/**
 * Release: φ R ψ
 * "ψ holds until and including when φ first holds (φ may never hold)"
 * Dual of Until: φ R ψ ≡ ¬(¬φ U ¬ψ)
 */
export function release(left: LTLFormula, right: LTLFormula): BinaryFormula {
  return {
    type: 'BINARY',
    id: formulaId(),
    operator: 'RELEASE',
    left,
    right,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPORAL OPERATORS - PAST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Historically: □⁻φ
 * "φ held at all past states"
 */
export function historically(formula: LTLFormula): UnaryFormula {
  return {
    type: 'UNARY',
    id: formulaId(),
    operator: 'HISTORICALLY',
    operand: formula,
  };
}

/**
 * Once: ◇⁻φ
 * "φ held at some past state"
 */
export function once(formula: LTLFormula): UnaryFormula {
  return {
    type: 'UNARY',
    id: formulaId(),
    operator: 'ONCE',
    operand: formula,
  };
}

/**
 * Previous: ○⁻φ
 * "φ held at the previous state"
 */
export function previous(formula: LTLFormula): UnaryFormula {
  return {
    type: 'UNARY',
    id: formulaId(),
    operator: 'PREVIOUS',
    operand: formula,
  };
}

/**
 * Since: φ S ψ
 * "ψ held at some past state and φ held since then"
 */
export function since(left: LTLFormula, right: LTLFormula): BinaryFormula {
  return {
    type: 'BINARY',
    id: formulaId(),
    operator: 'SINCE',
    left,
    right,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMON PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safety: □(precondition → postcondition)
 * "Whenever precondition holds, postcondition holds"
 */
export function safety(precondition: LTLFormula, postcondition: LTLFormula): LTLFormula {
  return always(implies(precondition, postcondition));
}

/**
 * Liveness: □(trigger → ◇response)
 * "Whenever trigger occurs, response eventually occurs"
 */
export function liveness(trigger: LTLFormula, response: LTLFormula): LTLFormula {
  return always(implies(trigger, eventually(response)));
}

/**
 * Fairness: □◇(condition)
 * "Condition occurs infinitely often"
 */
export function fairness(condition: LTLFormula): LTLFormula {
  return always(eventually(condition));
}

/**
 * Stability: ◇□(condition)
 * "Condition eventually holds forever"
 */
export function stability(condition: LTLFormula): LTLFormula {
  return eventually(always(condition));
}

/**
 * Absence: □¬(condition)
 * "Condition never holds"
 */
export function absence(condition: LTLFormula): LTLFormula {
  return always(not(condition));
}

/**
 * Existence: ◇(condition)
 * "Condition holds at least once"
 */
export function existence(condition: LTLFormula): LTLFormula {
  return eventually(condition);
}

/**
 * Precedence: ¬response W trigger
 * "Response can only occur after trigger"
 */
export function precedence(trigger: LTLFormula, response: LTLFormula): LTLFormula {
  return weakUntil(not(response), trigger);
}

/**
 * Response Chain: □(a → ◇(b → ◇c))
 * "Whenever a occurs, b eventually occurs, and after that c eventually occurs"
 */
export function responseChain(a: LTLFormula, b: LTLFormula, c: LTLFormula): LTLFormula {
  return always(implies(a, eventually(implies(b, eventually(c)))));
}

/**
 * Bounded Response: □(trigger → ○○...○(response))
 * "Response occurs within n steps of trigger"
 */
export function boundedResponse(trigger: LTLFormula, response: LTLFormula, bound: number): LTLFormula {
  let bounded = response;
  for (let i = 0; i < bound; i++) {
    bounded = or(response, next(bounded));
  }
  return always(implies(trigger, bounded));
}

/**
 * Mutual Exclusion: □¬(a ∧ b)
 * "a and b are never true at the same time"
 */
export function mutualExclusion(a: LTLFormula, b: LTLFormula): LTLFormula {
  return always(not(and(a, b)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMULA UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert formula to string representation
 */
export function toString(formula: LTLFormula): string {
  switch (formula.type) {
    case 'CONSTANT':
      return formula.value ? '⊤' : '⊥';
    case 'ATOMIC':
      return formula.name;
    case 'UNARY':
      const op = getUnarySymbol(formula.operator);
      return `${op}(${toString(formula.operand)})`;
    case 'BINARY':
      const binOp = getBinarySymbol(formula.operator);
      return `(${toString(formula.left)} ${binOp} ${toString(formula.right)})`;
  }
}

function getUnarySymbol(op: string): string {
  switch (op) {
    case 'NOT': return '¬';
    case 'ALWAYS': return '□';
    case 'EVENTUALLY': return '◇';
    case 'NEXT': return '○';
    case 'HISTORICALLY': return '□⁻';
    case 'ONCE': return '◇⁻';
    case 'PREVIOUS': return '○⁻';
    default: return op;
  }
}

function getBinarySymbol(op: string): string {
  switch (op) {
    case 'AND': return '∧';
    case 'OR': return '∨';
    case 'IMPLIES': return '→';
    case 'IFF': return '↔';
    case 'UNTIL': return 'U';
    case 'WEAK_UNTIL': return 'W';
    case 'RELEASE': return 'R';
    case 'SINCE': return 'S';
    default: return op;
  }
}

/**
 * Get the depth of a formula
 */
export function depth(formula: LTLFormula): number {
  switch (formula.type) {
    case 'CONSTANT':
    case 'ATOMIC':
      return 1;
    case 'UNARY':
      return 1 + depth(formula.operand);
    case 'BINARY':
      return 1 + Math.max(depth(formula.left), depth(formula.right));
  }
}

/**
 * Get all atomic propositions in a formula
 */
export function getAtoms(formula: LTLFormula): AtomicProposition[] {
  switch (formula.type) {
    case 'CONSTANT':
      return [];
    case 'ATOMIC':
      return [formula];
    case 'UNARY':
      return getAtoms(formula.operand);
    case 'BINARY':
      return [...getAtoms(formula.left), ...getAtoms(formula.right)];
  }
}

/**
 * Count the number of temporal operators
 */
export function countTemporalOperators(formula: LTLFormula): number {
  const temporal = ['ALWAYS', 'EVENTUALLY', 'NEXT', 'UNTIL', 'WEAK_UNTIL', 'RELEASE', 
                   'HISTORICALLY', 'ONCE', 'PREVIOUS', 'SINCE'];
  
  switch (formula.type) {
    case 'CONSTANT':
    case 'ATOMIC':
      return 0;
    case 'UNARY':
      const isTemp = temporal.includes(formula.operator) ? 1 : 0;
      return isTemp + countTemporalOperators(formula.operand);
    case 'BINARY':
      const isTempBin = temporal.includes(formula.operator) ? 1 : 0;
      return isTempBin + countTemporalOperators(formula.left) + countTemporalOperators(formula.right);
  }
}

/**
 * Check if formula is a safety property (no liveness requirements)
 */
export function isSafetyProperty(formula: LTLFormula): boolean {
  // Simplified check: no Eventually or Until operators
  switch (formula.type) {
    case 'CONSTANT':
    case 'ATOMIC':
      return true;
    case 'UNARY':
      if (formula.operator === 'EVENTUALLY' || formula.operator === 'ONCE') {
        return false;
      }
      return isSafetyProperty(formula.operand);
    case 'BINARY':
      if (formula.operator === 'UNTIL' || formula.operator === 'SINCE') {
        return false;
      }
      return isSafetyProperty(formula.left) && isSafetyProperty(formula.right);
  }
}

/**
 * Simplify a formula (basic simplifications)
 */
export function simplify(formula: LTLFormula): LTLFormula {
  switch (formula.type) {
    case 'CONSTANT':
    case 'ATOMIC':
      return formula;
      
    case 'UNARY': {
      const simplified = simplify(formula.operand);
      
      // Double negation: ¬¬φ = φ
      if (formula.operator === 'NOT' && 
          simplified.type === 'UNARY' && 
          simplified.operator === 'NOT') {
        return simplified.operand;
      }
      
      // Constants
      if (simplified.type === 'CONSTANT') {
        if (formula.operator === 'NOT') {
          return constant(!simplified.value);
        }
        if (formula.operator === 'ALWAYS' && simplified.value) {
          return TRUE;
        }
        if (formula.operator === 'EVENTUALLY' && !simplified.value) {
          return FALSE;
        }
      }
      
      return { ...formula, operand: simplified };
    }
    
    case 'BINARY': {
      const left = simplify(formula.left);
      const right = simplify(formula.right);
      
      // Identity laws
      if (formula.operator === 'AND') {
        if (left.type === 'CONSTANT' && left.value) return right;
        if (right.type === 'CONSTANT' && right.value) return left;
        if (left.type === 'CONSTANT' && !left.value) return FALSE;
        if (right.type === 'CONSTANT' && !right.value) return FALSE;
      }
      
      if (formula.operator === 'OR') {
        if (left.type === 'CONSTANT' && !left.value) return right;
        if (right.type === 'CONSTANT' && !right.value) return left;
        if (left.type === 'CONSTANT' && left.value) return TRUE;
        if (right.type === 'CONSTANT' && right.value) return TRUE;
      }
      
      if (formula.operator === 'IMPLIES') {
        // ⊤ → φ = φ
        if (left.type === 'CONSTANT' && left.value) return right;
        // ⊥ → φ = ⊤
        if (left.type === 'CONSTANT' && !left.value) return TRUE;
        // φ → ⊤ = ⊤
        if (right.type === 'CONSTANT' && right.value) return TRUE;
      }
      
      return { ...formula, left, right };
    }
  }
}
