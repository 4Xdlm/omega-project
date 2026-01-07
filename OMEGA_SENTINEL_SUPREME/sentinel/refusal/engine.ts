/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — REFUSAL ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module refusal/engine
 * @version 2.0.0
 * @license MIT
 * 
 * REFUSAL — EXPLICIT CERTIFICATION REFUSAL
 * =========================================
 * 
 * The refusal engine handles explicit rejection of certification requests:
 * - Refusal with documented justification
 * - Refusal codes by category
 * - Link to violated axioms
 * - Remediation suggestions
 * 
 * PHILOSOPHY:
 * An explicit refusal is more valuable than a silent failure.
 * Every refusal must explain WHY and WHAT to do about it.
 * 
 * INVARIANTS:
 * - INV-REF-01: Every refusal has a code and reason
 * - INV-REF-02: Refusal codes are unique within category
 * - INV-REF-03: Axiom violations produce CRITICAL refusals
 * - INV-REF-04: Refusals are immutable after creation
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { type AxiomId, getAxiom } from '../foundation/axioms.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Refusal severity levels
 */
export type RefusalSeverity = 
  | 'INFO'      // Informational, not blocking
  | 'WARNING'   // Concerning, may block
  | 'ERROR'     // Blocking error
  | 'CRITICAL'; // System-level failure

/**
 * Refusal category
 */
export type RefusalCategory = 
  | 'AXIOM'         // Axiom violation
  | 'VALIDATION'    // Validation failure
  | 'COVERAGE'      // Insufficient coverage
  | 'STRENGTH'      // Insufficient proof strength
  | 'INTEGRITY'     // Hash/integrity failure
  | 'TEMPORAL'      // Timing/freshness issue
  | 'EXTERNAL'      // External dependency issue
  | 'POLICY';       // Policy violation

/**
 * Refusal code format: REF-CAT-NNN
 */
export type RefusalCode = `REF-${string}-${number}`;

/**
 * Refusal definition
 */
export interface RefusalDefinition {
  /** Unique refusal code */
  readonly code: RefusalCode;
  
  /** Category */
  readonly category: RefusalCategory;
  
  /** Severity */
  readonly severity: RefusalSeverity;
  
  /** Short title */
  readonly title: string;
  
  /** Full description template */
  readonly descriptionTemplate: string;
  
  /** Related axiom (if applicable) */
  readonly relatedAxiom?: AxiomId;
  
  /** Remediation steps */
  readonly remediations: readonly string[];
  
  /** Is this recoverable? */
  readonly recoverable: boolean;
}

/**
 * Actual refusal instance
 */
export interface Refusal {
  /** Refusal code */
  readonly code: RefusalCode;
  
  /** Category */
  readonly category: RefusalCategory;
  
  /** Severity */
  readonly severity: RefusalSeverity;
  
  /** Title */
  readonly title: string;
  
  /** Actual reason (filled template) */
  readonly reason: string;
  
  /** Context data */
  readonly context: Readonly<Record<string, unknown>>;
  
  /** Related axiom (if applicable) */
  readonly relatedAxiom?: AxiomId;
  
  /** Remediation steps */
  readonly remediations: readonly string[];
  
  /** Is this recoverable? */
  readonly recoverable: boolean;
  
  /** Timestamp */
  readonly timestamp: string;
  
  /** Stack trace (if error) */
  readonly stack?: string;
}

/**
 * Refusal result (for operations that may refuse)
 */
export type RefusalResult<T> = 
  | { readonly success: true; readonly value: T; readonly refusals: readonly [] }
  | { readonly success: false; readonly value: null; readonly refusals: readonly Refusal[] };

// ═══════════════════════════════════════════════════════════════════════════════
// REFUSAL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All defined refusal codes
 */
const REFUSAL_DEFINITIONS: Map<RefusalCode, RefusalDefinition> = new Map();

// ───────────────────────────────────────────────────────────────────────────────
// AXIOM REFUSALS (REF-AXI-xxx)
// ───────────────────────────────────────────────────────────────────────────────

const AXIOM_REFUSALS: readonly RefusalDefinition[] = Object.freeze([
  {
    code: 'REF-AXI-001' as RefusalCode,
    category: 'AXIOM',
    severity: 'CRITICAL',
    title: 'Falsifiability Axiom Violated',
    descriptionTemplate: 'The system cannot be falsified: {reason}. Per AX-Ω, unfalsifiable claims cannot be certified.',
    relatedAxiom: 'AX-Ω',
    remediations: [
      'Define concrete, testable conditions for the invariant',
      'Specify observable behaviors that would indicate failure',
      'Ensure the attack surface is well-defined'
    ],
    recoverable: false
  },
  {
    code: 'REF-AXI-002' as RefusalCode,
    category: 'AXIOM',
    severity: 'CRITICAL',
    title: 'Determinism Axiom Violated',
    descriptionTemplate: 'Non-deterministic behavior detected: {reason}. Per AX-Λ, certification requires determinism.',
    relatedAxiom: 'AX-Λ',
    remediations: [
      'Remove sources of randomness from critical paths',
      'Ensure same inputs always produce same outputs',
      'Use deterministic algorithms for all computations'
    ],
    recoverable: false
  },
  {
    code: 'REF-AXI-003' as RefusalCode,
    category: 'AXIOM',
    severity: 'CRITICAL',
    title: 'Bounded Attack Space Violated',
    descriptionTemplate: 'Unbounded attack space detected: {reason}. Per AX-Σ, attack space must be finite or approximable.',
    relatedAxiom: 'AX-Σ',
    remediations: [
      'Define bounds on input parameters',
      'Use discretization for continuous inputs',
      'Implement sampling strategies for large spaces'
    ],
    recoverable: true
  },
  {
    code: 'REF-AXI-004' as RefusalCode,
    category: 'AXIOM',
    severity: 'CRITICAL',
    title: 'Temporal Stability Violated',
    descriptionTemplate: 'Temporal instability detected: {reason}. Per AX-Δ, proofs must maintain validity over time.',
    relatedAxiom: 'AX-Δ',
    remediations: [
      'Ensure proofs do not depend on transient state',
      'Define clear validity periods for certificates',
      'Implement proper time-based invalidation'
    ],
    recoverable: true
  },
  {
    code: 'REF-AXI-005' as RefusalCode,
    category: 'AXIOM',
    severity: 'CRITICAL',
    title: 'Evidence Integrity Violated',
    descriptionTemplate: 'Evidence integrity compromised: {reason}. Per AX-Ε, all evidence must be hash-verifiable.',
    relatedAxiom: 'AX-Ε',
    remediations: [
      'Recalculate and verify all hashes',
      'Ensure evidence chain is complete',
      'Replace corrupted evidence items'
    ],
    recoverable: true
  }
]);

// ───────────────────────────────────────────────────────────────────────────────
// VALIDATION REFUSALS (REF-VAL-xxx)
// ───────────────────────────────────────────────────────────────────────────────

const VALIDATION_REFUSALS: readonly RefusalDefinition[] = Object.freeze([
  {
    code: 'REF-VAL-001' as RefusalCode,
    category: 'VALIDATION',
    severity: 'ERROR',
    title: 'Invalid Invariant ID',
    descriptionTemplate: 'Invariant ID "{id}" does not match required pattern INV-XXX-NNN.',
    remediations: [
      'Use format INV-{MODULE}-{NUMBER}',
      'Ensure module prefix is 2-5 uppercase letters',
      'Ensure number is 1-4 digits'
    ],
    recoverable: true
  },
  {
    code: 'REF-VAL-002' as RefusalCode,
    category: 'VALIDATION',
    severity: 'ERROR',
    title: 'Invalid Hash Format',
    descriptionTemplate: 'Hash "{hash}" is not a valid SHA-256 (expected 64 hex characters).',
    remediations: [
      'Recalculate hash using SHA-256 algorithm',
      'Ensure hash is lowercase hexadecimal',
      'Verify hash length is exactly 64 characters'
    ],
    recoverable: true
  },
  {
    code: 'REF-VAL-003' as RefusalCode,
    category: 'VALIDATION',
    severity: 'ERROR',
    title: 'Missing Required Field',
    descriptionTemplate: 'Required field "{field}" is missing from {object}.',
    remediations: [
      'Add the missing field with a valid value',
      'Check the schema for required fields',
      'Ensure all mandatory data is provided'
    ],
    recoverable: true
  },
  {
    code: 'REF-VAL-004' as RefusalCode,
    category: 'VALIDATION',
    severity: 'ERROR',
    title: 'Invalid Timestamp',
    descriptionTemplate: 'Timestamp "{timestamp}" is not valid ISO 8601 format.',
    remediations: [
      'Use ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ',
      'Ensure timezone is specified',
      'Use UTC for all timestamps'
    ],
    recoverable: true
  }
]);

// ───────────────────────────────────────────────────────────────────────────────
// COVERAGE REFUSALS (REF-COV-xxx)
// ───────────────────────────────────────────────────────────────────────────────

const COVERAGE_REFUSALS: readonly RefusalDefinition[] = Object.freeze([
  {
    code: 'REF-COV-001' as RefusalCode,
    category: 'COVERAGE',
    severity: 'ERROR',
    title: 'Insufficient Attack Coverage',
    descriptionTemplate: 'Coverage {actual}% is below required {required}% for {region} region.',
    remediations: [
      'Add more falsification attempts',
      'Cover missing attack categories',
      'Ensure all mandatory attacks are tested'
    ],
    recoverable: true
  },
  {
    code: 'REF-COV-002' as RefusalCode,
    category: 'COVERAGE',
    severity: 'ERROR',
    title: 'Missing Mandatory Attacks',
    descriptionTemplate: 'Mandatory attack coverage {actual}% (required: 100%). Missing: {missing}.',
    remediations: [
      'Execute all mandatory attacks',
      'Document skipped attacks with justification',
      'Request mandatory attack waiver if applicable'
    ],
    recoverable: true
  },
  {
    code: 'REF-COV-003' as RefusalCode,
    category: 'COVERAGE',
    severity: 'WARNING',
    title: 'Category Coverage Gap',
    descriptionTemplate: 'Category "{category}" has only {coverage}% coverage.',
    remediations: [
      'Add more attacks from this category',
      'Review category requirements',
      'Document why full coverage is not achievable'
    ],
    recoverable: true
  }
]);

// ───────────────────────────────────────────────────────────────────────────────
// STRENGTH REFUSALS (REF-STR-xxx)
// ───────────────────────────────────────────────────────────────────────────────

const STRENGTH_REFUSALS: readonly RefusalDefinition[] = Object.freeze([
  {
    code: 'REF-STR-001' as RefusalCode,
    category: 'STRENGTH',
    severity: 'ERROR',
    title: 'Insufficient Proof Strength',
    descriptionTemplate: 'Proof strength {actual} is below required {required} for {region} region.',
    remediations: [
      'Add stronger proofs (formal, mathematical)',
      'Increase test coverage and rigor',
      'Obtain independent verification'
    ],
    recoverable: true
  },
  {
    code: 'REF-STR-002' as RefusalCode,
    category: 'STRENGTH',
    severity: 'ERROR',
    title: 'No Proofs Attached',
    descriptionTemplate: 'Invariant "{id}" has no proofs attached.',
    remediations: [
      'Add at least one proof',
      'Write tests that verify the invariant',
      'Document empirical evidence'
    ],
    recoverable: true
  }
]);

// ───────────────────────────────────────────────────────────────────────────────
// INTEGRITY REFUSALS (REF-INT-xxx)
// ───────────────────────────────────────────────────────────────────────────────

const INTEGRITY_REFUSALS: readonly RefusalDefinition[] = Object.freeze([
  {
    code: 'REF-INT-001' as RefusalCode,
    category: 'INTEGRITY',
    severity: 'CRITICAL',
    title: 'Hash Verification Failed',
    descriptionTemplate: 'Hash mismatch: expected {expected}, got {actual}.',
    remediations: [
      'Recalculate hash from current content',
      'Check for unauthorized modifications',
      'Restore from trusted backup if available'
    ],
    recoverable: false
  },
  {
    code: 'REF-INT-002' as RefusalCode,
    category: 'INTEGRITY',
    severity: 'CRITICAL',
    title: 'Evidence Chain Broken',
    descriptionTemplate: 'Evidence chain is broken at {position}: {reason}.',
    remediations: [
      'Rebuild evidence chain from source',
      'Verify all intermediate hashes',
      'Replace missing evidence items'
    ],
    recoverable: false
  },
  {
    code: 'REF-INT-003' as RefusalCode,
    category: 'INTEGRITY',
    severity: 'ERROR',
    title: 'Signature Invalid',
    descriptionTemplate: 'Signature verification failed for {subject}.',
    remediations: [
      'Verify signer identity',
      'Request new signature',
      'Check for content modification'
    ],
    recoverable: true
  }
]);

// ───────────────────────────────────────────────────────────────────────────────
// EXTERNAL REFUSALS (REF-EXT-xxx)
// ───────────────────────────────────────────────────────────────────────────────

const EXTERNAL_REFUSALS: readonly RefusalDefinition[] = Object.freeze([
  {
    code: 'REF-EXT-001' as RefusalCode,
    category: 'EXTERNAL',
    severity: 'ERROR',
    title: 'External Certifier Required',
    descriptionTemplate: 'TRANSCENDENT region requires external certifier. None provided.',
    remediations: [
      'Obtain external certifier attestation',
      'Follow R3 certification procedure',
      'Contact authorized certification body'
    ],
    recoverable: true
  },
  {
    code: 'REF-EXT-002' as RefusalCode,
    category: 'EXTERNAL',
    severity: 'ERROR',
    title: 'External Service Unavailable',
    descriptionTemplate: 'External service "{service}" is unavailable: {reason}.',
    remediations: [
      'Retry after service recovery',
      'Use fallback service if available',
      'Document service outage'
    ],
    recoverable: true
  }
]);

// ───────────────────────────────────────────────────────────────────────────────
// POLICY REFUSALS (REF-POL-xxx)
// ───────────────────────────────────────────────────────────────────────────────

const POLICY_REFUSALS: readonly RefusalDefinition[] = Object.freeze([
  {
    code: 'REF-POL-001' as RefusalCode,
    category: 'POLICY',
    severity: 'ERROR',
    title: 'Policy Violation',
    descriptionTemplate: 'Certification request violates policy: {policy}.',
    remediations: [
      'Review and comply with policy requirements',
      'Request policy exception if applicable',
      'Update implementation to meet policy'
    ],
    recoverable: true
  },
  {
    code: 'REF-POL-002' as RefusalCode,
    category: 'POLICY',
    severity: 'WARNING',
    title: 'Deprecated Feature',
    descriptionTemplate: 'Feature "{feature}" is deprecated and will be removed in {version}.',
    remediations: [
      'Migrate to recommended alternative',
      'Update to current API version',
      'Plan migration before deprecation deadline'
    ],
    recoverable: true
  }
]);

// Register all definitions
function registerDefinitions(): void {
  const allDefs = [
    ...AXIOM_REFUSALS,
    ...VALIDATION_REFUSALS,
    ...COVERAGE_REFUSALS,
    ...STRENGTH_REFUSALS,
    ...INTEGRITY_REFUSALS,
    ...EXTERNAL_REFUSALS,
    ...POLICY_REFUSALS
  ];
  
  for (const def of allDefs) {
    REFUSAL_DEFINITIONS.set(def.code, def);
  }
}

// Initialize on module load
registerDefinitions();

// ═══════════════════════════════════════════════════════════════════════════════
// REFUSAL CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a refusal from a definition
 */
export function createRefusal(
  code: RefusalCode,
  context: Record<string, unknown> = {}
): Refusal {
  const definition = REFUSAL_DEFINITIONS.get(code);
  
  if (!definition) {
    throw new Error(`Unknown refusal code: ${code}`);
  }
  
  // Fill template with context
  let reason = definition.descriptionTemplate;
  for (const [key, value] of Object.entries(context)) {
    reason = reason.replace(`{${key}}`, String(value));
  }
  
  return Object.freeze({
    code: definition.code,
    category: definition.category,
    severity: definition.severity,
    title: definition.title,
    reason,
    context: Object.freeze({ ...context }),
    relatedAxiom: definition.relatedAxiom,
    remediations: definition.remediations,
    recoverable: definition.recoverable,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  });
}

/**
 * Create a refusal for an axiom violation
 */
export function createAxiomRefusal(
  axiomId: AxiomId,
  reason: string
): Refusal {
  const axiomToCode: Record<AxiomId, RefusalCode> = {
    'AX-Ω': 'REF-AXI-001' as RefusalCode,
    'AX-Λ': 'REF-AXI-002' as RefusalCode,
    'AX-Σ': 'REF-AXI-003' as RefusalCode,
    'AX-Δ': 'REF-AXI-004' as RefusalCode,
    'AX-Ε': 'REF-AXI-005' as RefusalCode
  };
  
  const code = axiomToCode[axiomId];
  if (!code) {
    throw new Error(`Unknown axiom: ${axiomId}`);
  }
  
  return createRefusal(code, { reason });
}

/**
 * Create a custom refusal (for dynamic cases)
 */
export function createCustomRefusal(
  category: RefusalCategory,
  severity: RefusalSeverity,
  title: string,
  reason: string,
  remediations: readonly string[] = [],
  recoverable: boolean = true
): Refusal {
  return Object.freeze({
    code: `REF-${category.substring(0, 3)}-999` as RefusalCode,
    category,
    severity,
    title,
    reason,
    context: Object.freeze({}),
    remediations,
    recoverable,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFUSAL QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get refusal definition by code
 */
export function getRefusalDefinition(code: RefusalCode): RefusalDefinition | undefined {
  return REFUSAL_DEFINITIONS.get(code);
}

/**
 * Get all refusal definitions
 */
export function getAllRefusalDefinitions(): readonly RefusalDefinition[] {
  return Object.freeze([...REFUSAL_DEFINITIONS.values()]);
}

/**
 * Get refusal definitions by category
 */
export function getRefusalsByCategory(category: RefusalCategory): readonly RefusalDefinition[] {
  return getAllRefusalDefinitions().filter(d => d.category === category);
}

/**
 * Get refusal definitions by severity
 */
export function getRefusalsBySeverity(severity: RefusalSeverity): readonly RefusalDefinition[] {
  return getAllRefusalDefinitions().filter(d => d.severity === severity);
}

/**
 * Get critical refusals (axiom-related)
 */
export function getCriticalRefusals(): readonly RefusalDefinition[] {
  return getRefusalsBySeverity('CRITICAL');
}

/**
 * Count refusal definitions
 */
export function countRefusalDefinitions(): number {
  return REFUSAL_DEFINITIONS.size;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFUSAL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if any refusals are blocking
 */
export function hasBlockingRefusals(refusals: readonly Refusal[]): boolean {
  return refusals.some(r => r.severity === 'CRITICAL' || r.severity === 'ERROR');
}

/**
 * Check if all refusals are recoverable
 */
export function allRecoverable(refusals: readonly Refusal[]): boolean {
  return refusals.every(r => r.recoverable);
}

/**
 * Get the highest severity among refusals
 */
export function getHighestSeverity(refusals: readonly Refusal[]): RefusalSeverity | null {
  if (refusals.length === 0) return null;
  
  const order: RefusalSeverity[] = ['CRITICAL', 'ERROR', 'WARNING', 'INFO'];
  for (const severity of order) {
    if (refusals.some(r => r.severity === severity)) {
      return severity;
    }
  }
  return 'INFO';
}

/**
 * Group refusals by category
 */
export function groupRefusalsByCategory(
  refusals: readonly Refusal[]
): ReadonlyMap<RefusalCategory, readonly Refusal[]> {
  const groups = new Map<RefusalCategory, Refusal[]>();
  
  for (const refusal of refusals) {
    const existing = groups.get(refusal.category) ?? [];
    groups.set(refusal.category, [...existing, refusal]);
  }
  
  return groups;
}

/**
 * Get unique remediation steps from all refusals
 */
export function getAllRemediations(refusals: readonly Refusal[]): readonly string[] {
  const remediations = new Set<string>();
  
  for (const refusal of refusals) {
    for (const remediation of refusal.remediations) {
      remediations.add(remediation);
    }
  }
  
  return Object.freeze([...remediations]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFUSAL RESULT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a success result
 */
export function success<T>(value: T): RefusalResult<T> {
  return { success: true, value, refusals: [] };
}

/**
 * Create a failure result
 */
export function failure<T>(refusals: readonly Refusal[]): RefusalResult<T> {
  return { success: false, value: null, refusals };
}

/**
 * Create a failure with single refusal
 */
export function refuseWith<T>(code: RefusalCode, context?: Record<string, unknown>): RefusalResult<T> {
  return failure([createRefusal(code, context)]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a value is a valid refusal code
 */
export function isRefusalCode(value: unknown): value is RefusalCode {
  if (typeof value !== 'string') return false;
  return /^REF-[A-Z]{3}-\d{3}$/.test(value);
}

/**
 * Check if a value is a valid refusal category
 */
export function isRefusalCategory(value: unknown): value is RefusalCategory {
  const categories: RefusalCategory[] = [
    'AXIOM', 'VALIDATION', 'COVERAGE', 'STRENGTH', 
    'INTEGRITY', 'TEMPORAL', 'EXTERNAL', 'POLICY'
  ];
  return typeof value === 'string' && categories.includes(value as RefusalCategory);
}

/**
 * Check if a value is a valid refusal severity
 */
export function isRefusalSeverity(value: unknown): value is RefusalSeverity {
  const severities: RefusalSeverity[] = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
  return typeof value === 'string' && severities.includes(value as RefusalSeverity);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a refusal for display
 */
export function formatRefusal(refusal: Refusal): string {
  const lines: string[] = [
    `[${refusal.severity}] ${refusal.code}: ${refusal.title}`,
    `Reason: ${refusal.reason}`,
    `Recoverable: ${refusal.recoverable ? 'Yes' : 'No'}`
  ];
  
  if (refusal.relatedAxiom) {
    lines.push(`Related Axiom: ${refusal.relatedAxiom}`);
  }
  
  if (refusal.remediations.length > 0) {
    lines.push('Remediations:');
    for (const r of refusal.remediations) {
      lines.push(`  - ${r}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Generate refusal summary
 */
export function generateRefusalSummary(refusals: readonly Refusal[]): string {
  if (refusals.length === 0) {
    return 'No refusals.';
  }
  
  const highest = getHighestSeverity(refusals);
  const blocking = hasBlockingRefusals(refusals);
  const recoverable = allRecoverable(refusals);
  
  const lines: string[] = [
    `Refusals: ${refusals.length}`,
    `Highest Severity: ${highest}`,
    `Blocking: ${blocking ? 'Yes' : 'No'}`,
    `All Recoverable: ${recoverable ? 'Yes' : 'No'}`,
    '',
    'Details:'
  ];
  
  for (const refusal of refusals) {
    lines.push(`  - [${refusal.severity}] ${refusal.code}: ${refusal.title}`);
  }
  
  return lines.join('\n');
}
