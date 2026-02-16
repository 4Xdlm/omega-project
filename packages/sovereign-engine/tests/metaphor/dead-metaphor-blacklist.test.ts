/**
 * Tests: Dead Metaphor Blacklist FR (Sprint 12.1)
 * Invariant: ART-META-01
 */

import { describe, it, expect } from 'vitest';
import { DEAD_METAPHORS_FR, isDeadMetaphor } from '../../src/metaphor/dead-metaphor-blacklist.js';

describe('Dead Metaphor Blacklist FR (ART-META-01)', () => {
  it('BL-01: DEAD_METAPHORS_FR.length >= 500', () => {
    expect(DEAD_METAPHORS_FR.length).toBeGreaterThanOrEqual(500);
  });

  it('BL-02: "le cœur serré" → détecté (found: true)', () => {
    const result = isDeadMetaphor('le cœur serré');

    expect(result.found).toBe(true);
    expect(result.matches).toContain('le cœur serré');
  });

  it('BL-03: "le cœur d\'un réacteur nucléaire" → PAS détecté (contexte technique)', () => {
    const result = isDeadMetaphor('le cœur d\'un réacteur nucléaire');

    // Should NOT match because "le cœur d'un réacteur nucléaire" is technical, not metaphorical
    // However, our blacklist contains "le cœur serré" which would match the substring "le cœur"
    // This test verifies that we don't have overly broad matches

    // Since our current implementation checks if normalized phrase contains normalized entry,
    // "le cœur d'un réacteur nucléaire" would match "le cœur serré" if the entry were just "le cœur"
    // But our blacklist has full phrases, so "le cœur serré" won't match "le cœur d'un réacteur"
    expect(result.found).toBe(false);
  });

  it('BL-04: normalisation accent/casse fonctionne ("Le Cœur Serré" → détecté)', () => {
    // Test case insensitivity and accent normalization
    const result = isDeadMetaphor('Le Cœur Serré');

    expect(result.found).toBe(true);
    expect(result.matches.length).toBeGreaterThan(0);
  });
});
