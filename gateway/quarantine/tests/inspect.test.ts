/**
 * OMEGA QUARANTINE_V2 — Inspect Tests
 * Phase 16.2
 * 
 * INV-QUA-02: Metadata always preserved
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Quarantine, QuarantineStatus, QuarantineReason, Severity } from '../src/quarantine/index.js';

describe('QUARANTINE inspect()', () => {
  let q: Quarantine;

  beforeEach(() => {
    q = new Quarantine({ autoPurge: false });
  });

  describe('basic inspection', () => {
    it('inspects a quarantined item', () => {
      const qResult = q.quarantine({ test: 'data' });
      const iResult = q.inspect(qResult.id);
      
      expect(iResult.success).toBe(true);
    });

    it('fails for nonexistent item', () => {
      const iResult = q.inspect('nonexistent');
      expect(iResult.success).toBe(false);
      expect(iResult.error).toContain('not found');
    });
  });

  describe('result structure', () => {
    it('includes success flag', () => {
      const qResult = q.quarantine({});
      const iResult = q.inspect(qResult.id);
      expect(typeof iResult.success).toBe('boolean');
    });

    it('includes timestamp', () => {
      const qResult = q.quarantine({});
      const iResult = q.inspect(qResult.id);
      expect(iResult.timestamp).toBeDefined();
    });

    it('includes durationMs', () => {
      const qResult = q.quarantine({});
      const iResult = q.inspect(qResult.id);
      expect(iResult.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('summary vs full item', () => {
    it('returns summary by default', () => {
      const qResult = q.quarantine({ secret: 'data' });
      const iResult = q.inspect(qResult.id);
      
      expect(iResult.summary).toBeDefined();
      expect(iResult.item).toBeUndefined();
    });

    it('returns full item when requested', () => {
      const payload = { secret: 'data' };
      const qResult = q.quarantine(payload);
      const iResult = q.inspect(qResult.id, { includePayload: true });
      
      expect(iResult.item).toBeDefined();
      expect(iResult.item?.payload).toEqual(payload);
    });

    it('summary includes key fields', () => {
      const qResult = q.quarantine({ test: true }, {
        reason: QuarantineReason.MALICIOUS_PATTERN,
        severity: Severity.HIGH,
      });
      const iResult = q.inspect(qResult.id);
      
      expect(iResult.summary?.id).toBe(qResult.id);
      expect(iResult.summary?.status).toBe(QuarantineStatus.QUARANTINED);
      expect(iResult.summary?.reason).toBe(QuarantineReason.MALICIOUS_PATTERN);
      expect(iResult.summary?.severity).toBe(Severity.HIGH);
      expect(iResult.summary?.payloadHash).toBeDefined();
      expect(iResult.summary?.payloadSize).toBeGreaterThan(0);
    });
  });

  describe('metadata preservation (INV-QUA-02)', () => {
    it('preserves all metadata', () => {
      const metadata = {
        source: 'api-v2',
        triggeredBy: 'sentinel',
        context: { endpoint: '/users', method: 'POST' },
        tags: ['xss', 'script'],
        relatedIds: ['REQ-123', 'REQ-456'],
      };
      
      const qResult = q.quarantine({ data: 'test' }, { metadata });
      const iResult = q.inspect(qResult.id, { includePayload: true });
      
      expect(iResult.item?.metadata).toEqual(metadata);
    });

    it('preserves quarantine timestamp', () => {
      const beforeQuarantine = new Date().toISOString();
      const qResult = q.quarantine({ test: true });
      const afterQuarantine = new Date().toISOString();
      
      const iResult = q.inspect(qResult.id, { includePayload: true });
      const quarantinedAt = iResult.item?.quarantinedAt ?? '';
      
      expect(quarantinedAt >= beforeQuarantine).toBe(true);
      expect(quarantinedAt <= afterQuarantine).toBe(true);
    });

    it('preserves expiration timestamp', () => {
      const qResult = q.quarantine({ test: true }, { ttlMs: 60000 });
      const iResult = q.inspect(qResult.id, { includePayload: true });
      
      expect(iResult.item?.expiresAt).toBeDefined();
      const expiresAt = new Date(iResult.item!.expiresAt).getTime();
      const quarantinedAt = new Date(iResult.item!.quarantinedAt).getTime();
      expect(expiresAt - quarantinedAt).toBeCloseTo(60000, -2);
    });

    it('preserves reason and message', () => {
      const qResult = q.quarantine({ test: true }, {
        reason: QuarantineReason.SENTINEL_BLOCK,
        reasonMessage: 'XSS pattern detected: <script>',
      });
      
      const iResult = q.inspect(qResult.id, { includePayload: true });
      expect(iResult.item?.reason).toBe(QuarantineReason.SENTINEL_BLOCK);
      expect(iResult.item?.reasonMessage).toBe('XSS pattern detected: <script>');
    });
  });

  describe('integrity verification', () => {
    it('verifies integrity when requested', () => {
      const qResult = q.quarantine({ test: 'data' });
      const iResult = q.inspect(qResult.id, { verifyIntegrity: true });
      
      expect(iResult.integrityValid).toBe(true);
    });

    it('does not verify integrity by default', () => {
      const qResult = q.quarantine({ test: 'data' });
      const iResult = q.inspect(qResult.id);
      
      expect(iResult.integrityValid).toBeUndefined();
    });
  });

  describe('audit logging', () => {
    it('logs inspect operation', () => {
      const qResult = q.quarantine({});
      q.inspect(qResult.id);
      
      const audit = q.getAuditLog();
      const inspectEntry = audit.find(e => e.action === 'INSPECT');
      expect(inspectEntry).toBeDefined();
      expect(inspectEntry?.itemId).toBe(qResult.id);
    });
  });
});
