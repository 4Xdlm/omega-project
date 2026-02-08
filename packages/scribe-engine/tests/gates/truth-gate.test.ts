import { describe, it, expect } from 'vitest';
import { runTruthGate } from '../../src/gates/truth-gate.js';
import { getPlanA, SCENARIO_A_CANON, getDefaultSConfig, buildMinimalProseDoc, buildMinimalProseParagraph, TIMESTAMP } from '../fixtures.js';

describe('Truth Gate', () => {
  it('PASS when all paragraphs are mapped', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runTruthGate(prose, SCENARIO_A_CANON, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('FAIL on unmapped claim', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ canon_refs: [], segment_ids: [] })],
    });
    const result = runTruthGate(prose, SCENARIO_A_CANON, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('validates canon_refs against canon', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ canon_refs: ['NONEXIST-001'] })],
    });
    const result = runTruthGate(prose, SCENARIO_A_CANON, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('validates plan refs', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ canon_refs: ['CANON-001'], segment_ids: ['SEG-001'] })],
    });
    const result = runTruthGate(prose, SCENARIO_A_CANON, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('handles empty prose', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({ paragraphs: [] });
    const result = runTruthGate(prose, SCENARIO_A_CANON, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('handles empty canon', () => {
    const { plan } = getPlanA();
    const emptyCanon = { entries: [] };
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ canon_refs: ['CANON-001'] })],
    });
    const result = runTruthGate(prose, emptyCanon, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('threshold is 0 unsupported', () => {
    const config = getDefaultSConfig();
    expect(config.TRUTH_MAX_UNSUPPORTED.value).toBe(0);
  });

  it('reports multiple violations', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ paragraph_id: 'P1', canon_refs: [], segment_ids: [] }),
        buildMinimalProseParagraph({ paragraph_id: 'P2', canon_refs: [], segment_ids: [] }),
      ],
    });
    const result = runTruthGate(prose, SCENARIO_A_CANON, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const r1 = runTruthGate(prose, SCENARIO_A_CANON, plan, getDefaultSConfig(), TIMESTAMP);
    const r2 = runTruthGate(prose, SCENARIO_A_CANON, plan, getDefaultSConfig(), TIMESTAMP);
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.violations.length).toBe(r2.violations.length);
  });

  it('includes metrics', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runTruthGate(prose, SCENARIO_A_CANON, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('unsupported_count');
    expect(result.metrics).toHaveProperty('total_paragraphs');
  });
});
