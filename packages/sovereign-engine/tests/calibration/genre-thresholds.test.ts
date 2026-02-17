/**
 * Tests: Genre Thresholds (Sprint 18.3)
 * Invariant: ART-CAL-03
 */

import { describe, it, expect } from 'vitest';
import {
  getGenreProfile,
  applyGenreWeights,
  getGenreAxisFloor,
  getGenreThreshold,
  listGenres,
  getAllGenreProfiles,
} from '../../src/calibration/genre-thresholds.js';

describe('GenreThresholds (ART-CAL-03)', () => {
  it('GENRE-01: all genres have valid profiles', () => {
    const genres = listGenres();
    expect(genres.length).toBeGreaterThanOrEqual(10); // 10 genres + default

    for (const genre of genres) {
      const profile = getGenreProfile(genre);
      expect(profile.genre).toBe(genre);
      expect(profile.label_fr.length).toBeGreaterThan(0);

      // All multipliers should be positive
      for (const val of Object.values(profile.weight_multipliers)) {
        expect(val).toBeGreaterThan(0);
        expect(val).toBeLessThan(2);
      }
    }
  });

  it('GENRE-02: unknown genre → default profile', () => {
    const profile = getGenreProfile('unknown-genre-xyz');
    expect(profile.genre).toBe('default');
    expect(profile.weight_multipliers.ecc).toBe(1.0);
  });

  it('GENRE-03: applyGenreWeights preserves total', () => {
    const base = { ecc: 0.30, rci: 0.17, sii: 0.18, ifi: 0.15, aai: 0.20 };
    const baseTotal = Object.values(base).reduce((a, b) => a + b, 0);

    for (const genre of ['thriller', 'romance', 'contemplatif', 'noir'] as const) {
      const adjusted = applyGenreWeights(base, genre);
      const adjTotal = Object.values(adjusted).reduce((a, b) => a + b, 0);

      // Total should be approximately preserved (within rounding)
      expect(Math.abs(adjTotal - baseTotal)).toBeLessThan(0.05);
    }
  });

  it('GENRE-04: thriller boosts ECC weight', () => {
    const base = { ecc: 0.30, rci: 0.17, sii: 0.18, ifi: 0.15, aai: 0.20 };
    const adjusted = applyGenreWeights(base, 'thriller');

    // Thriller: ecc multiplier = 1.2, sii = 0.9
    // After normalization, ecc should be relatively higher vs sii
    expect(adjusted.ecc / adjusted.sii).toBeGreaterThan(base.ecc / base.sii);
  });

  it('GENRE-05: getGenreAxisFloor clamps [30, 70]', () => {
    // Contemplatif has rci floor +5
    const floor = getGenreAxisFloor(50, 'rci', 'contemplatif');
    expect(floor).toBe(55);
    expect(floor).toBeGreaterThanOrEqual(30);
    expect(floor).toBeLessThanOrEqual(70);

    // Edge: extreme base floor
    const lowFloor = getGenreAxisFloor(25, 'rci', 'contemplatif');
    expect(lowFloor).toBe(30); // clamped
  });

  it('GENRE-06: getGenreThreshold adjusts within [85, 98]', () => {
    // Default: no adjustment
    expect(getGenreThreshold(93, 'default')).toBe(93);

    // Contemplatif: -2
    expect(getGenreThreshold(93, 'contemplatif')).toBe(91);

    // Clamp test
    expect(getGenreThreshold(86, 'contemplatif')).toBe(85); // 86-2=84 → clamped to 85
  });

  it('GENRE-07: getAllGenreProfiles returns all', () => {
    const profiles = getAllGenreProfiles();
    expect(profiles.length).toBe(listGenres().length);
  });

  it('GENRE-08: determinism', () => {
    const base = { ecc: 0.30, rci: 0.17, sii: 0.18, ifi: 0.15, aai: 0.20 };

    const a1 = applyGenreWeights(base, 'thriller');
    const a2 = applyGenreWeights(base, 'thriller');

    expect(a1.ecc).toBe(a2.ecc);
    expect(a1.rci).toBe(a2.rci);
    expect(a1.sii).toBe(a2.sii);
  });
});
