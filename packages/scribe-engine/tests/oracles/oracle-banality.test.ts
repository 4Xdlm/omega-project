import { describe, it, expect } from 'vitest';
import { runOracleBanality } from '../../src/oracles/oracle-banality.js';
import { SCENARIO_A_CONSTRAINTS, getDefaultSConfig, buildMinimalProseDoc, buildMinimalProseParagraph } from '../fixtures.js';

describe('Oracle Banality', () => {
  it('clean text -> PASS', () => {
    const prose = buildMinimalProseDoc();
    const result = runOracleBanality(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig());
    expect(result.verdict).toBe('PASS');
    expect(result.score).toBe(1.0);
  });

  it('cliche -> FAIL', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'His blood ran cold at the sight.' })],
    });
    const result = runOracleBanality(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig());
    expect(result.verdict).toBe('FAIL');
  });

  it('IA-speak -> FAIL', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'It is worth noting that the light failed.' })],
    });
    const result = runOracleBanality(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig());
    expect(result.verdict).toBe('FAIL');
  });

  it('score decreases with banalities', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        text: 'It is worth noting that on a dark and stormy night they arrived.',
      })],
    });
    const result = runOracleBanality(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig());
    expect(result.score).toBeLessThan(1);
  });

  it('merges registry with constraints', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'Time stood still in the room.' })],
    });
    const result = runOracleBanality(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig());
    expect(result.verdict).toBe('FAIL');
  });

  it('case insensitive', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'TAPESTRY OF memories unfolded.' })],
    });
    const result = runOracleBanality(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig());
    expect(result.verdict).toBe('FAIL');
  });

  it('is deterministic', () => {
    const prose = buildMinimalProseDoc();
    const r1 = runOracleBanality(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig());
    const r2 = runOracleBanality(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig());
    expect(r1.score).toBe(r2.score);
    expect(r1.evidence_hash).toBe(r2.evidence_hash);
  });

  it('findings populated', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'The silence was deafening.' })],
    });
    const result = runOracleBanality(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig());
    expect(result.findings.length).toBeGreaterThan(0);
  });
});
