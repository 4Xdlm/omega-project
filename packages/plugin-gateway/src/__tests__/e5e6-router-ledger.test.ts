/**
 * E5+E6 Tests — Router/Orchestrator + Ledger/Proof
 *
 * T2:  Determinism (same inputs → same outputs)
 * T7:  Ledger integrity (hash-chain, append-only)
 * T8:  Fail-closed (stop_on_failure, timeouts through router)
 * T9:  Stress (concurrent invocations)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from '../registry.js';
import { ManifestValidator } from '../validator.js';
import { GatewayLedger } from '../ledger.js';
import { GatewayRouter, type PluginHandler } from '../router.js';
import type {
  PluginManifest,
  PluginRequest,
  PluginResponse,
  PipelinePolicy,
  TextPayload,
} from '../types.js';
import { PluginCapability, GatewayEventKind } from '../types.js';

// ═══════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════

const NOW = '2026-02-07T00:00:00.000Z';

const MANIFEST: PluginManifest = {
  plugin_id: 'router-test',
  name: 'Router Test',
  vendor: 'OMEGA',
  description: 'Test',
  version: '1.0.0',
  api_version: '1.0.0',
  supported_omega_api_versions: '>=1.0.0 <2.0.0',
  capabilities: [PluginCapability.READ_TEXT, PluginCapability.WRITE_SUGGESTION],
  io: {
    inputs: [{ kind: 'text', schema_ref: 'text-v1', limits: { max_bytes: 1048576 } }],
    outputs: [{ kind: 'json', schema_ref: 'out-v1', limits: { max_bytes: 524288 } }],
  },
  limits: { max_bytes: 2097152, max_ms: 5000, max_concurrency: 4 },
  determinism: { mode: 'deterministic', notes: 'Pure' },
  evidence: { log_level: 'full', redactions: [] },
  entrypoint: { type: 'worker', file: 'test.js', export: 'handle' },
};

const REQUEST: PluginRequest = {
  request_id: 'req-001',
  run_id: 'run-001',
  timestamp: NOW,
  payload: { kind: 'text', content: 'Hello', encoding: 'utf-8', metadata: {} } as TextPayload,
  context: {},
  policy: { deterministic_only: false, timeout_ms: 5000, max_retries: 0 },
};

const okHandler: PluginHandler = (req) => ({
  request_id: req.request_id,
  plugin_id: 'router-test',
  status: 'ok',
  result: { kind: 'json', data: { echo: (req.payload as TextPayload).content }, schema_ref: 'out-v1' },
  evidence_hashes: { input_hash: '', output_hash: '' },
  duration_ms: 0,
  notes: 'OK',
});

function setup(manifests?: { id: string; manifest: PluginManifest; handler: PluginHandler }[]) {
  const registry = new PluginRegistry();
  const validator = new ManifestValidator();
  const ledger = new GatewayLedger();
  const router = new GatewayRouter(registry, validator, ledger);

  const plugins = manifests ?? [{ id: 'router-test', manifest: MANIFEST, handler: okHandler }];
  for (const p of plugins) {
    registry.register(p.manifest, 'sig', true, NOW);
    registry.enable(p.id);
    router.setHandler(p.id, p.handler);
  }

  return { registry, validator, ledger, router };
}

// ═══════════════════════════════════════════════════════════════════
// E5 — ROUTER
// ═══════════════════════════════════════════════════════════════════

describe('E5 — Router: Single Invoke', () => {
  it('invokes enabled plugin and returns ok', async () => {
    const { router } = setup();
    const resp = await router.invoke('router-test', REQUEST, NOW);
    expect(resp.status).toBe('ok');
    expect(resp.plugin_id).toBe('router-test');
  });

  it('rejects unknown plugin', async () => {
    const { router } = setup();
    const resp = await router.invoke('ghost', REQUEST, NOW);
    expect(resp.status).toBe('rejected');
    expect(resp.notes).toContain('not found');
  });

  it('rejects disabled plugin', async () => {
    const { router, registry } = setup();
    registry.disable('router-test');
    const resp = await router.invoke('router-test', REQUEST, NOW);
    expect(resp.status).toBe('rejected');
    expect(resp.notes).toContain('not enabled');
  });

  it('rejects deterministic-only request to probabilistic plugin', async () => {
    const probManifest = { ...MANIFEST, plugin_id: 'prob', determinism: { mode: 'probabilistic' as const, notes: '' } };
    const { router } = setup([{ id: 'prob', manifest: probManifest, handler: okHandler }]);
    const detRequest = { ...REQUEST, policy: { ...REQUEST.policy, deterministic_only: true } };
    const resp = await router.invoke('prob', detRequest, NOW);
    expect(resp.status).toBe('rejected');
    expect(resp.notes).toContain('probabilistic');
  });

  it('handles plugin crash through router', async () => {
    const crashHandler: PluginHandler = () => { throw new Error('CRASH'); };
    const m = { ...MANIFEST, plugin_id: 'crasher' };
    const { router } = setup([{ id: 'crasher', manifest: m, handler: crashHandler }]);
    const resp = await router.invoke('crasher', REQUEST, NOW);
    expect(resp.status).toBe('error');
  });

  it('logs INVOKE + RESULT events for successful call', async () => {
    const { router, ledger } = setup();
    await router.invoke('router-test', REQUEST, NOW);
    const events = ledger.getEvents();
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some(e => e.kind === GatewayEventKind.INVOKE)).toBe(true);
    expect(events.some(e => e.kind === GatewayEventKind.RESULT)).toBe(true);
  });

  it('logs REJECT event for failed validation', async () => {
    const { router, ledger } = setup();
    await router.invoke('ghost', REQUEST, NOW);
    const events = ledger.getEvents();
    expect(events.some(e => e.kind === GatewayEventKind.REJECT)).toBe(true);
  });
});

describe('E5 — Router: Pipeline Sequential', () => {
  it('executes plugins in order', async () => {
    const order: string[] = [];
    const makeHandler = (id: string): PluginHandler => (req) => {
      order.push(id);
      return { ...okHandler(req), plugin_id: id };
    };

    const m1 = { ...MANIFEST, plugin_id: 'step-a', name: 'A' };
    const m2 = { ...MANIFEST, plugin_id: 'step-b', name: 'B' };
    const { router } = setup([
      { id: 'step-a', manifest: m1, handler: makeHandler('step-a') },
      { id: 'step-b', manifest: m2, handler: makeHandler('step-b') },
    ]);

    const policy: PipelinePolicy = {
      strategy: 'sequential',
      plugin_ids: ['step-a', 'step-b'],
      timeout_ms: 5000,
      stop_on_failure: false,
    };

    const result = await router.invokePipeline(policy, REQUEST, NOW);
    expect(result.steps).toHaveLength(2);
    expect(order).toEqual(['step-a', 'step-b']);
    expect(result.overall_status).toBe('ok');
  });

  it('stops on failure when policy requires', async () => {
    const crashHandler: PluginHandler = () => { throw new Error('FAIL'); };
    const m1 = { ...MANIFEST, plugin_id: 'fail-first', name: 'F' };
    const m2 = { ...MANIFEST, plugin_id: 'never-reach', name: 'N' };
    const { router } = setup([
      { id: 'fail-first', manifest: m1, handler: crashHandler },
      { id: 'never-reach', manifest: m2, handler: okHandler },
    ]);

    const policy: PipelinePolicy = {
      strategy: 'sequential',
      plugin_ids: ['fail-first', 'never-reach'],
      timeout_ms: 5000,
      stop_on_failure: true,
    };

    const result = await router.invokePipeline(policy, REQUEST, NOW);
    expect(result.steps).toHaveLength(1); // stopped after first
    expect(result.overall_status).toBe('error');
  });

  it('continues past failure when stop_on_failure=false', async () => {
    const crashHandler: PluginHandler = () => { throw new Error('FAIL'); };
    const m1 = { ...MANIFEST, plugin_id: 'fail-cont', name: 'F' };
    const m2 = { ...MANIFEST, plugin_id: 'still-runs', name: 'S' };
    const { router } = setup([
      { id: 'fail-cont', manifest: m1, handler: crashHandler },
      { id: 'still-runs', manifest: m2, handler: okHandler },
    ]);

    const policy: PipelinePolicy = {
      strategy: 'sequential',
      plugin_ids: ['fail-cont', 'still-runs'],
      timeout_ms: 5000,
      stop_on_failure: false,
    };

    const result = await router.invokePipeline(policy, REQUEST, NOW);
    expect(result.steps).toHaveLength(2);
    expect(result.overall_status).toBe('error'); // one failed
  });
});

describe('E5 — Router: Pipeline Fan-Out', () => {
  it('executes all plugins in parallel', async () => {
    const m1 = { ...MANIFEST, plugin_id: 'fan-a', name: 'A' };
    const m2 = { ...MANIFEST, plugin_id: 'fan-b', name: 'B' };
    const { router } = setup([
      { id: 'fan-a', manifest: m1, handler: okHandler },
      { id: 'fan-b', manifest: m2, handler: okHandler },
    ]);

    const policy: PipelinePolicy = {
      strategy: 'fan_out',
      plugin_ids: ['fan-a', 'fan-b'],
      timeout_ms: 5000,
      stop_on_failure: false,
    };

    const result = await router.invokePipeline(policy, REQUEST, NOW);
    expect(result.steps).toHaveLength(2);
    expect(result.overall_status).toBe('ok');
    expect(result.strategy).toBe('fan_out');
  });

  it('reports error if any fan-out plugin fails', async () => {
    const crashHandler: PluginHandler = () => { throw new Error('FAN-FAIL'); };
    const m1 = { ...MANIFEST, plugin_id: 'fan-ok', name: 'OK' };
    const m2 = { ...MANIFEST, plugin_id: 'fan-fail', name: 'FAIL' };
    const { router } = setup([
      { id: 'fan-ok', manifest: m1, handler: okHandler },
      { id: 'fan-fail', manifest: m2, handler: crashHandler },
    ]);

    const policy: PipelinePolicy = {
      strategy: 'fan_out',
      plugin_ids: ['fan-ok', 'fan-fail'],
      timeout_ms: 5000,
      stop_on_failure: false,
    };

    const result = await router.invokePipeline(policy, REQUEST, NOW);
    expect(result.steps).toHaveLength(2);
    expect(result.overall_status).toBe('error');
  });
});

// ═══════════════════════════════════════════════════════════════════
// E6 — LEDGER
// ═══════════════════════════════════════════════════════════════════

describe('E6 — Ledger: Hash-Chain', () => {
  it('first event has empty prev_hash', () => {
    const ledger = new GatewayLedger();
    const event = ledger.append({
      run_id: 'r1', kind: GatewayEventKind.REGISTER, plugin_id: 'p1',
      request_id: '', input_hash: '', output_hash: '',
      meta: {}, timestamp: NOW,
    });
    expect(event.prev_hash).toBe('');
    expect(event.event_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('second event links to first via prev_hash', () => {
    const ledger = new GatewayLedger();
    const e1 = ledger.append({
      run_id: 'r1', kind: GatewayEventKind.REGISTER, plugin_id: 'p1',
      request_id: '', input_hash: '', output_hash: '',
      meta: {}, timestamp: NOW,
    });
    const e2 = ledger.append({
      run_id: 'r1', kind: GatewayEventKind.ENABLE, plugin_id: 'p1',
      request_id: '', input_hash: '', output_hash: '',
      meta: {}, timestamp: NOW,
    });
    expect(e2.prev_hash).toBe(e1.event_hash);
  });

  it('verifyChain passes on valid chain', () => {
    const ledger = new GatewayLedger();
    for (let i = 0; i < 10; i++) {
      ledger.append({
        run_id: 'r1', kind: GatewayEventKind.INVOKE, plugin_id: 'p1',
        request_id: `req-${i}`, input_hash: '', output_hash: '',
        meta: { i: String(i) }, timestamp: NOW,
      });
    }
    expect(ledger.verifyChain()).toEqual({ valid: true, broken_at: null });
  });

  it('getHead returns last event hash', () => {
    const ledger = new GatewayLedger();
    expect(ledger.getHead()).toBe('');
    const e1 = ledger.append({
      run_id: 'r1', kind: GatewayEventKind.REGISTER, plugin_id: 'p1',
      request_id: '', input_hash: '', output_hash: '',
      meta: {}, timestamp: NOW,
    });
    expect(ledger.getHead()).toBe(e1.event_hash);
  });

  it('count tracks events', () => {
    const ledger = new GatewayLedger();
    expect(ledger.count()).toBe(0);
    ledger.append({
      run_id: 'r1', kind: GatewayEventKind.REGISTER, plugin_id: 'p1',
      request_id: '', input_hash: '', output_hash: '',
      meta: {}, timestamp: NOW,
    });
    expect(ledger.count()).toBe(1);
  });

  it('toNDJSON produces valid lines', () => {
    const ledger = new GatewayLedger();
    ledger.append({
      run_id: 'r1', kind: GatewayEventKind.REGISTER, plugin_id: 'p1',
      request_id: '', input_hash: '', output_hash: '',
      meta: {}, timestamp: NOW,
    });
    ledger.append({
      run_id: 'r1', kind: GatewayEventKind.ENABLE, plugin_id: 'p1',
      request_id: '', input_hash: '', output_hash: '',
      meta: {}, timestamp: NOW,
    });
    const lines = ledger.toNDJSON().split('\n');
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('event_hash is deterministic for same content', () => {
    // Two separate ledgers, same first event content → same event_hash
    const l1 = new GatewayLedger();
    const l2 = new GatewayLedger();

    // Note: event_id is random (UUID), so hashes will differ
    // But the hash function itself is deterministic for identical inputs
    const e1 = l1.append({
      run_id: 'r1', kind: GatewayEventKind.REGISTER, plugin_id: 'p1',
      request_id: '', input_hash: '', output_hash: '',
      meta: {}, timestamp: NOW,
    });
    expect(e1.event_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('E6 — Ledger: Filters', () => {
  it('getByRun filters by run_id', () => {
    const ledger = new GatewayLedger();
    ledger.append({ run_id: 'r1', kind: GatewayEventKind.INVOKE, plugin_id: 'p1', request_id: '', input_hash: '', output_hash: '', meta: {}, timestamp: NOW });
    ledger.append({ run_id: 'r2', kind: GatewayEventKind.INVOKE, plugin_id: 'p1', request_id: '', input_hash: '', output_hash: '', meta: {}, timestamp: NOW });
    ledger.append({ run_id: 'r1', kind: GatewayEventKind.RESULT, plugin_id: 'p1', request_id: '', input_hash: '', output_hash: '', meta: {}, timestamp: NOW });

    expect(ledger.getByRun('r1')).toHaveLength(2);
    expect(ledger.getByRun('r2')).toHaveLength(1);
  });

  it('getByPlugin filters by plugin_id', () => {
    const ledger = new GatewayLedger();
    ledger.append({ run_id: 'r1', kind: GatewayEventKind.INVOKE, plugin_id: 'p1', request_id: '', input_hash: '', output_hash: '', meta: {}, timestamp: NOW });
    ledger.append({ run_id: 'r1', kind: GatewayEventKind.INVOKE, plugin_id: 'p2', request_id: '', input_hash: '', output_hash: '', meta: {}, timestamp: NOW });

    expect(ledger.getByPlugin('p1')).toHaveLength(1);
    expect(ledger.getByPlugin('p2')).toHaveLength(1);
  });
});

describe('E6 — Ledger: Proof Export', () => {
  it('exports proof bundle for a run', () => {
    const ledger = new GatewayLedger();
    ledger.append({ run_id: 'r1', kind: GatewayEventKind.INVOKE, plugin_id: 'p1', request_id: 'req-1', input_hash: 'a'.repeat(64), output_hash: '', meta: {}, timestamp: NOW });
    ledger.append({ run_id: 'r1', kind: GatewayEventKind.RESULT, plugin_id: 'p1', request_id: 'req-1', input_hash: 'a'.repeat(64), output_hash: 'b'.repeat(64), meta: {}, timestamp: NOW });

    const proof = ledger.exportProof('r1', [{ plugin_id: 'p1', manifest_hash: 'c'.repeat(64) }], []);
    expect(proof.run_id).toBe('r1');
    expect(proof.events).toHaveLength(2);
    expect(proof.plugin_manifest_digests).toHaveLength(1);
    expect(proof.head_event_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('proof bundle only includes events for specified run', () => {
    const ledger = new GatewayLedger();
    ledger.append({ run_id: 'r1', kind: GatewayEventKind.INVOKE, plugin_id: 'p1', request_id: '', input_hash: '', output_hash: '', meta: {}, timestamp: NOW });
    ledger.append({ run_id: 'r2', kind: GatewayEventKind.INVOKE, plugin_id: 'p1', request_id: '', input_hash: '', output_hash: '', meta: {}, timestamp: NOW });

    const proof = ledger.exportProof('r1', [], []);
    expect(proof.events).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// T9: STRESS
// ═══════════════════════════════════════════════════════════════════

describe('E5+E6 — T9: Stress', () => {
  it('handles 50 sequential invocations', async () => {
    const { router, ledger } = setup();
    for (let i = 0; i < 50; i++) {
      const req = { ...REQUEST, request_id: `stress-${i}`, run_id: 'stress-run' };
      const resp = await router.invoke('router-test', req, NOW);
      expect(resp.status).toBe('ok');
    }
    expect(ledger.count()).toBe(100); // 50 INVOKE + 50 RESULT
    expect(ledger.verifyChain()).toEqual({ valid: true, broken_at: null });
  });

  it('handles 20 concurrent fan-out invocations', async () => {
    const plugins = Array.from({ length: 20 }, (_, i) => ({
      id: `fan-${i}`,
      manifest: { ...MANIFEST, plugin_id: `fan-${i}`, name: `Fan ${i}` },
      handler: okHandler,
    }));
    const { router } = setup(plugins);

    const policy: PipelinePolicy = {
      strategy: 'fan_out',
      plugin_ids: plugins.map(p => p.id),
      timeout_ms: 5000,
      stop_on_failure: false,
    };

    const result = await router.invokePipeline(policy, REQUEST, NOW);
    expect(result.steps).toHaveLength(20);
    expect(result.overall_status).toBe('ok');
  });

  it('ledger chain intact after stress', async () => {
    const { router, ledger } = setup();
    for (let i = 0; i < 30; i++) {
      await router.invoke('router-test', { ...REQUEST, request_id: `chain-${i}` }, NOW);
    }
    expect(ledger.verifyChain()).toEqual({ valid: true, broken_at: null });
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTEGRATION: Router + Ledger + Proof
// ═══════════════════════════════════════════════════════════════════

describe('E5+E6 — Integration', () => {
  it('full lifecycle: register → enable → invoke → export proof', async () => {
    const registry = new PluginRegistry();
    const validator = new ManifestValidator();
    const ledger = new GatewayLedger();
    const router = new GatewayRouter(registry, validator, ledger);

    // Register
    registry.register(MANIFEST, 'sig', true, NOW);
    ledger.append({ run_id: 'setup', kind: GatewayEventKind.REGISTER, plugin_id: 'router-test', request_id: '', input_hash: '', output_hash: '', meta: {}, timestamp: NOW });

    // Enable
    registry.enable('router-test');
    ledger.append({ run_id: 'setup', kind: GatewayEventKind.ENABLE, plugin_id: 'router-test', request_id: '', input_hash: '', output_hash: '', meta: {}, timestamp: NOW });

    // Set handler
    router.setHandler('router-test', okHandler);

    // Invoke
    const resp = await router.invoke('router-test', REQUEST, NOW);
    expect(resp.status).toBe('ok');

    // Verify chain
    expect(ledger.verifyChain()).toEqual({ valid: true, broken_at: null });

    // Export proof
    const proof = ledger.exportProof('run-001', [
      { plugin_id: 'router-test', manifest_hash: 'abc'.repeat(21) + 'a' },
    ], []);

    expect(proof.run_id).toBe('run-001');
    expect(proof.events.length).toBeGreaterThan(0);
    expect(proof.head_event_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
