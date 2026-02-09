import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { readProofPack } from '../../src/core/reader.js';
import { compareRuns, compareMultipleRuns } from '../../src/compare/run-differ.js';
import { createTempDir, createFixtureRun } from '../fixtures/helpers.js';

describe('Run Differ', () => {
  let tempDir: string;
  let runDirA: string;
  let runDirB: string;
  let identicalDir: string;

  beforeAll(() => {
    tempDir = createTempDir('run-differ');
    runDirA = createFixtureRun(tempDir, { runId: 'runA0000000001', forgeScore: 0.85 });
    runDirB = createFixtureRun(tempDir, { runId: 'runB0000000001', forgeScore: 0.70 });
    // For identical comparison, create in a subdirectory with the same runId
    const subDir = createTempDir('run-differ-identical');
    identicalDir = createFixtureRun(subDir, { runId: 'runA0000000001', forgeScore: 0.85 });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('compares two identical runs as identical', () => {
    const a = readProofPack(runDirA);
    const b = readProofPack(identicalDir);
    const result = compareRuns(a, b);
    expect(result.identical).toBe(true);
    expect(result.summary.different).toBe(0);
  });

  it('compares two different runs as non-identical', () => {
    const a = readProofPack(runDirA);
    const b = readProofPack(runDirB);
    const result = compareRuns(a, b);
    expect(result.identical).toBe(false);
  });

  it('includes run IDs', () => {
    const a = readProofPack(runDirA);
    const b = readProofPack(runDirB);
    const result = compareRuns(a, b);
    expect(result.runs).toContain(a.runId);
    expect(result.runs).toContain(b.runId);
  });

  it('summary counts are correct', () => {
    const a = readProofPack(runDirA);
    const b = readProofPack(runDirB);
    const result = compareRuns(a, b);
    expect(result.summary.total_artifacts).toBeGreaterThan(0);
    expect(result.summary.identical + result.summary.different + result.summary.missing_in_first + result.summary.missing_in_second).toBe(result.summary.total_artifacts);
  });

  it('diffs array is populated', () => {
    const a = readProofPack(runDirA);
    const b = readProofPack(runDirB);
    const result = compareRuns(a, b);
    expect(result.diffs.length).toBeGreaterThan(0);
  });

  it('includes score comparison when forge reports exist', () => {
    const a = readProofPack(runDirA);
    const b = readProofPack(runDirB);
    const result = compareRuns(a, b);
    expect(result.score_comparison).not.toBeNull();
    expect(result.score_comparison!.forge_score_delta).toBeCloseTo(-0.15, 4);
  });

  it('compareMultipleRuns returns N-1 results', () => {
    const a = readProofPack(runDirA);
    const b = readProofPack(runDirB);
    const c = readProofPack(identicalDir);
    const results = compareMultipleRuns([a, b, c]);
    expect(results).toHaveLength(2);
  });

  it('compareMultipleRuns throws with < 2 runs', () => {
    const a = readProofPack(runDirA);
    expect(() => compareMultipleRuns([a])).toThrow('At least 2 runs');
  });

  it('score comparison is null when no forge report', () => {
    const noForgeDir = createFixtureRun(tempDir, { runId: 'noforge000001a', includeForge: false });
    const a = readProofPack(noForgeDir);
    const b = readProofPack(runDirB);
    const result = compareRuns(a, b);
    expect(result.score_comparison).toBeNull();
  });

  it('INV-GOV-03: compare is symmetric (IDENTICAL/DIFFERENT preserved)', () => {
    const a = readProofPack(runDirA);
    const b = readProofPack(runDirB);
    const ab = compareRuns(a, b);
    const ba = compareRuns(b, a);
    expect(ab.identical).toBe(ba.identical);
    expect(ab.summary.different).toBe(ba.summary.different);
  });

  it('INV-GOV-03: MISSING_LEFT/MISSING_RIGHT are inverted', () => {
    const missingDir = createFixtureRun(tempDir, { runId: 'missingart001a', missingArtifact: '50-forge' });
    const a = readProofPack(runDirA);
    const b = readProofPack(missingDir);
    const ab = compareRuns(a, b);
    const ba = compareRuns(b, a);
    const abMissingRight = ab.diffs.filter((d) => d.status === 'MISSING_RIGHT').length;
    const baMissingLeft = ba.diffs.filter((d) => d.status === 'MISSING_LEFT').length;
    expect(abMissingRight).toBe(baMissingLeft);
  });

  it('identical runs have all diffs as IDENTICAL', () => {
    const a = readProofPack(runDirA);
    const b = readProofPack(identicalDir);
    const result = compareRuns(a, b);
    for (const diff of result.diffs) {
      expect(diff.status).toBe('IDENTICAL');
    }
  });
});
