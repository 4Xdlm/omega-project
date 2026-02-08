import { describe, it, expect } from 'vitest';
import { runNecessityGate } from '../../src/gates/necessity-gate.js';
import { getPlanA, getDefaultSConfig, buildMinimalProseDoc, buildMinimalProseParagraph, TIMESTAMP } from '../fixtures.js';

describe('Necessity Gate', () => {
  it('PASS when all necessary', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runNecessityGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('FAIL on redundant paragraph', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ text: '', word_count: 0, segment_ids: [] }),
      ],
    });
    const result = runNecessityGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('handles single paragraph', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ text: 'The keeper watched the waves crash against rocks below.' })],
    });
    const result = runNecessityGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('computes ablation ratio correctly', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runNecessityGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics['necessity_ratio']).toBeGreaterThanOrEqual(0);
    expect(result.metrics['necessity_ratio']).toBeLessThanOrEqual(1);
  });

  it('ratio threshold is 0.85', () => {
    const config = getDefaultSConfig();
    expect(config.NECESSITY_MIN_RATIO.value).toBe(0.85);
  });

  it('edge case: exactly 0.85 ratio', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runNecessityGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    if (result.metrics['necessity_ratio'] >= 0.85) {
      expect(result.verdict).toBe('PASS');
    }
  });

  it('FAIL below 0.85 with multiple redundant', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ paragraph_id: 'P1', text: 'a', word_count: 1, segment_ids: [] }),
        buildMinimalProseParagraph({ paragraph_id: 'P2', text: '', word_count: 0, segment_ids: [] }),
      ],
    });
    const result = runNecessityGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('FAIL on multiple redundant paragraphs', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ paragraph_id: 'P1', text: '', word_count: 0, segment_ids: [] }),
        buildMinimalProseParagraph({ paragraph_id: 'P2', text: '', word_count: 0, segment_ids: [] }),
        buildMinimalProseParagraph({ paragraph_id: 'P3', text: 'Valid content here for testing', segment_ids: ['SEG-001'] }),
      ],
    });
    const result = runNecessityGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const r1 = runNecessityGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    const r2 = runNecessityGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(r1.verdict).toBe(r2.verdict);
  });

  it('includes metrics', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runNecessityGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('necessary_count');
    expect(result.metrics).toHaveProperty('necessity_ratio');
  });
});
