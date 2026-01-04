/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 13A — Alert Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NASA-grade alert engine:
 * - INV-ALT-01: Deterministic rules (same inputs → same alerts)
 * - INV-ALT-02: Anti-spam cooldown
 * - INV-ALT-03: Every alert → AuditTrail event (append-only)
 * 
 * @module alert_engine
 * @version 3.13.0
 */

import type {
  AlertRule,
  AlertEvent,
  AlertRuleState,
  AlertState,
  EvaluationResult,
  MetricsInput
} from './alert_types.js';
import { AuditTrail } from './audit_trail.js';
import { RuleRegistry } from './alert_rules.js';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare value against threshold - INV-ALT-01 (deterministic)
 */
export function evaluateCondition(
  value: number,
  operator: AlertRule['operator'],
  threshold: number
): boolean {
  switch (operator) {
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    case 'eq': return value === threshold;
    default: return false;
  }
}

/**
 * Extract metric value from input - INV-ALT-01 (deterministic)
 */
export function extractMetricValue(
  input: MetricsInput,
  rule: AlertRule
): number | undefined {
  switch (rule.metric) {
    case 'error_rate':
      return input.error_rate;
    case 'latency_p99':
      return input.latency_p99;
    case 'total_errors':
      return input.failure;
    case 'custom':
      return rule.custom_metric && input.custom
        ? input.custom[rule.custom_metric]
        : undefined;
    default:
      return undefined;
  }
}

/**
 * Generate UTC timestamp
 */
function utcNow(): string {
  return new Date().toISOString();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Alert Engine - Evaluates rules and manages alert lifecycle
 * 
 * Invariants:
 * - INV-ALT-01: Deterministic evaluation (same inputs → same results)
 * - INV-ALT-02: Cooldown prevents alert spam
 * - INV-ALT-03: All alerts recorded in AuditTrail
 */
export class AlertEngine {
  private registry: RuleRegistry;
  private auditTrail: AuditTrail;
  private ruleStates: Map<string, AlertRuleState> = new Map();
  
  constructor(registry: RuleRegistry, auditTrail: AuditTrail) {
    this.registry = registry;
    this.auditTrail = auditTrail;
  }
  
  /**
   * Get or create rule state (internal)
   */
  private getOrCreateRuleState(ruleId: string): AlertRuleState {
    let state = this.ruleStates.get(ruleId);
    if (!state) {
      state = {
        state: 'CLEARED',
        last_change_ms: 0,
        last_alert_ms: 0,
        trigger_count: 0
      };
      this.ruleStates.set(ruleId, state);
    }
    return state;
  }
  
  /**
   * Check if cooldown is active - INV-ALT-02
   */
  private isCooldownActive(rule: AlertRule, now_ms: number): boolean {
    const state = this.getOrCreateRuleState(rule.id);
    if (state.last_alert_ms === 0) return false;
    return (now_ms - state.last_alert_ms) < rule.cooldown_ms;
  }
  
  /**
   * Evaluate a single rule - INV-ALT-01 (deterministic)
   */
  evaluateRule(rule: AlertRule, input: MetricsInput, now_ms?: number): EvaluationResult {
    const currentTime = now_ms ?? Date.now();
    
    // Extract metric value
    const metricValue = extractMetricValue(input, rule);
    
    if (metricValue === undefined) {
      return {
        rule_id: rule.id,
        condition_met: false,
        metric_value: NaN,
        should_alert: false,
        reason: 'Metric value not available'
      };
    }
    
    // Evaluate condition - INV-ALT-01
    const conditionMet = evaluateCondition(metricValue, rule.operator, rule.threshold);
    
    // Check cooldown - INV-ALT-02
    const cooldownActive = this.isCooldownActive(rule, currentTime);
    
    // Determine if should alert
    let shouldAlert = false;
    let reason: string | undefined;
    
    if (!rule.enabled) {
      reason = 'Rule disabled';
    } else if (!conditionMet) {
      reason = 'Condition not met';
    } else if (cooldownActive) {
      reason = 'Cooldown active';
    } else {
      shouldAlert = true;
    }
    
    return {
      rule_id: rule.id,
      condition_met: conditionMet,
      metric_value: metricValue,
      should_alert: shouldAlert,
      reason
    };
  }
  
  /**
   * Process alert - update state and write to AuditTrail - INV-ALT-03
   */
  private processAlert(
    rule: AlertRule,
    result: EvaluationResult,
    now_ms: number,
    timestamp?: Date
  ): AlertEvent | null {
    const state = this.getOrCreateRuleState(rule.id);
    const previousState = state.state;
    
    let newState: AlertState;
    let shouldRecord = false;
    
    if (result.should_alert) {
      // Condition met and not in cooldown
      newState = 'RAISED';
      if (previousState !== 'RAISED') {
        shouldRecord = true;
        state.trigger_count++;
      }
      state.last_alert_ms = now_ms;
    } else if (result.condition_met && previousState === 'RAISED') {
      // Condition still met but in cooldown - stay raised
      newState = 'RAISED';
    } else if (!result.condition_met && previousState === 'RAISED') {
      // Condition cleared
      newState = 'CLEARED';
      shouldRecord = true;
      state.trigger_count = 0;
    } else {
      // No change
      newState = previousState;
    }
    
    // Update state
    if (newState !== previousState) {
      state.last_change_ms = now_ms;
    }
    state.state = newState;
    
    // Record to AuditTrail - INV-ALT-03
    if (shouldRecord) {
      const alertEvent: AlertEvent = {
        rule_id: rule.id,
        rule_version: rule.version,
        state: newState,
        severity: rule.severity,
        metric_value: result.metric_value,
        threshold: rule.threshold,
        timestamp: timestamp?.toISOString() ?? utcNow(),
        message: newState === 'RAISED'
          ? `Alert ${rule.name}: ${result.metric_value} ${rule.operator} ${rule.threshold}`
          : `Alert ${rule.name} cleared`
      };
      
      // Write to AuditTrail - INV-ALT-03
      this.auditTrail.append({
        type: newState === 'RAISED' ? 'ERROR' : 'SYSTEM',
        actor_role: 'SYSTEM',
        actor_id: 'alert_engine',
        action: newState === 'RAISED' ? 'ALERT_RAISED' : 'ALERT_CLEARED',
        resource: `rule/${rule.id}`,
        data: alertEvent as unknown as Record<string, unknown>
      }, timestamp);
      
      return alertEvent;
    }
    
    return null;
  }
  
  /**
   * Evaluate all rules against metrics input
   * Returns list of alert events that were raised/cleared
   */
  evaluate(input: MetricsInput, now_ms?: number, timestamp?: Date): AlertEvent[] {
    const currentTime = now_ms ?? Date.now();
    const events: AlertEvent[] = [];
    
    for (const rule of this.registry.getEnabled()) {
      const result = this.evaluateRule(rule, input, currentTime);
      const event = this.processAlert(rule, result, currentTime, timestamp);
      if (event) {
        events.push(event);
      }
    }
    
    return events;
  }
  
  /**
   * Get current state for a rule
   */
  getRuleState(ruleId: string): AlertRuleState | undefined {
    return this.ruleStates.get(ruleId);
  }
  
  /**
   * Get all active alerts (rules in RAISED state)
   */
  getActiveAlerts(): Array<{ rule: AlertRule; state: AlertRuleState }> {
    const active: Array<{ rule: AlertRule; state: AlertRuleState }> = [];
    
    for (const [ruleId, state] of this.ruleStates) {
      if (state.state === 'RAISED') {
        const rule = this.registry.get(ruleId);
        if (rule) {
          active.push({ rule, state });
        }
      }
    }
    
    return active;
  }
  
  /**
   * Reset all rule states (for testing)
   */
  reset(): void {
    this.ruleStates.clear();
  }
  
  /**
   * Get rule registry
   */
  getRegistry(): RuleRegistry {
    return this.registry;
  }
  
  /**
   * Get audit trail
   */
  getAuditTrail(): AuditTrail {
    return this.auditTrail;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create AlertEngine with default rules
 */
export function createAlertEngine(auditTrail?: AuditTrail): AlertEngine {
  const registry = new RuleRegistry();
  const trail = auditTrail ?? new AuditTrail();
  return new AlertEngine(registry, trail);
}
