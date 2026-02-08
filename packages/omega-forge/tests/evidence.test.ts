/**
 * OMEGA Forge — Evidence Chain Tests
 * Phase C.5 — 8 tests for createEvidenceStep, buildF5EvidenceChain, verifyF5EvidenceChain
 */

import { describe, it, expect } from 'vitest';
import { createEvidenceStep, buildF5EvidenceChain, verifyF5EvidenceChain } from '../src/evidence.js';
import { TIMESTAMP } from './fixtures.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);

describe('evidence', () => {
  it('builds a chain from steps', () => {
    const step1 = createEvidenceStep('V0_VALIDATE', HASH_A, HASH_B, 'F5-INV-01', 'PASS', TIMESTAMP);
    const step2 = createEvidenceStep('V1_TRAJECTORY', HASH_B, HASH_C, 'F5-INV-03', 'PASS', TIMESTAMP);
    const chain = buildF5EvidenceChain('FORGE-001', [step1, step2]);
    expect(chain.forge_id).toBe('FORGE-001');
    expect(chain.steps).toHaveLength(2);
    expect(typeof chain.chain_hash).toBe('string');
    expect(chain.chain_hash).toHaveLength(64);
  });

  it('produces stable hash for same input', () => {
    const step = createEvidenceStep('V0_VALIDATE', HASH_A, HASH_B, 'F5-INV-01', 'PASS', TIMESTAMP);
    const chain1 = buildF5EvidenceChain('FORGE-X', [step]);
    const chain2 = buildF5EvidenceChain('FORGE-X', [step]);
    expect(chain1.chain_hash).toBe(chain2.chain_hash);
  });

  it('verifies a valid chain returns true', () => {
    const step = createEvidenceStep('V0_VALIDATE', HASH_A, HASH_B, 'F5-INV-01', 'PASS', TIMESTAMP);
    const chain = buildF5EvidenceChain('FORGE-V', [step]);
    expect(verifyF5EvidenceChain(chain)).toBe(true);
  });

  it('returns false for tampered chain', () => {
    const step = createEvidenceStep('V0_VALIDATE', HASH_A, HASH_B, 'F5-INV-01', 'PASS', TIMESTAMP);
    const chain = buildF5EvidenceChain('FORGE-T', [step]);
    const tampered = { ...chain, chain_hash: 'x'.repeat(64) };
    expect(verifyF5EvidenceChain(tampered)).toBe(false);
  });

  it('includes all steps in the chain', () => {
    const steps = [
      createEvidenceStep('V0', HASH_A, HASH_B, 'rule-0', 'PASS', TIMESTAMP),
      createEvidenceStep('V1', HASH_B, HASH_C, 'rule-1', 'PASS', TIMESTAMP),
      createEvidenceStep('V2', HASH_C, HASH_A, 'rule-2', 'FAIL', TIMESTAMP),
    ];
    const chain = buildF5EvidenceChain('FORGE-ALL', steps);
    expect(chain.steps).toHaveLength(3);
    expect(chain.steps[0].step).toBe('V0');
    expect(chain.steps[1].step).toBe('V1');
    expect(chain.steps[2].step).toBe('V2');
  });

  it('is deterministic across repeated builds', () => {
    const step = createEvidenceStep('V0', HASH_A, HASH_B, 'rule', 'PASS', TIMESTAMP);
    const hashes = Array.from({ length: 3 }, () =>
      buildF5EvidenceChain('FORGE-D', [step]).chain_hash,
    );
    expect(hashes[0]).toBe(hashes[1]);
    expect(hashes[1]).toBe(hashes[2]);
  });

  it('handles empty chain', () => {
    const chain = buildF5EvidenceChain('FORGE-EMPTY', []);
    expect(chain.steps).toHaveLength(0);
    expect(typeof chain.chain_hash).toBe('string');
    expect(chain.chain_hash).toHaveLength(64);
    expect(verifyF5EvidenceChain(chain)).toBe(true);
  });

  it('builds complete chain with all forge steps', () => {
    const steps = [
      createEvidenceStep('V0_VALIDATE', HASH_A, HASH_B, 'F5-INV-01', 'PASS', TIMESTAMP),
      createEvidenceStep('V1_TRAJECTORY', HASH_B, HASH_C, 'F5-INV-03/04', 'PASS', TIMESTAMP),
      createEvidenceStep('V2_LAWS', HASH_C, HASH_A, 'F5-INV-05/06/07/08', 'PASS', TIMESTAMP),
      createEvidenceStep('V3_QUALITY', HASH_A, HASH_B, 'F5-INV-09/10/11', 'PASS', TIMESTAMP),
      createEvidenceStep('V4_DIAGNOSIS', HASH_B, HASH_C, 'F5-INV-12', 'PASS', TIMESTAMP),
      createEvidenceStep('V5_BENCHMARK', HASH_C, HASH_A, 'F5-INV-14', 'PASS', TIMESTAMP),
    ];
    const chain = buildF5EvidenceChain('FORGE-COMPLETE', steps);
    expect(chain.steps).toHaveLength(6);
    expect(verifyF5EvidenceChain(chain)).toBe(true);
    const stepNames = chain.steps.map((s) => s.step);
    expect(stepNames).toContain('V0_VALIDATE');
    expect(stepNames).toContain('V5_BENCHMARK');
  });
});
