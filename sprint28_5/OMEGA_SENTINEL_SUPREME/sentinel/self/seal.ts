/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — SELF SEAL
 * Sprint 27.3 — Cryptographic Self-Certification
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Produces a cryptographic seal attesting the system state at a given instant.
 * Seal REFERENCES (pointers) existing hashes — never copies data.
 * 
 * INV-SEAL-01: sealHash = SHA256(canonicalSerialize(core))
 * INV-SEAL-02: Referenced hashes exist (boundaryLedger, inventory, proofs)
 * INV-SEAL-03: SEALED ssi pure.attacked == pure.total AND survived == total AND verdict == SURVIVED
 * INV-SEAL-04: limitations.length >= 1
 * INV-SEAL-05: Each limitations[].boundaryId exists in BoundaryLedger
 * INV-SEAL-06: No copies (seal doesn't contain full invariant lists/boundaries)
 * INV-SEAL-07: Cross-run determinism (same inputs = same sealHash)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';
import type { BoundaryLedger } from '../meta/boundary_ledger.js';
import type { FalsificationReport } from './survival-proof.js';
import type { InvariantCategory } from '../meta/inventory.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const SEAL_VERSION = '1.0.0' as const;

/**
 * Mandatory boundary IDs that MUST be referenced in seal limitations.
 * These are the HARD boundaries with highest impact.
 */
export const MANDATORY_BOUNDARY_IDS = [
  'BOUND-001',  // Node.js Runtime Trust
  'BOUND-002',  // V8 JavaScript Engine Trust
  'BOUND-003',  // Operating System Trust
  'BOUND-005',  // SHA-256 Implementation Trust
  'BOUND-011',  // Bootstrapping Circularity
  'BOUND-015',  // Halting Problem Limitation
] as const;

/**
 * Summaries for mandatory limitations (stable text, no poetry)
 */
export const BOUNDARY_SUMMARIES: Readonly<Record<string, string>> = Object.freeze({
  'BOUND-001': 'Node.js runtime assumed correct',
  'BOUND-002': 'V8 engine assumed per ECMAScript spec',
  'BOUND-003': 'OS syscalls assumed correct',
  'BOUND-005': 'SHA-256 impl from Node.js crypto trusted',
  'BOUND-011': 'Self-certification has bootstrap circularity',
  'BOUND-015': 'Halting problem undecidable (Turing 1936)',
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — REFERENCES (pointers, not copies)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BoundaryLedgerReference {
  readonly ledgerHash: string;
  readonly version: string;
  readonly boundaryCount: number;
}

export interface InventoryReference {
  readonly inventoryHash: string;
  readonly invariantCount: number;
  readonly categories: Readonly<Record<InvariantCategory, number>>;
}

export interface SurvivalProofReference {
  readonly proofHash: string;
  readonly seed: number;
  readonly verdict: 'SURVIVED' | 'BREACHED';
}

export interface SealReferences {
  readonly boundaryLedger: BoundaryLedgerReference;
  readonly inventory: InventoryReference;
  readonly survivalProof: SurvivalProofReference;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — ATTESTATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface PureInvariantAttestation {
  readonly total: number;
  readonly attacked: number;
  readonly survived: number;
}

export interface RunnerAttestation {
  readonly stopOnFirstBreach: boolean;
  readonly deterministic: boolean;
}

export type SealVerdict = 'SEALED' | 'INCOMPLETE' | 'BREACHED';

export interface SealAttestation {
  readonly pureInvariants: PureInvariantAttestation;
  readonly runner: RunnerAttestation;
  readonly verdict: SealVerdict;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — LIMITATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SealLimitation {
  readonly boundaryId: string;
  readonly summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — CORE (HASHED)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SelfSealCore {
  readonly version: typeof SEAL_VERSION;
  readonly references: SealReferences;
  readonly attestation: SealAttestation;
  readonly limitations: readonly SealLimitation[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — META (NOT HASHED)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SelfSealMeta {
  readonly sealedAt: string;      // ISO timestamp
  readonly sealedBy: string;      // Identifier (e.g., "OMEGA SENTINEL")
  readonly runId: string;         // Unique run identifier
  readonly environment: string;   // "linux" | "windows" | etc.
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — COMPLETE SEAL
// ═══════════════════════════════════════════════════════════════════════════════

export interface SelfSeal {
  readonly core: SelfSealCore;
  readonly meta: SelfSealMeta;
  readonly sealHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL SERIALIZATION (deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recursively sort object keys for canonical JSON serialization.
 * Arrays preserve order, objects get sorted keys.
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
 * Canonical serialization of core data.
 * - Keys sorted recursively
 * - No whitespace
 * - UTF-8
 */
export function canonicalSerialize(core: SelfSealCore): string {
  return JSON.stringify(sortObjectKeys(core));
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH COMPUTATION — INV-SEAL-01
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute seal hash from core only (meta excluded).
 * INV-SEAL-01: sealHash = SHA256(canonicalSerialize(core))
 */
export function computeSealHash(core: SelfSealCore): string {
  const canonical = canonicalSerialize(core);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY HASH (for reference)
// ═══════════════════════════════════════════════════════════════════════════════

export interface InventoryData {
  readonly records: readonly { id: string; module: string; category: string }[];
}

/**
 * Compute deterministic hash for inventory.
 */
export function computeInventoryHash(inventory: InventoryData): string {
  // Only include id, module, category for hash (minimal, stable)
  const sorted = [...inventory.records]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(r => ({ category: r.category, id: r.id, module: r.module }));
  
  const canonical = JSON.stringify(sorted);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create boundary ledger reference from ledger.
 */
export function createBoundaryLedgerReference(
  ledger: BoundaryLedger,
  ledgerHash: string
): BoundaryLedgerReference {
  return Object.freeze({
    ledgerHash,
    version: ledger.version,
    boundaryCount: ledger.boundaries.length,
  });
}

/**
 * Create inventory reference.
 */
export function createInventoryReference(
  inventoryHash: string,
  invariantCount: number,
  categories: Record<InvariantCategory, number>
): InventoryReference {
  return Object.freeze({
    inventoryHash,
    invariantCount,
    categories: Object.freeze({ ...categories }),
  });
}

/**
 * Create survival proof reference from report.
 */
export function createSurvivalProofReference(
  report: FalsificationReport
): SurvivalProofReference {
  return Object.freeze({
    proofHash: report.reportHash,
    seed: report.seed,
    verdict: report.summary.verdict === 'PASS' ? 'SURVIVED' : 'BREACHED',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITATIONS FACTORY — INV-SEAL-04, INV-SEAL-05
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create mandatory limitations from boundary IDs.
 * INV-SEAL-04: At least 1 limitation
 * INV-SEAL-05: Each boundaryId must exist in ledger
 */
export function createMandatoryLimitations(
  ledger: BoundaryLedger,
  boundaryIds: readonly string[] = MANDATORY_BOUNDARY_IDS
): readonly SealLimitation[] {
  const ledgerIds = new Set(ledger.boundaries.map(b => b.id));
  const limitations: SealLimitation[] = [];
  
  for (const id of boundaryIds) {
    if (!ledgerIds.has(id)) {
      throw new Error(`INV-SEAL-05 violation: boundaryId '${id}' not found in ledger`);
    }
    
    limitations.push(Object.freeze({
      boundaryId: id,
      summary: BOUNDARY_SUMMARIES[id] ?? ledger.boundaries.find(b => b.id === id)?.title ?? 'Unknown',
    }));
  }
  
  if (limitations.length === 0) {
    throw new Error('INV-SEAL-04 violation: limitations.length must be >= 1');
  }
  
  return Object.freeze(limitations);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT COMPUTATION — INV-SEAL-03
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute seal verdict.
 * INV-SEAL-03: SEALED ssi pure.attacked == pure.total AND survived == total AND proofVerdict == SURVIVED
 */
export function computeVerdict(
  pure: PureInvariantAttestation,
  proofVerdict: 'SURVIVED' | 'BREACHED'
): SealVerdict {
  // BREACHED: any breach detected
  if (proofVerdict === 'BREACHED') {
    return 'BREACHED';
  }
  
  // INCOMPLETE: not all attacked OR not all survived
  if (pure.attacked !== pure.total) {
    return 'INCOMPLETE';
  }
  if (pure.survived !== pure.total) {
    return 'INCOMPLETE';
  }
  
  // SEALED: all conditions met
  return 'SEALED';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATTESTATION FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface AttestationInput {
  readonly pureTotal: number;
  readonly pureAttacked: number;
  readonly pureSurvived: number;
  readonly stopOnFirstBreach: boolean;
  readonly deterministic: boolean;
  readonly proofVerdict: 'SURVIVED' | 'BREACHED';
}

/**
 * Create attestation from input data.
 */
export function createAttestation(input: AttestationInput): SealAttestation {
  const pureInvariants: PureInvariantAttestation = Object.freeze({
    total: input.pureTotal,
    attacked: input.pureAttacked,
    survived: input.pureSurvived,
  });
  
  const runner: RunnerAttestation = Object.freeze({
    stopOnFirstBreach: input.stopOnFirstBreach,
    deterministic: input.deterministic,
  });
  
  const verdict = computeVerdict(pureInvariants, input.proofVerdict);
  
  return Object.freeze({
    pureInvariants,
    runner,
    verdict,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface SealCoreInput {
  readonly references: SealReferences;
  readonly attestation: SealAttestation;
  readonly limitations: readonly SealLimitation[];
}

/**
 * Create seal core (all frozen).
 */
export function createSealCore(input: SealCoreInput): SelfSealCore {
  return Object.freeze({
    version: SEAL_VERSION,
    references: Object.freeze(input.references),
    attestation: input.attestation,
    limitations: input.limitations,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// META FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface SealMetaInput {
  readonly sealedAt?: string;     // Defaults to now
  readonly sealedBy?: string;     // Defaults to "OMEGA SENTINEL"
  readonly runId?: string;        // Defaults to generated
  readonly environment?: string;  // Defaults to detected
}

/**
 * Generate unique run ID.
 */
export function generateRunId(): string {
  // Format: SEAL-{timestamp}-{random}
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `SEAL-${timestamp}-${random}`;
}

/**
 * Detect current environment.
 */
export function detectEnvironment(): string {
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform;
  }
  return 'unknown';
}

/**
 * Create seal meta (non-hashed).
 */
export function createSealMeta(input: SealMetaInput = {}): SelfSealMeta {
  return Object.freeze({
    sealedAt: input.sealedAt ?? new Date().toISOString(),
    sealedBy: input.sealedBy ?? 'OMEGA SENTINEL',
    runId: input.runId ?? generateRunId(),
    environment: input.environment ?? detectEnvironment(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL FACTORY — MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateSealInput {
  readonly core: SealCoreInput;
  readonly meta?: SealMetaInput;
}

/**
 * Create a complete Self Seal.
 * INV-SEAL-01: sealHash = SHA256(canonicalSerialize(core))
 */
export function createSelfSeal(input: CreateSealInput): SelfSeal {
  const core = createSealCore(input.core);
  const meta = createSealMeta(input.meta);
  const sealHash = computeSealHash(core);
  
  return Object.freeze({
    core,
    meta,
    sealHash,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION — INV-SEAL-01 through INV-SEAL-07
// ═══════════════════════════════════════════════════════════════════════════════

export interface SealValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly hashValid: boolean;
  readonly limitationsValid: boolean;
  readonly verdictValid: boolean;
}

/**
 * Validate a Self Seal against all invariants.
 */
export function validateSeal(
  seal: SelfSeal,
  ledger?: BoundaryLedger
): SealValidationResult {
  const errors: string[] = [];
  
  // INV-SEAL-01: Hash verification
  const recomputedHash = computeSealHash(seal.core);
  const hashValid = seal.sealHash === recomputedHash;
  if (!hashValid) {
    errors.push(`INV-SEAL-01: sealHash mismatch (expected ${recomputedHash}, got ${seal.sealHash})`);
  }
  
  // INV-SEAL-04: At least 1 limitation
  const limitationsValid = seal.core.limitations.length >= 1;
  if (!limitationsValid) {
    errors.push('INV-SEAL-04: limitations.length must be >= 1');
  }
  
  // INV-SEAL-05: Each boundaryId exists in ledger
  if (ledger) {
    const ledgerIds = new Set(ledger.boundaries.map(b => b.id));
    for (const lim of seal.core.limitations) {
      if (!ledgerIds.has(lim.boundaryId)) {
        errors.push(`INV-SEAL-05: boundaryId '${lim.boundaryId}' not in ledger`);
      }
    }
  }
  
  // INV-SEAL-03: Verdict logic
  const { pureInvariants, verdict } = seal.core.attestation;
  const proofVerdict = seal.core.references.survivalProof.verdict;
  const expectedVerdict = computeVerdict(pureInvariants, proofVerdict);
  const verdictValid = verdict === expectedVerdict;
  if (!verdictValid) {
    errors.push(`INV-SEAL-03: verdict mismatch (expected ${expectedVerdict}, got ${verdict})`);
  }
  
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    hashValid,
    limitationsValid,
    verdictValid,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if seal is fully certified (SEALED verdict).
 */
export function isSealed(seal: SelfSeal): boolean {
  return seal.core.attestation.verdict === 'SEALED';
}

/**
 * Check if seal has any breach.
 */
export function isBreached(seal: SelfSeal): boolean {
  return seal.core.attestation.verdict === 'BREACHED';
}

/**
 * Get all limitation boundary IDs.
 */
export function getLimitationIds(seal: SelfSeal): readonly string[] {
  return seal.core.limitations.map(l => l.boundaryId);
}

/**
 * Get survival rate from attestation.
 */
export function getSurvivalRate(seal: SelfSeal): number {
  const { pureInvariants } = seal.core.attestation;
  if (pureInvariants.attacked === 0) return 0;
  return pureInvariants.survived / pureInvariants.attacked;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format seal summary for display.
 */
export function formatSealSummary(seal: SelfSeal): string {
  const { core, meta, sealHash } = seal;
  const { attestation, references, limitations } = core;
  const { pureInvariants, verdict } = attestation;
  
  const lines = [
    '╔═══════════════════════════════════════════════════════════════════════════════╗',
    '║                         OMEGA SENTINEL — SELF SEAL                            ║',
    '╠═══════════════════════════════════════════════════════════════════════════════╣',
    `║  Version:     ${core.version.padEnd(60)}║`,
    `║  Verdict:     ${verdict.padEnd(60)}║`,
    `║  Seal Hash:   ${sealHash.substring(0, 56)}...║`,
    '╠═══════════════════════════════════════════════════════════════════════════════╣',
    '║  ATTESTATION                                                                  ║',
    `║    PURE:      ${pureInvariants.survived}/${pureInvariants.total} survived (${pureInvariants.attacked} attacked)`.padEnd(76) + '║',
    `║    Runner:    stopOnBreach=${attestation.runner.stopOnFirstBreach}, deterministic=${attestation.runner.deterministic}`.padEnd(76) + '║',
    '╠═══════════════════════════════════════════════════════════════════════════════╣',
    '║  REFERENCES                                                                   ║',
    `║    Ledger:    ${references.boundaryLedger.boundaryCount} boundaries (v${references.boundaryLedger.version})`.padEnd(76) + '║',
    `║    Inventory: ${references.inventory.invariantCount} invariants`.padEnd(76) + '║',
    `║    Proof:     seed=${references.survivalProof.seed} verdict=${references.survivalProof.verdict}`.padEnd(76) + '║',
    '╠═══════════════════════════════════════════════════════════════════════════════╣',
    `║  LIMITATIONS: ${limitations.length}`.padEnd(76) + '║',
    ...limitations.map(l => `║    ${l.boundaryId}: ${l.summary}`.padEnd(76) + '║'),
    '╠═══════════════════════════════════════════════════════════════════════════════╣',
    '║  META                                                                         ║',
    `║    Sealed:    ${meta.sealedAt}`.padEnd(76) + '║',
    `║    By:        ${meta.sealedBy}`.padEnd(76) + '║',
    `║    Env:       ${meta.environment}`.padEnd(76) + '║',
    '╚═══════════════════════════════════════════════════════════════════════════════╝',
  ];
  
  return lines.join('\n');
}

/**
 * Format compact seal reference (one line).
 */
export function formatSealReference(seal: SelfSeal): string {
  const { verdict } = seal.core.attestation;
  const hash = seal.sealHash.substring(0, 16);
  return `[SEAL:${verdict}:${hash}...]`;
}
