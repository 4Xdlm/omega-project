/**
 * OMEGA Orchestrator Policy Engine v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Applies policies to intents - validates goals, tones, forbidden patterns,
 * and limits against loaded policy configuration.
 *
 * INVARIANTS:
 * - G-INV-01: No fact injection via Intent
 * - G-INV-08: Policies from versioned config + lock hash
 * - G-INV-09: Forbidden patterns rejection
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0 §G4
 */

import type {
  Intent,
  PolicyId,
  PatternId,
  VocabularyId,
  StructureId,
} from './types';
import {
  loadPolicy,
  type LoadedPolicy,
  type PolicyConfig,
  type PatternDefinition,
  type VocabularyDefinition,
  type StructureDefinition,
} from './policy-loader';

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Violation type for policy check failures
 */
export type ViolationType =
  | 'INVALID_GOAL'
  | 'INVALID_TONE'
  | 'FORBIDDEN_PATTERN'
  | 'FORBIDDEN_VOCABULARY'
  | 'FORBIDDEN_STRUCTURE'
  | 'LENGTH_EXCEEDED'
  | 'LENGTH_TOO_SHORT'
  | 'PAYLOAD_TOO_LARGE';

/**
 * A single policy violation
 */
export interface PolicyViolation {
  readonly type: ViolationType;
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Result of policy check
 */
export interface PolicyCheckResult {
  readonly allowed: boolean;
  readonly policyId: PolicyId;
  readonly violations: readonly PolicyViolation[];
  readonly checkedAt: string; // ISO8601
}

/**
 * Policy engine instance
 */
export interface PolicyEngine {
  readonly policyId: PolicyId;
  readonly policyHash: string;
  readonly verified: boolean;
  checkIntent(intent: Intent): PolicyCheckResult;
  checkGoal(goal: string): PolicyViolation | null;
  checkTone(tone: string): PolicyViolation | null;
  checkPayload(payload: Readonly<Record<string, unknown>>): readonly PolicyViolation[];
  checkLimits(intent: Intent): readonly PolicyViolation[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY CHECK FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if a goal is allowed by policy.
 *
 * @param goal - Goal to check
 * @param allowedGoals - List of allowed goals
 * @returns Violation or null if allowed
 */
function checkGoalAllowed(
  goal: string,
  allowedGoals: readonly string[]
): PolicyViolation | null {
  if (!allowedGoals.includes(goal)) {
    return Object.freeze({
      type: 'INVALID_GOAL' as ViolationType,
      code: 'G-POL-01',
      message: `Goal '${goal}' is not allowed by policy`,
      details: Object.freeze({
        goal,
        allowed: allowedGoals,
      }),
    });
  }
  return null;
}

/**
 * Checks if a tone is allowed by policy.
 *
 * @param tone - Tone to check
 * @param allowedTones - List of allowed tones
 * @returns Violation or null if allowed
 */
function checkToneAllowed(
  tone: string,
  allowedTones: readonly string[]
): PolicyViolation | null {
  if (!allowedTones.includes(tone)) {
    return Object.freeze({
      type: 'INVALID_TONE' as ViolationType,
      code: 'G-POL-02',
      message: `Tone '${tone}' is not allowed by policy`,
      details: Object.freeze({
        tone,
        allowed: allowedTones,
      }),
    });
  }
  return null;
}

/**
 * Checks a string against forbidden patterns.
 *
 * @param text - Text to check
 * @param patterns - Forbidden patterns
 * @returns Violations found
 */
function checkForbiddenPatterns(
  text: string,
  patterns: readonly PatternDefinition[]
): readonly PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern.regex, 'gi');
      if (regex.test(text)) {
        violations.push(
          Object.freeze({
            type: 'FORBIDDEN_PATTERN' as ViolationType,
            code: 'G-POL-03',
            message: `Forbidden pattern detected: ${pattern.description}`,
            details: Object.freeze({
              patternId: pattern.id,
              description: pattern.description,
            }),
          })
        );
      }
    } catch {
      // Invalid regex - skip (should not happen with valid policy)
    }
  }

  return Object.freeze(violations);
}

/**
 * Checks a string against forbidden vocabularies.
 *
 * @param text - Text to check
 * @param vocabularies - Forbidden vocabularies
 * @returns Violations found
 */
function checkForbiddenVocabularies(
  text: string,
  vocabularies: readonly VocabularyDefinition[]
): readonly PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  const lowerText = text.toLowerCase();

  for (const vocab of vocabularies) {
    for (const word of vocab.words) {
      if (lowerText.includes(word.toLowerCase())) {
        violations.push(
          Object.freeze({
            type: 'FORBIDDEN_VOCABULARY' as ViolationType,
            code: 'G-POL-04',
            message: `Forbidden vocabulary detected: ${vocab.description}`,
            details: Object.freeze({
              vocabularyId: vocab.id,
              description: vocab.description,
              matchedWord: word,
            }),
          })
        );
        break; // One violation per vocabulary
      }
    }
  }

  return Object.freeze(violations);
}

/**
 * Checks a string against forbidden structures.
 *
 * @param text - Text to check
 * @param structures - Forbidden structures
 * @returns Violations found
 */
function checkForbiddenStructures(
  text: string,
  structures: readonly StructureDefinition[]
): readonly PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const struct of structures) {
    try {
      const regex = new RegExp(struct.pattern, 'gi');
      if (regex.test(text)) {
        violations.push(
          Object.freeze({
            type: 'FORBIDDEN_STRUCTURE' as ViolationType,
            code: 'G-POL-05',
            message: `Forbidden structure detected: ${struct.description}`,
            details: Object.freeze({
              structureId: struct.id,
              description: struct.description,
            }),
          })
        );
      }
    } catch {
      // Invalid regex - skip
    }
  }

  return Object.freeze(violations);
}

/**
 * Checks payload against all forbidden rules.
 *
 * @param payload - Payload to check
 * @param forbidden - Forbidden definitions
 * @returns All violations found
 */
function checkPayloadForbidden(
  payload: Readonly<Record<string, unknown>>,
  forbidden: PolicyConfig['forbidden']
): readonly PolicyViolation[] {
  // Serialize payload for checking
  const payloadStr = JSON.stringify(payload);
  const violations: PolicyViolation[] = [];

  // Check patterns
  violations.push(...checkForbiddenPatterns(payloadStr, forbidden.patterns));

  // Check vocabularies
  violations.push(...checkForbiddenVocabularies(payloadStr, forbidden.vocabularies));

  // Check structures
  violations.push(...checkForbiddenStructures(payloadStr, forbidden.structures));

  return Object.freeze(violations);
}

/**
 * Checks intent limits.
 *
 * @param intent - Intent to check
 * @param limits - Policy limits
 * @returns Violations found
 */
function checkIntentLimits(
  intent: Intent,
  limits: PolicyConfig['limits']
): readonly PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  const payloadStr = JSON.stringify(intent.payload);
  const payloadSize = new TextEncoder().encode(payloadStr).length;

  // Check payload size
  if (payloadSize > limits.maxPayloadSize) {
    violations.push(
      Object.freeze({
        type: 'PAYLOAD_TOO_LARGE' as ViolationType,
        code: 'G-POL-06',
        message: `Payload size ${payloadSize} exceeds limit ${limits.maxPayloadSize}`,
        details: Object.freeze({
          size: payloadSize,
          limit: limits.maxPayloadSize,
        }),
      })
    );
  }

  // Check maxLength constraint against policy
  if (intent.constraints.maxLength > limits.maxLength) {
    violations.push(
      Object.freeze({
        type: 'LENGTH_EXCEEDED' as ViolationType,
        code: 'G-POL-07',
        message: `Requested maxLength ${intent.constraints.maxLength} exceeds policy limit ${limits.maxLength}`,
        details: Object.freeze({
          requested: intent.constraints.maxLength,
          limit: limits.maxLength,
        }),
      })
    );
  }

  // Check minLength
  if (intent.constraints.maxLength < limits.minLength) {
    violations.push(
      Object.freeze({
        type: 'LENGTH_TOO_SHORT' as ViolationType,
        code: 'G-POL-08',
        message: `Requested maxLength ${intent.constraints.maxLength} is below minimum ${limits.minLength}`,
        details: Object.freeze({
          requested: intent.constraints.maxLength,
          minimum: limits.minLength,
        }),
      })
    );
  }

  return Object.freeze(violations);
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY ENGINE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a policy engine with loaded policy.
 *
 * G-INV-08: Uses verified policy from lock file
 *
 * @param loadedPolicy - Pre-loaded policy
 * @returns Policy engine instance
 */
function createPolicyEngineFromLoaded(loadedPolicy: LoadedPolicy): PolicyEngine {
  const { config, hash, verified } = loadedPolicy;

  return Object.freeze({
    policyId: config.policyId,
    policyHash: hash,
    verified,

    checkIntent(intent: Intent): PolicyCheckResult {
      const violations: PolicyViolation[] = [];

      // Check goal
      const goalViolation = checkGoalAllowed(intent.goal, config.rules.allowedGoals);
      if (goalViolation) {
        violations.push(goalViolation);
      }

      // Check tone
      const toneViolation = checkToneAllowed(intent.tone.tone, config.rules.allowedTones);
      if (toneViolation) {
        violations.push(toneViolation);
      }

      // Check payload against forbidden rules
      violations.push(...checkPayloadForbidden(intent.payload, config.forbidden));

      // Check limits
      violations.push(...checkIntentLimits(intent, config.limits));

      return Object.freeze({
        allowed: violations.length === 0,
        policyId: config.policyId,
        violations: Object.freeze(violations),
        checkedAt: new Date().toISOString(),
      });
    },

    checkGoal(goal: string): PolicyViolation | null {
      return checkGoalAllowed(goal, config.rules.allowedGoals);
    },

    checkTone(tone: string): PolicyViolation | null {
      return checkToneAllowed(tone, config.rules.allowedTones);
    },

    checkPayload(payload: Readonly<Record<string, unknown>>): readonly PolicyViolation[] {
      return checkPayloadForbidden(payload, config.forbidden);
    },

    checkLimits(intent: Intent): readonly PolicyViolation[] {
      return checkIntentLimits(intent, config.limits);
    },
  });
}

/**
 * Creates a policy engine by loading policy from fixed path.
 *
 * G-INV-08: Loads and verifies policy
 * G-INV-13: Uses fixed path
 *
 * @param basePath - Base path for policy files
 * @returns Policy engine instance
 * @throws Error if policy invalid or lock mismatch
 */
export function createPolicyEngine(basePath?: string): PolicyEngine {
  const loadedPolicy = loadPolicy(basePath);
  return createPolicyEngineFromLoaded(loadedPolicy);
}

/**
 * Creates a policy engine from pre-loaded policy.
 *
 * @param loadedPolicy - Already loaded policy
 * @returns Policy engine instance
 */
export function createPolicyEngineWith(loadedPolicy: LoadedPolicy): PolicyEngine {
  return createPolicyEngineFromLoaded(loadedPolicy);
}

/**
 * Checks a single intent against a policy.
 * Convenience function for one-off checks.
 *
 * @param intent - Intent to check
 * @param basePath - Base path for policy files
 * @returns Policy check result
 */
export function checkIntentAgainstPolicy(
  intent: Intent,
  basePath?: string
): PolicyCheckResult {
  const engine = createPolicyEngine(basePath);
  return engine.checkIntent(intent);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ViolationType,
  PolicyViolation,
  PolicyCheckResult,
  PolicyEngine,
};
