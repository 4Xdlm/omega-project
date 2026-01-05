/**
 * OMEGA QUARANTINE_V2 — Invariants Proof Tests
 * Phase 16.2
 * 
 * INVARIANTS:
 * - INV-QUA-01: Quarantined item isolated from main system
 * - INV-QUA-02: Metadata always preserved
 * - INV-QUA-03: TTL/expiration enforced
 * - INV-QUA-04: Audit trail immutable
 * - INV-QUA-05: Release requires validation
 * - INV-QUA-06: Deterministic behavior
 */

import { describe, it, expect } from 'vitest';
import {
  Quarantine,
  QuarantineStatus,
  QuarantineReason,
  Severity,
  QUARANTINE_VERSION,
} from '../src/quarantine/index.js';

describe('INVARIANTS QUARANTINE_V2', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-QUA-01: Quarantined item isolated from main system
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-QUA-01: Quarantined item isolated', () => {
    it('quarantined items are not directly accessible', () => {
      const q = new Quarantine({ autoPurge: false });
      const payload = { secret: 'data' };
      const result = q.quarantine(payload);
      
      // Item exists in quarantine
      expect(q.has(result.id)).toBe(true);
      
      // But cannot get payload without explicit inspect
      const list = q.list();
      expect((list.items[0] as any).payload).toBeUndefined();
    });

    it('payload only accessible via inspect with includePayload', () => {
      const q = new Quarantine({ autoPurge: false });
      const payload = { secret: 'very secret' };
      const result = q.quarantine(payload);
      
      // Without includePayload
      const inspectNoPayload = q.inspect(result.id);
      expect(inspectNoPayload.item).toBeUndefined();
      expect(inspectNoPayload.summary).toBeDefined();
      
      // With includePayload
      const inspectWithPayload = q.inspect(result.id, { includePayload: true });
      expect(inspectWithPayload.item?.payload).toEqual(payload);
    });

    it('payload only returned on successful release', () => {
      const q = new Quarantine({ autoPurge: false });
      const payload = { critical: 'info' };
      const result = q.quarantine(payload);
      
      // Release returns payload
      const released = q.release<typeof payload>(result.id, { reason: 'Verified safe' });
      expect(released.payload).toEqual(payload);
      
      // Item no longer in quarantine
      expect(q.has(result.id)).toBe(false);
    });

    it('100 items all isolated correctly', () => {
      const q = new Quarantine({ autoPurge: false });
      
      for (let i = 0; i < 100; i++) {
        const result = q.quarantine({ index: i, secret: `secret-${i}` });
        expect(result.success).toBe(true);
      }
      
      // All items in quarantine
      expect(q.size).toBe(100);
      
      // None accessible without explicit action
      const list = q.list();
      for (const item of list.items) {
        expect((item as any).payload).toBeUndefined();
        expect((item as any).secret).toBeUndefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-QUA-02: Metadata always preserved
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-QUA-02: Metadata always preserved', () => {
    it('all metadata fields preserved', () => {
      const q = new Quarantine({ autoPurge: false });
      
      const metadata = {
        source: 'api-gateway',
        triggeredBy: 'sentinel-v3',
        context: { ip: '192.168.1.1', userAgent: 'Test/1.0' },
        tags: ['xss', 'high-priority', 'automated'],
        relatedIds: ['REQ-001', 'REQ-002'],
      };
      
      const result = q.quarantine({ test: true }, {
        reason: QuarantineReason.MALICIOUS_PATTERN,
        reasonMessage: 'XSS script tag detected',
        severity: Severity.CRITICAL,
        metadata,
      });
      
      const inspected = q.inspect(result.id, { includePayload: true });
      
      expect(inspected.item?.reason).toBe(QuarantineReason.MALICIOUS_PATTERN);
      expect(inspected.item?.reasonMessage).toBe('XSS script tag detected');
      expect(inspected.item?.severity).toBe(Severity.CRITICAL);
      expect(inspected.item?.metadata).toEqual(metadata);
    });

    it('timestamps never lost', () => {
      const q = new Quarantine({ autoPurge: false });
      
      const beforeQuarantine = Date.now();
      const result = q.quarantine({ test: true }, { ttlMs: 60000 });
      const afterQuarantine = Date.now();
      
      const inspected = q.inspect(result.id, { includePayload: true });
      
      const quarantinedAt = new Date(inspected.item!.quarantinedAt).getTime();
      const expiresAt = new Date(inspected.item!.expiresAt).getTime();
      
      expect(quarantinedAt).toBeGreaterThanOrEqual(beforeQuarantine);
      expect(quarantinedAt).toBeLessThanOrEqual(afterQuarantine);
      expect(expiresAt).toBe(quarantinedAt + 60000);
    });

    it('hash always calculated and preserved', () => {
      const q = new Quarantine({ autoPurge: false });
      
      const result = q.quarantine({ important: 'data' });
      const inspected = q.inspect(result.id, { includePayload: true });
      
      expect(inspected.item?.payloadHash).toBeDefined();
      expect(inspected.item?.payloadHash.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-QUA-03: TTL/expiration enforced
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-QUA-03: TTL/expiration enforced', () => {
    it('expired items are purged', async () => {
      const q = new Quarantine({ autoPurge: false, ttlMs: 50 });
      
      q.quarantine({ a: 1 });
      q.quarantine({ a: 2 });
      expect(q.size).toBe(2);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      q.purgeExpired();
      expect(q.size).toBe(0);
    });

    it('non-expired items not purged', async () => {
      const q = new Quarantine({ autoPurge: false, ttlMs: 10000 });
      
      q.quarantine({ a: 1 });
      
      // Don't wait
      q.purgeExpired();
      expect(q.size).toBe(1);
    });

    it('custom TTL respected', async () => {
      const q = new Quarantine({ autoPurge: false, ttlMs: 10000 });
      
      // Default TTL (10s)
      q.quarantine({ default: true });
      
      // Custom short TTL (50ms)
      q.quarantine({ custom: true }, { ttlMs: 50 });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      q.purgeExpired();
      expect(q.size).toBe(1); // Only default TTL item remains
    });

    it('expiresAt correctly calculated', () => {
      const q = new Quarantine({ autoPurge: false, ttlMs: 3600000 }); // 1 hour
      
      const before = Date.now();
      const result = q.quarantine({ test: true });
      const after = Date.now();
      
      const quarantinedAt = new Date(result.item.quarantinedAt).getTime();
      const expiresAt = new Date(result.item.expiresAt).getTime();
      
      // Allow 10ms variance for timing
      expect(expiresAt - quarantinedAt).toBeGreaterThanOrEqual(3600000);
      expect(expiresAt - quarantinedAt).toBeLessThanOrEqual(3600010);
      expect(expiresAt).toBeGreaterThanOrEqual(before + 3600000);
      expect(expiresAt).toBeLessThanOrEqual(after + 3600010);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-QUA-04: Audit trail immutable
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-QUA-04: Audit trail immutable', () => {
    it('all operations logged', () => {
      const q = new Quarantine({ autoPurge: false, enableAuditLog: true });
      
      // Quarantine
      const r = q.quarantine({ test: true });
      
      // Inspect
      q.inspect(r.id);
      
      // Release
      q.release(r.id, { reason: 'Safe' });
      
      const audit = q.getAuditLog();
      expect(audit.some(e => e.action === 'QUARANTINE')).toBe(true);
      expect(audit.some(e => e.action === 'INSPECT')).toBe(true);
      expect(audit.some(e => e.action === 'RELEASE')).toBe(true);
    });

    it('audit entries have unique IDs', () => {
      const q = new Quarantine({ autoPurge: false, enableAuditLog: true });
      
      for (let i = 0; i < 10; i++) {
        q.quarantine({ index: i });
      }
      
      const audit = q.getAuditLog();
      const ids = audit.map(e => e.id);
      expect(new Set(ids).size).toBe(ids.length); // All unique
    });

    it('audit log is append-only (cannot shrink except via clear)', () => {
      const q = new Quarantine({ autoPurge: false, enableAuditLog: true });
      
      q.quarantine({ a: 1 });
      const len1 = q.getAuditLog().length;
      
      q.quarantine({ a: 2 });
      const len2 = q.getAuditLog().length;
      
      q.quarantine({ a: 3 });
      const len3 = q.getAuditLog().length;
      
      expect(len2).toBeGreaterThan(len1);
      expect(len3).toBeGreaterThan(len2);
    });

    it('external modifications do not affect internal log', () => {
      const q = new Quarantine({ autoPurge: false, enableAuditLog: true });
      q.quarantine({});
      
      const audit = q.getAuditLog();
      const originalLength = audit.length;
      
      // Try to modify returned array
      audit.push({ id: 'fake', timestamp: '', action: 'QUARANTINE', itemId: '', details: '', success: false });
      
      // Internal log unaffected
      expect(q.getAuditLog().length).toBe(originalLength);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-QUA-05: Release requires validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-QUA-05: Release requires validation', () => {
    it('release fails without reason when required', () => {
      const q = new Quarantine({ autoPurge: false, requireReleaseReason: true });
      
      const r = q.quarantine({});
      const released = q.release(r.id, { reason: '' });
      
      expect(released.success).toBe(false);
      expect(released.error).toContain('reason');
    });

    it('release succeeds with valid reason', () => {
      const q = new Quarantine({ autoPurge: false, requireReleaseReason: true });
      
      const r = q.quarantine({});
      const released = q.release(r.id, { reason: 'Manually verified as safe' });
      
      expect(released.success).toBe(true);
    });

    it('release fails for nonexistent item', () => {
      const q = new Quarantine({ autoPurge: false });
      
      const released = q.release('nonexistent-id', { reason: 'Test' });
      
      expect(released.success).toBe(false);
      expect(released.error).toContain('not found');
    });

    it('release fails for already released item', () => {
      const q = new Quarantine({ autoPurge: false });
      
      const r = q.quarantine({});
      q.release(r.id, { reason: 'First' });
      
      const secondRelease = q.release(r.id, { reason: 'Second' });
      expect(secondRelease.success).toBe(false);
    });

    it('integrity check by default', () => {
      const q = new Quarantine({ autoPurge: false });
      
      const r = q.quarantine({ test: true });
      const released = q.release(r.id, { reason: 'Safe' });
      
      // Should succeed because integrity is intact
      expect(released.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-QUA-06: Deterministic behavior
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-QUA-06: Deterministic behavior', () => {
    it('same payload produces same hash', () => {
      const q = new Quarantine({ autoPurge: false });
      
      const payload = { test: 'determinism', value: 42 };
      
      const r1 = q.quarantine(payload);
      const r2 = q.quarantine(payload);
      const r3 = q.quarantine(payload);
      
      expect(r1.item.payloadHash).toBe(r2.item.payloadHash);
      expect(r2.item.payloadHash).toBe(r3.item.payloadHash);
    });

    it('different payloads produce different hashes', () => {
      const q = new Quarantine({ autoPurge: false });
      
      const hashes = [
        q.quarantine({ a: 1 }).item.payloadHash,
        q.quarantine({ a: 2 }).item.payloadHash,
        q.quarantine({ b: 1 }).item.payloadHash,
        q.quarantine('string').item.payloadHash,
        q.quarantine([1, 2, 3]).item.payloadHash,
      ];
      
      expect(new Set(hashes).size).toBe(hashes.length); // All unique
    });

    it('stats are consistent', () => {
      const q = new Quarantine({ autoPurge: false });
      
      q.quarantine({ a: 1 });
      q.quarantine({ a: 2 });
      const r3 = q.quarantine({ a: 3 });
      q.release(r3.id, { reason: 'Safe' });
      
      const stats = q.getStats();
      
      // totalQuarantined = 3 (all that were quarantined)
      expect(stats.totalQuarantined).toBe(3);
      
      // totalReleased = 1
      expect(stats.totalReleased).toBe(1);
      
      // Current size = 2 (3 - 1 released)
      expect(q.size).toBe(2);
    });

    it('version always returns correct value', () => {
      const q = new Quarantine({ autoPurge: false });
      
      for (let i = 0; i < 10; i++) {
        expect(q.getStats().version).toBe(QUARANTINE_VERSION);
      }
    });

    it('ID format is consistent', () => {
      const q = new Quarantine({ autoPurge: false });
      
      for (let i = 0; i < 50; i++) {
        const result = q.quarantine({ index: i });
        expect(result.id).toMatch(/^QUA-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
      }
    });
  });
});
