/**
 * OMEGA QUARANTINE_V2 — List Tests
 * Phase 16.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Quarantine, QuarantineStatus, QuarantineReason, Severity } from '../src/quarantine/index.js';

describe('QUARANTINE list()', () => {
  let q: Quarantine;

  beforeEach(() => {
    q = new Quarantine({ autoPurge: false });
  });

  describe('basic listing', () => {
    it('lists all quarantined items', () => {
      q.quarantine({ a: 1 });
      q.quarantine({ a: 2 });
      q.quarantine({ a: 3 });
      
      const result = q.list();
      expect(result.success).toBe(true);
      expect(result.items.length).toBe(3);
      expect(result.totalCount).toBe(3);
    });

    it('returns empty list when no items', () => {
      const result = q.list();
      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('result structure', () => {
    it('includes success flag', () => {
      const result = q.list();
      expect(typeof result.success).toBe('boolean');
    });

    it('includes timestamp', () => {
      const result = q.list();
      expect(result.timestamp).toBeDefined();
    });

    it('includes durationMs', () => {
      const result = q.list();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('includes totalCount', () => {
      q.quarantine({});
      const result = q.list();
      expect(result.totalCount).toBe(1);
    });

    it('items are summaries (no payload)', () => {
      q.quarantine({ secret: 'data' });
      const result = q.list();
      
      expect(result.items[0].id).toBeDefined();
      expect((result.items[0] as any).payload).toBeUndefined();
    });
  });

  describe('filtering by status', () => {
    it('filters by QUARANTINED status', () => {
      q.quarantine({ a: 1 });
      q.quarantine({ a: 2 });
      
      const result = q.list({ status: QuarantineStatus.QUARANTINED });
      expect(result.items.length).toBe(2);
    });
  });

  describe('filtering by reason', () => {
    it('filters by reason', () => {
      q.quarantine({ a: 1 }, { reason: QuarantineReason.XSS_PATTERN });
      q.quarantine({ a: 2 }, { reason: QuarantineReason.SQL_INJECTION });
      q.quarantine({ a: 3 }, { reason: QuarantineReason.XSS_PATTERN });
      
      const result = q.list({ reason: QuarantineReason.XSS_PATTERN });
      expect(result.items.length).toBe(2);
    });
  });

  describe('filtering by severity', () => {
    it('filters by severity', () => {
      q.quarantine({ a: 1 }, { severity: Severity.LOW });
      q.quarantine({ a: 2 }, { severity: Severity.CRITICAL });
      q.quarantine({ a: 3 }, { severity: Severity.LOW });
      
      const result = q.list({ severity: Severity.CRITICAL });
      expect(result.items.length).toBe(1);
    });
  });

  describe('pagination', () => {
    it('respects limit', () => {
      for (let i = 0; i < 10; i++) {
        q.quarantine({ index: i });
      }
      
      const result = q.list({ limit: 5 });
      expect(result.items.length).toBe(5);
      expect(result.totalCount).toBe(10);
    });

    it('respects offset', () => {
      for (let i = 0; i < 10; i++) {
        q.quarantine({ index: i });
      }
      
      const result = q.list({ offset: 5, limit: 5 });
      expect(result.items.length).toBe(5);
    });

    it('handles offset beyond range', () => {
      q.quarantine({ a: 1 });
      
      const result = q.list({ offset: 100 });
      expect(result.items.length).toBe(0);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('sorting', () => {
    it('sorts by quarantinedAt desc by default', async () => {
      q.quarantine({ index: 1 });
      await new Promise(resolve => setTimeout(resolve, 10));
      q.quarantine({ index: 2 });
      await new Promise(resolve => setTimeout(resolve, 10));
      q.quarantine({ index: 3 });
      
      const result = q.list();
      // Most recent first
      const times = result.items.map(i => new Date(i.quarantinedAt).getTime());
      expect(times[0]).toBeGreaterThanOrEqual(times[1]);
      expect(times[1]).toBeGreaterThanOrEqual(times[2]);
    });

    it('sorts by quarantinedAt asc', async () => {
      q.quarantine({ index: 1 });
      await new Promise(resolve => setTimeout(resolve, 10));
      q.quarantine({ index: 2 });
      
      const result = q.list({ sortBy: 'quarantinedAt', sortOrder: 'asc' });
      const times = result.items.map(i => new Date(i.quarantinedAt).getTime());
      expect(times[0]).toBeLessThanOrEqual(times[1]);
    });

    it('sorts by severity', () => {
      q.quarantine({ a: 1 }, { severity: Severity.LOW });
      q.quarantine({ a: 2 }, { severity: Severity.CRITICAL });
      q.quarantine({ a: 3 }, { severity: Severity.MEDIUM });
      
      const result = q.list({ sortBy: 'severity', sortOrder: 'desc' });
      expect(result.items[0].severity).toBe(Severity.CRITICAL);
      expect(result.items[2].severity).toBe(Severity.LOW);
    });

    it('sorts by payloadSize', () => {
      q.quarantine('short');
      q.quarantine('this is a much longer string');
      q.quarantine('med');
      
      const result = q.list({ sortBy: 'payloadSize', sortOrder: 'desc' });
      expect(result.items[0].payloadSize).toBeGreaterThan(result.items[1].payloadSize);
    });
  });

  describe('combined filters', () => {
    it('applies multiple filters', () => {
      q.quarantine({ a: 1 }, { reason: QuarantineReason.XSS_PATTERN, severity: Severity.HIGH });
      q.quarantine({ a: 2 }, { reason: QuarantineReason.XSS_PATTERN, severity: Severity.LOW });
      q.quarantine({ a: 3 }, { reason: QuarantineReason.SQL_INJECTION, severity: Severity.HIGH });
      
      const result = q.list({
        reason: QuarantineReason.XSS_PATTERN,
        severity: Severity.HIGH,
      });
      
      expect(result.items.length).toBe(1);
    });
  });
});
