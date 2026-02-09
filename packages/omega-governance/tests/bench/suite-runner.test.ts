import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { readProofPack } from '../../src/core/reader.js';
import { extractBenchResult, extractBenchResults } from '../../src/bench/suite-runner.js';
import { createTempDir, createFixtureRun } from '../fixtures/helpers.js';

describe('Suite Runner', () => {
  let tempDir: string;
  let runDir: string;
  let noForgeDir: string;

  beforeAll(() => {
    tempDir = createTempDir('suite-runner');
    runDir = createFixtureRun(tempDir, { runId: 'bench000000001', forgeScore: 0.85, emotionScore: 0.80, qualityScore: 0.75 });
    noForgeDir = createFixtureRun(tempDir, { runId: 'benchnoforge01', includeForge: false });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('extracts bench result from ProofPack', () => {
    const data = readProofPack(runDir);
    const result = extractBenchResult(data, 'test_intent', 1500);
    expect(result.intent_name).toBe('test_intent');
    expect(result.run_id).toBe('bench000000001');
    expect(result.forge_score).toBe(0.85);
    expect(result.emotion_score).toBe(0.80);
    expect(result.quality_score).toBe(0.75);
    expect(result.duration_ms).toBe(1500);
  });

  it('extracts verdict from manifest', () => {
    const data = readProofPack(runDir);
    const result = extractBenchResult(data, 'test_intent', 1000);
    expect(result.verdict).toBe('PASS');
  });

  it('handles missing forge report', () => {
    const data = readProofPack(noForgeDir);
    const result = extractBenchResult(data, 'test_intent', 1000);
    expect(result.forge_score).toBe(0);
    expect(result.emotion_score).toBe(0);
    expect(result.quality_score).toBe(0);
  });

  it('extracts multiple bench results', () => {
    const data = readProofPack(runDir);
    const results = extractBenchResults([data, data], 'test_intent', [1000, 1500]);
    expect(results).toHaveLength(2);
    expect(results[0].duration_ms).toBe(1000);
    expect(results[1].duration_ms).toBe(1500);
  });

  it('throws when packs and durations length mismatch', () => {
    const data = readProofPack(runDir);
    expect(() => extractBenchResults([data, data], 'test_intent', [1000])).toThrow('same length');
  });

  it('intent_name is preserved in results', () => {
    const data = readProofPack(runDir);
    const result = extractBenchResult(data, 'complex_narrative', 2000);
    expect(result.intent_name).toBe('complex_narrative');
  });

  it('duration is captured correctly', () => {
    const data = readProofPack(runDir);
    const result = extractBenchResult(data, 'test', 42000);
    expect(result.duration_ms).toBe(42000);
  });

  it('multiple results have consistent data', () => {
    const data = readProofPack(runDir);
    const results = extractBenchResults([data, data, data], 'test', [100, 200, 300]);
    for (const r of results) {
      expect(r.forge_score).toBe(0.85);
      expect(r.intent_name).toBe('test');
    }
  });

  it('run_id comes from ProofPack', () => {
    const data = readProofPack(runDir);
    const result = extractBenchResult(data, 'test', 100);
    expect(result.run_id).toBe(data.runId);
  });

  it('scores read from forge report (INV-GOV-08)', () => {
    const data = readProofPack(runDir);
    const result = extractBenchResult(data, 'test', 100);
    expect(result.forge_score).toBe(data.forgeReport!.metrics.composite_score);
    expect(result.emotion_score).toBe(data.forgeReport!.metrics.emotion_score);
  });
});
