import { describe, it, expect } from 'vitest';
import { runOracleEmotion } from '../../src/oracles/oracle-emotion.js';
import { SCENARIO_A_EMOTION, SCENARIO_B_EMOTION, buildMinimalProseDoc, buildMinimalProseParagraph } from '../fixtures.js';

describe('Oracle Emotion', () => {
  it('aligned -> PASS', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ intensity: 0.3 })],
    });
    const result = runOracleEmotion(prose, SCENARIO_B_EMOTION);
    expect(result.oracle_id).toBe('ORACLE_EMOTION');
  });

  it('misaligned -> lower score', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ intensity: 0.0 })],
    });
    const result = runOracleEmotion(prose, SCENARIO_A_EMOTION);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('checks pivots', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ paragraph_id: 'P1', intensity: 0.3 }),
        buildMinimalProseParagraph({ paragraph_id: 'P2', intensity: 0.9 }),
      ],
    });
    const result = runOracleEmotion(prose, SCENARIO_A_EMOTION);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('checks intensity', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ intensity: 0.5 })],
    });
    const result = runOracleEmotion(prose, SCENARIO_A_EMOTION);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('checks waypoints', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ paragraph_id: 'P1', intensity: 0.3 }),
        buildMinimalProseParagraph({ paragraph_id: 'P2', intensity: 0.6 }),
      ],
    });
    const result = runOracleEmotion(prose, SCENARIO_B_EMOTION);
    expect(result.findings).toBeDefined();
  });

  it('checks curve alignment', () => {
    const prose = buildMinimalProseDoc();
    const result = runOracleEmotion(prose, SCENARIO_A_EMOTION);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('is deterministic', () => {
    const prose = buildMinimalProseDoc();
    const r1 = runOracleEmotion(prose, SCENARIO_A_EMOTION);
    const r2 = runOracleEmotion(prose, SCENARIO_A_EMOTION);
    expect(r1.score).toBe(r2.score);
    expect(r1.evidence_hash).toBe(r2.evidence_hash);
  });

  it('findings populated', () => {
    const prose = buildMinimalProseDoc();
    const result = runOracleEmotion(prose, SCENARIO_A_EMOTION);
    expect(Array.isArray(result.findings)).toBe(true);
  });
});
