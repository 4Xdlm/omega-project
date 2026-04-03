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

  // ── Bridge-02 tests (Phase 2: +f29d, +f35c) ──

  describe('Bridge-02 — Phase 2 features', () => {
    it('BR02-01: f29d_ttr_score should be PILOTABLE + PROMPT_DIRECT', () => {
      const matrix = bridge.getMatrix();
      const f29d = matrix['f29d_ttr_score'];
      expect(f29d).toBeDefined();
      expect(f29d.category).toBe('PILOTABLE');
      expect(f29d.route).toBe('PROMPT_DIRECT');
    });

    it('BR02-02: f35c_hook_score should be PILOTABLE + PROMPT_DIRECT (promoted from SHADOW)', () => {
      const matrix = bridge.getMatrix();
      const f35c = matrix['f35c_hook_score'];
      expect(f35c).toBeDefined();
      expect(f35c.category).toBe('PILOTABLE');
      expect(f35c.route).toBe('PROMPT_DIRECT');
    });

    it('BR02-03: f36c_cliff_score must remain SHADOW (token mort — not injectable)', () => {
      const matrix = bridge.getMatrix();
      const f36c = matrix['f36c_cliff_score'];
      expect(f36c).toBeDefined();
      expect(f36c.route).toBe('SHADOW');
    });

    it('BR02-04: f29d instruction must NOT contain maximisation language', () => {
      const matrix = bridge.getMatrix();
      const instruction = matrix['f29d_ttr_score'].instruction.toLowerCase();
      expect(instruction).not.toContain('maximis');
      expect(instruction).not.toContain('maximiz');
      // Should contain band-constraint / natural language
      expect(instruction).toMatch(/naturel|sans.*forc|entre/i);
    });

    it('BR02-05: all 5 Phase 2 features should route to prompt_directives', () => {
      const phase2 = [
        'f24e_contrast_score',
        'f15b_redundancy_compression',
        'f16a_bigram_rarity',
        'f29d_ttr_score',
        'f35c_hook_score',
      ];
      const targets: Record<string, number> = {};
      for (const f of phase2) targets[f] = 1.0;

      const result = bridge.translate({
        target_features: targets,
        archetype: 'BALANCED',
        language: 'fr',
      });

      expect(result.prompt_directives.length).toBe(5);
      const features = result.prompt_directives.map(d => d.feature);
      for (const f of phase2) {
        expect(features).toContain(f);
      }
    });

    it('BR02-06: f35c instruction should reference opening/accroche', () => {
      const matrix = bridge.getMatrix();
      const instruction = matrix['f35c_hook_score'].instruction.toLowerCase();
      expect(instruction).toMatch(/ouvre|accroche|tension/);
    });

    it('BR02-07: compliance rates — f29d=0.8, f35c=0 (baseline before bench)', () => {
      const matrix = bridge.getMatrix();
      expect(matrix['f29d_ttr_score'].compliance_rate).toBe(0.8);
      expect(matrix['f35c_hook_score'].compliance_rate).toBe(0);
    });

    it('BR02-08: bridge should sort Phase 2 by compliance descending', () => {
      const phase2 = [
        'f24e_contrast_score',
        'f15b_redundancy_compression',
        'f16a_bigram_rarity',
        'f29d_ttr_score',
        'f35c_hook_score',
      ];
      const targets: Record<string, number> = {};
      for (const f of phase2) targets[f] = 1.0;

      const result = bridge.translate({
        target_features: targets,
        archetype: 'BALANCED',
        language: 'fr',
      });

      // First 3 should be compliance=1 (contrast, redundancy, rarity)
      // Then f29d at 0.8
      // Then f35c at 0
      const rates = result.prompt_directives.map(d => d.compliance_rate);
      expect(rates[0]).toBe(1);
      expect(rates[3]).toBe(0.8);
      expect(rates[4]).toBe(0);
    });
  });
});
