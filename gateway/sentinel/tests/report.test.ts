/**
 * OMEGA SENTINEL — Report Tests
 * Phase 16.1
 * 
 * INV-SEN-06: Report cohérent
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Sentinel, SentinelStatus, BlockReason, SENTINEL_VERSION } from '../src/sentinel/index.js';

describe('SENTINEL getReport() (INV-SEN-06)', () => {
  let sentinel: Sentinel;

  beforeEach(() => {
    sentinel = new Sentinel();
  });

  describe('report structure', () => {
    it('includes timestamp', () => {
      const report = sentinel.getReport();
      expect(report.timestamp).toBeDefined();
      expect(new Date(report.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('includes version', () => {
      const report = sentinel.getReport();
      expect(report.version).toBe(SENTINEL_VERSION);
    });

    it('includes uptimeMs', () => {
      const report = sentinel.getReport();
      expect(report.uptimeMs).toBeDefined();
      expect(report.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('includes overall stats', () => {
      const report = sentinel.getReport();
      expect(report.overall).toBeDefined();
      expect(report.overall.total).toBeDefined();
      expect(report.overall.passed).toBeDefined();
      expect(report.overall.blocked).toBeDefined();
      expect(report.overall.warned).toBeDefined();
    });

    it('includes byCheckType stats', () => {
      const report = sentinel.getReport();
      expect(report.byCheckType).toBeDefined();
      expect(report.byCheckType.payloadSize).toBeDefined();
      expect(report.byCheckType.patterns).toBeDefined();
      expect(report.byCheckType.structure).toBeDefined();
    });

    it('includes byBlockReason stats', () => {
      const report = sentinel.getReport();
      expect(report.byBlockReason).toBeDefined();
    });

    it('includes byPatternCategory stats', () => {
      const report = sentinel.getReport();
      expect(report.byPatternCategory).toBeDefined();
    });

    it('includes recentBlocks array', () => {
      const report = sentinel.getReport();
      expect(report.recentBlocks).toBeDefined();
      expect(Array.isArray(report.recentBlocks)).toBe(true);
    });

    it('includes config', () => {
      const report = sentinel.getReport();
      expect(report.config).toBeDefined();
      expect(report.config.maxPayloadSize).toBeDefined();
    });
  });

  describe('statistics tracking', () => {
    it('starts with zero counts', () => {
      const report = sentinel.getReport();
      expect(report.overall.total).toBe(0);
      expect(report.overall.passed).toBe(0);
      expect(report.overall.blocked).toBe(0);
    });

    it('increments total on each check', () => {
      sentinel.check({});
      sentinel.check({});
      sentinel.check({});
      const report = sentinel.getReport();
      expect(report.overall.total).toBe(3);
    });

    it('increments passed on successful checks', () => {
      sentinel.check({ safe: true });
      sentinel.check({ also: 'safe' });
      const report = sentinel.getReport();
      expect(report.overall.passed).toBe(2);
    });

    it('increments blocked on failed checks', () => {
      sentinel.check('<script>bad</script>');
      sentinel.check('<iframe src="evil">');
      const report = sentinel.getReport();
      expect(report.overall.blocked).toBe(2);
    });

    it('tracks byCheckType correctly', () => {
      sentinel.check('<script>');
      const report = sentinel.getReport();
      expect(report.byCheckType.patterns.blocked).toBe(1);
    });

    it('tracks byBlockReason correctly', () => {
      sentinel.check('<script>');
      const report = sentinel.getReport();
      expect(report.byBlockReason[BlockReason.MALICIOUS_PATTERN]).toBe(1);
    });

    it('tracks byPatternCategory correctly', () => {
      sentinel.check('<script>alert(1)</script>');
      const report = sentinel.getReport();
      expect(report.byPatternCategory['XSS']).toBeGreaterThan(0);
    });
  });

  describe('recent blocks tracking', () => {
    it('records blocked inputs', () => {
      sentinel.check('<script>bad</script>');
      const report = sentinel.getReport();
      expect(report.recentBlocks.length).toBe(1);
    });

    it('includes timestamp in recent blocks', () => {
      sentinel.check('<script>');
      const report = sentinel.getReport();
      expect(report.recentBlocks[0].timestamp).toBeDefined();
    });

    it('includes reason in recent blocks', () => {
      sentinel.check('<script>');
      const report = sentinel.getReport();
      expect(report.recentBlocks[0].reason).toBe(BlockReason.MALICIOUS_PATTERN);
    });

    it('includes inputHash in recent blocks', () => {
      sentinel.check('<script>');
      const report = sentinel.getReport();
      expect(report.recentBlocks[0].inputHash).toBeDefined();
    });

    it('orders recent blocks newest first', () => {
      sentinel.check('<script>first</script>');
      sentinel.check('<script>second</script>');
      const report = sentinel.getReport();
      // Most recent should be first
      expect(report.recentBlocks[0].inputHash).not.toBe(report.recentBlocks[1].inputHash);
    });
  });

  describe('resetStats()', () => {
    it('resets all counters', () => {
      sentinel.check('<script>');
      sentinel.check({ safe: true });
      sentinel.resetStats();
      const report = sentinel.getReport();
      expect(report.overall.total).toBe(0);
      expect(report.overall.blocked).toBe(0);
      expect(report.overall.passed).toBe(0);
    });

    it('clears recent blocks', () => {
      sentinel.check('<script>');
      sentinel.resetStats();
      const report = sentinel.getReport();
      expect(report.recentBlocks.length).toBe(0);
    });

    it('clears pattern category counts', () => {
      sentinel.check('<script>');
      sentinel.resetStats();
      const report = sentinel.getReport();
      expect(report.byPatternCategory['XSS'] || 0).toBe(0);
    });
  });

  describe('report coherence (INV-SEN-06)', () => {
    it('overall.total equals sum of passed + blocked + warned', () => {
      sentinel.check({ safe: true });
      sentinel.check('<script>');
      sentinel.check({ also: 'safe' });
      const report = sentinel.getReport();
      expect(report.overall.total).toBe(
        report.overall.passed + report.overall.blocked + report.overall.warned
      );
    });

    it('byCheckType totals match overall total', () => {
      sentinel.check({ test: 1 });
      sentinel.check({ test: 2 });
      const report = sentinel.getReport();
      // Each check type should have same total as overall
      expect(report.byCheckType.payloadSize.total).toBe(report.overall.total);
      expect(report.byCheckType.patterns.total).toBe(report.overall.total);
      expect(report.byCheckType.structure.total).toBe(report.overall.total);
    });

    it('recentBlocks count matches blocked count (up to limit)', () => {
      sentinel.check('<script>1</script>');
      sentinel.check('<script>2</script>');
      sentinel.check('<script>3</script>');
      const report = sentinel.getReport();
      expect(report.recentBlocks.length).toBe(report.overall.blocked);
    });

    it('config matches sentinel configuration', () => {
      const customSentinel = new Sentinel({ maxPayloadSize: 12345 });
      const report = customSentinel.getReport();
      expect(report.config.maxPayloadSize).toBe(12345);
    });
  });

  describe('getReport() convenience function', () => {
    it('works from module export', async () => {
      const { getReport } = await import('../src/sentinel/index.js');
      const report = getReport();
      expect(report.version).toBe(SENTINEL_VERSION);
    });
  });
});
