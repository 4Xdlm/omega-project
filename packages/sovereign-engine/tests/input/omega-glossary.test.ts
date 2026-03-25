/**
 * Tests: OMEGA Glossary — operational vocabulary for LLM prompts
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import { OMEGA_GLOSSARY, compileGlossary } from '../../src/input/omega-glossary.js';

describe('omega-glossary', () => {
  it('compileGlossary returns non-empty string', () => {
    const result = compileGlossary();
    expect(result.length).toBeGreaterThan(100);
  });

  it('compileGlossary contains all 5 terms', () => {
    const result = compileGlossary();
    const terms = [
      'Souffle de Flaubert',
      'Murmure de Duras',
      'Nappe phrastique',
      'Incarnation sensorielle',
      'Dilatation temporelle',
    ];
    for (const term of terms) {
      expect(result).toContain(term);
    }
  });

  it('glossary does not contain metrics (CV, f26b, etc.)', () => {
    const result = compileGlossary();
    expect(result).not.toMatch(/\bf26b\b/);
    expect(result).not.toMatch(/\bCV\b/);
    expect(result).not.toMatch(/\bf1a\b/);
    expect(result).not.toMatch(/\bGB V1\b/);
    expect(result).not.toMatch(/\bSAGA_READY\b/);
  });

  it('OMEGA_GLOSSARY has exactly 5 entries', () => {
    expect(OMEGA_GLOSSARY).toHaveLength(5);
  });

  it('each entry has term and definition', () => {
    for (const entry of OMEGA_GLOSSARY) {
      expect(entry.term.length).toBeGreaterThan(3);
      expect(entry.definition.length).toBeGreaterThan(20);
    }
  });

  it('glossary budget stays under 300 tokens (~1200 chars)', () => {
    const result = compileGlossary();
    // ~4 chars per token
    const estimatedTokens = Math.ceil(result.length / 4);
    expect(estimatedTokens).toBeLessThanOrEqual(300);
  });
});
