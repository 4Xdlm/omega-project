/**
 * OMEGA SENTINEL — Main Check Tests
 * Phase 16.1
 * 
 * INV-SEN-01: Tout input vérifié
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Sentinel, SentinelStatus, BlockReason } from '../src/sentinel/index.js';

describe('SENTINEL check() (INV-SEN-01)', () => {
  let sentinel: Sentinel;

  beforeEach(() => {
    sentinel = new Sentinel();
  });

  describe('comprehensive validation', () => {
    it('runs all three checks', () => {
      const result = sentinel.check({ data: 'test' });
      expect(result.checks.payloadSize).toBeDefined();
      expect(result.checks.patterns).toBeDefined();
      expect(result.checks.structure).toBeDefined();
    });

    it('passes fully valid input', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };
      const result = sentinel.check(input);
      expect(result.status).toBe(SentinelStatus.PASS);
      expect(result.passed).toBe(true);
    });

    it('blocks on any failure', () => {
      const input = '<script>alert(1)</script>';
      const result = sentinel.check(input);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.passed).toBe(false);
    });
  });

  describe('result structure', () => {
    it('includes overall status', () => {
      const result = sentinel.check({});
      expect(result.status).toBeDefined();
      expect([SentinelStatus.PASS, SentinelStatus.BLOCK, SentinelStatus.WARN]).toContain(result.status);
    });

    it('includes passed boolean', () => {
      const result = sentinel.check({});
      expect(typeof result.passed).toBe('boolean');
    });

    it('includes timestamp', () => {
      const result = sentinel.check({});
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('includes durationMs', () => {
      const result = sentinel.check({});
      expect(result.durationMs).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('includes summary', () => {
      const result = sentinel.check({});
      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
    });

    it('includes inputHash', () => {
      const result = sentinel.check({});
      expect(result.inputHash).toBeDefined();
      expect(typeof result.inputHash).toBe('string');
    });
  });

  describe('edge cases', () => {
    it('handles empty object', () => {
      const result = sentinel.check({});
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('handles empty array', () => {
      const result = sentinel.check([]);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('handles null', () => {
      const result = sentinel.check(null);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('handles undefined', () => {
      const result = sentinel.check(undefined);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('handles empty string', () => {
      const result = sentinel.check('');
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('handles zero', () => {
      const result = sentinel.check(0);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('handles false', () => {
      const result = sentinel.check(false);
      expect(result.status).toBe(SentinelStatus.PASS);
    });
  });

  describe('multiple failure types', () => {
    it('blocks and reports pattern when present', () => {
      const result = sentinel.check({ script: '<script>bad</script>' });
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.checks.patterns.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks on size even with valid patterns', () => {
      const sentinel100 = new Sentinel({ maxPayloadSize: 100 });
      const result = sentinel100.check({ data: 'x'.repeat(200) });
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.checks.payloadSize.status).toBe(SentinelStatus.BLOCK);
    });

    it('blocks on structure even with valid patterns', () => {
      const sentinel5 = new Sentinel({ maxDepth: 5 });
      let deep: any = { v: 1 };
      for (let i = 0; i < 10; i++) deep = { n: deep };
      const result = sentinel5.check(deep);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.checks.structure.status).toBe(SentinelStatus.BLOCK);
    });
  });

  describe('summary messages', () => {
    it('provides clear pass message', () => {
      const result = sentinel.check({ safe: true });
      expect(result.summary).toContain('passed');
    });

    it('provides clear failure message with reason', () => {
      const result = sentinel.check('<script>');
      expect(result.summary).toContain('failed');
    });
  });

  describe('convenience functions', () => {
    it('check() convenience function works', async () => {
      const { check } = await import('../src/sentinel/index.js');
      const result = check({ test: true });
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('checkPayloadSize() convenience function works', async () => {
      const { checkPayloadSize } = await import('../src/sentinel/index.js');
      const result = checkPayloadSize({ test: true });
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('checkPatterns() convenience function works', async () => {
      const { checkPatterns } = await import('../src/sentinel/index.js');
      const result = checkPatterns('safe text');
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('checkStructure() convenience function works', async () => {
      const { checkStructure } = await import('../src/sentinel/index.js');
      const result = checkStructure({ a: 1 });
      expect(result.status).toBe(SentinelStatus.PASS);
    });
  });
});
