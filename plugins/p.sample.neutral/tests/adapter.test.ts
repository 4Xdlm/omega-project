/**
 * p.sample.neutral — Adapter Tests v1.0
 */
import { describe, it, expect } from 'vitest';
import { handleRequest, NeutralPluginAdapter } from '../src/adapter.js';
import type { PluginRequest, TextPayload } from '../../../packages/plugin-sdk/src/types.js';

function makeReq(content: string): PluginRequest {
  return {
    request_id: 'test-req', run_id: 'test-run', timestamp: '2026-02-07T00:00:00Z',
    payload: { kind: 'text', content, encoding: 'utf-8', metadata: {} } as TextPayload,
    context: {}, policy: { deterministic_only: true, timeout_ms: 5000, max_retries: 0 },
  };
}

describe('NeutralPluginAdapter', () => {
  const adapter = new NeutralPluginAdapter();

  it('has correct pluginId', () => {
    expect(adapter.pluginId).toBe('p.sample.neutral');
  });

  it('validates text payload', () => {
    expect(adapter.validateInput({ kind: 'text', content: 'ok', encoding: 'utf-8', metadata: {} })).toBeNull();
  });

  it('rejects non-text payload', () => {
    const err = adapter.validateInput({ kind: 'json', schema_ref: 'x', data: {} });
    expect(err).toContain('kind="json"');
  });

  it('rejects empty content', () => {
    const err = adapter.validateInput({ kind: 'text', content: '', encoding: 'utf-8', metadata: {} });
    expect(err).toContain('too short');
  });

  it('compute returns JSONPayload', () => {
    const result = adapter.compute({ kind: 'text', content: 'hello', encoding: 'utf-8', metadata: {} });
    expect(result.kind).toBe('json');
  });
});

describe('handleRequest', () => {
  it('returns ok for valid text', async () => {
    const res = await handleRequest(makeReq('Le soleil brillait sur la mer calme'));
    expect(res.status).toBe('ok');
    expect(res.plugin_id).toBe('p.sample.neutral');
    expect(res.result).not.toBeNull();
    expect(res.result!.kind).toBe('json');
  });

  it('returns rejected for empty content', async () => {
    const res = await handleRequest(makeReq(''));
    expect(res.status).toBe('rejected');
    expect(res.result).toBeNull();
  });

  it('produces evidence hashes', async () => {
    const res = await handleRequest(makeReq('test'));
    expect(res.evidence_hashes.input_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(res.evidence_hashes.output_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', async () => {
    const r1 = await handleRequest(makeReq('determinism'));
    const r2 = await handleRequest(makeReq('determinism'));
    expect(r1.evidence_hashes.output_hash).toBe(r2.evidence_hashes.output_hash);
  });

  it('measures duration_ms', async () => {
    const res = await handleRequest(makeReq('timing'));
    expect(res.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('output data has correct structure', async () => {
    const res = await handleRequest(makeReq('Hello world'));
    const data = (res.result as { kind: 'json'; data: Record<string, unknown> }).data;
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('word_count');
    expect(data).toHaveProperty('char_count');
    expect(data).toHaveProperty('language_hint');
    expect(data).toHaveProperty('tags');
    expect(data).toHaveProperty('complexity_score');
  });
});
