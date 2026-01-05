/**
 * OMEGA GATEWAY — Rate Limiting Unit Tests
 * Phase 17
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Gateway, createContext, GatewayStatus, GatewayStage } from '../../src/gateway/index.js';

describe('GATEWAY Rate Limiting', () => {
  let gateway: Gateway;

  beforeEach(() => {
    gateway = new Gateway({
      rateLimitEnabled: true,
      rateLimit: 5,
      rateWindowMs: 1000,
      validationEnabled: false,
      quarantineEnabled: false,
    });
  });

  describe('basic limiting', () => {
    it('allows requests under limit', async () => {
      const ctx = createContext('client1');
      
      for (let i = 0; i < 5; i++) {
        const result = await gateway.run({ data: 'test' }, ctx);
        expect(result.status).toBe(GatewayStatus.ALLOWED);
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks requests over limit', async () => {
      const ctx = createContext('client1');
      
      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        await gateway.run({ data: 'test' }, ctx);
      }
      
      // Next should be rate limited
      const result = await gateway.run({ data: 'test' }, ctx);
      expect(result.status).toBe(GatewayStatus.RATE_LIMITED);
      expect(result.allowed).toBe(false);
      expect(result.rejectedAt).toBe(GatewayStage.RATE_LIMIT);
    });

    it('includes rate limit report', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ data: 'test' }, ctx);
      
      expect(result.reports.rateLimit).toBeDefined();
      expect(result.reports.rateLimit?.stage).toBe(GatewayStage.RATE_LIMIT);
      expect(result.reports.rateLimit?.allowed).toBe(true);
      expect(result.reports.rateLimit?.currentCount).toBe(1);
      expect(result.reports.rateLimit?.remaining).toBe(4);
    });

    it('tracks remaining correctly', async () => {
      const ctx = createContext('client1');
      
      for (let i = 0; i < 3; i++) {
        const result = await gateway.run({ data: 'test' }, ctx);
        expect(result.reports.rateLimit?.remaining).toBe(4 - i);
      }
    });
  });

  describe('per-client isolation', () => {
    it('tracks clients independently', async () => {
      const ctx1 = createContext('client1');
      const ctx2 = createContext('client2');
      
      // Exhaust client1
      for (let i = 0; i < 5; i++) {
        await gateway.run({ data: 'test' }, ctx1);
      }
      
      // client2 should still be allowed
      const result = await gateway.run({ data: 'test' }, ctx2);
      expect(result.status).toBe(GatewayStatus.ALLOWED);
    });

    it('rate limits only affected client', async () => {
      const ctx1 = createContext('client1');
      const ctx2 = createContext('client2');
      
      // Exhaust client1
      for (let i = 0; i < 6; i++) {
        await gateway.run({ data: 'test' }, ctx1);
      }
      
      const r1 = await gateway.run({ data: 'test' }, ctx1);
      const r2 = await gateway.run({ data: 'test' }, ctx2);
      
      expect(r1.status).toBe(GatewayStatus.RATE_LIMITED);
      expect(r2.status).toBe(GatewayStatus.ALLOWED);
    });
  });

  describe('window reset', () => {
    it('resets count after window expires', async () => {
      const gateway = new Gateway({
        rateLimitEnabled: true,
        rateLimit: 2,
        rateWindowMs: 50, // 50ms window
        validationEnabled: false,
      });
      
      const ctx = createContext('client1');
      
      // Exhaust limit
      await gateway.run({ data: 'test' }, ctx);
      await gateway.run({ data: 'test' }, ctx);
      
      let result = await gateway.run({ data: 'test' }, ctx);
      expect(result.status).toBe(GatewayStatus.RATE_LIMITED);
      
      // Wait for window reset
      await new Promise(resolve => setTimeout(resolve, 60));
      
      result = await gateway.run({ data: 'test' }, ctx);
      expect(result.status).toBe(GatewayStatus.ALLOWED);
      expect(result.reports.rateLimit?.currentCount).toBe(1);
    });
  });

  describe('disabled rate limiting', () => {
    it('skips rate limiting when disabled', async () => {
      const gateway = new Gateway({
        rateLimitEnabled: false,
        validationEnabled: false,
      });
      
      const ctx = createContext('client1');
      
      // Should never be rate limited
      for (let i = 0; i < 100; i++) {
        const result = await gateway.run({ data: 'test' }, ctx);
        expect(result.status).toBe(GatewayStatus.ALLOWED);
        expect(result.reports.rateLimit).toBeUndefined();
      }
    });
  });

  describe('metrics', () => {
    it('tracks rate limited count', async () => {
      const ctx = createContext('client1');
      
      for (let i = 0; i < 10; i++) {
        await gateway.run({ data: 'test' }, ctx);
      }
      
      const metrics = gateway.getMetrics();
      expect(metrics.rateLimited).toBe(5);
      expect(metrics.allowed).toBe(5);
    });
  });
});
