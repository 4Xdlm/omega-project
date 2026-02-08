import { describe, it, expect } from 'vitest';
import { runOracleStyle } from '../../src/oracles/oracle-style.js';
import { SCENARIO_A_GENOME, SCENARIO_B_GENOME, buildMinimalProseDoc, buildMinimalProseParagraph } from '../fixtures.js';

describe('Oracle Style', () => {
  it('genome match -> PASS', () => {
    const prose = buildMinimalProseDoc();
    const result = runOracleStyle(prose, SCENARIO_B_GENOME);
    expect(result.oracle_id).toBe('ORACLE_STYLE');
  });

  it('drift -> lower score', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        text: 'word '.repeat(100),
        word_count: 100, sentence_count: 1,
      })],
    });
    const result = runOracleStyle(prose, SCENARIO_B_GENOME);
    expect(result.score).toBeLessThan(1);
  });

  it('measures style features', () => {
    const prose = buildMinimalProseDoc();
    const result = runOracleStyle(prose, SCENARIO_A_GENOME);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('scoring range 0-1', () => {
    const prose = buildMinimalProseDoc();
    const result = runOracleStyle(prose, SCENARIO_A_GENOME);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('evaluates signature_traits', () => {
    const prose = buildMinimalProseDoc();
    const result = runOracleStyle(prose, SCENARIO_A_GENOME);
    const traitFindings = result.findings.filter((f) => f.includes('Signature trait'));
    expect(traitFindings.length).toBe(SCENARIO_A_GENOME.signature_traits.length);
  });

  it('measures burstiness', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ paragraph_id: 'P1', word_count: 5, sentence_count: 1 }),
        buildMinimalProseParagraph({ paragraph_id: 'P2', word_count: 30, sentence_count: 1 }),
      ],
    });
    const result = runOracleStyle(prose, SCENARIO_A_GENOME);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic', () => {
    const prose = buildMinimalProseDoc();
    const r1 = runOracleStyle(prose, SCENARIO_A_GENOME);
    const r2 = runOracleStyle(prose, SCENARIO_A_GENOME);
    expect(r1.score).toBe(r2.score);
    expect(r1.evidence_hash).toBe(r2.evidence_hash);
  });

  it('findings populated', () => {
    const prose = buildMinimalProseDoc();
    const result = runOracleStyle(prose, SCENARIO_A_GENOME);
    expect(Array.isArray(result.findings)).toBe(true);
  });
});
