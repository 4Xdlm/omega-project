/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — ROUTER TESTS
 * Test suite for policy-based routing
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  route,
  isValidModule,
  isValidAction,
  getValidActions,
  getAdapterId,
  registerAdapter,
  resolveAdapter,
  hasAdapter,
  clearAdapters,
  formatRoute,
  parseRoute,
  verifyDeterminism,
  RoutingResult,
} from '../router';
import {
  NexusRequest,
  NexusErrorCode,
  ModuleAdapter,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const createRequest = (module: string, action: string): NexusRequest => ({
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: module as any,
  action,
  payload: { text: 'test' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: Route to ORACLE - analyze
// ═══════════════════════════════════════════════════════════════════════════════

describe('Route to ORACLE', () => {
  it('should route ORACLE.analyze correctly', () => {
    const request = createRequest('ORACLE', 'analyze');
    const result = route(request);
    
    expect(result.success).toBe(true);
    expect(result.decision?.target).toBe('ORACLE');
    expect(result.decision?.action).toBe('analyze');
    expect(result.decision?.adapter_id).toBe('omega-oracle-v2-adapter');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: Route to MUSE - suggest
// ═══════════════════════════════════════════════════════════════════════════════

describe('Route to MUSE', () => {
  it('should route MUSE.suggest correctly', () => {
    const request = createRequest('MUSE', 'suggest');
    const result = route(request);
    
    expect(result.success).toBe(true);
    expect(result.decision?.target).toBe('MUSE');
    expect(result.decision?.action).toBe('suggest');
    expect(result.decision?.adapter_id).toBe('omega-muse-divine-adapter');
  });

  it('should route MUSE.assess correctly', () => {
    const request = createRequest('MUSE', 'assess');
    const result = route(request);
    
    expect(result.success).toBe(true);
    expect(result.decision?.action).toBe('assess');
  });

  it('should route MUSE.project correctly', () => {
    const request = createRequest('MUSE', 'project');
    const result = route(request);
    
    expect(result.success).toBe(true);
    expect(result.decision?.action).toBe('project');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: Route to PIPELINE - run
// ═══════════════════════════════════════════════════════════════════════════════

describe('Route to PIPELINE', () => {
  it('should route PIPELINE.run correctly', () => {
    const request = createRequest('PIPELINE', 'run');
    const result = route(request);
    
    expect(result.success).toBe(true);
    expect(result.decision?.target).toBe('PIPELINE');
    expect(result.decision?.action).toBe('run');
    expect(result.decision?.adapter_id).toBe('omega-pipeline-adapter');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Module inconnu → error
// ═══════════════════════════════════════════════════════════════════════════════

describe('Unknown module', () => {
  it('should reject unknown module', () => {
    const request = createRequest('UNKNOWN', 'action');
    const result = route(request);
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(NexusErrorCode.ROUTING_ERROR);
    expect(result.error?.message).toContain('Unknown module');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: Action inconnue → error
// ═══════════════════════════════════════════════════════════════════════════════

describe('Unknown action', () => {
  it('should reject invalid action for ORACLE', () => {
    const request = createRequest('ORACLE', 'suggest');  // suggest is MUSE action
    const result = route(request);
    
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(NexusErrorCode.ROUTING_ERROR);
    expect(result.error?.message).toContain('Invalid action');
    expect(result.error?.details).toHaveProperty('valid_actions');
  });

  it('should reject invalid action for MUSE', () => {
    const request = createRequest('MUSE', 'analyze');  // analyze is ORACLE action
    const result = route(request);
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Invalid action');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: Policy matching
// ═══════════════════════════════════════════════════════════════════════════════

describe('Policy matching', () => {
  it('should validate all ORACLE actions', () => {
    expect(isValidAction('ORACLE', 'analyze')).toBe(true);
    expect(isValidAction('ORACLE', 'suggest')).toBe(false);
  });

  it('should validate all MUSE actions', () => {
    expect(isValidAction('MUSE', 'suggest')).toBe(true);
    expect(isValidAction('MUSE', 'assess')).toBe(true);
    expect(isValidAction('MUSE', 'project')).toBe(true);
    expect(isValidAction('MUSE', 'analyze')).toBe(false);
  });

  it('should validate all PIPELINE actions', () => {
    expect(isValidAction('PIPELINE', 'run')).toBe(true);
    expect(isValidAction('PIPELINE', 'segment')).toBe(true);
    expect(isValidAction('PIPELINE', 'aggregate')).toBe(true);
  });

  it('should get valid actions for module', () => {
    expect(getValidActions('ORACLE')).toEqual(['analyze']);
    expect(getValidActions('MUSE')).toEqual(['suggest', 'assess', 'project']);
    expect(getValidActions('PIPELINE')).toEqual(['run', 'segment', 'aggregate']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: Routing decision structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Routing decision structure', () => {
  it('should include all required fields', () => {
    const request = createRequest('ORACLE', 'analyze');
    const result = route(request);
    
    expect(result.success).toBe(true);
    expect(result.decision).toHaveProperty('target');
    expect(result.decision).toHaveProperty('action');
    expect(result.decision).toHaveProperty('adapter_id');
  });

  it('should have correct adapter IDs', () => {
    expect(getAdapterId('ORACLE')).toBe('omega-oracle-v2-adapter');
    expect(getAdapterId('MUSE')).toBe('omega-muse-divine-adapter');
    expect(getAdapterId('PIPELINE')).toBe('omega-pipeline-adapter');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: Deterministic routing
// ═══════════════════════════════════════════════════════════════════════════════

describe('Deterministic routing', () => {
  it('should route same request identically', () => {
    const request = createRequest('ORACLE', 'analyze');
    
    const result1 = route(request);
    const result2 = route(request);
    
    expect(result1.success).toBe(result2.success);
    expect(result1.decision?.target).toBe(result2.decision?.target);
    expect(result1.decision?.action).toBe(result2.decision?.action);
    expect(result1.decision?.adapter_id).toBe(result2.decision?.adapter_id);
  });

  it('should verify determinism', () => {
    const request = createRequest('MUSE', 'suggest');
    expect(verifyDeterminism(request)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 9: Route formatting
// ═══════════════════════════════════════════════════════════════════════════════

describe('Route formatting', () => {
  it('should format route correctly', () => {
    expect(formatRoute('ORACLE', 'analyze')).toBe('ORACLE.analyze');
    expect(formatRoute('MUSE', 'suggest')).toBe('MUSE.suggest');
    expect(formatRoute('PIPELINE', 'run')).toBe('PIPELINE.run');
  });

  it('should parse route correctly', () => {
    const parsed = parseRoute('ORACLE.analyze');
    expect(parsed?.module).toBe('ORACLE');
    expect(parsed?.action).toBe('analyze');
  });

  it('should return null for invalid route format', () => {
    expect(parseRoute('invalid')).toBeNull();
    expect(parseRoute('TOO.MANY.PARTS')).toBeNull();
    expect(parseRoute('UNKNOWN.action')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 10: Adapter registry
// ═══════════════════════════════════════════════════════════════════════════════

describe('Adapter registry', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('should register and resolve adapter', () => {
    const mockAdapter: ModuleAdapter = {
      id: 'test-adapter',
      module: 'ORACLE',
      version: '1.0.0',
      execute: async () => ({ result: 'test' }),
    };
    
    registerAdapter('omega-oracle-v2-adapter', () => mockAdapter);
    
    expect(hasAdapter('omega-oracle-v2-adapter')).toBe(true);
    
    const request = createRequest('ORACLE', 'analyze');
    const result = route(request);
    const adapter = resolveAdapter(result.decision!);
    
    expect(adapter).toBeDefined();
    expect(adapter?.id).toBe('test-adapter');
  });

  it('should return null for unregistered adapter', () => {
    const request = createRequest('ORACLE', 'analyze');
    const result = route(request);
    const adapter = resolveAdapter(result.decision!);
    
    expect(adapter).toBeNull();
  });

  it('should validate module check', () => {
    expect(isValidModule('ORACLE')).toBe(true);
    expect(isValidModule('MUSE')).toBe(true);
    expect(isValidModule('PIPELINE')).toBe(true);
    expect(isValidModule('UNKNOWN')).toBe(false);
  });
});
