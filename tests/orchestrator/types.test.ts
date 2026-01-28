/**
 * OMEGA Orchestrator Types Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for G0 types
 */

import { describe, it, expect } from 'vitest';
import {
  // Type guards
  isIntentId,
  isActorId,
  isPolicyId,
  isChainHash,
  isSha256,
  isISO8601,
  isPatternId,
  isVocabularyId,
  isStructureId,
  isToneId,
  isToneIntensity,
  isToneProfile,
  isForbiddenSet,
  isIntentGoal,
  isIntentConstraints,
  isIntent,
  isGenerationMode,
  isForgeAdapterConfig,
  isGenerationContract,
  isLedgerVerdict,
  isIntentLedgerEntry,
  isOrchestratorSuccess,
  isOrchestratorFailure,
  // Creators
  createEmptyForbiddenSet,
  createValidationError,
  // Constants
  TONE_IDS,
  TONE_INTENSITIES,
  INTENT_GOALS,
  // Types
  type IntentId,
  type ActorId,
  type Sha256,
  type ChainHash,
  type PolicyId,
  type ISO8601,
  type Intent,
  type IntentConstraints,
  type OrchestratorResult,
} from '../../src/orchestrator/types';

describe('Orchestrator Types — Phase G', () => {
  describe('Branded Type Guards', () => {
    describe('isIntentId', () => {
      it('accepts valid IntentId format', () => {
        expect(isIntentId('INT-0123456789abcdef0123456789abcdef')).toBe(true);
        expect(isIntentId('INT-aaaabbbbccccddddeeeeffffaaaabbbb')).toBe(true);
      });

      it('rejects invalid IntentId', () => {
        expect(isIntentId('INT-tooshort')).toBe(false);
        expect(isIntentId('0123456789abcdef0123456789abcdef')).toBe(false); // No prefix
        expect(isIntentId('INT-UPPERCASE123456789abcdef12345')).toBe(false); // Uppercase
        expect(isIntentId(null)).toBe(false);
        expect(isIntentId(undefined)).toBe(false);
        expect(isIntentId(123)).toBe(false);
      });
    });

    describe('isActorId', () => {
      it('accepts valid ActorId format', () => {
        expect(isActorId('ACT-user123')).toBe(true);
        expect(isActorId('ACT-system')).toBe(true);
        expect(isActorId('ACT-user_test-1')).toBe(true);
      });

      it('rejects invalid ActorId', () => {
        expect(isActorId('user123')).toBe(false); // No prefix
        expect(isActorId('ACT-')).toBe(false); // Empty after prefix
        expect(isActorId('ACT-user@test')).toBe(false); // Invalid char
        expect(isActorId(null)).toBe(false);
      });
    });

    describe('isPolicyId', () => {
      it('accepts valid PolicyId format', () => {
        expect(isPolicyId('POL-v1-abcd1234')).toBe(true);
        expect(isPolicyId('POL-v1.0-12345678')).toBe(true);
        expect(isPolicyId('POL-v2.1.3-abcdef12')).toBe(true);
      });

      it('rejects invalid PolicyId', () => {
        expect(isPolicyId('POL-1-abcd1234')).toBe(false); // No 'v'
        expect(isPolicyId('POL-v1-short')).toBe(false); // Hash too short
        expect(isPolicyId(null)).toBe(false);
      });
    });

    describe('isChainHash / isSha256', () => {
      const validHash = 'a'.repeat(64);

      it('accepts valid 64-char hex hash', () => {
        expect(isChainHash(validHash)).toBe(true);
        expect(isSha256(validHash)).toBe(true);
      });

      it('rejects invalid hash', () => {
        expect(isChainHash('short')).toBe(false);
        expect(isSha256('a'.repeat(63))).toBe(false); // Too short
        expect(isChainHash('a'.repeat(65))).toBe(false); // Too long
        expect(isSha256('g'.repeat(64))).toBe(false); // Non-hex
        expect(isChainHash(null)).toBe(false);
      });
    });

    describe('isISO8601', () => {
      it('accepts valid ISO8601 timestamps', () => {
        expect(isISO8601('2024-01-01T00:00:00Z')).toBe(true);
        expect(isISO8601('2024-06-15T12:30:45.123Z')).toBe(true);
        expect(isISO8601(new Date().toISOString())).toBe(true);
      });

      it('rejects invalid timestamps', () => {
        expect(isISO8601('2024-01-01')).toBe(false); // No time
        expect(isISO8601('invalid')).toBe(false);
        expect(isISO8601(null)).toBe(false);
      });
    });

    describe('isPatternId / isVocabularyId / isStructureId', () => {
      it('accepts valid pattern/vocabulary/structure IDs', () => {
        expect(isPatternId('PAT-pattern1')).toBe(true);
        expect(isVocabularyId('VOC-vocab_test')).toBe(true);
        expect(isStructureId('STR-struct-1')).toBe(true);
      });

      it('rejects invalid IDs', () => {
        expect(isPatternId('pattern1')).toBe(false);
        expect(isVocabularyId('VOC-')).toBe(false);
        expect(isStructureId('STR-inv@lid')).toBe(false);
      });
    });
  });

  describe('Tone Types', () => {
    describe('isToneId', () => {
      it('accepts all valid tone IDs', () => {
        TONE_IDS.forEach(id => {
          expect(isToneId(id)).toBe(true);
        });
      });

      it('rejects invalid tone IDs', () => {
        expect(isToneId('INVALID')).toBe(false);
        expect(isToneId('')).toBe(false);
        expect(isToneId(null)).toBe(false);
      });
    });

    describe('isToneIntensity', () => {
      it('accepts all valid intensities', () => {
        TONE_INTENSITIES.forEach(intensity => {
          expect(isToneIntensity(intensity)).toBe(true);
        });
      });

      it('rejects invalid intensities', () => {
        expect(isToneIntensity('VERY_HIGH')).toBe(false);
        expect(isToneIntensity(null)).toBe(false);
      });
    });

    describe('isToneProfile', () => {
      it('accepts valid tone profile', () => {
        expect(isToneProfile({ tone: 'NEUTRAL', intensity: 'MEDIUM' })).toBe(true);
        expect(isToneProfile({ tone: 'POETIC', intensity: 'HIGH' })).toBe(true);
      });

      it('rejects invalid tone profile', () => {
        expect(isToneProfile({ tone: 'INVALID', intensity: 'MEDIUM' })).toBe(false);
        expect(isToneProfile({ tone: 'NEUTRAL' })).toBe(false);
        expect(isToneProfile(null)).toBe(false);
      });
    });
  });

  describe('ForbiddenSet', () => {
    describe('createEmptyForbiddenSet', () => {
      it('creates frozen empty set', () => {
        const set = createEmptyForbiddenSet();
        expect(set.patterns).toHaveLength(0);
        expect(set.vocabularies).toHaveLength(0);
        expect(set.structures).toHaveLength(0);
        expect(Object.isFrozen(set)).toBe(true);
      });
    });

    describe('isForbiddenSet', () => {
      it('accepts valid forbidden set', () => {
        expect(isForbiddenSet({
          patterns: ['PAT-test1' as any],
          vocabularies: ['VOC-test1' as any],
          structures: ['STR-test1' as any],
        })).toBe(true);
        expect(isForbiddenSet(createEmptyForbiddenSet())).toBe(true);
      });

      it('rejects invalid forbidden set', () => {
        expect(isForbiddenSet({ patterns: [], vocabularies: [] })).toBe(false); // Missing structures
        expect(isForbiddenSet({ patterns: ['invalid'], vocabularies: [], structures: [] })).toBe(false);
        expect(isForbiddenSet(null)).toBe(false);
      });
    });
  });

  describe('Intent Types', () => {
    describe('isIntentGoal', () => {
      it('accepts all valid intent goals', () => {
        INTENT_GOALS.forEach(goal => {
          expect(isIntentGoal(goal)).toBe(true);
        });
      });

      it('rejects invalid goals', () => {
        expect(isIntentGoal('INVALID_GOAL')).toBe(false);
        expect(isIntentGoal(null)).toBe(false);
      });
    });

    describe('isIntentConstraints', () => {
      it('accepts valid constraints', () => {
        expect(isIntentConstraints({
          maxLength: 1000,
          format: 'TEXT_ONLY',
          allowFacts: false,
        })).toBe(true);
      });

      it('rejects constraints with allowFacts: true (G-INV-01)', () => {
        expect(isIntentConstraints({
          maxLength: 1000,
          format: 'TEXT_ONLY',
          allowFacts: true, // MUST be false
        })).toBe(false);
      });

      it('rejects invalid constraints', () => {
        expect(isIntentConstraints({
          maxLength: -1, // Invalid
          format: 'TEXT_ONLY',
          allowFacts: false,
        })).toBe(false);
        expect(isIntentConstraints({
          maxLength: 1000,
          format: 'HTML', // Invalid format
          allowFacts: false,
        })).toBe(false);
      });
    });

    describe('isIntent', () => {
      const validIntent: Intent = {
        intentId: 'INT-0123456789abcdef0123456789abcdef' as IntentId,
        actorId: 'ACT-user1' as ActorId,
        goal: 'DRAFT',
        constraints: {
          maxLength: 1000,
          format: 'TEXT_ONLY',
          allowFacts: false,
        },
        payload: { prompt: 'Write a story' },
      };

      it('accepts valid intent', () => {
        expect(isIntent(validIntent)).toBe(true);
      });

      it('accepts intent with optional fields', () => {
        const intentWithOptional = {
          ...validIntent,
          tone: { tone: 'NARRATIVE' as const, intensity: 'MEDIUM' as const },
          forbidden: createEmptyForbiddenSet(),
        };
        expect(isIntent(intentWithOptional)).toBe(true);
      });

      it('rejects invalid intent', () => {
        expect(isIntent({ ...validIntent, intentId: 'invalid' })).toBe(false);
        expect(isIntent({ ...validIntent, goal: 'INVALID' })).toBe(false);
        expect(isIntent(null)).toBe(false);
      });
    });
  });

  describe('Generation Types', () => {
    describe('isGenerationMode', () => {
      it('accepts MOCK_ONLY', () => {
        expect(isGenerationMode('MOCK_ONLY')).toBe(true);
      });

      it('rejects other modes', () => {
        expect(isGenerationMode('CLAUDE')).toBe(false);
        expect(isGenerationMode('REAL')).toBe(false);
        expect(isGenerationMode(null)).toBe(false);
      });
    });

    describe('isForgeAdapterConfig', () => {
      it('accepts valid config', () => {
        expect(isForgeAdapterConfig({
          mode: 'MOCK_ONLY',
          seed: 12345,
          domain: 'fiction',
        })).toBe(true);
      });

      it('rejects invalid config', () => {
        expect(isForgeAdapterConfig({
          mode: 'CLAUDE', // Invalid mode
          seed: 12345,
          domain: 'fiction',
        })).toBe(false);
        expect(isForgeAdapterConfig({
          mode: 'MOCK_ONLY',
          seed: 1.5, // Float
          domain: 'fiction',
        })).toBe(false);
      });
    });

    describe('isGenerationContract', () => {
      const validContract = {
        intentId: 'INT-0123456789abcdef0123456789abcdef' as IntentId,
        intentHash: 'a'.repeat(64) as Sha256,
        policyId: 'POL-v1-12345678' as PolicyId,
        policyHash: 'b'.repeat(64) as Sha256,
        maxLength: 1000,
        format: 'TEXT_ONLY' as const,
        forbidden: createEmptyForbiddenSet(),
      };

      it('accepts valid contract', () => {
        expect(isGenerationContract(validContract)).toBe(true);
      });

      it('rejects invalid contract', () => {
        expect(isGenerationContract({ ...validContract, maxLength: 0 })).toBe(false);
        expect(isGenerationContract(null)).toBe(false);
      });
    });
  });

  describe('Ledger Types', () => {
    describe('isLedgerVerdict', () => {
      it('accepts valid verdicts', () => {
        expect(isLedgerVerdict('ALLOWED')).toBe(true);
        expect(isLedgerVerdict('REJECTED')).toBe(true);
      });

      it('rejects invalid verdicts', () => {
        expect(isLedgerVerdict('MAYBE')).toBe(false);
        expect(isLedgerVerdict(null)).toBe(false);
      });
    });

    describe('isIntentLedgerEntry', () => {
      const validEntry = {
        intentHash: 'a'.repeat(64) as Sha256,
        actorId: 'ACT-user1' as ActorId,
        timestamp: '2024-01-01T00:00:00Z' as ISO8601,
        verdict: 'ALLOWED' as const,
      };

      it('accepts valid entry', () => {
        expect(isIntentLedgerEntry(validEntry)).toBe(true);
      });

      it('accepts entry with optional fields', () => {
        expect(isIntentLedgerEntry({
          ...validEntry,
          reason: 'Policy violation',
          chainHash: 'c'.repeat(64) as ChainHash,
        })).toBe(true);
      });

      it('rejects invalid entry', () => {
        expect(isIntentLedgerEntry({ ...validEntry, verdict: 'INVALID' })).toBe(false);
        expect(isIntentLedgerEntry(null)).toBe(false);
      });
    });
  });

  describe('Result Types', () => {
    const successResult: OrchestratorResult = {
      success: true,
      output: 'Generated text',
      intentId: 'INT-0123456789abcdef0123456789abcdef' as IntentId,
      proofHash: 'a'.repeat(64) as Sha256,
      ledgerEntry: {
        intentHash: 'b'.repeat(64) as Sha256,
        actorId: 'ACT-user1' as ActorId,
        timestamp: '2024-01-01T00:00:00Z' as ISO8601,
        verdict: 'ALLOWED',
      },
    };

    const failureResult: OrchestratorResult = {
      success: false,
      intentId: 'INT-0123456789abcdef0123456789abcdef' as IntentId,
      reason: 'Policy violation',
      ledgerEntry: {
        intentHash: 'b'.repeat(64) as Sha256,
        actorId: 'ACT-user1' as ActorId,
        timestamp: '2024-01-01T00:00:00Z' as ISO8601,
        verdict: 'REJECTED',
      },
    };

    it('isOrchestratorSuccess correctly identifies success', () => {
      expect(isOrchestratorSuccess(successResult)).toBe(true);
      expect(isOrchestratorSuccess(failureResult)).toBe(false);
    });

    it('isOrchestratorFailure correctly identifies failure', () => {
      expect(isOrchestratorFailure(failureResult)).toBe(true);
      expect(isOrchestratorFailure(successResult)).toBe(false);
    });
  });

  describe('Validation Error', () => {
    it('createValidationError creates frozen error', () => {
      const error = createValidationError('FACT_INJECTION_DETECTED', 'Facts not allowed', 'payload');
      expect(error.code).toBe('FACT_INJECTION_DETECTED');
      expect(error.message).toBe('Facts not allowed');
      expect(error.field).toBe('payload');
      expect(Object.isFrozen(error)).toBe(true);
    });
  });

  describe('G-INV-01: No fact injected via Intent', () => {
    it('IntentConstraints.allowFacts must be false', () => {
      // Valid constraints have allowFacts: false
      const valid: IntentConstraints = {
        maxLength: 1000,
        format: 'TEXT_ONLY',
        allowFacts: false,
      };
      expect(isIntentConstraints(valid)).toBe(true);

      // allowFacts: true is rejected
      const invalid = {
        maxLength: 1000,
        format: 'TEXT_ONLY',
        allowFacts: true,
      };
      expect(isIntentConstraints(invalid)).toBe(false);
    });
  });
});
