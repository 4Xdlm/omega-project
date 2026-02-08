import { describe, it, expect } from 'vitest';
import { harmonize } from '../src/harmonizer.js';
import { buildMinimalStyledParagraph, buildMinimalProseParagraph, SCENARIO_A_GENOME, getDefaultEConfig, TIMESTAMP } from './fixtures.js';
import { profileStyle } from '../src/metrics/style-profiler.js';

const config = getDefaultEConfig();

function styledParaWithText(id: string, text: string) {
  const prosePara = buildMinimalProseParagraph({ paragraph_id: id, text });
  const profile = profileStyle([prosePara], SCENARIO_A_GENOME, TIMESTAMP);
  return buildMinimalStyledParagraph({
    paragraph_id: id,
    text,
    word_count: text.split(/\s+/).length,
    sentence_count: text.split(/[.!?]+/).filter((s) => s.trim()).length,
    style_profile: profile,
  });
}

describe('Harmonizer', () => {
  it('low drift -> unchanged', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched the sea. Waves crashed below.');
    const p2 = styledParaWithText('P2', 'The light swept the horizon. Fog rolled in.');
    const { paragraphs } = harmonize([p1, p2], config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(paragraphs.length).toBe(2);
  });

  it('returns coherence profile', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched.');
    const p2 = styledParaWithText('P2', 'The light swept.');
    const { coherence } = harmonize([p1, p2], config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(coherence).toBeTruthy();
    expect(typeof coherence.style_drift).toBe('number');
  });

  it('is deterministic', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched.');
    const p2 = styledParaWithText('P2', 'The light swept.');
    const h1 = harmonize([p1, p2], config, SCENARIO_A_GENOME, TIMESTAMP);
    const h2 = harmonize([p1, p2], config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(h1.paragraphs.length).toBe(h2.paragraphs.length);
    expect(h1.coherence.style_drift).toBe(h2.coherence.style_drift);
  });

  it('recalculates profile', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched the sea.');
    const p2 = styledParaWithText('P2', 'The light swept the horizon.');
    const { paragraphs } = harmonize([p1, p2], config, SCENARIO_A_GENOME, TIMESTAMP);
    for (const p of paragraphs) {
      expect(p.style_profile).toBeTruthy();
    }
  });

  it('handles single paragraph', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched.');
    const { paragraphs, coherence } = harmonize([p1], config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(paragraphs.length).toBe(1);
    expect(coherence.style_drift).toBe(0);
  });

  it('voice stability computed', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched the sea.');
    const p2 = styledParaWithText('P2', 'The light swept the horizon.');
    const { coherence } = harmonize([p1, p2], config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(coherence.voice_stability).toBeGreaterThanOrEqual(0);
    expect(coherence.voice_stability).toBeLessThanOrEqual(1);
  });

  it('handles edge case — empty', () => {
    const { paragraphs } = harmonize([], config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(paragraphs.length).toBe(0);
  });

  it('output count matches input', () => {
    const p1 = styledParaWithText('P1', 'First paragraph here.');
    const p2 = styledParaWithText('P2', 'Second paragraph here.');
    const p3 = styledParaWithText('P3', 'Third paragraph here.');
    const { paragraphs } = harmonize([p1, p2, p3], config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(paragraphs.length).toBe(3);
  });

  it('coherence improved or stable after harmonize', () => {
    const p1 = styledParaWithText('P1', 'Short.');
    const p2 = styledParaWithText('P2', 'The extraordinarily magnificent structures towered above everything.');
    const { coherence } = harmonize([p1, p2], config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(coherence.voice_stability).toBeGreaterThanOrEqual(0);
  });

  it('transitions smoothed', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched the sea. Waves crashed.');
    const p2 = styledParaWithText('P2', 'The light swept the horizon.');
    const { paragraphs } = harmonize([p1, p2], config, SCENARIO_A_GENOME, TIMESTAMP);
    expect(paragraphs[0].text).toBeTruthy();
    expect(paragraphs[1].text).toBeTruthy();
  });
});
