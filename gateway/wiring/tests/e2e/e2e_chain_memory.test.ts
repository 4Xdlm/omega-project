// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — E2E TESTS: MEMORY CHAIN WITH PROOF CRYSTAL
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// BAPTÊME DU FEU: Test E2E complet de la chaîne Memory
//
// Ce test prouve la chaîne complète:
//   GatewayAdapter → Envelope → Orchestrator → Registry → MemoryAdapter → Chronicle
//
// Le résultat est un ProofCrystal — une preuve cryptographique portable.
//
// @invariant INV-E2E-01: Chronicle has start event
// @invariant INV-E2E-02: Chronicle has terminal event
// @invariant INV-E2E-03: Result is typed
// @invariant INV-E2E-04: Determinism proven
// @invariant INV-E2E-05: Causality verified
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { FixedClock } from '../../src/clock.js';
import { HandlerRegistry } from '../../src/orchestrator/registry.js';
import { GatewayAdapter, createOmegaGatewayAdapter } from '../../src/adapters/gateway_adapter.js';
import { MemoryAdapter } from '../../src/adapters/memory_adapter.js';
import { ProofCrystallizer, createCrystallizer } from '../../src/proof/crystallizer.js';
import type { NexusEnvelope, IdFactory } from '../../src/types.js';
import { isOk, isErr } from '../../src/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

class IncrementalIds implements IdFactory {
  private counter = 0;
  newId(): string {
    return `id-${++this.counter}`;
  }
}

interface MockMemoryStack {
  write(input: { key: string; value: unknown; expected_previous_hash?: string | null }): Promise<{ hash: string }>;
  readLatest(input: { key: string }): Promise<{ value: unknown; hash: string }>;
  readByHash(input: { hash: string }): Promise<{ value: unknown; key: string }>;
  listKeys(input: { prefix?: string }): Promise<{ keys: string[] }>;
}

function createMockMemoryStack(): { stack: MockMemoryStack; calls: any[] } {
  const calls: any[] = [];
  const storage = new Map<string, { value: unknown; hash: string }>();

  const stack: MockMemoryStack = {
    async write(input) {
      calls.push({ method: 'write', input });
      // Hash déterministe basé sur key+value (pas un compteur)
      const hash = `HASH_${input.key}_${JSON.stringify(input.value)}`.replace(/[^a-zA-Z0-9]/g, '_');
      storage.set(input.key, { value: input.value, hash });
      return { hash };
    },
    async readLatest(input) {
      calls.push({ method: 'readLatest', input });
      const entry = storage.get(input.key);
      if (!entry) {
        throw new Error(`Key not found: ${input.key}`);
      }
      return entry;
    },
    async readByHash(input) {
      calls.push({ method: 'readByHash', input });
      for (const [key, entry] of storage) {
        if (entry.hash === input.hash) {
          return { value: entry.value, key };
        }
      }
      throw new Error(`Hash not found: ${input.hash}`);
    },
    async listKeys(input) {
      calls.push({ method: 'listKeys', input });
      const prefix = input.prefix ?? '';
      const keys = Array.from(storage.keys()).filter(k => k.startsWith(prefix));
      return { keys };
    },
  };

  return { stack, calls };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('E2E Chain — Memory (Proof Crystal)', () => {
  const MEMORY_VERSION = 'memory@3.21.0';
  const QUERY_VERSION = 'query@3.21.0';

  let clock: FixedClock;
  let ids: IncrementalIds;
  let registry: HandlerRegistry;
  let mockStack: ReturnType<typeof createMockMemoryStack>;
  let gatewayAdapter: GatewayAdapter;
  let crystallizer: ProofCrystallizer;

  beforeEach(() => {
    clock = new FixedClock(1704499200000);
    ids = new IncrementalIds();
    registry = new HandlerRegistry();
    mockStack = createMockMemoryStack();

    // Register Memory handler
    registry.register('memory', MEMORY_VERSION, 
      new MemoryAdapter(mockStack.stack as any, MEMORY_VERSION), {
        schemas: ['memory.write', 'memory.readLatest', 'memory.readByHash', 'memory.listKeys'],
        kinds: ['command', 'query'],
      }
    );

    // Create Gateway adapter
    gatewayAdapter = createOmegaGatewayAdapter(clock, ids, {
      memory: MEMORY_VERSION,
      query: QUERY_VERSION,
    });

    // Create Crystallizer
    crystallizer = createCrystallizer({
      clock,
      registry,
      determinismRuns: 3,
      performanceRuns: 50,
      defaultTags: ['e2e', 'memory'],
    });
  });

  describe('memory.write chain', () => {
    it('crystallizes complete write flow', async () => {
      const crystal = await crystallizer.crystallize({
        name: 'memory.write-basic',
        description: 'Basic memory write operation',
        tags: ['write'],
        envelopeGenerator: (runIndex) => {
          // Use constant data for determinism (runIndex only affects replay_protection_key)
          const input = { kind: 'memory.write' as const, key: 'test-key', value: { data: 'constant' } };
          const result = gatewayAdapter.build(input, {
            trace_id: `trace-write`,
          });
          if (!result.ok) throw new Error('Failed to build envelope');
          // Override replay_protection_key to be unique per run (for replay guard)
          // but the rest stays constant for determinism proof
          return {
            ...result.value.envelope,
            replay_protection_key: `rpk-${runIndex}`,
            message_id: `msg-${runIndex}`, // Also unique per run
          };
        },
        invariants: [
          {
            id: 'INV-MEM-WRITE-01',
            name: 'Write returns hash',
            check: (result) => isOk(result) && typeof (result.value as any)?.hash === 'string',
          },
        ],
        validateResult: (result) => isOk(result),
      });

      // Verify crystal
      expect(crystal.verdict).toBe('CRYSTALLIZED');
      expect(crystal.determinismFingerprint.proven).toBe(true);
      expect(crystal.causalityVerification.valid).toBe(true);

      // Verify all invariants passed
      for (const inv of crystal.invariants) {
        expect(inv.status).toBe('PASS');
      }

      // Verify performance profile
      expect(crystal.performanceProfile.n).toBe(50);
      expect(crystal.performanceProfile.p50).toBeGreaterThanOrEqual(0);
      expect(crystal.performanceProfile.p99).toBeGreaterThanOrEqual(crystal.performanceProfile.p50);

      // Verify offline
      const verification = ProofCrystallizer.verifyCrystal(crystal);
      expect(verification.valid).toBe(true);
      expect(verification.errors).toHaveLength(0);
    });
  });

  describe('memory.readLatest chain', () => {
    it('crystallizes complete read flow', async () => {
      // Pre-populate storage
      await mockStack.stack.write({ key: 'existing-key', value: { cached: true } });

      const crystal = await crystallizer.crystallize({
        name: 'memory.readLatest-basic',
        description: 'Basic memory read operation',
        tags: ['read'],
        envelopeGenerator: (runIndex) => {
          const input = { kind: 'memory.readLatest' as const, key: 'existing-key' };
          const result = gatewayAdapter.build(input, {
            trace_id: `trace-read-${runIndex}`,
          });
          if (!result.ok) throw new Error('Failed to build envelope');
          return result.value.envelope;
        },
        invariants: [
          {
            id: 'INV-MEM-READ-01',
            name: 'Read returns value and hash',
            check: (result) => {
              if (!isOk(result)) return false;
              const val = result.value as any;
              return typeof val?.hash === 'string' && val?.value !== undefined;
            },
          },
        ],
        validateResult: (result) => isOk(result),
      });

      expect(crystal.verdict).toBe('CRYSTALLIZED');
      expect(crystal.determinismFingerprint.proven).toBe(true);

      const verification = ProofCrystallizer.verifyCrystal(crystal);
      expect(verification.valid).toBe(true);
    });
  });

  describe('memory.listKeys chain', () => {
    it('crystallizes listKeys flow', async () => {
      // Pre-populate storage
      await mockStack.stack.write({ key: 'prefix:a', value: 1 });
      await mockStack.stack.write({ key: 'prefix:b', value: 2 });
      await mockStack.stack.write({ key: 'other:c', value: 3 });

      const crystal = await crystallizer.crystallize({
        name: 'memory.listKeys-prefix',
        description: 'List keys with prefix filter',
        tags: ['list'],
        envelopeGenerator: (runIndex) => {
          const input = { kind: 'memory.listKeys' as const, prefix: 'prefix:' };
          const result = gatewayAdapter.build(input, {
            trace_id: `trace-list-${runIndex}`,
          });
          if (!result.ok) throw new Error('Failed to build envelope');
          return result.value.envelope;
        },
        invariants: [
          {
            id: 'INV-MEM-LIST-01',
            name: 'Returns array of keys',
            check: (result) => isOk(result) && Array.isArray((result.value as any)?.keys),
          },
          {
            id: 'INV-MEM-LIST-02',
            name: 'Only returns matching prefix',
            check: (result) => {
              if (!isOk(result)) return false;
              const keys = (result.value as any)?.keys as string[];
              return keys.every(k => k.startsWith('prefix:'));
            },
          },
        ],
      });

      expect(crystal.verdict).toBe('CRYSTALLIZED');

      // Verify prefix filtering worked
      const inv = crystal.invariants.find(i => i.id === 'INV-MEM-LIST-02');
      expect(inv?.status).toBe('PASS');
    });
  });

  describe('Chronicle integrity', () => {
    it('proves complete chronicle chain', async () => {
      const crystal = await crystallizer.crystallize({
        name: 'chronicle-integrity',
        description: 'Verify chronicle records complete flow',
        envelopeGenerator: (runIndex) => {
          // Données constantes pour le déterminisme
          const input = { kind: 'memory.write' as const, key: 'chronicle-key', value: { test: 'constant' } };
          const result = gatewayAdapter.build(input, {
            trace_id: 'trace-chronicle',
          });
          if (!result.ok) throw new Error('Failed to build envelope');
          return {
            ...result.value.envelope,
            replay_protection_key: `rpk-chron-${runIndex}`,
            message_id: `msg-chron-${runIndex}`,
          };
        },
        invariants: [
          {
            id: 'INV-CHRON-RECEIVED',
            name: 'Has DISPATCH_RECEIVED',
            check: (_, chr) => chr.some(r => r.event_type === 'DISPATCH_RECEIVED'),
          },
          {
            id: 'INV-CHRON-VALIDATION',
            name: 'Has VALIDATION_OK',
            check: (_, chr) => chr.some(r => r.event_type === 'VALIDATION_OK'),
          },
          {
            id: 'INV-CHRON-RESOLVED',
            name: 'Has HANDLER_RESOLVED',
            check: (_, chr) => chr.some(r => r.event_type === 'HANDLER_RESOLVED'),
          },
          {
            id: 'INV-CHRON-EXEC-START',
            name: 'Has EXECUTION_START',
            check: (_, chr) => chr.some(r => r.event_type === 'EXECUTION_START'),
          },
          {
            id: 'INV-CHRON-EXEC-OK',
            name: 'Has EXECUTION_OK',
            check: (_, chr) => chr.some(r => r.event_type === 'EXECUTION_OK'),
          },
          {
            id: 'INV-CHRON-COMPLETE',
            name: 'Has DISPATCH_COMPLETE',
            check: (_, chr) => chr.some(r => r.event_type === 'DISPATCH_COMPLETE'),
          },
        ],
      });

      expect(crystal.verdict).toBe('CRYSTALLIZED');

      // All chronicle invariants must pass
      const chronInvariants = crystal.invariants.filter(i => i.id.startsWith('INV-CHRON-'));
      expect(chronInvariants.length).toBeGreaterThanOrEqual(6);
      for (const inv of chronInvariants) {
        expect(inv.status).toBe('PASS');
      }
    });
  });

  describe('Merkle tree integrity', () => {
    it('produces verifiable Merkle tree', async () => {
      const crystal = await crystallizer.crystallize({
        name: 'merkle-tree-test',
        description: 'Verify Merkle tree construction',
        envelopeGenerator: (runIndex) => {
          const input = { kind: 'memory.write' as const, key: 'merkle-key', value: { run: runIndex } };
          const result = gatewayAdapter.build(input, {
            trace_id: `trace-merkle-${runIndex}`,
          });
          if (!result.ok) throw new Error('Failed to build envelope');
          return result.value.envelope;
        },
      });

      // Verify Merkle structure
      expect(crystal.merkleNodes.length).toBeGreaterThan(0);
      expect(crystal.merkleRoot).toBeDefined();
      expect(crystal.merkleRoot.length).toBe(64); // SHA-256 hex

      // Verify parent chain
      for (let i = 1; i < crystal.merkleNodes.length; i++) {
        expect(crystal.merkleNodes[i].parentHash).toBe(crystal.merkleNodes[i - 1].hash);
      }

      // First node has no parent
      expect(crystal.merkleNodes[0].parentHash).toBeNull();
    });
  });

  describe('Causality matrix', () => {
    it('proves temporal ordering', async () => {
      const crystal = await crystallizer.crystallize({
        name: 'causality-test',
        description: 'Verify causal ordering of events',
        envelopeGenerator: (runIndex) => {
          const input = { kind: 'memory.write' as const, key: 'causal-key', value: runIndex };
          const result = gatewayAdapter.build(input, {
            trace_id: `trace-causal-${runIndex}`,
          });
          if (!result.ok) throw new Error('Failed to build envelope');
          return result.value.envelope;
        },
      });

      // Causality must be valid
      expect(crystal.causalityVerification.valid).toBe(true);
      expect(crystal.causalityVerification.violations).toHaveLength(0);
      expect(crystal.causalityVerification.score).toBe(1);

      // Matrix should have correct dimensions
      const n = crystal.merkleNodes.length;
      expect(crystal.causalityMatrix.length).toBe(n);
      for (const row of crystal.causalityMatrix) {
        expect(row.length).toBe(n);
      }
    });
  });

  describe('Performance profiling', () => {
    it('captures statistical distribution', async () => {
      const crystal = await crystallizer.crystallize({
        name: 'perf-profile-test',
        description: 'Capture performance distribution',
        envelopeGenerator: (runIndex) => {
          const input = { kind: 'memory.write' as const, key: `perf-key-${runIndex}`, value: runIndex };
          const result = gatewayAdapter.build(input, {
            trace_id: `trace-perf-${runIndex}`,
          });
          if (!result.ok) throw new Error('Failed to build envelope');
          return result.value.envelope;
        },
      }, {
        performanceRuns: 100,
      });

      const perf = crystal.performanceProfile;

      // Verify statistical metrics
      expect(perf.n).toBe(100);
      expect(perf.mean).toBeGreaterThanOrEqual(0);
      expect(perf.stddev).toBeGreaterThanOrEqual(0);
      expect(perf.min).toBeLessThanOrEqual(perf.max);

      // Percentiles should be monotonic
      expect(perf.p50).toBeLessThanOrEqual(perf.p75);
      expect(perf.p75).toBeLessThanOrEqual(perf.p90);
      expect(perf.p90).toBeLessThanOrEqual(perf.p95);
      expect(perf.p95).toBeLessThanOrEqual(perf.p99);
      expect(perf.p99).toBeLessThanOrEqual(perf.p999);

      // CI should contain mean
      expect(perf.ci95.lower).toBeLessThanOrEqual(perf.mean);
      expect(perf.ci95.upper).toBeGreaterThanOrEqual(perf.mean);

      // Distribution should be detected
      expect(['normal', 'bimodal', 'heavy-tail', 'uniform', 'unknown']).toContain(perf.distribution);
    });
  });
});
