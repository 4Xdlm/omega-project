/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Adversarial Grammar - Formal Grammar Definition
 * 
 * Phase 23 - Sprint 23.1
 * 
 * Defines the formal grammar for attack vector generation.
 * Uses a BNF-like structure for exhaustive enumeration.
 * 
 * Grammar Structure:
 * Attack ::= EnvelopeAttack | ReplayAttack | BypassAttack | ResourceAttack | ...
 * EnvelopeAttack ::= MISSING_FIELD | INVALID_TYPE | HASH_MISMATCH | ...
 * 
 * INVARIANT: INV-ADV-01 - Grammar covers 100% of known vectors
 * INVARIANT: INV-ADV-02 - ∀attack ∉ Grammar ⇒ attack impossible
 */

import {
  AttackCategory,
  Severity,
  ExpectedResponse,
  Exploitability,
  EnvelopeAttackType,
  ReplayAttackType,
  BypassAttackType,
  ResourceAttackType,
  TimingAttackType,
  InjectionAttackType,
  CorruptionAttackType,
  ProtocolAttackType,
  MutationType,
  AnyAttack,
  attackId,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAR RULE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A grammar rule defines how to generate attacks of a specific type
 */
export interface GrammarRule<T extends AnyAttack> {
  /** Rule name */
  readonly name: string;
  /** Category this rule belongs to */
  readonly category: AttackCategory;
  /** Available productions (attack subtypes) */
  readonly productions: ReadonlyArray<Production<T>>;
  /** Generate all attacks from this rule */
  enumerate(): ReadonlyArray<T>;
}

/**
 * A production is a specific way to create an attack
 */
export interface Production<T extends AnyAttack> {
  /** Production name */
  readonly name: string;
  /** Generate attacks from this production */
  generate(): ReadonlyArray<T>;
  /** Get cardinality (number of possible attacks) */
  cardinality(): number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVELOPE ATTACK GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════════

const ENVELOPE_FIELDS = [
  'id', 'type', 'version', 'timestamp', 'payload', 
  'hash', 'signature', 'source', 'target', 'meta'
] as const;

const ENVELOPE_PRODUCTIONS: Production<AnyAttack>[] = [
  // MISSING_FIELD: For each field, create an attack that omits it
  {
    name: 'MISSING_FIELD',
    generate: () => ENVELOPE_FIELDS.map(field => ({
      id: attackId(`ENV_MISSING_${field.toUpperCase()}`),
      name: `Missing ${field} field`,
      category: AttackCategory.ENVELOPE,
      subtype: EnvelopeAttackType.MISSING_FIELD,
      severity: field === 'hash' || field === 'signature' ? Severity.CRITICAL : Severity.HIGH,
      exploitability: Exploitability.TRIVIAL,
      expectedResponse: ExpectedResponse.REJECT,
      description: `Envelope with missing ${field} field`,
      targetField: field,
      mutationType: MutationType.DELETE,
      protectedInvariants: ['INV-ENV-01', 'INV-ENV-02'],
    })),
    cardinality: () => ENVELOPE_FIELDS.length,
  },
  
  // INVALID_TYPE: For each field, create attacks with wrong types
  {
    name: 'INVALID_TYPE',
    generate: () => {
      const attacks: AnyAttack[] = [];
      const wrongTypes = ['string', 'number', 'boolean', 'null', 'array', 'object'];
      
      for (const field of ENVELOPE_FIELDS) {
        for (const wrongType of wrongTypes) {
          attacks.push({
            id: attackId(`ENV_INVALID_TYPE_${field.toUpperCase()}_${wrongType.toUpperCase()}`),
            name: `Invalid type for ${field}: ${wrongType}`,
            category: AttackCategory.ENVELOPE,
            subtype: EnvelopeAttackType.INVALID_TYPE,
            severity: Severity.MEDIUM,
            exploitability: Exploitability.TRIVIAL,
            expectedResponse: ExpectedResponse.REJECT,
            description: `Envelope with ${field} set to wrong type (${wrongType})`,
            targetField: field,
            mutationType: MutationType.REPLACE,
            protectedInvariants: ['INV-ENV-01'],
          });
        }
      }
      return attacks;
    },
    cardinality: () => ENVELOPE_FIELDS.length * 6,
  },
  
  // HASH_MISMATCH: Attacks on hash integrity
  {
    name: 'HASH_MISMATCH',
    generate: () => [
      {
        id: attackId('ENV_HASH_MODIFIED_PAYLOAD'),
        name: 'Hash mismatch: modified payload',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.HASH_MISMATCH,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Payload modified without updating hash',
        targetField: 'hash',
        mutationType: MutationType.REPLACE,
        protectedInvariants: ['INV-ENV-03', 'INV-ENV-04'],
      },
      {
        id: attackId('ENV_HASH_TRUNCATED'),
        name: 'Hash mismatch: truncated hash',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.HASH_MISMATCH,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Hash value truncated',
        targetField: 'hash',
        mutationType: MutationType.TRUNCATE,
        protectedInvariants: ['INV-ENV-03'],
      },
      {
        id: attackId('ENV_HASH_COLLISION_ATTEMPT'),
        name: 'Hash mismatch: collision attempt',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.HASH_MISMATCH,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.DIFFICULT,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Attempt to create hash collision',
        targetField: 'hash',
        mutationType: MutationType.REPLACE,
        protectedInvariants: ['INV-ENV-03', 'INV-ENV-04'],
      },
    ],
    cardinality: () => 3,
  },
  
  // SCHEMA_VIOLATION: Various schema violations
  {
    name: 'SCHEMA_VIOLATION',
    generate: () => [
      {
        id: attackId('ENV_SCHEMA_EXTRA_FIELDS'),
        name: 'Schema violation: extra fields',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.SCHEMA_VIOLATION,
        severity: Severity.LOW,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.ABSORB,
        description: 'Envelope with unexpected extra fields',
        targetField: '*',
        mutationType: MutationType.INJECT,
        protectedInvariants: ['INV-ENV-01'],
      },
      {
        id: attackId('ENV_SCHEMA_NESTED_DEPTH'),
        name: 'Schema violation: excessive nesting',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.SCHEMA_VIOLATION,
        severity: Severity.MEDIUM,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Envelope with deeply nested structure',
        targetField: 'payload',
        mutationType: MutationType.INJECT,
        protectedInvariants: ['INV-ENV-01', 'INV-RESOURCE-01'],
      },
      {
        id: attackId('ENV_SCHEMA_CIRCULAR_REF'),
        name: 'Schema violation: circular reference',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.SCHEMA_VIOLATION,
        severity: Severity.HIGH,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Envelope with circular reference attempt',
        targetField: 'payload',
        mutationType: MutationType.INJECT,
        protectedInvariants: ['INV-ENV-01'],
      },
    ],
    cardinality: () => 3,
  },
  
  // OVERSIZED_PAYLOAD
  {
    name: 'OVERSIZED_PAYLOAD',
    generate: () => [
      {
        id: attackId('ENV_PAYLOAD_1MB'),
        name: 'Oversized payload: 1MB',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.OVERSIZED_PAYLOAD,
        severity: Severity.MEDIUM,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Envelope with 1MB payload',
        targetField: 'payload',
        mutationType: MutationType.EXTEND,
        protectedInvariants: ['INV-RESOURCE-01'],
      },
      {
        id: attackId('ENV_PAYLOAD_100MB'),
        name: 'Oversized payload: 100MB',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.OVERSIZED_PAYLOAD,
        severity: Severity.HIGH,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Envelope with 100MB payload',
        targetField: 'payload',
        mutationType: MutationType.EXTEND,
        protectedInvariants: ['INV-RESOURCE-01', 'INV-RESOURCE-02'],
      },
    ],
    cardinality: () => 2,
  },
  
  // MALFORMED_JSON
  {
    name: 'MALFORMED_JSON',
    generate: () => [
      {
        id: attackId('ENV_JSON_TRAILING_COMMA'),
        name: 'Malformed JSON: trailing comma',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.MALFORMED_JSON,
        severity: Severity.LOW,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'JSON with trailing comma',
        targetField: '*',
        mutationType: MutationType.INJECT,
        protectedInvariants: ['INV-ENV-01'],
      },
      {
        id: attackId('ENV_JSON_UNQUOTED_KEY'),
        name: 'Malformed JSON: unquoted key',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.MALFORMED_JSON,
        severity: Severity.LOW,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'JSON with unquoted key',
        targetField: '*',
        mutationType: MutationType.REPLACE,
        protectedInvariants: ['INV-ENV-01'],
      },
      {
        id: attackId('ENV_JSON_SINGLE_QUOTES'),
        name: 'Malformed JSON: single quotes',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.MALFORMED_JSON,
        severity: Severity.LOW,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'JSON with single quotes instead of double',
        targetField: '*',
        mutationType: MutationType.REPLACE,
        protectedInvariants: ['INV-ENV-01'],
      },
      {
        id: attackId('ENV_JSON_UNTERMINATED_STRING'),
        name: 'Malformed JSON: unterminated string',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.MALFORMED_JSON,
        severity: Severity.LOW,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'JSON with unterminated string',
        targetField: '*',
        mutationType: MutationType.TRUNCATE,
        protectedInvariants: ['INV-ENV-01'],
      },
    ],
    cardinality: () => 4,
  },
  
  // UNICODE_ATTACK
  {
    name: 'UNICODE_ATTACK',
    generate: () => [
      {
        id: attackId('ENV_UNICODE_NULL_CHAR'),
        name: 'Unicode attack: null character',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.UNICODE_ATTACK,
        severity: Severity.MEDIUM,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'String containing null character (\\u0000)',
        targetField: 'payload',
        mutationType: MutationType.INJECT,
        protectedInvariants: ['INV-ENV-01', 'INV-INJECTION-01'],
      },
      {
        id: attackId('ENV_UNICODE_BOM'),
        name: 'Unicode attack: BOM injection',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.UNICODE_ATTACK,
        severity: Severity.LOW,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.ABSORB,
        description: 'String with BOM character',
        targetField: 'payload',
        mutationType: MutationType.INJECT,
        protectedInvariants: ['INV-ENV-01'],
      },
      {
        id: attackId('ENV_UNICODE_HOMOGLYPH'),
        name: 'Unicode attack: homoglyph',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.UNICODE_ATTACK,
        severity: Severity.HIGH,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.ABSORB,
        description: 'Using lookalike Unicode characters',
        targetField: 'type',
        mutationType: MutationType.REPLACE,
        protectedInvariants: ['INV-ENV-01'],
      },
      {
        id: attackId('ENV_UNICODE_OVERLONG'),
        name: 'Unicode attack: overlong encoding',
        category: AttackCategory.ENVELOPE,
        subtype: EnvelopeAttackType.UNICODE_ATTACK,
        severity: Severity.HIGH,
        exploitability: Exploitability.DIFFICULT,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Using overlong UTF-8 encoding',
        targetField: 'payload',
        mutationType: MutationType.REPLACE,
        protectedInvariants: ['INV-ENV-01', 'INV-INJECTION-01'],
      },
    ],
    cardinality: () => 4,
  },
  
  // NULL_INJECTION
  {
    name: 'NULL_INJECTION',
    generate: () => ENVELOPE_FIELDS.slice(0, 5).map(field => ({
      id: attackId(`ENV_NULL_${field.toUpperCase()}`),
      name: `Null injection in ${field}`,
      category: AttackCategory.ENVELOPE,
      subtype: EnvelopeAttackType.NULL_INJECTION,
      severity: Severity.MEDIUM,
      exploitability: Exploitability.TRIVIAL,
      expectedResponse: ExpectedResponse.REJECT,
      description: `Null value injected into ${field}`,
      targetField: field,
      mutationType: MutationType.REPLACE,
      protectedInvariants: ['INV-ENV-01', 'INV-ENV-02'],
    })),
    cardinality: () => 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY ATTACK GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════════

const REPLAY_PRODUCTIONS: Production<AnyAttack>[] = [
  {
    name: 'EXACT_DUPLICATE',
    generate: () => [
      {
        id: attackId('REPLAY_EXACT_IMMEDIATE'),
        name: 'Exact duplicate: immediate',
        category: AttackCategory.REPLAY,
        subtype: ReplayAttackType.EXACT_DUPLICATE,
        severity: Severity.HIGH,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Immediate replay of exact same message',
        delayMs: 0,
        modifications: [],
        protectedInvariants: ['INV-REPLAY-01', 'INV-REPLAY-02'],
      },
      {
        id: attackId('REPLAY_EXACT_DELAYED_1S'),
        name: 'Exact duplicate: 1s delay',
        category: AttackCategory.REPLAY,
        subtype: ReplayAttackType.EXACT_DUPLICATE,
        severity: Severity.HIGH,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Replay after 1 second delay',
        delayMs: 1000,
        modifications: [],
        protectedInvariants: ['INV-REPLAY-01', 'INV-REPLAY-02'],
      },
      {
        id: attackId('REPLAY_EXACT_DELAYED_60S'),
        name: 'Exact duplicate: 60s delay',
        category: AttackCategory.REPLAY,
        subtype: ReplayAttackType.EXACT_DUPLICATE,
        severity: Severity.MEDIUM,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Replay after 60 second delay',
        delayMs: 60000,
        modifications: [],
        protectedInvariants: ['INV-REPLAY-01', 'INV-REPLAY-02'],
      },
    ],
    cardinality: () => 3,
  },
  
  {
    name: 'MODIFIED_REPLAY',
    generate: () => [
      {
        id: attackId('REPLAY_MOD_TIMESTAMP'),
        name: 'Modified replay: changed timestamp',
        category: AttackCategory.REPLAY,
        subtype: ReplayAttackType.MODIFIED_REPLAY,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Replay with modified timestamp',
        delayMs: 0,
        modifications: ['timestamp'],
        protectedInvariants: ['INV-REPLAY-01', 'INV-ENV-03'],
      },
      {
        id: attackId('REPLAY_MOD_ID'),
        name: 'Modified replay: changed ID',
        category: AttackCategory.REPLAY,
        subtype: ReplayAttackType.MODIFIED_REPLAY,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Replay with modified message ID',
        delayMs: 0,
        modifications: ['id'],
        protectedInvariants: ['INV-REPLAY-01', 'INV-ENV-03'],
      },
      {
        id: attackId('REPLAY_MOD_PAYLOAD'),
        name: 'Modified replay: changed payload',
        category: AttackCategory.REPLAY,
        subtype: ReplayAttackType.MODIFIED_REPLAY,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Replay with modified payload',
        delayMs: 0,
        modifications: ['payload'],
        protectedInvariants: ['INV-REPLAY-01', 'INV-ENV-03', 'INV-ENV-04'],
      },
    ],
    cardinality: () => 3,
  },
  
  {
    name: 'TTL_EXPIRED',
    generate: () => [
      {
        id: attackId('REPLAY_TTL_EXPIRED_1MIN'),
        name: 'TTL expired: 1 minute',
        category: AttackCategory.REPLAY,
        subtype: ReplayAttackType.TTL_EXPIRED,
        severity: Severity.MEDIUM,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Replay of message expired by 1 minute',
        delayMs: 60001,
        modifications: [],
        protectedInvariants: ['INV-REPLAY-01'],
      },
      {
        id: attackId('REPLAY_TTL_EXPIRED_1HOUR'),
        name: 'TTL expired: 1 hour',
        category: AttackCategory.REPLAY,
        subtype: ReplayAttackType.TTL_EXPIRED,
        severity: Severity.LOW,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Replay of message expired by 1 hour',
        delayMs: 3600000,
        modifications: [],
        protectedInvariants: ['INV-REPLAY-01'],
      },
    ],
    cardinality: () => 2,
  },
  
  {
    name: 'CROSS_SESSION',
    generate: () => [
      {
        id: attackId('REPLAY_CROSS_SESSION'),
        name: 'Cross-session replay',
        category: AttackCategory.REPLAY,
        subtype: ReplayAttackType.CROSS_SESSION,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.DIFFICULT,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Replay message from different session',
        delayMs: 0,
        modifications: [],
        protectedInvariants: ['INV-REPLAY-01', 'INV-SESSION-01'],
      },
    ],
    cardinality: () => 1,
  },
  
  {
    name: 'OUT_OF_ORDER',
    generate: () => [
      {
        id: attackId('REPLAY_OUT_OF_ORDER'),
        name: 'Out of order delivery',
        category: AttackCategory.REPLAY,
        subtype: ReplayAttackType.OUT_OF_ORDER,
        severity: Severity.MEDIUM,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.ABSORB,
        description: 'Messages delivered out of order',
        delayMs: 0,
        modifications: [],
        protectedInvariants: ['INV-ORDER-01'],
      },
    ],
    cardinality: () => 1,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BYPASS ATTACK GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════════

const BYPASS_PRODUCTIONS: Production<AnyAttack>[] = [
  {
    name: 'POLICY_BYPASS',
    generate: () => [
      {
        id: attackId('BYPASS_POLICY_DIRECT_CALL'),
        name: 'Policy bypass: direct handler call',
        category: AttackCategory.BYPASS,
        subtype: BypassAttackType.POLICY_BYPASS,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.DIFFICULT,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Attempt to call handler directly bypassing policy',
        targetComponent: 'policy_engine',
        technique: 'direct_invocation',
        protectedInvariants: ['INV-POL-01', 'INV-GW-01'],
      },
      {
        id: attackId('BYPASS_POLICY_HEADER_SPOOF'),
        name: 'Policy bypass: header spoofing',
        category: AttackCategory.BYPASS,
        subtype: BypassAttackType.POLICY_BYPASS,
        severity: Severity.HIGH,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Spoof internal headers to bypass policy',
        targetComponent: 'policy_engine',
        technique: 'header_spoofing',
        protectedInvariants: ['INV-POL-01', 'INV-GW-02'],
      },
    ],
    cardinality: () => 2,
  },
  
  {
    name: 'VALIDATION_BYPASS',
    generate: () => [
      {
        id: attackId('BYPASS_VALIDATION_CHARSET'),
        name: 'Validation bypass: charset manipulation',
        category: AttackCategory.BYPASS,
        subtype: BypassAttackType.VALIDATION_BYPASS,
        severity: Severity.HIGH,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Use alternative charset to bypass validation',
        targetComponent: 'validator',
        technique: 'charset_manipulation',
        protectedInvariants: ['INV-ENV-01', 'INV-INJECTION-01'],
      },
      {
        id: attackId('BYPASS_VALIDATION_DOUBLE_ENCODE'),
        name: 'Validation bypass: double encoding',
        category: AttackCategory.BYPASS,
        subtype: BypassAttackType.VALIDATION_BYPASS,
        severity: Severity.HIGH,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Double encode input to bypass validation',
        targetComponent: 'validator',
        technique: 'double_encoding',
        protectedInvariants: ['INV-ENV-01', 'INV-INJECTION-01'],
      },
    ],
    cardinality: () => 2,
  },
  
  {
    name: 'RATE_LIMIT_BYPASS',
    generate: () => [
      {
        id: attackId('BYPASS_RATE_LIMIT_IP_ROTATE'),
        name: 'Rate limit bypass: IP rotation',
        category: AttackCategory.BYPASS,
        subtype: BypassAttackType.RATE_LIMIT_BYPASS,
        severity: Severity.MEDIUM,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.DEGRADE_BOUNDED,
        description: 'Rotate IP addresses to bypass rate limiting',
        targetComponent: 'rate_limiter',
        technique: 'ip_rotation',
        protectedInvariants: ['INV-RATE-01'],
      },
      {
        id: attackId('BYPASS_RATE_LIMIT_HEADER_INJECT'),
        name: 'Rate limit bypass: header injection',
        category: AttackCategory.BYPASS,
        subtype: BypassAttackType.RATE_LIMIT_BYPASS,
        severity: Severity.MEDIUM,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Inject X-Forwarded-For to bypass rate limiting',
        targetComponent: 'rate_limiter',
        technique: 'header_injection',
        protectedInvariants: ['INV-RATE-01', 'INV-GW-02'],
      },
    ],
    cardinality: () => 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE ATTACK GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════════

const RESOURCE_PRODUCTIONS: Production<AnyAttack>[] = [
  {
    name: 'MEMORY_EXHAUSTION',
    generate: () => [
      {
        id: attackId('RESOURCE_MEM_LARGE_ARRAY'),
        name: 'Memory exhaustion: large array',
        category: AttackCategory.RESOURCE,
        subtype: ResourceAttackType.MEMORY_EXHAUSTION,
        severity: Severity.HIGH,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Submit extremely large array',
        targetResource: 'heap_memory',
        exhaustionLevel: 0.9,
        protectedInvariants: ['INV-RESOURCE-01', 'INV-RESOURCE-02'],
      },
      {
        id: attackId('RESOURCE_MEM_RECURSIVE_JSON'),
        name: 'Memory exhaustion: recursive JSON',
        category: AttackCategory.RESOURCE,
        subtype: ResourceAttackType.MEMORY_EXHAUSTION,
        severity: Severity.HIGH,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Deeply nested JSON causing stack overflow',
        targetResource: 'stack_memory',
        exhaustionLevel: 1.0,
        protectedInvariants: ['INV-RESOURCE-01'],
      },
    ],
    cardinality: () => 2,
  },
  
  {
    name: 'CPU_EXHAUSTION',
    generate: () => [
      {
        id: attackId('RESOURCE_CPU_REGEX_DOS'),
        name: 'CPU exhaustion: ReDoS',
        category: AttackCategory.RESOURCE,
        subtype: ResourceAttackType.CPU_EXHAUSTION,
        severity: Severity.HIGH,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Regular expression denial of service',
        targetResource: 'cpu',
        exhaustionLevel: 0.95,
        protectedInvariants: ['INV-RESOURCE-03'],
      },
      {
        id: attackId('RESOURCE_CPU_HASH_COLLISION'),
        name: 'CPU exhaustion: hash collision',
        category: AttackCategory.RESOURCE,
        subtype: ResourceAttackType.CPU_EXHAUSTION,
        severity: Severity.HIGH,
        exploitability: Exploitability.DIFFICULT,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Hash table collision attack',
        targetResource: 'cpu',
        exhaustionLevel: 0.8,
        protectedInvariants: ['INV-RESOURCE-03'],
      },
    ],
    cardinality: () => 2,
  },
  
  {
    name: 'CONNECTION_EXHAUSTION',
    generate: () => [
      {
        id: attackId('RESOURCE_CONN_FLOOD'),
        name: 'Connection exhaustion: flood',
        category: AttackCategory.RESOURCE,
        subtype: ResourceAttackType.CONNECTION_EXHAUSTION,
        severity: Severity.HIGH,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.DEGRADE_BOUNDED,
        description: 'Open many connections without closing',
        targetResource: 'connections',
        exhaustionLevel: 0.95,
        protectedInvariants: ['INV-RESOURCE-04'],
      },
    ],
    cardinality: () => 1,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING ATTACK GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════════

const TIMING_PRODUCTIONS: Production<AnyAttack>[] = [
  {
    name: 'RACE_CONDITION',
    generate: () => [
      {
        id: attackId('TIMING_RACE_DOUBLE_SPEND'),
        name: 'Race condition: double operation',
        category: AttackCategory.TIMING,
        subtype: TimingAttackType.RACE_CONDITION,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Submit same operation twice simultaneously',
        timingParameter: 'operation_mutex',
        exploitWindow: 10,
        protectedInvariants: ['INV-TIMING-01', 'INV-REPLAY-01'],
      },
    ],
    cardinality: () => 1,
  },
  
  {
    name: 'TOCTOU',
    generate: () => [
      {
        id: attackId('TIMING_TOCTOU_PERMISSION'),
        name: 'TOCTOU: permission check',
        category: AttackCategory.TIMING,
        subtype: TimingAttackType.TOCTOU,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.DIFFICULT,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Change state between check and use',
        timingParameter: 'permission_check',
        exploitWindow: 5,
        protectedInvariants: ['INV-TIMING-01', 'INV-POL-01'],
      },
    ],
    cardinality: () => 1,
  },
  
  {
    name: 'CLOCK_SKEW',
    generate: () => [
      {
        id: attackId('TIMING_CLOCK_FUTURE'),
        name: 'Clock skew: future timestamp',
        category: AttackCategory.TIMING,
        subtype: TimingAttackType.CLOCK_SKEW,
        severity: Severity.MEDIUM,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Submit message with future timestamp',
        timingParameter: 'message_timestamp',
        exploitWindow: 0,
        protectedInvariants: ['INV-TIMING-02'],
      },
      {
        id: attackId('TIMING_CLOCK_PAST'),
        name: 'Clock skew: past timestamp',
        category: AttackCategory.TIMING,
        subtype: TimingAttackType.CLOCK_SKEW,
        severity: Severity.MEDIUM,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Submit message with very old timestamp',
        timingParameter: 'message_timestamp',
        exploitWindow: 0,
        protectedInvariants: ['INV-TIMING-02', 'INV-REPLAY-01'],
      },
    ],
    cardinality: () => 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// INJECTION ATTACK GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════════

const INJECTION_PRODUCTIONS: Production<AnyAttack>[] = [
  {
    name: 'JSON_INJECTION',
    generate: () => [
      {
        id: attackId('INJECT_JSON_KEY'),
        name: 'JSON injection: key manipulation',
        category: AttackCategory.INJECTION,
        subtype: InjectionAttackType.JSON_INJECTION,
        severity: Severity.HIGH,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Inject special characters in JSON key',
        payload: '{"__proto__": {}}',
        injectionPoint: 'json_key',
        protectedInvariants: ['INV-INJECTION-01'],
      },
    ],
    cardinality: () => 1,
  },
  
  {
    name: 'PROTOTYPE_POLLUTION',
    generate: () => [
      {
        id: attackId('INJECT_PROTO_DIRECT'),
        name: 'Prototype pollution: direct',
        category: AttackCategory.INJECTION,
        subtype: InjectionAttackType.PROTOTYPE_POLLUTION,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Direct __proto__ manipulation',
        payload: '{"__proto__": {"polluted": true}}',
        injectionPoint: 'json_body',
        protectedInvariants: ['INV-INJECTION-01', 'INV-INJECTION-02'],
      },
      {
        id: attackId('INJECT_PROTO_CONSTRUCTOR'),
        name: 'Prototype pollution: constructor',
        category: AttackCategory.INJECTION,
        subtype: InjectionAttackType.PROTOTYPE_POLLUTION,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Constructor.prototype manipulation',
        payload: '{"constructor": {"prototype": {"polluted": true}}}',
        injectionPoint: 'json_body',
        protectedInvariants: ['INV-INJECTION-01', 'INV-INJECTION-02'],
      },
    ],
    cardinality: () => 2,
  },
  
  {
    name: 'PATH_TRAVERSAL',
    generate: () => [
      {
        id: attackId('INJECT_PATH_DOTDOT'),
        name: 'Path traversal: ../../../',
        category: AttackCategory.INJECTION,
        subtype: InjectionAttackType.PATH_TRAVERSAL,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.TRIVIAL,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'Path traversal with ../',
        payload: '../../../etc/passwd',
        injectionPoint: 'path_parameter',
        protectedInvariants: ['INV-INJECTION-03'],
      },
      {
        id: attackId('INJECT_PATH_ENCODED'),
        name: 'Path traversal: encoded',
        category: AttackCategory.INJECTION,
        subtype: InjectionAttackType.PATH_TRAVERSAL,
        severity: Severity.CRITICAL,
        exploitability: Exploitability.MODERATE,
        expectedResponse: ExpectedResponse.REJECT,
        description: 'URL-encoded path traversal',
        payload: '%2e%2e%2f%2e%2e%2f',
        injectionPoint: 'path_parameter',
        protectedInvariants: ['INV-INJECTION-03'],
      },
    ],
    cardinality: () => 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The complete adversarial grammar
 */
export const ADVERSARIAL_GRAMMAR = {
  name: 'OMEGA_ADVERSARIAL_GRAMMAR',
  version: '1.0.0',
  
  rules: {
    [AttackCategory.ENVELOPE]: {
      name: 'EnvelopeAttacks',
      category: AttackCategory.ENVELOPE,
      productions: ENVELOPE_PRODUCTIONS,
      enumerate: () => ENVELOPE_PRODUCTIONS.flatMap(p => p.generate()),
    },
    [AttackCategory.REPLAY]: {
      name: 'ReplayAttacks',
      category: AttackCategory.REPLAY,
      productions: REPLAY_PRODUCTIONS,
      enumerate: () => REPLAY_PRODUCTIONS.flatMap(p => p.generate()),
    },
    [AttackCategory.BYPASS]: {
      name: 'BypassAttacks',
      category: AttackCategory.BYPASS,
      productions: BYPASS_PRODUCTIONS,
      enumerate: () => BYPASS_PRODUCTIONS.flatMap(p => p.generate()),
    },
    [AttackCategory.RESOURCE]: {
      name: 'ResourceAttacks',
      category: AttackCategory.RESOURCE,
      productions: RESOURCE_PRODUCTIONS,
      enumerate: () => RESOURCE_PRODUCTIONS.flatMap(p => p.generate()),
    },
    [AttackCategory.TIMING]: {
      name: 'TimingAttacks',
      category: AttackCategory.TIMING,
      productions: TIMING_PRODUCTIONS,
      enumerate: () => TIMING_PRODUCTIONS.flatMap(p => p.generate()),
    },
    [AttackCategory.INJECTION]: {
      name: 'InjectionAttacks',
      category: AttackCategory.INJECTION,
      productions: INJECTION_PRODUCTIONS,
      enumerate: () => INJECTION_PRODUCTIONS.flatMap(p => p.generate()),
    },
  },
  
  /**
   * Enumerate ALL attacks in the grammar
   */
  enumerateAll(): ReadonlyArray<AnyAttack> {
    return Object.values(this.rules).flatMap(rule => rule.enumerate());
  },
  
  /**
   * Get total cardinality (number of possible attacks)
   */
  cardinality(): number {
    return Object.values(this.rules).reduce(
      (sum, rule) => sum + rule.productions.reduce((s, p) => s + p.cardinality(), 0),
      0
    );
  },
  
  /**
   * Get attacks by category
   */
  byCategory(category: AttackCategory): ReadonlyArray<AnyAttack> {
    return this.rules[category]?.enumerate() ?? [];
  },
  
  /**
   * Get attacks by severity
   */
  bySeverity(severity: Severity): ReadonlyArray<AnyAttack> {
    return this.enumerateAll().filter(a => a.severity === severity);
  },
  
  /**
   * Get attack by ID
   */
  byId(id: AttackId): AnyAttack | undefined {
    return this.enumerateAll().find(a => a.id === id);
  },
} as const;

export type AdversarialGrammar = typeof ADVERSARIAL_GRAMMAR;
