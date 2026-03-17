/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — STYLE PRESETS TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/microsurgery/style-presets.test.ts
 * Version: 1.0.0 (Phase W Integration)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  LITTERAIRE_PREMIUM,
  EQUILIBRE_FLAUBERT,
  THRILLER_NERVEUX,
  STYLE_PRESETS,
  getPreset,
} from '../../src/microsurgery/style-presets.js';

describe('Style Presets (Phase W Integration)', () => {
  it('SP-01: all 3 presets are exported and accessible', () => {
    expect(LITTERAIRE_PREMIUM).toBeDefined();
    expect(EQUILIBRE_FLAUBERT).toBeDefined();
    expect(THRILLER_NERVEUX).toBeDefined();
    expect(Object.keys(STYLE_PRESETS)).toHaveLength(3);
  });

  it('SP-02: each preset has required fields', () => {
    for (const preset of Object.values(STYLE_PRESETS)) {
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.archetype).toBeTruthy();
      expect(preset.config).toBeDefined();
      expect(preset.config.max_amplitude).toBeGreaterThan(0);
      expect(preset.config.thresholds).toBeDefined();
    }
  });

  it('SP-03: MUSICALITE threshold is positive in ALL presets, scales with permissiveness', () => {
    // All presets must protect MUSICALITE (threshold > 0) — Phase W Loi 2 (DURE)
    for (const preset of Object.values(STYLE_PRESETS)) {
      expect(preset.config.thresholds.MUSICALITE).toBeGreaterThan(0);
      // Max cap: THRILLER_NERVEUX (most permissive) must still have some protection
      expect(preset.config.thresholds.MUSICALITE).toBeLessThanOrEqual(0.20);
    }
    // Thresholds recalibrated for 600-word scene amplitude range [0.04-0.07]:
    // LITTERAIRE_PREMIUM=0.05 < EQUILIBRE_FLAUBERT=0.10 < THRILLER_NERVEUX=0.15
    // Invariant: literary presets are stricter than action/thriller presets
    expect(LITTERAIRE_PREMIUM.config.thresholds.MUSICALITE)
      .toBeLessThan(EQUILIBRE_FLAUBERT.config.thresholds.MUSICALITE);
    expect(EQUILIBRE_FLAUBERT.config.thresholds.MUSICALITE)
      .toBeLessThan(THRILLER_NERVEUX.config.thresholds.MUSICALITE);
  });

  it('SP-04: LITTERAIRE_PREMIUM is the most restrictive', () => {
    expect(LITTERAIRE_PREMIUM.config.max_amplitude).toBeLessThanOrEqual(EQUILIBRE_FLAUBERT.config.max_amplitude);
    expect(LITTERAIRE_PREMIUM.config.thresholds.COMPLEXITE).toBeLessThanOrEqual(EQUILIBRE_FLAUBERT.config.thresholds.COMPLEXITE);
    expect(LITTERAIRE_PREMIUM.archetype).toBe('CATHEDRAL');
  });

  it('SP-05: THRILLER_NERVEUX is the most permissive', () => {
    expect(THRILLER_NERVEUX.config.thresholds.TENSION).toBeGreaterThanOrEqual(EQUILIBRE_FLAUBERT.config.thresholds.TENSION);
    expect(THRILLER_NERVEUX.config.thresholds.INTERIORITE).toBeGreaterThanOrEqual(EQUILIBRE_FLAUBERT.config.thresholds.INTERIORITE);
    expect(THRILLER_NERVEUX.archetype).toBe('BRUTAL');
  });

  it('SP-06: getPreset returns correct preset or undefined', () => {
    expect(getPreset('EQUILIBRE_FLAUBERT')).toBe(EQUILIBRE_FLAUBERT);
    expect(getPreset('UNKNOWN')).toBeUndefined();
  });

  it('SP-07: all 6 categories have thresholds in every preset', () => {
    const cats = ['MUSICALITE', 'COMPLEXITE', 'SENSORIEL', 'LEXICAL', 'INTERIORITE', 'TENSION'] as const;
    for (const preset of Object.values(STYLE_PRESETS)) {
      for (const cat of cats) {
        expect(preset.config.thresholds[cat]).toBeDefined();
      }
    }
  });
});
