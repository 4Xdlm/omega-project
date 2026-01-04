/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 13A — Observability Module
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-Grade observability for OMEGA:
 * - Forensic logging with chain integrity
 * - Audit trail (coming in 13A.2)
 * - Metrics collection (coming in 13A.3)
 * - Alert system (coming in 13A.4)
 * 
 * @module observability
 * @version 3.13.0
 */

// Forensic Logger (Sprint 13A.1)
export {
  // Types
  type LogLevel,
  type ForensicLogEntry,
  type ForensicLoggerConfig,
  
  // Constants
  LOG_LEVEL_VALUES,
  DEFAULT_CONFIG,
  LOG_ENTRY_SCHEMA,
  GENESIS_HASH,
  
  // Functions
  computeHash,
  validateLogEntry,
  verifyEntryHash,
  withForensicLogging,
  getDefaultLogger,
  resetDefaultLogger,
  
  // Class
  ForensicLogger
} from './forensic_logger.js';

// Audit Trail (Sprint 13A.2)
export {
  // Types
  type AuditEventType,
  type ActorRole,
  type AuditEventInput,
  type CanonicalPayload,
  type AuditEvent,
  type VerifyResult,
  type ExportResult,
  
  // Constants
  GENESIS_HASH as AUDIT_GENESIS_HASH,
  REQUIRED_FIELDS,
  
  // Functions
  sortObjectKeys,
  canonicalJSON,
  computeEventHash,
  utcTimestamp,
  validateEventInput,
  getDefaultAuditTrail,
  resetDefaultAuditTrail,
  
  // Class
  AuditTrail
} from './audit_trail.js';

// Metrics Collector (Sprint 13A.3)
export {
  // Types
  type MetricLabels,
  type Outcome,
  type LatencyBucketsMs,
  type MetricsConfig,
  type MetricsSnapshot,
  
  // Functions
  stableLabelKey,
  sanitizeMetricName,
  getDefaultMetricsCollector,
  resetDefaultMetricsCollector,
  
  // Class
  MetricsCollector
} from './metrics_collector.js';

// Alert System (Sprint 13A.4)
export {
  // Types
  type AlertSeverity,
  type AlertState,
  type AlertRule,
  type AlertEvent,
  type AlertRuleState,
  type EvaluationResult,
  type MetricsInput,
  SEVERITY_LEVELS
} from './alert_types.js';

export {
  // Rule management
  validateRule,
  createRule,
  RuleRegistry,
  DEFAULT_RULES,
  RULE_HIGH_ERROR_RATE,
  RULE_WARNING_ERROR_RATE,
  RULE_HIGH_LATENCY
} from './alert_rules.js';

export {
  // Engine
  AlertEngine,
  evaluateCondition,
  extractMetricValue,
  createAlertEngine
} from './alert_engine.js';
