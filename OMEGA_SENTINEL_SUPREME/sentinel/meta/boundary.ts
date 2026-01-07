/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — BOUNDARY LEDGER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module meta/boundary
 * @version 2.0.0
 * @license MIT
 * 
 * BOUNDARY LEDGER — EXPLICIT LIMITS
 * =================================
 * 
 * What the system DOES NOT guarantee.
 * Every limitation is:
 * - Explicit (declared)
 * - Categorized (why)
 * - Auditable (verifiable)
 * 
 * GUARANTEE LEDGER — EXPLICIT PROMISES
 * ====================================
 * 
 * What the system DOES guarantee.
 * Everything else = NOT GUARANTEED.
 * 
 * INVARIANTS:
 * - INV-META-05: Every boundary is present in Seal
 * - INV-META-06: No implicit promises (guarantees explicit, all else not guaranteed)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { canonicalHash } from './canonical.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Boundary categories
 */
export type BoundaryCategory =
  | 'COMPLETENESS'      // What the system does not cover
  | 'SELF_REFERENCE'    // Limits of self-certification
  | 'EXTERNAL'          // External dependencies not guaranteed
  | 'TEMPORAL'          // Time-related limits
  | 'COMPUTATIONAL';    // Computational assumptions

/**
 * Boundary core (hashable)
 * NOTE: testId is in meta, NOT here (to avoid instability)
 */
export interface BoundaryCore {
  readonly id: string;
  readonly category: BoundaryCategory;
  readonly description: string;
  readonly reason: string;
}

/**
 * Boundary meta (NOT hashable)
 */
export interface BoundaryMeta {
  readonly testId: string | null;  // Test that proves the limit
  readonly addedAt: string;
  readonly addedBy: string;
}

/**
 * Complete boundary
 */
export interface Boundary {
  readonly core: BoundaryCore;
  readonly meta: BoundaryMeta;
}

/**
 * Boundary Ledger core (hashable)
 */
export interface BoundaryLedgerCore {
  readonly version: string;
  readonly boundaries: readonly BoundaryCore[];
}

/**
 * Boundary Ledger meta (NOT hashable)
 */
export interface BoundaryLedgerMeta {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly boundaryMetas: readonly BoundaryMeta[];
}

/**
 * Complete Boundary Ledger
 */
export interface BoundaryLedger {
  readonly core: BoundaryLedgerCore;
  readonly meta: BoundaryLedgerMeta;
  readonly ledgerHash: string;  // Hash of core only
}

/**
 * Guarantee (explicit promise)
 */
export interface Guarantee {
  readonly id: string;
  readonly description: string;
  readonly condition: string;  // Under what conditions
  readonly invariantRef: string | null;  // Reference to proving invariant
}

/**
 * Guarantee Ledger
 */
export interface GuaranteeLedgerCore {
  readonly version: string;
  readonly guarantees: readonly Guarantee[];
}

export interface GuaranteeLedger {
  readonly core: GuaranteeLedgerCore;
  readonly ledgerHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const BOUNDARY_LEDGER_VERSION = '1.0.0' as const;
export const GUARANTEE_LEDGER_VERSION = '1.0.0' as const;

/**
 * All boundary categories
 */
export const BOUNDARY_CATEGORIES: readonly BoundaryCategory[] = Object.freeze([
  'COMPLETENESS',
  'SELF_REFERENCE',
  'EXTERNAL',
  'TEMPORAL',
  'COMPUTATIONAL'
]);

/**
 * Mandatory boundaries (system MUST declare these)
 */
export const MANDATORY_BOUNDARIES: readonly BoundaryCore[] = Object.freeze([
  {
    id: 'BOUND-001',
    category: 'SELF_REFERENCE',
    description: 'The system cannot prove its own global consistency',
    reason: 'Per Gödel incompleteness, no sufficiently expressive system can prove its own consistency from within'
  },
  {
    id: 'BOUND-002',
    category: 'COMPLETENESS',
    description: 'Falsification coverage is finite, not exhaustive',
    reason: 'Attack corpus is bounded; infinite input space cannot be fully covered'
  },
  {
    id: 'BOUND-003',
    category: 'EXTERNAL',
    description: 'External certifier for TRANSCENDENT region is out of scope',
    reason: 'Human or third-party validation cannot be automated'
  },
  {
    id: 'BOUND-004',
    category: 'TEMPORAL',
    description: 'Proofs have temporal decay',
    reason: 'Evidence weight decreases over time (λ=0.997)'
  },
  {
    id: 'BOUND-005',
    category: 'COMPUTATIONAL',
    description: 'System assumes practical soundness of SHA-256',
    reason: 'Collision resistance is not formally proven in our model; we rely on cryptographic community consensus'
  }
]);

/**
 * System guarantees (explicit promises)
 */
export const SYSTEM_GUARANTEES: readonly Guarantee[] = Object.freeze([
  {
    id: 'GUAR-001',
    description: 'Deterministic hash computation',
    condition: 'Same input produces same hash',
    invariantRef: 'INV-META-04'
  },
  {
    id: 'GUAR-002',
    description: 'Immutable sealed artifacts',
    condition: 'Once sealed, artifact cannot be modified',
    invariantRef: 'INV-ART-02'
  },
  {
    id: 'GUAR-003',
    description: 'Explicit refusal with code and reason',
    condition: 'Every refusal has REF-XXX-NNN code',
    invariantRef: 'INV-REF-01'
  },
  {
    id: 'GUAR-004',
    description: 'Proof strength total order',
    condition: 'Ω > Λ > Σ > Δ > Ε always',
    invariantRef: 'INV-PROOF-01'
  },
  {
    id: 'GUAR-005',
    description: 'Region containment is monotonic',
    condition: 'Better metrics → higher or equal region',
    invariantRef: 'INV-CONT-03'
  },
  {
    id: 'GUAR-006',
    description: 'Export/Import round-trip preserves hash',
    condition: 'hash(export(core)) is stable cross-platform',
    invariantRef: 'INV-META-07'
  }
]);

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if category is valid
 */
export function isValidCategory(cat: unknown): cat is BoundaryCategory {
  return typeof cat === 'string' && 
    BOUNDARY_CATEGORIES.includes(cat as BoundaryCategory);
}

/**
 * Validate boundary ID format (BOUND-NNN)
 */
export function isValidBoundaryId(id: string): boolean {
  return /^BOUND-\d{3}$/.test(id);
}

/**
 * Validate guarantee ID format (GUAR-NNN)
 */
export function isValidGuaranteeId(id: string): boolean {
  return /^GUAR-\d{3}$/.test(id);
}

/**
 * Check if ledger contains all mandatory boundaries
 */
export function containsAllMandatory(
  ledger: BoundaryLedgerCore
): { isComplete: boolean; missing: readonly string[] } {
  const ids = new Set(ledger.boundaries.map(b => b.id));
  const missing = MANDATORY_BOUNDARIES
    .filter(b => !ids.has(b.id))
    .map(b => b.id);
  
  return {
    isComplete: missing.length === 0,
    missing: Object.freeze(missing)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDARY CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create boundary core
 */
export function createBoundaryCore(
  id: string,
  category: BoundaryCategory,
  description: string,
  reason: string
): BoundaryCore {
  if (!isValidBoundaryId(id)) {
    throw new Error(`Invalid boundary ID format: ${id}`);
  }
  if (!isValidCategory(category)) {
    throw new Error(`Invalid category: ${category}`);
  }
  
  return Object.freeze({
    id,
    category,
    description,
    reason
  });
}

/**
 * Create boundary meta
 */
export function createBoundaryMeta(
  testId: string | null = null,
  addedBy: string = 'system'
): BoundaryMeta {
  return Object.freeze({
    testId,
    addedAt: new Date().toISOString(),
    addedBy
  });
}

/**
 * Create complete boundary
 */
export function createBoundary(
  core: BoundaryCore,
  meta?: BoundaryMeta
): Boundary {
  return Object.freeze({
    core,
    meta: meta ?? createBoundaryMeta()
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create boundary ledger core with mandatory boundaries
 */
export function createBoundaryLedgerCore(
  additionalBoundaries: readonly BoundaryCore[] = []
): BoundaryLedgerCore {
  // Combine mandatory + additional, sort by ID
  const allBoundaries = [...MANDATORY_BOUNDARIES, ...additionalBoundaries]
    .sort((a, b) => a.id.localeCompare(b.id));
  
  // Deduplicate by ID
  const seen = new Set<string>();
  const unique = allBoundaries.filter(b => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
  
  return Object.freeze({
    version: BOUNDARY_LEDGER_VERSION,
    boundaries: Object.freeze(unique)
  });
}

/**
 * Compute boundary ledger hash (from core only)
 */
export function computeBoundaryLedgerHash(core: BoundaryLedgerCore): string {
  return canonicalHash(core);
}

/**
 * Create complete boundary ledger
 */
export function createBoundaryLedger(
  core: BoundaryLedgerCore,
  metas?: readonly BoundaryMeta[]
): BoundaryLedger {
  const boundaryMetas = metas ?? core.boundaries.map(() => createBoundaryMeta());
  
  return Object.freeze({
    core,
    meta: Object.freeze({
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      boundaryMetas: Object.freeze(boundaryMetas)
    }),
    ledgerHash: computeBoundaryLedgerHash(core)
  });
}

/**
 * Verify ledger hash
 */
export function verifyBoundaryLedgerHash(ledger: BoundaryLedger): boolean {
  const computed = computeBoundaryLedgerHash(ledger.core);
  return computed === ledger.ledgerHash;
}

/**
 * Add boundary to ledger (immutable)
 */
export function addBoundaryToLedger(
  ledger: BoundaryLedger,
  boundary: Boundary
): BoundaryLedger {
  // Check for duplicate
  if (ledger.core.boundaries.some(b => b.id === boundary.core.id)) {
    throw new Error(`Duplicate boundary ID: ${boundary.core.id}`);
  }
  
  const newBoundaries = [...ledger.core.boundaries, boundary.core]
    .sort((a, b) => a.id.localeCompare(b.id));
  
  const newCore = Object.freeze({
    ...ledger.core,
    boundaries: Object.freeze(newBoundaries)
  });
  
  const newMetas = [...ledger.meta.boundaryMetas, boundary.meta];
  
  return Object.freeze({
    core: newCore,
    meta: Object.freeze({
      ...ledger.meta,
      updatedAt: new Date().toISOString(),
      boundaryMetas: Object.freeze(newMetas)
    }),
    ledgerHash: computeBoundaryLedgerHash(newCore)
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUARANTEE LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create guarantee ledger core
 */
export function createGuaranteeLedgerCore(
  additionalGuarantees: readonly Guarantee[] = []
): GuaranteeLedgerCore {
  const allGuarantees = [...SYSTEM_GUARANTEES, ...additionalGuarantees]
    .sort((a, b) => a.id.localeCompare(b.id));
  
  // Deduplicate
  const seen = new Set<string>();
  const unique = allGuarantees.filter(g => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
  
  return Object.freeze({
    version: GUARANTEE_LEDGER_VERSION,
    guarantees: Object.freeze(unique)
  });
}

/**
 * Compute guarantee ledger hash
 */
export function computeGuaranteeLedgerHash(core: GuaranteeLedgerCore): string {
  return canonicalHash(core);
}

/**
 * Create complete guarantee ledger
 */
export function createGuaranteeLedger(
  core?: GuaranteeLedgerCore
): GuaranteeLedger {
  const actualCore = core ?? createGuaranteeLedgerCore();
  
  return Object.freeze({
    core: actualCore,
    ledgerHash: computeGuaranteeLedgerHash(actualCore)
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get boundaries by category
 */
export function getBoundariesByCategory(
  ledger: BoundaryLedgerCore,
  category: BoundaryCategory
): readonly BoundaryCore[] {
  return ledger.boundaries.filter(b => b.category === category);
}

/**
 * Get boundary by ID
 */
export function getBoundaryById(
  ledger: BoundaryLedgerCore,
  id: string
): BoundaryCore | undefined {
  return ledger.boundaries.find(b => b.id === id);
}

/**
 * Count boundaries by category
 */
export function countBoundariesByCategory(
  ledger: BoundaryLedgerCore
): Map<BoundaryCategory, number> {
  const counts = new Map<BoundaryCategory, number>();
  
  for (const cat of BOUNDARY_CATEGORIES) {
    counts.set(cat, 0);
  }
  
  for (const b of ledger.boundaries) {
    counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
  }
  
  return counts;
}

/**
 * Get guarantee by ID
 */
export function getGuaranteeById(
  ledger: GuaranteeLedgerCore,
  id: string
): Guarantee | undefined {
  return ledger.guarantees.find(g => g.id === id);
}

/**
 * Check if something is guaranteed
 */
export function isGuaranteed(
  ledger: GuaranteeLedgerCore,
  description: string
): boolean {
  return ledger.guarantees.some(g => 
    g.description.toLowerCase().includes(description.toLowerCase())
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format boundary ledger as string
 */
export function formatBoundaryLedger(ledger: BoundaryLedger): string {
  const lines = [
    `Boundary Ledger v${ledger.core.version}`,
    `═══════════════════════════════════`,
    `Hash: ${ledger.ledgerHash.substring(0, 16)}...`,
    `Boundaries: ${ledger.core.boundaries.length}`,
    ``
  ];
  
  for (const cat of BOUNDARY_CATEGORIES) {
    const bounds = getBoundariesByCategory(ledger.core, cat);
    if (bounds.length > 0) {
      lines.push(`[${cat}]`);
      for (const b of bounds) {
        lines.push(`  ${b.id}: ${b.description}`);
        lines.push(`         Reason: ${b.reason}`);
      }
      lines.push(``);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format guarantee ledger as string
 */
export function formatGuaranteeLedger(ledger: GuaranteeLedger): string {
  const lines = [
    `Guarantee Ledger v${ledger.core.version}`,
    `═══════════════════════════════════`,
    `Hash: ${ledger.ledgerHash.substring(0, 16)}...`,
    `Guarantees: ${ledger.core.guarantees.length}`,
    ``
  ];
  
  for (const g of ledger.core.guarantees) {
    lines.push(`${g.id}: ${g.description}`);
    lines.push(`       Condition: ${g.condition}`);
    if (g.invariantRef) {
      lines.push(`       Invariant: ${g.invariantRef}`);
    }
    lines.push(``);
  }
  
  return lines.join('\n');
}

/**
 * Generate disclaimer text
 */
export function generateDisclaimer(
  boundaries: BoundaryLedgerCore,
  guarantees: GuaranteeLedgerCore
): string {
  return `
OMEGA SENTINEL SUPREME — EPISTEMIC DISCLAIMER
══════════════════════════════════════════════

EXPLICIT GUARANTEES (${guarantees.guarantees.length}):
${guarantees.guarantees.map(g => `  ✓ ${g.description}`).join('\n')}

EXPLICIT LIMITATIONS (${boundaries.boundaries.length}):
${boundaries.boundaries.map(b => `  ✗ ${b.description}`).join('\n')}

ANYTHING NOT LISTED ABOVE IS NOT GUARANTEED.

This system:
- Declares what it CAN do (Guarantees)
- Declares what it CANNOT do (Boundaries)
- Makes NO implicit promises

Hash verification ensures this disclaimer is tamper-evident.
`.trim();
}
