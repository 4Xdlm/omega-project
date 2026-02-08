import { describe, it, expect } from 'vitest';
import { runBanalityGate } from '../../src/gates/banality-gate.js';
import { SCENARIO_A_CONSTRAINTS, getDefaultSConfig, buildMinimalProseDoc, buildMinimalProseParagraph, TIMESTAMP } from '../fixtures.js';

describe('Banality Gate', () => {
  it('PASS when no cliches', () => {
    const prose = buildMinimalProseDoc();
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('FAIL on cliche found', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'It was a dark and stormy night when he arrived.' })],
    });
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('FAIL on banned word', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'He suddenly realized the truth.' })],
    });
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('FAIL on IA-speak', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'It is worth noting that the light flickered.' })],
    });
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('case insensitive detection', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'IT IS WORTH NOTING that something happened.' })],
    });
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('partial match for patterns', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'The tapestry of fate unwound before them.' })],
    });
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('multiple violations counted', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        text: 'It is worth noting that on a dark and stormy night he suddenly arrived.',
      })],
    });
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });

  it('handles empty text', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: '' })],
    });
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('merges constraints forbidden_cliches with registry', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'His heart pounding in the silence.' })],
    });
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('is deterministic', () => {
    const prose = buildMinimalProseDoc();
    const r1 = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    const r2 = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.violations.length).toBe(r2.violations.length);
  });

  it('detects forbidden_cliches from constraints', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'His blood ran cold at the sight.' })],
    });
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('includes metrics', () => {
    const prose = buildMinimalProseDoc();
    const result = runBanalityGate(prose, SCENARIO_A_CONSTRAINTS, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('total_banalities');
    expect(result.metrics).toHaveProperty('ia_speak_count');
  });
});
