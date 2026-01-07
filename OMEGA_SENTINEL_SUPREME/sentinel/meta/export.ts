/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — SYSTEM EXPORT/IMPORT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module meta/export
 * @version 2.0.0
 * @license MIT
 * 
 * EXPORT/IMPORT — PORTABLE CERTIFICATION
 * ======================================
 * 
 * Complete system state can be:
 * - Exported to portable format
 * - Imported with full verification
 * - Round-trip preserves hash
 * 
 * INVARIANTS:
 * - INV-META-07: Export/Import round-trip preserves coreHash
 * - INV-META-08: Canonical serialization produces same blob cross-platform
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { canonicalize, canonicalHash } from './canonical.js';
import type { SnapshotCore } from './introspection.js';
import type { BoundaryLedgerCore, GuaranteeLedgerCore } from './boundary.js';
import type { PipelineJournalCore } from './orchestrator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Invariant reference (minimal, for export)
 */
export interface InvariantRef {
  readonly id: string;
  readonly property: string;
  readonly strength: string;
  readonly hash: string;
}

/**
 * Artifact reference (minimal, for export)
 */
export interface ArtifactRef {
  readonly id: string;
  readonly region: string;
  readonly status: string;
  readonly hash: string | null;
}

/**
 * Export Core (HASHABLE)
 */
export interface ExportCore {
  readonly version: string;
  readonly exportVersion: string;  // Export format version
  
  // System snapshot
  readonly snapshotCore: SnapshotCore;
  
  // Registries
  readonly invariants: readonly InvariantRef[];
  readonly artifacts: readonly ArtifactRef[];
  
  // Ledgers
  readonly boundaryLedger: BoundaryLedgerCore;
  readonly guaranteeLedger: GuaranteeLedgerCore;
  
  // Pipeline
  readonly pipelineJournal: PipelineJournalCore | null;
}

/**
 * Export Meta (NOT HASHABLE)
 */
export interface ExportMeta {
  readonly exportedAt: string;
  readonly exportedBy: string;
  readonly sourceEnvironment: string;
  readonly sourcePlatform: string;
  readonly sourceNodeVersion: string;
}

/**
 * Complete System Export
 */
export interface SystemExport {
  readonly core: ExportCore;
  readonly meta: ExportMeta;
  readonly coreHash: string;
}

/**
 * Import validation result
 */
export interface ImportValidation {
  readonly isValid: boolean;
  readonly hashMatch: boolean;
  readonly versionCompatible: boolean;
  readonly errors: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Current export format version
 */
export const EXPORT_FORMAT_VERSION = '1.0.0' as const;

/**
 * Minimum supported import version
 */
export const MIN_IMPORT_VERSION = '1.0.0' as const;

/**
 * Export file extension
 */
export const EXPORT_EXTENSION = '.omega-export.json' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize export core to canonical string
 */
export function serializeExportCore(core: ExportCore): string {
  return canonicalize(core);
}

/**
 * Compute export core hash
 */
export function computeExportCoreHash(core: ExportCore): string {
  return canonicalHash(core);
}

/**
 * Serialize complete export
 */
export function serializeExport(exp: SystemExport): string {
  // Core is canonical, meta is not
  return JSON.stringify({
    core: JSON.parse(canonicalize(exp.core)),
    meta: exp.meta,
    coreHash: exp.coreHash
  }, null, 2);
}

/**
 * Deserialize export from string
 */
export function deserializeExport(blob: string): SystemExport {
  try {
    const parsed = JSON.parse(blob);
    
    if (!parsed.core || !parsed.meta || !parsed.coreHash) {
      throw new Error('Invalid export format: missing required fields');
    }
    
    return Object.freeze({
      core: Object.freeze(parsed.core),
      meta: Object.freeze(parsed.meta),
      coreHash: parsed.coreHash
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create export meta
 */
export function createExportMeta(input?: {
  exportedBy?: string;
  sourceEnvironment?: string;
}): ExportMeta {
  return Object.freeze({
    exportedAt: new Date().toISOString(),
    exportedBy: input?.exportedBy ?? 'system',
    sourceEnvironment: input?.sourceEnvironment ?? 'unknown',
    sourcePlatform: process.platform ?? 'unknown',
    sourceNodeVersion: process.version ?? 'unknown'
  });
}

/**
 * Create export core
 */
export function createExportCore(input: {
  version: string;
  snapshotCore: SnapshotCore;
  invariants: readonly InvariantRef[];
  artifacts: readonly ArtifactRef[];
  boundaryLedger: BoundaryLedgerCore;
  guaranteeLedger: GuaranteeLedgerCore;
  pipelineJournal?: PipelineJournalCore | null;
}): ExportCore {
  // Sort invariants and artifacts by ID for determinism
  const sortedInvariants = [...input.invariants]
    .sort((a, b) => a.id.localeCompare(b.id));
  const sortedArtifacts = [...input.artifacts]
    .sort((a, b) => a.id.localeCompare(b.id));
  
  return Object.freeze({
    version: input.version,
    exportVersion: EXPORT_FORMAT_VERSION,
    snapshotCore: input.snapshotCore,
    invariants: Object.freeze(sortedInvariants),
    artifacts: Object.freeze(sortedArtifacts),
    boundaryLedger: input.boundaryLedger,
    guaranteeLedger: input.guaranteeLedger,
    pipelineJournal: input.pipelineJournal ?? null
  });
}

/**
 * Create complete system export
 */
export function createSystemExport(
  core: ExportCore,
  meta?: ExportMeta
): SystemExport {
  const actualMeta = meta ?? createExportMeta();
  const coreHash = computeExportCoreHash(core);
  
  return Object.freeze({
    core,
    meta: actualMeta,
    coreHash
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Export system to blob
 */
export function exportSystem(core: ExportCore): string {
  const exp = createSystemExport(core);
  return serializeExport(exp);
}

/**
 * Export system to SystemExport object
 */
export function exportSystemFull(core: ExportCore, meta?: ExportMeta): SystemExport {
  return createSystemExport(core, meta);
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Import system from blob
 */
export function importSystem(blob: string): SystemExport {
  return deserializeExport(blob);
}

/**
 * Extract core from import (for processing)
 */
export function extractCore(exp: SystemExport): ExportCore {
  return exp.core;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate export hash
 */
export function verifyExportHash(exp: SystemExport): boolean {
  const computed = computeExportCoreHash(exp.core);
  return computed === exp.coreHash;
}

/**
 * Check version compatibility
 */
export function isVersionCompatible(exportVersion: string): boolean {
  // Simple semver major check
  const [major] = exportVersion.split('.').map(Number);
  const [minMajor] = MIN_IMPORT_VERSION.split('.').map(Number);
  return major >= minMajor;
}

/**
 * Validate import completely
 */
export function validateImport(exp: SystemExport): ImportValidation {
  const errors: string[] = [];
  
  // Check hash
  const hashMatch = verifyExportHash(exp);
  if (!hashMatch) {
    errors.push('Hash mismatch: export may be corrupted or tampered');
  }
  
  // Check version
  const versionCompatible = isVersionCompatible(exp.core.exportVersion);
  if (!versionCompatible) {
    errors.push(`Incompatible version: ${exp.core.exportVersion} (min: ${MIN_IMPORT_VERSION})`);
  }
  
  // Check required fields
  if (!exp.core.snapshotCore) {
    errors.push('Missing snapshotCore');
  }
  if (!exp.core.boundaryLedger) {
    errors.push('Missing boundaryLedger');
  }
  if (!exp.core.guaranteeLedger) {
    errors.push('Missing guaranteeLedger');
  }
  
  return Object.freeze({
    isValid: errors.length === 0,
    hashMatch,
    versionCompatible,
    errors: Object.freeze(errors)
  });
}

/**
 * Import and validate in one step
 */
export function importAndValidate(blob: string): {
  export: SystemExport | null;
  validation: ImportValidation;
} {
  try {
    const exp = importSystem(blob);
    const validation = validateImport(exp);
    return { export: exp, validation };
  } catch (error) {
    return {
      export: null,
      validation: {
        isValid: false,
        hashMatch: false,
        versionCompatible: false,
        errors: Object.freeze([`Parse error: ${(error as Error).message}`])
      }
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUND-TRIP VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify round-trip: export → import → export produces same hash
 */
export function verifyRoundTrip(core: ExportCore): {
  readonly success: boolean;
  readonly originalHash: string;
  readonly reimportHash: string;
} {
  // Export
  const blob = exportSystem(core);
  const originalHash = computeExportCoreHash(core);
  
  // Import
  const reimported = importSystem(blob);
  const reimportHash = computeExportCoreHash(reimported.core);
  
  return Object.freeze({
    success: originalHash === reimportHash,
    originalHash,
    reimportHash
  });
}

/**
 * Run multiple round-trip tests (cross-run verification)
 */
export function verifyMultipleRoundTrips(
  core: ExportCore,
  runs: number = 20
): {
  readonly allMatch: boolean;
  readonly runs: number;
  readonly hashes: readonly string[];
} {
  const hashes: string[] = [];
  
  for (let i = 0; i < runs; i++) {
    const blob = exportSystem(core);
    const reimported = importSystem(blob);
    hashes.push(computeExportCoreHash(reimported.core));
  }
  
  const firstHash = hashes[0];
  const allMatch = hashes.every(h => h === firstHash);
  
  return Object.freeze({
    allMatch,
    runs,
    hashes: Object.freeze(hashes)
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get invariant count from export
 */
export function getInvariantCount(exp: SystemExport): number {
  return exp.core.invariants.length;
}

/**
 * Get artifact count from export
 */
export function getArtifactCount(exp: SystemExport): number {
  return exp.core.artifacts.length;
}

/**
 * Get boundary count from export
 */
export function getBoundaryCount(exp: SystemExport): number {
  return exp.core.boundaryLedger.boundaries.length;
}

/**
 * Get guarantee count from export
 */
export function getGuaranteeCount(exp: SystemExport): number {
  return exp.core.guaranteeLedger.guarantees.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format export summary
 */
export function formatExportSummary(exp: SystemExport): string {
  const lines = [
    `System Export v${exp.core.version}`,
    `═══════════════════════════════════`,
    `Export Version: ${exp.core.exportVersion}`,
    `Core Hash: ${exp.coreHash.substring(0, 16)}...`,
    `Exported: ${exp.meta.exportedAt}`,
    `From: ${exp.meta.sourceEnvironment} (${exp.meta.sourcePlatform})`,
    ``,
    `Contents:`,
    `  Invariants: ${exp.core.invariants.length}`,
    `  Artifacts: ${exp.core.artifacts.length}`,
    `  Boundaries: ${exp.core.boundaryLedger.boundaries.length}`,
    `  Guarantees: ${exp.core.guaranteeLedger.guarantees.length}`,
    `  Pipeline: ${exp.core.pipelineJournal ? 'Yes' : 'No'}`
  ];
  
  return lines.join('\n');
}

/**
 * Format validation result
 */
export function formatValidation(validation: ImportValidation): string {
  if (validation.isValid) {
    return '✓ Import validation passed';
  }
  
  const lines = [
    '✗ Import validation failed:',
    `  Hash match: ${validation.hashMatch ? '✓' : '✗'}`,
    `  Version compatible: ${validation.versionCompatible ? '✓' : '✗'}`,
    ``,
    `  Errors:`
  ];
  
  for (const error of validation.errors) {
    lines.push(`    - ${error}`);
  }
  
  return lines.join('\n');
}
