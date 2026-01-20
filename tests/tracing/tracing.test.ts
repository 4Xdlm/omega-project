/**
 * Tracing Tests
 * Standard: NASA-Grade L4
 *
 * Tests CorrelationProvider interface (VERROU 3) and Tracer
 */

import { describe, test, expect } from 'vitest';
import {
  createCorrelationProvider,
  createTestCorrelationProvider,
  Tracer,
  createTracer,
  createTestTracer,
  parseTraceparent,
  formatTraceparent,
  TRACEPARENT_HEADER,
  type CorrelationProvider,
  type SpanData,
} from '../../nexus/shared/tracing/index';

// ============================================================================
// CorrelationProvider Tests
// ============================================================================

describe('CorrelationProvider', () => {
  test('default provider generates unique IDs', () => {
    const provider = createCorrelationProvider();

    const id1 = provider.generate();
    const id2 = provider.generate();
    const id3 = provider.generate();

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  test('provider tracks current correlation ID', () => {
    const provider = createCorrelationProvider();

    expect(provider.current()).toBeUndefined();

    provider.setCurrent('test-123');
    expect(provider.current()).toBe('test-123');

    provider.setCurrent('test-456');
    expect(provider.current()).toBe('test-456');

    provider.clear();
    expect(provider.current()).toBeUndefined();
  });

  test('test provider returns deterministic IDs (VERROU 3)', () => {
    const provider = createTestCorrelationProvider(['id-1', 'id-2', 'id-3']);

    expect(provider.generate()).toBe('id-1');
    expect(provider.generate()).toBe('id-2');
    expect(provider.generate()).toBe('id-3');
    expect(provider.generate()).toBe('test-correlation-3'); // Falls back to default
  });

  test('test provider tracks generated IDs', () => {
    const provider = createTestCorrelationProvider();

    provider.generate();
    provider.generate();
    provider.generate();

    expect(provider.generated).toEqual([
      'test-correlation-0',
      'test-correlation-1',
      'test-correlation-2',
    ]);
  });
});

// ============================================================================
// Span Tests
// ============================================================================

describe('Span', () => {
  test('span has correct initial state', () => {
    const { tracer } = createTestTracer();

    const span = tracer.startTrace('test-operation');

    expect(span.name).toBe('test-operation');
    expect(span.traceId).toBe('test-correlation-0');
    expect(span.spanId).toMatch(/^span-/);
    expect(span.parentSpanId).toBeUndefined();
    expect(span.isEnded()).toBe(false);
  });

  test('span records attributes', () => {
    const { tracer, spans } = createTestTracer();

    const span = tracer.startTrace('test-operation');
    span.setAttribute('user.id', '123');
    span.setAttribute('request.size', 1024);
    span.setAttribute('cached', true);
    span.end();

    expect(spans.length).toBe(1);
    expect(spans[0].attributes['user.id']).toBe('123');
    expect(spans[0].attributes['request.size']).toBe(1024);
    expect(spans[0].attributes['cached']).toBe(true);
  });

  test('span records batch attributes', () => {
    const { tracer, spans } = createTestTracer();

    const span = tracer.startTrace('test-operation');
    span.setAttributes({
      'http.method': 'GET',
      'http.status_code': 200,
    });
    span.end();

    expect(spans[0].attributes['http.method']).toBe('GET');
    expect(spans[0].attributes['http.status_code']).toBe(200);
  });

  test('span records status', () => {
    const { tracer, spans } = createTestTracer();

    const span = tracer.startTrace('test-operation');
    expect(span.getData().status).toBe('ok');

    span.setStatus('error');
    span.end();

    expect(spans[0].status).toBe('error');
  });

  test('span ignores changes after end', () => {
    const { tracer, spans } = createTestTracer();

    const span = tracer.startTrace('test-operation');
    span.setAttribute('before', 'yes');
    span.end();

    span.setAttribute('after', 'no');
    span.setStatus('error');

    expect(spans[0].attributes['before']).toBe('yes');
    expect(spans[0].attributes['after']).toBeUndefined();
    expect(spans[0].status).toBe('ok');
  });

  test('span uses injectable clock (VERROU 3)', () => {
    let mockTime = 1000;
    const { tracer, spans } = createTestTracer('test', () => mockTime);

    const span = tracer.startTrace('test-operation');
    mockTime = 1500;
    span.end();

    expect(spans[0].startTime).toBe(1000);
    expect(spans[0].endTime).toBe(1500);
  });
});

// ============================================================================
// Tracer Tests
// ============================================================================

describe('Tracer', () => {
  test('startTrace creates root span', () => {
    const { tracer, spans } = createTestTracer('my-service');

    const span = tracer.startTrace('root-operation');
    span.end();

    expect(spans.length).toBe(1);
    expect(spans[0].parentSpanId).toBeUndefined();
    expect(spans[0].attributes['service.name']).toBe('my-service');
  });

  test('startSpan creates child span', () => {
    const { tracer, spans } = createTestTracer();

    const rootSpan = tracer.startTrace('root');
    const childSpan = tracer.startSpan('child', rootSpan);

    expect(childSpan.traceId).toBe(rootSpan.traceId);
    expect(childSpan.parentSpanId).toBe(rootSpan.spanId);

    childSpan.end();
    rootSpan.end();

    expect(spans.length).toBe(2);
  });

  test('startSpan without parent uses current trace', () => {
    const { tracer, spans } = createTestTracer();

    const rootSpan = tracer.startTrace('root');
    const childSpan = tracer.startSpan('child'); // No parent specified

    expect(childSpan.traceId).toBe(rootSpan.traceId);

    childSpan.end();
    rootSpan.end();

    expect(spans.length).toBe(2);
  });

  test('startSpan creates new trace when no context', () => {
    const { tracer, spans, correlationProvider } = createTestTracer();

    // No active trace
    const span = tracer.startSpan('orphan');
    span.end();

    expect(spans.length).toBe(1);
    expect(correlationProvider.generated.length).toBe(1);
  });

  test('tracer tracks current trace ID', () => {
    const { tracer } = createTestTracer();

    expect(tracer.getCurrentTraceId()).toBeUndefined();

    const span = tracer.startTrace('test');
    expect(tracer.getCurrentTraceId()).toBe('test-correlation-0');

    tracer.clearContext();
    expect(tracer.getCurrentTraceId()).toBeUndefined();

    span.end();
  });

  test('tracer setCurrentTraceId for propagation', () => {
    const { tracer } = createTestTracer();

    tracer.setCurrentTraceId('propagated-trace-id');
    expect(tracer.getCurrentTraceId()).toBe('propagated-trace-id');

    const span = tracer.startSpan('child-of-propagated');
    expect(span.traceId).toBe('propagated-trace-id');

    span.end();
  });

  test('tracer tracks active span count', () => {
    const { tracer } = createTestTracer();

    expect(tracer.getActiveSpanCount()).toBe(0);

    const span1 = tracer.startTrace('span1');
    expect(tracer.getActiveSpanCount()).toBe(1);

    const span2 = tracer.startSpan('span2');
    expect(tracer.getActiveSpanCount()).toBe(2);

    span2.end();
    expect(tracer.getActiveSpanCount()).toBe(1);

    span1.end();
    expect(tracer.getActiveSpanCount()).toBe(0);
  });

  test('tracer returns service name', () => {
    const { tracer } = createTestTracer('omega-service');
    expect(tracer.getServiceName()).toBe('omega-service');
  });
});

// ============================================================================
// W3C Trace Context Tests
// ============================================================================

describe('W3C Trace Context', () => {
  test('TRACEPARENT_HEADER constant', () => {
    expect(TRACEPARENT_HEADER).toBe('traceparent');
  });

  test('parseTraceparent parses valid header', () => {
    const result = parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');

    expect(result).toEqual({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
    });
  });

  test('parseTraceparent returns null for invalid format', () => {
    expect(parseTraceparent('invalid')).toBeNull();
    expect(parseTraceparent('01-trace-span-00')).toBeNull(); // Wrong version
    expect(parseTraceparent('00-trace-span')).toBeNull(); // Missing flags
  });

  test('formatTraceparent creates valid header', () => {
    const header = formatTraceparent('4bf92f3577b34da6a3ce929d0e0e4736', '00f067aa0ba902b7');
    expect(header).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
  });

  test('formatTraceparent with sampled=false', () => {
    const header = formatTraceparent('trace', 'span', false);
    expect(header).toBe('00-trace-span-00');
  });

  test('roundtrip parse/format', () => {
    const original = '00-mytraceid123-myspanid456-01';
    const parsed = parseTraceparent(original);

    expect(parsed).not.toBeNull();

    const formatted = formatTraceparent(parsed!.traceId, parsed!.spanId);
    expect(formatted).toBe(original);
  });
});

// ============================================================================
// Factory Functions Tests
// ============================================================================

describe('Factory functions', () => {
  test('createTracer creates configured tracer', () => {
    const provider = createCorrelationProvider();
    const tracer = createTracer({
      serviceName: 'my-service',
      correlationProvider: provider,
    });

    expect(tracer.getServiceName()).toBe('my-service');
  });

  test('createTestTracer provides test utilities', () => {
    const { tracer, spans, correlationProvider } = createTestTracer('test-svc');

    const span = tracer.startTrace('test');
    span.end();

    expect(spans.length).toBe(1);
    expect(correlationProvider.generated.length).toBe(1);
    expect(tracer.getServiceName()).toBe('test-svc');
  });

  test('createTestTracer uses fixed clock by default', () => {
    const { tracer, spans } = createTestTracer();

    const span = tracer.startTrace('test');
    span.end();

    expect(spans[0].startTime).toBe(1000000000000);
    expect(spans[0].endTime).toBe(1000000000000);
  });

  test('createTestTracer accepts custom clock', () => {
    let time = 5000;
    const { tracer, spans } = createTestTracer('test', () => time);

    const span = tracer.startTrace('test');
    time = 6000;
    span.end();

    expect(spans[0].startTime).toBe(5000);
    expect(spans[0].endTime).toBe(6000);
  });
});

// ============================================================================
// Integration Pattern Tests
// ============================================================================

describe('Integration patterns', () => {
  test('nested spans form tree structure', () => {
    const { tracer, spans } = createTestTracer();

    const root = tracer.startTrace('request');
    const db = tracer.startSpan('db-query', root);
    const cache = tracer.startSpan('cache-check', root);

    cache.end();
    db.end();
    root.end();

    expect(spans.length).toBe(3);

    // All share same trace ID
    expect(spans[0].traceId).toBe(spans[1].traceId);
    expect(spans[1].traceId).toBe(spans[2].traceId);

    // db and cache have root as parent
    expect(spans.find((s) => s.name === 'db-query')?.parentSpanId).toBe(root.spanId);
    expect(spans.find((s) => s.name === 'cache-check')?.parentSpanId).toBe(root.spanId);
  });

  test('error handling with spans', () => {
    const { tracer, spans } = createTestTracer();

    const span = tracer.startTrace('risky-operation');

    try {
      span.setAttribute('input', 'data');
      throw new Error('Something went wrong');
    } catch (error) {
      span.setStatus('error');
      span.setAttribute('error.message', (error as Error).message);
    } finally {
      span.end();
    }

    expect(spans[0].status).toBe('error');
    expect(spans[0].attributes['error.message']).toBe('Something went wrong');
  });
});
