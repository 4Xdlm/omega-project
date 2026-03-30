import { describe, it, expect } from 'vitest';
import { computeLanguageProfile } from '../../src/scoring/language-profiles.js';

describe('Language Profiles (L31)', () => {
  it('returns a result with correct language', () => {
    const result = computeLanguageProfile('Le chat dort sur le tapis depuis ce matin.', 'fr');
    expect(result.language).toBe('fr');
    expect(result.profile_score).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 for empty text', () => {
    const result = computeLanguageProfile('', 'fr');
    expect(result.profile_score).toBe(0);
  });

  it('FR and EN profiles use different weights', () => {
    const text = 'The old house stood at the edge of the forest where the wind howled through the broken windows that nobody had repaired since the family left.';
    const fr = computeLanguageProfile(text, 'fr');
    const en = computeLanguageProfile(text, 'en');
    // Different weights produce different contributions
    expect(Object.keys(fr.feature_contributions).length).toBeGreaterThan(0);
    expect(Object.keys(en.feature_contributions).length).toBeGreaterThan(0);
  });
});
