import { describe, it, expect } from 'vitest';
import { diffArtifacts, countDiffsByStatus } from '../../src/compare/artifact-differ.js';
import type { ArtifactEntry } from '../../src/core/types.js';

const makeArtifact = (path: string, hash: string): ArtifactEntry => ({
  stage: '00-intent' as const,
  filename: path.split('/').pop()!,
  path,
  sha256: hash,
  size: 100,
});

describe('Artifact Differ', () => {
  it('returns empty diffs for identical artifacts', () => {
    const left = [makeArtifact('a.json', 'aaa')];
    const right = [makeArtifact('a.json', 'aaa')];
    const diffs = diffArtifacts(left, right);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe('IDENTICAL');
  });

  it('detects DIFFERENT artifacts', () => {
    const left = [makeArtifact('a.json', 'aaa')];
    const right = [makeArtifact('a.json', 'bbb')];
    const diffs = diffArtifacts(left, right);
    expect(diffs[0].status).toBe('DIFFERENT');
    expect(diffs[0].hash_left).toBe('aaa');
    expect(diffs[0].hash_right).toBe('bbb');
  });

  it('detects MISSING_RIGHT', () => {
    const left = [makeArtifact('a.json', 'aaa')];
    const right: ArtifactEntry[] = [];
    const diffs = diffArtifacts(left, right);
    expect(diffs[0].status).toBe('MISSING_RIGHT');
  });

  it('detects MISSING_LEFT', () => {
    const left: ArtifactEntry[] = [];
    const right = [makeArtifact('a.json', 'aaa')];
    const diffs = diffArtifacts(left, right);
    expect(diffs[0].status).toBe('MISSING_LEFT');
  });

  it('handles mixed diffs', () => {
    const left = [makeArtifact('a.json', 'aaa'), makeArtifact('b.json', 'bbb'), makeArtifact('c.json', 'ccc')];
    const right = [makeArtifact('a.json', 'aaa'), makeArtifact('b.json', 'xxx'), makeArtifact('d.json', 'ddd')];
    const diffs = diffArtifacts(left, right);
    expect(diffs).toHaveLength(4);
    const counts = countDiffsByStatus(diffs);
    expect(counts.IDENTICAL).toBe(1);
    expect(counts.DIFFERENT).toBe(1);
    expect(counts.MISSING_RIGHT).toBe(1);
    expect(counts.MISSING_LEFT).toBe(1);
  });

  it('sorts diffs by path', () => {
    const left = [makeArtifact('z.json', 'z'), makeArtifact('a.json', 'a')];
    const right = [makeArtifact('z.json', 'z'), makeArtifact('a.json', 'a')];
    const diffs = diffArtifacts(left, right);
    expect(diffs[0].path).toBe('a.json');
    expect(diffs[1].path).toBe('z.json');
  });

  it('empty left and right yields no diffs', () => {
    const diffs = diffArtifacts([], []);
    expect(diffs).toHaveLength(0);
  });

  it('countDiffsByStatus works correctly', () => {
    const diffs = [
      { path: 'a', status: 'IDENTICAL' as const },
      { path: 'b', status: 'IDENTICAL' as const },
      { path: 'c', status: 'DIFFERENT' as const },
    ];
    const counts = countDiffsByStatus(diffs);
    expect(counts.IDENTICAL).toBe(2);
    expect(counts.DIFFERENT).toBe(1);
    expect(counts.MISSING_LEFT).toBe(0);
  });

  it('handles duplicate paths gracefully', () => {
    const left = [makeArtifact('a.json', 'aaa')];
    const right = [makeArtifact('a.json', 'aaa')];
    const diffs = diffArtifacts(left, right);
    expect(diffs).toHaveLength(1);
  });

  it('preserves hash values in diff', () => {
    const left = [makeArtifact('x.json', 'hash_left_val')];
    const right = [makeArtifact('x.json', 'hash_right_val')];
    const diffs = diffArtifacts(left, right);
    expect(diffs[0].hash_left).toBe('hash_left_val');
    expect(diffs[0].hash_right).toBe('hash_right_val');
  });
});
