/**
 * Prometheus Text Format Exporter
 * Standard: NASA-Grade L4
 *
 * Exports metrics in Prometheus text exposition format.
 * See: https://prometheus.io/docs/instrumenting/exposition_formats/
 *
 * @module metrics/prometheus
 */

import type {
  MetricsCollector,
  Counter,
  Gauge,
  Histogram,
  Labels,
  MetricValue,
  HistogramValue,
} from './index.js';

// ============================================================================
// Prometheus Text Format
// ============================================================================

/**
 * Format labels for Prometheus
 */
function formatLabels(labels: Labels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) {
    return '';
  }
  const formatted = entries
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',');
  return `{${formatted}}`;
}

/**
 * Escape label value for Prometheus format
 */
function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * Format a counter for Prometheus
 */
function formatCounter(counter: Counter): string {
  const def = counter.getDefinition();
  const values = counter.getAll();

  const lines: string[] = [];
  lines.push(`# HELP ${def.name} ${def.help}`);
  lines.push(`# TYPE ${def.name} counter`);

  if (values.length === 0) {
    lines.push(`${def.name} 0`);
  } else {
    for (const v of values) {
      lines.push(`${def.name}${formatLabels(v.labels)} ${v.value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format a gauge for Prometheus
 */
function formatGauge(gauge: Gauge): string {
  const def = gauge.getDefinition();
  const values = gauge.getAll();

  const lines: string[] = [];
  lines.push(`# HELP ${def.name} ${def.help}`);
  lines.push(`# TYPE ${def.name} gauge`);

  if (values.length === 0) {
    lines.push(`${def.name} 0`);
  } else {
    for (const v of values) {
      lines.push(`${def.name}${formatLabels(v.labels)} ${v.value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format a histogram for Prometheus
 */
function formatHistogram(histogram: Histogram): string {
  const def = histogram.getDefinition();
  const values = histogram.getAll();
  const buckets = histogram.getBuckets();

  const lines: string[] = [];
  lines.push(`# HELP ${def.name} ${def.help}`);
  lines.push(`# TYPE ${def.name} histogram`);

  if (values.length === 0) {
    // Empty histogram
    for (const bucket of buckets) {
      lines.push(`${def.name}_bucket{le="${bucket}"} 0`);
    }
    lines.push(`${def.name}_bucket{le="+Inf"} 0`);
    lines.push(`${def.name}_sum 0`);
    lines.push(`${def.name}_count 0`);
  } else {
    for (const v of values) {
      const labelStr = formatLabels(v.labels);
      const labelPrefix = labelStr ? labelStr.slice(0, -1) + ',' : '{';

      // Bucket values
      for (const bucket of buckets) {
        const count = v.buckets.get(bucket) ?? 0;
        lines.push(`${def.name}_bucket${labelPrefix}le="${bucket}"} ${count}`);
      }
      // +Inf bucket
      const infCount = v.buckets.get(Infinity) ?? 0;
      lines.push(`${def.name}_bucket${labelPrefix}le="+Inf"} ${infCount}`);

      // Sum and count
      const sumLabels = labelStr || '';
      lines.push(`${def.name}_sum${sumLabels} ${v.sum}`);
      lines.push(`${def.name}_count${sumLabels} ${v.count}`);
    }
  }

  return lines.join('\n');
}

// ============================================================================
// Exporter
// ============================================================================

/**
 * Export metrics in Prometheus text format
 */
export function exportPrometheus(collector: MetricsCollector): string {
  const { counters, gauges, histograms } = collector.getMetrics();
  const sections: string[] = [];

  for (const counter of counters) {
    sections.push(formatCounter(counter));
  }

  for (const gauge of gauges) {
    sections.push(formatGauge(gauge));
  }

  for (const histogram of histograms) {
    sections.push(formatHistogram(histogram));
  }

  return sections.join('\n\n') + '\n';
}

/**
 * Export metrics with timestamp suffix
 */
export function exportPrometheusWithTimestamp(
  collector: MetricsCollector,
  timestamp?: number
): string {
  const ts = timestamp ?? collector.getClock()();
  const base = exportPrometheus(collector);

  // Add timestamp to each metric line (not HELP/TYPE lines)
  return base
    .split('\n')
    .map((line) => {
      if (line.startsWith('#') || line.trim() === '') {
        return line;
      }
      return `${line} ${ts}`;
    })
    .join('\n');
}

/**
 * Content type for Prometheus exposition format
 */
export const PROMETHEUS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';
