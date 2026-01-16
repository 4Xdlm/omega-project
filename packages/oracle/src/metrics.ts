/**
 * Oracle Metrics System
 * @module @omega/oracle/metrics
 * @description Performance monitoring and analytics for Oracle
 */

/**
 * Metric type
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

/**
 * Base metric interface
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  labels: Record<string, string>;
}

/**
 * Counter metric (monotonically increasing)
 */
export interface CounterMetric extends Metric {
  type: 'counter';
}

/**
 * Gauge metric (can go up or down)
 */
export interface GaugeMetric extends Metric {
  type: 'gauge';
}

/**
 * Histogram metric (distribution of values)
 */
export interface HistogramMetric extends Metric {
  type: 'histogram';
  buckets: { le: number; count: number }[];
  sum: number;
  count: number;
}

/**
 * Timer metric (duration tracking)
 */
export interface TimerMetric extends Metric {
  type: 'timer';
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /** Enable metrics collection */
  enabled: boolean;
  /** Maximum stored metrics */
  maxMetrics: number;
  /** Histogram bucket boundaries */
  histogramBuckets: number[];
  /** Auto-flush interval in ms (0 to disable) */
  flushInterval: number;
  /** Metric retention period in ms */
  retentionPeriod: number;
}

/**
 * Default metrics configuration
 */
export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  enabled: true,
  maxMetrics: 10000,
  histogramBuckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  flushInterval: 60000, // 1 minute
  retentionPeriod: 3600000, // 1 hour
};

/**
 * Timer context for tracking operation duration
 */
export interface TimerContext {
  start: number;
  name: string;
  labels: Record<string, string>;
}

/**
 * Metrics snapshot
 */
export interface MetricsSnapshot {
  timestamp: number;
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, HistogramMetric>;
  timers: Record<string, TimerMetric>;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  period: { start: number; end: number };
  totalAnalyses: number;
  avgProcessingTime: number;
  p95ProcessingTime: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number; // analyses per minute
  topEmotions: { emotion: string; count: number }[];
  slowestOperations: { name: string; duration: number }[];
}

/**
 * Oracle Metrics Collector
 */
export class OracleMetrics {
  private config: MetricsConfig;
  private counters: Map<string, number>;
  private gauges: Map<string, number>;
  private histogramData: Map<string, number[]>;
  private timerData: Map<string, number[]>;
  private metricLabels: Map<string, Record<string, string>>;
  private timestamps: Map<string, number>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private startTime: number;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...DEFAULT_METRICS_CONFIG, ...config };
    this.counters = new Map();
    this.gauges = new Map();
    this.histogramData = new Map();
    this.timerData = new Map();
    this.metricLabels = new Map();
    this.timestamps = new Map();
    this.startTime = Date.now();

    if (this.config.flushInterval > 0) {
      this.startFlushTimer();
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.cleanup();
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Increment counter
   */
  increment(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    if (!this.config.enabled) return;

    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    this.metricLabels.set(key, labels);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels: Record<string, string> = {}): number {
    const key = this.buildKey(name, labels);
    return this.counters.get(key) || 0;
  }

  /**
   * Set gauge value
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.config.enabled) return;

    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
    this.metricLabels.set(key, labels);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, labels: Record<string, string> = {}): number {
    const key = this.buildKey(name, labels);
    return this.gauges.get(key) || 0;
  }

  /**
   * Increment gauge
   */
  incrementGauge(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const current = this.getGauge(name, labels);
    this.setGauge(name, current + value, labels);
  }

  /**
   * Decrement gauge
   */
  decrementGauge(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const current = this.getGauge(name, labels);
    this.setGauge(name, Math.max(0, current - value), labels);
  }

  /**
   * Record histogram value
   */
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.config.enabled) return;

    const key = this.buildKey(name, labels);
    const data = this.histogramData.get(key) || [];
    data.push(value);

    // Limit stored values
    if (data.length > 1000) {
      data.splice(0, data.length - 1000);
    }

    this.histogramData.set(key, data);
    this.metricLabels.set(key, labels);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Get histogram data
   */
  getHistogram(name: string, labels: Record<string, string> = {}): HistogramMetric | null {
    const key = this.buildKey(name, labels);
    const data = this.histogramData.get(key);

    if (!data || data.length === 0) return null;

    const sum = data.reduce((a, b) => a + b, 0);
    const buckets = this.config.histogramBuckets.map((le) => ({
      le,
      count: data.filter((v) => v <= le).length,
    }));

    return {
      name,
      type: 'histogram',
      value: sum / data.length,
      timestamp: this.timestamps.get(key) || Date.now(),
      labels: this.metricLabels.get(key) || {},
      buckets,
      sum,
      count: data.length,
    };
  }

  /**
   * Start timer
   */
  startTimer(name: string, labels: Record<string, string> = {}): TimerContext {
    return {
      start: Date.now(),
      name,
      labels,
    };
  }

  /**
   * End timer and record duration
   */
  endTimer(context: TimerContext): number {
    const duration = Date.now() - context.start;
    this.recordTimer(context.name, duration, context.labels);
    return duration;
  }

  /**
   * Record timer value directly
   */
  recordTimer(name: string, duration: number, labels: Record<string, string> = {}): void {
    if (!this.config.enabled) return;

    const key = this.buildKey(name, labels);
    const data = this.timerData.get(key) || [];
    data.push(duration);

    // Limit stored values
    if (data.length > 1000) {
      data.splice(0, data.length - 1000);
    }

    this.timerData.set(key, data);
    this.metricLabels.set(key, labels);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Get timer statistics
   */
  getTimer(name: string, labels: Record<string, string> = {}): TimerMetric | null {
    const key = this.buildKey(name, labels);
    const data = this.timerData.get(key);

    if (!data || data.length === 0) return null;

    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);

    return {
      name,
      type: 'timer',
      value: sum / data.length,
      timestamp: this.timestamps.get(key) || Date.now(),
      labels: this.metricLabels.get(key) || {},
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / data.length,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      count: data.length,
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Build metric key with labels
   */
  private buildKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Get metrics snapshot
   */
  getSnapshot(): MetricsSnapshot {
    const counters: Record<string, number> = {};
    const gauges: Record<string, number> = {};
    const histograms: Record<string, HistogramMetric> = {};
    const timers: Record<string, TimerMetric> = {};

    for (const [key, value] of this.counters) {
      counters[key] = value;
    }

    for (const [key, value] of this.gauges) {
      gauges[key] = value;
    }

    for (const [key] of this.histogramData) {
      const histogram = this.getHistogram(key);
      if (histogram) {
        histograms[key] = histogram;
      }
    }

    for (const [key] of this.timerData) {
      const timer = this.getTimer(key);
      if (timer) {
        timers[key] = timer;
      }
    }

    return {
      timestamp: Date.now(),
      counters,
      gauges,
      histograms,
      timers,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const now = Date.now();
    const analysisTimer = this.getTimer('oracle.analysis.duration');
    const totalAnalyses = this.getCounter('oracle.analysis.total');
    const cacheHits = this.getCounter('oracle.cache.hits');
    const cacheMisses = this.getCounter('oracle.cache.misses');
    const errors = this.getCounter('oracle.errors.total');

    const cacheTotal = cacheHits + cacheMisses;
    const cacheHitRate = cacheTotal > 0 ? cacheHits / cacheTotal : 0;
    const errorRate = totalAnalyses > 0 ? errors / totalAnalyses : 0;

    const elapsedMinutes = (now - this.startTime) / 60000;
    const throughput = elapsedMinutes > 0 ? totalAnalyses / elapsedMinutes : 0;

    // Get emotion counts
    const emotionCounts: Record<string, number> = {};
    for (const [key, value] of this.counters) {
      if (key.startsWith('oracle.emotion.')) {
        const emotion = key.replace('oracle.emotion.', '');
        emotionCounts[emotion] = value;
      }
    }

    const topEmotions = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, count }));

    // Get slowest operations
    const slowestOps: { name: string; duration: number }[] = [];
    for (const [key] of this.timerData) {
      const timer = this.getTimer(key);
      if (timer) {
        slowestOps.push({ name: key, duration: timer.max });
      }
    }
    slowestOps.sort((a, b) => b.duration - a.duration);

    return {
      period: { start: this.startTime, end: now },
      totalAnalyses,
      avgProcessingTime: analysisTimer?.avg || 0,
      p95ProcessingTime: analysisTimer?.p95 || 0,
      cacheHitRate,
      errorRate,
      throughput,
      topEmotions,
      slowestOperations: slowestOps.slice(0, 5),
    };
  }

  /**
   * Cleanup old metrics
   */
  cleanup(): number {
    const cutoff = Date.now() - this.config.retentionPeriod;
    let removed = 0;

    for (const [key, timestamp] of this.timestamps) {
      if (timestamp < cutoff) {
        this.counters.delete(key);
        this.gauges.delete(key);
        this.histogramData.delete(key);
        this.timerData.delete(key);
        this.metricLabels.delete(key);
        this.timestamps.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histogramData.clear();
    this.timerData.clear();
    this.metricLabels.clear();
    this.timestamps.clear();
    this.startTime = Date.now();
  }

  /**
   * Get uptime in ms
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Dispose metrics collector
   */
  dispose(): void {
    this.stopFlushTimer();
    this.reset();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable metrics
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable metrics
   */
  disable(): void {
    this.config.enabled = false;
  }
}

/**
 * Create metrics collector instance
 */
export function createMetrics(config?: Partial<MetricsConfig>): OracleMetrics {
  return new OracleMetrics(config);
}

/**
 * Global metrics instance (singleton pattern)
 */
let globalMetrics: OracleMetrics | null = null;

/**
 * Get global metrics instance
 */
export function getGlobalMetrics(): OracleMetrics {
  if (!globalMetrics) {
    globalMetrics = createMetrics();
  }
  return globalMetrics;
}

/**
 * Reset global metrics
 */
export function resetGlobalMetrics(): void {
  if (globalMetrics) {
    globalMetrics.dispose();
    globalMetrics = null;
  }
}
