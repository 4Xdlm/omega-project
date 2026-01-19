/**
 * Diff Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import type { Manifest } from '../src/types.js';
import {
  diffManifests,
  filterDiff,
  hasChanges,
  getChangedPaths,
  getAddedPaths,
  getRemovedPaths,
  getModifiedPaths,
  summarizeDiff,
} from '../src/diff.js';
import { ProofDiffInvalidInputError } from '../src/errors.js';

describe('Diff', () => {
  const createManifest = (entries: { path: string; sha256: string; size: number }[]): Manifest => ({
    version: '1.0.0',
    timestamp: 1000,
    entries: entries.map(e => Object.freeze(e)),
  });

  describe('diffManifests', () => {
    it('detects no changes', () => {
      const before = createManifest([
        { path: '/a.txt', sha256: 'abc123', size: 100 },
      ]);
      const after = createManifest([
        { path: '/a.txt', sha256: 'abc123', size: 100 },
      ]);

      const diff = diffManifests(before, after);

      expect(diff.added).toBe(0);
      expect(diff.removed).toBe(0);
      expect(diff.modified).toBe(0);
      expect(diff.unchanged).toBe(1);
    });

    it('detects added files', () => {
      const before = createManifest([
        { path: '/a.txt', sha256: 'abc', size: 100 },
      ]);
      const after = createManifest([
        { path: '/a.txt', sha256: 'abc', size: 100 },
        { path: '/b.txt', sha256: 'def', size: 200 },
      ]);

      const diff = diffManifests(before, after);

      expect(diff.added).toBe(1);
      expect(diff.entries.find(e => e.path === '/b.txt')?.type).toBe('added');
    });

    it('detects removed files', () => {
      const before = createManifest([
        { path: '/a.txt', sha256: 'abc', size: 100 },
        { path: '/b.txt', sha256: 'def', size: 200 },
      ]);
      const after = createManifest([
        { path: '/a.txt', sha256: 'abc', size: 100 },
      ]);

      const diff = diffManifests(before, after);

      expect(diff.removed).toBe(1);
      expect(diff.entries.find(e => e.path === '/b.txt')?.type).toBe('removed');
    });

    it('detects modified files', () => {
      const before = createManifest([
        { path: '/a.txt', sha256: 'abc', size: 100 },
      ]);
      const after = createManifest([
        { path: '/a.txt', sha256: 'xyz', size: 150 },
      ]);

      const diff = diffManifests(before, after);

      expect(diff.modified).toBe(1);
      const entry = diff.entries.find(e => e.path === '/a.txt');
      expect(entry?.type).toBe('modified');
      expect(entry?.beforeHash).toBe('abc');
      expect(entry?.afterHash).toBe('xyz');
    });

    it('sorts entries by path', () => {
      const before = createManifest([
        { path: '/c.txt', sha256: 'c', size: 1 },
        { path: '/a.txt', sha256: 'a', size: 1 },
      ]);
      const after = createManifest([
        { path: '/b.txt', sha256: 'b', size: 1 },
        { path: '/c.txt', sha256: 'c', size: 1 },
      ]);

      const diff = diffManifests(before, after);

      expect(diff.entries[0]?.path).toBe('/a.txt');
      expect(diff.entries[1]?.path).toBe('/b.txt');
      expect(diff.entries[2]?.path).toBe('/c.txt');
    });

    it('throws on null input', () => {
      expect(() => diffManifests(null as unknown as Manifest, createManifest([]))).toThrow(
        ProofDiffInvalidInputError
      );
    });
  });

  describe('filterDiff', () => {
    it('filters by type', () => {
      const before = createManifest([
        { path: '/a.txt', sha256: 'a', size: 1 },
        { path: '/b.txt', sha256: 'b', size: 1 },
      ]);
      const after = createManifest([
        { path: '/a.txt', sha256: 'modified', size: 1 },
        { path: '/c.txt', sha256: 'c', size: 1 },
      ]);

      const diff = diffManifests(before, after);
      const filtered = filterDiff(diff, ['added', 'modified']);

      expect(filtered.entries.length).toBe(2);
      expect(filtered.added).toBe(1);
      expect(filtered.modified).toBe(1);
      expect(filtered.removed).toBe(0);
    });
  });

  describe('hasChanges', () => {
    it('returns false for no changes', () => {
      const manifest = createManifest([{ path: '/a.txt', sha256: 'a', size: 1 }]);
      const diff = diffManifests(manifest, manifest);

      expect(hasChanges(diff)).toBe(false);
    });

    it('returns true for added files', () => {
      const before = createManifest([]);
      const after = createManifest([{ path: '/a.txt', sha256: 'a', size: 1 }]);

      expect(hasChanges(diffManifests(before, after))).toBe(true);
    });
  });

  describe('path getters', () => {
    const before = createManifest([
      { path: '/unchanged.txt', sha256: 'same', size: 1 },
      { path: '/modified.txt', sha256: 'old', size: 1 },
      { path: '/removed.txt', sha256: 'gone', size: 1 },
    ]);
    const after = createManifest([
      { path: '/unchanged.txt', sha256: 'same', size: 1 },
      { path: '/modified.txt', sha256: 'new', size: 1 },
      { path: '/added.txt', sha256: 'new', size: 1 },
    ]);
    const diff = diffManifests(before, after);

    it('getChangedPaths returns all changed paths', () => {
      const paths = getChangedPaths(diff);
      expect(paths).toContain('/added.txt');
      expect(paths).toContain('/modified.txt');
      expect(paths).toContain('/removed.txt');
      expect(paths).not.toContain('/unchanged.txt');
    });

    it('getAddedPaths returns only added', () => {
      expect(getAddedPaths(diff)).toEqual(['/added.txt']);
    });

    it('getRemovedPaths returns only removed', () => {
      expect(getRemovedPaths(diff)).toEqual(['/removed.txt']);
    });

    it('getModifiedPaths returns only modified', () => {
      expect(getModifiedPaths(diff)).toEqual(['/modified.txt']);
    });
  });

  describe('summarizeDiff', () => {
    it('returns "No changes" for empty diff', () => {
      const manifest = createManifest([{ path: '/a.txt', sha256: 'a', size: 1 }]);
      const diff = diffManifests(manifest, manifest);

      expect(summarizeDiff(diff)).toBe('No changes');
    });

    it('summarizes all change types', () => {
      const before = createManifest([
        { path: '/mod.txt', sha256: 'old', size: 1 },
        { path: '/del.txt', sha256: 'gone', size: 1 },
      ]);
      const after = createManifest([
        { path: '/mod.txt', sha256: 'new', size: 1 },
        { path: '/add.txt', sha256: 'new', size: 1 },
      ]);

      const summary = summarizeDiff(diffManifests(before, after));

      expect(summary).toContain('+1 added');
      expect(summary).toContain('-1 removed');
      expect(summary).toContain('~1 modified');
    });
  });
});
