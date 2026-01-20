# OMEGA Metrics System

**Standard**: NASA-Grade L4
**VERROU 3**: Injectable Clock for deterministic testing

---

## Overview

OMEGA provides a metrics collection system with injectable dependencies for deterministic testing. The system supports counters, gauges, and histograms with Prometheus text format export.

---

## Quick Start

```typescript
import { createMetricsCollector } from 'nexus/shared/metrics';
import { exportPrometheus } from 'nexus/shared/metrics/prometheus';

// Create collector
const metrics = createMetricsCollector({ prefix: 'omega' });

// Create and use metrics
const requestCounter = metrics.counter('requests_total', 'Total requests', ['method']);
requestCounter.inc({ method: 'GET' });

const activeConnections = metrics.gauge('connections', 'Active connections');
activeConnections.set(42);

const latencyHistogram = metrics.histogram('request_duration_ms', 'Request latency', ['endpoint']);
latencyHistogram.observe({ endpoint: '/api' }, 125);

// Export to Prometheus format
const output = exportPrometheus(metrics);
console.log(output);
```

---

## Metric Types

### Counter

Monotonically increasing value. Use for totals that only go up.

```typescript
const counter = metrics.counter('http_requests_total', 'Total HTTP requests', ['method', 'status']);

counter.inc();                                    // Increment by 1
counter.inc(5);                                   // Increment by 5
counter.inc({ method: 'GET', status: '200' });   // With labels
counter.inc({ method: 'POST' }, 3);              // Labels + amount

counter.get({ method: 'GET', status: '200' });   // Get value
counter.reset();                                  // Reset all
counter.reset({ method: 'GET', status: '200' }); // Reset specific labels
```

### Gauge

Value that can go up and down. Use for current state.

```typescript
const gauge = metrics.gauge('queue_size', 'Current queue size', ['queue']);

gauge.set(100);                      // Set absolute value
gauge.set({ queue: 'main' }, 50);   // With labels

gauge.inc();                         // Increment by 1
gauge.inc(5);                        // Increment by 5
gauge.dec();                         // Decrement by 1
gauge.dec({ queue: 'main' }, 3);    // Labels + amount

gauge.get({ queue: 'main' });       // Get value
```

### Histogram

Distribution of values. Use for latencies, sizes, etc.

```typescript
const histogram = metrics.histogram(
  'request_duration_ms',
  'Request duration in milliseconds',
  ['endpoint'],
  [10, 50, 100, 250, 500, 1000]  // Custom buckets
);

histogram.observe(125);                          // Record value
histogram.observe({ endpoint: '/api' }, 250);   // With labels

// Timer pattern
const stopTimer = histogram.startTimer({ endpoint: '/api' });
// ... do work ...
const duration = stopTimer();  // Records and returns duration
```

---

## Bucket Presets

```typescript
import { DEFAULT_BUCKETS, MS_BUCKETS } from 'nexus/shared/metrics';

// DEFAULT_BUCKETS: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
// For seconds-based latencies

// MS_BUCKETS: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
// For millisecond-based latencies

const latency = metrics.histogram('request_duration_ms', 'Latency', [], MS_BUCKETS);
```

---

## MetricsCollector

Central registry for all metrics.

```typescript
import { createMetricsCollector, MetricsCollectorConfig } from 'nexus/shared/metrics';

const config: MetricsCollectorConfig = {
  clock: () => Date.now(),        // Injectable clock (VERROU 3)
  prefix: 'omega',                // Prefix for all metric names
  defaultLabels: { app: 'omega' } // Labels added to all metrics
};

const metrics = createMetricsCollector(config);

// Registry methods
const allMetrics = metrics.getMetrics();  // { counters, gauges, histograms }
metrics.resetAll();                        // Reset all metrics
```

---

## Prometheus Export

### Basic Export

```typescript
import { exportPrometheus, PROMETHEUS_CONTENT_TYPE } from 'nexus/shared/metrics/prometheus';

const output = exportPrometheus(metrics);
// Returns Prometheus text format

// Content-Type header for HTTP endpoints
res.setHeader('Content-Type', PROMETHEUS_CONTENT_TYPE);
res.send(output);
```

### Export with Timestamps

```typescript
import { exportPrometheusWithTimestamp } from 'nexus/shared/metrics/prometheus';

const output = exportPrometheusWithTimestamp(metrics, Date.now());
// Each metric line includes timestamp
```

### Output Format

```
# HELP omega_requests_total Total HTTP requests
# TYPE omega_requests_total counter
omega_requests_total{method="GET",status="200"} 150
omega_requests_total{method="POST",status="201"} 25

# HELP omega_connections Active connections
# TYPE omega_connections gauge
omega_connections 42

# HELP omega_request_duration_ms Request duration in milliseconds
# TYPE omega_request_duration_ms histogram
omega_request_duration_ms_bucket{le="10"} 5
omega_request_duration_ms_bucket{le="50"} 15
omega_request_duration_ms_bucket{le="100"} 45
omega_request_duration_ms_bucket{le="+Inf"} 50
omega_request_duration_ms_sum 2500
omega_request_duration_ms_count 50
```

---

## Integration with OMEGA Modules

### Atlas Integration

```typescript
import { AtlasStore } from 'nexus/atlas/src/store';
import { createMetricsCollector } from 'nexus/shared/metrics';

const metrics = createMetricsCollector({ prefix: 'omega' });
const store = new AtlasStore({
  clock: { now: () => Date.now() },
  metrics,
});

// Operations automatically record metrics:
// - atlas_inserts_total
// - atlas_updates_total
// - atlas_deletes_total
// - atlas_views_count (gauge)
```

### Raw Storage Integration

```typescript
import { RawStorage } from 'nexus/raw/src/storage';
import { MemoryBackend } from 'nexus/raw/src/backends/memoryBackend';
import { createMetricsCollector } from 'nexus/shared/metrics';

const metrics = createMetricsCollector({ prefix: 'omega' });
const storage = new RawStorage({
  backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
  clock: { now: () => Date.now() },
  metrics,
});

// Operations automatically record metrics:
// - raw_stores_total
// - raw_retrieves_total
// - raw_deletes_total
// - raw_bytes_stored_total
```

---

## Deterministic Testing (VERROU 3)

The metrics system uses injectable clock for deterministic timestamps:

```typescript
import { createTestMetricsCollector } from 'nexus/shared/metrics';

test('metrics use injectable clock', () => {
  let mockTime = 1000000000000;
  const metrics = createTestMetricsCollector(() => mockTime);

  const counter = metrics.counter('test', 'Test');
  counter.inc();

  const values = counter.getAll();
  expect(values[0].timestamp).toBe(1000000000000);

  mockTime += 1000;
  counter.inc();

  expect(counter.getAll()[0].timestamp).toBe(1000001000);
});
```

---

## Labels Best Practices

1. **Keep cardinality low** - Don't use high-cardinality values (user IDs, request IDs)
2. **Use consistent label names** - `method`, `status`, `endpoint` across metrics
3. **Avoid dynamic labels** - Define label names at metric creation

```typescript
// Good - low cardinality
counter.inc({ method: 'GET', status: '200' });
counter.inc({ method: 'POST', status: '201' });

// Bad - high cardinality (don't do this)
counter.inc({ user_id: '12345' });  // Too many unique values
counter.inc({ request_id: 'abc' }); // Unbounded
```

---

## Common Patterns

### Request Metrics

```typescript
const requestsTotal = metrics.counter('requests_total', 'Total requests', ['method', 'status']);
const requestDuration = metrics.histogram('request_duration_ms', 'Duration', ['method'], MS_BUCKETS);

async function handleRequest(req, res) {
  const stopTimer = requestDuration.startTimer({ method: req.method });

  try {
    const result = await processRequest(req);
    res.status(200).json(result);
    requestsTotal.inc({ method: req.method, status: '200' });
  } catch (error) {
    res.status(500).json({ error: error.message });
    requestsTotal.inc({ method: req.method, status: '500' });
  } finally {
    stopTimer();
  }
}
```

### Resource Monitoring

```typescript
const activeConnections = metrics.gauge('connections_active', 'Active connections');
const poolSize = metrics.gauge('pool_size', 'Connection pool size', ['pool']);

function onConnect() {
  activeConnections.inc();
}

function onDisconnect() {
  activeConnections.dec();
}
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Claude Opus 4.5 | Initial metrics system |
