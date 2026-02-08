import { describe, it, expect } from 'vitest';
import { detectIA } from '../../src/detectors/ia-detector.js';
import { buildMinimalProseParagraph, getDefaultEConfig } from '../fixtures.js';

const config = getDefaultEConfig();

describe('IA Detector', () => {
  it('clean text -> PASS', () => {
    const para = buildMinimalProseParagraph({ text: 'The keeper watched the horizon. Salt air filled his lungs.' });
    const result = detectIA([para], config);
    expect(result.verdict).toBe('PASS');
    expect(result.score).toBeLessThanOrEqual(0.3);
  });

  it('detects IA pattern -> findings', () => {
    const para = buildMinimalProseParagraph({ text: 'It is worth noting that the lighthouse stands tall. Furthermore, the ocean is deep.' });
    const result = detectIA([para], config);
    expect(result.pattern_count).toBeGreaterThan(0);
  });

  it('detects multiple patterns', () => {
    const para = buildMinimalProseParagraph({
      text: 'In conclusion, it is worth noting that furthermore the tapestry of experience shows the symphony of life.',
    });
    const result = detectIA([para], config);
    expect(result.pattern_count).toBeGreaterThanOrEqual(3);
  });

  it('is case insensitive', () => {
    const para = buildMinimalProseParagraph({ text: 'IT IS WORTH NOTING that the TAPESTRY OF experience matters.' });
    const result = detectIA([para], config);
    expect(result.pattern_count).toBeGreaterThan(0);
  });

  it('computes score between 0 and 1', () => {
    const para = buildMinimalProseParagraph();
    const result = detectIA([para], config);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('respects threshold', () => {
    const para = buildMinimalProseParagraph({ text: 'Clean prose without any patterns.' });
    const result = detectIA([para], config);
    expect(result.verdict).toBe('PASS');
  });

  it('handles empty paragraphs', () => {
    const result = detectIA([], config);
    expect(result.score).toBe(0);
    expect(result.verdict).toBe('PASS');
  });

  it('high pattern count -> high score', () => {
    const para = buildMinimalProseParagraph({
      text: 'In conclusion, it is worth noting. Furthermore, moreover, it goes without saying. At the end of the day, in terms of everything, with regard to all.',
    });
    const result = detectIA([para], config);
    expect(result.score).toBeGreaterThan(0);
  });

  it('checks all patterns in config', () => {
    const patterns = config.IA_DETECTION_PATTERNS.value as readonly string[];
    expect(patterns.length).toBeGreaterThanOrEqual(30);
  });

  it('provides context in findings', () => {
    const para = buildMinimalProseParagraph({ text: 'It is worth noting that this is important.' });
    const result = detectIA([para], config);
    if (result.details.length > 0) {
      expect(result.details[0].context).toBeTruthy();
      expect(result.details[0].paragraph_id).toBe(para.paragraph_id);
    }
  });

  it('is deterministic', () => {
    const para = buildMinimalProseParagraph({ text: 'Furthermore, the tapestry of life unfolds.' });
    const r1 = detectIA([para], config);
    const r2 = detectIA([para], config);
    expect(r1.score).toBe(r2.score);
    expect(r1.pattern_count).toBe(r2.pattern_count);
  });

  it('assigns severity levels', () => {
    const para = buildMinimalProseParagraph({ text: 'In conclusion, furthermore, having said that.' });
    const result = detectIA([para], config);
    for (const finding of result.details) {
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(finding.severity);
    }
  });
});
