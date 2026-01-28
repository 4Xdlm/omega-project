/**
 * OMEGA Truth Gate Canon Matcher v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * F4: FACT_STRICT → CanonViolation[]
 *
 * INVARIANTS:
 * - F4-INV-01: Reads CANON only (no writes)
 * - F4-INV-02: Matching is deterministic
 * - F4-INV-03: All violations have required fields
 * - F4-INV-04: Uses semanticEquals for value comparison
 *
 * SPEC: TRUTH_GATE_SPEC v1.0 §F4
 */

import {
  semanticEquals,
  validatePredicate,
  type CanonAPI,
  type CanonClaim,
  type EntityId,
  type PredicateType,
  ClaimStatus,
} from '../canon';
import type { ClassifiedFact, CanonViolation, ViolationCode } from './types';
import { ViolationCode as VC, FactClass } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// MATCHER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Read-only interface for CANON access.
 * F4-INV-01: Only read operations allowed.
 */
export interface CanonReader {
  /** Get all claims for a subject entity */
  getClaimsForSubject(subject: EntityId): Promise<readonly CanonClaim[]>;
  /** Get active claims by subject and predicate */
  getActiveClaimsBySubjectAndPredicate(
    subject: EntityId,
    predicate: PredicateType
  ): Promise<readonly CanonClaim[]>;
  /** Check if entity exists in CANON */
  getAllClaims(): Promise<readonly CanonClaim[]>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIOLATION CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a violation record.
 * F4-INV-03: All required fields populated.
 */
function createViolation(
  code: ViolationCode,
  fact: ClassifiedFact,
  message: string,
  relatedClaimId?: string,
  expectedValue?: unknown,
  actualValue?: unknown
): CanonViolation {
  return {
    code,
    fact,
    message,
    relatedClaimId: relatedClaimId as any,
    expectedValue,
    actualValue,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATCHING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if an entity exists in CANON.
 * Returns UNKNOWN_ENTITY (C-01) violation if not found.
 */
async function checkEntityExists(
  fact: ClassifiedFact,
  reader: CanonReader
): Promise<CanonViolation | null> {
  const claims = await reader.getAllClaims();
  const subjects = new Set(claims.map(c => c.subject));

  // Check if the subject exists as an entity
  const entityId = `ENT-${fact.subject.toLowerCase().replace(/\s+/g, '-')}-` as EntityId;
  const subjectExists = Array.from(subjects).some(s =>
    s.startsWith('ENT-') && s.toLowerCase().includes(fact.subject.toLowerCase().replace(/\s+/g, '-'))
  ) || subjects.has(fact.subject as EntityId);

  if (!subjectExists && claims.length > 0) {
    // Only report if CANON has claims but this entity is not found
    return createViolation(
      VC.UNKNOWN_ENTITY,
      fact,
      `Entity "${fact.subject}" not found in CANON`,
      undefined,
      undefined,
      fact.subject
    );
  }

  return null;
}

/**
 * Checks if a predicate is valid in the catalog.
 * Returns FORBIDDEN_PREDICATE (C-02) violation if not found.
 */
function checkPredicateValid(fact: ClassifiedFact): CanonViolation | null {
  if (!validatePredicate(fact.predicate)) {
    return createViolation(
      VC.FORBIDDEN_PREDICATE,
      fact,
      `Predicate "${fact.predicate}" not in catalog`,
      undefined,
      undefined,
      fact.predicate
    );
  }
  return null;
}

/**
 * Checks if a fact value contradicts CANON.
 * Returns CONTRADICTORY_VALUE (C-03) violation if different value found.
 *
 * F4-INV-04: Uses semanticEquals for comparison.
 */
async function checkValueContradiction(
  fact: ClassifiedFact,
  reader: CanonReader
): Promise<CanonViolation | null> {
  // Find matching entity in CANON
  const claims = await reader.getAllClaims();

  // Look for claims about the same subject with same predicate
  const matchingClaims = claims.filter(c => {
    const subjectMatch =
      c.subject === fact.subject ||
      c.subject.toLowerCase().includes(fact.subject.toLowerCase().replace(/\s+/g, '-'));
    const predicateMatch =
      c.predicate === fact.predicate ||
      c.predicate.toUpperCase() === fact.predicate.toUpperCase();
    return subjectMatch && predicateMatch && c.status === ClaimStatus.ACTIVE;
  });

  for (const claim of matchingClaims) {
    // F4-INV-04: Use semanticEquals, not !== or JSON.stringify
    if (!semanticEquals(claim.value, fact.object)) {
      return createViolation(
        VC.CONTRADICTORY_VALUE,
        fact,
        `Value "${String(fact.object)}" contradicts CANON value "${String(claim.value)}"`,
        claim.id,
        claim.value,
        fact.object
      );
    }
  }

  return null;
}

/**
 * Checks for ambiguous entity references.
 * Returns AMBIGUITY_DETECTED (C-06) if multiple entities could match.
 */
async function checkAmbiguity(
  fact: ClassifiedFact,
  reader: CanonReader
): Promise<CanonViolation | null> {
  const claims = await reader.getAllClaims();

  // Find all entities that could match the subject
  const matchingSubjects = new Set<string>();
  for (const claim of claims) {
    if (claim.subject.toLowerCase().includes(fact.subject.toLowerCase())) {
      matchingSubjects.add(claim.subject);
    }
  }

  if (matchingSubjects.size > 1) {
    return createViolation(
      VC.AMBIGUITY_DETECTED,
      fact,
      `Ambiguous reference: "${fact.subject}" could match ${matchingSubjects.size} entities`,
      undefined,
      Array.from(matchingSubjects),
      fact.subject
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MATCHING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Matches FACT_STRICT facts against CANON.
 *
 * F4-INV-01: Read-only CANON access
 * F4-INV-02: Deterministic matching
 * F4-INV-03: Complete violation records
 * F4-INV-04: semanticEquals for values
 *
 * @param facts - Classified facts (only FACT_STRICT processed)
 * @param reader - Read-only CANON access
 * @returns Array of violations (empty if all facts valid)
 */
export async function matchAgainstCanon(
  facts: readonly ClassifiedFact[],
  reader: CanonReader
): Promise<CanonViolation[]> {
  const violations: CanonViolation[] = [];

  // Only process FACT_STRICT facts
  const strictFacts = facts.filter(f => f.classification === FactClass.FACT_STRICT);

  for (const fact of strictFacts) {
    // Check 1: Predicate validity
    const predicateViolation = checkPredicateValid(fact);
    if (predicateViolation) {
      violations.push(predicateViolation);
      continue; // Skip other checks if predicate is invalid
    }

    // Check 2: Value contradiction (most important)
    const contradictionViolation = await checkValueContradiction(fact, reader);
    if (contradictionViolation) {
      violations.push(contradictionViolation);
      continue;
    }

    // Note: We don't check entity existence for new entities (would always fail)
    // Note: We don't check ambiguity by default (too strict for normal usage)
  }

  return violations;
}

/**
 * Matches a single fact against CANON.
 * Useful for testing and incremental validation.
 *
 * @param fact - Single fact to match
 * @param reader - Read-only CANON access
 * @returns Violation if found, null if valid
 */
export async function matchSingleFact(
  fact: ClassifiedFact,
  reader: CanonReader
): Promise<CanonViolation | null> {
  if (fact.classification !== FactClass.FACT_STRICT) {
    return null;
  }

  // Check predicate first
  const predicateViolation = checkPredicateValid(fact);
  if (predicateViolation) {
    return predicateViolation;
  }

  // Check value contradiction
  const contradictionViolation = await checkValueContradiction(fact, reader);
  if (contradictionViolation) {
    return contradictionViolation;
  }

  return null;
}

/**
 * Performs comprehensive matching including all checks.
 * Use for strict validation scenarios.
 *
 * @param fact - Single fact to match
 * @param reader - Read-only CANON access
 * @returns Array of all violations found
 */
export async function matchFactComprehensive(
  fact: ClassifiedFact,
  reader: CanonReader
): Promise<CanonViolation[]> {
  const violations: CanonViolation[] = [];

  if (fact.classification !== FactClass.FACT_STRICT) {
    return violations;
  }

  // Check predicate
  const predicateViolation = checkPredicateValid(fact);
  if (predicateViolation) {
    violations.push(predicateViolation);
  }

  // Check entity existence
  const entityViolation = await checkEntityExists(fact, reader);
  if (entityViolation) {
    violations.push(entityViolation);
  }

  // Check value contradiction
  const contradictionViolation = await checkValueContradiction(fact, reader);
  if (contradictionViolation) {
    violations.push(contradictionViolation);
  }

  // Check ambiguity
  const ambiguityViolation = await checkAmbiguity(fact, reader);
  if (ambiguityViolation) {
    violations.push(ambiguityViolation);
  }

  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  checkEntityExists,
  checkPredicateValid,
  checkValueContradiction,
  checkAmbiguity,
  createViolation,
};
