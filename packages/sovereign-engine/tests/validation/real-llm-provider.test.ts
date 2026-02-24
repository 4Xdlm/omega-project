/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AnthropicLLMProvider Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Phase VALIDATION — Real LLM Provider
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Tests with mocked fetch — 0 real HTTP calls.
 *
 * Invariants couverts:
 * - INV-VAL-04: model_id matches config model_lock
 * - INV-VAL-03: fetch called ONLY for Anthropic API (no side channels)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicLLMProvider } from '../../src/validation/real-llm-provider.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function mockFetchResponse(text: string, model: string = 'claude-sonnet-4-20250514') {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model,
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 50 },
    }),
  });
}

function mockFetch429ThenSuccess(text: string, model: string = 'claude-sonnet-4-20250514') {
  let callCount = 0;
  return vi.fn().mockImplementation(async () => {
    callCount++;
    if (callCount === 1) {
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: { message: 'rate limited' } }),
      };
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model,
        content: [{ type: 'text', text }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_MODEL = 'claude-sonnet-4-20250514';
const TEST_API_KEY = 'sk-ant-test-key-for-unit-tests';
const packet = createTestPacket();

describe('AnthropicLLMProvider — Phase VALIDATION (Real)', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // T01: Constructor validates API key
  it('T01: constructor throws if apiKey is empty', () => {
    expect(() => new AnthropicLLMProvider(TEST_MODEL, '')).toThrow('API key');
    expect(() => new AnthropicLLMProvider(TEST_MODEL, '  ')).toThrow('API key');
  });

  // T02: model_id matches constructor arg [INV-VAL-04]
  it('T02: model_id matches constructor arg [INV-VAL-04]', () => {
    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY);
    expect(provider.model_id).toBe(TEST_MODEL);
  });

  // T03: generateDraft calls Anthropic API and returns text
  it('T03: generateDraft calls Anthropic API and returns prose', async () => {
    const mockProse = 'Le vent soufflait sur les ruines anciennes.';
    globalThis.fetch = mockFetchResponse(mockProse, TEST_MODEL);

    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY);
    const result = await provider.generateDraft(packet, 'seed_real_01');

    expect(result).toBe(mockProse);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Verify API call shape
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('https://api.anthropic.com/v1/messages');
    const body = JSON.parse(call[1].body);
    expect(body.model).toBe(TEST_MODEL);
    expect(body.max_tokens).toBeGreaterThan(0);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
  });

  // T04: generateDraft sends correct headers
  it('T04: generateDraft sends correct headers (x-api-key, anthropic-version)', async () => {
    globalThis.fetch = mockFetchResponse('Prose.', TEST_MODEL);

    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY);
    await provider.generateDraft(packet, 'seed_headers');

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1].headers;
    expect(headers['x-api-key']).toBe(TEST_API_KEY);
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['Content-Type']).toBe('application/json');
  });

  // T05: Model lock — throws on model drift [INV-VAL-04]
  it('T05: model lock — throws on model drift [INV-VAL-04]', async () => {
    globalThis.fetch = mockFetchResponse('Prose.', 'claude-opus-4-20250514');

    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY);
    await expect(provider.generateDraft(packet, 'seed_drift')).rejects.toThrow('MODEL DRIFT');
  });

  // T06: Retry on 429 with backoff
  it('T06: retry on 429 — succeeds on second attempt', async () => {
    const mockProse = 'Après la tempête, le calme.';
    globalThis.fetch = mockFetch429ThenSuccess(mockProse, TEST_MODEL);

    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY, { retryBaseMs: 10, rateLimitMs: 0 });
    const result = await provider.generateDraft(packet, 'seed_429');

    expect(result).toBe(mockProse);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  // T07: Throws on non-429 API error
  it('T07: throws on non-429 API error (500)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY, { rateLimitMs: 0 });
    await expect(provider.generateDraft(packet, 'seed_500')).rejects.toThrow('500');
  });

  // T08: judgeLLMAxis returns number in [0,1]
  it('T08: judgeLLMAxis calls API and returns parsed number in [0,1]', async () => {
    globalThis.fetch = mockFetchResponse('0.73', TEST_MODEL);

    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY, { rateLimitMs: 0 });
    const score = await provider.judgeLLMAxis('Un texte français.', 'tension_14d', 'seed_axis');

    expect(score).toBe(0.73);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  // T09: judgeLLMAxis throws on non-numeric response
  it('T09: judgeLLMAxis throws on non-numeric response', async () => {
    globalThis.fetch = mockFetchResponse('This is not a number', TEST_MODEL);

    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY, { rateLimitMs: 0 });
    await expect(provider.judgeLLMAxis('prose', 'axis', 'seed')).rejects.toThrow('invalid score');
  });

  // T10: judgeLLMAxis throws on out-of-range value
  it('T10: judgeLLMAxis throws on out-of-range value', async () => {
    globalThis.fetch = mockFetchResponse('1.5', TEST_MODEL);

    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY, { rateLimitMs: 0 });
    await expect(provider.judgeLLMAxis('prose', 'axis', 'seed')).rejects.toThrow('invalid score');
  });

  // T11: Throws if API returns empty content
  it('T11: throws if API returns empty content', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: TEST_MODEL,
        content: [],
        stop_reason: 'end_turn',
      }),
    });

    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY, { rateLimitMs: 0 });
    await expect(provider.generateDraft(packet, 'seed_empty')).rejects.toThrow('no text content');
  });

  // T12: Prompt contains ForgePacket scene_goal and emotion data
  it('T12: prompt contains ForgePacket scene_goal and emotion data', async () => {
    globalThis.fetch = mockFetchResponse('Prose résultat.', TEST_MODEL);

    const provider = new AnthropicLLMProvider(TEST_MODEL, TEST_API_KEY, { rateLimitMs: 0 });
    await provider.generateDraft(packet, 'seed_prompt');

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body);
    const prompt = body.messages[0].content;
    expect(prompt).toContain(packet.intent.scene_goal);
    expect(prompt).toContain('français');
  });
});
