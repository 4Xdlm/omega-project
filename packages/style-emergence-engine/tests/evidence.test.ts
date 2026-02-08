import { describe, it, expect } from 'vitest';
import { createEEvidenceChainBuilder, verifyEEvidenceChain } from '../src/evidence.js';
import { TIMESTAMP } from './fixtures.js';

describe('Evidence Chain', () => {
  it('builds chain', () => {
    const builder = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    builder.addStep('step1', 'aaa', 'bbb', 'rule1', 'PASS');
    const chain = builder.build();
    expect(chain.output_id).toBe('EOUT-001');
    expect(chain.steps.length).toBe(1);
    expect(chain.chain_hash).toBeTruthy();
  });

  it('hash is stable', () => {
    const b1 = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    b1.addStep('step1', 'aaa', 'bbb', 'rule1', 'PASS');
    const b2 = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    b2.addStep('step1', 'aaa', 'bbb', 'rule1', 'PASS');
    expect(b1.build().chain_hash).toBe(b2.build().chain_hash);
  });

  it('verifies valid chain', () => {
    const builder = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    builder.addStep('step1', 'aaa', 'bbb', 'rule1', 'PASS');
    const chain = builder.build();
    expect(verifyEEvidenceChain(chain)).toBe(true);
  });

  it('detects tampered chain', () => {
    const builder = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    builder.addStep('step1', 'aaa', 'bbb', 'rule1', 'PASS');
    const chain = builder.build();
    const tampered = { ...chain, output_id: 'EOUT-TAMPERED' };
    expect(verifyEEvidenceChain(tampered)).toBe(false);
  });

  it('handles many steps', () => {
    const builder = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    for (let i = 0; i < 100; i++) {
      builder.addStep(`step-${i}`, `in-${i}`, `out-${i}`, `rule-${i}`, 'PASS');
    }
    const chain = builder.build();
    expect(chain.steps.length).toBe(100);
    expect(verifyEEvidenceChain(chain)).toBe(true);
  });

  it('handles FAIL in chain', () => {
    const builder = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    builder.addStep('step1', 'aaa', 'bbb', 'rule1', 'PASS');
    builder.addStep('step2', 'bbb', 'ccc', 'rule2', 'FAIL');
    const chain = builder.build();
    expect(chain.steps[1].verdict).toBe('FAIL');
    expect(verifyEEvidenceChain(chain)).toBe(true);
  });

  it('empty chain has valid hash', () => {
    const builder = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    const chain = builder.build();
    expect(chain.steps.length).toBe(0);
    expect(chain.chain_hash).toHaveLength(64);
    expect(verifyEEvidenceChain(chain)).toBe(true);
  });

  it('different output_id -> different hash', () => {
    const b1 = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    b1.addStep('step1', 'aaa', 'bbb', 'rule1', 'PASS');
    const b2 = createEEvidenceChainBuilder('EOUT-002', TIMESTAMP);
    b2.addStep('step1', 'aaa', 'bbb', 'rule1', 'PASS');
    expect(b1.build().chain_hash).not.toBe(b2.build().chain_hash);
  });

  it('steps preserve timestamp', () => {
    const builder = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    builder.addStep('step1', 'aaa', 'bbb', 'rule1', 'PASS');
    const chain = builder.build();
    expect(chain.steps[0].timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('chain hash is 64 chars', () => {
    const builder = createEEvidenceChainBuilder('EOUT-001', TIMESTAMP);
    builder.addStep('step1', 'aaa', 'bbb', 'rule1', 'PASS');
    const chain = builder.build();
    expect(chain.chain_hash).toHaveLength(64);
  });
});
