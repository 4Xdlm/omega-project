import { describe, it, expect } from 'vitest';
import { createEvidenceChainBuilder, verifyEvidenceChain } from '../src/evidence.js';
import { TIMESTAMP } from './fixtures.js';

describe('Evidence Chain', () => {
  it('should produce stable hash', () => {
    const builder = createEvidenceChainBuilder('PLAN-001', TIMESTAMP);
    builder.addStep('step1', 'h1', 'h2', 'rule1', 'PASS');
    const chain = builder.build();
    expect(chain.chain_hash).toBeTruthy();
    expect(chain.chain_hash.length).toBe(64);
  });

  it('should produce identical hash on two builds with same data', () => {
    const b1 = createEvidenceChainBuilder('PLAN-001', TIMESTAMP);
    b1.addStep('step1', 'h1', 'h2', 'rule1', 'PASS');
    const c1 = b1.build();

    const b2 = createEvidenceChainBuilder('PLAN-001', TIMESTAMP);
    b2.addStep('step1', 'h1', 'h2', 'rule1', 'PASS');
    const c2 = b2.build();

    expect(c1.chain_hash).toBe(c2.chain_hash);
  });

  it('should maintain step order', () => {
    const builder = createEvidenceChainBuilder('PLAN-001', TIMESTAMP);
    builder.addStep('step1', 'h1', 'h2', 'rule1', 'PASS');
    builder.addStep('step2', 'h2', 'h3', 'rule2', 'PASS');
    builder.addStep('step3', 'h3', 'h4', 'rule3', 'FAIL');
    const chain = builder.build();
    expect(chain.steps.length).toBe(3);
    expect(chain.steps[0].step).toBe('step1');
    expect(chain.steps[2].step).toBe('step3');
  });

  it('should handle empty chain', () => {
    const builder = createEvidenceChainBuilder('PLAN-EMPTY', TIMESTAMP);
    const chain = builder.build();
    expect(chain.steps.length).toBe(0);
    expect(chain.chain_hash).toBeTruthy();
    expect(verifyEvidenceChain(chain)).toBe(true);
  });

  it('should handle 100 steps', () => {
    const builder = createEvidenceChainBuilder('PLAN-100', TIMESTAMP);
    for (let i = 0; i < 100; i++) {
      builder.addStep(`step-${i}`, `in-${i}`, `out-${i}`, `rule-${i}`, 'PASS');
    }
    const chain = builder.build();
    expect(chain.steps.length).toBe(100);
    expect(verifyEvidenceChain(chain)).toBe(true);
  });

  it('should include FAIL verdicts in chain', () => {
    const builder = createEvidenceChainBuilder('PLAN-FAIL', TIMESTAMP);
    builder.addStep('step1', 'h1', 'h2', 'rule1', 'FAIL');
    const chain = builder.build();
    expect(chain.steps[0].verdict).toBe('FAIL');
    expect(verifyEvidenceChain(chain)).toBe(true);
  });
});
