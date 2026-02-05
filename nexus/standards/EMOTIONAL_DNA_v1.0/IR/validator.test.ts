/**
 * EMOTIONAL DNA IR VALIDATOR TESTS
 *
 * Conformity tests for the Emotional DNA IR Standard v1.0
 */

import { describe, it, expect } from 'vitest';
import { validate, canonicalize, EmotionalDNA_IR_Schema } from './validator';

// === VALID MINIMAL CASE ===

const VALID_MINIMAL = {
  version: '1.0.0',
  identity: {
    id: 'a'.repeat(64),
    title: 'Test Work',
    language: 'en'
  },
  emotional_axes: {
    dimensions: 3,
    values: [0.5, -0.2, 0.8]
  },
  provenance: {
    source_hash: 'b'.repeat(64),
    analyzer_version: 'test@1.0.0',
    timestamp: '2026-02-05T12:00:00.000Z'
  }
};

// === VALID FULL CASE ===

const VALID_FULL = {
  version: '1.0.0',
  identity: {
    id: 'a'.repeat(64),
    title: 'Complete Test Work',
    language: 'en-US',
    work_version: '2.0'
  },
  emotional_axes: {
    dimensions: 14,
    values: Array(14).fill(0).map((_, i) => (i - 7) / 7),
    labels: ['joy', 'sadness', 'anger', 'fear', 'disgust', 'surprise',
             'anticipation', 'trust', 'love', 'optimism', 'submission',
             'awe', 'disapproval', 'aggressiveness'],
    confidence: 0.92
  },
  style_signatures: {
    rhythm: {
      avg_sentence_length: 15.5,
      variance: 8.2
    },
    density: {
      lexical_density: 0.65,
      word_frequency_profile: 'literary'
    },
    register: 'formal'
  },
  constraints: {
    taboos: ['violence', 'explicit'],
    intensity_bounds: {
      min: 0.2,
      max: 0.8
    },
    arc_constraints: [
      { type: 'progression', value: 'ascending' }
    ]
  },
  provenance: {
    source_hash: 'b'.repeat(64),
    analyzer_version: 'omega-genome@5.0.0',
    timestamp: '2026-02-05T12:00:00.000Z',
    license: 'analysis-permitted',
    consent: true
  },
  compatibility: {
    min_version: '1.0.0',
    max_version: '1.9.99'
  },
  proofs: {
    input_hashes: ['c'.repeat(64), 'd'.repeat(64)],
    merkle_root: 'e'.repeat(64)
  }
};

// === TESTS ===

describe('Emotional DNA IR Validator', () => {
  describe('Valid Cases', () => {
    it('accepts minimal valid IR', () => {
      const result = validate(VALID_MINIMAL);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts full valid IR', () => {
      const result = validate(VALID_FULL);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid Cases - Schema', () => {
    it('rejects missing required fields', () => {
      const invalid = { version: '1.0.0' };
      const result = validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects invalid version format', () => {
      const invalid = { ...VALID_MINIMAL, version: '2.0.0' };
      const result = validate(invalid);
      expect(result.valid).toBe(false);
    });

    it('rejects invalid hash format', () => {
      const invalid = {
        ...VALID_MINIMAL,
        identity: { ...VALID_MINIMAL.identity, id: 'invalid' }
      };
      const result = validate(invalid);
      expect(result.valid).toBe(false);
    });

    it('rejects values out of range', () => {
      const invalid = {
        ...VALID_MINIMAL,
        emotional_axes: {
          dimensions: 3,
          values: [1.5, -0.2, 0.8] // 1.5 is out of range
        }
      };
      const result = validate(invalid);
      expect(result.valid).toBe(false);
    });

    it('rejects mismatched dimensions', () => {
      const invalid = {
        ...VALID_MINIMAL,
        emotional_axes: {
          dimensions: 5, // says 5 but only 3 values
          values: [0.5, -0.2, 0.8]
        }
      };
      const result = validate(invalid);
      expect(result.valid).toBe(false);
    });

    it('rejects invalid language code', () => {
      const invalid = {
        ...VALID_MINIMAL,
        identity: { ...VALID_MINIMAL.identity, language: 'english' }
      };
      const result = validate(invalid);
      expect(result.valid).toBe(false);
    });
  });

  describe('Warnings', () => {
    it('warns on low confidence', () => {
      const lowConfidence = {
        ...VALID_MINIMAL,
        emotional_axes: {
          ...VALID_MINIMAL.emotional_axes,
          confidence: 0.3
        }
      };
      const result = validate(lowConfidence);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Low confidence score (<0.5)');
    });
  });

  describe('Canonicalization', () => {
    it('produces deterministic output', () => {
      const ir1 = { ...VALID_MINIMAL };
      const ir2 = { ...VALID_MINIMAL };

      const canonical1 = canonicalize(ir1);
      const canonical2 = canonicalize(ir2);

      expect(canonical1).toBe(canonical2);
    });

    it('removes null values', () => {
      const withNulls = {
        ...VALID_MINIMAL,
        style_signatures: null
      } as any;

      const canonical = canonicalize(withNulls);
      expect(canonical).not.toContain('null');
    });

    it('sorts keys alphabetically', () => {
      const canonical = canonicalize(VALID_MINIMAL);
      const parsed = JSON.parse(canonical);
      const keys = Object.keys(parsed);
      const sorted = [...keys].sort();
      expect(keys).toEqual(sorted);
    });
  });

  describe('Hash Stability', () => {
    it('same IR produces same canonical form', () => {
      // Create two objects with same data but different key order
      const ir1 = {
        version: '1.0.0',
        identity: VALID_MINIMAL.identity,
        emotional_axes: VALID_MINIMAL.emotional_axes,
        provenance: VALID_MINIMAL.provenance
      };

      const ir2 = {
        provenance: VALID_MINIMAL.provenance,
        emotional_axes: VALID_MINIMAL.emotional_axes,
        identity: VALID_MINIMAL.identity,
        version: '1.0.0'
      };

      expect(canonicalize(ir1)).toBe(canonicalize(ir2));
    });
  });
});
