/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Adversarial Grammar - Test Case Generator
 * 
 * Phase 23 - Sprint 23.1
 * 
 * Generates concrete test cases from the adversarial grammar.
 * Each test case is executable and verifiable.
 * 
 * INVARIANT: INV-ADV-03 - ∀attack ∈ Grammar, system(attack) ∈ {REJECT, ABSORB}
 */

import {
  AnyAttack,
  AttackCategory,
  Severity,
  ExpectedResponse,
  AttackTestCase,
  TestOutcome,
  attackId,
  testCaseId,
  AttackId,
  TestCaseId,
  isEnvelopeAttack,
  isReplayAttack,
  isBypassAttack,
  isResourceAttack,
  isTimingAttack,
  isInjectionAttack,
  EnvelopeAttackType,
  MutationType,
} from './types.js';
import { ADVERSARIAL_GRAMMAR } from './grammar.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CASE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate test cases from an attack vector
 */
export function generateTestCases(attack: AnyAttack): AttackTestCase[] {
  const cases: AttackTestCase[] = [];
  
  // Generate primary test case
  cases.push(generatePrimaryTestCase(attack));
  
  // Generate boundary test cases
  cases.push(...generateBoundaryTestCases(attack));
  
  return cases;
}

/**
 * Generate the primary test case for an attack
 */
function generatePrimaryTestCase(attack: AnyAttack): AttackTestCase {
  return {
    id: testCaseId(`TC_${attack.id}_PRIMARY`),
    attackId: attack.id,
    input: generateAttackInput(attack),
    expectedOutcome: {
      shouldReject: attack.expectedResponse === ExpectedResponse.REJECT,
      expectedErrorCode: getExpectedErrorCode(attack),
      stateUnchanged: attack.expectedResponse === ExpectedResponse.REJECT,
      invariantsToVerify: [...attack.protectedInvariants],
    },
    setup: getSetupSteps(attack),
    teardown: getTeardownSteps(attack),
  };
}

/**
 * Generate boundary test cases
 */
function generateBoundaryTestCases(attack: AnyAttack): AttackTestCase[] {
  const cases: AttackTestCase[] = [];
  
  // Add just-below-threshold case
  if (isResourceAttack(attack)) {
    cases.push({
      id: testCaseId(`TC_${attack.id}_BOUNDARY_LOW`),
      attackId: attack.id,
      input: { ...generateAttackInput(attack), exhaustionLevel: attack.exhaustionLevel * 0.5 },
      expectedOutcome: {
        shouldReject: false,
        stateUnchanged: false,
        invariantsToVerify: attack.protectedInvariants.slice(),
      },
    });
  }
  
  return cases;
}

/**
 * Generate the concrete input for an attack
 */
function generateAttackInput(attack: AnyAttack): unknown {
  if (isEnvelopeAttack(attack)) {
    return generateEnvelopeAttackInput(attack);
  }
  if (isReplayAttack(attack)) {
    return generateReplayAttackInput(attack);
  }
  if (isBypassAttack(attack)) {
    return generateBypassAttackInput(attack);
  }
  if (isResourceAttack(attack)) {
    return generateResourceAttackInput(attack);
  }
  if (isTimingAttack(attack)) {
    return generateTimingAttackInput(attack);
  }
  if (isInjectionAttack(attack)) {
    return generateInjectionAttackInput(attack);
  }
  
  // Generic fallback
  return {
    attackId: attack.id,
    category: attack.category,
    data: {},
  };
}

/**
 * Generate envelope attack input
 */
function generateEnvelopeAttackInput(attack: AnyAttack & { category: 'ENVELOPE' }): unknown {
  const baseEnvelope = {
    id: 'test-envelope-001',
    type: 'test.message',
    version: '1.0.0',
    timestamp: Date.now(),
    payload: { data: 'test' },
    hash: 'valid-hash-placeholder',
    source: 'test-source',
    target: 'test-target',
    meta: {},
  };
  
  const typedAttack = attack as { subtype: string; targetField: string; mutationType: string };
  
  switch (typedAttack.subtype) {
    case EnvelopeAttackType.MISSING_FIELD: {
      const modified = { ...baseEnvelope };
      delete (modified as Record<string, unknown>)[typedAttack.targetField];
      return modified;
    }
    
    case EnvelopeAttackType.INVALID_TYPE: {
      return {
        ...baseEnvelope,
        [typedAttack.targetField]: generateWrongTypeValue(typedAttack.targetField),
      };
    }
    
    case EnvelopeAttackType.HASH_MISMATCH: {
      return {
        ...baseEnvelope,
        payload: { data: 'modified' },
        // hash remains unchanged, creating mismatch
      };
    }
    
    case EnvelopeAttackType.SCHEMA_VIOLATION: {
      if (attack.id.includes('EXTRA')) {
        return { ...baseEnvelope, unexpectedField: 'malicious' };
      }
      if (attack.id.includes('NESTED')) {
        return { ...baseEnvelope, payload: createDeeplyNested(100) };
      }
      return baseEnvelope;
    }
    
    case EnvelopeAttackType.OVERSIZED_PAYLOAD: {
      const size = attack.id.includes('100MB') ? 100_000_000 : 1_000_000;
      return {
        ...baseEnvelope,
        payload: { data: 'x'.repeat(size) },
      };
    }
    
    case EnvelopeAttackType.MALFORMED_JSON: {
      // Return a string that represents malformed JSON
      if (attack.id.includes('TRAILING')) return '{"id": "test",}';
      if (attack.id.includes('UNQUOTED')) return '{id: "test"}';
      if (attack.id.includes('SINGLE')) return "{'id': 'test'}";
      return '{"id": "test';
    }
    
    case EnvelopeAttackType.UNICODE_ATTACK: {
      if (attack.id.includes('NULL')) {
        return { ...baseEnvelope, payload: { data: 'test\u0000data' } };
      }
      if (attack.id.includes('BOM')) {
        return { ...baseEnvelope, payload: { data: '\uFEFFtest' } };
      }
      if (attack.id.includes('HOMOGLYPH')) {
        return { ...baseEnvelope, type: 'tеst.message' }; // Cyrillic 'е'
      }
      return baseEnvelope;
    }
    
    case EnvelopeAttackType.NULL_INJECTION: {
      return {
        ...baseEnvelope,
        [typedAttack.targetField]: null,
      };
    }
    
    default:
      return baseEnvelope;
  }
}

/**
 * Generate replay attack input
 */
function generateReplayAttackInput(attack: AnyAttack & { category: 'REPLAY' }): unknown {
  const typedAttack = attack as { delayMs: number; modifications: readonly string[] };
  
  return {
    originalMessage: {
      id: 'original-message-001',
      type: 'test.operation',
      timestamp: Date.now() - typedAttack.delayMs,
      payload: { action: 'test' },
      hash: 'original-hash',
    },
    replayDelay: typedAttack.delayMs,
    modifications: typedAttack.modifications,
  };
}

/**
 * Generate bypass attack input
 */
function generateBypassAttackInput(attack: AnyAttack & { category: 'BYPASS' }): unknown {
  const typedAttack = attack as { targetComponent: string; technique: string };
  
  return {
    targetComponent: typedAttack.targetComponent,
    technique: typedAttack.technique,
    payload: {
      spoofedHeaders: {
        'X-Internal-Bypass': 'true',
        'X-Forwarded-For': '127.0.0.1',
      },
      directCallAttempt: typedAttack.technique === 'direct_invocation',
    },
  };
}

/**
 * Generate resource attack input
 */
function generateResourceAttackInput(attack: AnyAttack & { category: 'RESOURCE' }): unknown {
  const typedAttack = attack as { targetResource: string; exhaustionLevel: number };
  
  return {
    targetResource: typedAttack.targetResource,
    exhaustionLevel: typedAttack.exhaustionLevel,
    payload: generateExhaustionPayload(attack),
  };
}

/**
 * Generate timing attack input
 */
function generateTimingAttackInput(attack: AnyAttack & { category: 'TIMING' }): unknown {
  const typedAttack = attack as { timingParameter: string; exploitWindow: number };
  
  return {
    timingParameter: typedAttack.timingParameter,
    exploitWindow: typedAttack.exploitWindow,
    concurrentRequests: 10,
    timestamp: attack.id.includes('FUTURE') 
      ? Date.now() + 86400000 
      : attack.id.includes('PAST')
        ? Date.now() - 86400000 * 365
        : Date.now(),
  };
}

/**
 * Generate injection attack input
 */
function generateInjectionAttackInput(attack: AnyAttack & { category: 'INJECTION' }): unknown {
  const typedAttack = attack as { payload: string; injectionPoint: string };
  
  return {
    injectionPoint: typedAttack.injectionPoint,
    payload: typedAttack.payload,
    envelope: {
      id: 'injection-test',
      type: 'test.message',
      payload: JSON.parse(typedAttack.payload.startsWith('{') ? typedAttack.payload : '{}'),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateWrongTypeValue(field: string): unknown {
  // Return a value that's wrong for any expected type
  const wrongTypes = [
    42,
    true,
    null,
    [],
    {},
    'wrong',
  ];
  return wrongTypes[Math.floor(field.length % wrongTypes.length)];
}

function createDeeplyNested(depth: number): object {
  if (depth === 0) return { value: 'end' };
  return { nested: createDeeplyNested(depth - 1) };
}

function generateExhaustionPayload(attack: AnyAttack): unknown {
  if (attack.id.includes('LARGE_ARRAY')) {
    return { array: new Array(1000000).fill('x') };
  }
  if (attack.id.includes('RECURSIVE')) {
    return createDeeplyNested(1000);
  }
  if (attack.id.includes('REGEX')) {
    return { pattern: 'a'.repeat(50) + 'b' };
  }
  if (attack.id.includes('HASH_COLLISION')) {
    return { keys: generateCollisionKeys(1000) };
  }
  return {};
}

function generateCollisionKeys(count: number): string[] {
  // Generate keys that might collide in naive hash implementations
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(`key_${i.toString(16)}`);
  }
  return keys;
}

function getExpectedErrorCode(attack: AnyAttack): string | undefined {
  if (attack.expectedResponse !== ExpectedResponse.REJECT) {
    return undefined;
  }
  
  switch (attack.category) {
    case AttackCategory.ENVELOPE:
      return 'E_INVALID_ENVELOPE';
    case AttackCategory.REPLAY:
      return 'E_REPLAY_DETECTED';
    case AttackCategory.BYPASS:
      return 'E_UNAUTHORIZED';
    case AttackCategory.RESOURCE:
      return 'E_RESOURCE_EXCEEDED';
    case AttackCategory.TIMING:
      return 'E_TIMING_VIOLATION';
    case AttackCategory.INJECTION:
      return 'E_INJECTION_DETECTED';
    default:
      return 'E_ATTACK_BLOCKED';
  }
}

function getSetupSteps(attack: AnyAttack): string[] {
  const steps: string[] = [];
  
  if (attack.category === AttackCategory.REPLAY) {
    steps.push('Submit original message');
    steps.push('Wait for specified delay');
  }
  
  if (attack.category === AttackCategory.TIMING) {
    steps.push('Prepare concurrent request infrastructure');
  }
  
  if (attack.category === AttackCategory.RESOURCE) {
    steps.push('Record baseline resource usage');
  }
  
  return steps;
}

function getTeardownSteps(attack: AnyAttack): string[] {
  const steps: string[] = [];
  
  if (attack.category === AttackCategory.RESOURCE) {
    steps.push('Verify resource cleanup');
    steps.push('Compare with baseline');
  }
  
  steps.push('Verify system state unchanged');
  steps.push('Verify invariants');
  
  return steps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate all test cases for all attacks in the grammar
 */
export function generateAllTestCases(): Map<AttackId, AttackTestCase[]> {
  const allCases = new Map<AttackId, AttackTestCase[]>();
  
  for (const attack of ADVERSARIAL_GRAMMAR.enumerateAll()) {
    allCases.set(attack.id, generateTestCases(attack));
  }
  
  return allCases;
}

/**
 * Generate test cases for a specific category
 */
export function generateTestCasesForCategory(category: AttackCategory): AttackTestCase[] {
  const attacks = ADVERSARIAL_GRAMMAR.byCategory(category);
  return attacks.flatMap(generateTestCases);
}

/**
 * Generate test cases for a specific severity level
 */
export function generateTestCasesForSeverity(severity: Severity): AttackTestCase[] {
  const attacks = ADVERSARIAL_GRAMMAR.bySeverity(severity);
  return attacks.flatMap(generateTestCases);
}

/**
 * Get total number of generated test cases
 */
export function getTotalTestCaseCount(): number {
  let count = 0;
  for (const attack of ADVERSARIAL_GRAMMAR.enumerateAll()) {
    count += generateTestCases(attack).length;
  }
  return count;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CASE SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize test cases to JSON for storage/transfer
 */
export function serializeTestCases(cases: AttackTestCase[]): string {
  return JSON.stringify(cases, null, 2);
}

/**
 * Deserialize test cases from JSON
 */
export function deserializeTestCases(json: string): AttackTestCase[] {
  const parsed = JSON.parse(json);
  return parsed.map((tc: Record<string, unknown>) => ({
    id: testCaseId(tc.id as string),
    attackId: attackId(tc.attackId as string),
    input: tc.input,
    expectedOutcome: tc.expectedOutcome as TestOutcome,
    setup: tc.setup as string[] | undefined,
    teardown: tc.teardown as string[] | undefined,
  }));
}
