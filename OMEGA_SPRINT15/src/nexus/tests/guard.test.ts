/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — GUARD TESTS
 * Test suite for hard stops
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  applyGuards,
  checkGuard,
  getGuardRuleIds,
  getGuardRule,
  createDefaultContext,
  createContextWithSnapshot,
  isVersionCompatible,
  getPayloadSize,
} from '../guard';
import {
  NexusRequest,
  NexusErrorCode,
  GuardContext,
  MAX_PAYLOAD_SIZE,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const VALID_ORACLE_REQUEST: NexusRequest = {
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: 'ORACLE',
  action: 'analyze',
  payload: { text: 'This is a valid text for analysis with enough characters.' },
  timeout_ms: 15000,
};

const VALID_MUSE_REQUEST: NexusRequest = {
  request_id: VALID_UUID,
  session_id: VALID_UUID_2,
  caller_id: 'UI',
  module: 'MUSE',
  action: 'suggest',
  payload: { context: { text: 'Hello', snapshot: {} } },
  seed: 42,
  timeout_ms: 15000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: GUARD-01 - MUSE sans ORACLE → reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('GUARD-01: MUSE without ORACLE', () => {
  it('should reject MUSE request without ORACLE snapshot', () => {
    const context = createDefaultContext({ has_oracle_snapshot: false });
    const result = applyGuards(VALID_MUSE_REQUEST, context);
    
    expect(result.passed).toBe(false);
    expect(result.failed_rule).toBe('GUARD-01');
    expect(result.error?.code).toBe(NexusErrorCode.MUSE_WITHOUT_ORACLE);
  });

  it('should accept MUSE request with ORACLE snapshot', () => {
    const context = createContextWithSnapshot();
    const result = applyGuards(VALID_MUSE_REQUEST, context);
    
    // May fail on other guards but not GUARD-01
    if (!result.passed) {
      expect(result.failed_rule).not.toBe('GUARD-01');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: GUARD-02 - ORACLE contexte vide → reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('GUARD-02: ORACLE without context', () => {
  it('should reject ORACLE with empty text', () => {
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      payload: { text: '' },
    };
    const context = createDefaultContext();
    const result = applyGuards(request, context);
    
    expect(result.passed).toBe(false);
    expect(result.failed_rule).toBe('GUARD-02');
    expect(result.error?.code).toBe(NexusErrorCode.ORACLE_NO_CONTEXT);
  });

  it('should reject ORACLE with text < 10 chars', () => {
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      payload: { text: 'Short' },
    };
    const context = createDefaultContext();
    const result = applyGuards(request, context);
    
    expect(result.passed).toBe(false);
    expect(result.failed_rule).toBe('GUARD-02');
  });

  it('should accept ORACLE with valid text', () => {
    const context = createDefaultContext();
    const result = applyGuards(VALID_ORACLE_REQUEST, context);
    
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: GUARD-03 - Payload > 2MB → reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('GUARD-03: Payload size', () => {
  it('should reject payload > 2MB', () => {
    const largeText = 'x'.repeat(MAX_PAYLOAD_SIZE + 1000);
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      payload: { text: largeText },
    };
    const context = createDefaultContext();
    const result = applyGuards(request, context);
    
    expect(result.passed).toBe(false);
    expect(result.failed_rule).toBe('GUARD-03');
    expect(result.error?.code).toBe(NexusErrorCode.PAYLOAD_TOO_LARGE);
    expect(result.error?.recoverable).toBe(false);
  });

  it('should accept payload < 2MB', () => {
    const context = createDefaultContext();
    const result = applyGuards(VALID_ORACLE_REQUEST, context);
    
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: GUARD-04 - Version incompatible → reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('GUARD-04: Version compatibility', () => {
  it('should reject incompatible version', () => {
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      version_pin: '4.0.0',  // Major version mismatch
    };
    const context = createDefaultContext({
      module_versions: { PIPELINE: '3.12.0', ORACLE: '3.14.0', MUSE: '3.14.0' },
    });
    const result = applyGuards(request, context);
    
    expect(result.passed).toBe(false);
    expect(result.failed_rule).toBe('GUARD-04');
    expect(result.error?.code).toBe(NexusErrorCode.VERSION_INCOMPATIBLE);
  });

  it('should accept compatible version', () => {
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      version_pin: '3.14.0',
    };
    const context = createDefaultContext({
      module_versions: { PIPELINE: '3.12.0', ORACLE: '3.14.0', MUSE: '3.14.0' },
    });
    const result = applyGuards(request, context);
    
    expect(result.passed).toBe(true);
  });

  it('should accept when no version_pin specified', () => {
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
    };
    delete request.version_pin;
    
    const context = createDefaultContext();
    const result = applyGuards(request, context);
    
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: GUARD-05 - Caller non autorisé → reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('GUARD-05: Caller authorization', () => {
  it('should reject unauthorized caller', () => {
    const request: NexusRequest = {
      ...VALID_ORACLE_REQUEST,
      caller_id: 'API',
    };
    const context = createDefaultContext({
      allowed_callers: ['UI', 'INTERNAL'],  // API not allowed
    });
    const result = applyGuards(request, context);
    
    expect(result.passed).toBe(false);
    expect(result.failed_rule).toBe('GUARD-05');
    expect(result.error?.code).toBe(NexusErrorCode.UNAUTHORIZED);
  });

  it('should accept authorized caller', () => {
    const context = createDefaultContext({
      allowed_callers: ['UI', 'SAGA', 'CANON', 'API', 'INTERNAL'],
    });
    const result = applyGuards(VALID_ORACLE_REQUEST, context);
    
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: GUARD-06 - Session expirée → reject
// ═══════════════════════════════════════════════════════════════════════════════

describe('GUARD-06: Session validity', () => {
  it('should reject expired session', () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();  // 1 second ago
    const context = createDefaultContext({
      session_expiry: pastDate,
    });
    const result = applyGuards(VALID_ORACLE_REQUEST, context);
    
    expect(result.passed).toBe(false);
    expect(result.failed_rule).toBe('GUARD-06');
    expect(result.error?.code).toBe(NexusErrorCode.SESSION_EXPIRED);
  });

  it('should accept valid session', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();  // 1 hour from now
    const context = createDefaultContext({
      session_expiry: futureDate,
    });
    const result = applyGuards(VALID_ORACLE_REQUEST, context);
    
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: Multiple guards - first fail
// ═══════════════════════════════════════════════════════════════════════════════

describe('Multiple guards', () => {
  it('should fail on first guard violation', () => {
    // Request that violates multiple guards
    const request: NexusRequest = {
      ...VALID_MUSE_REQUEST,
      caller_id: 'API',
    };
    const context = createDefaultContext({
      has_oracle_snapshot: false,  // Violates GUARD-01
      allowed_callers: ['UI'],      // Violates GUARD-05
    });
    
    const result = applyGuards(request, context);
    
    // Should fail on GUARD-01 first (it's evaluated before GUARD-05)
    expect(result.passed).toBe(false);
    expect(result.failed_rule).toBe('GUARD-01');
  });

  it('should pass all guards when all conditions met', () => {
    const context = createContextWithSnapshot();
    const result = applyGuards(VALID_MUSE_REQUEST, context);
    
    expect(result.passed).toBe(true);
    expect(result.failed_rule).toBeUndefined();
    expect(result.error).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: Guard error messages
// ═══════════════════════════════════════════════════════════════════════════════

describe('Guard error messages', () => {
  it('should provide clear error message for MUSE_WITHOUT_ORACLE', () => {
    const context = createDefaultContext({ has_oracle_snapshot: false });
    const result = applyGuards(VALID_MUSE_REQUEST, context);
    
    expect(result.error?.message).toContain('ORACLE');
    expect(result.error?.message).toContain('snapshot');
  });

  it('should include rule details in error', () => {
    const context = createDefaultContext({ has_oracle_snapshot: false });
    const result = applyGuards(VALID_MUSE_REQUEST, context);
    
    expect(result.error?.details).toBeDefined();
    expect((result.error?.details as Record<string, unknown>).rule_id).toBe('GUARD-01');
  });

  it('should mark recoverable errors correctly', () => {
    const context = createDefaultContext({ has_oracle_snapshot: false });
    const result = applyGuards(VALID_MUSE_REQUEST, context);
    
    // GUARD-01 is recoverable (user can run ORACLE first)
    expect(result.error?.recoverable).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 9: Version compatibility helper
// ═══════════════════════════════════════════════════════════════════════════════

describe('Version compatibility', () => {
  it('should accept same version', () => {
    expect(isVersionCompatible('3.14.0', '3.14.0')).toBe(true);
  });

  it('should accept higher minor version', () => {
    expect(isVersionCompatible('3.14.0', '3.15.0')).toBe(true);
  });

  it('should accept higher patch version', () => {
    expect(isVersionCompatible('3.14.0', '3.14.5')).toBe(true);
  });

  it('should reject different major version', () => {
    expect(isVersionCompatible('3.14.0', '4.0.0')).toBe(false);
    expect(isVersionCompatible('4.0.0', '3.14.0')).toBe(false);
  });

  it('should reject lower minor version', () => {
    expect(isVersionCompatible('3.14.0', '3.13.0')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 10: Utility functions
// ═══════════════════════════════════════════════════════════════════════════════

describe('Utility functions', () => {
  it('should get all guard rule IDs', () => {
    const ids = getGuardRuleIds();
    expect(ids).toContain('GUARD-01');
    expect(ids).toContain('GUARD-06');
    expect(ids.length).toBe(6);
  });

  it('should get guard rule by ID', () => {
    const rule = getGuardRule('GUARD-01');
    expect(rule).toBeDefined();
    expect(rule?.name).toContain('ORACLE');
  });

  it('should check specific guard', () => {
    const context = createDefaultContext({ has_oracle_snapshot: false });
    expect(checkGuard('GUARD-01', VALID_MUSE_REQUEST, context)).toBe(false);
    
    const contextWithSnapshot = createContextWithSnapshot();
    expect(checkGuard('GUARD-01', VALID_MUSE_REQUEST, contextWithSnapshot)).toBe(true);
  });

  it('should calculate payload size correctly', () => {
    expect(getPayloadSize(null)).toBe(0);
    expect(getPayloadSize(undefined)).toBe(0);
    expect(getPayloadSize({ text: 'hello' })).toBeGreaterThan(0);
  });
});
