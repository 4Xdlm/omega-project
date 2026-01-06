/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Adversarial Grammar - Type Definitions
 * 
 * Phase 23 - Sprint 23.1
 * 
 * Defines the formal grammar for attack vector generation.
 * Every possible attack is classified and enumerable.
 * 
 * INVARIANTS:
 * - INV-ADV-01: Grammar covers 100% of known vectors
 * - INV-ADV-02: ∀attack ∉ Grammar ⇒ attack impossible
 * - INV-ADV-03: ∀attack ∈ Grammar, system(attack) ∈ {REJECT, ABSORB}
 * - INV-ADV-04: rejected(attack) ⇒ state_unchanged
 * - INV-ADV-05: ∀attack, severity(attack) ∈ {LOW, MEDIUM, HIGH, CRITICAL}
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Unique identifier for an attack vector */
export type AttackId = Brand<string, 'AttackId'>;

/** Unique identifier for a test case */
export type TestCaseId = Brand<string, 'TestCaseId'>;

// ═══════════════════════════════════════════════════════════════════════════════
// ATTACK TAXONOMY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Attack categories - top level classification
 */
export const AttackCategory = {
  ENVELOPE: 'ENVELOPE',           // Message envelope attacks
  REPLAY: 'REPLAY',               // Replay-based attacks
  BYPASS: 'BYPASS',               // Security bypass attempts
  RESOURCE: 'RESOURCE',           // Resource exhaustion
  TIMING: 'TIMING',               // Timing-based attacks
  INJECTION: 'INJECTION',         // Data injection attacks
  CORRUPTION: 'CORRUPTION',       // Data corruption attacks
  PROTOCOL: 'PROTOCOL',           // Protocol violation attacks
} as const;

export type AttackCategory = typeof AttackCategory[keyof typeof AttackCategory];

/**
 * Attack severity levels
 */
export const Severity = {
  LOW: 'LOW',           // Minor impact, easily recoverable
  MEDIUM: 'MEDIUM',     // Moderate impact, may cause degradation
  HIGH: 'HIGH',         // Significant impact, service disruption
  CRITICAL: 'CRITICAL', // System-wide impact, potential data loss
} as const;

export type Severity = typeof Severity[keyof typeof Severity];

/**
 * Expected system response to attack
 */
export const ExpectedResponse = {
  REJECT: 'REJECT',             // Attack should be rejected
  ABSORB: 'ABSORB',             // Attack should be absorbed gracefully
  DEGRADE_BOUNDED: 'DEGRADE_BOUNDED', // Bounded degradation acceptable
} as const;

export type ExpectedResponse = typeof ExpectedResponse[keyof typeof ExpectedResponse];

/**
 * Attack exploitability assessment
 */
export const Exploitability = {
  TRIVIAL: 'TRIVIAL',           // Easy to exploit, no special knowledge
  MODERATE: 'MODERATE',         // Requires some knowledge
  DIFFICULT: 'DIFFICULT',       // Requires significant expertise
  THEORETICAL: 'THEORETICAL',   // Theoretically possible only
} as const;

export type Exploitability = typeof Exploitability[keyof typeof Exploitability];

// ═══════════════════════════════════════════════════════════════════════════════
// ATTACK VECTOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base attack vector definition
 */
export interface AttackVector {
  /** Unique identifier */
  readonly id: AttackId;
  /** Human-readable name */
  readonly name: string;
  /** Category of attack */
  readonly category: AttackCategory;
  /** Severity level */
  readonly severity: Severity;
  /** Exploitability assessment */
  readonly exploitability: Exploitability;
  /** Expected system response */
  readonly expectedResponse: ExpectedResponse;
  /** Detailed description */
  readonly description: string;
  /** MITRE ATT&CK or CWE reference (if applicable) */
  readonly reference?: string;
  /** Invariants this attack should NOT violate */
  readonly protectedInvariants: ReadonlyArray<string>;
}

/**
 * Envelope attack specifics
 */
export interface EnvelopeAttack extends AttackVector {
  readonly category: typeof AttackCategory.ENVELOPE;
  readonly subtype: EnvelopeAttackType;
  readonly targetField: string;
  readonly mutationType: MutationType;
}

export const EnvelopeAttackType = {
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_TYPE: 'INVALID_TYPE',
  HASH_MISMATCH: 'HASH_MISMATCH',
  SCHEMA_VIOLATION: 'SCHEMA_VIOLATION',
  OVERSIZED_PAYLOAD: 'OVERSIZED_PAYLOAD',
  MALFORMED_JSON: 'MALFORMED_JSON',
  UNICODE_ATTACK: 'UNICODE_ATTACK',
  NULL_INJECTION: 'NULL_INJECTION',
} as const;

export type EnvelopeAttackType = typeof EnvelopeAttackType[keyof typeof EnvelopeAttackType];

/**
 * Replay attack specifics
 */
export interface ReplayAttack extends AttackVector {
  readonly category: typeof AttackCategory.REPLAY;
  readonly subtype: ReplayAttackType;
  readonly delayMs: number;
  readonly modifications: ReadonlyArray<string>;
}

export const ReplayAttackType = {
  EXACT_DUPLICATE: 'EXACT_DUPLICATE',
  MODIFIED_REPLAY: 'MODIFIED_REPLAY',
  TTL_EXPIRED: 'TTL_EXPIRED',
  CROSS_SESSION: 'CROSS_SESSION',
  OUT_OF_ORDER: 'OUT_OF_ORDER',
} as const;

export type ReplayAttackType = typeof ReplayAttackType[keyof typeof ReplayAttackType];

/**
 * Bypass attack specifics
 */
export interface BypassAttack extends AttackVector {
  readonly category: typeof AttackCategory.BYPASS;
  readonly subtype: BypassAttackType;
  readonly targetComponent: string;
  readonly technique: string;
}

export const BypassAttackType = {
  POLICY_BYPASS: 'POLICY_BYPASS',
  AUTHENTICATION_BYPASS: 'AUTHENTICATION_BYPASS',
  AUTHORIZATION_BYPASS: 'AUTHORIZATION_BYPASS',
  VALIDATION_BYPASS: 'VALIDATION_BYPASS',
  RATE_LIMIT_BYPASS: 'RATE_LIMIT_BYPASS',
} as const;

export type BypassAttackType = typeof BypassAttackType[keyof typeof BypassAttackType];

/**
 * Resource attack specifics
 */
export interface ResourceAttack extends AttackVector {
  readonly category: typeof AttackCategory.RESOURCE;
  readonly subtype: ResourceAttackType;
  readonly targetResource: string;
  readonly exhaustionLevel: number; // 0-1
}

export const ResourceAttackType = {
  MEMORY_EXHAUSTION: 'MEMORY_EXHAUSTION',
  CPU_EXHAUSTION: 'CPU_EXHAUSTION',
  CONNECTION_EXHAUSTION: 'CONNECTION_EXHAUSTION',
  STORAGE_EXHAUSTION: 'STORAGE_EXHAUSTION',
  HANDLE_EXHAUSTION: 'HANDLE_EXHAUSTION',
} as const;

export type ResourceAttackType = typeof ResourceAttackType[keyof typeof ResourceAttackType];

/**
 * Timing attack specifics
 */
export interface TimingAttack extends AttackVector {
  readonly category: typeof AttackCategory.TIMING;
  readonly subtype: TimingAttackType;
  readonly timingParameter: string;
  readonly exploitWindow: number; // ms
}

export const TimingAttackType = {
  RACE_CONDITION: 'RACE_CONDITION',
  TOCTOU: 'TOCTOU', // Time-of-check to time-of-use
  CLOCK_SKEW: 'CLOCK_SKEW',
  DEADLINE_BYPASS: 'DEADLINE_BYPASS',
  SLOW_LORIS: 'SLOW_LORIS',
} as const;

export type TimingAttackType = typeof TimingAttackType[keyof typeof TimingAttackType];

/**
 * Injection attack specifics
 */
export interface InjectionAttack extends AttackVector {
  readonly category: typeof AttackCategory.INJECTION;
  readonly subtype: InjectionAttackType;
  readonly payload: string;
  readonly injectionPoint: string;
}

export const InjectionAttackType = {
  JSON_INJECTION: 'JSON_INJECTION',
  COMMAND_INJECTION: 'COMMAND_INJECTION',
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  PROTOTYPE_POLLUTION: 'PROTOTYPE_POLLUTION',
  TEMPLATE_INJECTION: 'TEMPLATE_INJECTION',
} as const;

export type InjectionAttackType = typeof InjectionAttackType[keyof typeof InjectionAttackType];

/**
 * Corruption attack specifics
 */
export interface CorruptionAttack extends AttackVector {
  readonly category: typeof AttackCategory.CORRUPTION;
  readonly subtype: CorruptionAttackType;
  readonly corruptionPattern: string;
  readonly targetData: string;
}

export const CorruptionAttackType = {
  BIT_FLIP: 'BIT_FLIP',
  TRUNCATION: 'TRUNCATION',
  EXTENSION: 'EXTENSION',
  SUBSTITUTION: 'SUBSTITUTION',
  REORDERING: 'REORDERING',
} as const;

export type CorruptionAttackType = typeof CorruptionAttackType[keyof typeof CorruptionAttackType];

/**
 * Protocol attack specifics
 */
export interface ProtocolAttack extends AttackVector {
  readonly category: typeof AttackCategory.PROTOCOL;
  readonly subtype: ProtocolAttackType;
  readonly violatedRule: string;
  readonly protocolPhase: string;
}

export const ProtocolAttackType = {
  STATE_VIOLATION: 'STATE_VIOLATION',
  SEQUENCE_VIOLATION: 'SEQUENCE_VIOLATION',
  VERSION_MISMATCH: 'VERSION_MISMATCH',
  HEADER_MANIPULATION: 'HEADER_MANIPULATION',
  FRAGMENTATION: 'FRAGMENTATION',
} as const;

export type ProtocolAttackType = typeof ProtocolAttackType[keyof typeof ProtocolAttackType];

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const MutationType = {
  DELETE: 'DELETE',         // Remove field/data
  REPLACE: 'REPLACE',       // Replace with different value
  INJECT: 'INJECT',         // Add unexpected data
  TRUNCATE: 'TRUNCATE',     // Shorten data
  EXTEND: 'EXTEND',         // Lengthen data
  FLIP: 'FLIP',             // Flip bits
  SWAP: 'SWAP',             // Swap positions
  DUPLICATE: 'DUPLICATE',   // Create copies
} as const;

export type MutationType = typeof MutationType[keyof typeof MutationType];

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CASE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A concrete test case generated from an attack vector
 */
export interface AttackTestCase {
  /** Unique test case ID */
  readonly id: TestCaseId;
  /** Source attack vector */
  readonly attackId: AttackId;
  /** Input data for the test */
  readonly input: unknown;
  /** Expected outcome */
  readonly expectedOutcome: TestOutcome;
  /** Setup steps (if any) */
  readonly setup?: ReadonlyArray<string>;
  /** Teardown steps (if any) */
  readonly teardown?: ReadonlyArray<string>;
}

/**
 * Expected outcome of a test case
 */
export interface TestOutcome {
  /** Should the system reject this? */
  readonly shouldReject: boolean;
  /** Expected error code (if rejected) */
  readonly expectedErrorCode?: string;
  /** State should be unchanged after attack */
  readonly stateUnchanged: boolean;
  /** Invariants to verify */
  readonly invariantsToVerify: ReadonlyArray<string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNION TYPE FOR ALL ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════

export type AnyAttack = 
  | EnvelopeAttack 
  | ReplayAttack 
  | BypassAttack 
  | ResourceAttack
  | TimingAttack
  | InjectionAttack
  | CorruptionAttack
  | ProtocolAttack;

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an AttackId
 */
export function attackId(value: string): AttackId {
  if (!value || value.length === 0) {
    throw new Error('AttackId cannot be empty');
  }
  return value as AttackId;
}

/**
 * Create a TestCaseId
 */
export function testCaseId(value: string): TestCaseId {
  if (!value || value.length === 0) {
    throw new Error('TestCaseId cannot be empty');
  }
  return value as TestCaseId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export function isEnvelopeAttack(attack: AnyAttack): attack is EnvelopeAttack {
  return attack.category === AttackCategory.ENVELOPE;
}

export function isReplayAttack(attack: AnyAttack): attack is ReplayAttack {
  return attack.category === AttackCategory.REPLAY;
}

export function isBypassAttack(attack: AnyAttack): attack is BypassAttack {
  return attack.category === AttackCategory.BYPASS;
}

export function isResourceAttack(attack: AnyAttack): attack is ResourceAttack {
  return attack.category === AttackCategory.RESOURCE;
}

export function isTimingAttack(attack: AnyAttack): attack is TimingAttack {
  return attack.category === AttackCategory.TIMING;
}

export function isInjectionAttack(attack: AnyAttack): attack is InjectionAttack {
  return attack.category === AttackCategory.INJECTION;
}

export function isCorruptionAttack(attack: AnyAttack): attack is CorruptionAttack {
  return attack.category === AttackCategory.CORRUPTION;
}

export function isProtocolAttack(attack: AnyAttack): attack is ProtocolAttack {
  return attack.category === AttackCategory.PROTOCOL;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_CATEGORIES: ReadonlyArray<AttackCategory> = Object.values(AttackCategory);
export const ALL_SEVERITIES: ReadonlyArray<Severity> = Object.values(Severity);
export const ALL_RESPONSES: ReadonlyArray<ExpectedResponse> = Object.values(ExpectedResponse);
export const ALL_EXPLOITABILITIES: ReadonlyArray<Exploitability> = Object.values(Exploitability);

/** Severity ordering for comparison */
export const SEVERITY_ORDER: Record<Severity, number> = {
  [Severity.LOW]: 1,
  [Severity.MEDIUM]: 2,
  [Severity.HIGH]: 3,
  [Severity.CRITICAL]: 4,
};

/** Exploitability ordering for comparison */
export const EXPLOITABILITY_ORDER: Record<Exploitability, number> = {
  [Exploitability.THEORETICAL]: 1,
  [Exploitability.DIFFICULT]: 2,
  [Exploitability.MODERATE]: 3,
  [Exploitability.TRIVIAL]: 4,
};
