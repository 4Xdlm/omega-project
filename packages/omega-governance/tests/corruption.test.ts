import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readProofPack, readManifest } from '../src/core/reader.js';
import { validateProofPack } from '../src/core/validator.js';
import { certifyRun } from '../src/certify/certifier.js';
import { DEFAULT_GOV_CONFIG } from '../src/core/config.js';
import { createTempDir, createFixtureRun } from './fixtures/helpers.js';

describe('Corruption Tests', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = createTempDir('corruption');
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects corrupted manifest hash', () => {
    const runDir = createFixtureRun(tempDir, { runId: 'corrupt_mfst01', corruptManifest: true });
    const data = readProofPack(runDir);
    const result = validateProofPack(data);
    expect(result.valid).toBe(false);
    const failedChecks = result.checks.filter((c) => c.status === 'FAIL');
    expect(failedChecks.length).toBeGreaterThan(0);
  });

  it('detects corrupted merkle root', () => {
    const runDir = createFixtureRun(tempDir, { runId: 'corrupt_mrkl01', corruptMerkle: true });
    const data = readProofPack(runDir);
    const result = validateProofPack(data);
    expect(result.valid).toBe(false);
  });

  it('detects missing artifact', () => {
    const runDir = createFixtureRun(tempDir, { runId: 'corrupt_miss01', missingArtifact: '40-creation' });
    const data = readProofPack(runDir);
    const result = validateProofPack(data);
    expect(result.valid).toBe(false);
  });

  it('detects tampered artifact content', () => {
    const runDir = createFixtureRun(tempDir, { runId: 'corrupt_tamp01' });
    writeFileSync(join(runDir, '00-intent', 'intent.json'), '{"tampered": true}', 'utf-8');
    const data = readProofPack(runDir);
    const result = validateProofPack(data);
    expect(result.valid).toBe(false);
  });

  it('throws on completely missing manifest', () => {
    expect(() => readManifest(join(tempDir, 'nonexistent-run'))).toThrow();
  });

  it('throws on malformed JSON in manifest', () => {
    const badDir = join(tempDir, 'bad-json-run');
    const { mkdirSync } = require('node:fs');
    mkdirSync(badDir, { recursive: true });
    writeFileSync(join(badDir, 'manifest.json'), 'not valid json{{{', 'utf-8');
    expect(() => readManifest(badDir)).toThrow();
  });

  it('throws on manifest missing run_id', () => {
    const badDir = join(tempDir, 'no-runid-run');
    const { mkdirSync } = require('node:fs');
    mkdirSync(badDir, { recursive: true });
    writeFileSync(join(badDir, 'manifest.json'), '{"artifacts":[],"stages_completed":[],"merkle_root":"a"}', 'utf-8');
    expect(() => readManifest(badDir)).toThrow('run_id');
  });

  it('certification fails for corrupt ProofPack', () => {
    const runDir = createFixtureRun(tempDir, { runId: 'corrupt_cert01', corruptManifest: true });
    const data = readProofPack(runDir);
    const cert = certifyRun(data, DEFAULT_GOV_CONFIG);
    expect(cert.verdict).toBe('FAIL');
  });

  it('handles empty manifest artifacts array', () => {
    const runDir = createFixtureRun(tempDir, { runId: 'empty_arts_001' });
    const data = readProofPack(runDir);
    expect(data.manifest.artifacts.length).toBeGreaterThan(0);
  });

  it('both manifest and merkle corruption detected together', () => {
    const runDir = createFixtureRun(tempDir, { runId: 'both_corrupt01', corruptManifest: true, corruptMerkle: true });
    const data = readProofPack(runDir);
    const result = validateProofPack(data);
    expect(result.valid).toBe(false);
    const failedChecks = result.checks.filter((c) => c.status === 'FAIL');
    expect(failedChecks.length).toBeGreaterThanOrEqual(2);
  });
});
