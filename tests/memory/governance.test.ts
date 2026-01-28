/**
 * OMEGA Memory System - Governance Tests
 * Phase D5 - NASA-Grade L4
 *
 * Tests for Sentinel and Audit functionality.
 *
 * INV-D5-01: Sentinel.authorize() retourne DENY
 * INV-D5-02: Aucune écriture canonique possible
 * INV-D5-03: Audit log créé pour chaque opération
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSentinel,
  createAuthorizationRequest,
  isAllowed,
  isDenied,
  isDeferred,
  assertSentinelNotImplemented,
  assertDenied,
  SENTINEL_IMPLEMENTATION_STATUS,
  CURRENT_PHASE,
} from '../../src/memory/governance/sentinel.js';
import {
  createAuditEvent,
  createMemoryAuditLogger,
  createNoOpAuditLogger,
} from '../../src/memory/governance/audit.js';
import { toEntryId, toTimestamp } from '../../src/memory/types.js';
import type { MemoryEntry, AuthorizationRequest } from '../../src/memory/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createTestEntry(): MemoryEntry {
  return {
    id: toEntryId('FAC-20260127-0001-AAA111'),
    ts_utc: toTimestamp('2026-01-27T00:00:00Z'),
    author: 'TestAuthor',
    class: 'FACT',
    scope: 'TEST',
    payload: { title: 'Test', body: 'Test body' },
    meta: { schema_version: '1.0', sealed: false },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENTINEL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sentinel', () => {
  describe('Status', () => {
    it('SENTINEL_IMPLEMENTATION_STATUS is NOT_IMPLEMENTED', () => {
      expect(SENTINEL_IMPLEMENTATION_STATUS).toBe('NOT_IMPLEMENTED');
    });

    it('CURRENT_PHASE is D', () => {
      expect(CURRENT_PHASE).toBe('D');
    });

    it('isImplemented returns false', () => {
      const sentinel = createSentinel();
      expect(sentinel.isImplemented()).toBe(false);
    });

    it('getStatus returns NOT_IMPLEMENTED', () => {
      const sentinel = createSentinel();
      expect(sentinel.getStatus()).toBe('NOT_IMPLEMENTED');
    });
  });

  describe('authorize - INV-D5-01', () => {
    it('always returns DENY', () => {
      const sentinel = createSentinel();
      const entry = createTestEntry();
      const request = createAuthorizationRequest(entry, 'TestUser');

      const response = sentinel.authorize(request);

      expect(response.verdict).toBe('DENY');
    });

    it('includes reason SENTINEL_NOT_IMPLEMENTED', () => {
      const sentinel = createSentinel();
      const entry = createTestEntry();
      const request = createAuthorizationRequest(entry, 'TestUser');

      const response = sentinel.authorize(request);

      expect(response.reason).toBe('SENTINEL_NOT_IMPLEMENTED');
    });

    it('includes trace with request details', () => {
      const sentinel = createSentinel();
      const entry = createTestEntry();
      const request = createAuthorizationRequest(entry, 'TestUser');

      const response = sentinel.authorize(request);

      expect(response.trace).toContain('APPEND');
      expect(response.trace).toContain('TestUser');
      expect(response.trace).toContain(entry.id);
    });

    it('includes respondedAt timestamp', () => {
      const sentinel = createSentinel();
      const entry = createTestEntry();
      const request = createAuthorizationRequest(entry, 'TestUser');

      const response = sentinel.authorize(request);

      expect(response.respondedAt).toBeDefined();
      expect(response.respondedAt.length).toBeGreaterThan(0);
    });

    it('never returns ALLOW', () => {
      const sentinel = createSentinel();
      const entries = [
        createTestEntry(),
        { ...createTestEntry(), id: toEntryId('DEC-20260127-0001-BBB222') },
        { ...createTestEntry(), class: 'DECISION' as const },
      ];

      for (const entry of entries) {
        const request = createAuthorizationRequest(entry, 'TestUser');
        const response = sentinel.authorize(request);
        expect(response.verdict).not.toBe('ALLOW');
      }
    });

    it('never returns DEFER', () => {
      const sentinel = createSentinel();
      const entry = createTestEntry();
      const request = createAuthorizationRequest(entry, 'TestUser');

      const response = sentinel.authorize(request);

      expect(response.verdict).not.toBe('DEFER');
    });
  });

  describe('Helper functions', () => {
    it('isAllowed returns false for DENY', () => {
      const sentinel = createSentinel();
      const entry = createTestEntry();
      const request = createAuthorizationRequest(entry, 'TestUser');
      const response = sentinel.authorize(request);

      expect(isAllowed(response)).toBe(false);
    });

    it('isDenied returns true for DENY', () => {
      const sentinel = createSentinel();
      const entry = createTestEntry();
      const request = createAuthorizationRequest(entry, 'TestUser');
      const response = sentinel.authorize(request);

      expect(isDenied(response)).toBe(true);
    });

    it('isDeferred returns false for DENY', () => {
      const sentinel = createSentinel();
      const entry = createTestEntry();
      const request = createAuthorizationRequest(entry, 'TestUser');
      const response = sentinel.authorize(request);

      expect(isDeferred(response)).toBe(false);
    });
  });

  describe('Assertions', () => {
    it('assertSentinelNotImplemented does not throw for Phase D sentinel', () => {
      const sentinel = createSentinel();
      expect(() => assertSentinelNotImplemented(sentinel)).not.toThrow();
    });

    it('assertDenied does not throw for DENY response', () => {
      const sentinel = createSentinel();
      const entry = createTestEntry();
      const request = createAuthorizationRequest(entry, 'TestUser');
      const response = sentinel.authorize(request);

      expect(() => assertDenied(response)).not.toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Audit', () => {
  describe('createAuditEvent', () => {
    it('creates event with unique ID', () => {
      const event1 = createAuditEvent({ action: 'TEST', actor: 'User' });
      const event2 = createAuditEvent({ action: 'TEST', actor: 'User' });

      expect(event1.id).toBeDefined();
      expect(event2.id).toBeDefined();
      expect(event1.id).not.toBe(event2.id);
    });

    it('creates event with timestamp', () => {
      const event = createAuditEvent({ action: 'TEST', actor: 'User' });

      expect(event.ts_utc).toBeDefined();
      expect(event.ts_utc.length).toBeGreaterThan(0);
    });

    it('includes all provided fields', () => {
      const entryId = toEntryId('FAC-20260127-0001-AAA111');
      const event = createAuditEvent({
        action: 'READ',
        actor: 'TestUser',
        entryId,
        verdict: 'DENY',
        trace: 'Test trace',
      });

      expect(event.action).toBe('READ');
      expect(event.actor).toBe('TestUser');
      expect(event.entryId).toBe(entryId);
      expect(event.verdict).toBe('DENY');
      expect(event.trace).toBe('Test trace');
    });

    it('uses null for optional fields', () => {
      const event = createAuditEvent({ action: 'TEST', actor: 'User' });

      expect(event.entryId).toBeNull();
      expect(event.verdict).toBeNull();
    });
  });

  describe('MemoryAuditLogger', () => {
    let logger: ReturnType<typeof createMemoryAuditLogger>;

    beforeEach(() => {
      logger = createMemoryAuditLogger();
    });

    it('stores logged events', () => {
      const event = createAuditEvent({ action: 'TEST', actor: 'User' });
      logger.log(event);

      const events = logger.getEvents();
      expect(events.length).toBe(1);
      expect(events[0]).toBe(event);
    });

    it('logRead creates READ event', () => {
      const entryId = toEntryId('FAC-20260127-0001-AAA111');
      logger.logRead('TestUser', entryId);

      const events = logger.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].action).toBe('READ');
      expect(events[0].actor).toBe('TestUser');
      expect(events[0].entryId).toBe(entryId);
    });

    it('logQuery creates QUERY event', () => {
      logger.logQuery('TestUser', 'class=FACT');

      const events = logger.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].action).toBe('QUERY');
      expect(events[0].trace).toContain('class=FACT');
    });

    it('logAuthorization creates AUTHORIZATION event', () => {
      const entryId = toEntryId('FAC-20260127-0001-AAA111');
      logger.logAuthorization('TestUser', entryId, 'DENY', 'Not implemented');

      const events = logger.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].action).toBe('AUTHORIZATION');
      expect(events[0].verdict).toBe('DENY');
    });

    it('logIntegrityCheck creates INTEGRITY_CHECK event', () => {
      logger.logIntegrityCheck('TestUser', 'PASS', 'All entries valid');

      const events = logger.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].action).toBe('INTEGRITY_CHECK');
      expect(events[0].trace).toContain('PASS');
    });
  });

  describe('NoOpAuditLogger', () => {
    it('does not throw', () => {
      const logger = createNoOpAuditLogger();
      const entryId = toEntryId('FAC-20260127-0001-AAA111');

      expect(() => {
        logger.log(createAuditEvent({ action: 'TEST', actor: 'User' }));
        logger.logRead('User', entryId);
        logger.logQuery('User', 'test');
        logger.logAuthorization('User', entryId, 'DENY', 'reason');
        logger.logIntegrityCheck('User', 'PASS', 'details');
        logger.flush();
      }).not.toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('D5 Invariants', () => {
  it('INV-D5-01: Sentinel.authorize() returns DENY', () => {
    const sentinel = createSentinel();
    const entry = createTestEntry();
    const request = createAuthorizationRequest(entry, 'AnyUser');

    const response = sentinel.authorize(request);

    expect(response.verdict).toBe('DENY');
    expect(response.reason).toBe('SENTINEL_NOT_IMPLEMENTED');
  });

  it('INV-D5-02: No canonical write possible (isAllowed always false)', () => {
    const sentinel = createSentinel();

    // Try many different entries and actors
    for (let i = 0; i < 10; i++) {
      const entry = {
        ...createTestEntry(),
        id: toEntryId(`FAC-2026012${i}-0001-TEST0${i}`),
      };
      const request = createAuthorizationRequest(entry, `User${i}`);
      const response = sentinel.authorize(request);

      expect(isAllowed(response)).toBe(false);
    }
  });

  it('INV-D5-03: Audit log created for each operation', () => {
    const logger = createMemoryAuditLogger();
    const entryId = toEntryId('FAC-20260127-0001-AAA111');

    logger.logRead('User', entryId);
    logger.logQuery('User', 'test');
    logger.logAuthorization('User', entryId, 'DENY', 'reason');
    logger.logIntegrityCheck('User', 'PASS', 'details');

    const events = logger.getEvents();
    expect(events.length).toBe(4);
    expect(events.every(e => e.id && e.ts_utc && e.action)).toBe(true);
  });

  it('INV-D5-04: Authority interface = signature only', () => {
    const sentinel = createSentinel();

    // Sentinel interface is defined but not operational
    expect(typeof sentinel.authorize).toBe('function');
    expect(typeof sentinel.isImplemented).toBe('function');
    expect(typeof sentinel.getStatus).toBe('function');

    // But it always denies
    const entry = createTestEntry();
    const request = createAuthorizationRequest(entry, 'User');
    const response = sentinel.authorize(request);
    expect(response.verdict).toBe('DENY');
  });
});
