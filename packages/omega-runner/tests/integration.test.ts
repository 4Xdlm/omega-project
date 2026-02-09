/**
 * OMEGA Runner — Integration Tests
 * Phase D.1 — 12 tests for full E2E pipeline
 */

import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { orchestrateFull } from '../src/orchestrator/runFull.js';
import { createLogger } from '../src/logger/index.js';
import { writeProofPack, type StageArtifact } from '../src/proofpack/write.js';
import { verifyProofPack } from '../src/proofpack/verify.js';
import { canonicalJSON } from '../src/proofpack/canonical.js';
import { hashString } from '../src/proofpack/hash.js';
import { getVersionMap } from '../src/version.js';
import { SAMPLE_INTENT, TEST_SEED, TIMESTAMP } from './fixtures.js';
import type { StageId } from '../src/types.js';
import { buildReportFromManifest } from '../src/orchestrator/runReport.js';

/**
 * Deterministic JSON.stringify with sorted keys and circular reference handling.
 * Used for large/deep objects that may overflow canonicalJSON stack or contain cycles.
 */
function stableStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_, v) => {
    if (v && typeof v === 'object') {
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
      if (!Array.isArray(v)) {
        return Object.keys(v).sort().reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (v as Record<string, unknown>)[k];
          return acc;
        }, {});
      }
    }
    return v;
  });
}

/**
 * Build a full ProofPack on disk: orchestrate, write, return paths.
 */
function buildFullProofPack(outDir: string) {
  const logger = createLogger();
  const result = orchestrateFull(SAMPLE_INTENT, TEST_SEED, TIMESTAMP, logger);

  const intentJson = canonicalJSON(SAMPLE_INTENT);
  const creationJson = stableStringify(result.creation);
  const forgeJson = stableStringify(result.forge);

  const artifacts: StageArtifact[] = [
    { stage: '00-intent' as StageId, filename: 'intent.json', content: intentJson },
    { stage: '10-genesis' as StageId, filename: 'genesis-plan.json', content: stableStringify(result.creation.genesis_plan) },
    { stage: '20-scribe' as StageId, filename: 'scribe-output.json', content: stableStringify(result.creation.scribe_output) },
    { stage: '30-style' as StageId, filename: 'styled-output.json', content: stableStringify(result.creation.style_output) },
    { stage: '40-creation' as StageId, filename: 'creation-result.json', content: creationJson },
    { stage: '50-forge' as StageId, filename: 'forge-report.json', content: forgeJson },
  ];

  const intentHash = hashString(intentJson);
  const finalHash = result.forge.output_hash;
  const verdict = 'PASS';
  const versions = getVersionMap();

  const invariants = Array.from({ length: 12 }, (_, i) => ({
    id: `INV-RUN-${String(i + 1).padStart(2, '0')}`,
    status: 'PASS' as const,
    message: `Invariant ${i + 1} passed`,
  }));

  const { manifest } = writeProofPack(
    outDir,
    result.run_id,
    TEST_SEED,
    versions,
    artifacts,
    intentHash,
    finalHash,
    verdict,
    result.stages_completed,
    '', // reportJson placeholder — will be overwritten
    '', // reportMd placeholder — will be overwritten
    logger.toText(),
    logger,
  );

  // Build and write final reports from manifest
  const { reportJson, reportMd } = buildReportFromManifest(manifest, invariants);
  writeFileSync(join(outDir, 'report.json'), reportJson, 'utf8');
  writeFileSync(join(outDir, 'report.md'), reportMd, 'utf8');

  return { result, manifest, logger };
}

describe('Integration: full pipeline E2E', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'omega-test-'));

  // Build the proofpack once for all read-only tests
  const { result, manifest } = buildFullProofPack(outDir);

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it('orchestrateFull produces result with all 6 stages', () => {
    expect(result.stages_completed).toEqual([
      '00-intent', '10-genesis', '20-scribe', '30-style', '40-creation', '50-forge',
    ]);
    expect(result.stages_completed.length).toBe(6);
  });

  it('ProofPack written to disk', () => {
    expect(existsSync(outDir)).toBe(true);
    expect(existsSync(join(outDir, 'manifest.json'))).toBe(true);
  });

  it('verify ProofPack returns valid=true', () => {
    const verification = verifyProofPack(outDir, false);
    expect(verification.valid).toBe(true);
    expect(verification.run_id).toBe(result.run_id);
  });

  it('manifest.json exists', () => {
    expect(existsSync(join(outDir, 'manifest.json'))).toBe(true);
    const content = readFileSync(join(outDir, 'manifest.json'), 'utf8');
    const parsed = JSON.parse(content);
    expect(parsed.run_id).toBe(result.run_id);
  });

  it('merkle-tree.json exists', () => {
    expect(existsSync(join(outDir, 'merkle-tree.json'))).toBe(true);
    const content = readFileSync(join(outDir, 'merkle-tree.json'), 'utf8');
    const parsed = JSON.parse(content);
    expect(parsed.root_hash).toBeDefined();
    expect(typeof parsed.root_hash).toBe('string');
  });

  it('report.json exists', () => {
    expect(existsSync(join(outDir, 'report.json'))).toBe(true);
  });

  it('report.md exists', () => {
    expect(existsSync(join(outDir, 'report.md'))).toBe(true);
    const content = readFileSync(join(outDir, 'report.md'), 'utf8');
    expect(content).toContain(result.run_id);
  });

  it('all stage directories exist', () => {
    const stages: StageId[] = ['00-intent', '10-genesis', '20-scribe', '30-style', '40-creation', '50-forge'];
    for (const stage of stages) {
      expect(existsSync(join(outDir, stage))).toBe(true);
    }
  });

  it('INV-RUN-12: verify twice returns same result', () => {
    const v1 = verifyProofPack(outDir, false);
    const v2 = verifyProofPack(outDir, false);
    expect(v1.valid).toBe(v2.valid);
    expect(v1.run_id).toBe(v2.run_id);
    expect(v1.manifest_hash).toBe(v2.manifest_hash);
    expect(v1.checks.length).toBe(v2.checks.length);
    for (let i = 0; i < v1.checks.length; i++) {
      expect(v1.checks[i].valid).toBe(v2.checks[i].valid);
      expect(v1.checks[i].actual_hash).toBe(v2.checks[i].actual_hash);
    }
  });

  it('runner.log exists', () => {
    expect(existsSync(join(outDir, 'runner.log'))).toBe(true);
    const content = readFileSync(join(outDir, 'runner.log'), 'utf8');
    expect(content.length).toBeGreaterThan(0);
  });
});

describe('Integration: determinism across full runs', () => {
  const outDirA = mkdtempSync(join(tmpdir(), 'omega-det-a-'));
  const outDirB = mkdtempSync(join(tmpdir(), 'omega-det-b-'));

  const runA = buildFullProofPack(outDirA);
  const runB = buildFullProofPack(outDirB);

  afterAll(() => {
    rmSync(outDirA, { recursive: true, force: true });
    rmSync(outDirB, { recursive: true, force: true });
  });

  it('two full runs produce same RUN_ID', () => {
    expect(runA.result.run_id).toBe(runB.result.run_id);
  });

  it('two full runs produce same manifest hash', () => {
    const hashA = hashString(canonicalJSON(runA.manifest));
    const hashB = hashString(canonicalJSON(runB.manifest));
    expect(hashA).toBe(hashB);
  });
});
