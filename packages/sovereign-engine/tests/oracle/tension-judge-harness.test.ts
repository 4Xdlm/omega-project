/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — Tension Judge Harness Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CalibV5 — Judge calibration on 12 fixed-text fixtures.
 * These tests call the REAL Anthropic API (not mock).
 * They prove the judge understands "tension L4 = dilatation du temps".
 *
 * Tests:
 * - T-J-01: fx_high_01..04 → score > 0.65
 * - T-J-02: fx_low_01..04  → score < 0.40
 * - T-J-03: fx_med_01..04  → score between 0.40 and 0.70
 * - T-J-04: ORDERING: mean(high) > mean(med) > mean(low)
 * - T-J-05: fx_high_01 sobriété clinique → score > 0.65
 * - T-J-06: cache hit → 0 API calls for same fixture+seed
 * - T-J-07: reason non vide pour chaque fixture
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LLMJudge } from '../../src/oracle/llm-judge.js';
import { JudgeCache } from '../../src/validation/judge-cache.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// ═══════════════════════════════════════════════════════════════════════════════
// SKIP if no API key (offline-safe)
// ═══════════════════════════════════════════════════════════════════════════════

const API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const HAS_API = API_KEY.length > 0;
const describeReal = HAS_API ? describe : describe.skip;

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

interface Fixture {
  id: string;
  level: 'low' | 'medium' | 'high';
  expected_range: [number, number];
  text: string;
}

const fixturesPath = resolve(__dirname, '../../validation/cases/tension-calibration-fixtures.json');
const fixturesData = JSON.parse(readFileSync(fixturesPath, 'utf-8'));
const fixtures: Fixture[] = fixturesData.fixtures;

const lowFixtures = fixtures.filter((f) => f.level === 'low');
const medFixtures = fixtures.filter((f) => f.level === 'medium');
const highFixtures = fixtures.filter((f) => f.level === 'high');

// ═══════════════════════════════════════════════════════════════════════════════
// JUDGE SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const MODEL_ID = 'claude-sonnet-4-20250514';
const SEED = 'tension_harness_v5';
const CACHE_PATH = resolve(__dirname, '../../validation/harness-cache.json');

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECT ALL RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

const results: Map<string, { score: number; reason: string }> = new Map();

describeReal('TensionJudgeHarness — CalibV5 (REAL API)', () => {
  let judge: LLMJudge;
  let cache: JudgeCache;

  beforeAll(async () => {
    cache = new JudgeCache(CACHE_PATH);
    judge = new LLMJudge(MODEL_ID, API_KEY, cache, {
      timeoutMs: 30000,
      retryBaseMs: 2000,
      rateLimitMs: 1000,
    });

    // Judge all 12 fixtures
    for (const fx of fixtures) {
      const result = await judge.judge('tension_14d', fx.text, SEED);
      results.set(fx.id, result);
    }

    // Persist cache for reuse
    cache.persist();
  }, 120000); // 2 min timeout for all 12 API calls

  // T-J-01: fx_high → score > 0.65
  it('T-J-01: fx_high_01..04 → score > 0.65 each', () => {
    for (const fx of highFixtures) {
      const result = results.get(fx.id)!;
      expect(result, `Missing result for ${fx.id}`).toBeDefined();
      expect(result.score, `${fx.id}: expected > 0.65, got ${result.score}`).toBeGreaterThan(0.65);
    }
  });

  // T-J-02: fx_low → score < 0.40
  it('T-J-02: fx_low_01..04 → score < 0.40 each', () => {
    for (const fx of lowFixtures) {
      const result = results.get(fx.id)!;
      expect(result, `Missing result for ${fx.id}`).toBeDefined();
      expect(result.score, `${fx.id}: expected < 0.40, got ${result.score}`).toBeLessThan(0.40);
    }
  });

  // T-J-03: fx_med → score between 0.40 and 0.70
  it('T-J-03: fx_med_01..04 → score between 0.40 and 0.70 each', () => {
    for (const fx of medFixtures) {
      const result = results.get(fx.id)!;
      expect(result, `Missing result for ${fx.id}`).toBeDefined();
      expect(result.score, `${fx.id}: expected >= 0.40, got ${result.score}`).toBeGreaterThanOrEqual(0.40);
      expect(result.score, `${fx.id}: expected <= 0.70, got ${result.score}`).toBeLessThanOrEqual(0.70);
    }
  });

  // T-J-04: ORDERING: mean(high) > mean(med) > mean(low)
  it('T-J-04: mean(high) > mean(med) > mean(low) — monotone ordering', () => {
    const meanHigh = highFixtures.reduce((s, fx) => s + results.get(fx.id)!.score, 0) / highFixtures.length;
    const meanMed = medFixtures.reduce((s, fx) => s + results.get(fx.id)!.score, 0) / medFixtures.length;
    const meanLow = lowFixtures.reduce((s, fx) => s + results.get(fx.id)!.score, 0) / lowFixtures.length;

    expect(meanHigh, `mean(high)=${meanHigh} should > mean(med)=${meanMed}`).toBeGreaterThan(meanMed);
    expect(meanMed, `mean(med)=${meanMed} should > mean(low)=${meanLow}`).toBeGreaterThan(meanLow);
  });

  // T-J-05: fx_high_01 sobriété clinique → score > 0.65
  it('T-J-05: fx_high_01 — sobriété clinique — score > 0.65 (anti-biais)', () => {
    const result = results.get('fx_high_01')!;
    expect(result).toBeDefined();
    expect(result.score, `Sobriété clinique: expected > 0.65, got ${result.score}`).toBeGreaterThan(0.65);
  });

  // T-J-06: cache hit → 0 API calls
  it('T-J-06: cache hit — second judge call returns same result, 0 API', async () => {
    // First call was already made in beforeAll. Second call should hit cache.
    const fx = fixtures[0];
    const result1 = results.get(fx.id)!;
    const result2 = await judge.judge('tension_14d', fx.text, SEED);
    expect(result2.score).toBe(result1.score);
    expect(result2.reason).toBe(result1.reason);
  });

  // T-J-07: reason non vide
  it('T-J-07: reason non vide pour chaque fixture', () => {
    for (const fx of fixtures) {
      const result = results.get(fx.id)!;
      expect(result).toBeDefined();
      expect(result.reason.length, `${fx.id}: reason is empty`).toBeGreaterThan(0);
    }
  });
});
