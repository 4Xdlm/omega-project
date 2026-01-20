# OMEGA Tracing System

**Standard**: NASA-Grade L4
**VERROU 3**: CorrelationProvider is an INTERFACE for dependency injection

---

## Overview

OMEGA provides distributed tracing with injectable CorrelationProvider for deterministic testing. The system supports spans, trace propagation, and W3C Trace Context format.

---

## Quick Start

```typescript
import {
  createTracer,
  createCorrelationProvider,
} from 'nexus/shared/tracing';

// Create correlation provider and tracer
const correlationProvider = createCorrelationProvider();
const tracer = createTracer({
  serviceName: 'omega-api',
  correlationProvider,
});

// Start a trace
const span = tracer.startTrace('handle-request');
span.setAttribute('http.method', 'GET');
span.setAttribute('http.url', '/api/data');

try {
  // Do work...
  span.setStatus('ok');
} catch (error) {
  span.setStatus('error');
  span.setAttribute('error.message', error.message);
} finally {
  span.end();
}
```

---

## CorrelationProvider Interface (VERROU 3)

The CorrelationProvider is an **interface** for dependency injection, enabling deterministic testing.

```typescript
interface CorrelationProvider {
  generate(): string;           // Generate new correlation ID
  current(): string | undefined; // Get current correlation ID
  setCurrent(id: string): void; // Set current correlation ID
  clear(): void;                // Clear current correlation ID
}
```

### Default Provider

```typescript
import { createCorrelationProvider } from 'nexus/shared/tracing';

const provider = createCorrelationProvider();

const id = provider.generate();  // e.g., "m1abc123-xy7z9q"
provider.setCurrent(id);
console.log(provider.current()); // "m1abc123-xy7z9q"
provider.clear();
```

### Test Provider (Deterministic)

```typescript
import { createTestCorrelationProvider } from 'nexus/shared/tracing';

// With predefined IDs
const provider = createTestCorrelationProvider(['id-1', 'id-2', 'id-3']);

provider.generate(); // 'id-1'
provider.generate(); // 'id-2'
provider.generate(); // 'id-3'
provider.generate(); // 'test-correlation-3' (fallback)

// Track generated IDs
console.log(provider.generated); // ['id-1', 'id-2', 'id-3', 'test-correlation-3']
```

---

## Tracer API

### Configuration

```typescript
interface TracerConfig {
  serviceName: string;              // Service name for spans
  correlationProvider: CorrelationProvider;
  clock?: ClockFn;                  // Injectable clock (VERROU 3)
  onSpanEnd?: (span: SpanData) => void; // Callback when span ends
}
```

### Creating Traces

```typescript
const tracer = createTracer({
  serviceName: 'my-service',
  correlationProvider,
});

// Start a new trace (root span)
const rootSpan = tracer.startTrace('operation-name');

// Start a child span
const childSpan = tracer.startSpan('sub-operation', rootSpan);

// Or use current trace context
const anotherChild = tracer.startSpan('another-sub');
```

### Trace Context

```typescript
// Get current trace ID
const traceId = tracer.getCurrentTraceId();

// Set trace ID (for propagation)
tracer.setCurrentTraceId('incoming-trace-id');

// Clear context
tracer.clearContext();

// Get active span count
const count = tracer.getActiveSpanCount();
```

---

## Span API

### Attributes

```typescript
const span = tracer.startTrace('operation');

// Set individual attribute
span.setAttribute('user.id', '123');
span.setAttribute('request.size', 1024);
span.setAttribute('cached', true);

// Set multiple attributes
span.setAttributes({
  'http.method': 'POST',
  'http.status_code': 200,
});
```

### Status

```typescript
type SpanStatus = 'ok' | 'error' | 'cancelled';

span.setStatus('ok');      // Success
span.setStatus('error');   // Error occurred
span.setStatus('cancelled'); // Operation cancelled
```

### Ending Spans

```typescript
span.end();  // Records end time, triggers onSpanEnd callback

// Check if ended
if (span.isEnded()) {
  // Span is complete
}

// Get span data
const data = span.getData();
// { traceId, spanId, parentSpanId, name, startTime, endTime, status, attributes }
```

---

## W3C Trace Context

Support for W3C Trace Context propagation format.

### Parsing Incoming Headers

```typescript
import { parseTraceparent, TRACEPARENT_HEADER } from 'nexus/shared/tracing';

const header = req.headers[TRACEPARENT_HEADER];
const context = parseTraceparent(header);

if (context) {
  tracer.setCurrentTraceId(context.traceId);
  const span = tracer.startSpan('handle-request');
  // span.traceId === context.traceId
}
```

### Creating Outgoing Headers

```typescript
import { formatTraceparent } from 'nexus/shared/tracing';

const span = tracer.startTrace('outgoing-request');
const header = formatTraceparent(span.traceId, span.spanId);
// "00-{traceId}-{spanId}-01"

fetch(url, {
  headers: {
    [TRACEPARENT_HEADER]: header,
  },
});
```

### Format

```
traceparent: 00-{traceId}-{spanId}-{flags}

00              = version (always 00)
{traceId}       = 32 hex characters
{spanId}        = 16 hex characters
{flags}         = 01 (sampled) or 00 (not sampled)
```

---

## Integration with OMEGA Modules

### Atlas Integration

```typescript
import { AtlasStore } from 'nexus/atlas/src/store';
import { createTracer, createCorrelationProvider } from 'nexus/shared/tracing';

const tracer = createTracer({
  serviceName: 'omega',
  correlationProvider: createCorrelationProvider(),
});

const store = new AtlasStore({
  clock: { now: () => Date.now() },
  tracer,
});

// Query operations are now traced:
// - Span: atlas.query
// - Attributes: atlas.query.total, atlas.query.returned
```

### Raw Storage Integration

```typescript
import { RawStorage } from 'nexus/raw/src/storage';
import { MemoryBackend } from 'nexus/raw/src/backends/memoryBackend';
import { createTracer, createCorrelationProvider } from 'nexus/shared/tracing';

const tracer = createTracer({
  serviceName: 'omega',
  correlationProvider: createCorrelationProvider(),
});

const storage = new RawStorage({
  backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
  clock: { now: () => Date.now() },
  tracer,
});

// Retrieve operations are now traced:
// - Span: raw.retrieve
// - Attributes: raw.key, raw.size
```

---

## Deterministic Testing (VERROU 3)

```typescript
import { createTestTracer } from 'nexus/shared/tracing';

test('tracing with deterministic IDs and clock', () => {
  let mockTime = 1000;
  const { tracer, spans, correlationProvider } = createTestTracer(
    'test-service',
    () => mockTime
  );

  const span = tracer.startTrace('test-operation');
  mockTime = 1500;
  span.end();

  // Deterministic assertions
  expect(spans.length).toBe(1);
  expect(spans[0].traceId).toBe('test-correlation-0');
  expect(spans[0].startTime).toBe(1000);
  expect(spans[0].endTime).toBe(1500);
  expect(correlationProvider.generated).toEqual(['test-correlation-0']);
});
```

---

## Common Patterns

### Request Tracing

```typescript
async function handleRequest(req, res) {
  // Parse incoming trace context
  const incoming = parseTraceparent(req.headers[TRACEPARENT_HEADER] || '');
  if (incoming) {
    tracer.setCurrentTraceId(incoming.traceId);
  }

  const span = tracer.startTrace('http.request');
  span.setAttributes({
    'http.method': req.method,
    'http.url': req.url,
  });

  try {
    const result = await processRequest(req);
    span.setAttribute('http.status_code', 200);
    res.json(result);
  } catch (error) {
    span.setStatus('error');
    span.setAttribute('error.message', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    span.end();
    tracer.clearContext();
  }
}
```

### Database Tracing

```typescript
async function queryDatabase(sql: string, params: unknown[]) {
  const span = tracer.startSpan('db.query');
  span.setAttribute('db.statement', sql);
  span.setAttribute('db.system', 'postgresql');

  try {
    const result = await db.query(sql, params);
    span.setAttribute('db.rows_affected', result.rowCount);
    return result;
  } catch (error) {
    span.setStatus('error');
    span.setAttribute('error.message', error.message);
    throw error;
  } finally {
    span.end();
  }
}
```

### Nested Operations

```typescript
async function processOrder(orderId: string) {
  const rootSpan = tracer.startTrace('process-order');
  rootSpan.setAttribute('order.id', orderId);

  try {
    // Validate order
    const validateSpan = tracer.startSpan('validate', rootSpan);
    await validateOrder(orderId);
    validateSpan.end();

    // Charge payment
    const paymentSpan = tracer.startSpan('payment', rootSpan);
    await chargePayment(orderId);
    paymentSpan.end();

    // Ship order
    const shipSpan = tracer.startSpan('ship', rootSpan);
    await shipOrder(orderId);
    shipSpan.end();

    rootSpan.setStatus('ok');
  } catch (error) {
    rootSpan.setStatus('error');
    throw error;
  } finally {
    rootSpan.end();
  }
}
```

---

## SpanData Structure

```typescript
interface SpanData {
  traceId: string;        // Trace ID (correlation ID)
  spanId: string;         // Unique span ID
  parentSpanId?: string;  // Parent span ID (if child)
  name: string;           // Operation name
  startTime: number;      // Start timestamp
  endTime?: number;       // End timestamp (when ended)
  status: SpanStatus;     // 'ok' | 'error' | 'cancelled'
  attributes: SpanAttributes; // Key-value pairs
}
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Claude Opus 4.5 | Initial tracing system |
