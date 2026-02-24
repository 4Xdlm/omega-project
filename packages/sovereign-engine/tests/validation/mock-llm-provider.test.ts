/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — MockLLMProvider Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Phase VALIDATION — Offline Mock Runner
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Invariants couverts:
 * - INV-VAL-01: Determinism (same seed → same result)
 * - INV-VAL-03: 0 network calls in offline mode
 * - INV-VAL-04: model_id = "offline-mock"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { MockLLMProvider, RealLLMProvider } from '../../src/validation/mock-llm-provider.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';

const TEST_CORPUS = [
  'Le fer brûlait encore sous ses doigts. Elle serra le poing.',
  'Un bruit sec dans le couloir. Elle se figea, immobile.',
  'La pluie martelait le toit. Le silence qui suivit pesait.',
  'Son cœur battait la chamade. Un frisson parcourut son échine.',
  'Elle ouvrit la porte. La pièce était vide.',
];

const provider = new MockLLMProvider(TEST_CORPUS);
const packet = createTestPacket();

describe('MockLLMProvider — Phase VALIDATION', () => {
  // T01: generateDraft returns LLMProviderResult with non-empty prose
  it('T01: generateDraft returns LLMProviderResult with non-empty prose', async () => {
    const result = await provider.generateDraft(packet, 'seed_001');
    expect(result.prose).toBeTruthy();
    expect(typeof result.prose).toBe('string');
    expect(result.prose.length).toBeGreaterThan(0);
    expect(result.prompt_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  // T02: same seed + same packet → same prose + same prompt_hash [INV-VAL-01]
  it('T02: determinism — same seed + same packet → same result [INV-VAL-01]', async () => {
    const r1 = await provider.generateDraft(packet, 'seed_determ');
    const r2 = await provider.generateDraft(packet, 'seed_determ');
    expect(r1.prose).toBe(r2.prose);
    expect(r1.prompt_hash).toBe(r2.prompt_hash);
  });

  // T03: different seed → potentially different prose
  it('T03: different seed → ≥2 distinct proses', async () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const result = await provider.generateDraft(packet, `seed_diff_${i}`);
      results.add(result.prose);
    }
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  // T04: judgeLLMAxis returns value in [0,1]
  it('T04: judgeLLMAxis returns value in [0,1]', async () => {
    const value = await provider.judgeLLMAxis('some prose text', 'tension_14d', 'seed_001');
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });

  // T05: same axis + seed + prose → same value [INV-VAL-01]
  it('T05: determinism — same axis + seed + prose → same value [INV-VAL-01]', async () => {
    const v1 = await provider.judgeLLMAxis('un texte français', 'anti_cliche', 'seed_ax');
    const v2 = await provider.judgeLLMAxis('un texte français', 'anti_cliche', 'seed_ax');
    expect(v1).toBe(v2);
  });

  // T06: model_id="offline-mock" + no fetch [INV-VAL-03][INV-VAL-04]
  it('T06: model_id="offline-mock" + 0 network calls [INV-VAL-03][INV-VAL-04]', async () => {
    expect(provider.model_id).toBe('offline-mock');

    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (() => {
      fetchCalled = true;
      return Promise.reject(new Error('fetch should not be called'));
    }) as typeof globalThis.fetch;
    try {
      const result = await provider.generateDraft(packet, 'net_test');
      expect(result.prose).toBeTruthy();
      await provider.judgeLLMAxis('test', 'axis', 'seed');
      expect(fetchCalled).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Bonus: RealLLMProvider throws
  it('RealLLMProvider throws in offline mode', async () => {
    const real = new RealLLMProvider();
    await expect(real.generateDraft(packet, 'seed')).rejects.toThrow();
    await expect(real.judgeLLMAxis('prose', 'axis', 'seed')).rejects.toThrow();
    expect(real.model_id).toBe('PENDING_REAL_RUN');
  });
});
