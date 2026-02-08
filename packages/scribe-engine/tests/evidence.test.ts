import { describe, it, expect } from 'vitest';
import { createSEvidenceChainBuilder, verifySEvidenceChain } from '../src/evidence.js';
import { TIMESTAMP } from './fixtures.js';

describe('Evidence Chain', () => {
  it('builds chain with steps', () => {
    const builder = createSEvidenceChainBuilder('OUT-001', TIMESTAMP);
    builder.addStep('step1', 'a'.repeat(64), 'b'.repeat(64), 'rule1', 'PASS');
    builder.addStep('step2', 'b'.repeat(64), 'c'.repeat(64), 'rule2', 'PASS');
    const chain = builder.build();
    expect(chain.steps).toHaveLength(2);
    expect(chain.output_id).toBe('OUT-001');
  });

  it('produces stable hash', () => {
    const b1 = createSEvidenceChainBuilder('OUT-001', TIMESTAMP);
    b1.addStep('s1', 'a'.repeat(64), 'b'.repeat(64), 'r1', 'PASS');
    const c1 = b1.build();

    const b2 = createSEvidenceChainBuilder('OUT-001', TIMESTAMP);
    b2.addStep('s1', 'a'.repeat(64), 'b'.repeat(64), 'r1', 'PASS');
    const c2 = b2.build();

    expect(c1.chain_hash).toBe(c2.chain_hash);
  });

  it('verifies valid chain', () => {
    const builder = createSEvidenceChainBuilder('OUT-001', TIMESTAMP);
    builder.addStep('s1', 'a'.repeat(64), 'b'.repeat(64), 'r1', 'PASS');
    const chain = builder.build();
    expect(verifySEvidenceChain(chain)).toBe(true);
  });

  it('handles 100 steps', () => {
    const builder = createSEvidenceChainBuilder('OUT-LARGE', TIMESTAMP);
    for (let i = 0; i < 100; i++) {
      builder.addStep(`step-${i}`, `${i}`.padStart(64, '0'), `${i + 1}`.padStart(64, '0'), `rule-${i}`, 'PASS');
    }
    const chain = builder.build();
    expect(chain.steps).toHaveLength(100);
    expect(verifySEvidenceChain(chain)).toBe(true);
  });

  it('handles empty chain', () => {
    const builder = createSEvidenceChainBuilder('OUT-EMPTY', TIMESTAMP);
    const chain = builder.build();
    expect(chain.steps).toHaveLength(0);
    expect(chain.chain_hash).toBeTruthy();
  });

  it('detects tampered chain', () => {
    const builder = createSEvidenceChainBuilder('OUT-001', TIMESTAMP);
    builder.addStep('s1', 'a'.repeat(64), 'b'.repeat(64), 'r1', 'PASS');
    const chain = builder.build();
    const tampered = { ...chain, chain_hash: 'x'.repeat(64) };
    expect(verifySEvidenceChain(tampered)).toBe(false);
  });

  it('different output_id produces different hash', () => {
    const b1 = createSEvidenceChainBuilder('OUT-A', TIMESTAMP);
    b1.addStep('s1', 'a'.repeat(64), 'b'.repeat(64), 'r1', 'PASS');
    const c1 = b1.build();

    const b2 = createSEvidenceChainBuilder('OUT-B', TIMESTAMP);
    b2.addStep('s1', 'a'.repeat(64), 'b'.repeat(64), 'r1', 'PASS');
    const c2 = b2.build();

    expect(c1.chain_hash).not.toBe(c2.chain_hash);
  });

  it('FAIL verdict in chain step', () => {
    const builder = createSEvidenceChainBuilder('OUT-FAIL', TIMESTAMP);
    builder.addStep('fail-step', 'a'.repeat(64), 'b'.repeat(64), 'fail-rule', 'FAIL');
    const chain = builder.build();
    expect(chain.steps[0].verdict).toBe('FAIL');
    expect(verifySEvidenceChain(chain)).toBe(true);
  });
});
