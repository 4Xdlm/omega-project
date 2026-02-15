/**
 * Tests pour symbol-map-oracle (9 checks de validation)
 */

import { describe, it, expect } from 'vitest';
import { validateSymbolMap } from '../../src/symbol/symbol-map-oracle.js';
import { MOCK_SYMBOL_MAP } from '../fixtures/mock-symbol-map.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';
import type { SymbolMap } from '../../src/types.js';

describe('validateSymbolMap', () => {
  it('symbol map valide → { valid: true }', () => {
    const result = validateSymbolMap(MOCK_SYMBOL_MAP, MOCK_PACKET);

    expect(result.valid).toBe(true);
    expect(result.errors.filter((e) => e.severity === 'FATAL')).toHaveLength(0);
  });

  it('CHECK 1: sensory quota ≠ 1.0 → FAIL', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      quartiles: [
        {
          ...MOCK_SYMBOL_MAP.quartiles[0],
          sensory_quota: {
            vue: 0.5,
            son: 0.2,
            toucher: 0.2,
            odeur: 0.1,
            temperature: 0.05, // Sum = 1.05
          },
        },
        MOCK_SYMBOL_MAP.quartiles[1],
        MOCK_SYMBOL_MAP.quartiles[2],
        MOCK_SYMBOL_MAP.quartiles[3],
      ],
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('sensory_quota'))).toBe(true);
  });

  it('CHECK 2: lexical field dans kill_list → FAIL', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      quartiles: [
        {
          ...MOCK_SYMBOL_MAP.quartiles[0],
          lexical_fields: ['suddenly', 'peur', 'angoisse'], // 'suddenly' in banned_words
        },
        MOCK_SYMBOL_MAP.quartiles[1],
        MOCK_SYMBOL_MAP.quartiles[2],
        MOCK_SYMBOL_MAP.quartiles[3],
      ],
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('kill_list'))).toBe(true);
  });

  it('CHECK 3: replacement est un cliché → FAIL', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      global: {
        ...MOCK_SYMBOL_MAP.global,
        anti_cliche_replacements: [
          { cliche: 'test', replacement: 'cœur battait' }, // 'cœur battait' in banned_cliches
        ],
      },
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('anti_cliche_replacements'))).toBe(true);
  });

  it('CHECK 4: imagery mode invalide → FAIL', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      quartiles: [
        {
          ...MOCK_SYMBOL_MAP.quartiles[0],
          imagery_modes: ['invalid_mode', 'mécanique'] as any,
        },
        MOCK_SYMBOL_MAP.quartiles[1],
        MOCK_SYMBOL_MAP.quartiles[2],
        MOCK_SYMBOL_MAP.quartiles[3],
      ],
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Invalid mode'))).toBe(true);
  });

  it('CHECK 4: imagery trop loin du seed CALC (2 diff) → FAIL', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      quartiles: [
        {
          ...MOCK_SYMBOL_MAP.quartiles[0],
          imagery_modes: ['lumière', 'aérien'], // Devrait être ['obscurité', 'mécanique']
        },
        MOCK_SYMBOL_MAP.quartiles[1],
        MOCK_SYMBOL_MAP.quartiles[2],
        MOCK_SYMBOL_MAP.quartiles[3],
      ],
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Too far from CALC seed'))).toBe(true);
  });

  it('CHECK 5: < 3 lexical fields distincts → FAIL', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      quartiles: [
        { ...MOCK_SYMBOL_MAP.quartiles[0], lexical_fields: ['peur', 'peur', 'peur'] },
        { ...MOCK_SYMBOL_MAP.quartiles[1], lexical_fields: ['peur', 'peur', 'peur'] },
        { ...MOCK_SYMBOL_MAP.quartiles[2], lexical_fields: ['angoisse', 'angoisse', 'angoisse'] },
        { ...MOCK_SYMBOL_MAP.quartiles[3], lexical_fields: ['angoisse', 'angoisse', 'angoisse'] },
      ],
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field.includes('lexical_fields'))).toBe(true);
  });

  it('CHECK 6: short_ratio range < 0.15 → ERROR', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      quartiles: [
        { ...MOCK_SYMBOL_MAP.quartiles[0], syntax_profile: { ...MOCK_SYMBOL_MAP.quartiles[0].syntax_profile, short_ratio: 0.3 } },
        { ...MOCK_SYMBOL_MAP.quartiles[1], syntax_profile: { ...MOCK_SYMBOL_MAP.quartiles[1].syntax_profile, short_ratio: 0.32 } },
        { ...MOCK_SYMBOL_MAP.quartiles[2], syntax_profile: { ...MOCK_SYMBOL_MAP.quartiles[2].syntax_profile, short_ratio: 0.34 } },
        { ...MOCK_SYMBOL_MAP.quartiles[3], syntax_profile: { ...MOCK_SYMBOL_MAP.quartiles[3].syntax_profile, short_ratio: 0.36 } },
      ],
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    // ERROR severity, pas FATAL, donc valid peut être true
    expect(result.errors.some((e) => e.field.includes('short_ratio'))).toBe(true);
  });

  it('CHECK 7: interiority delta > 0.5 → ERROR', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      quartiles: [
        { ...MOCK_SYMBOL_MAP.quartiles[0], interiority_ratio: 0.2 },
        { ...MOCK_SYMBOL_MAP.quartiles[1], interiority_ratio: 0.8 }, // Delta = 0.6 > 0.5
        MOCK_SYMBOL_MAP.quartiles[2],
        MOCK_SYMBOL_MAP.quartiles[3],
      ],
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    expect(result.errors.some((e) => e.field.includes('interiority_ratio'))).toBe(true);
  });

  it('CHECK 8: < 3 forbidden moves → ERROR', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      global: {
        ...MOCK_SYMBOL_MAP.global,
        forbidden_moves: ['move1', 'move2'], // Seulement 2
      },
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    expect(result.errors.some((e) => e.field.includes('forbidden_moves'))).toBe(true);
  });

  it('CHECK 9: commandment > 150 chars → ERROR', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      global: {
        ...MOCK_SYMBOL_MAP.global,
        one_line_commandment: 'A'.repeat(151), // 151 chars
      },
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    expect(result.errors.some((e) => e.field.includes('commandment'))).toBe(true);
  });

  it('symbol map avec FATAL + ERROR → valid false', () => {
    const invalidMap: SymbolMap = {
      ...MOCK_SYMBOL_MAP,
      quartiles: [
        {
          ...MOCK_SYMBOL_MAP.quartiles[0],
          sensory_quota: {
            vue: 0.5,
            son: 0.5, // Sum = 1.3
            toucher: 0.2,
            odeur: 0.05,
            temperature: 0.05,
          },
        },
        MOCK_SYMBOL_MAP.quartiles[1],
        MOCK_SYMBOL_MAP.quartiles[2],
        MOCK_SYMBOL_MAP.quartiles[3],
      ],
      global: {
        ...MOCK_SYMBOL_MAP.global,
        forbidden_moves: ['move1'], // < 3
      },
    };

    const result = validateSymbolMap(invalidMap, MOCK_PACKET);

    expect(result.valid).toBe(false); // FATAL error présente
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
