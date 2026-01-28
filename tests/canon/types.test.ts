/**
 * OMEGA Canon Types Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-ID-01, INV-E-NAN-01, INV-E-STATUS-01, INV-E-STATUS-02
 */

import { describe, it, expect } from 'vitest';
import {
  ClaimStatus,
  EvidenceType,
  LineageSource,
  CanonError,
  CanonErrorCode,
  isClaimStatus,
  isEvidenceType,
  isLineageSource,
  isValidConfidence,
} from '../../src/canon/types.js';

describe('CANON Types — Phase E', () => {
  describe('ClaimStatus enum (INV-E-STATUS-01)', () => {
    it('has exactly 3 valid statuses', () => {
      expect(Object.keys(ClaimStatus)).toHaveLength(3);
      expect(ClaimStatus.ACTIVE).toBe('ACTIVE');
      expect(ClaimStatus.SUPERSEDED).toBe('SUPERSEDED');
      expect(ClaimStatus.CONDITIONAL).toBe('CONDITIONAL');
    });

    it('isClaimStatus validates correctly', () => {
      expect(isClaimStatus('ACTIVE')).toBe(true);
      expect(isClaimStatus('SUPERSEDED')).toBe(true);
      expect(isClaimStatus('CONDITIONAL')).toBe(true);
      expect(isClaimStatus('INVALID')).toBe(false);
      expect(isClaimStatus('')).toBe(false);
      expect(isClaimStatus(null)).toBe(false);
      expect(isClaimStatus(42)).toBe(false);
    });
  });

  describe('EvidenceType enum', () => {
    it('has exactly 5 valid types', () => {
      expect(Object.keys(EvidenceType)).toHaveLength(5);
      expect(EvidenceType.CHAPTER).toBe('CHAPTER');
      expect(EvidenceType.NOTE).toBe('NOTE');
      expect(EvidenceType.DECISION).toBe('DECISION');
      expect(EvidenceType.EXTERNAL).toBe('EXTERNAL');
      expect(EvidenceType.CANON_CLAIM).toBe('CANON_CLAIM');
    });

    it('isEvidenceType validates correctly', () => {
      expect(isEvidenceType('CHAPTER')).toBe(true);
      expect(isEvidenceType('INVALID')).toBe(false);
    });
  });

  describe('LineageSource enum', () => {
    it('has exactly 5 valid sources', () => {
      expect(Object.keys(LineageSource)).toHaveLength(5);
      expect(LineageSource.USER_INPUT).toBe('USER_INPUT');
      expect(LineageSource.GENESIS_FORGE).toBe('GENESIS_FORGE');
      expect(LineageSource.INFERENCE).toBe('INFERENCE');
      expect(LineageSource.IMPORT).toBe('IMPORT');
      expect(LineageSource.SYSTEM).toBe('SYSTEM');
    });

    it('isLineageSource validates correctly', () => {
      expect(isLineageSource('USER_INPUT')).toBe(true);
      expect(isLineageSource('INVALID')).toBe(false);
    });
  });

  describe('CanonError', () => {
    it('creates error with code and message', () => {
      const error = new CanonError(CanonErrorCode.INVALID_SUBJECT, 'Subject is empty');
      expect(error.code).toBe('INVALID_SUBJECT');
      expect(error.message).toContain('[INVALID_SUBJECT]');
      expect(error.message).toContain('Subject is empty');
      expect(error.name).toBe('CanonError');
    });

    it('creates error with details', () => {
      const error = new CanonError(CanonErrorCode.INVALID_VALUE_NAN, 'NaN detected', {
        path: 'value.nested.field',
      });
      expect(error.details).toEqual({ path: 'value.nested.field' });
    });

    it('all error codes are defined', () => {
      expect(CanonErrorCode.INVALID_SUBJECT).toBe('INVALID_SUBJECT');
      expect(CanonErrorCode.INVALID_PREDICATE).toBe('INVALID_PREDICATE');
      expect(CanonErrorCode.INVALID_VALUE_NAN).toBe('INVALID_VALUE_NAN');
      expect(CanonErrorCode.CHAIN_BROKEN).toBe('CHAIN_BROKEN');
      expect(CanonErrorCode.CONTRADICTION_DIRECT).toBe('CONTRADICTION_DIRECT');
      expect(CanonErrorCode.SENTINEL_DENY).toBe('SENTINEL_DENY');
    });
  });

  describe('isValidConfidence', () => {
    it('accepts values in [0.0, 1.0]', () => {
      expect(isValidConfidence(0)).toBe(true);
      expect(isValidConfidence(0.5)).toBe(true);
      expect(isValidConfidence(1)).toBe(true);
    });

    it('rejects values outside [0.0, 1.0]', () => {
      expect(isValidConfidence(-0.1)).toBe(false);
      expect(isValidConfidence(1.1)).toBe(false);
      expect(isValidConfidence(-1)).toBe(false);
      expect(isValidConfidence(2)).toBe(false);
    });

    it('rejects non-finite values (INV-E-NAN-01)', () => {
      expect(isValidConfidence(NaN)).toBe(false);
      expect(isValidConfidence(Infinity)).toBe(false);
      expect(isValidConfidence(-Infinity)).toBe(false);
    });

    it('rejects non-number types', () => {
      expect(isValidConfidence('0.5')).toBe(false);
      expect(isValidConfidence(null)).toBe(false);
      expect(isValidConfidence(undefined)).toBe(false);
    });
  });
});
