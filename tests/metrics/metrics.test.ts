/**
 * Metrics Tests
 * Standard: NASA-Grade L4
 *
 * Tests metrics collector with injectable clock (VERROU 3)
 */

import { describe, test, expect } from 'vitest';
import {
  Counter,
  Gauge,
  Histogram,
  MetricsCollector,
  createMetricsCollector,
  createTestMetricsCollector,
  DEFAULT_BUCKETS,
  MS_BUCKETS,
} from '../../nexus/shared/metrics/index';
import {
  exportPrometheus,
  exportPrometheusWithTimestamp,
  PROMETHEUS_CONTENT_TYPE,
} from '../../nexus/shared/metrics/prometheus';

// ============================================================================
// Counter Tests
// ============================================================================

describe('Counter', () => {
  test('increments by 1 by default', () => {
    const counter = new Counter('test_counter', 'Test counter');

    counter.inc();
    expect(counter.get()).toBe(1);

    counter.inc();
    expect(counter.get()).toBe(2);
  });

  test('increments by specified amount', () => {
    const counter = new Counter('test_counter', 'Test counter');

    counter.inc(5);
    expect(counter.get()).toBe(5);

    counter.inc(3);
    expect(counter.get()).toBe(8);
  });

  test('supports labels', () => {
    const counter = new Counter('http_requests', 'HTTP requests', ['method', 'status']);

    counter.inc({ method: 'GET', status: '200' });
    counter.inc({ method: 'GET', status: '200' });
    counter.inc({ method: 'POST', status: '201' });

    expect(counter.get({ method: 'GET', status: '200' })).toBe(2);
    expect(counter.get({ method: 'POST', status: '201' })).toBe(1);
    expect(counter.get({ method: 'DELETE', status: '404' })).toBe(0);
  });

  test('throws on negative increment', () => {
    const counter = new Counter('test_counter', 'Test counter');

    expect(() => counter.inc(-1)).toThrow('Counter can only be incremented');
  });

  test('uses injectable clock', () => {
    let mockTime = 1000;
    const counter = new Counter('test_counter', 'Test counter', [], () => mockTime);

    counter.inc();
    const values = counter.getAll();

    expect(values[0].timestamp).toBe(1000);

    mockTime = 2000;
    counter.inc();

    expect(counter.getAll()[0].timestamp).toBe(2000);
  });

  test('reset clears values', () => {
    const counter = new Counter('test_counter', 'Test counter');

    counter.inc(10);
    expect(counter.get()).toBe(10);

    counter.reset();
    expect(counter.get()).toBe(0);
  });
});

// ============================================================================
// Gauge Tests
// ============================================================================

describe('Gauge', () => {
  test('sets value', () => {
    const gauge = new Gauge('temperature', 'Current temperature');

    gauge.set(25.5);
    expect(gauge.get()).toBe(25.5);

    gauge.set(30.0);
    expect(gauge.get()).toBe(30.0);
  });

  test('increments and decrements', () => {
    const gauge = new Gauge('connections', 'Active connections');

    gauge.inc();
    expect(gauge.get()).toBe(1);

    gauge.inc(4);
    expect(gauge.get()).toBe(5);

    gauge.dec();
    expect(gauge.get()).toBe(4);

    gauge.dec(2);
    expect(gauge.get()).toBe(2);
  });

  test('supports labels', () => {
    const gauge = new Gauge('queue_size', 'Queue size', ['queue']);

    gauge.set({ queue: 'main' }, 100);
    gauge.set({ queue: 'retry' }, 25);

    expect(gauge.get({ queue: 'main' })).toBe(100);
    expect(gauge.get({ queue: 'retry' })).toBe(25);
  });

  test('can go negative', () => {
    const gauge = new Gauge('balance', 'Account balance');

    gauge.set(10);
    gauge.dec(15);

    expect(gauge.get()).toBe(-5);
  });

  test('uses injectable clock', () => {
    let mockTime = 5000;
    const gauge = new Gauge('test_gauge', 'Test gauge', [], () => mockTime);

    gauge.set(42);
    const values = gauge.getAll();

    expect(values[0].timestamp).toBe(5000);
  });
});

// ============================================================================
// Histogram Tests
// ============================================================================

describe('Histogram', () => {
  test('observes values into buckets', () => {
    const histogram = new Histogram(
      'request_duration',
      'Request duration',
      [],
      () => Date.now(),
      [0.1, 0.5, 1, 5]
    );

    histogram.observe(0.05);
    histogram.observe(0.3);
    histogram.observe(0.8);
    histogram.observe(3);
    histogram.observe(10);

    const data = histogram.get()!;
    expect(data.count).toBe(5);
    expect(data.sum).toBeCloseTo(14.15);
    expect(data.buckets.get(0.1)).toBe(1);
    expect(data.buckets.get(0.5)).toBe(2);
    expect(data.buckets.get(1)).toBe(3);
    expect(data.buckets.get(5)).toBe(4);
    expect(data.buckets.get(Infinity)).toBe(5);
  });

  test('supports labels', () => {
    const histogram = new Histogram(
      'request_duration',
      'Request duration',
      ['method'],
      () => Date.now(),
      [100, 500, 1000]
    );

    histogram.observe({ method: 'GET' }, 50);
    histogram.observe({ method: 'GET' }, 200);
    histogram.observe({ method: 'POST' }, 800);

    const getHist = histogram.get({ method: 'GET' })!;
    const postHist = histogram.get({ method: 'POST' })!;

    expect(getHist.count).toBe(2);
    expect(postHist.count).toBe(1);
  });

  test('startTimer measures duration', () => {
    let mockTime = 0;
    const histogram = new Histogram(
      'operation_duration',
      'Operation duration',
      [],
      () => mockTime,
      [10, 50, 100]
    );

    const stopTimer = histogram.startTimer();
    mockTime = 25;
    const duration = stopTimer();

    expect(duration).toBe(25);
    const data = histogram.get()!;
    expect(data.count).toBe(1);
    expect(data.sum).toBe(25);
  });

  test('uses default buckets', () => {
    const histogram = new Histogram('test', 'Test');
    expect(histogram.getBuckets()).toEqual(DEFAULT_BUCKETS);
  });

  test('uses injectable clock', () => {
    let mockTime = 9000;
    const histogram = new Histogram('test', 'Test', [], () => mockTime);

    histogram.observe(1);
    const data = histogram.get()!;

    expect(data.timestamp).toBe(9000);
  });
});

// ============================================================================
// MetricsCollector Tests
// ============================================================================

describe('MetricsCollector', () => {
  test('creates and retrieves counters', () => {
    const collector = createMetricsCollector();

    const counter1 = collector.counter('requests_total', 'Total requests');
    const counter2 = collector.counter('requests_total', 'Total requests');

    expect(counter1).toBe(counter2); // Same instance

    counter1.inc();
    expect(counter2.get()).toBe(1);
  });

  test('creates and retrieves gauges', () => {
    const collector = createMetricsCollector();

    const gauge1 = collector.gauge('connections', 'Active connections');
    const gauge2 = collector.gauge('connections', 'Active connections');

    expect(gauge1).toBe(gauge2);

    gauge1.set(100);
    expect(gauge2.get()).toBe(100);
  });

  test('creates and retrieves histograms', () => {
    const collector = createMetricsCollector();

    const hist1 = collector.histogram('duration', 'Duration');
    const hist2 = collector.histogram('duration', 'Duration');

    expect(hist1).toBe(hist2);

    hist1.observe(0.5);
    expect(hist2.get()!.count).toBe(1);
  });

  test('applies prefix to metric names', () => {
    const collector = createMetricsCollector({ prefix: 'omega' });

    const counter = collector.counter('requests', 'Requests');
    expect(counter.getDefinition().name).toBe('omega_requests');
  });

  test('uses injectable clock', () => {
    let mockTime = 12345;
    const collector = createMetricsCollector({ clock: () => mockTime });

    const counter = collector.counter('test', 'Test');
    counter.inc();

    const values = counter.getAll();
    expect(values[0].timestamp).toBe(12345);
  });

  test('resetAll clears all metrics', () => {
    const collector = createMetricsCollector();

    const counter = collector.counter('counter', 'Counter');
    const gauge = collector.gauge('gauge', 'Gauge');
    const histogram = collector.histogram('histogram', 'Histogram');

    counter.inc(10);
    gauge.set(50);
    histogram.observe(1);

    collector.resetAll();

    expect(counter.get()).toBe(0);
    expect(gauge.get()).toBe(0);
    expect(histogram.get()).toBeUndefined();
  });

  test('getMetrics returns all registered metrics', () => {
    const collector = createMetricsCollector();

    collector.counter('c1', 'Counter 1');
    collector.counter('c2', 'Counter 2');
    collector.gauge('g1', 'Gauge 1');
    collector.histogram('h1', 'Histogram 1');

    const metrics = collector.getMetrics();

    expect(metrics.counters.length).toBe(2);
    expect(metrics.gauges.length).toBe(1);
    expect(metrics.histograms.length).toBe(1);
  });
});

// ============================================================================
// Prometheus Exporter Tests
// ============================================================================

describe('Prometheus Exporter', () => {
  test('exports counter in Prometheus format', () => {
    const collector = createMetricsCollector();
    const counter = collector.counter('http_requests_total', 'Total HTTP requests', ['method']);

    counter.inc({ method: 'GET' }, 100);
    counter.inc({ method: 'POST' }, 25);

    const output = exportPrometheus(collector);

    expect(output).toContain('# HELP http_requests_total Total HTTP requests');
    expect(output).toContain('# TYPE http_requests_total counter');
    expect(output).toContain('http_requests_total{method="GET"} 100');
    expect(output).toContain('http_requests_total{method="POST"} 25');
  });

  test('exports gauge in Prometheus format', () => {
    const collector = createMetricsCollector();
    const gauge = collector.gauge('temperature_celsius', 'Current temperature');

    gauge.set(23.5);

    const output = exportPrometheus(collector);

    expect(output).toContain('# HELP temperature_celsius Current temperature');
    expect(output).toContain('# TYPE temperature_celsius gauge');
    expect(output).toContain('temperature_celsius 23.5');
  });

  test('exports histogram in Prometheus format', () => {
    const collector = createMetricsCollector();
    const histogram = collector.histogram(
      'request_duration_seconds',
      'Request duration',
      [],
      [0.1, 0.5, 1]
    );

    histogram.observe(0.05);
    histogram.observe(0.3);
    histogram.observe(0.8);

    const output = exportPrometheus(collector);

    expect(output).toContain('# HELP request_duration_seconds Request duration');
    expect(output).toContain('# TYPE request_duration_seconds histogram');
    expect(output).toContain('request_duration_seconds_bucket{le="0.1"} 1');
    expect(output).toContain('request_duration_seconds_bucket{le="0.5"} 2');
    expect(output).toContain('request_duration_seconds_bucket{le="1"} 3');
    expect(output).toContain('request_duration_seconds_bucket{le="+Inf"} 3');
    expect(output).toContain('request_duration_seconds_sum');
    expect(output).toContain('request_duration_seconds_count 3');
  });

  test('escapes label values', () => {
    const collector = createMetricsCollector();
    const counter = collector.counter('test', 'Test', ['path']);

    counter.inc({ path: '/api/user"name' });

    const output = exportPrometheus(collector);

    expect(output).toContain('path="/api/user\\"name"');
  });

  test('exports with timestamp', () => {
    const collector = createMetricsCollector();
    const counter = collector.counter('test', 'Test');

    counter.inc();

    const output = exportPrometheusWithTimestamp(collector, 1705766400000);

    expect(output).toContain('test 1 1705766400000');
  });

  test('PROMETHEUS_CONTENT_TYPE is correct', () => {
    expect(PROMETHEUS_CONTENT_TYPE).toBe('text/plain; version=0.0.4; charset=utf-8');
  });
});

// ============================================================================
// Factory Functions Tests
// ============================================================================

describe('Factory functions', () => {
  test('createTestMetricsCollector uses fixed clock by default', () => {
    const collector = createTestMetricsCollector();
    const counter = collector.counter('test', 'Test');

    counter.inc();

    const values = counter.getAll();
    expect(values[0].timestamp).toBe(1000000000000);
  });

  test('createTestMetricsCollector accepts custom clock', () => {
    const collector = createTestMetricsCollector(() => 42);
    const counter = collector.counter('test', 'Test');

    counter.inc();

    const values = counter.getAll();
    expect(values[0].timestamp).toBe(42);
  });
});

// ============================================================================
// Bucket Constants Tests
// ============================================================================

describe('Bucket constants', () => {
  test('DEFAULT_BUCKETS are sorted', () => {
    for (let i = 1; i < DEFAULT_BUCKETS.length; i++) {
      expect(DEFAULT_BUCKETS[i]).toBeGreaterThan(DEFAULT_BUCKETS[i - 1]);
    }
  });

  test('MS_BUCKETS are sorted', () => {
    for (let i = 1; i < MS_BUCKETS.length; i++) {
      expect(MS_BUCKETS[i]).toBeGreaterThan(MS_BUCKETS[i - 1]);
    }
  });
});
