/**
 * OMEGA QUARANTINE_V2 — Purge Tests
 * Phase 16.2
 * 
 * INV-QUA-03: TTL/expiration enforced
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Quarantine, QuarantineReason, Severity } from '../src/quarantine/index.js';

describe('QUARANTINE purge()', () => {
  let q: Quarantine;

  beforeEach(() => {
    q = new Quarantine({ autoPurge: false, ttlMs: 100 }); // 100ms TTL for testing
  });

  describe('basic purge', () => {
    it('purges expired items', async () => {
      q.quarantine({ a: 1 });
      q.quarantine({ a: 2 });
      expect(q.size).toBe(2);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = q.purge();
      expect(result.success).toBe(true);
      expect(result.purgedCount).toBe(2);
      expect(q.size).toBe(0);
    });

    it('does not purge non-expired items', () => {
      const longTTL = new Quarantine({ autoPurge: false, ttlMs: 60000 });
      longTTL.quarantine({ a: 1 });
      
      const result = longTTL.purge();
      expect(result.purgedCount).toBe(0);
      expect(longTTL.size).toBe(1);
    });
  });

  describe('result structure', () => {
    it('includes success flag', () => {
      const result = q.purge();
      expect(typeof result.success).toBe('boolean');
    });

    it('includes timestamp', () => {
      const result = q.purge();
      expect(result.timestamp).toBeDefined();
    });

    it('includes durationMs', () => {
      const result = q.purge();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('includes purgedCount', () => {
      const result = q.purge();
      expect(typeof result.purgedCount).toBe('number');
    });

    it('includes purgedIds', () => {
      const result = q.purge();
      expect(Array.isArray(result.purgedIds)).toBe(true);
    });

    it('includes dryRun flag', () => {
      const result = q.purge();
      expect(typeof result.dryRun).toBe('boolean');
    });
  });

  describe('purge options', () => {
    it('expiredOnly option', async () => {
      const r1 = q.quarantine({ a: 1 });
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Add fresh item
      const freshQ = new Quarantine({ autoPurge: false, ttlMs: 60000 });
      freshQ.quarantine({ a: 1 });
      freshQ.quarantine({ a: 2 });
      
      // Only expired should be purged
      const result = freshQ.purge({ expiredOnly: true });
      expect(result.purgedCount).toBe(0);
    });

    it('olderThanMs option', async () => {
      q.quarantine({ a: 1 });
      await new Promise(resolve => setTimeout(resolve, 50));
      q.quarantine({ a: 2 });
      
      const result = q.purge({ olderThanMs: 40, expiredOnly: false });
      expect(result.purgedCount).toBe(1);
    });

    it('reason filter', async () => {
      const qWithReason = new Quarantine({ autoPurge: false, ttlMs: 10 });
      qWithReason.quarantine({ a: 1 }, { reason: QuarantineReason.XSS_PATTERN });
      qWithReason.quarantine({ a: 2 }, { reason: QuarantineReason.MALICIOUS_PATTERN });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = qWithReason.purge({ reason: QuarantineReason.XSS_PATTERN });
      expect(result.purgedCount).toBe(1);
    });

    it('severity filter', async () => {
      const qWithSeverity = new Quarantine({ autoPurge: false, ttlMs: 10 });
      qWithSeverity.quarantine({ a: 1 }, { severity: Severity.LOW });
      qWithSeverity.quarantine({ a: 2 }, { severity: Severity.CRITICAL });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = qWithSeverity.purge({ severity: Severity.LOW });
      expect(result.purgedCount).toBe(1);
    });
  });

  describe('dry run', () => {
    it('does not actually purge in dry run', async () => {
      q.quarantine({ a: 1 });
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = q.purge({ dryRun: true });
      expect(result.purgedCount).toBe(1);
      expect(result.dryRun).toBe(true);
      expect(q.size).toBe(1); // Still there
    });

    it('returns correct IDs in dry run', async () => {
      const r1 = q.quarantine({ a: 1 });
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = q.purge({ dryRun: true });
      expect(result.purgedIds).toContain(r1.id);
    });
  });

  describe('purgeExpired() convenience', () => {
    it('purges only expired items', async () => {
      q.quarantine({ a: 1 });
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = q.purgeExpired();
      expect(result.purgedCount).toBe(1);
    });
  });

  describe('audit logging', () => {
    it('logs purge operations', async () => {
      const r1 = q.quarantine({ a: 1 });
      await new Promise(resolve => setTimeout(resolve, 150));
      
      q.purge();
      
      const audit = q.getAuditLog();
      const purgeEntry = audit.find(e => e.action === 'PURGE');
      expect(purgeEntry).toBeDefined();
      expect(purgeEntry?.itemId).toBe(r1.id);
    });
  });

  describe('counter updates', () => {
    it('increments totalPurged', async () => {
      q.quarantine({ a: 1 });
      q.quarantine({ a: 2 });
      await new Promise(resolve => setTimeout(resolve, 150));
      
      q.purge();
      
      const stats = q.getStats();
      expect(stats.totalPurged).toBe(2);
    });

    it('increments totalExpired for expired items', async () => {
      q.quarantine({ a: 1 });
      await new Promise(resolve => setTimeout(resolve, 150));
      
      q.purge({ expiredOnly: true });
      
      const stats = q.getStats();
      expect(stats.totalExpired).toBe(1);
    });
  });
});
