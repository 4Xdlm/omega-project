/**
 * OMEGA Runner Directory Manager v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Manages run directory structure and file I/O.
 *
 * INVARIANTS:
 * - I-INV-08: Writes only to artefacts/runs/**
 * - I-INV-10: Verify mode zero writes
 *
 * SPEC: RUNNER_SPEC v1.2 §I
 */

import { join, dirname, relative } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { FIXED_PATHS, RUN_FILES, isAllowedWritePath, isSafePath, generateRunId } from './types';
import { computeHash } from './pipeline';

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECTORY STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run directory info.
 */
export interface RunDirectory {
  readonly runId: string;
  readonly path: string;
  readonly exists: boolean;
}

/**
 * File info in run directory.
 */
export interface RunFile {
  readonly name: string;
  readonly path: string;
  readonly exists: boolean;
  readonly size?: number;
}

/**
 * Run directory contents.
 */
export interface RunContents {
  readonly directory: RunDirectory;
  readonly files: readonly RunFile[];
  readonly artifacts: readonly RunFile[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECTORY OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets next available sequence number for a run.
 *
 * @param basePath - Base path
 * @param intentId - Intent ID
 * @returns Next sequence number
 */
export function getNextSequence(basePath: string, intentId: string): number {
  const runsPath = join(basePath, FIXED_PATHS.RUNS_ROOT);

  if (!existsSync(runsPath)) {
    return 1;
  }

  const entries = readdirSync(runsPath);
  const sanitizedId = intentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const prefix = `run_${sanitizedId}_`;

  let maxSeq = 0;
  for (const entry of entries) {
    if (entry.startsWith(prefix)) {
      const seqStr = entry.slice(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  return maxSeq + 1;
}

/**
 * Creates run directory path.
 *
 * @param basePath - Base path
 * @param intentId - Intent ID
 * @returns Run directory info
 */
export function createRunPath(basePath: string, intentId: string): RunDirectory {
  const seq = getNextSequence(basePath, intentId);
  const runId = generateRunId(intentId, seq);
  const path = join(basePath, FIXED_PATHS.RUNS_ROOT, runId);

  return Object.freeze({
    runId,
    path,
    exists: existsSync(path),
  });
}

/**
 * Creates run directory on disk.
 *
 * @param runDir - Run directory info
 * @throws Error if path validation fails
 */
export function createRunDirectory(runDir: RunDirectory): void {
  // Validate path is allowed
  const relativePath = runDir.path.replace(/\\/g, '/');
  if (!relativePath.includes(FIXED_PATHS.RUNS_ROOT)) {
    throw new Error(`I-INV-08 VIOLATION: Cannot write outside ${FIXED_PATHS.RUNS_ROOT}`);
  }

  if (!existsSync(runDir.path)) {
    mkdirSync(runDir.path, { recursive: true });
  }

  // Create artifacts subdirectory
  const artifactsPath = join(runDir.path, RUN_FILES.ARTIFACTS_DIR);
  if (!existsSync(artifactsPath)) {
    mkdirSync(artifactsPath, { recursive: true });
  }
}

/**
 * Gets run directory info.
 *
 * @param path - Directory path
 * @returns Run directory info
 */
export function getRunDirectory(path: string): RunDirectory {
  const runId = path.split(/[/\\]/).pop() ?? '';

  return Object.freeze({
    runId,
    path,
    exists: existsSync(path),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Writes file to run directory.
 * I-INV-08: Validates path is within allowed zone.
 *
 * @param runDir - Run directory
 * @param filename - File name
 * @param content - File content
 * @throws Error if path validation fails
 */
export function writeRunFile(runDir: RunDirectory, filename: string, content: string): void {
  // Validate filename
  if (!isSafePath(filename)) {
    throw new Error(`I-INV-08 VIOLATION: Invalid filename: ${filename}`);
  }

  const filePath = join(runDir.path, filename);

  // Validate full path
  const relativePath = filePath.replace(/\\/g, '/');
  if (!relativePath.includes(FIXED_PATHS.RUNS_ROOT)) {
    throw new Error(`I-INV-08 VIOLATION: Cannot write outside ${FIXED_PATHS.RUNS_ROOT}`);
  }

  // Create parent directory if needed
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write with LF line endings
  const normalized = content.replace(/\r\n/g, '\n');
  writeFileSync(filePath, normalized, 'utf-8');
}

/**
 * Reads file from run directory.
 *
 * @param runDir - Run directory
 * @param filename - File name
 * @returns File content or null if not found
 */
export function readRunFile(runDir: RunDirectory, filename: string): string | null {
  if (!isSafePath(filename)) {
    return null;
  }

  const filePath = join(runDir.path, filename);

  if (!existsSync(filePath)) {
    return null;
  }

  return readFileSync(filePath, 'utf-8');
}

/**
 * Checks if file exists in run directory.
 *
 * @param runDir - Run directory
 * @param filename - File name
 * @returns true if file exists
 */
export function runFileExists(runDir: RunDirectory, filename: string): boolean {
  if (!isSafePath(filename)) {
    return false;
  }

  const filePath = join(runDir.path, filename);
  return existsSync(filePath);
}

/**
 * Lists files in run directory.
 *
 * @param runDir - Run directory
 * @returns Run contents
 */
export function listRunFiles(runDir: RunDirectory): RunContents {
  const files: RunFile[] = [];
  const artifacts: RunFile[] = [];

  if (!runDir.exists) {
    return Object.freeze({
      directory: runDir,
      files: Object.freeze([]),
      artifacts: Object.freeze([]),
    });
  }

  // List root files
  const entries = readdirSync(runDir.path);
  for (const entry of entries) {
    const entryPath = join(runDir.path, entry);
    const stat = statSync(entryPath);

    if (stat.isFile()) {
      files.push(Object.freeze({
        name: entry,
        path: entryPath,
        exists: true,
        size: stat.size,
      }));
    } else if (stat.isDirectory() && entry === RUN_FILES.ARTIFACTS_DIR) {
      // List artifacts
      const artifactEntries = readdirSync(entryPath);
      for (const artifactEntry of artifactEntries) {
        const artifactPath = join(entryPath, artifactEntry);
        const artifactStat = statSync(artifactPath);
        if (artifactStat.isFile()) {
          artifacts.push(Object.freeze({
            name: artifactEntry,
            path: artifactPath,
            exists: true,
            size: artifactStat.size,
          }));
        }
      }
    }
  }

  return Object.freeze({
    directory: runDir,
    files: Object.freeze(files),
    artifacts: Object.freeze(artifacts),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRITE ALL FILES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Writes all files to run directory.
 *
 * @param runDir - Run directory
 * @param files - Map of filename to content
 */
export function writeAllRunFiles(runDir: RunDirectory, files: Map<string, string>): void {
  createRunDirectory(runDir);

  for (const [filename, content] of files) {
    writeRunFile(runDir, filename, content);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reads hashes file from run directory.
 *
 * @param runDir - Run directory
 * @returns Map of filename to hash
 */
export function readHashesFile(runDir: RunDirectory): Map<string, string> {
  const content = readRunFile(runDir, RUN_FILES.HASHES);
  if (!content) {
    return new Map();
  }

  const hashes = new Map<string, string>();
  const lines = content.split('\n').filter(l => l.trim());

  for (const line of lines) {
    // Format: hash  filename
    const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/);
    if (match) {
      hashes.set(match[2], match[1]);
    }
  }

  return hashes;
}

/**
 * Reads run hash from run directory.
 *
 * @param runDir - Run directory
 * @returns Run hash or null
 */
export function readRunHash(runDir: RunDirectory): string | null {
  const content = readRunFile(runDir, RUN_FILES.RUN_HASH);
  return content?.trim() ?? null;
}

/**
 * Computes hash of file in run directory.
 *
 * @param runDir - Run directory
 * @param filename - File name
 * @returns File hash or null
 */
export function computeFileHash(runDir: RunDirectory, filename: string): string | null {
  const content = readRunFile(runDir, filename);
  if (content === null) {
    return null;
  }
  return computeHash(content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lists intent files in a directory.
 * I-INV-09: Sorted by filename for determinism.
 *
 * @param dirPath - Directory path
 * @returns Sorted list of intent file paths
 */
export function listIntentFiles(dirPath: string): readonly string[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const entries = readdirSync(dirPath);
  const jsonFiles = entries.filter(e => e.endsWith('.json'));

  // Sort for determinism (I-INV-09)
  jsonFiles.sort();

  return Object.freeze(jsonFiles.map(f => join(dirPath, f)));
}

/**
 * Reads intent file.
 *
 * @param path - Intent file path
 * @returns Intent JSON content
 */
export function readIntentFile(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`Intent file not found: ${path}`);
  }
  return readFileSync(path, 'utf-8');
}
