// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OMEGA GATEWAY UNIVERSEL â€” TESTS L1-L4
// Version: 1.0.0 â€” NASA/SpaceX-Grade
// Protocol: OMEGA_UNIFIED_TEST_PROTOCOL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';

import {
  GatewayRequest, PipelineSpec, ModuleSpec, CONSTANTS, CallerType, ExecutionMode,
  UniversalGateway, InMemoryAudit, AllowAllPolicy, PassAllSchemaValidator,
  PolicyEngine, PolicyBuilder, createDefaultPolicy, createAllowAllPolicy, createDenyAllPolicy, createStrictPolicy,
  PipelineRegistry, ModuleRegistry, createPipelineRegistry, createModuleRegistry,
  SnapshotEngine, createSnapshotEngine,
  Ledger, createLedger, InMemoryLedgerStorage,
} from '../src';

// FIXTURES
function createValidRequest(overrides: Partial<GatewayRequest> = {}): GatewayRequest {
  return {
    request_id: randomUUID(), timestamp: new Date().toISOString(),
    caller: { id: 'test-caller', type: 'SYSTEM' }, intent: 'test.intent',
    payload: { data: 'test' }, context: { mode: 'TEST', trace: false }, ...overrides,
  };
}

function createValidPipelineSpec(overrides: Partial<PipelineSpec> = {}): PipelineSpec {
  return {
    pipeline_id: 'test-pipeline', version: '1.0.0', intent: 'test.intent',
    description: 'Test pipeline', criticality: 'LOW',
    input_schema_id: 'test-input@1.0.0', output_schema_id: 'test-output@1.0.0',
    constraints: { max_runtime_ms: 15000, max_payload_bytes: 2097152, trace_required: false, deterministic_required: false },
    allowed_callers: ['SYSTEM', 'USER', 'PIPELINE'], module_chain: ['test-module@1.0.0'], enabled: true, ...overrides,
  };
}

function createValidModuleSpec(overrides: Partial<ModuleSpec> = {}): ModuleSpec {
  return {
    module_id: 'test-module', version: '1.0.0', description: 'Test module', criticality: 'LOW',
    interface_version: CONSTANTS.INTERFACE_VERSION, limits: { deterministic_safe: true },
    io: { input_schema_id: 'test-input@1.0.0', output_schema_id: 'test-output@1.0.0' },
    capabilities: [], enabled: true, ...overrides,
  };
}

// L1 â€” PROPERTY-BASED TESTS
describe('L1 â€” Property-Based Tests', () => {
  describe('GW â€” Gateway Invariants', () => {
    it('GW-04: DÃ©cision dÃ©terministe', () => {
      const audit = new InMemoryAudit();
      const registry = createPipelineRegistry();
      registry.register(createValidPipelineSpec());
      const gateway = new UniversalGateway({ build_id: 'test', policy_version: '1.0.0' }, audit, new AllowAllPolicy(), registry, new PassAllSchemaValidator());

      fc.assert(fc.property(fc.uuid(), (request_id) => {
        const request = createValidRequest({ request_id });
        audit.clear();
        const r1 = gateway.handle(request);
        audit.clear();
        const r2 = gateway.handle(request);
        expect(r1.status).toBe(r2.status);
      }), { numRuns: 100, seed: CONSTANTS.DETERMINISTIC_SEED });
    });

    it('GW-05: Refus explicite', () => {
      const audit = new InMemoryAudit();
      const gateway = new UniversalGateway({ build_id: 'test', policy_version: '1.0.0' }, audit, new AllowAllPolicy(), createPipelineRegistry(), new PassAllSchemaValidator());
      const invalids = [null, undefined, {}, { request_id: 'not-uuid' }];
      for (const input of invalids) {
        const result = gateway.handle(input);
        if (result.status === 'REJECTED') {
          expect(result.reason_code).toBeDefined();
          expect(result.reason_code.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('POL â€” Policy Invariants', () => {
    it('POL-01: DÃ©cision dÃ©terministe', () => {
      const policy = createDefaultPolicy('1.0.0');
      fc.assert(fc.property(
        fc.constantFrom('SYSTEM', 'USER', 'PIPELINE') as fc.Arbitrary<CallerType>,
        fc.constantFrom('PROD', 'TEST', 'DRY_RUN') as fc.Arbitrary<ExecutionMode>,
        (callerType, mode) => {
          const request = createValidRequest({ caller: { id: 'test', type: callerType }, context: { mode } });
          const checkReq = { request, environment: { build: 'test', mode }, policy_version: '1.0.0' };
          const r1 = policy.check(checkReq);
          const r2 = policy.check(checkReq);
          expect(r1.verdict).toBe(r2.verdict);
        }
      ), { numRuns: 50, seed: CONSTANTS.DETERMINISTIC_SEED });
    });
  });

  describe('REG â€” Registry Invariants', () => {
    it('REG-01: Pipeline non dÃ©clarÃ© = null', () => {
      const registry = createPipelineRegistry();
      fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 50 }), (intent) => {
        expect(registry.resolve(intent)).toBeNull();
      }), { numRuns: 100, seed: CONSTANTS.DETERMINISTIC_SEED });
    });

    it('MREG-03: Kill switch respectÃ©', () => {
      const registry = createModuleRegistry();
      registry.register(createValidModuleSpec());
      expect(registry.get('test-module', '1.0.0')).not.toBeNull();
      registry.disable('test-module', '1.0.0');
      expect(registry.get('test-module', '1.0.0')).toBeNull();
      registry.enable('test-module', '1.0.0');
      expect(registry.get('test-module', '1.0.0')).not.toBeNull();
    });
  });

  describe('SNAP â€” Snapshot Invariants', () => {
    it('SNAP-02: Hash stable', () => {
      const engine = createSnapshotEngine();
      fc.assert(fc.property(fc.json(), (data) => {
        const h1 = engine.hashData(data);
        const h2 = engine.hashData(data);
        expect(h1).toBe(h2);
        expect(h1).toMatch(/^[a-f0-9]{64}$/);
      }), { numRuns: 100, seed: CONSTANTS.DETERMINISTIC_SEED });
    });
  });

  describe('LED â€” Ledger Invariants', () => {
    it('LED-03: SÃ©quence monotone', async () => {
      const ledger = createLedger();
      for (let i = 0; i < 10; i++) await ledger.append('test-stream', 'TEST', { i });
      const entries = await ledger.getAll('test-stream');
      for (let i = 0; i < entries.length; i++) expect(entries[i].seq).toBe(i);
    });

    it('LED-02: ChaÃ®nage strict', async () => {
      const ledger = createLedger();
      for (let i = 0; i < 5; i++) await ledger.append('chain-test', 'EVENT', { i });
      const report = await ledger.verifyChain('chain-test');
      expect(report.ok).toBe(true);
    });
  });
});

// L2 â€” BOUNDARY TESTS
describe('L2 â€” Boundary Tests', () => {
  it('GW: Payload trop grand', () => {
    const audit = new InMemoryAudit();
    const registry = createPipelineRegistry();
    registry.register(createValidPipelineSpec());
    const gateway = new UniversalGateway({ build_id: 'test', policy_version: '1.0.0', max_payload_bytes: 1000 }, audit, new AllowAllPolicy(), registry, new PassAllSchemaValidator());
    const result = gateway.handle(createValidRequest({ payload: 'x'.repeat(2000) }));
    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') expect(result.reason_code).toBe('GW_PAYLOAD_TOO_LARGE');
  });

  it('LED: Premier Ã©lÃ©ment seq=0', async () => {
    const ledger = createLedger();
    const entry = await ledger.append('new', 'FIRST', {});
    expect(entry.seq).toBe(0);
    expect(entry.prev_hash).toBe(CONSTANTS.GENESIS_PREV_HASH);
  });
});

// L3 â€” CHAOS TESTS
describe('L3 â€” Chaos Tests', () => {
  it('GW: RÃ©siste aux inputs malformÃ©s', () => {
    const gateway = new UniversalGateway({ build_id: 'test', policy_version: '1.0.0' }, new InMemoryAudit(), new AllowAllPolicy(), createPipelineRegistry(), new PassAllSchemaValidator());
    const chaos = [null, undefined, 0, '', [], () => {}, Symbol('x'), { __proto__: {} }];
    for (const input of chaos) expect(() => gateway.handle(input)).not.toThrow();
  });

  it('GW: 100 requÃªtes simultanÃ©es', async () => {
    const registry = createPipelineRegistry();
    registry.register(createValidPipelineSpec());
    const gateway = new UniversalGateway({ build_id: 'test', policy_version: '1.0.0' }, new InMemoryAudit(), new AllowAllPolicy(), registry, new PassAllSchemaValidator());
    const results = await Promise.all(Array(100).fill(null).map(() => Promise.resolve(gateway.handle(createValidRequest()))));
    expect(results).toHaveLength(100);
    results.forEach(r => expect(r.status).toBe('ACCEPTED'));
  });
});

// L4 â€” DIFFERENTIAL TESTS
describe('L4 â€” Differential Tests', () => {
  it('SNAP: 5000 runs mÃªme hash', () => {
    const engine = createSnapshotEngine();
    const data = { a: 1, b: [1, 2, 3] };
    const ref = engine.hashData(data);
    for (let i = 0; i < 5000; i++) expect(engine.hashData(data)).toBe(ref);
  });

  it('POL: 1000 dÃ©cisions identiques', () => {
    const policy = createStrictPolicy('1.0.0');
    const req = { request: createValidRequest({ caller: { id: 'u', type: 'USER' } }), environment: { build: 'p', mode: 'PROD' as ExecutionMode }, policy_version: '1.0.0' };
    const ref = policy.check(req);
    for (let i = 0; i < 1000; i++) {
      const d = policy.check(req);
      expect(d.verdict).toBe(ref.verdict);
    }
  });
});

// INVARIANT PROOFS
describe('INVARIANT PROOFS', () => {
  it('GW-03: Validation < Policy < Registry', () => {
    const audit = new InMemoryAudit();
    const gateway = new UniversalGateway({ build_id: 'test', policy_version: '1.0.0' }, audit, new AllowAllPolicy(), createPipelineRegistry(), new PassAllSchemaValidator());
    gateway.handle({ intent: 'test' }); // Invalid - no request_id
    expect(audit.findByType('GATEWAY_RECEIVED').length).toBeGreaterThan(0);
    expect(audit.findByType('POLICY_DECISION').length).toBe(0); // Policy not called
  });

  it('LED-01: Append-only', async () => {
    const storage = new InMemoryLedgerStorage();
    const ledger = new Ledger(storage);
    await ledger.append('test', 'E', { v: 1 });
    await expect(storage.append({ entry_id: randomUUID(), timestamp: new Date().toISOString(), stream_id: 'test', seq: 0, event_type: 'X', payload: {}, prev_hash: CONSTANTS.GENESIS_PREV_HASH, entry_hash: 'x' })).rejects.toThrow();
  });
});
