/**
 * Oracle Metrics Tests
 * @module @omega/oracle/test/metrics
 * @description Unit tests for Phase 145 - Oracle Metrics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  OracleMetrics,
  createMetrics,
  getGlobalMetrics,
  resetGlobalMetrics,
  DEFAULT_METRICS_CONFIG,
  type MetricsSnapshot,
  type PerformanceReport,
  type TimerMetric,
  type HistogramMetric,
} from '../src/metrics';

describe('OMEGA Oracle - Phase 145: Oracle Metrics', () => {
  let metrics: OracleMetrics;

  beforeEach(() => {
    metrics = createMetrics({ flushInterval: 0 }); // Disable auto-flush for tests
    resetGlobalMetrics();
  });

  afterEach(() => {
    metrics.dispose();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_METRICS_CONFIG.enabled).toBe(true);
      expect(DEFAULT_METRICS_CONFIG.maxMetrics).toBe(10000);
      expect(DEFAULT_METRICS_CONFIG.histogramBuckets).toContain(100);
    });

    it('should accept custom configuration', () => {
      const custom = createMetrics({ maxMetrics: 5000 });
      expect(custom.isEnabled()).toBe(true);
      custom.dispose();
    });

    it('should be disableable', () => {
      metrics.disable();
      expect(metrics.isEnabled()).toBe(false);
      metrics.enable();
      expect(metrics.isEnabled()).toBe(true);
    });
  });

  describe('Counters', () => {
    it('should increment counter', () => {
      metrics.increment('test.counter');
      expect(metrics.getCounter('test.counter')).toBe(1);
    });

    it('should increment counter by value', () => {
      metrics.increment('test.counter', 5);
      expect(metrics.getCounter('test.counter')).toBe(5);
    });

    it('should accumulate counter increments', () => {
      metrics.increment('test.counter');
      metrics.increment('test.counter');
      metrics.increment('test.counter', 3);
      expect(metrics.getCounter('test.counter')).toBe(5);
    });

    it('should return 0 for unknown counter', () => {
      expect(metrics.getCounter('unknown')).toBe(0);
    });

    it('should support labels on counters', () => {
      metrics.increment('test.counter', 1, { method: 'GET' });
      metrics.increment('test.counter', 2, { method: 'POST' });

      expect(metrics.getCounter('test.counter', { method: 'GET' })).toBe(1);
      expect(metrics.getCounter('test.counter', { method: 'POST' })).toBe(2);
    });

    it('should not increment when disabled', () => {
      metrics.disable();
      metrics.increment('test.counter', 5);
      expect(metrics.getCounter('test.counter')).toBe(0);
    });
  });

  describe('Gauges', () => {
    it('should set gauge value', () => {
      metrics.setGauge('test.gauge', 42);
      expect(metrics.getGauge('test.gauge')).toBe(42);
    });

    it('should overwrite gauge value', () => {
      metrics.setGauge('test.gauge', 10);
      metrics.setGauge('test.gauge', 20);
      expect(metrics.getGauge('test.gauge')).toBe(20);
    });

    it('should increment gauge', () => {
      metrics.setGauge('test.gauge', 10);
      metrics.incrementGauge('test.gauge', 5);
      expect(metrics.getGauge('test.gauge')).toBe(15);
    });

    it('should decrement gauge', () => {
      metrics.setGauge('test.gauge', 10);
      metrics.decrementGauge('test.gauge', 3);
      expect(metrics.getGauge('test.gauge')).toBe(7);
    });

    it('should not go below zero on decrement', () => {
      metrics.setGauge('test.gauge', 5);
      metrics.decrementGauge('test.gauge', 10);
      expect(metrics.getGauge('test.gauge')).toBe(0);
    });

    it('should return 0 for unknown gauge', () => {
      expect(metrics.getGauge('unknown')).toBe(0);
    });

    it('should support labels on gauges', () => {
      metrics.setGauge('test.gauge', 10, { type: 'A' });
      metrics.setGauge('test.gauge', 20, { type: 'B' });

      expect(metrics.getGauge('test.gauge', { type: 'A' })).toBe(10);
      expect(metrics.getGauge('test.gauge', { type: 'B' })).toBe(20);
    });
  });

  describe('Histograms', () => {
    it('should record histogram value', () => {
      metrics.recordHistogram('test.histogram', 50);
      const histogram = metrics.getHistogram('test.histogram');
      expect(histogram).not.toBeNull();
      expect(histogram!.count).toBe(1);
    });

    it('should calculate histogram statistics', () => {
      metrics.recordHistogram('test.histogram', 10);
      metrics.recordHistogram('test.histogram', 20);
      metrics.recordHistogram('test.histogram', 30);

      const histogram = metrics.getHistogram('test.histogram');
      expect(histogram!.sum).toBe(60);
      expect(histogram!.count).toBe(3);
      expect(histogram!.value).toBe(20); // average
    });

    it('should calculate histogram buckets', () => {
      for (let i = 0; i < 100; i++) {
        metrics.recordHistogram('test.histogram', i * 10);
      }

      const histogram = metrics.getHistogram('test.histogram');
      expect(histogram!.buckets.length).toBeGreaterThan(0);

      // Bucket for le=100 should contain values <= 100
      const bucket100 = histogram!.buckets.find((b) => b.le === 100);
      expect(bucket100).toBeDefined();
      expect(bucket100!.count).toBeGreaterThan(0);
    });

    it('should return null for unknown histogram', () => {
      expect(metrics.getHistogram('unknown')).toBeNull();
    });

    it('should support labels on histograms', () => {
      metrics.recordHistogram('test.histogram', 50, { endpoint: '/api' });
      const histogram = metrics.getHistogram('test.histogram', { endpoint: '/api' });
      expect(histogram).not.toBeNull();
    });
  });

  describe('Timers', () => {
    it('should record timer value', () => {
      metrics.recordTimer('test.timer', 100);
      const timer = metrics.getTimer('test.timer');
      expect(timer).not.toBeNull();
      expect(timer!.count).toBe(1);
    });

    it('should calculate timer statistics', () => {
      metrics.recordTimer('test.timer', 100);
      metrics.recordTimer('test.timer', 200);
      metrics.recordTimer('test.timer', 300);

      const timer = metrics.getTimer('test.timer');
      expect(timer!.min).toBe(100);
      expect(timer!.max).toBe(300);
      expect(timer!.avg).toBe(200);
    });

    it('should calculate percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.recordTimer('test.timer', i);
      }

      const timer = metrics.getTimer('test.timer');
      expect(timer!.p50).toBe(50);
      expect(timer!.p95).toBe(95);
      expect(timer!.p99).toBe(99);
    });

    it('should support start/end timer', () => {
      const context = metrics.startTimer('test.timer');
      const duration = metrics.endTimer(context);
      expect(duration).toBeGreaterThanOrEqual(0);

      const timer = metrics.getTimer('test.timer');
      expect(timer).not.toBeNull();
    });

    it('should return null for unknown timer', () => {
      expect(metrics.getTimer('unknown')).toBeNull();
    });

    it('should support labels on timers', () => {
      metrics.recordTimer('test.timer', 100, { operation: 'analyze' });
      const timer = metrics.getTimer('test.timer', { operation: 'analyze' });
      expect(timer).not.toBeNull();
    });
  });

  describe('Snapshot', () => {
    it('should generate metrics snapshot', () => {
      metrics.increment('test.counter', 5);
      metrics.setGauge('test.gauge', 10);
      metrics.recordHistogram('test.histogram', 50);
      metrics.recordTimer('test.timer', 100);

      const snapshot = metrics.getSnapshot();
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(Object.keys(snapshot.counters).length).toBe(1);
      expect(Object.keys(snapshot.gauges).length).toBe(1);
      expect(Object.keys(snapshot.histograms).length).toBe(1);
      expect(Object.keys(snapshot.timers).length).toBe(1);
    });

    it('should include labeled metrics in snapshot', () => {
      metrics.increment('test.counter', 1, { label: 'A' });
      metrics.increment('test.counter', 2, { label: 'B' });

      const snapshot = metrics.getSnapshot();
      expect(Object.keys(snapshot.counters).length).toBe(2);
    });
  });

  describe('Performance Report', () => {
    it('should generate performance report', () => {
      metrics.increment('oracle.analysis.total', 100);
      metrics.increment('oracle.cache.hits', 80);
      metrics.increment('oracle.cache.misses', 20);
      metrics.increment('oracle.errors.total', 5);
      metrics.recordTimer('oracle.analysis.duration', 50);
      metrics.recordTimer('oracle.analysis.duration', 150);

      const report = metrics.generateReport();
      expect(report.totalAnalyses).toBe(100);
      expect(report.avgProcessingTime).toBe(100);
      expect(report.cacheHitRate).toBe(0.8);
      expect(report.errorRate).toBe(0.05);
    });

    it('should calculate throughput', async () => {
      metrics.increment('oracle.analysis.total', 60);
      await new Promise((r) => setTimeout(r, 100)); // Wait a bit

      const report = metrics.generateReport();
      expect(report.throughput).toBeGreaterThan(0);
    });

    it('should track top emotions', () => {
      metrics.increment('oracle.emotion.joy', 50);
      metrics.increment('oracle.emotion.sadness', 30);
      metrics.increment('oracle.emotion.anger', 20);

      const report = metrics.generateReport();
      expect(report.topEmotions.length).toBeGreaterThan(0);
      expect(report.topEmotions[0].emotion).toBe('joy');
    });

    it('should track slowest operations', () => {
      metrics.recordTimer('oracle.analysis.duration', 1000);
      metrics.recordTimer('oracle.cache.lookup', 5);

      const report = metrics.generateReport();
      expect(report.slowestOperations.length).toBeGreaterThan(0);
    });

    it('should handle empty metrics', () => {
      const report = metrics.generateReport();
      expect(report.totalAnalyses).toBe(0);
      expect(report.cacheHitRate).toBe(0);
      expect(report.errorRate).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old metrics', async () => {
      const shortRetention = createMetrics({
        flushInterval: 0,
        retentionPeriod: 50,
      });

      shortRetention.increment('test.counter');
      await new Promise((r) => setTimeout(r, 100));

      const removed = shortRetention.cleanup();
      expect(removed).toBeGreaterThan(0);
      expect(shortRetention.getCounter('test.counter')).toBe(0);
      shortRetention.dispose();
    });

    it('should reset all metrics', () => {
      metrics.increment('test.counter', 10);
      metrics.setGauge('test.gauge', 20);
      metrics.reset();

      expect(metrics.getCounter('test.counter')).toBe(0);
      expect(metrics.getGauge('test.gauge')).toBe(0);
    });
  });

  describe('Uptime', () => {
    it('should track uptime', async () => {
      const uptime1 = metrics.getUptime();
      await new Promise((r) => setTimeout(r, 50));
      const uptime2 = metrics.getUptime();

      expect(uptime2).toBeGreaterThan(uptime1);
    });

    it('should reset uptime on reset', () => {
      const uptime1 = metrics.getUptime();
      metrics.reset();
      const uptime2 = metrics.getUptime();

      expect(uptime2).toBeLessThanOrEqual(uptime1);
    });
  });

  describe('Global Metrics', () => {
    it('should provide global instance', () => {
      const global1 = getGlobalMetrics();
      const global2 = getGlobalMetrics();
      expect(global1).toBe(global2);
    });

    it('should reset global instance', () => {
      const global1 = getGlobalMetrics();
      global1.increment('test.counter');

      resetGlobalMetrics();

      const global2 = getGlobalMetrics();
      expect(global2.getCounter('test.counter')).toBe(0);
    });
  });

  describe('Invariants', () => {
    it('INV-METRICS-001: Counters must be non-negative', () => {
      metrics.increment('test.counter', 5);
      expect(metrics.getCounter('test.counter')).toBeGreaterThanOrEqual(0);
    });

    it('INV-METRICS-002: Gauges must be non-negative after decrement', () => {
      metrics.setGauge('test.gauge', 5);
      metrics.decrementGauge('test.gauge', 100);
      expect(metrics.getGauge('test.gauge')).toBeGreaterThanOrEqual(0);
    });

    it('INV-METRICS-003: Timer min <= avg <= max', () => {
      for (let i = 0; i < 10; i++) {
        metrics.recordTimer('test.timer', Math.random() * 100);
      }

      const timer = metrics.getTimer('test.timer');
      expect(timer!.min).toBeLessThanOrEqual(timer!.avg);
      expect(timer!.avg).toBeLessThanOrEqual(timer!.max);
    });

    it('INV-METRICS-004: Percentiles must be ordered p50 <= p95 <= p99', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.recordTimer('test.timer', i);
      }

      const timer = metrics.getTimer('test.timer');
      expect(timer!.p50).toBeLessThanOrEqual(timer!.p95);
      expect(timer!.p95).toBeLessThanOrEqual(timer!.p99);
    });

    it('INV-METRICS-005: Histogram buckets must be cumulative', () => {
      for (let i = 0; i < 100; i++) {
        metrics.recordHistogram('test.histogram', i * 10);
      }

      const histogram = metrics.getHistogram('test.histogram');
      for (let i = 1; i < histogram!.buckets.length; i++) {
        expect(histogram!.buckets[i].count).toBeGreaterThanOrEqual(
          histogram!.buckets[i - 1].count
        );
      }
    });

    it('INV-METRICS-006: Cache hit rate must be 0-1', () => {
      metrics.increment('oracle.cache.hits', 70);
      metrics.increment('oracle.cache.misses', 30);

      const report = metrics.generateReport();
      expect(report.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(report.cacheHitRate).toBeLessThanOrEqual(1);
    });

    it('INV-METRICS-007: Error rate must be 0-1', () => {
      metrics.increment('oracle.analysis.total', 100);
      metrics.increment('oracle.errors.total', 10);

      const report = metrics.generateReport();
      expect(report.errorRate).toBeGreaterThanOrEqual(0);
      expect(report.errorRate).toBeLessThanOrEqual(1);
    });
  });
});
