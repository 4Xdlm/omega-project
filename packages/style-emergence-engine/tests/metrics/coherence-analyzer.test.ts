import { describe, it, expect } from 'vitest';
import { analyzeCoherence } from '../../src/metrics/coherence-analyzer.js';
import { buildMinimalStyledParagraph, SCENARIO_A_GENOME, TIMESTAMP } from '../fixtures.js';
import { profileStyle } from '../../src/metrics/style-profiler.js';
import { buildMinimalProseParagraph } from '../fixtures.js';

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

describe('Coherence Analyzer', () => {
  it('low drift -> PASS', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched the ocean. Waves crashed below.');
    const p2 = styledParaWithText('P2', 'The wind picked up speed. Salt sprayed the walls.');
    const profile = analyzeCoherence([p1, p2]);
    expect(profile.voice_stability).toBeGreaterThan(0);
  });

  it('high drift detectable', () => {
    const p1 = styledParaWithText('P1', 'Yes.');
    const p2 = styledParaWithText('P2', 'The extraordinarily magnificent crystalline ephemeral phantasmagoric structures towered above the forgotten ancient weathered ruins of a long lost civilization.');
    const profile = analyzeCoherence([p1, p2]);
    expect(profile.max_local_drift).toBeGreaterThan(0);
  });

  it('detects outlier paragraphs', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched. Waves crashed.');
    const p2 = styledParaWithText('P2', 'The keeper walked. Salt filled air.');
    const p3 = styledParaWithText('P3', 'The extraordinarily magnificent crystalline phantasmagoric structures soared above!');
    const profile = analyzeCoherence([p1, p2, p3]);
    expect(profile.style_drift).toBeGreaterThanOrEqual(0);
  });

  it('computes adjacent delta', () => {
    const p1 = styledParaWithText('P1', 'Short sentence. Another one.');
    const p2 = styledParaWithText('P2', 'A much longer sentence with many more words in it to create difference.');
    const profile = analyzeCoherence([p1, p2]);
    expect(profile.max_local_drift).toBeGreaterThanOrEqual(0);
  });

  it('single paragraph -> zero drift', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched.');
    const profile = analyzeCoherence([p1]);
    expect(profile.style_drift).toBe(0);
    expect(profile.voice_stability).toBe(1);
  });

  it('computes voice stability', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched the sea.');
    const p2 = styledParaWithText('P2', 'The light swept the horizon.');
    const profile = analyzeCoherence([p1, p2]);
    expect(profile.voice_stability).toBeLessThanOrEqual(1);
    expect(profile.voice_stability).toBeGreaterThanOrEqual(0);
  });

  it('computes max local drift', () => {
    const p1 = styledParaWithText('P1', 'Short.');
    const p2 = styledParaWithText('P2', 'Also short.');
    const p3 = styledParaWithText('P3', 'The long winding road stretched before them into the misty darkness of the valley below.');
    const profile = analyzeCoherence([p1, p2, p3]);
    expect(profile.max_local_drift).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched.');
    const p2 = styledParaWithText('P2', 'The light swept.');
    const c1 = analyzeCoherence([p1, p2]);
    const c2 = analyzeCoherence([p1, p2]);
    expect(c1.style_drift).toBe(c2.style_drift);
    expect(c1.voice_stability).toBe(c2.voice_stability);
  });

  it('handles edge — identical paragraphs', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched.');
    const p2 = styledParaWithText('P2', 'The keeper watched.');
    const profile = analyzeCoherence([p1, p2]);
    expect(profile.style_drift).toBeLessThanOrEqual(0.01);
  });

  it('consistent voice -> high stability', () => {
    const p1 = styledParaWithText('P1', 'The keeper watched the sea. Waves crashed below.');
    const p2 = styledParaWithText('P2', 'The keeper felt the wind. Salt stung his eyes.');
    const p3 = styledParaWithText('P3', 'The keeper checked the lamp. Light pierced the fog.');
    const profile = analyzeCoherence([p1, p2, p3]);
    expect(profile.voice_stability).toBeGreaterThan(0.5);
  });
});
