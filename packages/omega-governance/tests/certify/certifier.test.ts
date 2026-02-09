import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { readProofPack } from '../../src/core/reader.js';
import { certifyRun } from '../../src/certify/certifier.js';
import { certificateToJSON, certificateToMarkdown } from '../../src/certify/template.js';
import { DEFAULT_GOV_CONFIG, createConfig } from '../../src/core/config.js';
import { createTempDir, createFixtureRun } from '../fixtures/helpers.js';

describe('Certifier', () => {
  let tempDir: string;
  let validRunDir: string;
  let lowScoreDir: string;

  beforeAll(() => {
    tempDir = createTempDir('certifier');
    validRunDir = createFixtureRun(tempDir, { runId: 'certify00000001', forgeScore: 0.85, emotionScore: 0.80, qualityScore: 0.75 });
    lowScoreDir = createFixtureRun(tempDir, { runId: 'certifylow00001', forgeScore: 0.40, emotionScore: 0.35, qualityScore: 0.30 });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('certifies valid run as PASS', () => {
    const data = readProofPack(validRunDir);
    const cert = certifyRun(data, DEFAULT_GOV_CONFIG);
    expect(cert.verdict).toBe('PASS');
  });

  it('certifies low-score run as FAIL', () => {
    const data = readProofPack(lowScoreDir);
    const cert = certifyRun(data, DEFAULT_GOV_CONFIG);
    expect(cert.verdict).toBe('FAIL');
  });

  it('INV-GOV-06: certificate is stable (deterministic)', () => {
    const data = readProofPack(validRunDir);
    const cert1 = certifyRun(data, DEFAULT_GOV_CONFIG);
    const cert2 = certifyRun(data, DEFAULT_GOV_CONFIG);
    expect(cert1.signature).toBe(cert2.signature);
  });

  it('includes run_id', () => {
    const data = readProofPack(validRunDir);
    const cert = certifyRun(data, DEFAULT_GOV_CONFIG);
    expect(cert.run_id).toBe('certify00000001');
  });

  it('includes scores from ProofPack', () => {
    const data = readProofPack(validRunDir);
    const cert = certifyRun(data, DEFAULT_GOV_CONFIG);
    expect(cert.scores.forge_score).toBe(0.85);
    expect(cert.scores.emotion_score).toBe(0.80);
    expect(cert.scores.quality_score).toBe(0.75);
  });

  it('includes config for traceability', () => {
    const data = readProofPack(validRunDir);
    const cert = certifyRun(data, DEFAULT_GOV_CONFIG);
    expect(cert.config).toEqual(DEFAULT_GOV_CONFIG);
  });

  it('certificateToJSON produces valid JSON', () => {
    const data = readProofPack(validRunDir);
    const cert = certifyRun(data, DEFAULT_GOV_CONFIG);
    const json = certificateToJSON(cert);
    const parsed = JSON.parse(json);
    expect(parsed.run_id).toBe('certify00000001');
  });

  it('certificateToMarkdown produces markdown', () => {
    const data = readProofPack(validRunDir);
    const cert = certifyRun(data, DEFAULT_GOV_CONFIG);
    const md = certificateToMarkdown(cert);
    expect(md).toContain('# OMEGA Governance');
    expect(md).toContain(cert.run_id);
    expect(md).toContain(cert.verdict);
  });
});
