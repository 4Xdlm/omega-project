/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — CONSTANTS TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module tests/constants.test
 * @version 3.27.0
 * 
 * INVARIANTS TESTED:
 * - INV-CONST-01: All constants are immutable (Object.freeze)
 * - INV-CONST-02: Version follows SemVer strictly
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  // Version
  SENTINEL_VERSION,
  IDL_VERSION,
  CORPUS_VERSION,
  
  // Cryptographic
  HASH_ALGORITHM,
  SIGNATURE_ALGORITHM,
  HASH_LENGTH_BYTES,
  HASH_LENGTH_HEX,
  
  // Proof weights
  PROOF_STRENGTH_WEIGHTS,
  
  // Falsification
  FALSIFICATION_WEIGHTS,
  
  // Negative space
  IMPOSSIBILITY_IMPACT_WEIGHTS,
  MAX_NEGATIVE_SCORE,
  
  // Temporal
  DEFAULT_DECAY_LAMBDA,
  CONFIDENCE_THRESHOLDS,
  THREAT_FACTORS,
  
  // Scrutiny
  SCRUTINY_BASE,
  SCRUTINY_MULTIPLIERS,
  
  // Certification
  CERTIFICATION_LEVELS,
  
  // Axioms
  AXIOM_IDS,
  
  // Impossibilities
  IMPOSSIBILITY_CLASSES,
  
  // Validation patterns
  VALIDATION_PATTERNS,
  
  // Type guards
  isCertificationLevel,
  isAxiomId,
  isImpossibilityClass,
  isValidSHA256,
  isValidInvariantId,
  isValidSemVer,
  isValidISO8601,
  isValidUUIDv4
} from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: VERSIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Versions', () => {
  
  describe('INV-CONST-02: SemVer Compliance', () => {
    
    it('SENTINEL_VERSION should be valid SemVer', () => {
      expect(isValidSemVer(SENTINEL_VERSION)).toBe(true);
    });
    
    it('IDL_VERSION should be valid SemVer', () => {
      expect(isValidSemVer(IDL_VERSION)).toBe(true);
    });
    
    it('CORPUS_VERSION should be valid SemVer', () => {
      expect(isValidSemVer(CORPUS_VERSION)).toBe(true);
    });
    
    it('SENTINEL_VERSION should be 3.28.0', () => {
      expect(SENTINEL_VERSION).toBe('3.28.0');
    });
    
    it('IDL_VERSION should be 2.0.0', () => {
      expect(IDL_VERSION).toBe('2.0.0');
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: CRYPTOGRAPHIC CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cryptographic Constants', () => {
  
  it('should use SHA-256', () => {
    expect(HASH_ALGORITHM).toBe('SHA-256');
  });
  
  it('should use ED25519 for signatures', () => {
    expect(SIGNATURE_ALGORITHM).toBe('ED25519');
  });
  
  it('should have correct hash length', () => {
    expect(HASH_LENGTH_BYTES).toBe(32);
    expect(HASH_LENGTH_HEX).toBe(64);
    expect(HASH_LENGTH_HEX).toBe(HASH_LENGTH_BYTES * 2);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: PROOF STRENGTH WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Proof Strength Weights', () => {
  
  describe('INV-CONST-01: Immutability', () => {
    
    it('should be frozen', () => {
      expect(Object.isFrozen(PROOF_STRENGTH_WEIGHTS)).toBe(true);
    });
    
  });
  
  describe('Values', () => {
    
    it('should have correct weights', () => {
      expect(PROOF_STRENGTH_WEIGHTS.OMEGA).toBe(5);
      expect(PROOF_STRENGTH_WEIGHTS.LAMBDA).toBe(4);
      expect(PROOF_STRENGTH_WEIGHTS.SIGMA).toBe(3);
      expect(PROOF_STRENGTH_WEIGHTS.DELTA).toBe(2);
      expect(PROOF_STRENGTH_WEIGHTS.EPSILON).toBe(1);
    });
    
    it('should be in strictly decreasing order', () => {
      expect(PROOF_STRENGTH_WEIGHTS.OMEGA).toBeGreaterThan(PROOF_STRENGTH_WEIGHTS.LAMBDA);
      expect(PROOF_STRENGTH_WEIGHTS.LAMBDA).toBeGreaterThan(PROOF_STRENGTH_WEIGHTS.SIGMA);
      expect(PROOF_STRENGTH_WEIGHTS.SIGMA).toBeGreaterThan(PROOF_STRENGTH_WEIGHTS.DELTA);
      expect(PROOF_STRENGTH_WEIGHTS.DELTA).toBeGreaterThan(PROOF_STRENGTH_WEIGHTS.EPSILON);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: FALSIFICATION WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Falsification Weights', () => {
  
  describe('INV-CONST-01: Immutability', () => {
    
    it('should be frozen', () => {
      expect(Object.isFrozen(FALSIFICATION_WEIGHTS)).toBe(true);
    });
    
  });
  
  describe('Values', () => {
    
    it('should sum to 1.0', () => {
      const sum = 
        FALSIFICATION_WEIGHTS.STRUCTURAL +
        FALSIFICATION_WEIGHTS.SEMANTIC +
        FALSIFICATION_WEIGHTS.TEMPORAL +
        FALSIFICATION_WEIGHTS.EXISTENTIAL;
      expect(sum).toBeCloseTo(1.0, 10);
    });
    
    it('should have correct individual weights', () => {
      expect(FALSIFICATION_WEIGHTS.STRUCTURAL).toBe(0.30);
      expect(FALSIFICATION_WEIGHTS.SEMANTIC).toBe(0.25);
      expect(FALSIFICATION_WEIGHTS.TEMPORAL).toBe(0.25);
      expect(FALSIFICATION_WEIGHTS.EXISTENTIAL).toBe(0.20);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: NEGATIVE SPACE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Negative Space Constants', () => {
  
  it('should have impact weights frozen', () => {
    expect(Object.isFrozen(IMPOSSIBILITY_IMPACT_WEIGHTS)).toBe(true);
  });
  
  it('should have correct impact weights', () => {
    expect(IMPOSSIBILITY_IMPACT_WEIGHTS.CATASTROPHIC).toBe(3);
    expect(IMPOSSIBILITY_IMPACT_WEIGHTS.SEVERE).toBe(2);
    expect(IMPOSSIBILITY_IMPACT_WEIGHTS.MODERATE).toBe(1);
  });
  
  it('should have MAX_NEGATIVE_SCORE = 30', () => {
    expect(MAX_NEGATIVE_SCORE).toBe(30);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: TEMPORAL CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Temporal Constants', () => {
  
  describe('Decay Lambda', () => {
    
    it('should be 0.997', () => {
      expect(DEFAULT_DECAY_LAMBDA).toBe(0.997);
    });
    
    it('should be between 0 and 1', () => {
      expect(DEFAULT_DECAY_LAMBDA).toBeGreaterThan(0);
      expect(DEFAULT_DECAY_LAMBDA).toBeLessThan(1);
    });
    
  });
  
  describe('Confidence Thresholds', () => {
    
    it('should be frozen', () => {
      expect(Object.isFrozen(CONFIDENCE_THRESHOLDS)).toBe(true);
    });
    
    it('should have correct values', () => {
      expect(CONFIDENCE_THRESHOLDS.WARNING).toBe(0.95);
      expect(CONFIDENCE_THRESHOLDS.REPROVE).toBe(0.90);
      expect(CONFIDENCE_THRESHOLDS.EXPIRED).toBe(0.80);
    });
    
    it('should be in decreasing order', () => {
      expect(CONFIDENCE_THRESHOLDS.WARNING).toBeGreaterThan(CONFIDENCE_THRESHOLDS.REPROVE);
      expect(CONFIDENCE_THRESHOLDS.REPROVE).toBeGreaterThan(CONFIDENCE_THRESHOLDS.EXPIRED);
    });
    
  });
  
  describe('Threat Factors', () => {
    
    it('should be frozen', () => {
      expect(Object.isFrozen(THREAT_FACTORS)).toBe(true);
    });
    
    it('should have NORMAL = 1.0', () => {
      expect(THREAT_FACTORS.NORMAL).toBe(1.0);
    });
    
    it('should decrease with severity', () => {
      expect(THREAT_FACTORS.CVE_MINOR).toBeLessThan(THREAT_FACTORS.NORMAL);
      expect(THREAT_FACTORS.CVE_MAJOR).toBeLessThan(THREAT_FACTORS.CVE_MINOR);
      expect(THREAT_FACTORS.CVE_CRITICAL).toBeLessThan(THREAT_FACTORS.CVE_MAJOR);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SCRUTINY CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scrutiny Constants', () => {
  
  it('SCRUTINY_BASE should be frozen', () => {
    expect(Object.isFrozen(SCRUTINY_BASE)).toBe(true);
  });
  
  it('SCRUTINY_MULTIPLIERS should be frozen', () => {
    expect(Object.isFrozen(SCRUTINY_MULTIPLIERS)).toBe(true);
  });
  
  it('should have reasonable base values', () => {
    expect(SCRUTINY_BASE.MIN_ADVERSARIAL_HOURS).toBe(1);
    expect(SCRUTINY_BASE.BASE_COVERAGE).toBe(0.70);
    expect(SCRUTINY_BASE.MAX_COVERAGE).toBe(0.99);
    expect(SCRUTINY_BASE.MAX_REPROVE_DAYS).toBe(180);
    expect(SCRUTINY_BASE.MIN_REPROVE_DAYS).toBe(7);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: CERTIFICATION LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Certification Levels', () => {
  
  it('should be frozen', () => {
    expect(Object.isFrozen(CERTIFICATION_LEVELS)).toBe(true);
  });
  
  it('should have 7 levels', () => {
    expect(CERTIFICATION_LEVELS).toHaveLength(7);
  });
  
  it('should be in ascending order', () => {
    expect([...CERTIFICATION_LEVELS]).toEqual([
      'VOID',
      'BRONZE',
      'SILVER',
      'GOLD',
      'PLATINUM',
      'OMEGA',
      'TRANSCENDENT'
    ]);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: AXIOM IDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Axiom IDs', () => {
  
  it('should be frozen', () => {
    expect(Object.isFrozen(AXIOM_IDS)).toBe(true);
  });
  
  it('should have 5 axioms', () => {
    expect(AXIOM_IDS).toHaveLength(5);
  });
  
  it('should contain Greek letter identifiers', () => {
    expect([...AXIOM_IDS]).toEqual(['AX-Ω', 'AX-Λ', 'AX-Σ', 'AX-Δ', 'AX-Ε']);
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: IMPOSSIBILITY CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Impossibility Classes', () => {
  
  it('should be frozen', () => {
    expect(Object.isFrozen(IMPOSSIBILITY_CLASSES)).toBe(true);
  });
  
  it('should have 8 classes', () => {
    expect(IMPOSSIBILITY_CLASSES).toHaveLength(8);
  });
  
  it('should all start with CANNOT_', () => {
    for (const cls of IMPOSSIBILITY_CLASSES) {
      expect(cls.startsWith('CANNOT_')).toBe(true);
    }
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: VALIDATION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Validation Patterns', () => {
  
  describe('INVARIANT_ID', () => {
    
    it('should match valid invariant IDs', () => {
      expect(VALIDATION_PATTERNS.INVARIANT_ID.test('INV-AX-01')).toBe(true);
      expect(VALIDATION_PATTERNS.INVARIANT_ID.test('INV-PROOF-001')).toBe(true);
      expect(VALIDATION_PATTERNS.INVARIANT_ID.test('INV-CONST-12')).toBe(true);
    });
    
    it('should reject invalid invariant IDs', () => {
      expect(VALIDATION_PATTERNS.INVARIANT_ID.test('AX-01')).toBe(false);
      expect(VALIDATION_PATTERNS.INVARIANT_ID.test('INV-A-1')).toBe(false);
      expect(VALIDATION_PATTERNS.INVARIANT_ID.test('invalid')).toBe(false);
    });
    
  });
  
  describe('SHA256_HASH', () => {
    
    it('should match valid SHA-256 hashes', () => {
      const validHash = 'a'.repeat(64);
      expect(VALIDATION_PATTERNS.SHA256_HASH.test(validHash)).toBe(true);
      expect(VALIDATION_PATTERNS.SHA256_HASH.test('0123456789abcdef'.repeat(4))).toBe(true);
    });
    
    it('should reject invalid hashes', () => {
      expect(VALIDATION_PATTERNS.SHA256_HASH.test('a'.repeat(63))).toBe(false);
      expect(VALIDATION_PATTERNS.SHA256_HASH.test('a'.repeat(65))).toBe(false);
      expect(VALIDATION_PATTERNS.SHA256_HASH.test('g'.repeat(64))).toBe(false);
    });
    
  });
  
  describe('SEMVER', () => {
    
    it('should match valid SemVer versions', () => {
      expect(VALIDATION_PATTERNS.SEMVER.test('1.0.0')).toBe(true);
      expect(VALIDATION_PATTERNS.SEMVER.test('3.27.0')).toBe(true);
      expect(VALIDATION_PATTERNS.SEMVER.test('0.0.1')).toBe(true);
      expect(VALIDATION_PATTERNS.SEMVER.test('1.0.0-alpha')).toBe(true);
      expect(VALIDATION_PATTERNS.SEMVER.test('1.0.0+build')).toBe(true);
    });
    
    it('should reject invalid versions', () => {
      expect(VALIDATION_PATTERNS.SEMVER.test('1.0')).toBe(false);
      expect(VALIDATION_PATTERNS.SEMVER.test('v1.0.0')).toBe(false);
      expect(VALIDATION_PATTERNS.SEMVER.test('1.0.0.0')).toBe(false);
    });
    
  });
  
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Type Guards', () => {
  
  describe('isCertificationLevel', () => {
    
    it('should return true for valid levels', () => {
      for (const level of CERTIFICATION_LEVELS) {
        expect(isCertificationLevel(level)).toBe(true);
      }
    });
    
    it('should return false for invalid values', () => {
      expect(isCertificationLevel('INVALID')).toBe(false);
      expect(isCertificationLevel(123)).toBe(false);
      expect(isCertificationLevel(null)).toBe(false);
    });
    
  });
  
  describe('isAxiomId', () => {
    
    it('should return true for valid axiom IDs', () => {
      for (const id of AXIOM_IDS) {
        expect(isAxiomId(id)).toBe(true);
      }
    });
    
    it('should return false for invalid values', () => {
      expect(isAxiomId('AX-X')).toBe(false);
      expect(isAxiomId('OMEGA')).toBe(false);
    });
    
  });
  
  describe('isImpossibilityClass', () => {
    
    it('should return true for valid classes', () => {
      for (const cls of IMPOSSIBILITY_CLASSES) {
        expect(isImpossibilityClass(cls)).toBe(true);
      }
    });
    
    it('should return false for invalid values', () => {
      expect(isImpossibilityClass('CANNOT_FLY')).toBe(false);
      expect(isImpossibilityClass('LEAK')).toBe(false);
    });
    
  });
  
  describe('isValidSHA256', () => {
    
    it('should validate correct hashes', () => {
      expect(isValidSHA256('a'.repeat(64))).toBe(true);
      expect(isValidSHA256('0123456789abcdef'.repeat(4))).toBe(true);
    });
    
    it('should reject incorrect hashes', () => {
      expect(isValidSHA256('a'.repeat(63))).toBe(false);
      expect(isValidSHA256('A'.repeat(64))).toBe(false);  // uppercase
    });
    
  });
  
  describe('isValidInvariantId', () => {
    
    it('should validate correct IDs', () => {
      expect(isValidInvariantId('INV-AX-01')).toBe(true);
      expect(isValidInvariantId('INV-PROOF-001')).toBe(true);
    });
    
    it('should reject incorrect IDs', () => {
      expect(isValidInvariantId('INVALID')).toBe(false);
      expect(isValidInvariantId('INV-A-1')).toBe(false);
    });
    
  });
  
  describe('isValidSemVer', () => {
    
    it('should validate correct versions', () => {
      expect(isValidSemVer('1.0.0')).toBe(true);
      expect(isValidSemVer('3.27.0')).toBe(true);
    });
    
    it('should reject incorrect versions', () => {
      expect(isValidSemVer('1.0')).toBe(false);
      expect(isValidSemVer('v1.0.0')).toBe(false);
    });
    
  });
  
  describe('isValidISO8601', () => {
    
    it('should validate correct timestamps', () => {
      expect(isValidISO8601('2026-01-06T00:00:00Z')).toBe(true);
      expect(isValidISO8601('2026-01-06T12:34:56.789Z')).toBe(true);
    });
    
    it('should reject incorrect timestamps', () => {
      expect(isValidISO8601('2026-01-06')).toBe(false);
      expect(isValidISO8601('2026-01-06 00:00:00')).toBe(false);
    });
    
  });
  
  describe('isValidUUIDv4', () => {
    
    it('should validate correct UUIDs', () => {
      expect(isValidUUIDv4('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUIDv4('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe(true);
    });
    
    it('should reject incorrect UUIDs', () => {
      expect(isValidUUIDv4('not-a-uuid')).toBe(false);
      expect(isValidUUIDv4('550e8400-e29b-11d4-a716-446655440000')).toBe(false);  // v1
    });
    
  });
  
});
