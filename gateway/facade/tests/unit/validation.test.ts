/**
 * OMEGA GATEWAY — Validation Unit Tests
 * Phase 17
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

describe('GATEWAY Validation', () => {
  let gateway: Gateway;

  beforeEach(() => {
    gateway = new Gateway({
      rateLimitEnabled: false,
      validationEnabled: true,
      quarantineEnabled: false,
      strictMode: false,
    });
  });

  describe('clean input', () => {
    it('allows safe text', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ data: 'Hello world!' }, ctx);
      
      expect(result.status).toBe(GatewayStatus.ALLOWED);
      expect(result.allowed).toBe(true);
      expect(result.threats).toHaveLength(0);
    });

    it('allows safe JSON', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: { name: 'John', age: 30 } 
      }, ctx);
      
      expect(result.status).toBe(GatewayStatus.ALLOWED);
    });

    it('includes validation report', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ data: 'safe' }, ctx);
      
      expect(result.reports.validation).toBeDefined();
      expect(result.reports.validation?.passed).toBe(true);
      expect(result.reports.validation?.threats).toHaveLength(0);
      expect(result.reports.validation?.patternsChecked).toBeGreaterThan(0);
    });
  });

  describe('XSS detection', () => {
    it('detects script tags', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<script>alert("xss")</script>' 
      }, ctx);
      
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.threats.some(t => t.category === ThreatCategory.XSS)).toBe(true);
    });

    it('detects javascript: URIs', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<a href="javascript:alert(1)">click</a>' 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.XSS)).toBe(true);
    });

    it('detects event handlers', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<img onerror="alert(1)" src="x">' 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.XSS)).toBe(true);
    });

    it('detects iframe tags', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<iframe src="evil.com"></iframe>' 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.XSS)).toBe(true);
    });
  });

  describe('SQL injection detection', () => {
    it('detects UNION SELECT', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: "1 UNION SELECT * FROM users" 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.SQL_INJECTION)).toBe(true);
    });

    it('detects OR 1=1 pattern', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: "' OR '1'='1" 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.SQL_INJECTION)).toBe(true);
    });

    it('detects DROP TABLE', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: "; DROP TABLE users;" 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.SQL_INJECTION)).toBe(true);
    });

    it('blocks critical SQL injection', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: "1; DELETE FROM users WHERE 1=1" 
      }, ctx);
      
      // Critical severity should block
      expect(result.status).toBe(GatewayStatus.BLOCKED);
    });
  });

  describe('path traversal detection', () => {
    it('detects ../ patterns', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '../../../etc/passwd' 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.PATH_TRAVERSAL)).toBe(true);
    });

    it('detects encoded traversal', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '%2e%2e%2fetc/passwd' 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.PATH_TRAVERSAL)).toBe(true);
    });

    it('detects /etc/passwd access', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: 'file:///etc/passwd' 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.PATH_TRAVERSAL)).toBe(true);
    });
  });

  describe('command injection detection', () => {
    it('detects shell commands', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '; cat /etc/passwd' 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.COMMAND_INJECTION)).toBe(true);
    });

    it('detects command substitution', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '$(whoami)' 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.COMMAND_INJECTION)).toBe(true);
    });

    it('detects backtick execution', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '`ls -la`' 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.COMMAND_INJECTION)).toBe(true);
    });
  });

  describe('strict mode', () => {
    it('blocks on any threat in strict mode', async () => {
      const strictGateway = new Gateway({
        rateLimitEnabled: false,
        validationEnabled: true,
        strictMode: true,
      });
      
      const ctx = createContext('client1');
      const result = await strictGateway.run({ 
        data: 'test--' // Low severity SQL comment
      }, ctx);
      
      if (result.threats.length > 0) {
        expect(result.status).toBe(GatewayStatus.BLOCKED);
      }
    });

    it('allows low severity in non-strict mode', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<iframe src="x">' // Medium severity
      }, ctx);
      
      // Medium severity should not block in non-strict mode
      expect(result.status).toBe(GatewayStatus.ALLOWED);
    });
  });

  describe('threat details', () => {
    it('includes threat pattern', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<script>evil</script>' 
      }, ctx);
      
      expect(result.threats[0]?.pattern).toBeDefined();
    });

    it('includes threat location', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: 'prefix <script>x</script>' 
      }, ctx);
      
      expect(result.threats[0]?.location).toMatch(/index:\d+/);
    });

    it('includes threat description', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: '<script>x</script>' 
      }, ctx);
      
      expect(result.threats[0]?.description).toBeDefined();
      expect(result.threats[0]?.description.length).toBeGreaterThan(0);
    });
  });

  describe('JSON input handling', () => {
    it('validates JSON content', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: { 
          comment: '<script>alert(1)</script>',
          user: 'test' 
        } 
      }, ctx);
      
      expect(result.threats.some(t => t.category === ThreatCategory.XSS)).toBe(true);
    });

    it('allows clean JSON', async () => {
      const ctx = createContext('client1');
      const result = await gateway.run({ 
        data: { 
          name: 'John Doe',
          email: 'john@example.com' 
        } 
      }, ctx);
      
      expect(result.status).toBe(GatewayStatus.ALLOWED);
    });
  });
});
