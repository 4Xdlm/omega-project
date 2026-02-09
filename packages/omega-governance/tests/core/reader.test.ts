import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { readManifest, readManifestHash, readMerkleTree, readForgeReport, readProofPack, readArtifact, collectFileStats } from '../../src/core/reader.js';
import { createTempDir, createFixtureRun } from '../fixtures/helpers.js';

describe('ProofPack Reader', () => {
  let tempDir: string;
  let runDir: string;

  beforeAll(() => {
    tempDir = createTempDir('reader');
    runDir = createFixtureRun(tempDir);
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads manifest.json', () => {
    const manifest = readManifest(runDir);
    expect(manifest.run_id).toBe('abcdef0123456789');
    expect(manifest.stages_completed).toContain('00-intent');
    expect(manifest.stages_completed).toContain('50-forge');
  });

  it('reads manifest.sha256', () => {
    const hash = readManifestHash(runDir);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('reads merkle-tree.json', () => {
    const tree = readMerkleTree(runDir);
    expect(tree.root_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(tree.leaf_count).toBeGreaterThan(0);
    expect(tree.leaves.length).toBe(tree.leaf_count);
  });

  it('reads forge-report.json', () => {
    const report = readForgeReport(runDir);
    expect(report).not.toBeNull();
    expect(report!.metrics.composite_score).toBe(0.85);
  });

  it('returns null for missing forge report', () => {
    const noForgeDir = createFixtureRun(tempDir, { runId: 'noforge00000001', includeForge: false });
    const report = readForgeReport(noForgeDir);
    expect(report).toBeNull();
  });

  it('reads complete ProofPack', () => {
    const data = readProofPack(runDir);
    expect(data.runId).toBe('abcdef0123456789');
    expect(data.manifest).toBeDefined();
    expect(data.merkleTree).toBeDefined();
    expect(data.forgeReport).not.toBeNull();
  });

  it('reads artifact content', () => {
    const content = readArtifact(runDir, '00-intent/intent.json');
    const parsed = JSON.parse(content);
    expect(parsed.title).toBe('Test Story');
  });

  it('collects file stats', () => {
    const stats = collectFileStats(runDir);
    expect(stats.size).toBeGreaterThan(0);
    for (const [, stat] of stats) {
      expect(stat.mtime).toBeGreaterThan(0);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  it('throws on invalid manifest', () => {
    expect(() => readManifest('/nonexistent/path')).toThrow();
  });

  it('throws on invalid manifest hash format', () => {
    const badDir = createFixtureRun(tempDir, { runId: 'badhash000001', corruptManifest: true });
    const hash = readManifestHash(badDir);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
