/**
 * Tests for OMEGA Rosetta Bridge
 * Date: 2026-04-02
 */
import { describe, it, expect } from 'vitest';
import { RosettaBridge } from '../../src/coupling/rosetta-bridge.js';

describe('RosettaBridge', () => {
  const bridge = new RosettaBridge();

  it('should load the matrix with at least 10 features', () => {
    const matrix = bridge.getMatrix();
    expect(Object.keys(matrix).length).toBeGreaterThanOrEqual(10);
  });

  it('should classify PILOTABLE features correctly', () => {
    const pilotables = bridge.getByCategory('PILOTABLE');
    expect(pilotables.length).toBeGreaterThan(0);
    // f29d_ttr_score is SOLIDE in S06 with taux=0.8
    expect(pilotables).toContain('f29d_ttr_score');
  });

  it('should classify ILLUSION features correctly', () => {
    const illusions = bridge.getByCategory('ILLUSION');
    expect(illusions.length).toBeGreaterThan(0);
    // f17_knife_count is ILLUSION_DÉCLARATIVE in S06
    expect(illusions).toContain('f17_knife_count');
  });

  it('should translate target features into directives', () => {
    const result = bridge.translate({
      target_features: {
        'f29d_ttr_score': 0.75,
        'f24e_contrast_score': 0.5,
        'f15b_redundancy_compression': 0.9,
      },
      archetype: 'BALANCED',
      language: 'fr',
    });

    expect(result.prompt_directives.length).toBeGreaterThan(0);
    expect(result.total_injectable).toBeGreaterThan(0);
  });

  it('should route ILLUSION features to shadow (not prompt)', () => {
    const result = bridge.translate({
      target_features: { 'f17_knife_count': 5 },
      archetype: 'BALANCED',
      language: 'fr',
    });

    const inPrompt = result.prompt_directives.find(d => d.feature === 'f17_knife_count');
    expect(inPrompt).toBeUndefined();
    // Should be in shadow
    expect(result.shadow_measures.length).toBeGreaterThan(0);
  });

  it('should warn on IRREDUCTIBLE features', () => {
    const result = bridge.translate({
      target_features: { 'f1_mean': 18 },
      archetype: 'BALANCED',
      language: 'fr',
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('f1_mean');
  });

  it('should route semicolons to POST_PROCESSING', () => {
    const result = bridge.translate({
      target_features: { 'semicolon_count': 5 },
      archetype: 'BALANCED',
      language: 'fr',
    });

    expect(result.post_processing.length).toBe(1);
    expect(result.post_processing[0].feature).toBe('semicolon_count');
  });

  it('should sort prompt_directives by compliance rate descending', () => {
    const result = bridge.translate({
      target_features: {
        'f29d_ttr_score': 0.75,
        'f24e_contrast_score': 0.5,
        'f15b_redundancy_compression': 0.9,
      },
      archetype: 'BALANCED',
      language: 'fr',
    });

    for (let i = 1; i < result.prompt_directives.length; i++) {
      expect(result.prompt_directives[i - 1].compliance_rate)
        .toBeGreaterThanOrEqual(result.prompt_directives[i].compliance_rate);
    }
  });

  it('should handle unknown features gracefully', () => {
    const result = bridge.translate({
      target_features: { 'nonexistent_feature_xyz': 42 },
      archetype: 'BALANCED',
      language: 'fr',
    });

    expect(result.shadow_measures.length).toBe(1);
    expect(result.shadow_measures[0].feature).toBe('nonexistent_feature_xyz');
    expect(result.prompt_directives.length).toBe(0);
  });
});
