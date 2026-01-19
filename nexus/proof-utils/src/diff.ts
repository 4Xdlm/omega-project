/**
 * Diff Utilities
 * Standard: NASA-Grade L4
 *
 * Provides functionality for comparing manifests and detecting changes.
 */

import type { Manifest, DiffResult, DiffEntry, DiffType } from './types.js';
import { ProofDiffInvalidInputError } from './errors.js';

// ============================================================
// Manifest Diff
// ============================================================

export function diffManifests(before: Manifest, after: Manifest): DiffResult {
  if (!before || !after) {
    throw new ProofDiffInvalidInputError('Both manifests are required for diff');
  }

  const beforeMap = new Map(before.entries.map(e => [e.path, e]));
  const afterMap = new Map(after.entries.map(e => [e.path, e]));
  const allPaths = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  const entries: DiffEntry[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  for (const path of allPaths) {
    const beforeEntry = beforeMap.get(path);
    const afterEntry = afterMap.get(path);

    let type: DiffType;

    if (!beforeEntry && afterEntry) {
      type = 'added';
      added++;
    } else if (beforeEntry && !afterEntry) {
      type = 'removed';
      removed++;
    } else if (beforeEntry && afterEntry && beforeEntry.sha256 !== afterEntry.sha256) {
      type = 'modified';
      modified++;
    } else {
      type = 'unchanged';
      unchanged++;
    }

    entries.push(Object.freeze({
      path,
      type,
      beforeHash: beforeEntry?.sha256,
      afterHash: afterEntry?.sha256,
      beforeSize: beforeEntry?.size,
      afterSize: afterEntry?.size,
    }));
  }

  // Sort entries by path for determinism
  entries.sort((a, b) => a.path.localeCompare(b.path));

  return Object.freeze({
    entries: Object.freeze(entries),
    added,
    removed,
    modified,
    unchanged,
  });
}

// ============================================================
// Diff Filtering
// ============================================================

export function filterDiff(diff: DiffResult, types: readonly DiffType[]): DiffResult {
  const typeSet = new Set(types);
  const filtered = diff.entries.filter(e => typeSet.has(e.type));

  return Object.freeze({
    entries: Object.freeze(filtered),
    added: filtered.filter(e => e.type === 'added').length,
    removed: filtered.filter(e => e.type === 'removed').length,
    modified: filtered.filter(e => e.type === 'modified').length,
    unchanged: filtered.filter(e => e.type === 'unchanged').length,
  });
}

// ============================================================
// Change Detection Helpers
// ============================================================

export function hasChanges(diff: DiffResult): boolean {
  return diff.added > 0 || diff.removed > 0 || diff.modified > 0;
}

export function getChangedPaths(diff: DiffResult): readonly string[] {
  return Object.freeze(
    diff.entries
      .filter(e => e.type !== 'unchanged')
      .map(e => e.path)
      .sort()
  );
}

export function getAddedPaths(diff: DiffResult): readonly string[] {
  return Object.freeze(
    diff.entries
      .filter(e => e.type === 'added')
      .map(e => e.path)
      .sort()
  );
}

export function getRemovedPaths(diff: DiffResult): readonly string[] {
  return Object.freeze(
    diff.entries
      .filter(e => e.type === 'removed')
      .map(e => e.path)
      .sort()
  );
}

export function getModifiedPaths(diff: DiffResult): readonly string[] {
  return Object.freeze(
    diff.entries
      .filter(e => e.type === 'modified')
      .map(e => e.path)
      .sort()
  );
}

// ============================================================
// Summary Generation
// ============================================================

export function summarizeDiff(diff: DiffResult): string {
  const parts: string[] = [];

  if (diff.added > 0) {
    parts.push(`+${diff.added} added`);
  }
  if (diff.removed > 0) {
    parts.push(`-${diff.removed} removed`);
  }
  if (diff.modified > 0) {
    parts.push(`~${diff.modified} modified`);
  }
  if (parts.length === 0) {
    return 'No changes';
  }

  return parts.join(', ');
}
