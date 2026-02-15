/**
 * Tests for run-id.ts — RUN_ID.json builder
 */

import { describe, it, expect } from 'vitest';
import { generateDeterministicSeed, buildRunIdRecord } from '../../src/runtime/run-id.js';
import type { AnthropicProviderConfig } from '../../src/runtime/live-types.js';
import type { SovereignForgeResult } from '../../src/engine.js';

describe('generateDeterministicSeed', () => {
  it('generates deterministic seed from inputs', () => {
    const seed1 = generateDeterministicSeed('SCENE-001', 'hash1', '/path/run1');
    const seed2 = generateDeterministicSeed('SCENE-001', 'hash1', '/path/run1');

    expect(seed1).toBe(seed2);
    expect(seed1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates different seeds for different inputs', () => {
    const seed1 = generateDeterministicSeed('SCENE-001', 'hash1', '/path/run1');
    const seed2 = generateDeterministicSeed('SCENE-002', 'hash1', '/path/run1');
    const seed3 = generateDeterministicSeed('SCENE-001', 'hash2', '/path/run1');
    const seed4 = generateDeterministicSeed('SCENE-001', 'hash1', '/path/run2');

    expect(seed1).not.toBe(seed2);
    expect(seed1).not.toBe(seed3);
    expect(seed1).not.toBe(seed4);
  });

  it('seed format is 64-char lowercase hex', () => {
    const seed = generateDeterministicSeed('TEST', 'HASH', '/PATH');
    expect(seed).toMatch(/^[a-f0-9]{64}$/);
    expect(seed.length).toBe(64);
  });

  it('determinism — same inputs produce same seed across calls', () => {
    const seeds = [];
    for (let i = 0; i < 5; i++) {
      seeds.push(generateDeterministicSeed('SCN-X', 'h123', '/run'));
    }
    expect(new Set(seeds).size).toBe(1);
  });
});

describe('buildRunIdRecord', () => {
  const mockConfig: AnthropicProviderConfig = {
    apiKey: 'test-key',
    model: 'claude-sonnet-4-20250514',
    judgeStable: true,
    draftTemperature: 0.75,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 4096,
  };

  const mockForgeResult = {
    final_prose: 'Test prose',
    symbol_map: undefined,
    macro_score: null,
    s_score: {
      score_id: 'S-001',
      score_hash: 'hash123',
      scene_id: 'SCN-001',
      seed: 'seed123',
      axes: {} as any,
      composite: 92.5,
      verdict: 'SEAL' as const,
      emotion_weight_pct: 60,
    },
    loop_result: {} as any,
    passes_executed: 1,
    verdict: 'SEAL' as const,
  } as SovereignForgeResult;

  const mockForgeResultV3 = {
    ...mockForgeResult,
    macro_score: {
      score_id: 'MACRO-001',
      score_hash: 'mhash',
      scene_id: 'SCN-001',
      seed: 'seed123',
      macro_axes: {
        ecc: { name: 'ecc', score: 91.5, weight: 0.6, method: 'HYBRID' as const, sub_scores: [], bonuses: [], reasons: { top_contributors: [], top_penalties: [] } },
        rci: { name: 'rci', score: 87.2, weight: 0.15, method: 'CALC' as const, sub_scores: [], bonuses: [], reasons: { top_contributors: [], top_penalties: [] } },
        sii: { name: 'sii', score: 85.0, weight: 0.15, method: 'HYBRID' as const, sub_scores: [], bonuses: [], reasons: { top_contributors: [], top_penalties: [] } },
        ifi: { name: 'ifi', score: 86.3, weight: 0.10, method: 'HYBRID' as const, sub_scores: [], bonuses: [], reasons: { top_contributors: [], top_penalties: [] } },
      },
      composite: 89.8,
      min_axis: 85.0,
      verdict: 'PITCH' as const,
      ecc_score: 91.5,
      emotion_weight_pct: 60,
    },
  } as SovereignForgeResult;

  it('builds valid RunIdRecord', () => {
    const record = buildRunIdRecord(
      0,
      'golden/run_001',
      'output/run_000',
      'SCN-TEST-001',
      mockForgeResult,
      mockConfig,
      'prompt-hash-123',
    );

    expect(record.run_index).toBe(0);
    expect(record.run_path_rel).toBe('golden/run_001');
    expect(record.out_path_rel).toBe('output/run_000');
    expect(record.scene_id).toBe('SCN-TEST-001');
    expect(record.seed_symbol_mapper).toMatch(/^[a-f0-9]{64}$/);
    expect(record.seed_draft).toMatch(/^[a-f0-9]{64}$/);
    expect(record.prompt_sha256).toBe('prompt-hash-123');
    expect(record.language).toBe('fr');
    expect(record.judge_language).toBe('fr');
    expect(record.s_score_composite).toBe(92.5);
    expect(record.s_score_verdict).toBe('SEAL');
  });

  it('judge_config reflects judgeStable=true', () => {
    const record = buildRunIdRecord(
      0,
      'run',
      'out',
      'SCN-001',
      mockForgeResult,
      mockConfig,
      'hash',
    );

    expect(record.judge_config.temperature).toBe(0.0);
    expect(record.judge_config.structured).toBe(true);
    expect(record.judge_config.model).toBe('claude-sonnet-4-20250514');
  });

  it('judge_config reflects judgeStable=false', () => {
    const configUnstable: AnthropicProviderConfig = {
      ...mockConfig,
      judgeStable: false,
    };

    const record = buildRunIdRecord(
      0,
      'run',
      'out',
      'SCN-001',
      mockForgeResult,
      configUnstable,
      'hash',
    );

    expect(record.judge_config.temperature).toBe(0.0);
    expect(record.judge_config.structured).toBe(false);
  });

  it('macro_axes includes ECC/RCI/SII/IFI from V3 score', () => {
    const record = buildRunIdRecord(
      0,
      'run',
      'out',
      'SCN-001',
      mockForgeResultV3,
      mockConfig,
      'hash',
    );

    expect(record.macro_axes.ecc).toBe(91.5);
    expect(record.macro_axes.rci).toBe(87.2);
    expect(record.macro_axes.sii).toBe(85.0);
    expect(record.macro_axes.ifi).toBe(86.3);
    expect(record.macro_axes.composite_v3).toBe(89.8);
    expect(record.macro_axes.min_axis).toBe(85.0);
  });

  it('includes language=fr by default', () => {
    const record = buildRunIdRecord(
      0, 'run', 'out', 'SCN-001',
      mockForgeResult, mockConfig, 'hash',
    );

    expect(record.language).toBe('fr');
    expect(record.judge_language).toBe('fr');
  });

  it('includes engine_version and timestamp', () => {
    const record = buildRunIdRecord(
      0,
      'run',
      'out',
      'SCN-001',
      mockForgeResult,
      mockConfig,
      'hash',
    );

    expect(record.engine_version).toBe('1.0.0');
    expect(record.timestamp_utc).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('defaults language to fr', () => {
    const record = buildRunIdRecord(
      0,
      'run',
      'out',
      'SCN-001',
      mockForgeResult,
      mockConfig,
      'hash',
    );

    expect(record.language).toBe('fr');
    expect(record.judge_language).toBe('fr');
  });

  it('accepts explicit language parameter', () => {
    const record = buildRunIdRecord(
      0,
      'run',
      'out',
      'SCN-001',
      mockForgeResult,
      mockConfig,
      'hash',
      'en',
    );

    expect(record.language).toBe('en');
    expect(record.judge_language).toBe('en');
  });
});
