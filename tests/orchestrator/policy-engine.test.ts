/**
 * OMEGA Orchestrator Policy Engine Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for G4 policy engine
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import {
  createPolicyEngine,
  createPolicyEngineWith,
  checkIntentAgainstPolicy,
  type PolicyViolation,
  type PolicyCheckResult,
  type PolicyEngine,
} from '../../src/orchestrator/policy-engine';
import { loadPolicy, POLICIES_PATH, POLICIES_LOCK_PATH } from '../../src/orchestrator/policy-loader';
import { createIntent, type RawIntentInput } from '../../src/orchestrator/intent-schema';
import { isPolicyId } from '../../src/orchestrator/types';

const TEST_DIR = join(process.cwd(), '.test_policy_engine');

describe('Policy Engine — Phase G', () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
    await mkdir(join(TEST_DIR, 'config/policies'), { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  const validPolicy = {
    version: '1.0.0',
    policyId: 'POL-v1-abcd1234',
    rules: {
      allowedGoals: ['DRAFT', 'REWRITE', 'SUMMARIZE'],
      allowedTones: ['NEUTRAL', 'NARRATIVE', 'FORMAL'],
      maxRequestsPerActor: 100,
    },
    forbidden: {
      patterns: [
        { id: 'PAT-fact', regex: '\\[FACT\\]', description: 'Fact injection marker' },
        { id: 'PAT-entity', regex: 'ENT-[a-z]+-[a-f0-9]+', description: 'Entity ID' },
      ],
      vocabularies: [
        { id: 'VOC-canon', words: ['__canon__', '__truth__'], description: 'Canon keywords' },
        { id: 'VOC-proto', words: ['__proto__', 'constructor'], description: 'Proto keywords' },
      ],
      structures: [
        { id: 'STR-pred', pattern: '"predicate"\\s*:', description: 'Predicate structure' },
      ],
    },
    limits: {
      maxLength: 10000,
      minLength: 10,
      maxPayloadSize: 50000,
    },
  };

  async function setupTestPolicy(policy: unknown, hash?: string) {
    const content = JSON.stringify(policy, null, 2);
    await writeFile(join(TEST_DIR, POLICIES_PATH), content);

    const computedHash = hash ?? createHash('sha256').update(content).digest('hex');
    await writeFile(join(TEST_DIR, POLICIES_LOCK_PATH), computedHash);
  }

  function createValidIntent(overrides?: Partial<RawIntentInput>) {
    const base: RawIntentInput = {
      actorId: 'ACT-user-12345678',
      goal: 'DRAFT',
      constraints: {
        maxLength: 1000,
        format: 'TEXT_ONLY',
        allowFacts: false,
      },
      tone: {
        tone: 'NEUTRAL',
        intensity: 'MEDIUM',
      },
      forbidden: {
        patterns: [],
        vocabularies: [],
        structures: [],
      },
      payload: {
        text: 'Please write a story about a hero.',
      },
    };

    return createIntent({ ...base, ...overrides });
  }

  describe('createPolicyEngine', () => {
    it('creates engine with verified policy', async () => {
      await setupTestPolicy(validPolicy);

      const engine = createPolicyEngine(TEST_DIR);

      expect(engine.verified).toBe(true);
      expect(isPolicyId(engine.policyId)).toBe(true);
      expect(typeof engine.policyHash).toBe('string');
    });

    it('throws for tampered policy', async () => {
      await setupTestPolicy(validPolicy, 'a'.repeat(64));

      expect(() => createPolicyEngine(TEST_DIR)).toThrow('G-INV-08');
    });
  });

  describe('createPolicyEngineWith', () => {
    it('creates engine from pre-loaded policy', async () => {
      await setupTestPolicy(validPolicy);

      const loaded = loadPolicy(TEST_DIR);
      const engine = createPolicyEngineWith(loaded);

      expect(engine.policyId).toBe(loaded.config.policyId);
      expect(engine.verified).toBe(true);
    });
  });

  describe('checkIntent', () => {
    it('allows valid intent', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent();

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.policyId).toBe('POL-v1-abcd1234');
      expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('rejects invalid goal', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({ goal: 'INVALID_GOAL' });

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('INVALID_GOAL');
      expect(result.violations[0].code).toBe('G-POL-01');
    });

    it('rejects invalid tone', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({
        tone: { tone: 'INVALID_TONE', intensity: 'MEDIUM' },
      });

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.type === 'INVALID_TONE')).toBe(true);
    });

    it('rejects forbidden patterns in payload (G-INV-09)', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({
        payload: { text: 'Here is a [FACT] injection attempt' },
      });

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.type === 'FORBIDDEN_PATTERN')).toBe(true);
    });

    it('rejects forbidden vocabulary in payload', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({
        payload: { text: 'Some __canon__ injection' },
      });

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.type === 'FORBIDDEN_VOCABULARY')).toBe(true);
    });

    it('rejects forbidden structures in payload', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({
        payload: { fact: { "predicate": "HAS_NAME" } },
      });

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.type === 'FORBIDDEN_STRUCTURE')).toBe(true);
    });

    it('rejects maxLength exceeding policy limit', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({
        constraints: { maxLength: 50000, format: 'TEXT_ONLY', allowFacts: false },
      });

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.type === 'LENGTH_EXCEEDED')).toBe(true);
    });

    it('rejects payload size exceeding limit', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      // Create large payload
      const intent = createValidIntent({
        payload: { text: 'x'.repeat(60000) },
      });

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.type === 'PAYLOAD_TOO_LARGE')).toBe(true);
    });

    it('collects multiple violations', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({
        goal: 'INVALID',
        tone: { tone: 'INVALID', intensity: 'MEDIUM' },
        payload: { text: '[FACT] __canon__' },
      });

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(2);
    });
  });

  describe('checkGoal', () => {
    it('returns null for valid goal', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);

      expect(engine.checkGoal('DRAFT')).toBeNull();
      expect(engine.checkGoal('REWRITE')).toBeNull();
      expect(engine.checkGoal('SUMMARIZE')).toBeNull();
    });

    it('returns violation for invalid goal', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);

      const violation = engine.checkGoal('INVALID');

      expect(violation).not.toBeNull();
      expect(violation!.type).toBe('INVALID_GOAL');
    });
  });

  describe('checkTone', () => {
    it('returns null for valid tone', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);

      expect(engine.checkTone('NEUTRAL')).toBeNull();
      expect(engine.checkTone('NARRATIVE')).toBeNull();
    });

    it('returns violation for invalid tone', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);

      const violation = engine.checkTone('POETIC');

      expect(violation).not.toBeNull();
      expect(violation!.type).toBe('INVALID_TONE');
    });
  });

  describe('checkPayload', () => {
    it('returns empty for clean payload', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);

      const violations = engine.checkPayload({ text: 'Normal text' });

      expect(violations).toHaveLength(0);
    });

    it('returns violations for forbidden content', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);

      const violations = engine.checkPayload({
        text: '[FACT] ENT-person-abc12345 __truth__',
      });

      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('checkLimits', () => {
    it('returns empty for valid limits', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent();

      const violations = engine.checkLimits(intent);

      expect(violations).toHaveLength(0);
    });

    it('returns violation for length exceeding limit', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({
        constraints: { maxLength: 99999, format: 'TEXT_ONLY', allowFacts: false },
      });

      const violations = engine.checkLimits(intent);

      expect(violations.some(v => v.type === 'LENGTH_EXCEEDED')).toBe(true);
    });
  });

  describe('checkIntentAgainstPolicy', () => {
    it('performs one-off check', async () => {
      await setupTestPolicy(validPolicy);
      const intent = createValidIntent();

      const result = checkIntentAgainstPolicy(intent, TEST_DIR);

      expect(result.allowed).toBe(true);
    });
  });

  describe('G-INV-09: Forbidden patterns rejection', () => {
    it('rejects entity ID patterns', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({
        payload: { text: 'Reference to ENT-person-abcd1234' },
      });

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v =>
        v.type === 'FORBIDDEN_PATTERN' &&
        v.details?.patternId === 'PAT-entity'
      )).toBe(true);
    });

    it('rejects proto keywords', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({
        payload: { text: 'Using __proto__ is forbidden' },
      });

      const result = engine.checkIntent(intent);

      expect(result.allowed).toBe(false);
      expect(result.violations.some(v =>
        v.type === 'FORBIDDEN_VOCABULARY' &&
        v.details?.matchedWord === '__proto__'
      )).toBe(true);
    });
  });

  describe('Integration with actual policy file', () => {
    it('works with actual repo policy', () => {
      const engine = createPolicyEngine();
      const intent = createValidIntent();

      const result = engine.checkIntent(intent);

      // Should pass with valid intent against actual policy
      expect(result.policyId).toMatch(/^POL-v\d+-[a-f0-9]{8}$/);
      expect(typeof result.allowed).toBe('boolean');
    });
  });

  describe('Violation details', () => {
    it('includes relevant details in violations', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({ goal: 'UNKNOWN' });

      const result = engine.checkIntent(intent);

      expect(result.violations[0].details).toBeDefined();
      expect(result.violations[0].details!.goal).toBe('UNKNOWN');
      expect(result.violations[0].details!.allowed).toContain('DRAFT');
    });

    it('freezes violation objects', async () => {
      await setupTestPolicy(validPolicy);
      const engine = createPolicyEngine(TEST_DIR);
      const intent = createValidIntent({ goal: 'BAD' });

      const result = engine.checkIntent(intent);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.violations)).toBe(true);
      expect(Object.isFrozen(result.violations[0])).toBe(true);
    });
  });
});
