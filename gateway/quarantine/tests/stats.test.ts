/**
 * OMEGA QUARANTINE_V2 — Statistics Tests
 * Phase 16.2
 * 
 * INV-QUA-04: Audit trail immutable
 * INV-QUA-06: Deterministic behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Quarantine,
  QuarantineStatus,
  QuarantineReason,
  Severity,
  QUARANTINE_VERSION,
} from '../src/quarantine/index.js';

describe('QUARANTINE getStats()', () => {
  let q: Quarantine;

  beforeEach(() => {
    q = new Quarantine({ autoPurge: false });
  });

  describe('report structure', () => {
    it('includes timestamp', () => {
      const stats = q.getStats();
      expect(stats.timestamp).toBeDefined();
      expect(new Date(stats.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('includes version', () => {
      const stats = q.getStats();
      expect(stats.version).toBe(QUARANTINE_VERSION);
    });

    it('includes uptimeMs', () => {
      const stats = q.getStats();
      expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('includes all counter fields', () => {
      const stats = q.getStats();
      expect(stats.totalQuarantined).toBeDefined();
      expect(stats.totalReleased).toBeDefined();
      expect(stats.totalPurged).toBeDefined();
      expect(stats.totalExpired).toBeDefined();
    });

    it('includes byStatus', () => {
      const stats = q.getStats();
      expect(stats.byStatus).toBeDefined();
      expect(stats.byStatus[QuarantineStatus.QUARANTINED]).toBeDefined();
    });

    it('includes byReason', () => {
      const stats = q.getStats();
      expect(stats.byReason).toBeDefined();
      expect(stats.byReason[QuarantineReason.UNKNOWN]).toBeDefined();
    });

    it('includes bySeverity', () => {
      const stats = q.getStats();
      expect(stats.bySeverity).toBeDefined();
      expect(stats.bySeverity[Severity.MEDIUM]).toBeDefined();
    });

    it('includes totalPayloadSize', () => {
      const stats = q.getStats();
      expect(typeof stats.totalPayloadSize).toBe('number');
    });

    it('includes config', () => {
      const stats = q.getStats();
      expect(stats.config).toBeDefined();
      expect(stats.config.ttlMs).toBeDefined();
    });
  });

  describe('counter tracking', () => {
    it('tracks totalQuarantined', () => {
      q.quarantine({ a: 1 });
      q.quarantine({ a: 2 });
      q.quarantine({ a: 3 });
      
      const stats = q.getStats();
      expect(stats.totalQuarantined).toBe(3);
    });

    it('tracks totalReleased', () => {
      const r1 = q.quarantine({ a: 1 });
      const r2 = q.quarantine({ a: 2 });
      
      q.release(r1.id, { reason: 'Safe' });
      q.release(r2.id, { reason: 'Safe' });
      
      const stats = q.getStats();
      expect(stats.totalReleased).toBe(2);
    });

    it('tracks byStatus correctly', () => {
      q.quarantine({ a: 1 });
      q.quarantine({ a: 2 });
      
      const stats = q.getStats();
      expect(stats.byStatus[QuarantineStatus.QUARANTINED]).toBe(2);
    });

    it('tracks byReason correctly', () => {
      q.quarantine({ a: 1 }, { reason: QuarantineReason.XSS_PATTERN });
      q.quarantine({ a: 2 }, { reason: QuarantineReason.XSS_PATTERN });
      q.quarantine({ a: 3 }, { reason: QuarantineReason.SQL_INJECTION });
      
      const stats = q.getStats();
      expect(stats.byReason[QuarantineReason.XSS_PATTERN]).toBe(2);
      expect(stats.byReason[QuarantineReason.SQL_INJECTION]).toBe(1);
    });

    it('tracks bySeverity correctly', () => {
      q.quarantine({ a: 1 }, { severity: Severity.LOW });
      q.quarantine({ a: 2 }, { severity: Severity.CRITICAL });
      q.quarantine({ a: 3 }, { severity: Severity.CRITICAL });
      
      const stats = q.getStats();
      expect(stats.bySeverity[Severity.LOW]).toBe(1);
      expect(stats.bySeverity[Severity.CRITICAL]).toBe(2);
    });

    it('tracks totalPayloadSize correctly', () => {
      q.quarantine('hello'); // 7 bytes
      q.quarantine('world'); // 7 bytes
      
      const stats = q.getStats();
      expect(stats.totalPayloadSize).toBe(14);
    });
  });

  describe('config snapshot', () => {
    it('reflects custom config', () => {
      const customQ = new Quarantine({
        ttlMs: 12345,
        maxItems: 500,
        autoPurge: false,
      });
      
      const stats = customQ.getStats();
      expect(stats.config.ttlMs).toBe(12345);
      expect(stats.config.maxItems).toBe(500);
    });
  });
});

describe('QUARANTINE getAuditLog() (INV-QUA-04)', () => {
  let q: Quarantine;

  beforeEach(() => {
    q = new Quarantine({ autoPurge: false, enableAuditLog: true });
  });

  describe('basic audit', () => {
    it('logs quarantine operations', () => {
      q.quarantine({ test: true });
      
      const audit = q.getAuditLog();
      expect(audit.length).toBe(1);
      expect(audit[0].action).toBe('QUARANTINE');
    });

    it('logs release operations', () => {
      const r = q.quarantine({});
      q.release(r.id, { reason: 'Safe' });
      
      const audit = q.getAuditLog();
      expect(audit.some(e => e.action === 'RELEASE')).toBe(true);
    });

    it('logs inspect operations', () => {
      const r = q.quarantine({});
      q.inspect(r.id);
      
      const audit = q.getAuditLog();
      expect(audit.some(e => e.action === 'INSPECT')).toBe(true);
    });

    it('logs purge operations', async () => {
      const shortQ = new Quarantine({ autoPurge: false, ttlMs: 10, enableAuditLog: true });
      shortQ.quarantine({});
      await new Promise(resolve => setTimeout(resolve, 50));
      shortQ.purge();
      
      const audit = shortQ.getAuditLog();
      expect(audit.some(e => e.action === 'PURGE')).toBe(true);
    });
  });

  describe('audit entry structure', () => {
    it('includes all required fields', () => {
      const r = q.quarantine({});
      const audit = q.getAuditLog();
      const entry = audit[0];
      
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.action).toBeDefined();
      expect(entry.itemId).toBe(r.id);
      expect(entry.details).toBeDefined();
      expect(entry.success).toBeDefined();
    });

    it('tracks actor when provided', () => {
      const r = q.quarantine({});
      q.release(r.id, { reason: 'Safe', releasedBy: 'admin' });
      
      const audit = q.getAuditLog();
      const releaseEntry = audit.find(e => e.action === 'RELEASE');
      expect(releaseEntry?.actor).toBe('admin');
    });
  });

  describe('audit immutability (INV-QUA-04)', () => {
    it('returns copy of audit log', () => {
      q.quarantine({});
      const audit1 = q.getAuditLog();
      const audit2 = q.getAuditLog();
      
      expect(audit1).not.toBe(audit2); // Different array instances
      expect(audit1).toEqual(audit2); // Same content
    });

    it('audit log is append-only', () => {
      q.quarantine({ a: 1 });
      const length1 = q.getAuditLog().length;
      
      q.quarantine({ a: 2 });
      const length2 = q.getAuditLog().length;
      
      expect(length2).toBeGreaterThan(length1);
    });

    it('supports limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        q.quarantine({ index: i });
      }
      
      const audit = q.getAuditLog(5);
      expect(audit.length).toBe(5);
    });
  });

  describe('audit log disabled', () => {
    it('does not log when disabled', () => {
      const noAuditQ = new Quarantine({ autoPurge: false, enableAuditLog: false });
      noAuditQ.quarantine({});
      
      const audit = noAuditQ.getAuditLog();
      expect(audit.length).toBe(0);
    });
  });
});

describe('QUARANTINE clear()', () => {
  it('clears all items', () => {
    const q = new Quarantine({ autoPurge: false });
    q.quarantine({ a: 1 });
    q.quarantine({ a: 2 });
    
    q.clear();
    expect(q.size).toBe(0);
  });

  it('clears audit log', () => {
    const q = new Quarantine({ autoPurge: false });
    q.quarantine({});
    q.clear();
    
    expect(q.getAuditLog().length).toBe(0);
  });

  it('resets counters', () => {
    const q = new Quarantine({ autoPurge: false });
    q.quarantine({});
    q.clear();
    
    const stats = q.getStats();
    expect(stats.totalQuarantined).toBe(0);
  });
});
