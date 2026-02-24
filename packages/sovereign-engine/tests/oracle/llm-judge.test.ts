/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — LLM Judge Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Phase VALIDATION — LLM Judge with schema validation + retry + cache
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * 0 real HTTP calls — all fetch mocked.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { LLMJudge, JudgeSchemaError, JudgeTimeoutError, ModelDriftError } from '../../src/oracle/llm-judge.js';
import { JudgeCache } from '../../src/validation/judge-cache.js';
import { sha256 } from '@omega/canon-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_MODEL = 'claude-sonnet-4-20250514';
const TEST_API_KEY = 'sk-ant-test-key-for-unit-tests';

function mockJudgeResponse(score: number, reason: string, model: string = TEST_MODEL) {
  const jsonText = JSON.stringify({ score, reason });
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model,
      content: [{ type: 'text', text: jsonText }],
      stop_reason: 'end_turn',
    }),
  });
}

function mock429ThenSuccess(score: number, reason: string) {
  let callCount = 0;
  return vi.fn().mockImplementation(async () => {
    callCount++;
    if (callCount <= 1) {
      return { ok: false, status: 429, statusText: 'Too Many Requests' };
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        id: 'msg_test',
        type: 'message',
        model: TEST_MODEL,
        content: [{ type: 'text', text: JSON.stringify({ score, reason }) }],
      }),
    };
  });
}

function mock429Always() {
  return vi.fn().mockResolvedValue({
    ok: false,
    status: 429,
    statusText: 'Too Many Requests',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('LLMJudge — Phase VALIDATION', () => {
  let originalFetch: typeof globalThis.fetch;
  let tmpDir: string;
  let cachePath: string;
  let cache: JudgeCache;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-judge-test-'));
    cachePath = path.join(tmpDir, 'judge-cache.json');
    cache = new JudgeCache(cachePath);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // T01: Schema valide → score retourné
  it('T01: valid JSON schema → score returned', async () => {
    globalThis.fetch = mockJudgeResponse(0.82, 'profonde intériorité');
    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 5000 });

    const result = await judge.judge('interiorite', 'Le texte littéraire.', 'seed_01');

    expect(result.score).toBe(0.82);
    expect(result.reason).toBe('profonde intériorité');
  });

  // T02: Schema invalide → JudgeSchemaError (fail-closed)
  it('T02: invalid JSON schema → JudgeSchemaError', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        model: TEST_MODEL,
        content: [{ type: 'text', text: 'This is not JSON at all' }],
      }),
    });
    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 5000 });

    await expect(judge.judge('impact', 'prose', 'seed')).rejects.toThrow(JudgeSchemaError);
  });

  // T03: Timeout → JudgeTimeoutError
  it('T03: timeout → JudgeTimeoutError', async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({
          ok: true,
          status: 200,
          json: async () => ({
            model: TEST_MODEL,
            content: [{ type: 'text', text: '{"score": 0.5, "reason": "ok"}' }],
          }),
        }), 10000);
        // Handle AbortController signal
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      }),
    );

    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 50 });
    await expect(judge.judge('necessite', 'prose', 'seed')).rejects.toThrow(JudgeTimeoutError);
  });

  // T04: 429 → retry × 2 → succès
  it('T04: 429 → retry succeeds on 2nd attempt', async () => {
    globalThis.fetch = mock429ThenSuccess(0.75, 'bon impact');
    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 5000 });

    const result = await judge.judge('impact', 'prose', 'seed');
    expect(result.score).toBe(0.75);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  // T05: 429 → retry × 3 → fail-closed
  it('T05: 429 persistent → fail-closed after max retries', async () => {
    globalThis.fetch = mock429Always();
    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 5000 });

    await expect(judge.judge('interiorite', 'prose', 'seed')).rejects.toThrow('429');
  });

  // T06: Model drift → ModelDriftError
  it('T06: model drift → ModelDriftError', async () => {
    globalThis.fetch = mockJudgeResponse(0.80, 'ok', 'claude-opus-4-20250514');
    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 5000 });

    await expect(judge.judge('interiorite', 'prose', 'seed')).rejects.toThrow(ModelDriftError);
  });

  // T07: Cache hit → 0 appel réseau
  it('T07: cache hit → 0 network calls', async () => {
    const fetchMock = mockJudgeResponse(0.88, 'excellente intériorité');
    globalThis.fetch = fetchMock;
    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 5000 });

    // First call — cache miss → API call
    const r1 = await judge.judge('interiorite', 'Le texte.', 'seed_cache');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call — same params → cache hit, no API call
    const r2 = await judge.judge('interiorite', 'Le texte.', 'seed_cache');
    expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1, not 2
    expect(r2.score).toBe(r1.score);
  });

  // T08: Cache miss → appel + stockage
  it('T08: cache miss → API call + storage', async () => {
    globalThis.fetch = mockJudgeResponse(0.65, 'impact moyen');
    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 5000 });

    await judge.judge('impact', 'Une prose unique.', 'seed_miss');

    // Verify stored in cache
    const cacheKey = sha256('impact' + 'Une prose unique.' + 'seed_miss');
    const cached = cache.get(cacheKey);
    expect(cached).not.toBeNull();
    expect(cached!.score).toBe(0.65);
  });

  // T09: Cache key = SHA256(axe+prose+seed) déterministe
  it('T09: cache key = SHA256(axis+prose+seed) deterministic', async () => {
    globalThis.fetch = mockJudgeResponse(0.90, 'nécessité parfaite');
    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 5000 });

    await judge.judge('necessite', 'Chaque mot compte.', 'seed_det');

    const expectedKey = sha256('necessite' + 'Chaque mot compte.' + 'seed_det');
    const cached = cache.get(expectedKey);
    expect(cached).not.toBeNull();
    expect(cached!.score).toBe(0.90);
  });

  // T10: densite_sensorielle judge → score dans [0,1]
  it('T10: densite_sensorielle judge → valid score returned', async () => {
    globalThis.fetch = mockJudgeResponse(0.73, 'bonne densité sensorielle');
    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 5000 });

    const result = await judge.judge('densite_sensorielle', 'Le fer brûlait sous ses doigts, odeur âcre de rouille.', 'seed_ds');

    expect(result.score).toBe(0.73);
    expect(result.reason).toBe('bonne densité sensorielle');
  });

  // T11: densite_sensorielle same prose+seed → same score (cache determinism)
  it('T11: densite_sensorielle cache key deterministic', async () => {
    globalThis.fetch = mockJudgeResponse(0.68, 'densité correcte');
    const judge = new LLMJudge(TEST_MODEL, TEST_API_KEY, cache, { retryBaseMs: 1, rateLimitMs: 0, timeoutMs: 5000 });

    await judge.judge('densite_sensorielle', 'Prose sensorielle.', 'seed_ds_det');

    const expectedKey = sha256('densite_sensorielle' + 'Prose sensorielle.' + 'seed_ds_det');
    const cached = cache.get(expectedKey);
    expect(cached).not.toBeNull();
    expect(cached!.score).toBe(0.68);
  });
});
