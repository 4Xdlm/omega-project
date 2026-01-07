/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — SYSTEM INTROSPECTION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module meta/introspection
 * @version 2.0.0
 * @license MIT
 * 
 * INTROSPECTION — THE SYSTEM OBSERVES ITSELF
 * ==========================================
 * 
 * Captures complete system state as snapshot:
 * - Core: hashable, deterministic
 * - Meta: timestamps, environment (NOT hashable)
 * 
 * INVARIANTS:
 * - INV-META-03: SnapshotCore contains all expectedModules
 * - INV-META-04: computeCoreHash is deterministic (same core = same hash)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { 
  canonicalHash, 
  sortUnique, 
  isSortedUnique,
  computeMerkleHash
} from './canonical.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expected modules in the system (frozen, sorted)
 * This is the authoritative list — any snapshot must contain all of these
 */
export const EXPECTED_MODULES: readonly string[] = Object.freeze([
  'artifact',
  'crystal',
  'falsification',
  'foundation',
  'gravity',
  'meta',
  'negative',
  'refusal',
  'regions'
].sort());

/**
 * Current system version
 */
export const SYSTEM_VERSION = '3.27.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Module state (hashable)
 * - hash is Merkle hash of module files (LF-normalized, sorted by path)
 */
export interface ModuleState {
  readonly name: string;
  readonly fileCount: number;
  readonly files: readonly FileInfo[];
  readonly hash: string;  // Merkle hash of files
}

/**
 * File info for Merkle computation
 */
export interface FileInfo {
  readonly path: string;   // Normalized (forward slash, relative)
  readonly hash: string;   // SHA-256 of LF-normalized content
}

/**
 * Snapshot Core (HASHABLE)
 * Everything that defines the system state
 */
export interface SnapshotCore {
  readonly version: string;
  
  // Explicit module list (frozen, sorted, unique)
  readonly expectedModules: readonly string[];
  
  // Actual module states
  readonly modules: readonly ModuleState[];
  
  // Invariants
  readonly invariantCount: number;
  readonly invariantIds: readonly string[];
  
  // Tests
  readonly testCount: number;
  readonly testsPassed: number;
  
  // Metrics (quantized floats)
  readonly falsificationSurvivalRate: number;
  readonly coverageRatio: number;
  readonly gravityNormalized: number;
  readonly negativeScore: number;
  
  // Boundary Ledger reference
  readonly boundaryLedgerHash: string;
}

/**
 * Snapshot Meta (NOT HASHABLE)
 * Contextual info that varies per capture
 */
export interface SnapshotMeta {
  readonly capturedAt: string;
  readonly capturedBy: string;
  readonly runId: string;
  readonly environment: string;
  readonly nodeVersion: string;
  readonly platform: string;
}

/**
 * Complete snapshot
 */
export interface SystemSnapshot {
  readonly core: SnapshotCore;
  readonly meta: SnapshotMeta;
  readonly coreHash: string;  // Hash of core only
}

/**
 * Snapshot diff result
 */
export interface SnapshotDiff {
  readonly areEqual: boolean;
  readonly versionChanged: boolean;
  readonly modulesChanged: readonly string[];
  readonly invariantsAdded: readonly string[];
  readonly invariantsRemoved: readonly string[];
  readonly metricsChanged: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that expectedModules is properly formatted
 */
export function validateExpectedModules(modules: readonly string[]): boolean {
  return isSortedUnique(modules);
}

/**
 * Validate that snapshot contains all expected modules
 */
export function validateSnapshotCompleteness(core: SnapshotCore): {
  readonly isComplete: boolean;
  readonly missing: readonly string[];
  readonly extra: readonly string[];
} {
  const actualNames = new Set(core.modules.map(m => m.name));
  const expectedNames = new Set(core.expectedModules);
  
  const missing = core.expectedModules.filter(m => !actualNames.has(m));
  const extra = core.modules
    .map(m => m.name)
    .filter(m => !expectedNames.has(m));
  
  return {
    isComplete: missing.length === 0 && extra.length === 0,
    missing: Object.freeze(missing),
    extra: Object.freeze(extra)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE STATE CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create module state from file list
 */
export function createModuleState(
  name: string,
  files: readonly FileInfo[]
): ModuleState {
  // Sort files by path
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
  
  // Compute Merkle hash
  const hash = computeMerkleHash(sortedFiles);
  
  return Object.freeze({
    name,
    fileCount: files.length,
    files: Object.freeze(sortedFiles),
    hash
  });
}

/**
 * Create file info
 */
export function createFileInfo(path: string, hash: string): FileInfo {
  // Normalize path to forward slashes
  const normalizedPath = path.replace(/\\/g, '/');
  
  return Object.freeze({
    path: normalizedPath,
    hash
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create snapshot core
 */
export function createSnapshotCore(input: {
  version?: string;
  modules: readonly ModuleState[];
  invariantCount: number;
  invariantIds: readonly string[];
  testCount: number;
  testsPassed: number;
  falsificationSurvivalRate: number;
  coverageRatio: number;
  gravityNormalized: number;
  negativeScore: number;
  boundaryLedgerHash: string;
}): SnapshotCore {
  // Sort modules by name
  const sortedModules = [...input.modules].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  // Sort invariant IDs
  const sortedInvariantIds = sortUnique(input.invariantIds);
  
  return Object.freeze({
    version: input.version ?? SYSTEM_VERSION,
    expectedModules: EXPECTED_MODULES,
    modules: Object.freeze(sortedModules),
    invariantCount: input.invariantCount,
    invariantIds: sortedInvariantIds,
    testCount: input.testCount,
    testsPassed: input.testsPassed,
    falsificationSurvivalRate: input.falsificationSurvivalRate,
    coverageRatio: input.coverageRatio,
    gravityNormalized: input.gravityNormalized,
    negativeScore: input.negativeScore,
    boundaryLedgerHash: input.boundaryLedgerHash
  });
}

/**
 * Create snapshot meta
 */
export function createSnapshotMeta(input?: {
  capturedBy?: string;
  runId?: string;
  environment?: string;
}): SnapshotMeta {
  return Object.freeze({
    capturedAt: new Date().toISOString(),
    capturedBy: input?.capturedBy ?? 'system',
    runId: input?.runId ?? `run-${Date.now()}`,
    environment: input?.environment ?? 'unknown',
    nodeVersion: process.version ?? 'unknown',
    platform: process.platform ?? 'unknown'
  });
}

/**
 * Compute snapshot core hash
 */
export function computeSnapshotCoreHash(core: SnapshotCore): string {
  return canonicalHash(core);
}

/**
 * Create complete system snapshot
 */
export function createSystemSnapshot(
  core: SnapshotCore,
  meta?: SnapshotMeta
): SystemSnapshot {
  const actualMeta = meta ?? createSnapshotMeta();
  const coreHash = computeSnapshotCoreHash(core);
  
  return Object.freeze({
    core,
    meta: actualMeta,
    coreHash
  });
}

/**
 * Verify snapshot hash
 */
export function verifySnapshotHash(snapshot: SystemSnapshot): boolean {
  const computed = computeSnapshotCoreHash(snapshot.core);
  return computed === snapshot.coreHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT DIFF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare two snapshot cores
 */
export function diffSnapshots(
  coreA: SnapshotCore,
  coreB: SnapshotCore
): SnapshotDiff {
  // Check version
  const versionChanged = coreA.version !== coreB.version;
  
  // Check modules
  const modulesA = new Map(coreA.modules.map(m => [m.name, m.hash]));
  const modulesB = new Map(coreB.modules.map(m => [m.name, m.hash]));
  
  const modulesChanged: string[] = [];
  for (const [name, hashA] of modulesA) {
    const hashB = modulesB.get(name);
    if (hashB !== hashA) {
      modulesChanged.push(name);
    }
  }
  // Check for new modules in B
  for (const name of modulesB.keys()) {
    if (!modulesA.has(name) && !modulesChanged.includes(name)) {
      modulesChanged.push(name);
    }
  }
  
  // Check invariants
  const invA = new Set(coreA.invariantIds);
  const invB = new Set(coreB.invariantIds);
  
  const invariantsAdded = coreB.invariantIds.filter(id => !invA.has(id));
  const invariantsRemoved = coreA.invariantIds.filter(id => !invB.has(id));
  
  // Check metrics
  const metricsChanged: string[] = [];
  if (coreA.falsificationSurvivalRate !== coreB.falsificationSurvivalRate) {
    metricsChanged.push('falsificationSurvivalRate');
  }
  if (coreA.coverageRatio !== coreB.coverageRatio) {
    metricsChanged.push('coverageRatio');
  }
  if (coreA.gravityNormalized !== coreB.gravityNormalized) {
    metricsChanged.push('gravityNormalized');
  }
  if (coreA.negativeScore !== coreB.negativeScore) {
    metricsChanged.push('negativeScore');
  }
  
  const areEqual = !versionChanged && 
    modulesChanged.length === 0 &&
    invariantsAdded.length === 0 &&
    invariantsRemoved.length === 0 &&
    metricsChanged.length === 0;
  
  return Object.freeze({
    areEqual,
    versionChanged,
    modulesChanged: Object.freeze(modulesChanged),
    invariantsAdded: Object.freeze(invariantsAdded),
    invariantsRemoved: Object.freeze(invariantsRemoved),
    metricsChanged: Object.freeze(metricsChanged)
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get module by name
 */
export function getModule(
  core: SnapshotCore,
  name: string
): ModuleState | undefined {
  return core.modules.find(m => m.name === name);
}

/**
 * Get all module names
 */
export function getModuleNames(core: SnapshotCore): readonly string[] {
  return core.modules.map(m => m.name);
}

/**
 * Count total files across all modules
 */
export function countTotalFiles(core: SnapshotCore): number {
  return core.modules.reduce((sum, m) => sum + m.fileCount, 0);
}

/**
 * Get test pass rate
 */
export function getTestPassRate(core: SnapshotCore): number {
  if (core.testCount === 0) return 0;
  return core.testsPassed / core.testCount;
}

/**
 * Check if all tests passed
 */
export function allTestsPassed(core: SnapshotCore): boolean {
  return core.testsPassed === core.testCount;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format snapshot summary
 */
export function formatSnapshotSummary(snapshot: SystemSnapshot): string {
  const { core, meta, coreHash } = snapshot;
  
  const lines = [
    `System Snapshot: v${core.version}`,
    `═══════════════════════════════════`,
    `Hash: ${coreHash.substring(0, 16)}...`,
    `Captured: ${meta.capturedAt}`,
    `Environment: ${meta.environment}`,
    ``,
    `Modules: ${core.modules.length}/${core.expectedModules.length}`,
    ...core.modules.map(m => `  - ${m.name}: ${m.fileCount} files`),
    ``,
    `Invariants: ${core.invariantCount}`,
    `Tests: ${core.testsPassed}/${core.testCount}`,
    ``,
    `Metrics:`,
    `  Survival Rate: ${(core.falsificationSurvivalRate * 100).toFixed(1)}%`,
    `  Coverage: ${(core.coverageRatio * 100).toFixed(1)}%`,
    `  Gravity: ${(core.gravityNormalized * 100).toFixed(1)}%`,
    `  Negative: ${core.negativeScore.toFixed(2)}`
  ];
  
  return lines.join('\n');
}

/**
 * Format diff summary
 */
export function formatDiffSummary(diff: SnapshotDiff): string {
  if (diff.areEqual) {
    return 'Snapshots are identical.';
  }
  
  const lines = ['Snapshot Differences:', '═══════════════════════════════════'];
  
  if (diff.versionChanged) {
    lines.push('  - Version changed');
  }
  
  if (diff.modulesChanged.length > 0) {
    lines.push(`  - Modules changed: ${diff.modulesChanged.join(', ')}`);
  }
  
  if (diff.invariantsAdded.length > 0) {
    lines.push(`  - Invariants added: ${diff.invariantsAdded.join(', ')}`);
  }
  
  if (diff.invariantsRemoved.length > 0) {
    lines.push(`  - Invariants removed: ${diff.invariantsRemoved.join(', ')}`);
  }
  
  if (diff.metricsChanged.length > 0) {
    lines.push(`  - Metrics changed: ${diff.metricsChanged.join(', ')}`);
  }
  
  return lines.join('\n');
}
