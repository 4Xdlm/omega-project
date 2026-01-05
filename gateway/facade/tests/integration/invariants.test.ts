/**
 * OMEGA GATEWAY — Invariant Proof Tests
 * Phase 17
 * 
 * INVARIANTS:
 * - INV-GW-01: Rate limit checked before validation
 * - INV-GW-02: Blocked input never reaches output
 * - INV-GW-03: Quarantine preserves original data
 * - INV-GW-04: Result always contains complete context
 * - INV-GW-05: Metrics accurate
 * - INV-GW-06: Deterministic processing
 */

import { describe, it, expect } from 'vitest';
import { 
  Gateway, 
  createContext, 
  GatewayStatus, 
  GatewayStage,
  ThreatSeverity,
  GATEWAY_VERSION,
} from '../../src/gateway/index.js';

describe('INVARIANTS GATEWAY', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-GW-01: Rate limit checked before validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-GW-01: Rate limit checked before validation', () => {
    it('rate limit stage always comes before validation', async () => {
      const gateway = new Gateway({
        rateLimitEnabled: true,
        rateLimit: 100,
        validationEnabled: true,
      });
      
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(await gateway.run({ data: 'test' }, createContext(`c${i}`)));
      }
      
      for (const result of results) {
        const rlIndex = result.stagesCompleted.indexOf(GatewayStage.RATE_LIMIT);
        const valIndex = result.stagesCompleted.indexOf(GatewayStage.VALIDATION);
        
        if (rlIndex >= 0 && valIndex >= 0) {
          expect(rlIndex).toBeLessThan(valIndex);
        }
      }
    });

    it('rate limited request never reaches validation', async () => {
      const gateway = new Gateway({
        rateLimitEnabled: true,
        rateLimit: 2,
        validationEnabled: true,
      });
      
      const ctx = createContext('test');
      
      // Exhaust limit
      await gateway.run({ data: 'test' }, ctx);
      await gateway.run({ data: 'test' }, ctx);
      
      // Third request should be rate limited
      const result = await gateway.run({ data: '<script>evil</script>' }, ctx);
      
      expect(result.status).toBe(GatewayStatus.RATE_LIMITED);
      expect(result.stagesCompleted).not.toContain(GatewayStage.VALIDATION);
      // No threats detected because validation was never run
      expect(result.threats).toHaveLength(0);
    });

    it('expensive validation skipped for rate limited requests', async () => {
      const gateway = new Gateway({
        rateLimitEnabled: true,
        rateLimit: 1,
        validationEnabled: true,
      });
      
      const ctx = createContext('test');
      await gateway.run({ data: 'first' }, ctx);
      
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        await gateway.run({ data: '<script>x</script>'.repeat(100) }, ctx);
      }
      const elapsed = performance.now() - start;
      
      // Should be fast because validation is skipped
      expect(elapsed).toBeLessThan(1000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-GW-02: Blocked input never reaches output
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-GW-02: Blocked input never reaches output', () => {
    it('blocked request has no data in result', async () => {
      const gateway = new Gateway({
        rateLimitEnabled: false,
        validationEnabled: true,
        strictMode: true,
      });
      
      const ctx = createContext('test');
      const result = await gateway.run({ 
        data: '1; DROP TABLE users' 
      }, ctx);
      
      expect(result.status).toBe(GatewayStatus.BLOCKED);
      expect(result.data).toBeUndefined();
    });

    it('rate limited request has no data in result', async () => {
      const gateway = new Gateway({
        rateLimitEnabled: true,
        rateLimit: 0, // Immediately rate limit
      });
      
      const ctx = createContext('test');
      const result = await gateway.run({ data: 'sensitive' }, ctx);
      
      expect(result.status).toBe(GatewayStatus.RATE_LIMITED);
      expect(result.data).toBeUndefined();
    });

    it('quarantined request has no data in result', async () => {
      const gateway = new Gateway({
        rateLimitEnabled: false,
        validationEnabled: true,
        quarantineEnabled: true,
        quarantineThreshold: ThreatSeverity.HIGH,
      });
      
      const ctx = createContext('test');
      const result = await gateway.run({ 
        data: '<script>evil</script>' 
      }, ctx);
      
      expect(result.status).toBe(GatewayStatus.QUARANTINED);
      expect(result.data).toBeUndefined();
    });

    it('only ALLOWED status has data', async () => {
      const gateway = new Gateway({
        rateLimitEnabled: true,
        rateLimit: 10,
        validationEnabled: true,
        quarantineEnabled: true,
      });
      
      const scenarios = [
        { data: 'safe', expectedStatus: GatewayStatus.ALLOWED, expectData: true },
        { data: '<script>x</script>', expectedStatus: GatewayStatus.QUARANTINED, expectData: false },
        { data: '1; DROP TABLE x', expectedStatus: GatewayStatus.BLOCKED, expectData: false },
      ];
      
      for (const scenario of scenarios) {
        const result = await gateway.run({ data: scenario.data }, createContext('test'));
        expect(result.status).toBe(scenario.expectedStatus);
        if (scenario.expectData) {
          expect(result.data).toBe(scenario.data);
        } else {
          expect(result.data).toBeUndefined();
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-GW-03: Quarantine preserves original data
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-GW-03: Quarantine preserves original data', () => {
    it('quarantined data is exact copy', async () => {
      const gateway = new Gateway({
        validationEnabled: true,
        quarantineEnabled: true,
        quarantineThreshold: ThreatSeverity.HIGH,
      });
      
      const original = {
        nested: { array: [1, 2, 3], value: 'test' },
        evil: '<script>alert(1)</script>',
        date: '2026-01-05',
      };
      
      const ctx = createContext('test');
      const result = await gateway.run({ data: original }, ctx);
      
      const qId = result.reports.quarantine?.quarantineId!;
      const retrieved = gateway.getQuarantined(qId);
      
      expect(retrieved?.data).toEqual(original);
    });

    it('quarantined data is independent copy', async () => {
      const gateway = new Gateway({
        validationEnabled: true,
        quarantineEnabled: true,
        quarantineThreshold: ThreatSeverity.HIGH,
      });
      
      const original = { evil: '<script>x</script>', mutable: [1, 2] };
      
      const ctx = createContext('test');
      const result = await gateway.run({ data: original }, ctx);
      
      // Mutate original
      original.mutable.push(3);
      
      const qId = result.reports.quarantine?.quarantineId!;
      const retrieved = gateway.getQuarantined(qId);
      
      // Quarantined copy should be unchanged
      expect((retrieved?.data as any).mutable).toEqual([1, 2]);
    });

    it('released data matches original', async () => {
      const gateway = new Gateway({
        validationEnabled: true,
        quarantineEnabled: true,
        quarantineThreshold: ThreatSeverity.HIGH,
      });
      
      const original = '<script>test</script>';
      
      const result = await gateway.run({ data: original }, createContext('test'));
      const qId = result.reports.quarantine?.quarantineId!;
      const released = gateway.releaseFromQuarantine(qId);
      
      expect(released).toBe(original);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-GW-04: Result always contains complete context
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-GW-04: Result always contains complete context', () => {
    it('context preserved for allowed requests', async () => {
      const gateway = new Gateway();
      const ctx = createContext('user1', 'req1', { key: 'value' });
      const result = await gateway.run({ data: 'safe' }, ctx);
      
      expect(result.context).toEqual(ctx);
    });

    it('context preserved for blocked requests', async () => {
      const gateway = new Gateway({ strictMode: true });
      const ctx = createContext('user2', 'req2', { role: 'admin' });
      const result = await gateway.run({ data: '<script>x</script>' }, ctx);
      
      expect(result.context).toEqual(ctx);
    });

    it('context preserved for rate limited requests', async () => {
      const gateway = new Gateway({ rateLimit: 0 });
      const ctx = createContext('user3', 'req3');
      const result = await gateway.run({ data: 'test' }, ctx);
      
      expect(result.context).toEqual(ctx);
    });

    it('context preserved for quarantined requests', async () => {
      const gateway = new Gateway({
        quarantineEnabled: true,
        quarantineThreshold: ThreatSeverity.HIGH,
      });
      const ctx = createContext('user4', 'req4', { session: 'abc' });
      const result = await gateway.run({ data: '<script>x</script>' }, ctx);
      
      expect(result.context).toEqual(ctx);
    });

    it('context preserved for error requests', async () => {
      const gateway = new Gateway();
      gateway.onBefore(() => { throw new Error('test'); });
      
      const ctx = createContext('user5', 'req5');
      const result = await gateway.run({ data: 'test' }, ctx);
      
      expect(result.context).toEqual(ctx);
    });

    it('all context fields present', async () => {
      const gateway = new Gateway();
      const ctx = createContext('client', 'request', { meta: 'data' });
      const result = await gateway.run({ data: 'test' }, ctx);
      
      expect(result.context.clientId).toBe('client');
      expect(result.context.requestId).toBe('request');
      expect(result.context.timestamp).toBeDefined();
      expect(result.context.metadata).toEqual({ meta: 'data' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-GW-05: Metrics accurate
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-GW-05: Metrics accurate', () => {
    it('totalRequests equals sum of outcomes', async () => {
      const gateway = new Gateway({
        rateLimit: 3,
        quarantineEnabled: true,
        quarantineThreshold: ThreatSeverity.HIGH,
      });
      
      // Send various requests
      await gateway.run({ data: 'safe1' }, createContext('a'));
      await gateway.run({ data: 'safe2' }, createContext('b'));
      await gateway.run({ data: '<script>x</script>' }, createContext('c')); // quarantine
      await gateway.run({ data: '1; DROP TABLE x' }, createContext('d')); // block
      
      // Rate limit someone
      const ctx = createContext('flooder');
      for (let i = 0; i < 5; i++) {
        await gateway.run({ data: 'flood' }, ctx);
      }
      
      const m = gateway.getMetrics();
      const sum = m.allowed + m.rateLimited + m.blocked + m.quarantined + m.errors;
      
      expect(m.totalRequests).toBe(sum);
    });

    it('version is correct', async () => {
      const gateway = new Gateway();
      const m = gateway.getMetrics();
      expect(m.version).toBe(GATEWAY_VERSION);
    });

    it('uptime increases', async () => {
      const gateway = new Gateway();
      const m1 = gateway.getMetrics();
      await new Promise(r => setTimeout(r, 50));
      const m2 = gateway.getMetrics();
      
      expect(m2.uptimeMs).toBeGreaterThan(m1.uptimeMs);
    });

    it('threat counts accurate', async () => {
      const gateway = new Gateway({ quarantineEnabled: false });
      
      await gateway.run({ data: '<script>x</script>' }, createContext('a'));
      await gateway.run({ data: '<script>y</script>' }, createContext('b'));
      await gateway.run({ data: "' OR '1'='1" }, createContext('c'));
      
      const m = gateway.getMetrics();
      
      // XSS detected twice (2 requests with XSS)
      expect(m.threatsByCategory.XSS).toBeGreaterThanOrEqual(2);
      // SQL injection at least once
      expect(m.threatsByCategory.SQL_INJECTION).toBeGreaterThan(0);
    });

    it('clear resets all metrics', async () => {
      const gateway = new Gateway();
      
      for (let i = 0; i < 10; i++) {
        await gateway.run({ data: 'test' }, createContext(`c${i}`));
      }
      
      expect(gateway.getMetrics().totalRequests).toBe(10);
      
      gateway.clear();
      
      expect(gateway.getMetrics().totalRequests).toBe(0);
      expect(gateway.getMetrics().allowed).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-GW-06: Deterministic processing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-GW-06: Deterministic processing', () => {
    it('same input produces same status', async () => {
      const inputs = [
        'safe input',
        '<script>evil</script>',
        "1; DROP TABLE users",
        '../../../etc/passwd',
      ];
      
      for (const input of inputs) {
        const gateway1 = new Gateway({
          rateLimitEnabled: false,
          quarantineEnabled: false,
        });
        const gateway2 = new Gateway({
          rateLimitEnabled: false,
          quarantineEnabled: false,
        });
        
        const ctx1 = createContext('test', 'req1');
        const ctx2 = createContext('test', 'req2');
        
        const result1 = await gateway1.run({ data: input }, ctx1);
        const result2 = await gateway2.run({ data: input }, ctx2);
        
        expect(result1.status).toBe(result2.status);
        expect(result1.allowed).toBe(result2.allowed);
      }
    });

    it('same threats detected for same input', async () => {
      const input = '<script>eval(window.location)</script>';
      
      const gateway1 = new Gateway({ rateLimitEnabled: false });
      const gateway2 = new Gateway({ rateLimitEnabled: false });
      
      const result1 = await gateway1.run({ data: input }, createContext('a'));
      const result2 = await gateway2.run({ data: input }, createContext('b'));
      
      expect(result1.threats.length).toBe(result2.threats.length);
      expect(result1.threats.map(t => t.category).sort())
        .toEqual(result2.threats.map(t => t.category).sort());
    });

    it('order of requests does not affect validation', async () => {
      const gateway = new Gateway({ rateLimitEnabled: false });
      
      // Run threats first
      await gateway.run({ data: '<script>a</script>' }, createContext('a'));
      await gateway.run({ data: '<script>b</script>' }, createContext('b'));
      
      // Then safe
      const safeResult = await gateway.run({ data: 'safe' }, createContext('c'));
      expect(safeResult.status).toBe(GatewayStatus.ALLOWED);
      expect(safeResult.threats).toHaveLength(0);
    });

    it('validation patterns are consistent', async () => {
      const gateway = new Gateway({ rateLimitEnabled: false });
      
      // Run same threat 100 times
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(await gateway.run(
          { data: "' OR '1'='1" },
          createContext(`c${i}`)
        ));
      }
      
      // All should have same threat count
      const firstThreatCount = results[0].threats.length;
      for (const result of results) {
        expect(result.threats.length).toBe(firstThreatCount);
      }
    });
  });
});
