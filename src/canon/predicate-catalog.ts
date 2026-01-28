/**
 * OMEGA Canon Predicate Catalog v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-PRED-01: All predicates validated against catalog
 * - INV-E-PRED-02: Catalog is closed (no runtime additions)
 * - INV-E-PRED-03: Catalog is versioned
 * - INV-E-PRED-04: Catalog hash is deterministic
 *
 * NOTE R22: SUPERSEDES is NOT a predicate - it's a structural field
 * SPEC: CANON_SCHEMA_SPEC v1.2 §5.2
 */

import { hashCanonical } from '../shared/canonical';
import type { PredicateType, ChainHash } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICATE ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Subject type constraint for predicates.
 */
export type SubjectType = 'ENTITY' | 'CLAIM';

/**
 * Object type constraint for predicates.
 */
export type ObjectType = 'ENTITY' | 'PRIMITIVE' | 'CLAIM';

/**
 * Single predicate definition in the catalog.
 */
export interface PredicateCatalogEntry {
  readonly id: string;
  readonly description: string;
  readonly subject_type: SubjectType;
  readonly object_type: ObjectType;
  readonly symmetric: boolean;
  readonly transitive: boolean;
  readonly introduced_version: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICATE CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete predicate catalog with version.
 */
export interface PredicateCatalog {
  readonly version: string;
  readonly predicates: readonly PredicateCatalogEntry[];
}

/**
 * Built-in predicate catalog (hardcoded for Phase E).
 * Matches config/canon/predicate_catalog.json
 *
 * NOTE: SUPERSEDES is ABSENT - it's a structural field, not a predicate (R22)
 */
export const BUILT_IN_CATALOG: PredicateCatalog = {
  version: '1.0.0',
  predicates: [
    {
      id: 'IS_A',
      description: 'Entity type classification',
      subject_type: 'ENTITY',
      object_type: 'ENTITY',
      symmetric: false,
      transitive: true,
      introduced_version: 1,
    },
    {
      id: 'HAS_NAME',
      description: 'Entity has name',
      subject_type: 'ENTITY',
      object_type: 'PRIMITIVE',
      symmetric: false,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'HAS_ATTRIBUTE',
      description: 'Entity has attribute value',
      subject_type: 'ENTITY',
      object_type: 'PRIMITIVE',
      symmetric: false,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'RELATED_TO',
      description: 'Generic relation between entities',
      subject_type: 'ENTITY',
      object_type: 'ENTITY',
      symmetric: true,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'HAS_AGE',
      description: 'Entity has age value',
      subject_type: 'ENTITY',
      object_type: 'PRIMITIVE',
      symmetric: false,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'HAS_CITY',
      description: 'Entity has city value',
      subject_type: 'ENTITY',
      object_type: 'PRIMITIVE',
      symmetric: false,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'KNOWS',
      description: 'Entity knows another entity',
      subject_type: 'ENTITY',
      object_type: 'ENTITY',
      symmetric: true,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'TEST',
      description: 'Test predicate for testing',
      subject_type: 'ENTITY',
      object_type: 'PRIMITIVE',
      symmetric: false,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'ATTR_0',
      description: 'Generic attribute 0',
      subject_type: 'ENTITY',
      object_type: 'PRIMITIVE',
      symmetric: false,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'ATTR_1',
      description: 'Generic attribute 1',
      subject_type: 'ENTITY',
      object_type: 'PRIMITIVE',
      symmetric: false,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'ATTR_2',
      description: 'Generic attribute 2',
      subject_type: 'ENTITY',
      object_type: 'PRIMITIVE',
      symmetric: false,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'ATTR_3',
      description: 'Generic attribute 3',
      subject_type: 'ENTITY',
      object_type: 'PRIMITIVE',
      symmetric: false,
      transitive: false,
      introduced_version: 1,
    },
    {
      id: 'ATTR_4',
      description: 'Generic attribute 4',
      subject_type: 'ENTITY',
      object_type: 'PRIMITIVE',
      symmetric: false,
      transitive: false,
      introduced_version: 1,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Loaded catalog instance.
 * Default is BUILT_IN_CATALOG.
 */
let currentCatalog: PredicateCatalog = BUILT_IN_CATALOG;

/**
 * Loads a catalog from JSON data.
 * @param data - Parsed JSON catalog data
 */
export function loadCatalog(data: PredicateCatalog): void {
  // Validate structure
  if (!data.version || !Array.isArray(data.predicates)) {
    throw new Error('INVALID_CATALOG: Missing version or predicates');
  }

  // Validate no SUPERSEDES predicate (R22)
  const hasSupersedesPredicate = data.predicates.some(
    (p) => p.id === 'SUPERSEDES'
  );
  if (hasSupersedesPredicate) {
    throw new Error(
      'INVALID_CATALOG: SUPERSEDES is not allowed as predicate (R22 - use structural field)'
    );
  }

  currentCatalog = data;
}

/**
 * Gets the current catalog.
 */
export function getCatalog(): PredicateCatalog {
  return currentCatalog;
}

/**
 * Resets to built-in catalog.
 */
export function resetCatalog(): void {
  currentCatalog = BUILT_IN_CATALOG;
}

/**
 * Validates a predicate ID against the catalog.
 * @param predicateId - Predicate ID to validate
 * @returns true if predicate exists in catalog
 */
export function validatePredicate(predicateId: string): predicateId is PredicateType {
  return currentCatalog.predicates.some((p) => p.id === predicateId);
}

/**
 * Gets a predicate definition from the catalog.
 * @param predicateId - Predicate ID to look up
 * @returns Predicate entry or undefined
 */
export function getPredicateDefinition(
  predicateId: string
): PredicateCatalogEntry | undefined {
  return currentCatalog.predicates.find((p) => p.id === predicateId);
}

/**
 * Casts a validated string to PredicateType.
 * @param predicateId - Predicate ID (must be validated first)
 * @returns Typed predicate
 */
export function asPredicateType(predicateId: string): PredicateType {
  if (!validatePredicate(predicateId)) {
    throw new Error(`INVALID_PREDICATE: ${predicateId} not in catalog`);
  }
  return predicateId as PredicateType;
}

/**
 * Gets all predicate IDs in the catalog.
 */
export function getAllPredicateIds(): readonly string[] {
  return currentCatalog.predicates.map((p) => p.id);
}

/**
 * Computes deterministic hash of the catalog (INV-E-PRED-04).
 */
export function getCatalogHash(): ChainHash {
  return hashCanonical(currentCatalog) as ChainHash;
}

/**
 * Gets catalog version.
 */
export function getCatalogVersion(): string {
  return currentCatalog.version;
}

/**
 * Checks if SUPERSEDES is in catalog (should always be false per R22).
 * Used for testing.
 */
export function hasSupersedesPredicate(): boolean {
  return currentCatalog.predicates.some((p) => p.id === 'SUPERSEDES');
}
