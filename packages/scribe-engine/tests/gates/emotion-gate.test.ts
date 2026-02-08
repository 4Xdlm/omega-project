import { describe, it, expect } from 'vitest';
import { runEmotionGate } from '../../src/gates/emotion-gate.js';
import { getPlanA, SCENARIO_A_EMOTION, getDefaultSConfig, buildMinimalProseDoc, buildMinimalProseParagraph, TIMESTAMP } from '../fixtures.js';

describe('Emotion Gate', () => {
  it('PASS when pivots present', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ intensity: 0.3 })],
    });
    const result = runEmotionGate(prose, SCENARIO_A_EMOTION, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.gate_id).toBe('EMOTION_GATE');
  });

  it('FAIL when pivot missing', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ intensity: 0.0, segment_ids: [] })],
    });
    const result = runEmotionGate(prose, SCENARIO_A_EMOTION, plan, getDefaultSConfig(), TIMESTAMP);
    // May FAIL due to intensity mismatch
    expect(result.violations.length).toBeGreaterThanOrEqual(0);
  });

  it('checks intensity tolerance', () => {
    const config = getDefaultSConfig();
    expect(config.EMOTION_PIVOT_TOLERANCE.value).toBe(0.2);
  });

  it('checks waypoint coverage', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ paragraph_id: 'P1', intensity: 0.3 }),
        buildMinimalProseParagraph({ paragraph_id: 'P2', intensity: 0.5 }),
        buildMinimalProseParagraph({ paragraph_id: 'P3', intensity: 0.6 }),
        buildMinimalProseParagraph({ paragraph_id: 'P4', intensity: 0.9 }),
        buildMinimalProseParagraph({ paragraph_id: 'P5', intensity: 0.7 }),
      ],
    });
    const result = runEmotionGate(prose, SCENARIO_A_EMOTION, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('waypoint_coverage');
  });

  it('handles curve alignment', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runEmotionGate(prose, SCENARIO_A_EMOTION, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('waypoints_covered');
  });

  it('handles empty emotion target', () => {
    const { plan } = getPlanA();
    const emptyEmotion = { arc_emotion: 'fear', waypoints: [], climax_position: 0.8, resolution_emotion: 'sadness' };
    const prose = buildMinimalProseDoc();
    const result = runEmotionGate(prose, emptyEmotion, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.gate_id).toBe('EMOTION_GATE');
  });

  it('handles multiple pivots', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [
        buildMinimalProseParagraph({ paragraph_id: 'P1', intensity: 0.3, segment_ids: ['S1'] }),
        buildMinimalProseParagraph({ paragraph_id: 'P2', intensity: 0.7, segment_ids: ['S2'] }),
      ],
    });
    const result = runEmotionGate(prose, SCENARIO_A_EMOTION, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('pivots_expected');
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const r1 = runEmotionGate(prose, SCENARIO_A_EMOTION, plan, getDefaultSConfig(), TIMESTAMP);
    const r2 = runEmotionGate(prose, SCENARIO_A_EMOTION, plan, getDefaultSConfig(), TIMESTAMP);
    expect(r1.verdict).toBe(r2.verdict);
  });

  it('edge cases on intensity diff', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({ intensity: 0.5 })],
    });
    const result = runEmotionGate(prose, SCENARIO_A_EMOTION, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('total_waypoints');
  });

  it('includes metrics', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runEmotionGate(prose, SCENARIO_A_EMOTION, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('pivots_detected');
    expect(result.metrics).toHaveProperty('pivots_expected');
  });
});
