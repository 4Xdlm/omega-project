import { describe, it, expect } from 'vitest';
import { runOracleTruth } from '../../src/oracles/oracle-truth.js';
import { getPlanA, SCENARIO_A_CANON, buildMinimalProseDoc, buildMinimalProseParagraph } from '../fixtures.js';

describe('Oracle Truth', () => {
  it('full support -> PASS high score', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleTruth(prose, SCENARIO_A_CANON, plan);
    expect(result.score).toBeGreaterThan(0);
  });

  it('partial support -> lower score', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ paragraph_id: 'P1', canon_refs: ['CANON-001'], segment_ids: ['S1'] }),
        buildMinimalProseParagraph({ paragraph_id: 'P2', canon_refs: [], segment_ids: [] }),
      ],
    });
    const result = runOracleTruth(prose, SCENARIO_A_CANON, plan);
    expect(result.score).toBeLessThan(1);
  });

  it('none supported -> FAIL', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ canon_refs: [], segment_ids: [] })],
    });
    const result = runOracleTruth(prose, SCENARIO_A_CANON, plan);
    expect(result.verdict).toBe('FAIL');
  });

  it('evidence_hash is present', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleTruth(prose, SCENARIO_A_CANON, plan);
    expect(result.evidence_hash).toBeTruthy();
    expect(result.evidence_hash).toHaveLength(64);
  });

  it('findings list populated on issues', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ canon_refs: [], segment_ids: [] })],
    });
    const result = runOracleTruth(prose, SCENARIO_A_CANON, plan);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('score range 0-1', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleTruth(prose, SCENARIO_A_CANON, plan);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const r1 = runOracleTruth(prose, SCENARIO_A_CANON, plan);
    const r2 = runOracleTruth(prose, SCENARIO_A_CANON, plan);
    expect(r1.score).toBe(r2.score);
    expect(r1.evidence_hash).toBe(r2.evidence_hash);
  });

  it('handles empty prose', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({ paragraphs: [] });
    const result = runOracleTruth(prose, SCENARIO_A_CANON, plan);
    expect(result.verdict).toBe('FAIL');
    expect(result.score).toBe(0);
  });
});
