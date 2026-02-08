import { describe, it, expect } from 'vitest';
import { detectBanality } from '../../src/detectors/banality-detector.js';
import { buildMinimalProseParagraph, getDefaultEConfig, SCENARIO_A_CONSTRAINTS } from '../fixtures.js';

const config = getDefaultEConfig();

describe('Banality Detector', () => {
  it('clean text -> PASS', () => {
    const para = buildMinimalProseParagraph({ text: 'The keeper checked the mechanism carefully.' });
    const result = detectBanality([para], SCENARIO_A_CONSTRAINTS, config);
    expect(result.verdict).toBe('PASS');
  });

  it('detects cliche -> FAIL', () => {
    const para = buildMinimalProseParagraph({ text: 'It was a dark and stormy night when time stood still.' });
    const result = detectBanality([para], SCENARIO_A_CONSTRAINTS, config);
    expect(result.cliche_count).toBeGreaterThan(0);
    expect(result.verdict).toBe('FAIL');
  });

  it('detects IA-speak', () => {
    const para = buildMinimalProseParagraph({ text: 'It is worth noting that furthermore the outcome was clear.' });
    const result = detectBanality([para], SCENARIO_A_CONSTRAINTS, config);
    expect(result.ia_speak_count).toBeGreaterThan(0);
  });

  it('detects banned words', () => {
    const para = buildMinimalProseParagraph({ text: 'The keeper suddenly appeared.' });
    const result = detectBanality([para], SCENARIO_A_CONSTRAINTS, config);
    expect(result.findings.some((f) => f.includes('banned_word'))).toBe(true);
  });

  it('detects generic transitions', () => {
    const para = buildMinimalProseParagraph({ paragraph_id: 'P1', text: 'Then, the keeper walked to the door.' });
    const result = detectBanality([para], SCENARIO_A_CONSTRAINTS, config);
    expect(result.generic_transition_count).toBeGreaterThan(0);
  });

  it('counts multiple findings', () => {
    const para = buildMinimalProseParagraph({
      text: 'In conclusion, it was a dark and stormy night. Furthermore, time stood still.',
    });
    const result = detectBanality([para], SCENARIO_A_CONSTRAINTS, config);
    expect(result.total_banality).toBeGreaterThan(1);
  });

  it('checks forbidden cliches from constraints', () => {
    const para = buildMinimalProseParagraph({ text: 'His heart pounding, he ran into the dark and stormy night.' });
    const result = detectBanality([para], SCENARIO_A_CONSTRAINTS, config);
    expect(result.cliche_count).toBeGreaterThan(0);
  });

  it('handles empty', () => {
    const result = detectBanality([], SCENARIO_A_CONSTRAINTS, config);
    expect(result.total_banality).toBe(0);
    expect(result.verdict).toBe('PASS');
  });

  it('is deterministic', () => {
    const para = buildMinimalProseParagraph({ text: 'In conclusion, the tapestry of life.' });
    const r1 = detectBanality([para], SCENARIO_A_CONSTRAINTS, config);
    const r2 = detectBanality([para], SCENARIO_A_CONSTRAINTS, config);
    expect(r1.total_banality).toBe(r2.total_banality);
    expect(r1.findings.length).toBe(r2.findings.length);
  });

  it('counts separately', () => {
    const para = buildMinimalProseParagraph({
      text: 'In conclusion, time stood still. Then, something happened.',
    });
    const result = detectBanality([para], SCENARIO_A_CONSTRAINTS, config);
    expect(result.ia_speak_count).toBeGreaterThanOrEqual(1);
    expect(result.cliche_count).toBeGreaterThanOrEqual(1);
  });
});
