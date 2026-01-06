/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Temporal Logic - OMEGA Invariants
 * 
 * Phase 23 - Sprint 23.2
 * 
 * Defines the standard temporal invariants for the OMEGA system.
 * These are the properties we prove hold across all executions.
 * 
 * INVARIANTS:
 * - INV-TEMP-01: Safety - □(valid_input ⇒ valid_output)
 * - INV-TEMP-02: Liveness - □(request_received ⇒ ◇response_sent)
 * - INV-TEMP-03: Fairness - □◇(handler_executed) for all active handlers
 * - INV-TEMP-04: Causality - □(chronicle[i].time < chronicle[i+1].time)
 * - INV-TEMP-05: Recovery - □(circuit_open ⇒ ◇circuit_half_open)
 */

import {
  TemporalInvariant,
  InvariantSeverity,
  InvariantCategory,
  LTLFormula,
} from './types.js';
import {
  atom,
  always,
  eventually,
  implies,
  and,
  not,
  or,
  until,
  weakUntil,
  next,
  safety,
  liveness,
  fairness,
  absence,
  mutualExclusion,
  boundedResponse,
} from './ltl.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMIC PROPOSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

// System state propositions
export const PROPS = {
  // Input/Output
  valid_input: atom('valid_input', 'input.valid === true'),
  valid_output: atom('valid_output', 'output.valid === true'),
  input_received: atom('input_received', 'event.type === "input"'),
  output_sent: atom('output_sent', 'event.type === "output"'),
  
  // Request/Response
  request_received: atom('request_received', 'event.type === "request"'),
  response_sent: atom('response_sent', 'event.type === "response"'),
  request_pending: atom('request_pending', 'state.pendingRequests > 0'),
  
  // Envelope
  envelope_valid: atom('envelope_valid', 'envelope.isValid'),
  envelope_processed: atom('envelope_processed', 'envelope.processed'),
  hash_verified: atom('hash_verified', 'envelope.hashVerified'),
  
  // Chronicle
  chronicle_recorded: atom('chronicle_recorded', 'chronicle.recorded'),
  chronicle_ordered: atom('chronicle_ordered', 'chronicle.properlyOrdered'),
  
  // Circuit Breaker
  circuit_open: atom('circuit_open', 'circuit.state === "open"'),
  circuit_half_open: atom('circuit_half_open', 'circuit.state === "half_open"'),
  circuit_closed: atom('circuit_closed', 'circuit.state === "closed"'),
  
  // Replay Guard
  replay_detected: atom('replay_detected', 'replay.detected'),
  replay_rejected: atom('replay_rejected', 'replay.rejected'),
  
  // Policy
  policy_checked: atom('policy_checked', 'policy.checked'),
  policy_allowed: atom('policy_allowed', 'policy.allowed'),
  policy_denied: atom('policy_denied', 'policy.denied'),
  
  // Handler
  handler_executed: atom('handler_executed', 'handler.executed'),
  handler_active: atom('handler_active', 'handler.active'),
  handler_failed: atom('handler_failed', 'handler.failed'),
  
  // Memory
  memory_write: atom('memory_write', 'event.type === "memory_write"'),
  memory_read: atom('memory_read', 'event.type === "memory_read"'),
  memory_consistent: atom('memory_consistent', 'memory.consistent'),
  
  // Error
  error_occurred: atom('error_occurred', 'error.occurred'),
  error_handled: atom('error_handled', 'error.handled'),
  
  // Side Effects
  side_effect: atom('side_effect', 'sideEffect.occurred'),
  no_side_effect: atom('no_side_effect', '!sideEffect.occurred'),
  
  // State Changes
  state_changed: atom('state_changed', 'state.changed'),
  state_unchanged: atom('state_unchanged', '!state.changed'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-TEMP-01: Input-Output Safety
 * □(valid_input ⇒ valid_output)
 */
export const INV_TEMP_01: TemporalInvariant = {
  id: 'INV-TEMP-01',
  name: 'Input-Output Safety',
  formula: safety(PROPS.valid_input, PROPS.valid_output),
  severity: InvariantSeverity.CRITICAL,
  category: InvariantCategory.SAFETY,
  description: 'Valid inputs always produce valid outputs',
  expectedToHold: true,
};

/**
 * INV-TEMP-06: Envelope Validation
 * □(envelope_processed ⇒ hash_verified)
 */
export const INV_TEMP_06: TemporalInvariant = {
  id: 'INV-TEMP-06',
  name: 'Envelope Validation',
  formula: safety(PROPS.envelope_processed, PROPS.hash_verified),
  severity: InvariantSeverity.CRITICAL,
  category: InvariantCategory.SAFETY,
  description: 'Processed envelopes always have verified hashes',
  expectedToHold: true,
};

/**
 * INV-TEMP-07: Replay Rejection
 * □(replay_detected ⇒ replay_rejected)
 */
export const INV_TEMP_07: TemporalInvariant = {
  id: 'INV-TEMP-07',
  name: 'Replay Rejection',
  formula: safety(PROPS.replay_detected, PROPS.replay_rejected),
  severity: InvariantSeverity.CRITICAL,
  category: InvariantCategory.SAFETY,
  description: 'Detected replays are always rejected',
  expectedToHold: true,
};

/**
 * INV-TEMP-08: Policy Enforcement
 * □(policy_denied ⇒ ¬handler_executed)
 */
export const INV_TEMP_08: TemporalInvariant = {
  id: 'INV-TEMP-08',
  name: 'Policy Enforcement',
  formula: safety(PROPS.policy_denied, not(PROPS.handler_executed)),
  severity: InvariantSeverity.CRITICAL,
  category: InvariantCategory.SAFETY,
  description: 'Denied requests never execute handlers',
  expectedToHold: true,
};

/**
 * INV-TEMP-09: No Side Effects on Rejection
 * □(replay_rejected ⇒ no_side_effect)
 */
export const INV_TEMP_09: TemporalInvariant = {
  id: 'INV-TEMP-09',
  name: 'No Side Effects on Rejection',
  formula: safety(PROPS.replay_rejected, PROPS.no_side_effect),
  severity: InvariantSeverity.CRITICAL,
  category: InvariantCategory.SAFETY,
  description: 'Rejected requests never cause side effects',
  expectedToHold: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIVENESS INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-TEMP-02: Request-Response Liveness
 * □(request_received ⇒ ◇response_sent)
 */
export const INV_TEMP_02: TemporalInvariant = {
  id: 'INV-TEMP-02',
  name: 'Request-Response Liveness',
  formula: liveness(PROPS.request_received, PROPS.response_sent),
  severity: InvariantSeverity.HIGH,
  category: InvariantCategory.LIVENESS,
  description: 'Every request eventually gets a response',
  expectedToHold: true,
};

/**
 * INV-TEMP-10: Error Handling Liveness
 * □(error_occurred ⇒ ◇error_handled)
 */
export const INV_TEMP_10: TemporalInvariant = {
  id: 'INV-TEMP-10',
  name: 'Error Handling Liveness',
  formula: liveness(PROPS.error_occurred, PROPS.error_handled),
  severity: InvariantSeverity.HIGH,
  category: InvariantCategory.LIVENESS,
  description: 'Every error is eventually handled',
  expectedToHold: true,
};

/**
 * INV-TEMP-11: Chronicle Recording Liveness
 * □(envelope_valid ⇒ ◇chronicle_recorded)
 */
export const INV_TEMP_11: TemporalInvariant = {
  id: 'INV-TEMP-11',
  name: 'Chronicle Recording Liveness',
  formula: liveness(PROPS.envelope_valid, PROPS.chronicle_recorded),
  severity: InvariantSeverity.HIGH,
  category: InvariantCategory.LIVENESS,
  description: 'Valid envelopes are eventually recorded in chronicle',
  expectedToHold: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// FAIRNESS INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-TEMP-03: Handler Fairness
 * □◇(handler_executed)
 */
export const INV_TEMP_03: TemporalInvariant = {
  id: 'INV-TEMP-03',
  name: 'Handler Fairness',
  formula: fairness(PROPS.handler_executed),
  severity: InvariantSeverity.MEDIUM,
  category: InvariantCategory.FAIRNESS,
  description: 'Active handlers are executed infinitely often',
  expectedToHold: true,
};

/**
 * INV-TEMP-12: Memory Access Fairness
 * □(memory_write ⇒ ◇memory_consistent)
 */
export const INV_TEMP_12: TemporalInvariant = {
  id: 'INV-TEMP-12',
  name: 'Memory Access Fairness',
  formula: liveness(PROPS.memory_write, PROPS.memory_consistent),
  severity: InvariantSeverity.HIGH,
  category: InvariantCategory.FAIRNESS,
  description: 'Memory writes eventually lead to consistent state',
  expectedToHold: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CAUSALITY INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-TEMP-04: Chronicle Ordering
 * □(chronicle_ordered)
 */
export const INV_TEMP_04: TemporalInvariant = {
  id: 'INV-TEMP-04',
  name: 'Chronicle Ordering',
  formula: always(PROPS.chronicle_ordered),
  severity: InvariantSeverity.CRITICAL,
  category: InvariantCategory.CAUSALITY,
  description: 'Chronicle entries are always properly ordered',
  expectedToHold: true,
};

/**
 * INV-TEMP-13: Request Before Response
 * □(response_sent ⇒ ◇⁻request_received)
 * Note: Using past operator - response implies request was received in the past
 */
export const INV_TEMP_13: TemporalInvariant = {
  id: 'INV-TEMP-13',
  name: 'Request Before Response',
  // Simplified: We check that response only happens after request
  formula: always(implies(PROPS.response_sent, PROPS.request_pending)),
  severity: InvariantSeverity.HIGH,
  category: InvariantCategory.CAUSALITY,
  description: 'Responses are only sent after requests are received',
  expectedToHold: true,
};

/**
 * INV-TEMP-14: Policy Check Before Execution
 * □(handler_executed ⇒ policy_checked)
 */
export const INV_TEMP_14: TemporalInvariant = {
  id: 'INV-TEMP-14',
  name: 'Policy Check Before Execution',
  formula: safety(PROPS.handler_executed, PROPS.policy_checked),
  severity: InvariantSeverity.CRITICAL,
  category: InvariantCategory.CAUSALITY,
  description: 'Handlers only execute after policy check',
  expectedToHold: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// RECOVERY INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-TEMP-05: Circuit Breaker Recovery
 * □(circuit_open ⇒ ◇circuit_half_open)
 */
export const INV_TEMP_05: TemporalInvariant = {
  id: 'INV-TEMP-05',
  name: 'Circuit Breaker Recovery',
  formula: liveness(PROPS.circuit_open, PROPS.circuit_half_open),
  severity: InvariantSeverity.HIGH,
  category: InvariantCategory.RECOVERY,
  description: 'Open circuits eventually transition to half-open',
  expectedToHold: true,
};

/**
 * INV-TEMP-15: Handler Recovery
 * □(handler_failed ⇒ ◇(handler_active ∨ circuit_open))
 */
export const INV_TEMP_15: TemporalInvariant = {
  id: 'INV-TEMP-15',
  name: 'Handler Recovery',
  formula: liveness(
    PROPS.handler_failed,
    or(PROPS.handler_active, PROPS.circuit_open)
  ),
  severity: InvariantSeverity.HIGH,
  category: InvariantCategory.RECOVERY,
  description: 'Failed handlers eventually recover or trigger circuit breaker',
  expectedToHold: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MUTUAL EXCLUSION INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-TEMP-16: Circuit State Exclusion
 * □¬(circuit_open ∧ circuit_closed)
 */
export const INV_TEMP_16: TemporalInvariant = {
  id: 'INV-TEMP-16',
  name: 'Circuit State Exclusion',
  formula: mutualExclusion(PROPS.circuit_open, PROPS.circuit_closed),
  severity: InvariantSeverity.CRITICAL,
  category: InvariantCategory.SAFETY,
  description: 'Circuit cannot be both open and closed',
  expectedToHold: true,
};

/**
 * INV-TEMP-17: Policy Decision Exclusion
 * □¬(policy_allowed ∧ policy_denied)
 */
export const INV_TEMP_17: TemporalInvariant = {
  id: 'INV-TEMP-17',
  name: 'Policy Decision Exclusion',
  formula: mutualExclusion(PROPS.policy_allowed, PROPS.policy_denied),
  severity: InvariantSeverity.CRITICAL,
  category: InvariantCategory.SAFETY,
  description: 'Policy cannot both allow and deny',
  expectedToHold: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDED RESPONSE INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-TEMP-18: Bounded Response Time (within 3 states)
 * □(request_received ⇒ ○○○response_sent)
 */
export const INV_TEMP_18: TemporalInvariant = {
  id: 'INV-TEMP-18',
  name: 'Bounded Response Time',
  formula: boundedResponse(PROPS.request_received, PROPS.response_sent, 3),
  severity: InvariantSeverity.MEDIUM,
  category: InvariantCategory.LIVENESS,
  description: 'Requests are responded to within bounded time',
  expectedToHold: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALL INVARIANTS COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All OMEGA temporal invariants
 */
export const OMEGA_TEMPORAL_INVARIANTS: ReadonlyArray<TemporalInvariant> = [
  // Safety
  INV_TEMP_01,
  INV_TEMP_06,
  INV_TEMP_07,
  INV_TEMP_08,
  INV_TEMP_09,
  
  // Liveness
  INV_TEMP_02,
  INV_TEMP_10,
  INV_TEMP_11,
  
  // Fairness
  INV_TEMP_03,
  INV_TEMP_12,
  
  // Causality
  INV_TEMP_04,
  INV_TEMP_13,
  INV_TEMP_14,
  
  // Recovery
  INV_TEMP_05,
  INV_TEMP_15,
  
  // Mutual Exclusion
  INV_TEMP_16,
  INV_TEMP_17,
  
  // Bounded Response
  INV_TEMP_18,
];

/**
 * Critical invariants only
 */
export const CRITICAL_INVARIANTS = OMEGA_TEMPORAL_INVARIANTS.filter(
  inv => inv.severity === InvariantSeverity.CRITICAL
);

/**
 * Safety invariants only
 */
export const SAFETY_INVARIANTS = OMEGA_TEMPORAL_INVARIANTS.filter(
  inv => inv.category === InvariantCategory.SAFETY
);

/**
 * Get invariant by ID
 */
export function getInvariantById(id: string): TemporalInvariant | undefined {
  return OMEGA_TEMPORAL_INVARIANTS.find(inv => inv.id === id);
}

/**
 * Get invariants by category
 */
export function getInvariantsByCategory(category: InvariantCategory): TemporalInvariant[] {
  return OMEGA_TEMPORAL_INVARIANTS.filter(inv => inv.category === category);
}

/**
 * Get invariants by severity
 */
export function getInvariantsBySeverity(severity: InvariantSeverity): TemporalInvariant[] {
  return OMEGA_TEMPORAL_INVARIANTS.filter(inv => inv.severity === severity);
}
