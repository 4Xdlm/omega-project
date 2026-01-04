/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 13A — Alert Rules
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versioned alert rules configuration.
 * Rules are immutable once created - INV-ALT-01 (deterministic).
 * 
 * @module alert_rules
 * @version 3.13.0
 */

import type { AlertRule, AlertSeverity } from './alert_types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// RULE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate alert rule - INV-ALT-01
 */
export function validateRule(rule: unknown): RuleValidationResult {
  const errors: string[] = [];
  
  if (!rule || typeof rule !== 'object') {
    return { valid: false, errors: ['Rule must be an object'] };
  }
  
  const r = rule as Record<string, unknown>;
  
  // Required fields
  if (!r.id || typeof r.id !== 'string' || r.id.length === 0) {
    errors.push('id: required non-empty string');
  }
  
  if (!r.name || typeof r.name !== 'string') {
    errors.push('name: required string');
  }
  
  if (!r.version || typeof r.version !== 'string') {
    errors.push('version: required string');
  }
  
  const validSeverities: AlertSeverity[] = ['INFO', 'WARNING', 'CRITICAL'];
  if (!validSeverities.includes(r.severity as AlertSeverity)) {
    errors.push('severity: must be INFO, WARNING, or CRITICAL');
  }
  
  const validMetrics = ['error_rate', 'latency_p99', 'total_errors', 'custom'];
  if (!validMetrics.includes(r.metric as string)) {
    errors.push('metric: must be error_rate, latency_p99, total_errors, or custom');
  }
  
  if (typeof r.threshold !== 'number' || !Number.isFinite(r.threshold)) {
    errors.push('threshold: must be a finite number');
  }
  
  const validOperators = ['gt', 'gte', 'lt', 'lte', 'eq'];
  if (!validOperators.includes(r.operator as string)) {
    errors.push('operator: must be gt, gte, lt, lte, or eq');
  }
  
  if (typeof r.cooldown_ms !== 'number' || r.cooldown_ms < 0) {
    errors.push('cooldown_ms: must be non-negative number');
  }
  
  if (r.metric === 'custom' && (!r.custom_metric || typeof r.custom_metric !== 'string')) {
    errors.push('custom_metric: required when metric is custom');
  }
  
  if (typeof r.enabled !== 'boolean') {
    errors.push('enabled: must be boolean');
  }
  
  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an immutable alert rule - INV-ALT-01
 */
export function createRule(config: {
  id: string;
  name: string;
  version: string;
  severity: AlertSeverity;
  metric: AlertRule['metric'];
  threshold: number;
  operator: AlertRule['operator'];
  cooldown_ms: number;
  custom_metric?: string;
  enabled?: boolean;
}): AlertRule {
  const rule: AlertRule = Object.freeze({
    id: config.id,
    name: config.name,
    version: config.version,
    severity: config.severity,
    metric: config.metric,
    threshold: config.threshold,
    operator: config.operator,
    cooldown_ms: config.cooldown_ms,
    custom_metric: config.custom_metric,
    enabled: config.enabled ?? true
  });
  
  const validation = validateRule(rule);
  if (!validation.valid) {
    throw new Error(`Invalid rule: ${validation.errors.join(', ')}`);
  }
  
  return rule;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * High error rate rule
 */
export const RULE_HIGH_ERROR_RATE = createRule({
  id: 'ALT-001',
  name: 'High Error Rate',
  version: '1.0.0',
  severity: 'CRITICAL',
  metric: 'error_rate',
  threshold: 0.05, // 5%
  operator: 'gt',
  cooldown_ms: 60000 // 1 minute
});

/**
 * Warning error rate rule
 */
export const RULE_WARNING_ERROR_RATE = createRule({
  id: 'ALT-002',
  name: 'Warning Error Rate',
  version: '1.0.0',
  severity: 'WARNING',
  metric: 'error_rate',
  threshold: 0.01, // 1%
  operator: 'gt',
  cooldown_ms: 30000 // 30 seconds
});

/**
 * High latency rule
 */
export const RULE_HIGH_LATENCY = createRule({
  id: 'ALT-003',
  name: 'High Latency P99',
  version: '1.0.0',
  severity: 'WARNING',
  metric: 'latency_p99',
  threshold: 1000, // 1 second
  operator: 'gt',
  cooldown_ms: 60000
});

/**
 * Default rule set
 */
export const DEFAULT_RULES: readonly AlertRule[] = Object.freeze([
  RULE_HIGH_ERROR_RATE,
  RULE_WARNING_ERROR_RATE,
  RULE_HIGH_LATENCY
]);

// ═══════════════════════════════════════════════════════════════════════════════
// RULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rule registry for managing alert rules
 */
export class RuleRegistry {
  private rules: Map<string, AlertRule> = new Map();
  
  constructor(initialRules?: readonly AlertRule[]) {
    if (initialRules) {
      for (const rule of initialRules) {
        this.register(rule);
      }
    }
  }
  
  /**
   * Register a rule
   */
  register(rule: AlertRule): void {
    const validation = validateRule(rule);
    if (!validation.valid) {
      throw new Error(`Invalid rule ${rule.id}: ${validation.errors.join(', ')}`);
    }
    this.rules.set(rule.id, rule);
  }
  
  /**
   * Get rule by ID
   */
  get(id: string): AlertRule | undefined {
    return this.rules.get(id);
  }
  
  /**
   * Get all enabled rules
   */
  getEnabled(): AlertRule[] {
    return Array.from(this.rules.values()).filter(r => r.enabled);
  }
  
  /**
   * Get all rules
   */
  getAll(): AlertRule[] {
    return Array.from(this.rules.values());
  }
  
  /**
   * Check if rule exists
   */
  has(id: string): boolean {
    return this.rules.has(id);
  }
  
  /**
   * Remove rule
   */
  remove(id: string): boolean {
    return this.rules.delete(id);
  }
  
  /**
   * Clear all rules
   */
  clear(): void {
    this.rules.clear();
  }
  
  /**
   * Get rule count
   */
  get size(): number {
    return this.rules.size;
  }
}
