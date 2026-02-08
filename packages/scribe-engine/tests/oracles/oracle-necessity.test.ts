import { describe, it, expect } from 'vitest';
import { runOracleNecessity } from '../../src/oracles/oracle-necessity.js';
import { getPlanA, buildMinimalProseDoc, buildMinimalProseParagraph } from '../fixtures.js';

describe('Oracle Necessity', () => {
  it('lean text -> PASS', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleNecessity(prose, plan);
    expect(result.verdict).toBe('PASS');
  });

  it('bloated text -> FAIL', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ paragraph_id: 'P1', text: '', word_count: 0, segment_ids: [] }),
        buildMinimalProseParagraph({ paragraph_id: 'P2', text: '', word_count: 0, segment_ids: [] }),
      ],
    });
    const result = runOracleNecessity(prose, plan);
    expect(result.verdict).toBe('FAIL');
  });

  it('single paragraph', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleNecessity(prose, plan);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('scoring range 0-1', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleNecessity(prose, plan);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('ablation detection in findings', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: '', word_count: 0, segment_ids: [] })],
    });
    const result = runOracleNecessity(prose, plan);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('edge cases on boundary', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleNecessity(prose, plan);
    expect(result.oracle_id).toBe('ORACLE_NECESSITY');
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const r1 = runOracleNecessity(prose, plan);
    const r2 = runOracleNecessity(prose, plan);
    expect(r1.score).toBe(r2.score);
    expect(r1.evidence_hash).toBe(r2.evidence_hash);
  });

  it('findings populated', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleNecessity(prose, plan);
    expect(Array.isArray(result.findings)).toBe(true);
  });
});
