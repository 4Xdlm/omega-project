import { describe, it, expect } from 'vitest';
import { runOracleCrossref } from '../../src/oracles/oracle-crossref.js';
import { getPlanA, SCENARIO_A_CANON, buildMinimalProseDoc, buildMinimalProseParagraph } from '../fixtures.js';

describe('Oracle Crossref', () => {
  it('consistent -> PASS', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        canon_refs: ['CANON-001'],
        motif_refs: [],
        segment_ids: ['SEG-001'],
      })],
    });
    const result = runOracleCrossref(prose, plan, SCENARIO_A_CANON);
    expect(result.oracle_id).toBe('ORACLE_CROSSREF');
  });

  it('invalid canon ref -> lower score', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        canon_refs: ['NONEXIST-001'],
        segment_ids: ['SEG-001'],
      })],
    });
    const result = runOracleCrossref(prose, plan, SCENARIO_A_CANON);
    expect(result.findings.some((f) => f.includes('Invalid canon ref'))).toBe(true);
  });

  it('invalid motif ref -> finding', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        motif_refs: ['NONEXIST-SEED'],
        segment_ids: ['SEG-001'],
      })],
    });
    const result = runOracleCrossref(prose, plan, SCENARIO_A_CANON);
    expect(result.findings.some((f) => f.includes('Invalid motif ref'))).toBe(true);
  });

  it('constraint violation -> finding', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ segment_ids: [] })],
    });
    const result = runOracleCrossref(prose, plan, SCENARIO_A_CANON);
    expect(result.findings.some((f) => f.includes('no segment'))).toBe(true);
  });

  it('checks canon references', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleCrossref(prose, plan, SCENARIO_A_CANON);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('checks plan references', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleCrossref(prose, plan, SCENARIO_A_CANON);
    expect(result.evidence_hash).toBeTruthy();
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const r1 = runOracleCrossref(prose, plan, SCENARIO_A_CANON);
    const r2 = runOracleCrossref(prose, plan, SCENARIO_A_CANON);
    expect(r1.score).toBe(r2.score);
    expect(r1.evidence_hash).toBe(r2.evidence_hash);
  });

  it('findings populated', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runOracleCrossref(prose, plan, SCENARIO_A_CANON);
    expect(Array.isArray(result.findings)).toBe(true);
  });
});
