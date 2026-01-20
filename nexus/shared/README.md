# @omega-private/nexus-shared

OMEGA Shared — Common utilities, logging, metrics, and tracing.

## Installation

```bash
# Configure GitHub Packages
npm config set @omega-private:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN

# Install
npm install @omega-private/nexus-shared
```

## Logging

```typescript
import { createLogger } from '@omega-private/nexus-shared/logging'

const logger = createLogger({
  module: 'my-app',
  clock: () => Date.now(),
  minLevel: 'info'
})

logger.info('Application started', { version: '1.0.0' })
logger.debug('Debug message', { data: { key: 'value' } })
logger.warn('Warning message')
logger.error('Error occurred', { error: err.message })

// Child logger with correlation
const child = logger.withCorrelationId('req-123')
child.info('Processing request')
```

## Metrics

```typescript
import { createMetricsCollector } from '@omega-private/nexus-shared/metrics'

const metrics = createMetricsCollector({
  prefix: 'myapp',
  clock: () => Date.now()
})

// Counter
const requests = metrics.counter('requests_total', 'Total requests')
requests.inc()
requests.inc({ method: 'GET' })

// Gauge
const activeUsers = metrics.gauge('active_users', 'Active users')
activeUsers.set(42)
activeUsers.inc()
activeUsers.dec()

// Histogram
const duration = metrics.histogram('request_duration_ms', 'Request duration')
const timer = duration.startTimer()
// ... do work
timer() // Records elapsed time
```

### Prometheus Export

```typescript
import { exportPrometheus } from '@omega-private/nexus-shared/metrics'

const output = exportPrometheus(metrics)
// Returns Prometheus text format
```

## Tracing

```typescript
import { createTracer, createCorrelationProvider } from '@omega-private/nexus-shared/tracing'

const tracer = createTracer({
  serviceName: 'my-service',
  correlationProvider: createCorrelationProvider(),
  clock: () => Date.now()
})

// Start a trace
const span = tracer.startTrace('operation', { key: 'value' })

try {
  // ... do work
  span.setAttribute('result', 'success')
  span.setStatus('ok')
} catch (err) {
  span.setStatus('error')
  span.setAttribute('error.message', err.message)
} finally {
  span.end()
}

// Child spans
const parentSpan = tracer.startTrace('parent-operation')
const childSpan = tracer.startSpan('child-operation', parentSpan)
```

## Features

### Logging
- Structured JSON output
- Log levels (debug, info, warn, error)
- Correlation ID support
- Child loggers
- Injectable ClockFn

### Metrics
- Counter, Gauge, Histogram types
- Label support
- Prometheus text format export
- Injectable ClockFn

### Tracing
- Span-based tracing
- Parent-child relationships
- W3C Trace Context support
- CorrelationProvider interface
- Injectable ClockFn

## Testing

All components support deterministic testing through injectable dependencies:

```typescript
import { createTestLogger } from '@omega-private/nexus-shared/logging'
import { createTestTracer } from '@omega-private/nexus-shared/tracing'

// Test logger captures entries
const { logger, entries } = createTestLogger('test', () => 1000)
logger.info('test')
expect(entries).toHaveLength(1)

// Test tracer with fixed IDs
const { tracer, spans } = createTestTracer('test', () => 1000)
tracer.startTrace('op').end()
expect(spans).toHaveLength(1)
```

## License

Proprietary — OMEGA Project
