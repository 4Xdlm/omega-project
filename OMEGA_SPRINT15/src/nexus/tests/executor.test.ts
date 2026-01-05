/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — EXECUTOR TESTS
 * Test suite for dispatch and execution
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  execute,
  createMockAdapter,
  verifyExecutionDeterminism,
  ExecutionResult,
} from '../executor';
import {
  registerAdapter,
  clearAdapters,
} from '../router';
import {
  NexusRequest,
  NexusErrorCode,
  RoutingDecision,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const createRequest = (seed?: number, timeout?: number): NexusRequest => ({
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: 'ORACLE',
  action: 'analyze',
  payload: { text: 'Test text for analysis' },
  seed,
  timeout_ms: timeout,
});

const ORACLE_DECISION: RoutingDecision = {
  target: 'ORACLE',
  action: 'analyze',
  adapter_id: 'omega-oracle-v2-adapter',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: Execute ORACLE success
// ═══════════════════════════════════════════════════════════════════════════════

describe('Execute success', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should execute ORACLE successfully', async () => {
    const mockResponse = { emotions: { joy: 0.8 } };
    const adapter = createMockAdapter('ORACLE', mockResponse);
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const request = createRequest();
    const result = await execute(request, ORACLE_DECISION);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    expect(result.adapter_version).toBe('1.0.0');
  });

  it('should execute MUSE successfully', async () => {
    const mockResponse = { suggestions: ['idea1', 'idea2'] };
    const adapter = createMockAdapter('MUSE', mockResponse);
    registerAdapter('omega-muse-divine-adapter', () => adapter);
    
    const decision: RoutingDecision = {
      target: 'MUSE',
      action: 'suggest',
      adapter_id: 'omega-muse-divine-adapter',
    };
    
    const request: NexusRequest = {
      ...createRequest(42),
      module: 'MUSE',
      action: 'suggest',
      payload: { context: {} },
    };
    
    const result = await execute(request, decision);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponse);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: Execute timeout → error
// ═══════════════════════════════════════════════════════════════════════════════

describe('Execute timeout', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should timeout when execution takes too long', async () => {
    const adapter = createMockAdapter('ORACLE', {}, { delay: 500 });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const request = createRequest(undefined, 100);  // 100ms timeout
    const result = await execute(request, ORACLE_DECISION);
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(NexusErrorCode.TIMEOUT);
    expect(result.error?.recoverable).toBe(true);
  });

  it('should succeed when execution is within timeout', async () => {
    const adapter = createMockAdapter('ORACLE', { result: 'ok' }, { delay: 50 });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const request = createRequest(undefined, 200);  // 200ms timeout
    const result = await execute(request, ORACLE_DECISION);
    
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: Execute module error → propagate
// ═══════════════════════════════════════════════════════════════════════════════

describe('Execute module error', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should propagate module errors', async () => {
    const adapter = createMockAdapter('ORACLE', {}, {
      shouldFail: true,
      errorMessage: 'Analysis failed: invalid input',
    });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const request = createRequest();
    const result = await execute(request, ORACLE_DECISION);
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(NexusErrorCode.MODULE_ERROR);
    expect(result.error?.message).toContain('Analysis failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Execute with seed
// ═══════════════════════════════════════════════════════════════════════════════

describe('Execute with seed', () => {
  beforeEach(() => {
    clearAdapters();
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
    
    const request = createRequest(42);
    await execute(request, ORACLE_DECISION);
    
    expect(receivedSeed).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: Execute result structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Execution result structure', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should include all fields on success', async () => {
    const adapter = createMockAdapter('ORACLE', { result: 'ok' }, { version: '3.14.0' });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const request = createRequest();
    const result = await execute(request, ORACLE_DECISION);
    
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('duration_ms');
    expect(result).toHaveProperty('adapter_version', '3.14.0');
    expect(result.error).toBeUndefined();
  });

  it('should include all fields on failure', async () => {
    const adapter = createMockAdapter('ORACLE', {}, { shouldFail: true, version: '3.14.0' });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const request = createRequest();
    const result = await execute(request, ORACLE_DECISION);
    
    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('duration_ms');
    expect(result).toHaveProperty('adapter_version', '3.14.0');
    expect(result.data).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: No adapter registered
// ═══════════════════════════════════════════════════════════════════════════════

describe('No adapter', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should fail when no adapter registered', async () => {
    const request = createRequest();
    const result = await execute(request, ORACLE_DECISION);
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(NexusErrorCode.EXECUTION_FAILED);
    expect(result.error?.message).toContain('No adapter registered');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: Deterministic execution
// ═══════════════════════════════════════════════════════════════════════════════

describe('Deterministic execution', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should produce same result with same seed', async () => {
    const adapter = createMockAdapter('ORACLE', { deterministic: true });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const request = createRequest(42);
    const verification = await verifyExecutionDeterminism(request, ORACLE_DECISION);
    
    expect(verification.deterministic).toBe(true);
    expect(verification.results[0]).toEqual(verification.results[1]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: Duration tracking
// ═══════════════════════════════════════════════════════════════════════════════

describe('Duration tracking', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should track execution duration', async () => {
    const adapter = createMockAdapter('ORACLE', { result: 'ok' }, { delay: 50 });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const request = createRequest();
    const result = await execute(request, ORACLE_DECISION);
    
    expect(result.duration_ms).toBeGreaterThanOrEqual(50);
  });

  it('should track duration even on failure', async () => {
    const adapter = createMockAdapter('ORACLE', {}, { shouldFail: true, delay: 30 });
    registerAdapter('omega-oracle-v2-adapter', () => adapter);
    
    const request = createRequest();
    const result = await execute(request, ORACLE_DECISION);
    
    expect(result.duration_ms).toBeGreaterThanOrEqual(30);
  });
});
