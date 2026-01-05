/**
 * OMEGA QUARANTINE_V2 — Basic Quarantine Tests
 * Phase 16.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Quarantine,
  QuarantineStatus,
  QuarantineReason,
  Severity,
} from '../src/quarantine/index.js';

describe('QUARANTINE quarantine()', () => {
  let q: Quarantine;

  beforeEach(() => {
    q = new Quarantine({ autoPurge: false });
  });

  describe('basic operations', () => {
    it('quarantines a simple object', () => {
      const result = q.quarantine({ test: 'data' });
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^QUA-/);
    });

    it('quarantines a string', () => {
      const result = q.quarantine('suspicious input');
      expect(result.success).toBe(true);
    });

    it('quarantines a number', () => {
      const result = q.quarantine(42);
      expect(result.success).toBe(true);
    });

    it('quarantines an array', () => {
      const result = q.quarantine([1, 2, 3, 'danger']);
      expect(result.success).toBe(true);
    });

    it('quarantines null', () => {
      const result = q.quarantine(null);
      expect(result.success).toBe(true);
    });

    it('quarantines complex nested object', () => {
      const complex = {
        user: { name: 'test', roles: ['admin'] },
        data: { nested: { deep: { value: 123 } } },
      };
      const result = q.quarantine(complex);
      expect(result.success).toBe(true);
    });
  });

  describe('result structure', () => {
    it('includes success flag', () => {
      const result = q.quarantine({});
      expect(typeof result.success).toBe('boolean');
    });

    it('includes id', () => {
      const result = q.quarantine({});
      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('includes timestamp', () => {
      const result = q.quarantine({});
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('includes durationMs', () => {
      const result = q.quarantine({});
      expect(result.durationMs).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('includes item summary', () => {
      const result = q.quarantine({});
      expect(result.item).toBeDefined();
      expect(result.item.id).toBe(result.id);
      expect(result.item.status).toBe(QuarantineStatus.QUARANTINED);
    });
  });

  describe('options', () => {
    it('accepts custom reason', () => {
      const result = q.quarantine({ data: 'test' }, {
        reason: QuarantineReason.MALICIOUS_PATTERN,
      });
      expect(result.item.reason).toBe(QuarantineReason.MALICIOUS_PATTERN);
    });

    it('accepts custom reason message', () => {
      const result = q.quarantine({ data: 'test' }, {
        reasonMessage: 'XSS detected in input',
      });
      expect(result.success).toBe(true);
    });

    it('accepts custom severity', () => {
      const result = q.quarantine({ data: 'test' }, {
        severity: Severity.CRITICAL,
      });
      expect(result.item.severity).toBe(Severity.CRITICAL);
    });

    it('accepts custom TTL', () => {
      const result = q.quarantine({ data: 'test' }, {
        ttlMs: 1000, // 1 second
      });
      const quarantinedAt = new Date(result.item.quarantinedAt).getTime();
      const expiresAt = new Date(result.item.expiresAt).getTime();
      expect(expiresAt - quarantinedAt).toBeCloseTo(1000, -2);
    });

    it('accepts metadata', () => {
      const result = q.quarantine({ data: 'test' }, {
        metadata: {
          source: 'api-endpoint',
          triggeredBy: 'sentinel',
          tags: ['xss', 'critical'],
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('unique IDs', () => {
    it('generates unique IDs for each quarantine', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const result = q.quarantine({ index: i });
        ids.add(result.id);
      }
      expect(ids.size).toBe(100);
    });

    it('IDs follow expected format', () => {
      const result = q.quarantine({});
      expect(result.id).toMatch(/^QUA-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('payload hash', () => {
    it('generates consistent hash for same payload', () => {
      const payload = { test: 'data', value: 123 };
      const result1 = q.quarantine(payload);
      const result2 = q.quarantine(payload);
      expect(result1.item.payloadHash).toBe(result2.item.payloadHash);
    });

    it('generates different hash for different payload', () => {
      const result1 = q.quarantine({ a: 1 });
      const result2 = q.quarantine({ a: 2 });
      expect(result1.item.payloadHash).not.toBe(result2.item.payloadHash);
    });
  });

  describe('payload size', () => {
    it('calculates correct payload size', () => {
      const result = q.quarantine('hello');
      // "hello" = 7 bytes with JSON quotes
      expect(result.item.payloadSize).toBe(7);
    });

    it('rejects oversized payloads', () => {
      const smallQ = new Quarantine({ maxPayloadSize: 100, autoPurge: false });
      const result = smallQ.quarantine('x'.repeat(200));
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds limit');
    });
  });

  describe('capacity', () => {
    it('rejects when capacity exceeded', () => {
      const tinyQ = new Quarantine({ maxItems: 3, autoPurge: false });
      tinyQ.quarantine({ a: 1 });
      tinyQ.quarantine({ a: 2 });
      tinyQ.quarantine({ a: 3 });
      const result = tinyQ.quarantine({ a: 4 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('capacity');
    });
  });

  describe('size tracking', () => {
    it('tracks number of items', () => {
      expect(q.size).toBe(0);
      q.quarantine({ a: 1 });
      expect(q.size).toBe(1);
      q.quarantine({ a: 2 });
      expect(q.size).toBe(2);
    });

    it('has() returns correct value', () => {
      const result = q.quarantine({ test: true });
      expect(q.has(result.id)).toBe(true);
      expect(q.has('nonexistent')).toBe(false);
    });
  });
});
