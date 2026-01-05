/**
 * OMEGA QUARANTINE_V2 — Release Tests
 * Phase 16.2
 * 
 * INV-QUA-05: Release requires validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Quarantine, QuarantineStatus } from '../src/quarantine/index.js';

describe('QUARANTINE release()', () => {
  let q: Quarantine;

  beforeEach(() => {
    q = new Quarantine({ autoPurge: false });
  });

  describe('successful release', () => {
    it('releases a quarantined item', () => {
      const qResult = q.quarantine({ data: 'test' });
      const rResult = q.release(qResult.id, { reason: 'Verified safe' });
      
      expect(rResult.success).toBe(true);
      expect(rResult.id).toBe(qResult.id);
    });

    it('returns the payload on release', () => {
      const payload = { secret: 'data', value: 42 };
      const qResult = q.quarantine(payload);
      const rResult = q.release<typeof payload>(qResult.id, { reason: 'Safe' });
      
      expect(rResult.payload).toEqual(payload);
    });

    it('removes item from quarantine after release', () => {
      const qResult = q.quarantine({ test: true });
      expect(q.has(qResult.id)).toBe(true);
      
      q.release(qResult.id, { reason: 'Safe' });
      expect(q.has(qResult.id)).toBe(false);
    });

    it('decrements size after release', () => {
      q.quarantine({ a: 1 });
      const r2 = q.quarantine({ a: 2 });
      expect(q.size).toBe(2);
      
      q.release(r2.id, { reason: 'Safe' });
      expect(q.size).toBe(1);
    });
  });

  describe('result structure', () => {
    it('includes success flag', () => {
      const qResult = q.quarantine({});
      const rResult = q.release(qResult.id, { reason: 'Test' });
      expect(typeof rResult.success).toBe('boolean');
    });

    it('includes id', () => {
      const qResult = q.quarantine({});
      const rResult = q.release(qResult.id, { reason: 'Test' });
      expect(rResult.id).toBe(qResult.id);
    });

    it('includes timestamp', () => {
      const qResult = q.quarantine({});
      const rResult = q.release(qResult.id, { reason: 'Test' });
      expect(rResult.timestamp).toBeDefined();
      expect(new Date(rResult.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('includes durationMs', () => {
      const qResult = q.quarantine({});
      const rResult = q.release(qResult.id, { reason: 'Test' });
      expect(rResult.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('release validation (INV-QUA-05)', () => {
    it('requires reason by default', () => {
      const qResult = q.quarantine({});
      const rResult = q.release(qResult.id, { reason: '' });
      expect(rResult.success).toBe(false);
      expect(rResult.error).toContain('reason');
    });

    it('fails for nonexistent item', () => {
      const rResult = q.release('nonexistent', { reason: 'Test' });
      expect(rResult.success).toBe(false);
      expect(rResult.error).toContain('not found');
    });

    it('fails for already released item', () => {
      const qResult = q.quarantine({});
      q.release(qResult.id, { reason: 'First release' });
      
      // Try to release again
      const rResult = q.release(qResult.id, { reason: 'Second release' });
      expect(rResult.success).toBe(false);
    });
  });

  describe('integrity verification', () => {
    it('verifies payload integrity by default', () => {
      const qResult = q.quarantine({ data: 'original' });
      const rResult = q.release(qResult.id, { reason: 'Safe' });
      expect(rResult.success).toBe(true);
    });

    it('can skip validation', () => {
      const qResult = q.quarantine({ data: 'test' });
      const rResult = q.release(qResult.id, {
        reason: 'Emergency release',
        skipValidation: true,
      });
      expect(rResult.success).toBe(true);
    });
  });

  describe('releasedBy tracking', () => {
    it('tracks who released', () => {
      const qResult = q.quarantine({});
      q.release(qResult.id, {
        reason: 'Verified',
        releasedBy: 'admin@example.com',
      });
      
      // Check audit log
      const audit = q.getAuditLog();
      const releaseEntry = audit.find(e => e.action === 'RELEASE');
      expect(releaseEntry?.actor).toBe('admin@example.com');
    });
  });

  describe('configuration: requireReleaseReason', () => {
    it('allows empty reason when disabled', () => {
      const noReasonQ = new Quarantine({
        autoPurge: false,
        requireReleaseReason: false,
      });
      
      const qResult = noReasonQ.quarantine({});
      const rResult = noReasonQ.release(qResult.id, { reason: '' });
      expect(rResult.success).toBe(true);
    });
  });

  describe('payload types', () => {
    it('releases string payload', () => {
      const qResult = q.quarantine('test string');
      const rResult = q.release<string>(qResult.id, { reason: 'Safe' });
      expect(rResult.payload).toBe('test string');
    });

    it('releases number payload', () => {
      const qResult = q.quarantine(42);
      const rResult = q.release<number>(qResult.id, { reason: 'Safe' });
      expect(rResult.payload).toBe(42);
    });

    it('releases array payload', () => {
      const arr = [1, 2, 3];
      const qResult = q.quarantine(arr);
      const rResult = q.release<number[]>(qResult.id, { reason: 'Safe' });
      expect(rResult.payload).toEqual(arr);
    });

    it('releases complex object payload', () => {
      const obj = { nested: { deep: { value: true } } };
      const qResult = q.quarantine(obj);
      const rResult = q.release<typeof obj>(qResult.id, { reason: 'Safe' });
      expect(rResult.payload).toEqual(obj);
    });
  });
});
