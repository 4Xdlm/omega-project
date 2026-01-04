/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 13A — Alert Types
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Type definitions for the Alert System.
 * 
 * @module alert_types
 * @version 3.13.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT SEVERITY
// ═══════════════════════════════════════════════════════════════════════════════

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export const SEVERITY_LEVELS: Record<AlertSeverity, number> = {
  INFO: 1,
  WARNING: 2,
  CRITICAL: 3
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT STATE
// ═══════════════════════════════════════════════════════════════════════════════

export type AlertState = 'RAISED' | 'CLEARED' | 'PENDING';

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT RULE
// ═══════════════════════════════════════════════════════════════════════════════

export interface AlertRule {
  /** Unique rule identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Rule version (for audit) */
  readonly version: string;
  /** Alert severity when triggered */
  readonly severity: AlertSeverity;
  /** Metric to monitor */
  readonly metric: 'error_rate' | 'latency_p99' | 'total_errors' | 'custom';
  /** Threshold value */
  readonly threshold: number;
  /** Comparison operator */
  readonly operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  /** Cooldown period in ms (anti-spam) - INV-ALT-02 */
  readonly cooldown_ms: number;
  /** Optional: custom metric name if metric === 'custom' */
  readonly custom_metric?: string;
  /** Rule enabled/disabled */
  readonly enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT EVENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface AlertEvent {
  /** Rule that triggered this alert */
  readonly rule_id: string;
  /** Rule version at trigger time */
  readonly rule_version: string;
  /** Alert state */
  readonly state: AlertState;
  /** Severity at trigger time */
  readonly severity: AlertSeverity;
  /** Metric value that triggered alert */
  readonly metric_value: number;
  /** Threshold that was crossed */
  readonly threshold: number;
  /** Timestamp (UTC ISO) */
  readonly timestamp: string;
  /** Message */
  readonly message: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT ENGINE STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface AlertRuleState {
  /** Current alert state */
  state: AlertState;
  /** Last state change timestamp */
  last_change_ms: number;
  /** Last alert raised timestamp (for cooldown) */
  last_alert_ms: number;
  /** Count of consecutive triggers */
  trigger_count: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface EvaluationResult {
  /** Rule ID */
  rule_id: string;
  /** Whether condition is met */
  condition_met: boolean;
  /** Current metric value */
  metric_value: number;
  /** Whether alert should fire (considering cooldown) */
  should_alert: boolean;
  /** Reason if not alerting */
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS INPUT (from MetricsCollector snapshot)
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetricsInput {
  /** Total success count */
  success: number;
  /** Total failure count */
  failure: number;
  /** Total count */
  total: number;
  /** Error rate (0-1) */
  error_rate: number;
  /** Latency P99 (if available) */
  latency_p99?: number;
  /** Custom metrics */
  custom?: Record<string, number>;
}
