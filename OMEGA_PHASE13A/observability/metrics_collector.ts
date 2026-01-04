/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 13A — Metrics Collector
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-grade metrics collection:
 * - INV-MET-01: Exact counts (no approximation)
 * - INV-MET-02: Strict sliding window (configurable)
 * - INV-MET-03: Prometheus-compatible export (deterministic)
 * 
 * @module metrics_collector
 * @version 3.13.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type MetricLabels = Readonly<Record<string, string>>;

export type Outcome = 'success' | 'failure';

export type LatencyBucketsMs = ReadonlyArray<number>;

export interface MetricsConfig {
  readonly window_ms: number;
  readonly latency_buckets_ms: LatencyBucketsMs;
  readonly namespace?: string;
  readonly subsystem?: string;
}

interface Event {
  readonly t_ms: number;
  readonly outcome: Outcome;
  readonly latency_ms: number;
  readonly labels: MetricLabels;
}

export interface MetricsSnapshot {
  readonly window_ms: number;
  readonly from_ms: number;
  readonly to_ms: number;
  readonly totals: Readonly<{ success: number; failure: number; total: number }>;
  readonly by_label_key: Readonly<Record<string, { success: number; failure: number; total: number }>>;
  readonly latency: Readonly<{
    buckets_ms: number[];
    success_cum: number[];
    failure_cum: number[];
    success_sum_ms: number;
    failure_sum_ms: number;
  }>;
  readonly gauges: Readonly<Record<string, number>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/**
 * Create stable label key for grouping - INV-MET-03
 */
export function stableLabelKey(labels: MetricLabels): string {
  const keys = Object.keys(labels).sort();
  return keys.map(k => `${k}=${labels[k]}`).join(',');
}

/**
 * Sanitize metric name for Prometheus compatibility - INV-MET-03
 */
export function sanitizeMetricName(s: string): string {
  return s.replace(/[^a-zA-Z0-9_:]/g, '_');
}

function formatMetricPrefix(cfg: MetricsConfig, base: string): string {
  const parts: string[] = [];
  if (cfg.namespace) parts.push(cfg.namespace);
  if (cfg.subsystem) parts.push(cfg.subsystem);
  parts.push(base);
  return sanitizeMetricName(parts.join('_'));
}

function nowMs(): number {
  return Date.now();
}

function isFiniteNonNeg(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

function normalizeBuckets(b: LatencyBucketsMs): number[] {
  assert(Array.isArray(b) && b.length >= 1, 'latency_buckets_ms: must have at least 1 bucket');
  const out = [...b];
  for (let i = 0; i < out.length; i++) {
    assert(Number.isFinite(out[i]) && out[i] > 0, 'latency_buckets_ms: all buckets must be > 0 and finite');
    if (i > 0) assert(out[i] > out[i - 1], 'latency_buckets_ms: must be strictly ascending');
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS COLLECTOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * MetricsCollector - NASA-grade metrics with exact counts
 * 
 * Invariants:
 * - INV-MET-01: Exact counts (events in window = reported count)
 * - INV-MET-02: Strict sliding window eviction by time
 * - INV-MET-03: Deterministic Prometheus export
 */
export class MetricsCollector {
  private cfg: MetricsConfig;
  private buckets: number[];
  private events: Event[] = [];
  private gauges: Map<string, number> = new Map();

  constructor(cfg: MetricsConfig) {
    assert(Number.isFinite(cfg.window_ms) && cfg.window_ms >= 100, 'window_ms: must be >= 100');
    this.buckets = normalizeBuckets(cfg.latency_buckets_ms);
    this.cfg = Object.freeze({ ...cfg, latency_buckets_ms: this.buckets });
  }

  /**
   * Record an event - INV-MET-01
   */
  public record(outcome: Outcome, latency_ms: number, labels: MetricLabels = {}, t_ms?: number): void {
    assert(outcome === 'success' || outcome === 'failure', 'outcome: invalid');
    assert(isFiniteNonNeg(latency_ms), 'latency_ms: must be finite and >= 0');

    const tt = (t_ms === undefined) ? nowMs() : t_ms;
    assert(Number.isFinite(tt), 't_ms: must be finite');

    // Copy labels to avoid mutation - INV-MET-01
    const safeLabels: MetricLabels = Object.freeze({ ...labels });

    this.events.push(Object.freeze({
      t_ms: tt,
      outcome,
      latency_ms,
      labels: safeLabels,
    }));
  }

  public recordSuccess(latency_ms: number, labels: MetricLabels = {}, t_ms?: number): void {
    this.record('success', latency_ms, labels, t_ms);
  }

  public recordFailure(latency_ms: number, labels: MetricLabels = {}, t_ms?: number): void {
    this.record('failure', latency_ms, labels, t_ms);
  }

  /**
   * Set gauge value
   */
  public setGauge(name: string, value: number): void {
    const n = sanitizeMetricName(name);
    assert(n.length > 0, 'gauge name: invalid');
    assert(Number.isFinite(value), 'gauge value: must be finite');
    this.gauges.set(n, value);
  }

  /**
   * Prune events outside window - INV-MET-02
   */
  public prune(now_ms?: number): void {
    const now = (now_ms === undefined) ? nowMs() : now_ms;
    const minT = now - this.cfg.window_ms;
    // Keep events with t_ms >= minT AND t_ms <= now (strict window)
    this.events = this.events.filter(e => e.t_ms >= minT && e.t_ms <= now);
  }

  /**
   * Get bucket index for latency value
   */
  private bucketIndex(latency_ms: number): number {
    for (let i = 0; i < this.buckets.length; i++) {
      if (latency_ms <= this.buckets[i]) return i;
    }
    return this.buckets.length; // +Inf bucket
  }

  /**
   * Create snapshot - INV-MET-01
   */
  public snapshot(now_ms?: number): MetricsSnapshot {
    const now = (now_ms === undefined) ? nowMs() : now_ms;
    this.prune(now);

    const minT = now - this.cfg.window_ms;

    let success = 0, failure = 0;
    const byKey: Record<string, { success: number; failure: number; total: number }> = {};

    const nb = this.buckets.length;
    const sPer = new Array(nb + 1).fill(0);
    const fPer = new Array(nb + 1).fill(0);
    let successSum = 0;
    let failureSum = 0;

    for (const e of this.events) {
      if (e.outcome === 'success') {
        success++;
        successSum += e.latency_ms;
      } else {
        failure++;
        failureSum += e.latency_ms;
      }

      const k = stableLabelKey(e.labels);
      if (!byKey[k]) byKey[k] = { success: 0, failure: 0, total: 0 };
      if (e.outcome === 'success') byKey[k].success++;
      else byKey[k].failure++;
      byKey[k].total++;

      const idx = this.bucketIndex(e.latency_ms);
      if (e.outcome === 'success') sPer[idx]++;
      else fPer[idx]++;
    }

    // Cumulative counts
    const sCum = new Array(nb + 1).fill(0);
    const fCum = new Array(nb + 1).fill(0);
    let runS = 0, runF = 0;
    for (let i = 0; i < nb + 1; i++) {
      runS += sPer[i];
      runF += fPer[i];
      sCum[i] = runS;
      fCum[i] = runF;
    }

    // Gauges - sorted for determinism - INV-MET-03
    const gaugesObj: Record<string, number> = {};
    const gKeys = Array.from(this.gauges.keys()).sort();
    for (const k of gKeys) gaugesObj[k] = this.gauges.get(k)!;

    return Object.freeze({
      window_ms: this.cfg.window_ms,
      from_ms: minT,
      to_ms: now,
      totals: Object.freeze({ success, failure, total: success + failure }),
      by_label_key: Object.freeze(byKey),
      latency: Object.freeze({
        buckets_ms: this.buckets.slice(),
        success_cum: sCum,
        failure_cum: fCum,
        success_sum_ms: successSum,
        failure_sum_ms: failureSum,
      }),
      gauges: Object.freeze(gaugesObj),
    });
  }

  /**
   * Export Prometheus format - INV-MET-03
   */
  public exportPrometheus(now_ms?: number): string {
    const snap = this.snapshot(now_ms);

    const lines: string[] = [];
    const baseCounter = formatMetricPrefix(this.cfg, 'events_total');
    const baseLatency = formatMetricPrefix(this.cfg, 'latency_ms');
    const baseGauges = formatMetricPrefix(this.cfg, 'gauge');

    // Counter
    lines.push(`# HELP ${baseCounter} Total events in sliding window`);
    lines.push(`# TYPE ${baseCounter} counter`);
    lines.push(`${baseCounter}{outcome="success"} ${snap.totals.success}`);
    lines.push(`${baseCounter}{outcome="failure"} ${snap.totals.failure}`);

    // Latency histogram
    lines.push(`# HELP ${baseLatency}_bucket Latency histogram buckets (sliding window)`);
    lines.push(`# TYPE ${baseLatency}_bucket counter`);
    lines.push(`# HELP ${baseLatency}_sum Latency sum in ms (sliding window)`);
    lines.push(`# TYPE ${baseLatency}_sum counter`);
    lines.push(`# HELP ${baseLatency}_count Latency count (sliding window)`);
    lines.push(`# TYPE ${baseLatency}_count counter`);

    const boundaries = [...snap.latency.buckets_ms, Infinity];
    const outcomes: Outcome[] = ['success', 'failure'];

    for (const outcome of outcomes) {
      const cum = (outcome === 'success') ? snap.latency.success_cum : snap.latency.failure_cum;
      for (let i = 0; i < boundaries.length; i++) {
        const le = (boundaries[i] === Infinity) ? '+Inf' : String(boundaries[i]);
        lines.push(`${baseLatency}_bucket{outcome="${outcome}",le="${le}"} ${cum[i]}`);
      }
      const count = (outcome === 'success') ? snap.totals.success : snap.totals.failure;
      const sum = (outcome === 'success') ? snap.latency.success_sum_ms : snap.latency.failure_sum_ms;
      lines.push(`${baseLatency}_count{outcome="${outcome}"} ${count}`);
      lines.push(`${baseLatency}_sum{outcome="${outcome}"} ${sum}`);
    }

    // Gauges
    lines.push(`# HELP ${baseGauges} Generic gauges`);
    lines.push(`# TYPE ${baseGauges} gauge`);
    for (const k of Object.keys(snap.gauges).sort()) {
      lines.push(`${baseGauges}{name="${k}"} ${snap.gauges[k]}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Clear all data (for testing)
   */
  public clear(): void {
    this.events = [];
    this.gauges.clear();
  }

  /**
   * Get event count (for testing)
   */
  public getEventCount(): number {
    return this.events.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let defaultCollector: MetricsCollector | null = null;

export function getDefaultMetricsCollector(cfg?: MetricsConfig): MetricsCollector {
  if (!defaultCollector) {
    defaultCollector = new MetricsCollector(cfg || {
      window_ms: 60000,
      latency_buckets_ms: [10, 50, 100, 500, 1000],
    });
  }
  return defaultCollector;
}

export function resetDefaultMetricsCollector(): void {
  defaultCollector = null;
}
