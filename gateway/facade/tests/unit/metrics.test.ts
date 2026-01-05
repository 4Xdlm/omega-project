/**
 * OMEGA GATEWAY — Metrics Unit Tests
 * Phase 17
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  Gateway, 
  createContext, 
  GATEWAY_VERSION,
  ThreatCategory,
} from '../../src/gateway/index.js';

describe('GATEWAY Metrics', () => {
  let gateway: Gateway;

  beforeEach(() => {
    gateway = new Gateway({
      rateLimitEnabled: true,
      rateLimit: 10,
      validationEnabled: true,
      quarantineEnabled: true,
    });
  });

  describe('getMetrics()', () => {
    it('includes timestamp', () => {
      const metrics = gateway.getMetrics();
      expect(metrics.timestamp).toBeDefined();
      expect(new Date(metrics.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('includes version', () => {
      const metrics = gateway.getMetrics();
      expect(metrics.version).toBe(GATEWAY_VERSION);
    });

    it('includes uptime', () => {
      const metrics = gateway.getMetrics();
      expect(metrics.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('includes config', () => {
      const metrics = gateway.getMetrics();
      expect(metrics.config).toBeDefined();
      expect(metrics.config.rateLimit).toBe(10);
    });
  });

  describe('request counters', () => {
    it('tracks totalRequests', async () => {
      for (let i = 0; i < 5; i++) {
        await gateway.run({ data: 'test' }, createContext(`c${i}`));
      }
      expect(gateway.getMetrics().totalRequests).toBe(5);
    });

    it('tracks allowed', async () => {
      for (let i = 0; i < 3; i++) {
        await gateway.run({ data: 'safe' }, createContext(`c${i}`));
      }
      expect(gateway.getMetrics().allowed).toBe(3);
    });

    it('tracks rateLimited', async () => {
      const ctx = createContext('flooder');
      for (let i = 0; i < 15; i++) {
        await gateway.run({ data: 'test' }, ctx);
      }
      expect(gateway.getMetrics().rateLimited).toBe(5);
    });

    it('tracks blocked', async () => {
      await gateway.run({ data: '1; DROP TABLE x' }, createContext('a'));
      await gateway.run({ data: '1; DELETE FROM y' }, createContext('b'));
      expect(gateway.getMetrics().blocked).toBe(2);
    });

    it('tracks quarantined', async () => {
      await gateway.run({ data: '<script>1</script>' }, createContext('a'));
      await gateway.run({ data: '<script>2</script>' }, createContext('b'));
      expect(gateway.getMetrics().quarantined).toBe(2);
    });

    it('tracks errors', async () => {
      gateway.onBefore(() => { throw new Error('test'); });
      
      await gateway.run({ data: 'test' }, createContext('a'));
      await gateway.run({ data: 'test' }, createContext('b'));
      
      expect(gateway.getMetrics().errors).toBe(2);
    });
  });

  describe('rate calculations', () => {
    it('calculates allowRate', async () => {
      for (let i = 0; i < 8; i++) {
        await gateway.run({ data: 'safe' }, createContext(`c${i}`));
      }
      await gateway.run({ data: '<script>x</script>' }, createContext('q'));
      await gateway.run({ data: '1; DROP TABLE' }, createContext('b'));
      
      const metrics = gateway.getMetrics();
      expect(metrics.allowRate).toBe(80); // 8/10 = 80%
    });

    it('calculates blockRate', async () => {
      for (let i = 0; i < 5; i++) {
        await gateway.run({ data: 'safe' }, createContext(`c${i}`));
      }
      
      // Rate limit 5 requests
      const ctx = createContext('flooder');
      for (let i = 0; i < 15; i++) {
        await gateway.run({ data: 'test' }, ctx);
      }
      
      const metrics = gateway.getMetrics();
      // 5 rate limited + 0 blocked out of 20 total
      expect(metrics.blockRate).toBe(25); // 5/20 = 25%
    });
  });

  describe('threat tracking', () => {
    it('initializes all categories to zero', () => {
      const metrics = gateway.getMetrics();
      
      for (const cat of Object.values(ThreatCategory)) {
        expect(metrics.threatsByCategory[cat]).toBe(0);
      }
    });

    it('increments on threat detection', async () => {
      await gateway.run({ data: '<script>x</script>' }, createContext('a'));
      await gateway.run({ data: '<script>y</script>' }, createContext('b'));
      
      const metrics = gateway.getMetrics();
      expect(metrics.threatsByCategory[ThreatCategory.XSS]).toBe(2);
    });

    it('tracks multiple categories', async () => {
      await gateway.run({ data: '<script>x</script>' }, createContext('a'));
      await gateway.run({ data: '../etc/passwd' }, createContext('b'));
      await gateway.run({ data: "' OR '1'='1" }, createContext('c'));
      
      const metrics = gateway.getMetrics();
      expect(metrics.threatsByCategory[ThreatCategory.XSS]).toBeGreaterThan(0);
      expect(metrics.threatsByCategory[ThreatCategory.PATH_TRAVERSAL]).toBeGreaterThan(0);
      expect(metrics.threatsByCategory[ThreatCategory.SQL_INJECTION]).toBeGreaterThan(0);
    });
  });

  describe('duration tracking', () => {
    it('tracks average duration', async () => {
      for (let i = 0; i < 10; i++) {
        await gateway.run({ data: 'test' }, createContext(`c${i}`));
      }
      
      const metrics = gateway.getMetrics();
      expect(metrics.avgDurationMs).toBeGreaterThan(0);
    });
  });

  describe('clear()', () => {
    it('resets all counters', async () => {
      for (let i = 0; i < 10; i++) {
        await gateway.run({ data: 'test' }, createContext(`c${i}`));
      }
      
      gateway.clear();
      
      const metrics = gateway.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.allowed).toBe(0);
      expect(metrics.rateLimited).toBe(0);
      expect(metrics.blocked).toBe(0);
      expect(metrics.quarantined).toBe(0);
      expect(metrics.errors).toBe(0);
    });

    it('resets threat counts', async () => {
      await gateway.run({ data: '<script>x</script>' }, createContext('a'));
      
      gateway.clear();
      
      const metrics = gateway.getMetrics();
      expect(metrics.threatsByCategory[ThreatCategory.XSS]).toBe(0);
    });

    it('clears rate limit state', async () => {
      const ctx = createContext('test');
      
      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await gateway.run({ data: 'test' }, ctx);
      }
      
      gateway.clear();
      
      // Should be allowed again
      const result = await gateway.run({ data: 'test' }, ctx);
      expect(result.allowed).toBe(true);
    });
  });
});
