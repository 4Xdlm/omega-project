/**
 * E7+E8 Tests — Public API + Hello Plugin E2E
 *
 * Proves the full lifecycle through the public PluginGateway API
 * with a realistic hello-plugin example.
 */
import { describe, it, expect } from 'vitest';
import { PluginGateway } from '../index.js';
import type {
  PluginManifest,
  PluginRequest,
  PluginResponse,
  TextPayload,
} from '../types.js';
import { PluginCapability } from '../types.js';

// ═══════════════════════════════════════════════════════════════════
// HELLO PLUGIN — E2E EXAMPLE
// ═══════════════════════════════════════════════════════════════════

const HELLO_MANIFEST: PluginManifest = {
  plugin_id: 'hello-plugin',
  name: 'Hello Plugin',
  vendor: 'OMEGA Examples',
  description: 'Echoes input text with greeting. Deterministic.',
  version: '1.0.0',
  api_version: '1.0.0',
  supported_omega_api_versions: '>=1.0.0 <2.0.0',
  capabilities: [PluginCapability.READ_TEXT, PluginCapability.WRITE_SUGGESTION],
  io: {
    inputs: [{ kind: 'text', schema_ref: 'text-v1', limits: { max_bytes: 65536 } }],
    outputs: [{ kind: 'json', schema_ref: 'greeting-v1', limits: { max_bytes: 65536 } }],
  },
  limits: { max_bytes: 131072, max_ms: 3000, max_concurrency: 2 },
  determinism: { mode: 'deterministic', notes: 'Pure string transform, no external state' },
  evidence: { log_level: 'full', redactions: [] },
  entrypoint: { type: 'worker', file: 'dist/hello-worker.js', export: 'greet' },
};

/** The hello plugin handler — pure function, stateless, deterministic */
function helloHandler(req: PluginRequest): PluginResponse {
  const payload = req.payload as TextPayload;
  const greeting = `Hello, OMEGA! You said: "${payload.content}"`;
  const wordCount = payload.content.split(/\s+/).filter(Boolean).length;

  return {
    request_id: req.request_id,
    plugin_id: 'hello-plugin',
    status: 'ok',
    result: {
      kind: 'json',
      data: { greeting, word_count: wordCount, original_length: payload.content.length },
      schema_ref: 'greeting-v1',
    },
    evidence_hashes: { input_hash: '', output_hash: '' },
    duration_ms: 0,
    notes: 'Greeted successfully',
  };
}

function makeRequest(content: string, runId: string = 'run-hello'): PluginRequest {
  return {
    request_id: `req-${Date.now()}`,
    run_id: runId,
    timestamp: new Date().toISOString(),
    payload: { kind: 'text', content, encoding: 'utf-8', metadata: { source: 'test' } },
    context: { session: 'e2e-test' },
    policy: { deterministic_only: true, timeout_ms: 3000, max_retries: 0 },
  };
}

// ═══════════════════════════════════════════════════════════════════
// E7 — PUBLIC API
// ═══════════════════════════════════════════════════════════════════

describe('E7 — Public API (PluginGateway)', () => {
  it('validateManifest works standalone', () => {
    const gw = new PluginGateway();
    const report = gw.validateManifest(HELLO_MANIFEST);
    expect(report.valid).toBe(true);
    expect(report.manifest_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('validateManifest rejects invalid', () => {
    const gw = new PluginGateway();
    const bad = { ...HELLO_MANIFEST, api_version: '9.0.0' };
    const report = gw.validateManifest(bad);
    expect(report.valid).toBe(false);
  });

  it('registerPlugin returns PluginInfo', () => {
    const gw = new PluginGateway();
    const info = gw.registerPlugin(HELLO_MANIFEST, 'valid-signature');
    expect(info.plugin_id).toBe('hello-plugin');
    expect(info.status).toBe('registered');
    expect(info.signature_valid).toBe(true);
  });

  it('registerPlugin with invalid manifest → rejected', () => {
    const gw = new PluginGateway();
    const bad = { ...HELLO_MANIFEST, api_version: '9.0.0' };
    const info = gw.registerPlugin(bad, 'sig');
    expect(info.status).toBe('rejected');
  });

  it('registerPlugin with empty signature → rejected', () => {
    const gw = new PluginGateway();
    const info = gw.registerPlugin(HELLO_MANIFEST, '');
    expect(info.status).toBe('rejected');
  });

  it('enablePlugin / disablePlugin lifecycle', () => {
    const gw = new PluginGateway();
    gw.registerPlugin(HELLO_MANIFEST, 'sig');
    gw.enablePlugin('hello-plugin');
    const list1 = gw.listPlugins();
    expect(list1[0]?.status).toBe('enabled');

    gw.disablePlugin('hello-plugin');
    const list2 = gw.listPlugins();
    expect(list2[0]?.status).toBe('disabled');
  });

  it('listPlugins returns all', () => {
    const gw = new PluginGateway();
    expect(gw.listPlugins()).toHaveLength(0);
    gw.registerPlugin(HELLO_MANIFEST, 'sig');
    expect(gw.listPlugins()).toHaveLength(1);
  });

  it('invoke rejects when no handler set', async () => {
    const gw = new PluginGateway();
    gw.registerPlugin(HELLO_MANIFEST, 'sig');
    gw.enablePlugin('hello-plugin');
    const resp = await gw.invoke('hello-plugin', makeRequest('test'));
    expect(resp.status).toBe('rejected');
    expect(resp.notes).toContain('No handler');
  });

  it('exportProof returns bundle', () => {
    const gw = new PluginGateway();
    gw.registerPlugin(HELLO_MANIFEST, 'sig');
    const proof = gw.exportProof('run-001');
    expect(proof.run_id).toBe('run-001');
  });

  it('ledger tracks all operations', () => {
    const gw = new PluginGateway();
    gw.registerPlugin(HELLO_MANIFEST, 'sig');
    gw.enablePlugin('hello-plugin');
    gw.disablePlugin('hello-plugin');
    const ledger = gw.getLedger();
    expect(ledger.count()).toBe(3); // REGISTER + ENABLE + DISABLE
    expect(ledger.verifyChain()).toEqual({ valid: true, broken_at: null });
  });
});

// ═══════════════════════════════════════════════════════════════════
// E8 — HELLO PLUGIN E2E
// ═══════════════════════════════════════════════════════════════════

describe('E8 — Hello Plugin E2E', () => {
  function setupGateway(): PluginGateway {
    const gw = new PluginGateway();
    gw.registerPlugin(HELLO_MANIFEST, 'valid-sig');
    gw.enablePlugin('hello-plugin');
    gw.setHandler('hello-plugin', helloHandler);
    return gw;
  }

  it('full E2E: register → enable → invoke → get result', async () => {
    const gw = setupGateway();
    const resp = await gw.invoke('hello-plugin', makeRequest('OMEGA is alive'));
    expect(resp.status).toBe('ok');
    expect(resp.result).not.toBeNull();
    expect(resp.result?.kind).toBe('json');
    if (resp.result?.kind === 'json') {
      expect(resp.result.data['greeting']).toContain('OMEGA is alive');
      expect(resp.result.data['word_count']).toBe(3);
    }
  });

  it('evidence hashes are computed', async () => {
    const gw = setupGateway();
    const resp = await gw.invoke('hello-plugin', makeRequest('test'));
    expect(resp.evidence_hashes.input_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(resp.evidence_hashes.output_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('deterministic: same input → same hashes', async () => {
    const gw = setupGateway();
    const req = makeRequest('determinism check');
    const r1 = await gw.invoke('hello-plugin', { ...req, request_id: 'det-1' });
    const r2 = await gw.invoke('hello-plugin', { ...req, request_id: 'det-2' });
    expect(r1.evidence_hashes.input_hash).toBe(r2.evidence_hashes.input_hash);
    expect(r1.evidence_hashes.output_hash).toBe(r2.evidence_hashes.output_hash);
  });

  it('pipeline with hello-plugin only', async () => {
    const gw = setupGateway();
    const result = await gw.invokePipeline(
      { strategy: 'sequential', plugin_ids: ['hello-plugin'], timeout_ms: 3000, stop_on_failure: true },
      makeRequest('pipeline test'),
    );
    expect(result.overall_status).toBe('ok');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.response.status).toBe('ok');
  });

  it('proof export captures hello-plugin run', async () => {
    const gw = setupGateway();
    const runId = 'proof-run';
    await gw.invoke('hello-plugin', makeRequest('proof test', runId));
    const proof = gw.exportProof(runId);
    expect(proof.run_id).toBe(runId);
    expect(proof.events.length).toBeGreaterThan(0);
    expect(proof.head_event_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('ledger chain valid after multiple E2E calls', async () => {
    const gw = setupGateway();
    for (let i = 0; i < 10; i++) {
      await gw.invoke('hello-plugin', makeRequest(`call ${i}`));
    }
    const ledger = gw.getLedger();
    expect(ledger.verifyChain()).toEqual({ valid: true, broken_at: null });
  });

  it('disable then invoke → rejected', async () => {
    const gw = setupGateway();
    gw.disablePlugin('hello-plugin');
    const resp = await gw.invoke('hello-plugin', makeRequest('should fail'));
    expect(resp.status).toBe('rejected');
    expect(resp.notes).toContain('not enabled');
  });

  it('re-enable and invoke → works again', async () => {
    const gw = setupGateway();
    gw.disablePlugin('hello-plugin');
    gw.enablePlugin('hello-plugin');
    const resp = await gw.invoke('hello-plugin', makeRequest('back online'));
    expect(resp.status).toBe('ok');
  });
});
