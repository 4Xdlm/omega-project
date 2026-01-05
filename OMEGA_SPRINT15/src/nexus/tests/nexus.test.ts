/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — NEXUS TESTS
 * Test suite for the main facade
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Nexus,
  getGlobalNexus,
  resetGlobalNexus,
  nexusCall,
  registerAdapter,
} from '../nexus';
import { clearAdapters } from '../router';
import { createMockAdapter } from '../executor';
import { resetGlobalChronicle } from '../chronicle';
import {
  NexusRequest,
  NexusErrorCode,
  NEXUS_VERSION,
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
  timeout_ms: 15000,
});

const createMuseRequest = (): NexusRequest => ({
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: 'MUSE',
  action: 'suggest',
  payload: { context: { text: 'Hello', snapshot: {} } },
  seed: 42,
  timeout_ms: 15000,
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: Full flow ORACLE success
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full flow ORACLE', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('should complete full flow successfully', async () => {
    const mockResponse = { emotions: { joy: 0.8, sadness: 0.1 } };
    const adapter = createMockAdapter('ORACLE', mockResponse);
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const request = createOracleRequest();
    
    const response = await nexus.call(request);
    
    expect(response.success).toBe(true);
    expect(response.data).toEqual(mockResponse);
    expect(response.request_id).toBe(VALID_UUID);
    expect(response.audit).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: Full flow MUSE success
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full flow MUSE', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('should complete MUSE flow with ORACLE snapshot', async () => {
    const oracleResponse = { emotions: {} };
    const museResponse = { suggestions: ['idea1', 'idea2'] };
    
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', oracleResponse));
    registerAdapter('omega-muse-divine-adapter', () => createMockAdapter('MUSE', museResponse));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    
    // First: ORACLE call to set snapshot
    const oracleResult = await nexus.call(createOracleRequest());
    expect(oracleResult.success).toBe(true);
    
    // Then: MUSE call
    const response = await nexus.call(createMuseRequest());
    
    expect(response.success).toBe(true);
    expect(response.data).toEqual(museResponse);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: Full flow validation failure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Validation failure', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('should fail on invalid request', async () => {
    const nexus = new Nexus({ useGlobalChronicle: false });
    
    const invalidRequest = {
      request_id: 'invalid-uuid',
      session_id: VALID_UUID_2,
      caller_id: 'UI',
      module: 'ORACLE',
      action: 'analyze',
      payload: { text: 'test' },
    } as NexusRequest;
    
    const response = await nexus.call(invalidRequest);
    
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(NexusErrorCode.INVALID_SCHEMA);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Full flow guard failure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Guard failure', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('should fail MUSE without ORACLE snapshot', async () => {
    registerAdapter('omega-muse-divine-adapter', () => createMockAdapter('MUSE', {}));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createMuseRequest());
    
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(NexusErrorCode.MUSE_WITHOUT_ORACLE);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: Full flow execution failure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Execution failure', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('should handle execution error', async () => {
    const adapter = createMockAdapter('ORACLE', {}, { shouldFail: true, errorMessage: 'Analysis failed' });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createOracleRequest());
    
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(NexusErrorCode.MODULE_ERROR);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: Chronicle populated
// ═══════════════════════════════════════════════════════════════════════════════

describe('Chronicle population', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('should add entry to chronicle on success', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', { ok: true }));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    await nexus.call(createOracleRequest());
    
    const chronicle = nexus.getChronicle();
    expect(chronicle.length).toBe(1);
  });

  it('should add entry to chronicle on failure', async () => {
    const nexus = new Nexus({ useGlobalChronicle: false });
    await nexus.call(createMuseRequest()); // Will fail (no ORACLE snapshot)
    
    const chronicle = nexus.getChronicle();
    expect(chronicle.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: Audit entry created
// ═══════════════════════════════════════════════════════════════════════════════

describe('Audit entry', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('should create audit entry with correct fields', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', { result: 'ok' }));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createOracleRequest());
    
    expect(response.audit.input_hash).toHaveLength(64);
    expect(response.audit.output_hash).toHaveLength(64);
    expect(response.audit.route).toBe('ORACLE.analyze');
    expect(response.audit.duration_ms).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: Response structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Response structure', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('should have complete response structure on success', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', { data: 'test' }));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createOracleRequest());
    
    expect(response).toHaveProperty('request_id');
    expect(response).toHaveProperty('response_id');
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('audit');
    expect(response.error).toBeUndefined();
  });

  it('should have complete response structure on failure', async () => {
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createMuseRequest());
    
    expect(response).toHaveProperty('request_id');
    expect(response).toHaveProperty('response_id');
    expect(response).toHaveProperty('success', false);
    expect(response).toHaveProperty('error');
    expect(response).toHaveProperty('audit');
    expect(response.data).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 9: Error propagation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Error propagation', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('should propagate validation errors', async () => {
    const nexus = new Nexus({ useGlobalChronicle: false });
    const request = { ...createOracleRequest(), module: 'INVALID' as any };
    
    const response = await nexus.call(request);
    
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });

  it('should propagate module errors', async () => {
    const adapter = createMockAdapter('ORACLE', {}, { shouldFail: true });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const response = await nexus.call(createOracleRequest());
    
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(NexusErrorCode.MODULE_ERROR);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 10: Seed handling
// ═══════════════════════════════════════════════════════════════════════════════

describe('Seed handling', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('should pass seed to adapter', async () => {
    let receivedSeed: number | undefined;
    
    const adapter = createMockAdapter('ORACLE', { seeded: true });
    const originalExecute = adapter.execute;
    adapter.execute = async (action, payload, seed) => {
      receivedSeed = seed;
      return originalExecute(action, payload, seed);
    };
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const request = { ...createOracleRequest(), seed: 12345 };
    await nexus.call(request);
    
    expect(receivedSeed).toBe(12345);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 11: Timeout handling
// ═══════════════════════════════════════════════════════════════════════════════

describe('Timeout handling', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('should timeout slow operations', async () => {
    const adapter = createMockAdapter('ORACLE', {}, { delay: 500 });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const request = { ...createOracleRequest(), timeout_ms: 100 };
    const response = await nexus.call(request);
    
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(NexusErrorCode.TIMEOUT);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 12: Deterministic output
// ═══════════════════════════════════════════════════════════════════════════════

describe('Deterministic output', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('should produce same hash for same output', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', { deterministic: true }));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    const request = createOracleRequest();
    
    const response1 = await nexus.call({ ...request, request_id: '550e8400-e29b-41d4-a716-446655440001' });
    const response2 = await nexus.call({ ...request, request_id: '550e8400-e29b-41d4-a716-446655440002' });
    
    expect(response1.audit.output_hash).toBe(response2.audit.output_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Global Nexus
// ═══════════════════════════════════════════════════════════════════════════════

describe('Global Nexus', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalChronicle();
    resetGlobalNexus();
  });

  it('should return singleton', () => {
    const n1 = getGlobalNexus();
    const n2 = getGlobalNexus();
    expect(n1).toBe(n2);
  });

  it('should support nexusCall convenience', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', { quick: true }));
    
    const response = await nexusCall(createOracleRequest());
    expect(response.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST: Stats
// ═══════════════════════════════════════════════════════════════════════════════

describe('Nexus stats', () => {
  beforeEach(() => {
    clearAdapters();
    resetGlobalNexus();
  });

  it('should track statistics', async () => {
    registerAdapter('omega-oracle-v2-adapter', () => createMockAdapter('ORACLE', {}));
    
    const nexus = new Nexus({ useGlobalChronicle: false });
    await nexus.call(createOracleRequest());
    await nexus.call(createOracleRequest());
    
    const stats = nexus.getStats();
    expect(stats.totalRequests).toBe(2);
    expect(stats.chronicleEntries).toBe(2);
    expect(stats.version).toBe(NEXUS_VERSION);
  });
});
