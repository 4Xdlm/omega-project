/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 13A — Metrics Collector Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Test coverage for:
 * - INV-MET-01: Exact counts (no approximation)
 * - INV-MET-02: Strict sliding window eviction
 * - INV-MET-03: Prometheus-compatible export (deterministic)
 * 
 * Total: 20 tests
 * 
 * @module metrics_collector.test
 * @version 3.13.0
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  MetricsCollector,
  stableLabelKey,
  sanitizeMetricName,
  getDefaultMetricsCollector,
  resetDefaultMetricsCollector
} from '../metrics_collector.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const cfg = {
  window_ms: 1000,
  latency_buckets_ms: [10, 50, 100],
  namespace: 'omega',
  subsystem: 'phase13a',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: INV-MET-01 — Exact Counts (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MET-01: Exact Counts', () => {
  it('counts success/failure exactly in window', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, {}, 1000);
    m.recordFailure(20, {}, 1100);
    const s = m.snapshot(1500);
    expect(s.totals.success).toBe(1);
    expect(s.totals.failure).toBe(1);
    expect(s.totals.total).toBe(2);
  });

  it('labels are copied (caller mutation does not affect events)', () => {
    const m = new MetricsCollector(cfg);
    const labels: Record<string, string> = { a: '1' };
    m.recordSuccess(5, labels, 1000);
    labels.a = 'HACK';
    const s = m.snapshot(1500);
    expect(Object.keys(s.by_label_key)).toContain('a=1');
    expect(Object.keys(s.by_label_key)).not.toContain('a=HACK');
  });

  it('by_label_key counts correctly', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, { route: '/a' }, 1000);
    m.recordFailure(5, { route: '/a' }, 1001);
    m.recordSuccess(5, { route: '/b' }, 1002);
    const s = m.snapshot(1500);
    expect(s.by_label_key['route=/a'].total).toBe(2);
    expect(s.by_label_key['route=/b'].success).toBe(1);
  });

  it('latency sums are exact', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, {}, 1000);
    m.recordSuccess(7, {}, 1001);
    m.recordFailure(11, {}, 1002);
    const s = m.snapshot(1500);
    expect(s.latency.success_sum_ms).toBe(12);
    expect(s.latency.failure_sum_ms).toBe(11);
  });

  it('prune is exact for many events', () => {
    const m = new MetricsCollector(cfg);
    for (let i = 0; i < 10; i++) m.recordSuccess(5, {}, 0 + i * 100);
    const s = m.snapshot(1200); // keep t>=200..1200 => 8 events (200,300,400,500,600,700,800,900)
    expect(s.totals.total).toBe(8);
  });

  it('handles empty labels safely', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, {}, 1000);
    const s = m.snapshot(1500);
    expect(s.totals.total).toBe(1);
    expect(s.by_label_key['']).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: INV-MET-02 — Sliding Window (5 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MET-02: Sliding Window', () => {
  it('evicts events older than window', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, {}, 0);
    m.recordSuccess(5, {}, 600);
    const s = m.snapshot(1200); // window [200..1200]
    expect(s.totals.total).toBe(1);
  });

  it('keeps events exactly on boundary (t == now-window)', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, {}, 200);
    const s = m.snapshot(1200); // minT=200 inclusive
    expect(s.totals.total).toBe(1);
  });

  it('drops events in the future (t > now)', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, {}, 2000);
    const s = m.snapshot(1200);
    expect(s.totals.total).toBe(0);
  });

  it('snapshot reports correct time range', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, {}, 1000);
    const s = m.snapshot(1500);
    expect(s.from_ms).toBe(500);
    expect(s.to_ms).toBe(1500);
    expect(s.window_ms).toBe(1000);
  });

  it('rejects invalid window_ms', () => {
    expect(() => new MetricsCollector({ ...cfg, window_ms: 50 })).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: INV-MET-03 — Prometheus Export (6 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MET-03: Prometheus Export', () => {
  it('exportPrometheus includes deterministic metric names', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, {}, 1000);
    const out = m.exportPrometheus(1500);
    expect(out).toContain('omega_phase13a_events_total');
    expect(out).toContain('outcome="success"');
  });

  it('exportPrometheus includes +Inf bucket', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(200, {}, 1000);
    const out = m.exportPrometheus(1500);
    expect(out).toContain('le="+Inf"');
  });

  it('exportPrometheus stable across calls at same now', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, {}, 1000);
    const a = m.exportPrometheus(1500);
    const b = m.exportPrometheus(1500);
    expect(a).toBe(b);
  });

  it('gauge set/get via export (stable ordering)', () => {
    const m = new MetricsCollector(cfg);
    m.setGauge('mem_bytes', 123);
    m.setGauge('cpu_pct', 7);
    const out = m.exportPrometheus(1500);
    const idxCpu = out.indexOf('name="cpu_pct"');
    const idxMem = out.indexOf('name="mem_bytes"');
    expect(idxCpu).toBeGreaterThan(0);
    expect(idxMem).toBeGreaterThan(0);
    expect(idxCpu).toBeLessThan(idxMem); // alphabetical
  });

  it('labels key is stable (order independent)', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, { b: '2', a: '1' }, 1000);
    m.recordSuccess(5, { a: '1', b: '2' }, 1001);
    const s = m.snapshot(1500);
    expect(s.by_label_key['a=1,b=2'].total).toBe(2);
  });

  it('sanitizes gauge names', () => {
    const m = new MetricsCollector(cfg);
    m.setGauge('mem-bytes', 1);
    const out = m.exportPrometheus(1500);
    expect(out).toContain('name="mem_bytes"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Histogram Buckets (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Histogram Buckets', () => {
  it('histogram buckets cumulative counts (success)', () => {
    const m = new MetricsCollector(cfg);
    m.recordSuccess(5, {}, 1000);   // <=10
    m.recordSuccess(60, {}, 1001);  // <=100
    m.recordSuccess(200, {}, 1002); // +Inf
    const s = m.snapshot(1500);
    expect(s.latency.success_cum).toEqual([1, 1, 2, 3]); // <=10, <=50, <=100, +Inf
  });

  it('histogram buckets cumulative counts (failure)', () => {
    const m = new MetricsCollector(cfg);
    m.recordFailure(10, {}, 1000);  // <=10
    m.recordFailure(11, {}, 1001);  // <=50
    const s = m.snapshot(1500);
    expect(s.latency.failure_cum).toEqual([1, 2, 2, 2]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Validation (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Validation', () => {
  it('rejects non-ascending buckets', () => {
    expect(() => new MetricsCollector({ ...cfg, latency_buckets_ms: [10, 10, 50] })).toThrow();
  });

  it('rejects negative latency', () => {
    const m = new MetricsCollector(cfg);
    expect(() => m.recordSuccess(-1, {}, 1000)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Utilities (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Utilities', () => {
  it('stableLabelKey sorts keys', () => {
    const key1 = stableLabelKey({ z: '1', a: '2' });
    const key2 = stableLabelKey({ a: '2', z: '1' });
    expect(key1).toBe(key2);
    expect(key1).toBe('a=2,z=1');
  });

  it('sanitizeMetricName replaces invalid chars', () => {
    expect(sanitizeMetricName('my-metric.name')).toBe('my_metric_name');
    expect(sanitizeMetricName('valid_name')).toBe('valid_name');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Singleton (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Singleton', () => {
  afterEach(() => {
    resetDefaultMetricsCollector();
  });

  it('returns same instance on multiple calls', () => {
    const m1 = getDefaultMetricsCollector();
    const m2 = getDefaultMetricsCollector();
    expect(m1).toBe(m2);
  });

  it('creates new instance after reset', () => {
    const m1 = getDefaultMetricsCollector();
    resetDefaultMetricsCollector();
    const m2 = getDefaultMetricsCollector();
    expect(m1).not.toBe(m2);
  });
});
