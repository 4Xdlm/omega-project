/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — IDL CRYSTALLINE VALIDATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module crystal/validator
 * @version 2.0.0
 * @license MIT
 * 
 * IDL VALIDATOR — STRICT SCHEMA ENFORCEMENT
 * ==========================================
 * 
 * Validates invariants against the crystalline grammar.
 * Enforces mutability rules and structural integrity.
 * 
 * INVARIANTS:
 * - INV-VAL-01: All required fields must be present
 * - INV-VAL-02: Field patterns must match (ID, hash, timestamp)
 * - INV-VAL-03: Proof strengths must be from valid set
 * - INV-VAL-04: Lineage generation must be consistent with parents
 * - INV-VAL-05: Validation is deterministic
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  type CrystallineInvariant,
  type InvariantProof,
  type InvariantProperty,
  type InvariantLineage,
  type IDLDocument,
  type ProofType,
  GRAMMAR_SCHEMA,
  GRAMMAR_VERSION,
  MIN_SUPPORTED_VERSION,
  PROOF_TYPES,
  isValidInvariantId,
  isValidTimestamp,
  isValidHash,
  isProofType
} from './grammar.js';

import { 
  isProofStrength,
  type ProofStrength 
} from '../foundation/proof_strength.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Severity levels for validation issues
 */
export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

/**
 * A single validation issue
 */
export interface ValidationIssue {
  /** Severity level */
  readonly severity: ValidationSeverity;
  
  /** Field path (e.g., "property.natural") */
  readonly path: string;
  
  /** Error code */
  readonly code: string;
  
  /** Human-readable message */
  readonly message: string;
  
  /** Expected value/pattern (if applicable) */
  readonly expected?: string;
  
  /** Actual value (if applicable) */
  readonly actual?: string;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  /** Is the invariant valid? */
  readonly isValid: boolean;
  
  /** List of issues found */
  readonly issues: readonly ValidationIssue[];
  
  /** Number of errors */
  readonly errorCount: number;
  
  /** Number of warnings */
  readonly warningCount: number;
  
  /** Validation timestamp */
  readonly validatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validation error codes
 */
export const ValidationCodes = Object.freeze({
  // Required field errors
  REQUIRED_FIELD_MISSING: 'E001',
  
  // Pattern errors
  INVALID_ID_FORMAT: 'E002',
  INVALID_TIMESTAMP_FORMAT: 'E003',
  INVALID_HASH_FORMAT: 'E004',
  
  // Type errors
  INVALID_TYPE: 'E005',
  INVALID_PROOF_TYPE: 'E006',
  INVALID_STRENGTH: 'E007',
  
  // Structural errors
  EMPTY_NATURAL_STATEMENT: 'E008',
  EMPTY_SCOPE: 'E009',
  NEGATIVE_GENERATION: 'E010',
  
  // Consistency errors
  INCONSISTENT_GENERATION: 'E011',
  DUPLICATE_PROOF: 'E012',
  
  // Warnings
  MISSING_FORMAL_STATEMENT: 'W001',
  NO_PROOFS_ATTACHED: 'W002',
  NO_IMPOSSIBILITIES: 'W003',
  
  // Info
  COMPUTED_FIELD_OVERRIDE: 'I001'
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a complete invariant
 * @param invariant The invariant to validate
 * @returns Validation result with all issues
 */
export function validateInvariant(invariant: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  // Check if invariant is an object
  if (!invariant || typeof invariant !== 'object') {
    issues.push({
      severity: 'ERROR',
      path: '',
      code: ValidationCodes.INVALID_TYPE,
      message: 'Invariant must be an object',
      expected: 'object',
      actual: typeof invariant
    });
    
    return {
      isValid: false,
      issues,
      errorCount: 1,
      warningCount: 0,
      validatedAt: now
    };
  }
  
  const inv = invariant as Record<string, unknown>;
  
  // Validate identity fields
  validateIdentityFields(inv, issues);
  
  // Validate lineage
  validateLineage(inv['lineage'], issues);
  
  // Validate property
  validateProperty(inv['property'], issues);
  
  // Validate proofs
  validateProofs(inv['proofs'], issues);
  
  // Validate impossibilities
  validateImpossibilities(inv['impossibilities'], issues);
  
  // Count errors and warnings
  const errorCount = issues.filter(i => i.severity === 'ERROR').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;
  
  return {
    isValid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
    validatedAt: now
  };
}

/**
 * Validate identity fields (id, crystallized_at, crystallized_hash)
 */
function validateIdentityFields(
  inv: Record<string, unknown>,
  issues: ValidationIssue[]
): void {
  // ID
  if (!inv['id']) {
    issues.push({
      severity: 'ERROR',
      path: 'id',
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Invariant ID is required'
    });
  } else if (!isValidInvariantId(inv['id'])) {
    issues.push({
      severity: 'ERROR',
      path: 'id',
      code: ValidationCodes.INVALID_ID_FORMAT,
      message: 'Invariant ID must match pattern INV-XXX-NNN',
      expected: 'INV-XXX-NNN (e.g., INV-AUTH-001)',
      actual: String(inv['id'])
    });
  }
  
  // Crystallized timestamp
  if (!inv['crystallized_at']) {
    issues.push({
      severity: 'ERROR',
      path: 'crystallized_at',
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Crystallization timestamp is required'
    });
  } else if (!isValidTimestamp(inv['crystallized_at'])) {
    issues.push({
      severity: 'ERROR',
      path: 'crystallized_at',
      code: ValidationCodes.INVALID_TIMESTAMP_FORMAT,
      message: 'Crystallization timestamp must be ISO 8601 format',
      expected: 'YYYY-MM-DDTHH:mm:ssZ',
      actual: String(inv['crystallized_at'])
    });
  }
  
  // Crystallized hash
  if (!inv['crystallized_hash']) {
    issues.push({
      severity: 'ERROR',
      path: 'crystallized_hash',
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Crystallization hash is required'
    });
  } else if (!isValidHash(inv['crystallized_hash'])) {
    issues.push({
      severity: 'ERROR',
      path: 'crystallized_hash',
      code: ValidationCodes.INVALID_HASH_FORMAT,
      message: 'Crystallization hash must be valid SHA-256',
      expected: '64 hex characters',
      actual: String(inv['crystallized_hash'])
    });
  }
}

/**
 * Validate lineage fields
 */
function validateLineage(
  lineage: unknown,
  issues: ValidationIssue[]
): void {
  if (!lineage || typeof lineage !== 'object') {
    issues.push({
      severity: 'ERROR',
      path: 'lineage',
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Lineage object is required'
    });
    return;
  }
  
  const lin = lineage as Record<string, unknown>;
  
  // Parents array
  if (!Array.isArray(lin['parents'])) {
    issues.push({
      severity: 'ERROR',
      path: 'lineage.parents',
      code: ValidationCodes.INVALID_TYPE,
      message: 'Lineage parents must be an array',
      expected: 'array',
      actual: typeof lin['parents']
    });
  } else {
    // Validate each parent ID
    for (let i = 0; i < lin['parents'].length; i++) {
      const parentId = lin['parents'][i];
      if (!isValidInvariantId(parentId)) {
        issues.push({
          severity: 'ERROR',
          path: `lineage.parents[${i}]`,
          code: ValidationCodes.INVALID_ID_FORMAT,
          message: `Parent ID at index ${i} is invalid`,
          expected: 'INV-XXX-NNN',
          actual: String(parentId)
        });
      }
    }
  }
  
  // Generation
  if (typeof lin['generation'] !== 'number') {
    issues.push({
      severity: 'ERROR',
      path: 'lineage.generation',
      code: ValidationCodes.INVALID_TYPE,
      message: 'Lineage generation must be a number',
      expected: 'number',
      actual: typeof lin['generation']
    });
  } else if (lin['generation'] < 0) {
    issues.push({
      severity: 'ERROR',
      path: 'lineage.generation',
      code: ValidationCodes.NEGATIVE_GENERATION,
      message: 'Lineage generation cannot be negative',
      expected: '>= 0',
      actual: String(lin['generation'])
    });
  } else if (Array.isArray(lin['parents'])) {
    // Check consistency: generation should be max(parent generations) + 1
    // For now, just check that root (no parents) has generation 0
    if (lin['parents'].length === 0 && lin['generation'] !== 0) {
      issues.push({
        severity: 'ERROR',
        path: 'lineage.generation',
        code: ValidationCodes.INCONSISTENT_GENERATION,
        message: 'Root invariant (no parents) must have generation 0',
        expected: '0',
        actual: String(lin['generation'])
      });
    }
    if (lin['parents'].length > 0 && lin['generation'] === 0) {
      issues.push({
        severity: 'ERROR',
        path: 'lineage.generation',
        code: ValidationCodes.INCONSISTENT_GENERATION,
        message: 'Non-root invariant must have generation > 0',
        expected: '> 0',
        actual: '0'
      });
    }
  }
}

/**
 * Validate property fields
 */
function validateProperty(
  property: unknown,
  issues: ValidationIssue[]
): void {
  if (!property || typeof property !== 'object') {
    issues.push({
      severity: 'ERROR',
      path: 'property',
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Property object is required'
    });
    return;
  }
  
  const prop = property as Record<string, unknown>;
  
  // Natural statement
  if (!prop['natural'] || typeof prop['natural'] !== 'string') {
    issues.push({
      severity: 'ERROR',
      path: 'property.natural',
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Natural language statement is required'
    });
  } else if (prop['natural'].length < 10) {
    issues.push({
      severity: 'ERROR',
      path: 'property.natural',
      code: ValidationCodes.EMPTY_NATURAL_STATEMENT,
      message: 'Natural statement must be at least 10 characters',
      expected: '>= 10 characters',
      actual: `${prop['natural'].length} characters`
    });
  }
  
  // Formal statement (optional but recommended)
  if (!prop['formal']) {
    issues.push({
      severity: 'WARNING',
      path: 'property.formal',
      code: ValidationCodes.MISSING_FORMAL_STATEMENT,
      message: 'Formal statement is recommended for stronger proofs'
    });
  }
  
  // Scope
  if (!prop['scope'] || typeof prop['scope'] !== 'string') {
    issues.push({
      severity: 'ERROR',
      path: 'property.scope',
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Scope is required'
    });
  } else if (prop['scope'].length === 0) {
    issues.push({
      severity: 'ERROR',
      path: 'property.scope',
      code: ValidationCodes.EMPTY_SCOPE,
      message: 'Scope cannot be empty'
    });
  }
}

/**
 * Validate proofs array
 */
function validateProofs(
  proofs: unknown,
  issues: ValidationIssue[]
): void {
  if (!Array.isArray(proofs)) {
    issues.push({
      severity: 'ERROR',
      path: 'proofs',
      code: ValidationCodes.INVALID_TYPE,
      message: 'Proofs must be an array',
      expected: 'array',
      actual: typeof proofs
    });
    return;
  }
  
  if (proofs.length === 0) {
    issues.push({
      severity: 'WARNING',
      path: 'proofs',
      code: ValidationCodes.NO_PROOFS_ATTACHED,
      message: 'No proofs attached. Invariant is unverified.'
    });
    return;
  }
  
  // Validate each proof
  for (let i = 0; i < proofs.length; i++) {
    validateSingleProof(proofs[i], i, issues);
  }
}

/**
 * Validate a single proof
 */
function validateSingleProof(
  proof: unknown,
  index: number,
  issues: ValidationIssue[]
): void {
  if (!proof || typeof proof !== 'object') {
    issues.push({
      severity: 'ERROR',
      path: `proofs[${index}]`,
      code: ValidationCodes.INVALID_TYPE,
      message: `Proof at index ${index} must be an object`,
      expected: 'object',
      actual: typeof proof
    });
    return;
  }
  
  const p = proof as Record<string, unknown>;
  
  // Type
  if (!p['type']) {
    issues.push({
      severity: 'ERROR',
      path: `proofs[${index}].type`,
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Proof type is required'
    });
  } else if (!isProofType(p['type'])) {
    issues.push({
      severity: 'ERROR',
      path: `proofs[${index}].type`,
      code: ValidationCodes.INVALID_PROOF_TYPE,
      message: 'Invalid proof type',
      expected: PROOF_TYPES.join(', '),
      actual: String(p['type'])
    });
  }
  
  // Strength
  if (!p['strength']) {
    issues.push({
      severity: 'ERROR',
      path: `proofs[${index}].strength`,
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Proof strength is required'
    });
  } else if (!isProofStrength(p['strength'])) {
    issues.push({
      severity: 'ERROR',
      path: `proofs[${index}].strength`,
      code: ValidationCodes.INVALID_STRENGTH,
      message: 'Invalid proof strength',
      expected: 'Ω, Λ, Σ, Δ, or Ε',
      actual: String(p['strength'])
    });
  }
  
  // Evidence (must exist)
  if (!p['evidence'] || typeof p['evidence'] !== 'object') {
    issues.push({
      severity: 'ERROR',
      path: `proofs[${index}].evidence`,
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Proof evidence is required'
    });
  }
  
  // Added at
  if (!p['added_at']) {
    issues.push({
      severity: 'ERROR',
      path: `proofs[${index}].added_at`,
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'Proof added_at timestamp is required'
    });
  } else if (!isValidTimestamp(p['added_at'])) {
    issues.push({
      severity: 'ERROR',
      path: `proofs[${index}].added_at`,
      code: ValidationCodes.INVALID_TIMESTAMP_FORMAT,
      message: 'Proof added_at must be ISO 8601 format',
      expected: 'YYYY-MM-DDTHH:mm:ssZ',
      actual: String(p['added_at'])
    });
  }
}

/**
 * Validate impossibilities array
 */
function validateImpossibilities(
  impossibilities: unknown,
  issues: ValidationIssue[]
): void {
  if (!Array.isArray(impossibilities)) {
    issues.push({
      severity: 'ERROR',
      path: 'impossibilities',
      code: ValidationCodes.INVALID_TYPE,
      message: 'Impossibilities must be an array',
      expected: 'array',
      actual: typeof impossibilities
    });
    return;
  }
  
  if (impossibilities.length === 0) {
    issues.push({
      severity: 'INFO',
      path: 'impossibilities',
      code: ValidationCodes.NO_IMPOSSIBILITIES,
      message: 'No impossibilities declared. Consider adding CANNOT_* statements.'
    });
  }
  
  // Validate each impossibility is a non-empty string
  for (let i = 0; i < impossibilities.length; i++) {
    const imp = impossibilities[i];
    if (typeof imp !== 'string' || imp.length === 0) {
      issues.push({
        severity: 'ERROR',
        path: `impossibilities[${i}]`,
        code: ValidationCodes.INVALID_TYPE,
        message: `Impossibility at index ${i} must be a non-empty string`,
        expected: 'string',
        actual: typeof imp
      });
    }
  }
}

/**
 * Validate an IDL document
 */
export function validateDocument(doc: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  if (!doc || typeof doc !== 'object') {
    issues.push({
      severity: 'ERROR',
      path: '',
      code: ValidationCodes.INVALID_TYPE,
      message: 'Document must be an object',
      expected: 'object',
      actual: typeof doc
    });
    
    return {
      isValid: false,
      issues,
      errorCount: 1,
      warningCount: 0,
      validatedAt: now
    };
  }
  
  const d = doc as Record<string, unknown>;
  
  // IDL version
  if (!d['idl_version']) {
    issues.push({
      severity: 'ERROR',
      path: 'idl_version',
      code: ValidationCodes.REQUIRED_FIELD_MISSING,
      message: 'IDL version is required'
    });
  } else if (d['idl_version'] !== GRAMMAR_VERSION) {
    // Check if version is supported
    // For now, only exact match is supported
    issues.push({
      severity: 'WARNING',
      path: 'idl_version',
      code: 'W004',
      message: `Document version ${d['idl_version']} differs from current ${GRAMMAR_VERSION}`
    });
  }
  
  // Validate invariants array
  if (!Array.isArray(d['invariants'])) {
    issues.push({
      severity: 'ERROR',
      path: 'invariants',
      code: ValidationCodes.INVALID_TYPE,
      message: 'Invariants must be an array',
      expected: 'array',
      actual: typeof d['invariants']
    });
  } else {
    // Validate each invariant
    for (let i = 0; i < d['invariants'].length; i++) {
      const invResult = validateInvariant(d['invariants'][i]);
      for (const issue of invResult.issues) {
        issues.push({
          ...issue,
          path: `invariants[${i}].${issue.path}`
        });
      }
    }
  }
  
  const errorCount = issues.filter(i => i.severity === 'ERROR').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;
  
  return {
    isValid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
    validatedAt: now
  };
}

/**
 * Quick validation check (returns boolean only)
 */
export function isValidInvariant(invariant: unknown): boolean {
  return validateInvariant(invariant).isValid;
}

/**
 * Get all errors from a validation result
 */
export function getErrors(result: ValidationResult): readonly ValidationIssue[] {
  return result.issues.filter(i => i.severity === 'ERROR');
}

/**
 * Get all warnings from a validation result
 */
export function getWarnings(result: ValidationResult): readonly ValidationIssue[] {
  return result.issues.filter(i => i.severity === 'WARNING');
}

/**
 * Format validation result as human-readable string
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [
    `Validation Result: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`,
    `Errors: ${result.errorCount}, Warnings: ${result.warningCount}`,
    ''
  ];
  
  if (result.issues.length > 0) {
    lines.push('Issues:');
    for (const issue of result.issues) {
      const icon = issue.severity === 'ERROR' ? '❌' : 
                   issue.severity === 'WARNING' ? '⚠️' : 'ℹ️';
      lines.push(`  ${icon} [${issue.code}] ${issue.path}: ${issue.message}`);
      if (issue.expected) {
        lines.push(`       Expected: ${issue.expected}`);
      }
      if (issue.actual) {
        lines.push(`       Actual: ${issue.actual}`);
      }
    }
  }
  
  return lines.join('\n');
}
