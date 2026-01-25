/**
 * OMEGA Emotion Gate — V-EMO-AXIOM-COMPAT Validator
 *
 * Validates emotion state against active axioms.
 * FAIL if emotion violates an active axiom constraint.
 */

import type {
  EmotionFrame,
  EmotionGateContext,
  EmotionValidatorResult,
  EmotionValidatorId,
  EmotionStateV2,
  Axiom,
} from '../gate/types.js';
import type { EmotionValidator } from './validator-interface.js';
import { passResult, failResult } from './validator-interface.js';

const VALIDATOR_ID: EmotionValidatorId = 'eval_axiom_compat';
const VALIDATOR_VERSION = '1.0.0';

/**
 * Evaluate a single axiom constraint.
 * Returns true if constraint is satisfied, false otherwise.
 */
function evaluateAxiomConstraint(
  axiom: Axiom,
  state: EmotionStateV2
): { satisfied: boolean; reason?: string } {
  // Parse constraint - simple expression evaluator
  // Supports: dimension < value, dimension > value, dimension = value
  const constraint = axiom.constraint.trim();

  // Match patterns like "fear < 0.5", "joy > 0.3", "anger = 0"
  const ltMatch = constraint.match(/^(\w+)\s*<\s*(\d+(?:\.\d+)?)$/);
  const gtMatch = constraint.match(/^(\w+)\s*>\s*(\d+(?:\.\d+)?)$/);
  const eqMatch = constraint.match(/^(\w+)\s*=\s*(\d+(?:\.\d+)?)$/);
  const lteMatch = constraint.match(/^(\w+)\s*<=\s*(\d+(?:\.\d+)?)$/);
  const gteMatch = constraint.match(/^(\w+)\s*>=\s*(\d+(?:\.\d+)?)$/);
  const neMatch = constraint.match(/^(\w+)\s*!=\s*(\d+(?:\.\d+)?)$/);

  let dimension: string | undefined;
  let threshold: number | undefined;
  let operator: '<' | '>' | '=' | '<=' | '>=' | '!=' | undefined;

  if (ltMatch) {
    [, dimension, ] = ltMatch;
    threshold = parseFloat(ltMatch[2]);
    operator = '<';
  } else if (gtMatch) {
    [, dimension, ] = gtMatch;
    threshold = parseFloat(gtMatch[2]);
    operator = '>';
  } else if (eqMatch) {
    [, dimension, ] = eqMatch;
    threshold = parseFloat(eqMatch[2]);
    operator = '=';
  } else if (lteMatch) {
    [, dimension, ] = lteMatch;
    threshold = parseFloat(lteMatch[2]);
    operator = '<=';
  } else if (gteMatch) {
    [, dimension, ] = gteMatch;
    threshold = parseFloat(gteMatch[2]);
    operator = '>=';
  } else if (neMatch) {
    [, dimension, ] = neMatch;
    threshold = parseFloat(neMatch[2]);
    operator = '!=';
  }

  if (!dimension || threshold === undefined || !operator) {
    // Cannot parse constraint — assume satisfied
    return { satisfied: true, reason: `Unknown constraint format: ${constraint}` };
  }

  // Check if dimension exists
  if (!(dimension in state)) {
    return { satisfied: true, reason: `Unknown dimension: ${dimension}` };
  }

  const value = state[dimension as keyof EmotionStateV2];

  let satisfied: boolean;
  switch (operator) {
    case '<':
      satisfied = value < threshold;
      break;
    case '>':
      satisfied = value > threshold;
      break;
    case '=':
      satisfied = Math.abs(value - threshold) < 0.001;
      break;
    case '<=':
      satisfied = value <= threshold;
      break;
    case '>=':
      satisfied = value >= threshold;
      break;
    case '!=':
      satisfied = Math.abs(value - threshold) >= 0.001;
      break;
    default:
      satisfied = true;
  }

  if (!satisfied) {
    return {
      satisfied: false,
      reason: `Axiom "${axiom.axiom_id}" violated: ${dimension} = ${value.toFixed(3)} but constraint requires ${constraint}`,
    };
  }

  return { satisfied: true };
}

/**
 * V-EMO-AXIOM-COMPAT Validator
 *
 * Checks:
 * - All active axioms are satisfied
 * - Constraints on affected dimensions are met
 */
export class VEmoAxiomCompatValidator implements EmotionValidator {
  readonly id: EmotionValidatorId = VALIDATOR_ID;
  readonly version: string = VALIDATOR_VERSION;
  readonly name = 'Emotion Axiom Compatibility Validator';
  readonly description = 'Validates emotion state against active axioms';

  evaluate(frame: EmotionFrame, context: EmotionGateContext): EmotionValidatorResult {
    const axioms = context.axioms;

    // No axioms — pass
    if (axioms.length === 0) {
      return passResult(this.id, this.version, 'No active axioms to check');
    }

    const violations: string[] = [];

    for (const axiom of axioms) {
      const result = evaluateAxiomConstraint(axiom, frame.emotion_state);
      if (!result.satisfied && result.reason) {
        violations.push(result.reason);
      }
    }

    if (violations.length > 0) {
      return failResult(this.id, this.version, violations);
    }

    return passResult(this.id, this.version, `All ${axioms.length} axiom(s) satisfied`);
  }
}

/**
 * Create the axiom compatibility validator.
 */
export function createAxiomCompatValidator(): VEmoAxiomCompatValidator {
  return new VEmoAxiomCompatValidator();
}
