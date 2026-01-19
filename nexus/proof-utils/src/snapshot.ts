/**
 * Snapshot Management
 * Standard: NASA-Grade L4
 *
 * Provides functionality for capturing and restoring file system state.
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Snapshot, SnapshotEntry, SnapshotOptions, RestoreResult, Clock } from './types.js';
import { systemClock } from './types.js';
import { ProofSnapshotCreateError, ProofSnapshotRestoreError } from './errors.js';

// ============================================================
// ID Generation
// ============================================================

let idCounter = 0;

function defaultIdGenerator(): string {
  return `snap-${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export function seededIdGenerator(seed: number): () => string {
  let counter = seed;
  return () => `snap-${++counter}`;
}

// ============================================================
// Snapshot Creation
// ============================================================

export function createSnapshot(
  filePaths: readonly string[],
  options: SnapshotOptions = {},
  clock: Clock = systemClock
): Snapshot {
  const idGenerator = options.idGenerator ?? defaultIdGenerator;
  const entries: SnapshotEntry[] = [];

  for (const filePath of filePaths) {
    try {
      if (!existsSync(filePath)) {
        throw new ProofSnapshotCreateError(`File does not exist: ${filePath}`, filePath);
      }

      const content = readFileSync(filePath);
      const stats = statSync(filePath);
      const hash = createHash('sha256').update(content).digest('hex');

      entries.push(Object.freeze({
        path: filePath,
        sha256: hash,
        size: stats.size,
        content: content.toString('base64'),
      }));
    } catch (error) {
      if (error instanceof ProofSnapshotCreateError) {
        throw error;
      }
      throw new ProofSnapshotCreateError(
        `Failed to snapshot file: ${(error as Error).message}`,
        filePath
      );
    }
  }

  return Object.freeze({
    id: idGenerator(),
    name: options.name ?? 'unnamed',
    entries: Object.freeze(entries),
    timestamp: clock.now(),
    metadata: Object.freeze(options.metadata ?? {}),
  });
}

// ============================================================
// Snapshot Restoration
// ============================================================

export function restoreSnapshot(
  snapshot: Snapshot,
  options: { createDirectories?: boolean; overwrite?: boolean } = {}
): RestoreResult {
  const restoredFiles: string[] = [];
  const errors: string[] = [];
  const { createDirectories = true, overwrite = true } = options;

  for (const entry of snapshot.entries) {
    try {
      // Check if file exists and overwrite is disabled
      if (existsSync(entry.path) && !overwrite) {
        errors.push(`File exists and overwrite disabled: ${entry.path}`);
        continue;
      }

      // Create parent directories if needed
      const dir = dirname(entry.path);
      if (!existsSync(dir)) {
        if (createDirectories) {
          mkdirSync(dir, { recursive: true });
        } else {
          errors.push(`Parent directory does not exist: ${dir}`);
          continue;
        }
      }

      // Decode and write content
      const content = Buffer.from(entry.content, 'base64');
      writeFileSync(entry.path, content);

      // Verify restoration
      const writtenContent = readFileSync(entry.path);
      const writtenHash = createHash('sha256').update(writtenContent).digest('hex');

      if (writtenHash !== entry.sha256) {
        errors.push(`Hash verification failed after restore: ${entry.path}`);
        continue;
      }

      restoredFiles.push(entry.path);
    } catch (error) {
      errors.push(`Failed to restore ${entry.path}: ${(error as Error).message}`);
    }
  }

  return Object.freeze({
    success: errors.length === 0,
    restoredFiles: Object.freeze(restoredFiles),
    errors: Object.freeze(errors),
  });
}

// ============================================================
// Snapshot Verification
// ============================================================

export function verifySnapshot(snapshot: Snapshot): RestoreResult {
  const restoredFiles: string[] = [];
  const errors: string[] = [];

  for (const entry of snapshot.entries) {
    if (!existsSync(entry.path)) {
      errors.push(`File not found: ${entry.path}`);
      continue;
    }

    try {
      const content = readFileSync(entry.path);
      const currentHash = createHash('sha256').update(content).digest('hex');

      if (currentHash !== entry.sha256) {
        errors.push(`Hash mismatch: ${entry.path}`);
        continue;
      }

      restoredFiles.push(entry.path);
    } catch (error) {
      errors.push(`Failed to verify ${entry.path}: ${(error as Error).message}`);
    }
  }

  return Object.freeze({
    success: errors.length === 0,
    restoredFiles: Object.freeze(restoredFiles),
    errors: Object.freeze(errors),
  });
}

// ============================================================
// Snapshot Comparison
// ============================================================

export function compareSnapshots(
  before: Snapshot,
  after: Snapshot
): {
  added: readonly string[];
  removed: readonly string[];
  modified: readonly string[];
  unchanged: readonly string[];
} {
  const beforeMap = new Map(before.entries.map(e => [e.path, e]));
  const afterMap = new Map(after.entries.map(e => [e.path, e]));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  const unchanged: string[] = [];

  // Check for removed and modified
  for (const [path, entry] of beforeMap) {
    const afterEntry = afterMap.get(path);
    if (!afterEntry) {
      removed.push(path);
    } else if (afterEntry.sha256 !== entry.sha256) {
      modified.push(path);
    } else {
      unchanged.push(path);
    }
  }

  // Check for added
  for (const path of afterMap.keys()) {
    if (!beforeMap.has(path)) {
      added.push(path);
    }
  }

  return Object.freeze({
    added: Object.freeze(added.sort()),
    removed: Object.freeze(removed.sort()),
    modified: Object.freeze(modified.sort()),
    unchanged: Object.freeze(unchanged.sort()),
  });
}
