import { describe, it, expect } from 'vitest';
import { createEvidenceChainBuilder, verifyEvidenceChain, mergeEvidenceChains } from '../src/evidence.js';

const TIMESTAMP = '2026-02-08T00:00:00.000Z';

describe('Phase Q — Evidence Chain (Q-INV-06)', () => {
  describe('createEvidenceChainBuilder', () => {
    it('should create a chain with added steps', () => {
      const builder = createEvidenceChainBuilder('Q-CASE-0001', TIMESTAMP);
      builder.addStep('step-1', 'hash-in', 'hash-out', 'RULE-01', 'PASS');
      const chain = builder.build();

      expect(chain.case_id).toBe('Q-CASE-0001');
      expect(chain.steps).toHaveLength(1);
      expect(chain.steps[0]!.step).toBe('step-1');
      expect(chain.chain_hash).toHaveLength(64);
    });

    it('should produce deterministic chain_hash for same steps', () => {
      const builder1 = createEvidenceChainBuilder('Q-CASE-0001', TIMESTAMP);
      builder1.addStep('step-1', 'hash-in', 'hash-out', 'RULE-01', 'PASS');
      const chain1 = builder1.build();

      const builder2 = createEvidenceChainBuilder('Q-CASE-0001', TIMESTAMP);
      builder2.addStep('step-1', 'hash-in', 'hash-out', 'RULE-01', 'PASS');
      const chain2 = builder2.build();

      expect(chain1.chain_hash).toBe(chain2.chain_hash);
    });

    it('should produce different chain_hash for different steps', () => {
      const builder1 = createEvidenceChainBuilder('Q-CASE-0001', TIMESTAMP);
      builder1.addStep('step-1', 'hash-in', 'hash-out', 'RULE-01', 'PASS');
      const chain1 = builder1.build();

      const builder2 = createEvidenceChainBuilder('Q-CASE-0001', TIMESTAMP);
      builder2.addStep('step-1', 'hash-in', 'hash-out', 'RULE-01', 'FAIL');
      const chain2 = builder2.build();

      expect(chain1.chain_hash).not.toBe(chain2.chain_hash);
    });

    it('should use injected timestamp (no Date.now)', () => {
      const builder = createEvidenceChainBuilder('Q-CASE-0001', TIMESTAMP);
      builder.addStep('step-1', 'h1', 'h2', 'R1', 'PASS');
      const chain = builder.build();

      expect(chain.steps[0]!.timestamp_deterministic).toBe(TIMESTAMP);
    });
  });

  describe('verifyEvidenceChain', () => {
    it('should return true for valid chain', () => {
      const builder = createEvidenceChainBuilder('Q-CASE-0001', TIMESTAMP);
      builder.addStep('step-1', 'h1', 'h2', 'R1', 'PASS');
      const chain = builder.build();

      expect(verifyEvidenceChain(chain)).toBe(true);
    });

    it('should return false for tampered chain', () => {
      const builder = createEvidenceChainBuilder('Q-CASE-0001', TIMESTAMP);
      builder.addStep('step-1', 'h1', 'h2', 'R1', 'PASS');
      const chain = builder.build();

      const tampered = { ...chain, chain_hash: 'a'.repeat(64) };
      expect(verifyEvidenceChain(tampered)).toBe(false);
    });
  });

  describe('mergeEvidenceChains', () => {
    it('should merge multiple chains into one', () => {
      const b1 = createEvidenceChainBuilder('Q-CASE-0001', TIMESTAMP);
      b1.addStep('step-a', 'h1', 'h2', 'R1', 'PASS');
      const b2 = createEvidenceChainBuilder('Q-CASE-0001', TIMESTAMP);
      b2.addStep('step-b', 'h3', 'h4', 'R2', 'PASS');

      const merged = mergeEvidenceChains('Q-CASE-0001', [b1.build(), b2.build()]);

      expect(merged.steps).toHaveLength(2);
      expect(merged.case_id).toBe('Q-CASE-0001');
      expect(verifyEvidenceChain(merged)).toBe(true);
    });

    it('should handle empty chains array', () => {
      const merged = mergeEvidenceChains('Q-CASE-0001', []);
      expect(merged.steps).toHaveLength(0);
      expect(verifyEvidenceChain(merged)).toBe(true);
    });
  });
});
