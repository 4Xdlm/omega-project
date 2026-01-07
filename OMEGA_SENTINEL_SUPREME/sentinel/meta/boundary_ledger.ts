/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — BOUNDARY LEDGER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module meta/boundary_ledger
 * @version 3.27.0
 * @license MIT
 * 
 * Le Boundary Ledger est le "coupe-bullshit officiel" de SENTINEL.
 * Il déclare EXPLICITEMENT:
 * - Ce qui EST garanti (certifiable)
 * - Ce qui N'EST PAS garanti (boundaries)
 * - Pourquoi (raison)
 * - Ce qu'on fait à la place (mitigation)
 * 
 * RÈGLE CARDINALE: Tout ce qui n'est pas dans le ledger n'est pas garanti.
 * 
 * INVARIANT: INV-BND-01 — Tout ce qui n'est pas dans le ledger n'est pas garanti
 * INVARIANT: INV-BND-02 — Toute limite HARD a une raison + mitigation (ou null assumé)
 * INVARIANT: INV-BND-03 — Le ledger est référencé dans le Seal (hash + count)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const BOUNDARY_LEDGER_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — BOUNDARY SEVERITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Severity of a boundary limitation
 * - HARD: Cannot be overcome, fundamental limitation
 * - SOFT: Could be addressed with effort/resources
 * - INFORMATIONAL: For documentation, not a real limitation
 */
export type BoundarySeverity = 'HARD' | 'SOFT' | 'INFORMATIONAL';

/**
 * Category of boundary
 */
export type BoundaryCategory = 
  | 'EXTERNAL_DEPENDENCY'  // Node.js, V8, OS, npm packages
  | 'TOOLING'              // vitest, tsc, build tools
  | 'CRYPTOGRAPHIC'        // SHA-256 implementation trust
  | 'TEMPORAL'             // Time-dependent behavior
  | 'ENVIRONMENTAL'        // OS, filesystem, network
  | 'SEMANTIC'             // Meaning/interpretation limits
  | 'COMPUTATIONAL'        // Halting problem, complexity
  | 'SELF_REFERENCE';      // Bootstrapping, circular deps

/**
 * Risk level if boundary is violated
 */
export type BoundaryRisk = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — BOUNDARY ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A single boundary declaration
 */
export interface BoundaryEntry {
  /** Unique identifier: BOUND-NNN */
  readonly id: string;
  
  /** Human-readable title */
  readonly title: string;
  
  /** Detailed description of what is NOT guaranteed */
  readonly description: string;
  
  /** Category of this boundary */
  readonly category: BoundaryCategory;
  
  /** Severity level */
  readonly severity: BoundarySeverity;
  
  /** Risk if this boundary is ignored */
  readonly risk: BoundaryRisk;
  
  /** Why this cannot be certified (required for HARD) */
  readonly reason: string;
  
  /** What we do instead (null = explicitly accepted as-is) */
  readonly mitigation: string | null;
  
  /** Related invariants affected */
  readonly affectedInvariants: readonly string[];
  
  /** Related modules affected */
  readonly affectedModules: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — BOUNDARY LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The complete Boundary Ledger
 */
export interface BoundaryLedger {
  /** Ledger version */
  readonly version: typeof BOUNDARY_LEDGER_VERSION;
  
  /** Sentinel version this ledger applies to */
  readonly sentinelVersion: string;
  
  /** All boundary entries */
  readonly boundaries: readonly BoundaryEntry[];
  
  /** Summary statistics */
  readonly summary: BoundaryLedgerSummary;
}

/**
 * Ledger summary for quick reference
 */
export interface BoundaryLedgerSummary {
  readonly totalBoundaries: number;
  readonly byCategory: Readonly<Record<BoundaryCategory, number>>;
  readonly bySeverity: Readonly<Record<BoundarySeverity, number>>;
  readonly byRisk: Readonly<Record<BoundaryRisk, number>>;
}

/**
 * Hash reference for inclusion in Seal
 */
export interface BoundaryLedgerReference {
  readonly version: string;
  readonly boundaryCount: number;
  readonly coreHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Regex for boundary ID format: BOUND-NNN */
const BOUNDARY_ID_PATTERN = /^BOUND-\d{3}$/;

/**
 * Validate a boundary entry
 */
export function validateBoundaryEntry(entry: BoundaryEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // ID format
  if (!BOUNDARY_ID_PATTERN.test(entry.id)) {
    errors.push(`Invalid ID format: ${entry.id} (expected BOUND-NNN)`);
  }
  
  // Title not empty
  if (!entry.title || entry.title.trim().length === 0) {
    errors.push(`${entry.id}: title is empty`);
  }
  
  // Description not empty
  if (!entry.description || entry.description.trim().length === 0) {
    errors.push(`${entry.id}: description is empty`);
  }
  
  // Reason required for HARD severity
  if (entry.severity === 'HARD' && (!entry.reason || entry.reason.trim().length === 0)) {
    errors.push(`${entry.id}: HARD boundary requires non-empty reason`);
  }
  
  // Category valid
  const validCategories: BoundaryCategory[] = [
    'EXTERNAL_DEPENDENCY', 'TOOLING', 'CRYPTOGRAPHIC', 'TEMPORAL',
    'ENVIRONMENTAL', 'SEMANTIC', 'COMPUTATIONAL', 'SELF_REFERENCE'
  ];
  if (!validCategories.includes(entry.category)) {
    errors.push(`${entry.id}: invalid category ${entry.category}`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate entire ledger
 */
export function validateBoundaryLedger(ledger: BoundaryLedger): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Version check
  if (ledger.version !== BOUNDARY_LEDGER_VERSION) {
    errors.push(`Invalid ledger version: ${ledger.version}`);
  }
  
  // No duplicate IDs
  const ids = new Set<string>();
  for (const entry of ledger.boundaries) {
    if (ids.has(entry.id)) {
      errors.push(`Duplicate boundary ID: ${entry.id}`);
    }
    ids.add(entry.id);
    
    // Validate each entry
    const entryValidation = validateBoundaryEntry(entry);
    errors.push(...entryValidation.errors);
  }
  
  // Summary matches actual counts
  if (ledger.summary.totalBoundaries !== ledger.boundaries.length) {
    errors.push(`Summary total (${ledger.summary.totalBoundaries}) != actual count (${ledger.boundaries.length})`);
  }
  
  // Verify category counts
  for (const category of Object.keys(ledger.summary.byCategory) as BoundaryCategory[]) {
    const expected = ledger.boundaries.filter(b => b.category === category).length;
    const actual = ledger.summary.byCategory[category];
    if (expected !== actual) {
      errors.push(`Category ${category}: summary (${actual}) != actual (${expected})`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH COMPUTATION (DETERMINISTIC)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recursively sort object keys for canonical JSON
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Compute canonical hash of ledger (for Seal reference)
 * 
 * RULES:
 * - Keys sorted recursively
 * - No whitespace in JSON
 * - Only core data (no timestamps, no generated fields)
 */
export function computeBoundaryLedgerHash(ledger: BoundaryLedger): string {
  // Extract only hashable core data
  const coreData = {
    version: ledger.version,
    sentinelVersion: ledger.sentinelVersion,
    boundaries: ledger.boundaries.map(b => ({
      id: b.id,
      title: b.title,
      description: b.description,
      category: b.category,
      severity: b.severity,
      risk: b.risk,
      reason: b.reason,
      mitigation: b.mitigation,
      affectedInvariants: [...b.affectedInvariants].sort(),
      affectedModules: [...b.affectedModules].sort()
    })).sort((a, b) => a.id.localeCompare(b.id))
  };
  
  // Recursively sort all keys for canonical serialization
  const canonical = JSON.stringify(sortObjectKeys(coreData));
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Generate reference for Seal inclusion
 */
export function generateLedgerReference(ledger: BoundaryLedger): BoundaryLedgerReference {
  return {
    version: ledger.version,
    boundaryCount: ledger.boundaries.length,
    coreHash: computeBoundaryLedgerHash(ledger)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build summary from boundaries
 */
export function buildLedgerSummary(boundaries: readonly BoundaryEntry[]): BoundaryLedgerSummary {
  const byCategory: Record<BoundaryCategory, number> = {
    EXTERNAL_DEPENDENCY: 0,
    TOOLING: 0,
    CRYPTOGRAPHIC: 0,
    TEMPORAL: 0,
    ENVIRONMENTAL: 0,
    SEMANTIC: 0,
    COMPUTATIONAL: 0,
    SELF_REFERENCE: 0
  };
  
  const bySeverity: Record<BoundarySeverity, number> = {
    HARD: 0,
    SOFT: 0,
    INFORMATIONAL: 0
  };
  
  const byRisk: Record<BoundaryRisk, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  };
  
  for (const b of boundaries) {
    byCategory[b.category]++;
    bySeverity[b.severity]++;
    byRisk[b.risk]++;
  }
  
  return Object.freeze({
    totalBoundaries: boundaries.length,
    byCategory: Object.freeze(byCategory),
    bySeverity: Object.freeze(bySeverity),
    byRisk: Object.freeze(byRisk)
  });
}

/**
 * Create a complete ledger from entries
 */
export function createBoundaryLedger(
  sentinelVersion: string,
  boundaries: BoundaryEntry[]
): BoundaryLedger {
  const frozenBoundaries = Object.freeze(boundaries.map(b => Object.freeze(b)));
  
  return Object.freeze({
    version: BOUNDARY_LEDGER_VERSION,
    sentinelVersion,
    boundaries: frozenBoundaries,
    summary: buildLedgerSummary(frozenBoundaries)
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all HARD boundaries
 */
export function getHardBoundaries(ledger: BoundaryLedger): readonly BoundaryEntry[] {
  return ledger.boundaries.filter(b => b.severity === 'HARD');
}

/**
 * Get boundaries by category
 */
export function getBoundariesByCategory(
  ledger: BoundaryLedger, 
  category: BoundaryCategory
): readonly BoundaryEntry[] {
  return ledger.boundaries.filter(b => b.category === category);
}

/**
 * Get boundaries affecting a specific invariant
 */
export function getBoundariesForInvariant(
  ledger: BoundaryLedger,
  invariantId: string
): readonly BoundaryEntry[] {
  return ledger.boundaries.filter(b => b.affectedInvariants.includes(invariantId));
}

/**
 * Get boundaries affecting a specific module
 */
export function getBoundariesForModule(
  ledger: BoundaryLedger,
  moduleName: string
): readonly BoundaryEntry[] {
  return ledger.boundaries.filter(b => b.affectedModules.includes(moduleName));
}

/**
 * Check if an invariant has any HARD boundaries
 */
export function hasHardBoundary(ledger: BoundaryLedger, invariantId: string): boolean {
  return ledger.boundaries.some(
    b => b.severity === 'HARD' && b.affectedInvariants.includes(invariantId)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  BoundarySeverity,
  BoundaryCategory,
  BoundaryRisk,
  BoundaryEntry,
  BoundaryLedger,
  BoundaryLedgerSummary,
  BoundaryLedgerReference
};
