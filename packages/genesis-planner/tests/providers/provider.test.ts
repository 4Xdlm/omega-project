/**
 * OMEGA Genesis Planner — Provider Tests
 * Phase P.1-LLM — Mock, Factory, Cache, LLM structure, Integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalize, sha256 } from '@omega/canon-kernel';
import { createMockProvider } from '../../src/providers/mock-provider.js';
import { createCacheProvider } from '../../src/providers/cache-provider.js';
import { createLlmProvider, stripMarkdownFences } from '../../src/providers/llm-provider.js';
import { createProvider } from '../../src/providers/factory.js';
import type { ProviderContext, ProviderResponse } from '../../src/providers/types.js';
import { createGenesisPlan } from '../../src/planner.js';
import { createDefaultConfig } from '../../src/config.js';
import {
  TIMESTAMP,
  SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
  SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
  SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS,
  SCENARIO_B_GENOME, SCENARIO_B_EMOTION,
} from '../fixtures.js';

const config = createDefaultConfig();

const TEST_CONTEXT: ProviderContext = {
  intentHash: sha256(canonicalize(SCENARIO_A_INTENT)),
  seed: 'test-seed-001',
  step: 'arcs',
};

// ═══════════════════════ GROUP 1 — MOCK PROVIDER ═══════════════════════

describe('Mock Provider', () => {
  it('should return valid arcs', () => {
    const mock = createMockProvider();
    const prompt = JSON.stringify({
      intent: SCENARIO_A_INTENT,
      canon: SCENARIO_A_CANON,
      constraints: SCENARIO_A_CONSTRAINTS,
    });
    const response = mock.generateArcs(prompt, TEST_CONTEXT);
    expect(response.mode).toBe('mock');
    expect(response.cached).toBe(false);
    expect(response.contentHash).toBe(sha256(response.content));
    const arcs = JSON.parse(response.content);
    expect(Array.isArray(arcs)).toBe(true);
    expect(arcs.length).toBeGreaterThan(0);
    expect(arcs[0].arc_id).toBeTruthy();
  });

  it('should be deterministic (same input → same hash)', () => {
    const mock = createMockProvider();
    const prompt = JSON.stringify({
      intent: SCENARIO_A_INTENT,
      canon: SCENARIO_A_CANON,
      constraints: SCENARIO_A_CONSTRAINTS,
    });
    const hashes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const response = mock.generateArcs(prompt, TEST_CONTEXT);
      hashes.push(response.contentHash);
    }
    const allSame = hashes.every((h) => h === hashes[0]);
    expect(allSame).toBe(true);
  });

  it('should return mode=mock', () => {
    const mock = createMockProvider();
    expect(mock.mode).toBe('mock');
  });

  it('should return model=mock-deterministic', () => {
    const mock = createMockProvider();
    const prompt = JSON.stringify({
      intent: SCENARIO_A_INTENT,
      canon: SCENARIO_A_CANON,
      constraints: SCENARIO_A_CONSTRAINTS,
    });
    const response = mock.generateArcs(prompt, TEST_CONTEXT);
    expect(response.model).toBe('mock-deterministic');
  });

  it('should return valid scenes from enrichScenes', () => {
    const mock = createMockProvider();
    const arcPrompt = JSON.stringify({
      intent: SCENARIO_A_INTENT,
      canon: SCENARIO_A_CANON,
      constraints: SCENARIO_A_CONSTRAINTS,
    });
    const arcResponse = mock.generateArcs(arcPrompt, TEST_CONTEXT);
    const arcs = JSON.parse(arcResponse.content);

    const scenePrompt = JSON.stringify({
      arc: arcs[0],
      arcIndex: 0,
      totalArcs: arcs.length,
      canon: SCENARIO_A_CANON,
      constraints: SCENARIO_A_CONSTRAINTS,
      emotionTarget: SCENARIO_A_EMOTION,
    });
    const sceneResponse = mock.enrichScenes(scenePrompt, { ...TEST_CONTEXT, step: 'scenes' });
    const scenes = JSON.parse(sceneResponse.content);
    expect(Array.isArray(scenes)).toBe(true);
    expect(scenes.length).toBeGreaterThan(0);
    expect(scenes[0].scene_id).toBeTruthy();
  });

  it('should return valid beats from detailBeats', () => {
    const mock = createMockProvider();
    const arcPrompt = JSON.stringify({
      intent: SCENARIO_A_INTENT,
      canon: SCENARIO_A_CANON,
      constraints: SCENARIO_A_CONSTRAINTS,
    });
    const arcResponse = mock.generateArcs(arcPrompt, TEST_CONTEXT);
    const arcs = JSON.parse(arcResponse.content);

    const scenePrompt = JSON.stringify({
      arc: arcs[0],
      arcIndex: 0,
      totalArcs: arcs.length,
      canon: SCENARIO_A_CANON,
      constraints: SCENARIO_A_CONSTRAINTS,
      emotionTarget: SCENARIO_A_EMOTION,
    });
    const sceneResponse = mock.enrichScenes(scenePrompt, { ...TEST_CONTEXT, step: 'scenes' });
    const scenes = JSON.parse(sceneResponse.content);

    const beatPrompt = JSON.stringify({
      scene: scenes[0],
      sceneIndex: 0,
      config,
    });
    const beatResponse = mock.detailBeats(beatPrompt, { ...TEST_CONTEXT, step: 'beats' });
    const beats = JSON.parse(beatResponse.content);
    expect(Array.isArray(beats)).toBe(true);
    expect(beats.length).toBeGreaterThan(0);
    expect(beats[0].beat_id).toBeTruthy();
  });
});

// ═══════════════════════ GROUP 2 — FACTORY ═══════════════════════

describe('Provider Factory', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('should return mock provider by default', () => {
    delete process.env.OMEGA_PROVIDER_MODE;
    const provider = createProvider();
    expect(provider.mode).toBe('mock');
  });

  it('should respect OMEGA_PROVIDER_MODE=mock env var', () => {
    process.env.OMEGA_PROVIDER_MODE = 'mock';
    const provider = createProvider();
    expect(provider.mode).toBe('mock');
  });

  it('should respect config.mode override', () => {
    const provider = createProvider({ mode: 'mock' });
    expect(provider.mode).toBe('mock');
  });

  it('should throw for llm mode without API key', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => createProvider({ mode: 'llm' })).toThrow('apiKey');
  });

  it('should throw for cache mode without cache dir that exists', () => {
    expect(() => createProvider({ mode: 'cache', cacheDir: '/nonexistent-omega-test-dir' }))
      .toThrow();
  });

  it('should fall back to mock for invalid mode', () => {
    process.env.OMEGA_PROVIDER_MODE = 'invalid-mode';
    const provider = createProvider();
    expect(provider.mode).toBe('mock');
  });
});

// ═══════════════════════ GROUP 3 — CACHE PROVIDER ═══════════════════════

describe('Cache Provider', () => {
  const cacheDir = join(process.cwd(), '.test-cache-provider');

  beforeEach(() => {
    mkdirSync(cacheDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it('should read a stored response', () => {
    const prompt = 'test-prompt';
    const context: ProviderContext = { intentHash: 'abc123', seed: 's1', step: 'arcs' };
    const key = sha256(prompt + '\0' + context.intentHash + '\0' + context.seed + '\0' + context.step);
    const storedResponse: ProviderResponse = {
      content: '["arc1"]',
      contentHash: sha256('["arc1"]'),
      mode: 'llm',
      model: 'claude-sonnet-4-20250514',
      cached: false,
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    writeFileSync(join(cacheDir, `${key}.json`), JSON.stringify(storedResponse), 'utf8');

    const cache = createCacheProvider({ mode: 'cache', cacheDir });
    const result = cache.generateArcs(prompt, context);
    expect(result.cached).toBe(true);
    expect(result.mode).toBe('cache');
    expect(result.content).toBe('["arc1"]');
    expect(result.contentHash).toBe(storedResponse.contentHash);
  });

  it('should throw on cache miss', () => {
    const cache = createCacheProvider({ mode: 'cache', cacheDir });
    expect(() => cache.generateArcs('missing-prompt', TEST_CONTEXT)).toThrow('Cache miss');
  });

  it('should throw when cache dir does not exist', () => {
    expect(() => createCacheProvider({ mode: 'cache', cacheDir: '/nonexistent-dir-omega' }))
      .toThrow('does not exist');
  });
});

// ═══════════════════════ GROUP 4 — LLM PROVIDER STRUCTURE ═══════════════════════

describe('LLM Provider — Structure', () => {
  it('should throw without API key', () => {
    expect(() => createLlmProvider({ mode: 'llm' })).toThrow('apiKey');
  });

  it('should create provider with API key', () => {
    const provider = createLlmProvider({ mode: 'llm', apiKey: 'test-key-not-real' });
    expect(provider.mode).toBe('llm');
  });

  it('should have all three methods', () => {
    const provider = createLlmProvider({ mode: 'llm', apiKey: 'test-key-not-real' });
    expect(typeof provider.generateArcs).toBe('function');
    expect(typeof provider.enrichScenes).toBe('function');
    expect(typeof provider.detailBeats).toBe('function');
  });
});

// ═══════════════════════ GROUP 4b — MARKDOWN FENCE STRIPPING (TF-4) ═══════════════════════

describe('stripMarkdownFences', () => {
  it('should return clean JSON unchanged', () => {
    const input = '[{"arc_id":"ARC-001"}]';
    expect(stripMarkdownFences(input)).toBe(input);
  });

  it('should strip ```json ... ``` fences', () => {
    const input = '```json\n[{"arc_id":"ARC-001"}]\n```';
    expect(stripMarkdownFences(input)).toBe('[{"arc_id":"ARC-001"}]');
  });

  it('should strip ``` ... ``` fences (no language tag)', () => {
    const input = '```\n[{"arc_id":"ARC-001"}]\n```';
    expect(stripMarkdownFences(input)).toBe('[{"arc_id":"ARC-001"}]');
  });

  it('should handle leading/trailing whitespace', () => {
    const input = '  ```json\n  {"key": "val"}  \n```  ';
    expect(stripMarkdownFences(input)).toBe('{"key": "val"}');
  });

  it('should preserve multiline JSON inside fences', () => {
    const input = '```json\n[\n  {"id": 1},\n  {"id": 2}\n]\n```';
    const result = stripMarkdownFences(input);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should trim plain text with whitespace', () => {
    const input = '  {"key": "val"}  ';
    expect(stripMarkdownFences(input)).toBe('{"key": "val"}');
  });
});

// ═══════════════════════ GROUP 5 — INTEGRATION ═══════════════════════

describe('Provider Integration — Byte-identical', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('should produce byte-identical plan_hash in mock mode (scenario A)', () => {
    delete process.env.OMEGA_PROVIDER_MODE;

    // Run 1
    const { plan: p1 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );

    // Run 2
    const { plan: p2 } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );

    expect(p1.plan_hash).toBe(p2.plan_hash);
    expect(p1.plan_hash.length).toBe(64);
  });

  it('should produce byte-identical plan_hash in mock mode (scenario B)', () => {
    delete process.env.OMEGA_PROVIDER_MODE;

    const { plan: p1 } = createGenesisPlan(
      SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS,
      SCENARIO_B_GENOME, SCENARIO_B_EMOTION, config, TIMESTAMP,
    );

    const { plan: p2 } = createGenesisPlan(
      SCENARIO_B_INTENT, SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS,
      SCENARIO_B_GENOME, SCENARIO_B_EMOTION, config, TIMESTAMP,
    );

    expect(p1.plan_hash).toBe(p2.plan_hash);
  });

  it('should maintain evidence chain integrity in mock mode', () => {
    delete process.env.OMEGA_PROVIDER_MODE;
    const { report } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(report.evidence.steps.length).toBeGreaterThan(0);
    expect(report.evidence.chain_hash.length).toBe(64);
  });

  it('should not make LLM calls in mock mode', () => {
    delete process.env.OMEGA_PROVIDER_MODE;
    delete process.env.ANTHROPIC_API_KEY;
    // If LLM calls were made, this would throw (no API key)
    const { plan } = createGenesisPlan(
      SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
      SCENARIO_A_GENOME, SCENARIO_A_EMOTION, config, TIMESTAMP,
    );
    expect(plan.arcs.length).toBeGreaterThan(0);
  });
});
