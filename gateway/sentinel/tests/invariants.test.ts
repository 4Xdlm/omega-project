/**
 * OMEGA SENTINEL — Invariants Proof Tests
 * Phase 16.1
 * 
 * INVARIANTS:
 * - INV-SEN-01: Tout input vérifié (All inputs verified)
 * - INV-SEN-02: Payload > limit = BLOCK
 * - INV-SEN-03: Pattern malicieux = BLOCK
 * - INV-SEN-04: Résultat déterministe (Deterministic result)
 * - INV-SEN-05: Timestamp toujours présent (Timestamp always present)
 * - INV-SEN-06: Report cohérent (Report coherent)
 */

import { describe, it, expect } from 'vitest';
import { Sentinel, SentinelStatus, BlockReason, SENTINEL_VERSION } from '../src/sentinel/index.js';

describe('INVARIANTS SENTINEL', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-SEN-01: Tout input vérifié
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-SEN-01: Tout input vérifié', () => {
    const sentinel = new Sentinel();

    it('check() always returns a result for any input type', () => {
      const inputs = [
        null,
        undefined,
        true,
        false,
        0,
        42,
        -3.14,
        '',
        'string',
        [],
        [1, 2, 3],
        {},
        { key: 'value' },
        { nested: { deep: { value: true } } },
      ];

      for (const input of inputs) {
        const result = sentinel.check(input);
        expect(result).toBeDefined();
        expect(result.status).toBeDefined();
        expect(result.passed).toBeDefined();
        expect(result.checks).toBeDefined();
      }
    });

    it('all three check types are executed for every input', () => {
      const inputs = [null, 'test', { a: 1 }, [1, 2, 3]];

      for (const input of inputs) {
        const result = sentinel.check(input);
        expect(result.checks.payloadSize).toBeDefined();
        expect(result.checks.patterns).toBeDefined();
        expect(result.checks.structure).toBeDefined();
        expect(result.checks.payloadSize.status).toBeDefined();
        expect(result.checks.patterns.status).toBeDefined();
        expect(result.checks.structure.status).toBeDefined();
      }
    });

    it('no input can bypass verification', () => {
      // Even malformed inputs get a result
      const weirdInputs = [
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NaN,
        Symbol.for('test') as any, // Will be ignored in JSON
        () => 'function', // Will be ignored in JSON
      ];

      for (const input of weirdInputs) {
        const result = sentinel.check(input);
        expect(result).toBeDefined();
        expect([SentinelStatus.PASS, SentinelStatus.BLOCK, SentinelStatus.WARN]).toContain(result.status);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-SEN-02: Payload > limit = BLOCK
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-SEN-02: Payload > limit = BLOCK', () => {
    it('payload exactly at limit passes', () => {
      const sentinel = new Sentinel({ maxPayloadSize: 100 });
      // Account for JSON quotes: "xx" = 4 bytes
      const input = 'x'.repeat(96); // "..." = 98 bytes with quotes
      const result = sentinel.checkPayloadSize(input);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('payload 1 byte over limit is blocked', () => {
      const sentinel = new Sentinel({ maxPayloadSize: 100 });
      const input = 'x'.repeat(100); // Will exceed 100 bytes with quotes
      const result = sentinel.checkPayloadSize(input);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.reason).toBe(BlockReason.PAYLOAD_TOO_LARGE);
    });

    it('payload 2x limit is always blocked', () => {
      const sentinel = new Sentinel({ maxPayloadSize: 100 });
      const input = 'x'.repeat(200);
      const result = sentinel.checkPayloadSize(input);
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('guarantee: oversized payload NEVER passes', () => {
      const limits = [10, 50, 100, 500, 1000];
      
      for (const limit of limits) {
        const sentinel = new Sentinel({ maxPayloadSize: limit });
        const oversized = 'x'.repeat(limit * 2);
        const result = sentinel.check(oversized);
        
        // INVARIANT: oversized MUST be blocked
        expect(result.status).toBe(SentinelStatus.BLOCK);
        expect(result.checks.payloadSize.status).toBe(SentinelStatus.BLOCK);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-SEN-03: Pattern malicieux = BLOCK
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-SEN-03: Pattern malicieux = BLOCK', () => {
    const sentinel = new Sentinel();

    const maliciousInputs = [
      { input: '<script>alert(1)</script>', category: 'XSS' },
      { input: "' OR '1'='1", category: 'SQL_INJECTION' },
      { input: '; cat /etc/passwd', category: 'COMMAND_INJECTION' },
      { input: '{"$where": "this.x"}', category: 'NOSQL_INJECTION' },
      { input: '{{constructor.constructor}}', category: 'TEMPLATE_INJECTION' },
      { input: '__proto__', category: 'PROTOTYPE_POLLUTION' },
    ];

    it('all known malicious patterns are blocked', () => {
      for (const { input, category } of maliciousInputs) {
        const result = sentinel.check(input);
        expect(result.status).toBe(SentinelStatus.BLOCK);
        expect(result.checks.patterns.status).toBe(SentinelStatus.BLOCK);
        expect(result.checks.patterns.patternMatches?.some(m => m.category === category)).toBe(true);
      }
    });

    it('malicious patterns in nested objects are detected', () => {
      const nestedMalicious = {
        level1: {
          level2: {
            level3: '<script>nested attack</script>',
          },
        },
      };
      const result = sentinel.check(nestedMalicious);
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('malicious patterns in arrays are detected', () => {
      const arrayMalicious = ['safe', 'also safe', "'; DROP TABLE users; --"];
      const result = sentinel.check(arrayMalicious);
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });

    it('guarantee: malicious pattern NEVER passes', () => {
      for (const { input } of maliciousInputs) {
        const result = sentinel.check(input);
        // INVARIANT: malicious MUST be blocked
        expect(result.passed).toBe(false);
        expect(result.status).toBe(SentinelStatus.BLOCK);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-SEN-04: Résultat déterministe
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-SEN-04: Résultat déterministe', () => {
    const sentinel = new Sentinel();

    it('same input produces same inputHash', () => {
      const input = { user: 'test', count: 42 };
      const results = [
        sentinel.check(input),
        sentinel.check(input),
        sentinel.check(input),
      ];

      const hashes = results.map(r => r.inputHash);
      expect(new Set(hashes).size).toBe(1); // All same
    });

    it('same input produces same status', () => {
      const safeInput = { safe: true };
      const maliciousInput = '<script>';

      for (let i = 0; i < 5; i++) {
        expect(sentinel.check(safeInput).status).toBe(SentinelStatus.PASS);
        expect(sentinel.check(maliciousInput).status).toBe(SentinelStatus.BLOCK);
      }
    });

    it('same input produces same pattern matches', () => {
      const input = '<script>test</script>';
      const results = [
        sentinel.check(input),
        sentinel.check(input),
        sentinel.check(input),
      ];

      const matchCounts = results.map(r => r.checks.patterns.patternMatches?.length);
      expect(new Set(matchCounts).size).toBe(1);
    });

    it('different inputs produce different hashes', () => {
      const hashes = [
        sentinel.check({ a: 1 }).inputHash,
        sentinel.check({ a: 2 }).inputHash,
        sentinel.check({ b: 1 }).inputHash,
        sentinel.check('string').inputHash,
        sentinel.check([1, 2, 3]).inputHash,
      ];

      // All should be unique
      expect(new Set(hashes).size).toBe(hashes.length);
    });

    it('guarantee: determinism across 100 iterations', () => {
      const input = { test: 'determinism', values: [1, 2, 3] };
      const firstResult = sentinel.check(input);

      for (let i = 0; i < 100; i++) {
        const result = sentinel.check(input);
        expect(result.inputHash).toBe(firstResult.inputHash);
        expect(result.status).toBe(firstResult.status);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-SEN-05: Timestamp toujours présent
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-SEN-05: Timestamp toujours présent', () => {
    const sentinel = new Sentinel();

    it('check() result always has timestamp', () => {
      const result = sentinel.check({ test: true });
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('checkPayloadSize() result always has timestamp', () => {
      const result = sentinel.checkPayloadSize({ test: true });
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('checkPatterns() result always has timestamp', () => {
      const result = sentinel.checkPatterns('test');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('checkStructure() result always has timestamp', () => {
      const result = sentinel.checkStructure({ a: 1 });
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('getReport() always has timestamp', () => {
      const report = sentinel.getReport();
      expect(report.timestamp).toBeDefined();
      expect(new Date(report.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('timestamps are valid ISO 8601', () => {
      const result = sentinel.check({});
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      expect(result.timestamp).toMatch(isoPattern);
    });

    it('guarantee: timestamp present in all 6 result types', () => {
      const checks = [
        sentinel.check({}),
        sentinel.check('<script>'),
        sentinel.checkPayloadSize('x'.repeat(1000)),
        sentinel.checkPatterns('safe'),
        sentinel.checkStructure({ deep: { nested: true } }),
      ];

      for (const result of checks) {
        expect(result.timestamp).toBeDefined();
        expect(result.timestamp.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-SEN-06: Report cohérent
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-SEN-06: Report cohérent', () => {
    it('report totals are mathematically consistent', () => {
      const sentinel = new Sentinel();
      
      // Run various checks
      sentinel.check({ safe: true });
      sentinel.check('<script>bad</script>');
      sentinel.check({ also: 'safe' });
      sentinel.check("'; DROP TABLE;");

      const report = sentinel.getReport();

      // Math check: total = passed + blocked + warned
      expect(report.overall.total).toBe(
        report.overall.passed + report.overall.blocked + report.overall.warned
      );
    });

    it('check type totals equal overall total', () => {
      const sentinel = new Sentinel();
      
      sentinel.check({});
      sentinel.check('<script>');
      sentinel.check({ test: 123 });

      const report = sentinel.getReport();

      // Each check type runs once per check()
      expect(report.byCheckType.payloadSize.total).toBe(report.overall.total);
      expect(report.byCheckType.patterns.total).toBe(report.overall.total);
      expect(report.byCheckType.structure.total).toBe(report.overall.total);
    });

    it('recentBlocks count <= overall.blocked', () => {
      const sentinel = new Sentinel();
      
      for (let i = 0; i < 10; i++) {
        sentinel.check(`<script>${i}</script>`);
      }

      const report = sentinel.getReport();
      expect(report.recentBlocks.length).toBeLessThanOrEqual(report.overall.blocked);
    });

    it('byBlockReason sum equals blocked count', () => {
      const sentinel = new Sentinel();
      
      sentinel.check('<script>');
      sentinel.check('<script>');
      
      const sentinel2 = new Sentinel({ maxPayloadSize: 10 });
      sentinel2.check('x'.repeat(100));

      const report = sentinel.getReport();
      const reasonSum = Object.values(report.byBlockReason).reduce((a, b) => a + b, 0);
      
      // Each blocked check has exactly one reason
      expect(reasonSum).toBe(report.overall.blocked);
    });

    it('config in report matches actual config', () => {
      const customConfig = {
        maxPayloadSize: 12345,
        maxStringLength: 999,
        maxArrayLength: 50,
      };
      const sentinel = new Sentinel(customConfig);
      const report = sentinel.getReport();

      expect(report.config.maxPayloadSize).toBe(12345);
      expect(report.config.maxStringLength).toBe(999);
      expect(report.config.maxArrayLength).toBe(50);
    });

    it('version in report matches SENTINEL_VERSION', () => {
      const sentinel = new Sentinel();
      const report = sentinel.getReport();
      expect(report.version).toBe(SENTINEL_VERSION);
    });

    it('guarantee: report coherence after 100 checks', () => {
      const sentinel = new Sentinel();
      
      for (let i = 0; i < 100; i++) {
        if (i % 3 === 0) {
          sentinel.check('<script>');
        } else {
          sentinel.check({ safe: i });
        }
      }

      const report = sentinel.getReport();

      // Total must be 100
      expect(report.overall.total).toBe(100);
      
      // Math coherence
      expect(report.overall.total).toBe(
        report.overall.passed + report.overall.blocked + report.overall.warned
      );

      // Each check type total = overall total
      expect(report.byCheckType.payloadSize.total).toBe(100);
      expect(report.byCheckType.patterns.total).toBe(100);
      expect(report.byCheckType.structure.total).toBe(100);
    });
  });
});
