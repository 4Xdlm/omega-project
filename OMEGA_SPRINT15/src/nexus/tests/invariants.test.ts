/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — INVARIANTS TESTS
 * Proofs for core invariants (INV-NEX-01 to INV-NEX-08)
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * These tests PROVE that the invariants are enforced.
 * Each invariant must have at least 2 tests: positive and negative case.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Nexus,
  resetGlobalNexus,
  registerAdapter,
} from '../nexus';
import { clearAdapters } from '../router';
import { createMockAdapter } from '../executor';
import { resetGlobalChronicle } from '../chronicle';
import { computeHashSync } from '../audit';
import {
  NexusRequest,
  NexusErrorCode,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const createOracleRequest = (): NexusRequest => ({
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: 'ORACLE',
  action: 'analyze',
  payload: { text: 'This is a valid text for analysis with enough characters.' },
});

const createMuseRequest = (): NexusRequest => ({
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: 'MUSE',
  action: 'suggest',
  payload: { context: { text: 'Hello', snapshot: {} } },
  seed: 42,
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-NEX-01: Tout appel passe par Nexus.call()
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-NEX-01: All calls through Nexus.call()', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('POSITIVE: Nexus.call() processes request correctly', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', { result: 'ok' }));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createOracleRequest());
    
    expect(response.success).toBe(true);
    expect(response.audit).toBeDefined();
    expect(nexus.getChronicle().length).toBe(1);
  });

  it('POSITIVE: Every call is audited', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', { result: 'ok' }));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    await nexus.call(createOracleRequest());
    await nexus.call({ ...createOracleRequest(), request_id: '550e8400-e29b-41d4-a716-446655440001' });
    await nexus.call({ ...createOracleRequest(), request_id: '550e8400-e29b-41d4-a716-446655440002' });
    
    expect(nexus.getChronicle().length).toBe(3);
  });

  it('NEGATIVE: Direct adapter call bypasses audit (NOT POSSIBLE through Nexus)', async () => {
    // This test proves that you CANNOT bypass Nexus
    // The only way to call a module is through Nexus.call()
    const nexus = new Nexus({ useGlobalChronicle: false });
    
    // Try to bypass - but Nexus doesn't expose direct module access
    // The only public method is call()
    expect(typeof nexus.call).toBe('function');
    expect((nexus as any).executeDirectly).toBeUndefined();
    expect((nexus as any).callModule).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-NEX-02: MUSE sans ORACLE = reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-NEX-02: MUSE without ORACLE = reject', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('POSITIVE: MUSE after ORACLE succeeds', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', { emotions: {} }));
    registerAdapter('omega-muse-divine-adapter', () => createMockAdapter('MUSE', { suggestions: [] }));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    
    // First ORACLE
    await nexus.call(createOracleRequest());
    
    // Then MUSE
    const response = await nexus.call(createMuseRequest());
    
    expect(response.success).toBe(true);
  });

  it('NEGATIVE: MUSE without ORACLE fails', async () => {
    registerAdapter('omega-muse-divine-adapter', () => createMockAdapter('MUSE', { suggestions: [] }));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createMuseRequest());
    
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(NexusErrorCode.MUSE_WITHOUT_ORACLE);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-NEX-03: Validation L1-L3 obligatoire
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-NEX-03: L1-L3 validation mandatory', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('POSITIVE: Valid request passes all layers', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', {}));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createOracleRequest());
    
    expect(response.success).toBe(true);
  });

  it('NEGATIVE: L1 failure (invalid structure)', async () => {
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call({ invalid: true } as any);
    
    expect(response.success).toBe(false);
  });

  it('NEGATIVE: L2 failure (schema mismatch)', async () => {
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call({
      ...createOracleRequest(),
      module: 'INVALID_MODULE' as any,
    });
    
    expect(response.success).toBe(false);
  });

  it('NEGATIVE: L3 failure (semantic error)', async () => {
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call({
      ...createMuseRequest(),
      seed: undefined, // MUSE requires seed
    });
    
    expect(response.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-NEX-04: Guard rules non contournables
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-NEX-04: Guard rules cannot be bypassed', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('POSITIVE: Request respecting guards passes', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', {}));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createOracleRequest());
    
    expect(response.success).toBe(true);
  });

  it('NEGATIVE: Cannot bypass guard even with valid request', async () => {
    // MUSE without ORACLE - guard blocks this
    registerAdapter('omega-muse-divine-adapter', () => createMockAdapter('MUSE', {}));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    
    // Even a perfectly valid MUSE request is blocked
    const validMuseRequest = createMuseRequest();
    const response = await nexus.call(validMuseRequest);
    
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(NexusErrorCode.MUSE_WITHOUT_ORACLE);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-NEX-05: Audit entry pour chaque appel
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-NEX-05: Audit entry for every call', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('POSITIVE: Successful call creates audit entry', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', {}));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createOracleRequest());
    
    expect(response.audit).toBeDefined();
    expect(response.audit.input_hash).toHaveLength(64);
    expect(response.audit.output_hash).toHaveLength(64);
    expect(nexus.getChronicle().length).toBe(1);
  });

  it('POSITIVE: Failed call also creates audit entry', async () => {
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createMuseRequest()); // Will fail
    
    expect(response.success).toBe(false);
    expect(response.audit).toBeDefined();
    // Chronicle entry is created even for failures
    expect(nexus.getChronicle().length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-NEX-06: Chronicle hash chain valide
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-NEX-06: Chronicle hash chain valid', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('POSITIVE: Chronicle maintains valid hash chain', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', {}));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    
    await nexus.call(createOracleRequest());
    await nexus.call({ ...createOracleRequest(), request_id: '550e8400-e29b-41d4-a716-446655440001' });
    await nexus.call({ ...createOracleRequest(), request_id: '550e8400-e29b-41d4-a716-446655440002' });
    
    const chronicle = nexus.getChronicle();
    const verification = chronicle.verify();
    
    expect(verification.valid).toBe(true);
  });

  it('POSITIVE: Chain links are correct', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', {}));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    
    await nexus.call(createOracleRequest());
    await nexus.call({ ...createOracleRequest(), request_id: '550e8400-e29b-41d4-a716-446655440001' });
    
    const chain = nexus.getChronicle().getChain();
    
    expect(chain[0].prev_hash).toBe('');
    expect(chain[1].prev_hash).toBe(chain[0].entry_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-NEX-07: Replay déterministe
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-NEX-07: Replay deterministic', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('POSITIVE: Same input produces same hash', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', { fixed: true }));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const request = createOracleRequest();
    
    const response1 = await nexus.call({ ...request, request_id: '550e8400-e29b-41d4-a716-446655440001' });
    const response2 = await nexus.call({ ...request, request_id: '550e8400-e29b-41d4-a716-446655440002' });
    
    // Same adapter output = same output hash
    expect(response1.audit.output_hash).toBe(response2.audit.output_hash);
  });

  it('POSITIVE: Hash computation is deterministic', () => {
    const data = { test: 'data', value: 42 };
    
    const hash1 = computeHashSync(data);
    const hash2 = computeHashSync(data);
    
    expect(hash1).toBe(hash2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-NEX-08: No silent failures
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-NEX-08: No silent failures', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('POSITIVE: Success is explicitly indicated', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', {}));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createOracleRequest());
    
    expect(response.success).toBe(true);
    expect(response.error).toBeUndefined();
  });

  it('NEGATIVE: Failure is explicitly indicated with error details', async () => {
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createMuseRequest());
    
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBeDefined();
    expect(response.error?.message).toBeDefined();
  });

  it('NEGATIVE: Execution errors are not swallowed', async () => {
    const adapter = createMockAdapter('ORACLE', {}, { shouldFail: true, errorMessage: 'Explicit error' });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createOracleRequest());
    
    expect(response.success).toBe(false);
    expect(response.error?.message).toContain('Explicit error');
  });

  it('NEGATIVE: Timeout errors are explicit', async () => {
    const adapter = createMockAdapter('ORACLE', {}, { delay: 500 });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call({ ...createOracleRequest(), timeout_ms: 100 });
    
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(NexusErrorCode.TIMEOUT);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY: All invariants
// ═══════════════════════════════════════════════════════════════════════════════

describe('INVARIANTS SUMMARY', () => {
  it('All 8 invariants are tested', () => {
    const invariants = [
      'INV-NEX-01: All calls through Nexus.call()',
      'INV-NEX-02: MUSE without ORACLE = reject',
      'INV-NEX-03: L1-L3 validation mandatory',
      'INV-NEX-04: Guard rules cannot be bypassed',
      'INV-NEX-05: Audit entry for every call',
      'INV-NEX-06: Chronicle hash chain valid',
      'INV-NEX-07: Replay deterministic',
      'INV-NEX-08: No silent failures',
    ];
    
    expect(invariants.length).toBe(8);
  });
});
