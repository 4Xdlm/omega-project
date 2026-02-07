/**
 * OMEGA Plugin SDK — Unit Tests v1.0
 */
import { describe, it, expect } from 'vitest';
import { ManifestBuilder } from '../manifest-builder.js';
import { hashPayload, hashData, computeEvidenceHashes, generateRequestId } from '../evidence.js';
import { AdapterBase } from '../adapter-base.js';
import {
  OMEGA_PLUGIN_API_VERSION, PluginCapability, ForbiddenCapability,
  FORBIDDEN_CAPABILITY_SET, PLUGIN_ID_PATTERN, SEMVER_PATTERN,
  MAX_TIMEOUT_MS, DEFAULT_COMPLIANCE_TIMEOUT_MS, MAX_PAYLOAD_BYTES,
} from '../constants.js';
import type { PluginPayload, PluginRequest, TextPayload } from '../types.js';

// ═══════════════ CONSTANTS ═══════════════

describe('Constants', () => {
  it('OMEGA_PLUGIN_API_VERSION is valid semver', () => {
    expect(SEMVER_PATTERN.test(OMEGA_PLUGIN_API_VERSION)).toBe(true);
  });

  it('PluginCapability has 6 values', () => {
    expect(Object.keys(PluginCapability)).toHaveLength(6);
  });

  it('ForbiddenCapability has 4 values', () => {
    expect(Object.keys(ForbiddenCapability)).toHaveLength(4);
  });

  it('FORBIDDEN_CAPABILITY_SET matches ForbiddenCapability values', () => {
    for (const val of Object.values(ForbiddenCapability)) {
      expect(FORBIDDEN_CAPABILITY_SET.has(val)).toBe(true);
    }
  });

  it('PLUGIN_ID_PATTERN matches valid IDs', () => {
    expect(PLUGIN_ID_PATTERN.test('p.sample.neutral')).toBe(true);
    expect(PLUGIN_ID_PATTERN.test('p.narrative.scenario')).toBe(true);
    expect(PLUGIN_ID_PATTERN.test('p.qc.continuity')).toBe(true);
  });

  it('PLUGIN_ID_PATTERN rejects invalid IDs', () => {
    expect(PLUGIN_ID_PATTERN.test('invalid')).toBe(false);
    expect(PLUGIN_ID_PATTERN.test('p.A.b')).toBe(false);
    expect(PLUGIN_ID_PATTERN.test('')).toBe(false);
  });

  it('numeric constants are positive', () => {
    expect(MAX_TIMEOUT_MS).toBeGreaterThan(0);
    expect(DEFAULT_COMPLIANCE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(MAX_PAYLOAD_BYTES).toBeGreaterThan(0);
  });
});

// ═══════════════ EVIDENCE ═══════════════

describe('Evidence', () => {
  const samplePayload: TextPayload = { kind: 'text', content: 'hello', encoding: 'utf-8', metadata: {} };

  it('hashPayload returns 64-char hex string', () => {
    const hash = hashPayload(samplePayload);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashPayload is deterministic', () => {
    const h1 = hashPayload(samplePayload);
    const h2 = hashPayload(samplePayload);
    expect(h1).toBe(h2);
  });

  it('hashPayload differs for different payloads', () => {
    const other: TextPayload = { kind: 'text', content: 'world', encoding: 'utf-8', metadata: {} };
    expect(hashPayload(samplePayload)).not.toBe(hashPayload(other));
  });

  it('hashData works on arbitrary objects', () => {
    const h = hashData({ a: 1, b: 2 });
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashData is order-independent (canonical JSON)', () => {
    const h1 = hashData({ b: 2, a: 1 });
    const h2 = hashData({ a: 1, b: 2 });
    expect(h1).toBe(h2);
  });

  it('computeEvidenceHashes returns both hashes', () => {
    const output: TextPayload = { kind: 'text', content: 'out', encoding: 'utf-8', metadata: {} };
    const ev = computeEvidenceHashes(samplePayload, output);
    expect(ev.input_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(ev.output_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('computeEvidenceHashes with null output returns empty output_hash', () => {
    const ev = computeEvidenceHashes(samplePayload, null);
    expect(ev.input_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(ev.output_hash).toBe('');
  });

  it('generateRequestId returns UUID-like string', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  });

  it('generateRequestId produces unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });
});

// ═══════════════ MANIFEST BUILDER ═══════════════

describe('ManifestBuilder', () => {
  function validBuilder(): ManifestBuilder {
    return new ManifestBuilder()
      .pluginId('p.test.sample')
      .name('Test Plugin')
      .vendor('test-vendor')
      .description('A test plugin')
      .version('1.0.0')
      .addCapability('read_text')
      .addInput({ kind: 'text', schema_ref: 'test:input:v1', limits: { max_bytes: 1024 } })
      .addOutput({ kind: 'json', schema_ref: 'test:output:v1', limits: { max_bytes: 1024 } });
  }

  it('builds valid manifest', () => {
    const m = validBuilder().build();
    expect(m.plugin_id).toBe('p.test.sample');
    expect(m.api_version).toBe(OMEGA_PLUGIN_API_VERSION);
    expect(m.capabilities).toEqual(['read_text']);
    expect(m.entrypoint.type).toBe('worker');
  });

  it('throws on empty plugin_id', () => {
    expect(() => validBuilder().pluginId('').build()).toThrow();
  });

  it('throws on invalid plugin_id pattern', () => {
    expect(() => validBuilder().pluginId('INVALID').build()).toThrow();
  });

  it('throws on empty name', () => {
    expect(() => validBuilder().name('').build()).toThrow();
  });

  it('throws on empty vendor', () => {
    expect(() => validBuilder().vendor('').build()).toThrow();
  });

  it('throws on invalid version', () => {
    expect(() => validBuilder().version('abc').build()).toThrow();
  });

  it('throws on no capabilities', () => {
    expect(() => new ManifestBuilder()
      .pluginId('p.test.sample').name('T').vendor('V').version('1.0.0')
      .addInput({ kind: 'text', schema_ref: 'x', limits: { max_bytes: 1 } })
      .addOutput({ kind: 'json', schema_ref: 'y', limits: { max_bytes: 1 } })
      .build()
    ).toThrow();
  });

  it('throws on no inputs', () => {
    expect(() => new ManifestBuilder()
      .pluginId('p.test.sample').name('T').vendor('V').version('1.0.0')
      .addCapability('read_text')
      .addOutput({ kind: 'json', schema_ref: 'y', limits: { max_bytes: 1 } })
      .build()
    ).toThrow();
  });

  it('throws on no outputs', () => {
    expect(() => new ManifestBuilder()
      .pluginId('p.test.sample').name('T').vendor('V').version('1.0.0')
      .addCapability('read_text')
      .addInput({ kind: 'text', schema_ref: 'x', limits: { max_bytes: 1 } })
      .build()
    ).toThrow();
  });

  it('does not duplicate capabilities', () => {
    const m = validBuilder().addCapability('read_text').addCapability('read_text').build();
    expect(m.capabilities).toEqual(['read_text']);
  });

  it('sets custom limits', () => {
    const m = validBuilder().limits({ max_bytes: 500, max_ms: 2000, max_concurrency: 3 }).build();
    expect(m.limits.max_ms).toBe(2000);
  });

  it('sets determinism mode', () => {
    const m = validBuilder().determinism({ mode: 'probabilistic', notes: 'LLM' }).build();
    expect(m.determinism.mode).toBe('probabilistic');
  });
});

// ═══════════════ ADAPTER BASE ═══════════════

describe('AdapterBase', () => {
  class TestAdapter extends AdapterBase {
    readonly pluginId = 'p.test.adapter';
    validateInput(payload: PluginPayload): string | null {
      if (payload.kind !== 'text') return 'Expected text';
      if (payload.content.length === 0) return 'Empty content';
      return null;
    }
    compute(payload: PluginPayload): PluginPayload {
      return { kind: 'json', schema_ref: 'test:out', data: { echo: (payload as TextPayload).content } };
    }
  }

  class ErrorAdapter extends AdapterBase {
    readonly pluginId = 'p.test.error';
    validateInput(): string | null { return null; }
    compute(): PluginPayload { throw new Error('BOOM'); }
  }

  const adapter = new TestAdapter();
  const errorAdapter = new ErrorAdapter();

  function makeReq(payload: PluginPayload): PluginRequest {
    return {
      request_id: 'req-1', run_id: 'run-1', timestamp: '2026-02-07T00:00:00Z',
      payload, context: {}, policy: { deterministic_only: true, timeout_ms: 5000, max_retries: 0 },
    };
  }

  it('returns ok for valid input', async () => {
    const res = await adapter.handleRequest(makeReq({ kind: 'text', content: 'hello', encoding: 'utf-8', metadata: {} }));
    expect(res.status).toBe('ok');
    expect(res.result).not.toBeNull();
    expect(res.evidence_hashes.input_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(res.evidence_hashes.output_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns rejected for invalid input', async () => {
    const res = await adapter.handleRequest(makeReq({ kind: 'text', content: '', encoding: 'utf-8', metadata: {} }));
    expect(res.status).toBe('rejected');
    expect(res.result).toBeNull();
    expect(res.notes).toContain('Validation failed');
  });

  it('returns rejected for wrong kind', async () => {
    const res = await adapter.handleRequest(makeReq({ kind: 'json', schema_ref: 'x', data: {} }));
    expect(res.status).toBe('rejected');
  });

  it('returns error when compute throws', async () => {
    const res = await errorAdapter.handleRequest(makeReq({ kind: 'text', content: 'x', encoding: 'utf-8', metadata: {} }));
    expect(res.status).toBe('error');
    expect(res.notes).toContain('BOOM');
  });

  it('sets correct plugin_id', async () => {
    const res = await adapter.handleRequest(makeReq({ kind: 'text', content: 'x', encoding: 'utf-8', metadata: {} }));
    expect(res.plugin_id).toBe('p.test.adapter');
  });

  it('measures duration_ms', async () => {
    const res = await adapter.handleRequest(makeReq({ kind: 'text', content: 'x', encoding: 'utf-8', metadata: {} }));
    expect(res.duration_ms).toBeGreaterThanOrEqual(0);
  });
});
