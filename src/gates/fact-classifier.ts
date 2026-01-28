/**
 * OMEGA Truth Gate Fact Classifier v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * F3: CanonicalFact[] → ClassifiedFact[]
 *
 * INVARIANTS:
 * - F3-INV-01: Classification is exhaustive (every fact classified)
 * - F3-INV-02: Classification is deterministic
 * - F3-INV-03: Only FACT_STRICT goes to F4 (canon matching)
 *
 * SPEC: TRUTH_GATE_SPEC v1.0 §F3
 */

import { validatePredicate } from '../canon';
import type { CanonicalFact, ClassifiedFact, FactClass } from './types';
import { FactClass as FC } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Keywords that indicate non-factual content.
 * These patterns result in NON_FACTUAL classification.
 */
const NON_FACTUAL_INDICATORS: readonly string[] = [
  'maybe',
  'perhaps',
  'possibly',
  'probably',
  'might',
  'could',
  'should',
  'would',
  'think',
  'believe',
  'assume',
  'guess',
  'wonder',
  'opinion',
  'feel',
  'seems',
  'appears',
  'likely',
  'unlikely',
];

/**
 * Predicates that indicate derived/inferred facts.
 * These result in FACT_DERIVED classification.
 */
const DERIVED_PREDICATES: readonly string[] = [
  'IMPLIES',
  'SUGGESTS',
  'INFERRED',
  'DERIVED',
  'COMPUTED',
  'CALCULATED',
  'ESTIMATED',
];

/**
 * Predicates that indicate strict factual assertions.
 * These require CANON validation (FACT_STRICT).
 */
const STRICT_PREDICATES: readonly string[] = [
  'IS_A',
  'HAS_NAME',
  'HAS_AGE',
  'HAS_ATTRIBUTE',
  'KNOWS',
  'RELATED_TO',
  'HAS_CITY',
  'HAS_HEIGHT',
  'HAS_WEIGHT',
  'HAS_DATE',
  'HAS_LOCATION',
  'HAS_VALUE',
];

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if text contains non-factual indicators.
 */
function containsNonFactualIndicator(text: string): boolean {
  const lowerText = text.toLowerCase();
  return NON_FACTUAL_INDICATORS.some(indicator => lowerText.includes(indicator));
}

/**
 * Checks if predicate indicates derived fact.
 */
function isDerivedPredicate(predicate: string): boolean {
  return DERIVED_PREDICATES.includes(predicate.toUpperCase());
}

/**
 * Checks if predicate indicates strict fact.
 */
function isStrictPredicate(predicate: string): boolean {
  const upper = predicate.toUpperCase();
  // Check if it's in strict list or starts with common fact patterns
  return STRICT_PREDICATES.includes(upper) ||
         upper.startsWith('HAS_') ||
         upper === 'IS_A' ||
         validatePredicate(predicate);
}

/**
 * Classifies a single fact.
 *
 * Classification priority:
 * 1. NON_FACTUAL if source text contains uncertainty indicators
 * 2. FACT_DERIVED if predicate indicates inference
 * 3. FACT_STRICT if predicate indicates direct assertion
 * 4. NON_FACTUAL as fallback
 *
 * F3-INV-02: Deterministic - same input always produces same classification
 */
function classifyFact(fact: CanonicalFact): ClassifiedFact {
  const sourceText = fact.sourceSpan.text;

  // Rule 1: Check for non-factual indicators in source text
  if (containsNonFactualIndicator(sourceText)) {
    return {
      ...fact,
      classification: FC.NON_FACTUAL,
      classificationReason: 'Source text contains uncertainty indicator',
    };
  }

  // Rule 2: Check for derived predicates
  if (isDerivedPredicate(fact.predicate)) {
    return {
      ...fact,
      classification: FC.FACT_DERIVED,
      classificationReason: `Predicate ${fact.predicate} indicates derived fact`,
    };
  }

  // Rule 3: Check for strict predicates
  if (isStrictPredicate(fact.predicate)) {
    return {
      ...fact,
      classification: FC.FACT_STRICT,
      classificationReason: `Predicate ${fact.predicate} requires CANON validation`,
    };
  }

  // Rule 4: Default to non-factual for unknown predicates
  return {
    ...fact,
    classification: FC.NON_FACTUAL,
    classificationReason: `Unknown predicate ${fact.predicate} treated as non-factual`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classifies an array of canonical facts.
 *
 * F3-INV-01: Every fact is classified
 * F3-INV-02: Classification is deterministic
 * F3-INV-03: Only FACT_STRICT goes to canon matching
 *
 * @param facts - Array of canonical facts to classify
 * @returns Array of classified facts (same length, same order)
 */
export function classifyFacts(facts: readonly CanonicalFact[]): ClassifiedFact[] {
  return facts.map(classifyFact);
}

/**
 * Filters classified facts to only FACT_STRICT.
 * These are the only facts that need CANON validation.
 *
 * F3-INV-03: Only FACT_STRICT to F4
 *
 * @param facts - Classified facts
 * @returns Only FACT_STRICT facts
 */
export function getStrictFacts(facts: readonly ClassifiedFact[]): ClassifiedFact[] {
  return facts.filter(f => f.classification === FC.FACT_STRICT);
}

/**
 * Filters classified facts to only FACT_DERIVED.
 *
 * @param facts - Classified facts
 * @returns Only FACT_DERIVED facts
 */
export function getDerivedFacts(facts: readonly ClassifiedFact[]): ClassifiedFact[] {
  return facts.filter(f => f.classification === FC.FACT_DERIVED);
}

/**
 * Filters classified facts to only NON_FACTUAL.
 *
 * @param facts - Classified facts
 * @returns Only NON_FACTUAL facts
 */
export function getNonFactualFacts(facts: readonly ClassifiedFact[]): ClassifiedFact[] {
  return facts.filter(f => f.classification === FC.NON_FACTUAL);
}

/**
 * Gets classification statistics.
 *
 * @param facts - Classified facts
 * @returns Statistics object
 */
export function getClassificationStats(facts: readonly ClassifiedFact[]): {
  total: number;
  strict: number;
  derived: number;
  nonFactual: number;
} {
  return {
    total: facts.length,
    strict: facts.filter(f => f.classification === FC.FACT_STRICT).length,
    derived: facts.filter(f => f.classification === FC.FACT_DERIVED).length,
    nonFactual: facts.filter(f => f.classification === FC.NON_FACTUAL).length,
  };
}

/**
 * Validates that all facts are classified.
 * F3-INV-01: Exhaustive classification
 *
 * @param facts - Facts to validate
 * @returns true if all facts have valid classification
 */
export function allFactsClassified(facts: readonly ClassifiedFact[]): boolean {
  return facts.every(f =>
    f.classification === FC.FACT_STRICT ||
    f.classification === FC.FACT_DERIVED ||
    f.classification === FC.NON_FACTUAL
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  NON_FACTUAL_INDICATORS,
  DERIVED_PREDICATES,
  STRICT_PREDICATES,
  containsNonFactualIndicator,
  isDerivedPredicate,
  isStrictPredicate,
  classifyFact,
};
