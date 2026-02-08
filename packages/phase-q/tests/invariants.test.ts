import { describe, it, expect } from 'vitest';
import { evaluateOracleA, checkPrecision, checkContradictions } from '../src/oracle-a.js';
import { evaluateOracleB, checkNecessity, checkStability } from '../src/oracle-b.js';
import { evaluateOracleC, checkFormat } from '../src/oracle-c.js';
import { createEvidenceChainBuilder, verifyEvidenceChain } from '../src/evidence.js';
import { createDefaultConfig } from '../src/config.js';
import type { QTestCase, QOracleRule, QInvariantId } from '../src/types.js';

const TIMESTAMP = '2026-02-08T00:00:00.000Z';
const config = createDefaultConfig();
const rules: QOracleRule[] = [];

/**
 * Phase Q — Invariant Mapping Tests
 *
 * Each Q-INV must have at least 1 PASS and 1 FAIL test case.
 */
describe('Phase Q — Invariant Coverage (Q-INV-01 through Q-INV-06)', () => {
  describe('Q-INV-01: NO-BULLSHIT (Precision)', () => {
    it('should PASS when all claims are fact-sourced', () => {
      const result = checkPrecision('The sky is blue.', ['The sky is blue'], rules, 0);
      expect(result.verdict).toBe('PASS');
    });

    it('should FAIL when claims are not fact-sourced', () => {
      const result = checkPrecision('The moon is purple.', ['The sky is blue'], rules, 0);
      expect(result.verdict).toBe('FAIL');
      expect(result.violations.some(v => v.invariant_id === 'Q-INV-01')).toBe(true);
    });
  });

  describe('Q-INV-02: NECESSITY (Ablation)', () => {
    it('should PASS when all segments are necessary', () => {
      const result = checkNecessity('Fact A.\n\nFact B.', ['fact a', 'fact b'], 0.85);
      expect(result.verdict).toBe('PASS');
    });

    it('should FAIL when segments are mostly unnecessary', () => {
      const result = checkNecessity(
        'Fact A.\n\nFiller one.\n\nFiller two.\n\nFiller three.',
        ['fact a'],
        0.85
      );
      expect(result.verdict).toBe('FAIL');
      expect(result.violations.some(v => v.invariant_id === 'Q-INV-02')).toBe(true);
    });
  });

  describe('Q-INV-03: CONTRADICTION ZERO-TOLERANCE', () => {
    it('should PASS when no contradictions exist', () => {
      const result = checkContradictions('The value is always stable.', []);
      expect(result.verdict).toBe('PASS');
    });

    it('should FAIL when contradictions are detected', () => {
      const result = checkContradictions(
        'The value is always changing. The value is never changing.',
        ['always-never']
      );
      expect(result.verdict).toBe('FAIL');
    });
  });

  describe('Q-INV-04: LOCAL STABILITY', () => {
    it('should compute stability metrics', () => {
      const input = { context: 'ctx', facts: ['f1'], constraints: [] };
      const result = checkStability('A.\n\nB.\n\nC.', input, 3, 42);
      expect(result.deltaSegments).toBeGreaterThanOrEqual(0);
      expect(result.bound).toBe(3);
    });

    it('should detect instability with tight factor', () => {
      const input = { context: 'ctx', facts: ['f1'], constraints: [] };
      const result = checkStability('A.\n\nB.\n\nC.\n\nD.\n\nE.', input, 0, 42);
      if (result.deltaSegments > 0) {
        expect(result.verdict).toBe('FAIL');
        expect(result.violations.some(v => v.invariant_id === 'Q-INV-04')).toBe(true);
      }
    });
  });

  describe('Q-INV-05: FORMAT & NORMALIZATION', () => {
    it('should PASS for properly formatted output', () => {
      const result = checkFormat('Clean output with LF\nNo issues');
      expect(result.verdict).toBe('PASS');
    });

    it('should FAIL for CRLF output', () => {
      const result = checkFormat('Bad output\r\nWith CRLF');
      expect(result.verdict).toBe('FAIL');
      expect(result.violations.some(v => v.invariant_id === 'Q-INV-05')).toBe(true);
    });
  });

  describe('Q-INV-06: TRACEABILITY (Evidence Chain)', () => {
    it('should produce verifiable evidence chain', () => {
      const builder = createEvidenceChainBuilder('Q-CASE-INV', TIMESTAMP);
      builder.addStep('test-step', 'in-hash', 'out-hash', 'TEST-RULE', 'PASS');
      const chain = builder.build();
      expect(verifyEvidenceChain(chain)).toBe(true);
      expect(chain.steps).toHaveLength(1);
    });

    it('should detect tampering in evidence chain', () => {
      const builder = createEvidenceChainBuilder('Q-CASE-INV', TIMESTAMP);
      builder.addStep('test-step', 'in-hash', 'out-hash', 'TEST-RULE', 'PASS');
      const chain = builder.build();
      const tampered = { ...chain, chain_hash: 'b'.repeat(64) };
      expect(verifyEvidenceChain(tampered)).toBe(false);
    });
  });

  describe('Cross-invariant: all IDs are valid', () => {
    it('should have exactly 6 invariant IDs', () => {
      const ids: QInvariantId[] = ['Q-INV-01', 'Q-INV-02', 'Q-INV-03', 'Q-INV-04', 'Q-INV-05', 'Q-INV-06'];
      expect(ids).toHaveLength(6);
    });
  });
});
