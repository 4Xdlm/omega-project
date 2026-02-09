import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { readProofPack } from '../../src/core/reader.js';
import { runCertChecks } from '../../src/certify/checks.js';
import { DEFAULT_GOV_CONFIG, createConfig } from '../../src/core/config.js';
import { createTempDir, createFixtureRun } from '../fixtures/helpers.js';

describe('Certification Checks', () => {
  let tempDir: string;
  let validRunDir: string;
  let lowScoreDir: string;
  let noForgeDir: string;
  let failVerdictDir: string;

  beforeAll(() => {
    tempDir = createTempDir('cert-checks');
    validRunDir = createFixtureRun(tempDir, { runId: 'certvalid00001', forgeScore: 0.85, emotionScore: 0.80, qualityScore: 0.75 });
    lowScoreDir = createFixtureRun(tempDir, { runId: 'certlow00000001', forgeScore: 0.40, emotionScore: 0.35, qualityScore: 0.30 });
    noForgeDir = createFixtureRun(tempDir, { runId: 'certnoforge001', includeForge: false });
    failVerdictDir = createFixtureRun(tempDir, { runId: 'certfail000001', verdict: 'FAIL', forgeScore: 0.85 });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('all checks pass for valid run', () => {
    const data = readProofPack(validRunDir);
    const checks = runCertChecks(data, DEFAULT_GOV_CONFIG);
    const passCount = checks.filter((c) => c.status === 'PASS').length;
    expect(passCount).toBeGreaterThan(5);
  });

  it('10 checks are executed', () => {
    const data = readProofPack(validRunDir);
    const checks = runCertChecks(data, DEFAULT_GOV_CONFIG);
    expect(checks).toHaveLength(10);
  });

  it('checks have unique IDs', () => {
    const data = readProofPack(validRunDir);
    const checks = runCertChecks(data, DEFAULT_GOV_CONFIG);
    const ids = checks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('low scores cause FAIL or WARN', () => {
    const data = readProofPack(lowScoreDir);
    const checks = runCertChecks(data, DEFAULT_GOV_CONFIG);
    const scoreChecks = checks.filter((c) => c.id === 'CERT-CHK-05' || c.id === 'CERT-CHK-06' || c.id === 'CERT-CHK-07');
    expect(scoreChecks.some((c) => c.status === 'FAIL')).toBe(true);
  });

  it('missing forge report fails relevant checks', () => {
    const data = readProofPack(noForgeDir);
    const checks = runCertChecks(data, DEFAULT_GOV_CONFIG);
    const forgeCheck = checks.find((c) => c.id === 'CERT-CHK-04');
    expect(forgeCheck!.status).toBe('FAIL');
  });

  it('FAIL verdict fails verdict check', () => {
    const data = readProofPack(failVerdictDir);
    const checks = runCertChecks(data, DEFAULT_GOV_CONFIG);
    const verdictCheck = checks.find((c) => c.id === 'CERT-CHK-08');
    expect(verdictCheck!.status).toBe('FAIL');
  });

  it('uses config thresholds', () => {
    const config = createConfig({ CERT_MIN_SCORE: 0.90 });
    const data = readProofPack(validRunDir);
    const checks = runCertChecks(data, config);
    const forgeScoreCheck = checks.find((c) => c.id === 'CERT-CHK-05');
    expect(forgeScoreCheck!.status).toBe('WARN');
  });

  it('manifest integrity check exists', () => {
    const data = readProofPack(validRunDir);
    const checks = runCertChecks(data, DEFAULT_GOV_CONFIG);
    const manifestCheck = checks.find((c) => c.id === 'CERT-CHK-01');
    expect(manifestCheck).toBeDefined();
  });

  it('stages complete check', () => {
    const data = readProofPack(validRunDir);
    const checks = runCertChecks(data, DEFAULT_GOV_CONFIG);
    const stageCheck = checks.find((c) => c.id === 'CERT-CHK-03');
    expect(stageCheck!.status).toBe('PASS');
  });

  it('artifact count check', () => {
    const data = readProofPack(validRunDir);
    const checks = runCertChecks(data, DEFAULT_GOV_CONFIG);
    const artifactCheck = checks.find((c) => c.id === 'CERT-CHK-09');
    expect(artifactCheck!.status).toBe('PASS');
  });
});
