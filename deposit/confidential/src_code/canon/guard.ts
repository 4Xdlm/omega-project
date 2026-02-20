/**
 * OMEGA Canon Guard v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-CONFLICT-01: Detection CONTR-001/002/003
 * - INV-E-CONFLICT-02: Guard FAIL = no write
 * - INV-E-CONFLICT-DET-03: semanticEquals for comparison (never !==)
 * - INV-E-NAN-01: NaN = FAIL immédiat
 *
 * RÈGLES:
 * - INT-E-07: 0 comparaison !== pour sémantique
 * - INT-E-08: 0 valeur NaN
 *
 * SPEC: CANON_SCHEMA_SPEC v1.2 §9
 */

import type {
  CanonClaim,
  ClaimId,
  ClaimValue,
  CreateClaimParams,
  EvidenceRef,
  PredicateType,
  EntityId,
} from './types';
import { CanonError, CanonErrorCode, isEvidenceType } from './types';
import { containsNaN, semanticEquals } from './semantic-equals';
import { validatePredicate } from './predicate-catalog';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRADICTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types of contradictions detected by Guard.
 */
export const ConflictType = {
  /** CONTR-001: Same (subject, predicate) with different value */
  DIRECT: 'DIRECT',
  /** CONTR-002: Referenced entity does not exist */
  ENTITY_MISSING: 'ENTITY_MISSING',
  /** CONTR-003: Supersession creates a cycle */
  SUPERSESSION_LOOP: 'SUPERSESSION_LOOP',
} as const;

export type ConflictType = (typeof ConflictType)[keyof typeof ConflictType];

/**
 * Result of conflict detection.
 */
export interface ConflictResult {
  readonly hasConflict: boolean;
  readonly type?: ConflictType;
  readonly conflictingClaimIds?: readonly ClaimId[];
  readonly message?: string;
}

/**
 * Result of full validation.
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

export interface ValidationError {
  readonly code: CanonErrorCode;
  readonly message: string;
  readonly field?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUARD INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface for claim stores used by Guard.
 */
export interface ClaimStore {
  getById(id: ClaimId): CanonClaim | undefined;
  getBySubjectAndPredicate(subject: EntityId, predicate: PredicateType): readonly CanonClaim[];
  getAllEntityIds(): readonly EntityId[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANON GUARD IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canon Guard - Validates claims before write.
 *
 * CRITICAL: Uses semanticEquals for CONTR-001 (INV-E-CONFLICT-DET-03)
 * CRITICAL: Rejects NaN values (INV-E-NAN-01)
 */
export class CanonGuard {
  /**
   * Validates a claim before creation.
   *
   * @param params - Claim parameters to validate
   * @returns Validation result
   */
  validateClaimParams(params: CreateClaimParams): ValidationResult {
    const errors: ValidationError[] = [];

    // Check subject (INV-E-07)
    if (!params.subject || params.subject.trim() === '') {
      errors.push({
        code: CanonErrorCode.INVALID_SUBJECT,
        message: 'Subject is required',
        field: 'subject',
      });
    }

    // Check predicate (INV-E-06)
    if (!validatePredicate(params.predicate)) {
      errors.push({
        code: CanonErrorCode.INVALID_PREDICATE,
        message: `Predicate not in catalog: ${params.predicate}`,
        field: 'predicate',
      });
    }

    // Check value for NaN (INV-E-NAN-01)
    if (containsNaN(params.value)) {
      errors.push({
        code: CanonErrorCode.INVALID_VALUE_NAN,
        message: 'Value contains NaN which is forbidden',
        field: 'value',
      });
    }

    // Check evidence refs
    for (let i = 0; i < params.evidence.length; i++) {
      const ev = params.evidence[i];
      if (!isEvidenceType(ev.type)) {
        errors.push({
          code: CanonErrorCode.INVALID_EVIDENCE,
          message: `Invalid evidence type at index ${i}: ${ev.type}`,
          field: `evidence[${i}].type`,
        });
      }
    }

    // Check lineage
    if (params.lineage.confidence < 0 || params.lineage.confidence > 1) {
      errors.push({
        code: CanonErrorCode.INVALID_LINEAGE,
        message: `Invalid confidence: ${params.lineage.confidence}`,
        field: 'lineage.confidence',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks for NaN in a value.
   *
   * INV-E-NAN-01
   *
   * @param value - Value to check
   * @returns true if NaN is present
   */
  checkNaN(value: ClaimValue): boolean {
    return containsNaN(value);
  }

  /**
   * Checks for CONTR-001: Direct contradiction.
   * Same (subject, predicate) with different value.
   *
   * CRITICAL: Uses semanticEquals (INV-E-CONFLICT-DET-03)
   * NEVER uses !== for semantic comparison
   *
   * @param newClaim - New claim to check
   * @param store - Claim store for lookup
   * @returns Conflict result
   */
  checkDirectConflict(
    newClaim: { subject: EntityId; predicate: PredicateType; value: ClaimValue; supersedes?: ClaimId },
    store: ClaimStore
  ): ConflictResult {
    // Check for NaN first
    if (containsNaN(newClaim.value)) {
      return {
        hasConflict: true,
        type: ConflictType.DIRECT,
        message: 'INVALID_VALUE_NAN: NaN forbidden in CANON',
      };
    }

    // Get existing claims with same subject + predicate
    const existing = store.getBySubjectAndPredicate(newClaim.subject, newClaim.predicate);

    // Filter to active claims only
    const active = existing.filter((c) => c.status === 'ACTIVE');

    for (const claim of active) {
      // Skip if new claim supersedes this one
      if (newClaim.supersedes === claim.id) {
        continue;
      }

      // CRITICAL: Use semanticEquals, NOT !== (INV-E-CONFLICT-DET-03)
      // This handles:
      // - Object key ordering independence
      // - undefined → null normalization
      // - BigInt comparison
      const valuesEqual = semanticEquals(claim.value, newClaim.value);

      if (!valuesEqual) {
        return {
          hasConflict: true,
          type: ConflictType.DIRECT,
          conflictingClaimIds: [claim.id],
          message: `CONTR-001: Direct contradiction with claim ${claim.id} for ${newClaim.subject}.${newClaim.predicate}`,
        };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Checks for CONTR-002: Missing entity reference.
   *
   * @param entityId - Entity ID to check
   * @param store - Claim store for lookup
   * @returns Conflict result
   */
  checkEntityExists(entityId: EntityId, store: ClaimStore): ConflictResult {
    const entities = store.getAllEntityIds();
    const exists = entities.includes(entityId);

    if (!exists) {
      return {
        hasConflict: true,
        type: ConflictType.ENTITY_MISSING,
        message: `CONTR-002: Referenced entity does not exist: ${entityId}`,
      };
    }

    return { hasConflict: false };
  }

  /**
   * Checks for CONTR-003: Supersession loop.
   *
   * @param newClaimId - New claim ID
   * @param supersedesId - ID of claim being superseded
   * @param store - Claim store for lookup
   * @returns Conflict result
   */
  checkSupersessionLoop(
    newClaimId: ClaimId,
    supersedesId: ClaimId | undefined,
    store: ClaimStore
  ): ConflictResult {
    if (!supersedesId) {
      return { hasConflict: false };
    }

    // Walk the supersession chain to detect loops
    const visited = new Set<ClaimId>();
    let currentId: ClaimId | undefined = supersedesId;

    while (currentId) {
      if (visited.has(currentId)) {
        return {
          hasConflict: true,
          type: ConflictType.SUPERSESSION_LOOP,
          conflictingClaimIds: Array.from(visited),
          message: `CONTR-003: Supersession loop detected involving ${currentId}`,
        };
      }

      visited.add(currentId);

      const claim = store.getById(currentId);
      if (!claim) {
        // Claim not found, chain ends
        break;
      }

      currentId = claim.supersedes;
    }

    return { hasConflict: false };
  }

  /**
   * Performs full conflict check on a new claim.
   *
   * @param newClaim - New claim parameters
   * @param store - Claim store
   * @returns Combined conflict result
   */
  checkAllConflicts(
    newClaim: {
      id: ClaimId;
      subject: EntityId;
      predicate: PredicateType;
      value: ClaimValue;
      supersedes?: ClaimId
    },
    store: ClaimStore
  ): ConflictResult {
    // CONTR-001: Direct conflict
    const directResult = this.checkDirectConflict(newClaim, store);
    if (directResult.hasConflict) {
      return directResult;
    }

    // CONTR-003: Supersession loop
    const loopResult = this.checkSupersessionLoop(
      newClaim.id,
      newClaim.supersedes,
      store
    );
    if (loopResult.hasConflict) {
      return loopResult;
    }

    return { hasConflict: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default guard instance.
 */
export const guard = new CanonGuard();
