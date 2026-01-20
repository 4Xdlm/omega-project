/**
 * Tracing with Injectable CorrelationProvider
 * Standard: NASA-Grade L4
 *
 * CRITICAL (VERROU 3): CorrelationProvider is an INTERFACE for dependency injection.
 * All correlation IDs must come from injected provider, never generated directly.
 *
 * @module tracing
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Clock function type for timestamp generation
 */
export type ClockFn = () => number;

/**
 * CorrelationProvider interface (VERROU 3)
 * Must be injectable for deterministic testing
 */
export interface CorrelationProvider {
  /**
   * Generate a new correlation ID
   */
  generate(): string;

  /**
   * Get the current correlation ID (if set)
   */
  current(): string | undefined;

  /**
   * Set the current correlation ID
   */
  setCurrent(id: string): void;

  /**
   * Clear the current correlation ID
   */
  clear(): void;
}

/**
 * Span status
 */
export type SpanStatus = 'ok' | 'error' | 'cancelled';

/**
 * Span attributes
 */
export type SpanAttributes = Record<string, string | number | boolean>;

/**
 * Span data
 */
export interface SpanData {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startTime: number;
  readonly endTime?: number;
  readonly status: SpanStatus;
  readonly attributes: SpanAttributes;
}

/**
 * Span interface
 */
export interface Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;

  /**
   * Set an attribute on the span
   */
  setAttribute(key: string, value: string | number | boolean): void;

  /**
   * Set multiple attributes
   */
  setAttributes(attributes: SpanAttributes): void;

  /**
   * Set span status
   */
  setStatus(status: SpanStatus): void;

  /**
   * End the span
   */
  end(): void;

  /**
   * Get span data
   */
  getData(): SpanData;

  /**
   * Check if span is ended
   */
  isEnded(): boolean;
}

/**
 * Tracer configuration
 */
export interface TracerConfig {
  readonly serviceName: string;
  readonly correlationProvider: CorrelationProvider;
  readonly clock?: ClockFn;
  readonly onSpanEnd?: (span: SpanData) => void;
}

// ============================================================================
// Default CorrelationProvider
// ============================================================================

/**
 * Create a default correlation provider using random IDs
 */
export function createCorrelationProvider(): CorrelationProvider {
  let currentId: string | undefined;

  return {
    generate(): string {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    },
    current(): string | undefined {
      return currentId;
    },
    setCurrent(id: string): void {
      currentId = id;
    },
    clear(): void {
      currentId = undefined;
    },
  };
}

/**
 * Create a deterministic correlation provider for testing (VERROU 3)
 */
export function createTestCorrelationProvider(
  ids: string[] = []
): CorrelationProvider & { generated: string[] } {
  let index = 0;
  let currentId: string | undefined;
  const generated: string[] = [];

  return {
    generate(): string {
      const id = ids[index] ?? `test-correlation-${index}`;
      index++;
      generated.push(id);
      return id;
    },
    current(): string | undefined {
      return currentId;
    },
    setCurrent(id: string): void {
      currentId = id;
    },
    clear(): void {
      currentId = undefined;
    },
    generated,
  };
}

// ============================================================================
// Span Implementation
// ============================================================================

class SpanImpl implements Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;

  private readonly clock: ClockFn;
  private readonly onEnd?: (span: SpanData) => void;
  private readonly startTime: number;
  private endTime?: number;
  private status: SpanStatus = 'ok';
  private attributes: SpanAttributes = {};

  constructor(
    traceId: string,
    spanId: string,
    name: string,
    clock: ClockFn,
    parentSpanId?: string,
    onEnd?: (span: SpanData) => void
  ) {
    this.traceId = traceId;
    this.spanId = spanId;
    this.parentSpanId = parentSpanId;
    this.name = name;
    this.clock = clock;
    this.onEnd = onEnd;
    this.startTime = clock();
  }

  setAttribute(key: string, value: string | number | boolean): void {
    if (this.endTime !== undefined) {
      return; // Span already ended
    }
    this.attributes[key] = value;
  }

  setAttributes(attributes: SpanAttributes): void {
    if (this.endTime !== undefined) {
      return;
    }
    Object.assign(this.attributes, attributes);
  }

  setStatus(status: SpanStatus): void {
    if (this.endTime !== undefined) {
      return;
    }
    this.status = status;
  }

  end(): void {
    if (this.endTime !== undefined) {
      return; // Already ended
    }
    this.endTime = this.clock();
    this.onEnd?.(this.getData());
  }

  getData(): SpanData {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status,
      attributes: { ...this.attributes },
    };
  }

  isEnded(): boolean {
    return this.endTime !== undefined;
  }
}

// ============================================================================
// Tracer
// ============================================================================

/**
 * Tracer for creating and managing spans
 */
export class Tracer {
  private readonly serviceName: string;
  private readonly correlationProvider: CorrelationProvider;
  private readonly clock: ClockFn;
  private readonly onSpanEnd?: (span: SpanData) => void;
  private readonly activeSpans: Map<string, Span> = new Map();
  private spanCounter = 0;

  constructor(config: TracerConfig) {
    this.serviceName = config.serviceName;
    this.correlationProvider = config.correlationProvider;
    this.clock = config.clock ?? (() => Date.now());
    this.onSpanEnd = config.onSpanEnd;
  }

  /**
   * Start a new trace with a root span
   */
  startTrace(name: string, attributes?: SpanAttributes): Span {
    const traceId = this.correlationProvider.generate();
    const spanId = this.generateSpanId();

    this.correlationProvider.setCurrent(traceId);

    const span = new SpanImpl(
      traceId,
      spanId,
      name,
      this.clock,
      undefined,
      (data) => {
        this.activeSpans.delete(spanId);
        this.onSpanEnd?.(data);
      }
    );

    if (attributes) {
      span.setAttributes(attributes);
    }
    span.setAttribute('service.name', this.serviceName);

    this.activeSpans.set(spanId, span);
    return span;
  }

  /**
   * Start a child span within the current trace
   */
  startSpan(name: string, parentSpan?: Span, attributes?: SpanAttributes): Span {
    const traceId = parentSpan?.traceId ?? this.correlationProvider.current();

    if (!traceId) {
      // No active trace, start a new one
      return this.startTrace(name, attributes);
    }

    const spanId = this.generateSpanId();
    const parentSpanId = parentSpan?.spanId;

    const span = new SpanImpl(
      traceId,
      spanId,
      name,
      this.clock,
      parentSpanId,
      (data) => {
        this.activeSpans.delete(spanId);
        this.onSpanEnd?.(data);
      }
    );

    if (attributes) {
      span.setAttributes(attributes);
    }
    span.setAttribute('service.name', this.serviceName);

    this.activeSpans.set(spanId, span);
    return span;
  }

  /**
   * Get current trace ID
   */
  getCurrentTraceId(): string | undefined {
    return this.correlationProvider.current();
  }

  /**
   * Set current trace ID (for propagation)
   */
  setCurrentTraceId(traceId: string): void {
    this.correlationProvider.setCurrent(traceId);
  }

  /**
   * Clear current trace context
   */
  clearContext(): void {
    this.correlationProvider.clear();
  }

  /**
   * Get active span count
   */
  getActiveSpanCount(): number {
    return this.activeSpans.size;
  }

  /**
   * Get service name
   */
  getServiceName(): string {
    return this.serviceName;
  }

  private generateSpanId(): string {
    this.spanCounter++;
    return `span-${this.spanCounter}-${this.clock().toString(36)}`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a tracer
 */
export function createTracer(config: TracerConfig): Tracer {
  return new Tracer(config);
}

/**
 * Create a test tracer with deterministic IDs and collected spans
 */
export function createTestTracer(
  serviceName: string = 'test-service',
  clock?: ClockFn
): {
  tracer: Tracer;
  spans: SpanData[];
  correlationProvider: CorrelationProvider & { generated: string[] };
} {
  const spans: SpanData[] = [];
  const correlationProvider = createTestCorrelationProvider();

  const tracer = new Tracer({
    serviceName,
    correlationProvider,
    clock: clock ?? (() => 1000000000000),
    onSpanEnd: (span) => spans.push(span),
  });

  return { tracer, spans, correlationProvider };
}

// ============================================================================
// Context Propagation Helpers
// ============================================================================

/**
 * W3C Trace Context header name
 */
export const TRACEPARENT_HEADER = 'traceparent';

/**
 * Parse W3C traceparent header
 */
export function parseTraceparent(header: string): { traceId: string; spanId: string } | null {
  // Format: 00-{traceId}-{spanId}-{flags}
  const parts = header.split('-');
  if (parts.length !== 4 || parts[0] !== '00') {
    return null;
  }

  return {
    traceId: parts[1],
    spanId: parts[2],
  };
}

/**
 * Format W3C traceparent header
 */
export function formatTraceparent(traceId: string, spanId: string, sampled: boolean = true): string {
  const flags = sampled ? '01' : '00';
  return `00-${traceId}-${spanId}-${flags}`;
}
