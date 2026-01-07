/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — OMEGA SEAL
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module meta/seal
 * @version 2.0.0
 * @license MIT
 * 
 * OMEGA SEAL — CRYPTOGRAPHIC CERTIFICATION
 * ========================================
 * 
 * The final seal that certifies system state:
 * - Immutable once created
 * - Contains hash pointers (not copies)
 * - Includes explicit limitations summary
 * 
 * INVARIANTS:
 * - INV-META-09: Seal is immutable after creation
 * - INV-META-10: Seal.boundaryCount === BoundaryLedger.boundaries.length
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { canonicalHash } from './canonical.js';
import type { RegionId } from '../regions/definitions.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Seal Core (HASHABLE)
 * Contains only hash pointers, not duplicated data
 */
export interface SealCore {
  readonly systemId: string;
  readonly version: string;
  readonly sealVersion: string;
  
  // Hash pointers (references to source-of-truth)
  readonly rootHash: string;              // Hash of all source files
  readonly snapshotCoreHash: string;      // Hash of SnapshotCore
  readonly exportCoreHash: string;        // Hash of ExportCore
  readonly boundaryLedgerHash: string;    // Hash of BoundaryLedgerCore
  readonly guaranteeLedgerHash: string;   // Hash of GuaranteeLedgerCore
  readonly journalHash: string | null;    // Hash of PipelineJournalCore
  
  // Metrics (from snapshot)
  readonly invariantCount: number;
  readonly testCount: number;
  readonly testsPassed: number;
  readonly regionAchieved: RegionId;
  readonly survivalRate: number;
  readonly coverageRatio: number;
  
  // Limitations (count must match ledger)
  readonly boundaryCount: number;
  readonly guaranteeCount: number;
  readonly limitationsSummary: string;
}

/**
 * Seal Meta (NOT HASHABLE)
 */
export interface SealMeta {
  readonly sealedAt: string;
  readonly sealedBy: string;
  readonly environment: string;
}

/**
 * Complete Omega Seal
 */
export interface OmegaSeal {
  readonly core: SealCore;
  readonly meta: SealMeta;
  readonly sealHash: string;  // Hash of core only
}

/**
 * Seal verification result
 */
export interface SealVerification {
  readonly isValid: boolean;
  readonly hashMatch: boolean;
  readonly countMatch: boolean;
  readonly errors: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Current seal version
 */
export const SEAL_VERSION = '1.0.0' as const;

/**
 * Seal status
 */
export type SealStatus = 'VALID' | 'INVALID' | 'TAMPERED' | 'UNKNOWN';

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL CREATION
// ═══════════════════════════════════════════════════════════════════════════════

let sealCounter = 0;

/**
 * Generate unique system ID
 */
export function generateSystemId(): string {
  sealCounter++;
  return `OMEGA-${Date.now()}-${String(sealCounter).padStart(4, '0')}`;
}

/**
 * Reset seal counter (for testing)
 */
export function resetSealCounter(): void {
  sealCounter = 0;
}

/**
 * Generate limitations summary from boundary count
 */
export function generateLimitationsSummary(boundaryCount: number): string {
  return `This system declares ${boundaryCount} explicit limitations. ` +
    `Any capability not listed in the Guarantee Ledger is NOT guaranteed. ` +
    `See Boundary Ledger for details.`;
}

/**
 * Create seal core
 */
export function createSealCore(input: {
  systemId?: string;
  version: string;
  rootHash: string;
  snapshotCoreHash: string;
  exportCoreHash: string;
  boundaryLedgerHash: string;
  guaranteeLedgerHash: string;
  journalHash?: string | null;
  invariantCount: number;
  testCount: number;
  testsPassed: number;
  regionAchieved: RegionId;
  survivalRate: number;
  coverageRatio: number;
  boundaryCount: number;
  guaranteeCount: number;
}): SealCore {
  return Object.freeze({
    systemId: input.systemId ?? generateSystemId(),
    version: input.version,
    sealVersion: SEAL_VERSION,
    rootHash: input.rootHash,
    snapshotCoreHash: input.snapshotCoreHash,
    exportCoreHash: input.exportCoreHash,
    boundaryLedgerHash: input.boundaryLedgerHash,
    guaranteeLedgerHash: input.guaranteeLedgerHash,
    journalHash: input.journalHash ?? null,
    invariantCount: input.invariantCount,
    testCount: input.testCount,
    testsPassed: input.testsPassed,
    regionAchieved: input.regionAchieved,
    survivalRate: input.survivalRate,
    coverageRatio: input.coverageRatio,
    boundaryCount: input.boundaryCount,
    guaranteeCount: input.guaranteeCount,
    limitationsSummary: generateLimitationsSummary(input.boundaryCount)
  });
}

/**
 * Create seal meta
 */
export function createSealMeta(input?: {
  sealedBy?: string;
  environment?: string;
}): SealMeta {
  return Object.freeze({
    sealedAt: new Date().toISOString(),
    sealedBy: input?.sealedBy ?? 'system',
    environment: input?.environment ?? 'unknown'
  });
}

/**
 * Compute seal hash (from core only)
 */
export function computeSealHash(core: SealCore): string {
  return canonicalHash(core);
}

/**
 * Create complete Omega Seal
 */
export function createOmegaSeal(
  core: SealCore,
  meta?: SealMeta
): OmegaSeal {
  const actualMeta = meta ?? createSealMeta();
  const sealHash = computeSealHash(core);
  
  return Object.freeze({
    core,
    meta: actualMeta,
    sealHash
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify seal hash
 */
export function verifySealHash(seal: OmegaSeal): boolean {
  const computed = computeSealHash(seal.core);
  return computed === seal.sealHash;
}

/**
 * Verify boundary count matches
 */
export function verifyBoundaryCount(
  seal: OmegaSeal,
  actualBoundaryCount: number
): boolean {
  return seal.core.boundaryCount === actualBoundaryCount;
}

/**
 * Verify guarantee count matches
 */
export function verifyGuaranteeCount(
  seal: OmegaSeal,
  actualGuaranteeCount: number
): boolean {
  return seal.core.guaranteeCount === actualGuaranteeCount;
}

/**
 * Complete seal verification
 */
export function verifySeal(
  seal: OmegaSeal,
  actualBoundaryCount: number,
  actualGuaranteeCount: number
): SealVerification {
  const errors: string[] = [];
  
  // Check hash
  const hashMatch = verifySealHash(seal);
  if (!hashMatch) {
    errors.push('Seal hash mismatch: seal may be tampered');
  }
  
  // Check boundary count
  const boundaryMatch = verifyBoundaryCount(seal, actualBoundaryCount);
  if (!boundaryMatch) {
    errors.push(
      `Boundary count mismatch: seal=${seal.core.boundaryCount}, actual=${actualBoundaryCount}`
    );
  }
  
  // Check guarantee count
  const guaranteeMatch = verifyGuaranteeCount(seal, actualGuaranteeCount);
  if (!guaranteeMatch) {
    errors.push(
      `Guarantee count mismatch: seal=${seal.core.guaranteeCount}, actual=${actualGuaranteeCount}`
    );
  }
  
  const countMatch = boundaryMatch && guaranteeMatch;
  
  return Object.freeze({
    isValid: errors.length === 0,
    hashMatch,
    countMatch,
    errors: Object.freeze(errors)
  });
}

/**
 * Get seal status
 */
export function getSealStatus(seal: OmegaSeal): SealStatus {
  if (!verifySealHash(seal)) {
    return 'TAMPERED';
  }
  return 'VALID';
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if all tests passed
 */
export function allTestsPassed(seal: OmegaSeal): boolean {
  return seal.core.testsPassed === seal.core.testCount;
}

/**
 * Get test pass rate
 */
export function getTestPassRate(seal: OmegaSeal): number {
  if (seal.core.testCount === 0) return 0;
  return seal.core.testsPassed / seal.core.testCount;
}

/**
 * Check if seal meets minimum region
 */
export function meetsMinimumRegion(
  seal: OmegaSeal,
  minimum: RegionId
): boolean {
  // Import region order dynamically to avoid circular deps
  const regionOrder = [
    'VOID', 'THEORETICAL', 'EXPLORATORY', 
    'CONSTRUCTED', 'PROVEN', 'BATTLE_TESTED', 'TRANSCENDENT'
  ];
  const sealIndex = regionOrder.indexOf(seal.core.regionAchieved);
  const minIndex = regionOrder.indexOf(minimum);
  return sealIndex >= minIndex;
}

/**
 * Get seal age in days
 */
export function getSealAgeInDays(seal: OmegaSeal): number {
  const sealedAt = new Date(seal.meta.sealedAt);
  const now = new Date();
  const diffMs = now.getTime() - sealedAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize seal to JSON
 */
export function serializeSeal(seal: OmegaSeal): string {
  return JSON.stringify(seal, null, 2);
}

/**
 * Deserialize seal from JSON
 */
export function deserializeSeal(json: string): OmegaSeal {
  try {
    const parsed = JSON.parse(json);
    
    if (!parsed.core || !parsed.meta || !parsed.sealHash) {
      throw new Error('Invalid seal format: missing required fields');
    }
    
    return Object.freeze({
      core: Object.freeze(parsed.core),
      meta: Object.freeze(parsed.meta),
      sealHash: parsed.sealHash
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare two seals
 */
export function compareSeals(a: OmegaSeal, b: OmegaSeal): {
  readonly areEqual: boolean;
  readonly hashEqual: boolean;
  readonly versionEqual: boolean;
  readonly metricsEqual: boolean;
} {
  const hashEqual = a.sealHash === b.sealHash;
  const versionEqual = a.core.version === b.core.version;
  const metricsEqual = 
    a.core.invariantCount === b.core.invariantCount &&
    a.core.testCount === b.core.testCount &&
    a.core.testsPassed === b.core.testsPassed;
  
  return Object.freeze({
    areEqual: hashEqual,
    hashEqual,
    versionEqual,
    metricsEqual
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format seal as string
 */
export function formatSeal(seal: OmegaSeal): string {
  const passRate = (getTestPassRate(seal) * 100).toFixed(1);
  const survivalRate = (seal.core.survivalRate * 100).toFixed(1);
  const coverage = (seal.core.coverageRatio * 100).toFixed(1);
  
  return `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           OMEGA SEAL CERTIFICATE                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  System ID:      ${seal.core.systemId.padEnd(52)}║
║  Version:        ${seal.core.version.padEnd(52)}║
║  Seal Version:   ${seal.core.sealVersion.padEnd(52)}║
║  Sealed:         ${seal.meta.sealedAt.padEnd(52)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  ROOT HASH:      ${seal.core.rootHash.substring(0, 52)}║
║  SEAL HASH:      ${seal.sealHash.substring(0, 52)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  METRICS                                                                      ║
║  ─────────────────────────────────────────────────────────────────────────────║
║  Invariants:     ${String(seal.core.invariantCount).padEnd(52)}║
║  Tests:          ${`${seal.core.testsPassed}/${seal.core.testCount} (${passRate}%)`.padEnd(52)}║
║  Region:         ${seal.core.regionAchieved.padEnd(52)}║
║  Survival:       ${`${survivalRate}%`.padEnd(52)}║
║  Coverage:       ${`${coverage}%`.padEnd(52)}║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  EPISTEMIC STATUS                                                             ║
║  ─────────────────────────────────────────────────────────────────────────────║
║  Boundaries:     ${String(seal.core.boundaryCount).padEnd(52)}║
║  Guarantees:     ${String(seal.core.guaranteeCount).padEnd(52)}║
║                                                                               ║
║  ${seal.core.limitationsSummary.substring(0, 71).padEnd(71)}║
╚═══════════════════════════════════════════════════════════════════════════════╝
`.trim();
}

/**
 * Format verification result
 */
export function formatVerification(verification: SealVerification): string {
  if (verification.isValid) {
    return '✓ Seal verification passed - Certificate is authentic';
  }
  
  const lines = [
    '✗ Seal verification FAILED:',
    `  Hash integrity: ${verification.hashMatch ? '✓' : '✗ TAMPERED'}`,
    `  Count consistency: ${verification.countMatch ? '✓' : '✗ MISMATCH'}`,
  ];
  
  if (verification.errors.length > 0) {
    lines.push('', '  Errors:');
    for (const error of verification.errors) {
      lines.push(`    - ${error}`);
    }
  }
  
  return lines.join('\n');
}
