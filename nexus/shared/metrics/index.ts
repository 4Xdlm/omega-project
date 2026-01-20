/**
 * Metrics Collector with Injectable Clock
 * Standard: NASA-Grade L4
 *
 * CRITICAL (VERROU 3): Clock is injectable for deterministic testing.
 * All timestamps must come from injected clock, never Date.now() directly.
 *
 * @module metrics
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Clock function type for timestamp generation
 */
export type ClockFn = () => number;

/**
 * Metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram';

/**
 * Labels for metric dimensions
 */
export type Labels = Record<string, string>;

/**
 * Metric value with timestamp
 */
export interface MetricValue {
  readonly value: number;
  readonly timestamp: number;
  readonly labels: Labels;
}

/**
 * Metric definition
 */
export interface MetricDefinition {
  readonly name: string;
  readonly type: MetricType;
  readonly help: string;
  readonly labelNames: readonly string[];
}

/**
 * Histogram buckets configuration
 */
export interface HistogramBuckets {
  readonly buckets: readonly number[];
}

/**
 * Histogram data point
 */
export interface HistogramValue {
  readonly sum: number;
  readonly count: number;
  readonly buckets: Map<number, number>;
  readonly timestamp: number;
  readonly labels: Labels;
}

/**
 * Metrics collector configuration
 */
export interface MetricsCollectorConfig {
  readonly clock?: ClockFn;
  readonly prefix?: string;
  readonly defaultLabels?: Labels;
}

// ============================================================================
// Default Histogram Buckets
// ============================================================================

export const DEFAULT_BUCKETS: readonly number[] = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

export const MS_BUCKETS: readonly number[] = [
  1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
];

// ============================================================================
// Counter
// ============================================================================

/**
 * Counter metric - monotonically increasing value
 */
export class Counter {
  private readonly name: string;
  private readonly help: string;
  private readonly labelNames: readonly string[];
  private readonly clock: ClockFn;
  private readonly values: Map<string, MetricValue> = new Map();

  constructor(
    name: string,
    help: string,
    labelNames: readonly string[] = [],
    clock: ClockFn = () => Date.now()
  ) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.clock = clock;
  }

  /**
   * Increment counter by 1 or specified amount
   */
  inc(labelsOrAmount?: Labels | number, amount?: number): void {
    let labels: Labels = {};
    let value = 1;

    if (typeof labelsOrAmount === 'number') {
      value = labelsOrAmount;
    } else if (labelsOrAmount) {
      labels = labelsOrAmount;
      value = amount ?? 1;
    }

    if (value < 0) {
      throw new Error('Counter can only be incremented');
    }

    const key = this.labelsKey(labels);
    const existing = this.values.get(key);
    const newValue = (existing?.value ?? 0) + value;

    this.values.set(key, {
      value: newValue,
      timestamp: this.clock(),
      labels,
    });
  }

  /**
   * Get current value for labels
   */
  get(labels: Labels = {}): number {
    const key = this.labelsKey(labels);
    return this.values.get(key)?.value ?? 0;
  }

  /**
   * Reset counter
   */
  reset(labels?: Labels): void {
    if (labels) {
      this.values.delete(this.labelsKey(labels));
    } else {
      this.values.clear();
    }
  }

  /**
   * Get all values
   */
  getAll(): readonly MetricValue[] {
    return [...this.values.values()];
  }

  /**
   * Get metric definition
   */
  getDefinition(): MetricDefinition {
    return {
      name: this.name,
      type: 'counter',
      help: this.help,
      labelNames: this.labelNames,
    };
  }

  private labelsKey(labels: Labels): string {
    const sorted = Object.keys(labels).sort();
    return sorted.map((k) => `${k}="${labels[k]}"`).join(',');
  }
}

// ============================================================================
// Gauge
// ============================================================================

/**
 * Gauge metric - value that can go up and down
 */
export class Gauge {
  private readonly name: string;
  private readonly help: string;
  private readonly labelNames: readonly string[];
  private readonly clock: ClockFn;
  private readonly values: Map<string, MetricValue> = new Map();

  constructor(
    name: string,
    help: string,
    labelNames: readonly string[] = [],
    clock: ClockFn = () => Date.now()
  ) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.clock = clock;
  }

  /**
   * Set gauge to specific value
   */
  set(labelsOrValue: Labels | number, value?: number): void {
    let labels: Labels = {};
    let val: number;

    if (typeof labelsOrValue === 'number') {
      val = labelsOrValue;
    } else {
      labels = labelsOrValue;
      val = value ?? 0;
    }

    this.values.set(this.labelsKey(labels), {
      value: val,
      timestamp: this.clock(),
      labels,
    });
  }

  /**
   * Increment gauge
   */
  inc(labelsOrAmount?: Labels | number, amount?: number): void {
    let labels: Labels = {};
    let value = 1;

    if (typeof labelsOrAmount === 'number') {
      value = labelsOrAmount;
    } else if (labelsOrAmount) {
      labels = labelsOrAmount;
      value = amount ?? 1;
    }

    const key = this.labelsKey(labels);
    const existing = this.values.get(key);
    const newValue = (existing?.value ?? 0) + value;

    this.values.set(key, {
      value: newValue,
      timestamp: this.clock(),
      labels,
    });
  }

  /**
   * Decrement gauge
   */
  dec(labelsOrAmount?: Labels | number, amount?: number): void {
    let labels: Labels = {};
    let value = 1;

    if (typeof labelsOrAmount === 'number') {
      value = labelsOrAmount;
    } else if (labelsOrAmount) {
      labels = labelsOrAmount;
      value = amount ?? 1;
    }

    const key = this.labelsKey(labels);
    const existing = this.values.get(key);
    const newValue = (existing?.value ?? 0) - value;

    this.values.set(key, {
      value: newValue,
      timestamp: this.clock(),
      labels,
    });
  }

  /**
   * Get current value for labels
   */
  get(labels: Labels = {}): number {
    const key = this.labelsKey(labels);
    return this.values.get(key)?.value ?? 0;
  }

  /**
   * Reset gauge
   */
  reset(labels?: Labels): void {
    if (labels) {
      this.values.delete(this.labelsKey(labels));
    } else {
      this.values.clear();
    }
  }

  /**
   * Get all values
   */
  getAll(): readonly MetricValue[] {
    return [...this.values.values()];
  }

  /**
   * Get metric definition
   */
  getDefinition(): MetricDefinition {
    return {
      name: this.name,
      type: 'gauge',
      help: this.help,
      labelNames: this.labelNames,
    };
  }

  private labelsKey(labels: Labels): string {
    const sorted = Object.keys(labels).sort();
    return sorted.map((k) => `${k}="${labels[k]}"`).join(',');
  }
}

// ============================================================================
// Histogram
// ============================================================================

/**
 * Histogram metric - distribution of values
 */
export class Histogram {
  private readonly name: string;
  private readonly help: string;
  private readonly labelNames: readonly string[];
  private readonly clock: ClockFn;
  private readonly buckets: readonly number[];
  private readonly values: Map<string, HistogramValue> = new Map();

  constructor(
    name: string,
    help: string,
    labelNames: readonly string[] = [],
    clock: ClockFn = () => Date.now(),
    buckets: readonly number[] = DEFAULT_BUCKETS
  ) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.clock = clock;
    this.buckets = [...buckets].sort((a, b) => a - b);
  }

  /**
   * Observe a value
   */
  observe(labelsOrValue: Labels | number, value?: number): void {
    let labels: Labels = {};
    let val: number;

    if (typeof labelsOrValue === 'number') {
      val = labelsOrValue;
    } else {
      labels = labelsOrValue;
      val = value ?? 0;
    }

    const key = this.labelsKey(labels);
    const existing = this.values.get(key);

    const bucketCounts = existing?.buckets ?? new Map<number, number>();
    for (const bucket of this.buckets) {
      if (val <= bucket) {
        bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
      }
    }
    // +Inf bucket
    bucketCounts.set(Infinity, (bucketCounts.get(Infinity) ?? 0) + 1);

    this.values.set(key, {
      sum: (existing?.sum ?? 0) + val,
      count: (existing?.count ?? 0) + 1,
      buckets: bucketCounts,
      timestamp: this.clock(),
      labels,
    });
  }

  /**
   * Start a timer that observes duration on stop
   */
  startTimer(labels: Labels = {}): () => number {
    const start = this.clock();
    return () => {
      const duration = this.clock() - start;
      this.observe(labels, duration);
      return duration;
    };
  }

  /**
   * Get histogram data for labels
   */
  get(labels: Labels = {}): HistogramValue | undefined {
    return this.values.get(this.labelsKey(labels));
  }

  /**
   * Reset histogram
   */
  reset(labels?: Labels): void {
    if (labels) {
      this.values.delete(this.labelsKey(labels));
    } else {
      this.values.clear();
    }
  }

  /**
   * Get all values
   */
  getAll(): readonly HistogramValue[] {
    return [...this.values.values()];
  }

  /**
   * Get metric definition
   */
  getDefinition(): MetricDefinition {
    return {
      name: this.name,
      type: 'histogram',
      help: this.help,
      labelNames: this.labelNames,
    };
  }

  /**
   * Get configured buckets
   */
  getBuckets(): readonly number[] {
    return this.buckets;
  }

  private labelsKey(labels: Labels): string {
    const sorted = Object.keys(labels).sort();
    return sorted.map((k) => `${k}="${labels[k]}"`).join(',');
  }
}

// ============================================================================
// Metrics Collector (Registry)
// ============================================================================

/**
 * Central metrics collector/registry
 */
export class MetricsCollector {
  private readonly clock: ClockFn;
  private readonly prefix: string;
  private readonly defaultLabels: Labels;
  private readonly counters: Map<string, Counter> = new Map();
  private readonly gauges: Map<string, Gauge> = new Map();
  private readonly histograms: Map<string, Histogram> = new Map();

  constructor(config: MetricsCollectorConfig = {}) {
    this.clock = config.clock ?? (() => Date.now());
    this.prefix = config.prefix ?? '';
    this.defaultLabels = config.defaultLabels ?? {};
  }

  /**
   * Create or get a counter
   */
  counter(name: string, help: string, labelNames: readonly string[] = []): Counter {
    const fullName = this.prefix ? `${this.prefix}_${name}` : name;
    let counter = this.counters.get(fullName);

    if (!counter) {
      counter = new Counter(fullName, help, labelNames, this.clock);
      this.counters.set(fullName, counter);
    }

    return counter;
  }

  /**
   * Create or get a gauge
   */
  gauge(name: string, help: string, labelNames: readonly string[] = []): Gauge {
    const fullName = this.prefix ? `${this.prefix}_${name}` : name;
    let gauge = this.gauges.get(fullName);

    if (!gauge) {
      gauge = new Gauge(fullName, help, labelNames, this.clock);
      this.gauges.set(fullName, gauge);
    }

    return gauge;
  }

  /**
   * Create or get a histogram
   */
  histogram(
    name: string,
    help: string,
    labelNames: readonly string[] = [],
    buckets?: readonly number[]
  ): Histogram {
    const fullName = this.prefix ? `${this.prefix}_${name}` : name;
    let histogram = this.histograms.get(fullName);

    if (!histogram) {
      histogram = new Histogram(fullName, help, labelNames, this.clock, buckets);
      this.histograms.set(fullName, histogram);
    }

    return histogram;
  }

  /**
   * Get all registered metrics
   */
  getMetrics(): {
    counters: readonly Counter[];
    gauges: readonly Gauge[];
    histograms: readonly Histogram[];
  } {
    return {
      counters: [...this.counters.values()],
      gauges: [...this.gauges.values()],
      histograms: [...this.histograms.values()],
    };
  }

  /**
   * Reset all metrics
   */
  resetAll(): void {
    for (const counter of this.counters.values()) {
      counter.reset();
    }
    for (const gauge of this.gauges.values()) {
      gauge.reset();
    }
    for (const histogram of this.histograms.values()) {
      histogram.reset();
    }
  }

  /**
   * Get clock function
   */
  getClock(): ClockFn {
    return this.clock;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a metrics collector
 */
export function createMetricsCollector(config?: MetricsCollectorConfig): MetricsCollector {
  return new MetricsCollector(config);
}

/**
 * Create a test metrics collector with fixed clock
 */
export function createTestMetricsCollector(clock?: ClockFn): MetricsCollector {
  return new MetricsCollector({
    clock: clock ?? (() => 1000000000000),
  });
}
