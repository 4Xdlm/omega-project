/**
 * OMEGA GATEWAY — Quarantine Unit Tests
 * Phase 17
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  Gateway, 
  createContext, 
  GatewayStatus, 
  GatewayStage,
  ThreatSeverity,
} from '../../src/gateway/index.js';

describe('GATEWAY Quarantine', () => {
  let gateway: Gateway;

  beforeEach(() => {
    gateway = new Gateway({
      rateLimitEnabled: false,
      validationEnabled: true,
      quarantineEnabled: true,
      quarantineThreshold: ThreatSeverity.HIGH,
      quarantineTtlMs: 60000,
      strictMode: false,
    });
  });

  describe('auto-quarantine', () => {
    it('quarantines high severity threats', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<script>alert(1)</script>' // HIGH severity
      }, ctx);
      
      expect(result.status).toBe(GatewayStatus.QUARANTINED);
      expect(result.allowed).toBe(false);
      expect(result.reports.quarantine?.quarantined).toBe(true);
    });

    it('does not quarantine low severity', async () => {
      const lowGateway = new Gateway({
        rateLimitEnabled: false,
        validationEnabled: true,
        quarantineEnabled: true,
        quarantineThreshold: ThreatSeverity.HIGH,
        strictMode: false,
      });
      
      const ctx = createContext('client1');
      const result = await lowGateway.run({ 
        data: '<iframe src="x">' // MEDIUM severity
      }, ctx);
      
      // Medium is below HIGH threshold
      expect(result.status).toBe(GatewayStatus.ALLOWED);
    });

    it('generates quarantine ID', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<script>x</script>' 
      }, ctx);
      
      expect(result.reports.quarantine?.quarantineId).toBeDefined();
      expect(result.reports.quarantine?.quarantineId).toMatch(/^QTN-/);
    });

    it('includes expiry time', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<script>x</script>' 
      }, ctx);
      
      expect(result.reports.quarantine?.expiresAt).toBeDefined();
      const expiresAt = new Date(result.reports.quarantine!.expiresAt!);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('includes reason', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<script>x</script>' 
      }, ctx);
      
      expect(result.reports.quarantine?.reason).toBeDefined();
      expect(result.reports.quarantine?.reason).toContain('HIGH');
    });
  });

  describe('quarantine retrieval', () => {
    it('can retrieve quarantined data', async () => {
      const ctx = createContext('client1');
      const originalData = { evil: '<script>x</script>' };
      
      const result = await gateway.run({ data: originalData }, ctx);
      const qId = result.reports.quarantine?.quarantineId!;
      
      const retrieved = gateway.getQuarantined(qId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.data).toEqual(originalData);
    });

    it('returns null for unknown ID', () => {
      const retrieved = gateway.getQuarantined('QTN-unknown');
      expect(retrieved).toBeNull();
    });

    it('preserves original data exactly (INV-GW-03)', async () => {
      const ctx = createContext('client1');
      const complexData = {
        nested: { value: [1, 2, 3] },
        date: '2026-01-05',
        script: '<script>x</script>',
      };
      
      const result = await gateway.run({ data: complexData }, ctx);
      const qId = result.reports.quarantine?.quarantineId!;
      
      const retrieved = gateway.getQuarantined(qId);
      expect(retrieved?.data).toEqual(complexData);
    });
  });

  describe('quarantine release', () => {
    it('can release from quarantine', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ data: '<script>x</script>' }, ctx);
      const qId = result.reports.quarantine?.quarantineId!;
      
      const released = gateway.releaseFromQuarantine(qId);
      expect(released).toBe('<script>x</script>');
      
      // Should be gone after release
      expect(gateway.getQuarantined(qId)).toBeNull();
    });

    it('returns null when releasing unknown ID', () => {
      const released = gateway.releaseFromQuarantine('unknown');
      expect(released).toBeNull();
    });
  });

  describe('quarantine expiry', () => {
    it('purges expired items', async () => {
      const shortTtl = new Gateway({
        rateLimitEnabled: false,
        validationEnabled: true,
        quarantineEnabled: true,
        quarantineThreshold: ThreatSeverity.HIGH,
        quarantineTtlMs: 50, // 50ms TTL
      });
      
      const ctx = createContext('client1');
      const result = await shortTtl.run({ data: '<script>x</script>' }, ctx);
      const qId = result.reports.quarantine?.quarantineId!;
      
      // Should exist initially
      expect(shortTtl.getQuarantined(qId)).not.toBeNull();
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 60));
      
      // Should be gone (returned null on get)
      expect(shortTtl.getQuarantined(qId)).toBeNull();
    });

    it('purgeExpired removes expired items', async () => {
      const shortTtl = new Gateway({
        rateLimitEnabled: false,
        validationEnabled: true,
        quarantineEnabled: true,
        quarantineThreshold: ThreatSeverity.HIGH,
        quarantineTtlMs: 30,
      });
      
      const ctx = createContext('client1');
      await shortTtl.run({ data: '<script>x</script>' }, ctx);
      await shortTtl.run({ data: '<script>y</script>' }, ctx);
      
      await new Promise(resolve => setTimeout(resolve, 40));
      
      const purged = shortTtl.purgeExpired();
      expect(purged).toBe(2);
    });
  });

  describe('disabled quarantine', () => {
    it('skips quarantine when disabled', async () => {
      const noQuarantine = new Gateway({
        rateLimitEnabled: false,
        validationEnabled: true,
        quarantineEnabled: false,
      });
      
      const ctx = createContext('client1');
      const result = await noQuarantine.run({ 
        data: '<script>x</script>' 
      }, ctx);
      
      // High severity should still allow (no quarantine, no block in non-strict)
      expect(result.status).toBe(GatewayStatus.ALLOWED);
      expect(result.reports.quarantine).toBeUndefined();
    });
  });

  describe('metrics', () => {
    it('tracks quarantine count', async () => {
      const ctx = createContext('client1');
      
      await gateway.run({ data: '<script>1</script>' }, ctx);
      await gateway.run({ data: '<script>2</script>' }, ctx);
      await gateway.run({ data: 'safe' }, ctx);
      
      const metrics = gateway.getMetrics();
      expect(metrics.quarantined).toBe(2);
    });
  });
});
