/**
 * OMEGA NEXUS - Observatory
 * 
 * Phase 24
 * 
 * Real-time monitoring system for OMEGA modules.
 * Tracks health, metrics, and alerts across the entire system.
 */

import {
  OmegaModule,
  HealthStatus,
  AlertSeverity,
  ObservatoryMetric,
  ObservatoryAlert,
  ObservatorySnapshot,
  InvariantId,
  TimestampMs,
  timestampMs,
  ALL_MODULES,
} from '../core/types.js';
import { sha256 } from '../core/crypto.js';

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Metric definition
 */
interface MetricDefinition {
  readonly name: string;
  readonly module: OmegaModule;
  readonly unit: string;
  readonly warningThreshold?: number;
  readonly criticalThreshold?: number;
  readonly direction: 'lower' | 'higher';
}

/**
 * Standard OMEGA metrics
 */
const METRIC_DEFINITIONS: MetricDefinition[] = [
  // Latency metrics
  { name: 'p50_latency', module: OmegaModule.NEXUS, unit: 'ms', warningThreshold: 20, criticalThreshold: 50, direction: 'lower' },
  { name: 'p95_latency', module: OmegaModule.NEXUS, unit: 'ms', warningThreshold: 50, criticalThreshold: 100, direction: 'lower' },
  { name: 'p99_latency', module: OmegaModule.NEXUS, unit: 'ms', warningThreshold: 100, criticalThreshold: 200, direction: 'lower' },
  
  // Throughput metrics
  { name: 'requests_per_second', module: OmegaModule.NEXUS, unit: 'rps', warningThreshold: 500, criticalThreshold: 100, direction: 'higher' },
  { name: 'successful_requests', module: OmegaModule.NEXUS, unit: '%', warningThreshold: 99, criticalThreshold: 95, direction: 'higher' },
  
  // Memory metrics
  { name: 'heap_used', module: OmegaModule.MEMORY, unit: 'MB', warningThreshold: 256, criticalThreshold: 512, direction: 'lower' },
  { name: 'heap_total', module: OmegaModule.MEMORY, unit: 'MB', warningThreshold: 512, criticalThreshold: 1024, direction: 'lower' },
  
  // Chronicle metrics
  { name: 'chronicle_entries', module: OmegaModule.CHRONICLE, unit: 'count', direction: 'higher' },
  { name: 'chronicle_size', module: OmegaModule.CHRONICLE, unit: 'MB', warningThreshold: 100, criticalThreshold: 500, direction: 'lower' },
  
  // Replay Guard metrics
  { name: 'nonce_cache_size', module: OmegaModule.REPLAY_GUARD, unit: 'count', warningThreshold: 10000, criticalThreshold: 100000, direction: 'lower' },
  { name: 'replays_blocked', module: OmegaModule.REPLAY_GUARD, unit: 'count', direction: 'higher' },
  
  // Policy metrics
  { name: 'policy_evaluations', module: OmegaModule.POLICY, unit: 'count', direction: 'higher' },
  { name: 'policy_denials', module: OmegaModule.POLICY, unit: 'count', direction: 'higher' },
  
  // Circuit breaker metrics
  { name: 'circuit_state', module: OmegaModule.WIRING, unit: 'state', direction: 'higher' },
  { name: 'circuit_failures', module: OmegaModule.WIRING, unit: 'count', warningThreshold: 3, criticalThreshold: 5, direction: 'lower' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVATORY CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Observatory event listener
 */
export type ObservatoryListener = (event: ObservatoryEvent) => void;

/**
 * Observatory event
 */
export interface ObservatoryEvent {
  readonly type: 'metric' | 'alert' | 'health_change';
  readonly module: OmegaModule;
  readonly data: ObservatoryMetric | ObservatoryAlert | { previous: HealthStatus; current: HealthStatus };
  readonly timestamp: TimestampMs;
}

/**
 * Observatory class - real-time monitoring
 */
export class Observatory {
  private metrics: Map<string, ObservatoryMetric> = new Map();
  private alerts: ObservatoryAlert[] = [];
  private moduleHealth: Map<OmegaModule, HealthStatus> = new Map();
  private listeners: ObservatoryListener[] = [];
  private alertCounter = 0;

  constructor() {
    // Initialize module health
    for (const module of ALL_MODULES) {
      this.moduleHealth.set(module, HealthStatus.UNKNOWN);
    }
  }

  /**
   * Record a metric value
   */
  recordMetric(
    name: string,
    module: OmegaModule,
    value: number,
    unit: string
  ): void {
    const definition = METRIC_DEFINITIONS.find(
      d => d.name === name && d.module === module
    );

    const status = this.evaluateMetricHealth(value, definition);
    const metric: ObservatoryMetric = {
      name,
      module,
      value,
      unit,
      threshold: definition?.criticalThreshold,
      status,
      timestamp: timestampMs(),
    };

    this.metrics.set(`${module}:${name}`, metric);
    this.emitEvent({ type: 'metric', module, data: metric, timestamp: metric.timestamp });
    
    // Check for alerts
    if (status === HealthStatus.CRITICAL || status === HealthStatus.DEGRADED) {
      this.raiseAlert(
        module,
        status === HealthStatus.CRITICAL ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        `Metric ${name} is ${status.toLowerCase()}: ${value}${unit}`,
        { metric: name, value, threshold: definition?.criticalThreshold ?? definition?.warningThreshold }
      );
    }

    // Update module health
    this.updateModuleHealth(module);
  }

  /**
   * Raise an alert
   */
  raiseAlert(
    module: OmegaModule,
    severity: AlertSeverity,
    message: string,
    details: Record<string, unknown> = {},
    invariantId?: InvariantId
  ): ObservatoryAlert {
    const alert: ObservatoryAlert = {
      id: `ALERT_${++this.alertCounter}_${Date.now()}`,
      module,
      invariantId,
      severity,
      message,
      details,
      timestamp: timestampMs(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.emitEvent({ type: 'alert', module, data: alert, timestamp: alert.timestamp });
    
    // Update module health based on alert severity
    if (severity === AlertSeverity.CRITICAL) {
      this.setModuleHealth(module, HealthStatus.CRITICAL);
    } else if (severity === AlertSeverity.ERROR) {
      const current = this.moduleHealth.get(module);
      if (current !== HealthStatus.CRITICAL) {
        this.setModuleHealth(module, HealthStatus.DEGRADED);
      }
    }

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      (alert as any).acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(maxAgeMs: number = 3600000): number {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.alerts.length;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
    return before - this.alerts.length;
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): ObservatorySnapshot {
    const overallHealth = this.computeOverallHealth();
    return {
      modules: new Map(this.moduleHealth),
      metrics: Array.from(this.metrics.values()),
      alerts: [...this.alerts],
      overallHealth,
      timestamp: timestampMs(),
    };
  }

  /**
   * Get module health
   */
  getModuleHealth(module: OmegaModule): HealthStatus {
    return this.moduleHealth.get(module) ?? HealthStatus.UNKNOWN;
  }

  /**
   * Get active alerts for a module
   */
  getModuleAlerts(module: OmegaModule): ObservatoryAlert[] {
    return this.alerts.filter(a => a.module === module && !a.acknowledged);
  }

  /**
   * Get all unacknowledged alerts
   */
  getActiveAlerts(): ObservatoryAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Get metric history (last N values)
   */
  getMetric(module: OmegaModule, name: string): ObservatoryMetric | undefined {
    return this.metrics.get(`${module}:${name}`);
  }

  /**
   * Subscribe to events
   */
  subscribe(listener: ObservatoryListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Set module health manually
   */
  setModuleHealth(module: OmegaModule, status: HealthStatus): void {
    const previous = this.moduleHealth.get(module) ?? HealthStatus.UNKNOWN;
    if (previous !== status) {
      this.moduleHealth.set(module, status);
      this.emitEvent({
        type: 'health_change',
        module,
        data: { previous, current: status },
        timestamp: timestampMs(),
      });
    }
  }

  /**
   * Reset observatory state
   */
  reset(): void {
    this.metrics.clear();
    this.alerts = [];
    for (const module of ALL_MODULES) {
      this.moduleHealth.set(module, HealthStatus.UNKNOWN);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────────────────────────

  private evaluateMetricHealth(value: number, definition?: MetricDefinition): HealthStatus {
    if (!definition) {
      return HealthStatus.HEALTHY;
    }

    const { warningThreshold, criticalThreshold, direction } = definition;

    if (direction === 'lower') {
      // Lower is better (e.g., latency)
      if (criticalThreshold !== undefined && value >= criticalThreshold) {
        return HealthStatus.CRITICAL;
      }
      if (warningThreshold !== undefined && value >= warningThreshold) {
        return HealthStatus.DEGRADED;
      }
    } else {
      // Higher is better (e.g., throughput)
      if (criticalThreshold !== undefined && value <= criticalThreshold) {
        return HealthStatus.CRITICAL;
      }
      if (warningThreshold !== undefined && value <= warningThreshold) {
        return HealthStatus.DEGRADED;
      }
    }

    return HealthStatus.HEALTHY;
  }

  private updateModuleHealth(module: OmegaModule): void {
    const moduleMetrics = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith(`${module}:`))
      .map(([, metric]) => metric);

    if (moduleMetrics.length === 0) {
      return;
    }

    // Compute worst health status
    let worstStatus = HealthStatus.HEALTHY;
    for (const metric of moduleMetrics) {
      if (metric.status === HealthStatus.CRITICAL) {
        worstStatus = HealthStatus.CRITICAL;
        break;
      }
      if (metric.status === HealthStatus.DEGRADED) {
        worstStatus = HealthStatus.DEGRADED;
      }
    }

    this.setModuleHealth(module, worstStatus);
  }

  private computeOverallHealth(): HealthStatus {
    let hasCritical = false;
    let hasDegraded = false;
    let hasUnknown = false;

    for (const [, status] of this.moduleHealth) {
      if (status === HealthStatus.CRITICAL) {
        hasCritical = true;
      }
      if (status === HealthStatus.DEGRADED) {
        hasDegraded = true;
      }
      if (status === HealthStatus.UNKNOWN) {
        hasUnknown = true;
      }
    }

    if (hasCritical) return HealthStatus.CRITICAL;
    if (hasDegraded) return HealthStatus.DEGRADED;
    if (hasUnknown) return HealthStatus.UNKNOWN;
    return HealthStatus.HEALTHY;
  }

  private emitEvent(event: ObservatoryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Observatory listener error:', error);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate observatory report
 */
export function generateObservatoryReport(observatory: Observatory): string {
  const snapshot = observatory.getSnapshot();
  const lines: string[] = [];
  const divider = '═'.repeat(60);

  lines.push(divider);
  lines.push('           OMEGA NEXUS - OBSERVATORY REPORT');
  lines.push(`           ${new Date(snapshot.timestamp).toISOString()}`);
  lines.push(divider);
  lines.push('');

  // Overall health
  lines.push(`OVERALL HEALTH: ${snapshot.overallHealth}`);
  lines.push('');

  // Module health
  lines.push('MODULE HEALTH');
  lines.push('─'.repeat(40));
  for (const [module, health] of snapshot.modules) {
    const icon = health === HealthStatus.HEALTHY ? '✓' :
                 health === HealthStatus.DEGRADED ? '⚠' :
                 health === HealthStatus.CRITICAL ? '✗' : '?';
    lines.push(`  ${icon} ${module.padEnd(20)} ${health}`);
  }
  lines.push('');

  // Active alerts
  const activeAlerts = snapshot.alerts.filter(a => !a.acknowledged);
  if (activeAlerts.length > 0) {
    lines.push(`ACTIVE ALERTS (${activeAlerts.length})`);
    lines.push('─'.repeat(40));
    for (const alert of activeAlerts) {
      lines.push(`  [${alert.severity}] ${alert.module}: ${alert.message}`);
    }
    lines.push('');
  }

  // Key metrics
  lines.push('KEY METRICS');
  lines.push('─'.repeat(40));
  for (const metric of snapshot.metrics) {
    const icon = metric.status === HealthStatus.HEALTHY ? '✓' :
                 metric.status === HealthStatus.DEGRADED ? '⚠' :
                 metric.status === HealthStatus.CRITICAL ? '✗' : '?';
    lines.push(`  ${icon} ${metric.name.padEnd(25)} ${metric.value}${metric.unit}`);
  }
  lines.push('');
  lines.push(divider);

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create observatory instance
 */
export function createObservatory(): Observatory {
  return new Observatory();
}

/**
 * Singleton observatory
 */
let _globalObservatory: Observatory | null = null;

export function getGlobalObservatory(): Observatory {
  if (!_globalObservatory) {
    _globalObservatory = createObservatory();
  }
  return _globalObservatory;
}
