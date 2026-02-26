// tests/oracle/calc-judges/soma-gate.test.ts
// INV-SOMA-01 — Hard Gate anatomie générique — 5 tests
// W2 — Phase T

import { describe, it, expect } from 'vitest';
import { applySomaGate } from '../../../src/oracle/calc-judges/soma-gate.js';

describe('soma-gate — INV-SOMA-01 Hard Gate', () => {

  // Test 1: prose sans anatomie générique → PASS
  it('prose propre sans anatomie générique → PASS', () => {
    const result = applySomaGate(
      'Le vent traversait la rue étroite. Les pavés luisaient sous la pluie.',
    );
    expect(result.passed).toBe(true);
    expect(result.verdict).toBe('PASS');
    expect(result.violations_count).toBe(0);
    expect(result.blocking_patterns).toHaveLength(0);
  });

  // Test 2: "ses mains tremblaient" → REJECT, violations >= 1
  it('"ses mains tremblaient" → REJECT, violations >= 1', () => {
    const result = applySomaGate(
      'Ses mains tremblaient dans le noir. Le couloir sentait la rouille.',
    );
    expect(result.passed).toBe(false);
    expect(result.verdict).toBe('REJECT');
    expect(result.violations_count).toBeGreaterThanOrEqual(1);
  });

  // Test 3: 3 patterns anatomie → REJECT, violations >= 3
  it('3 patterns anatomie → REJECT, violations >= 3', () => {
    const result = applySomaGate(
      'Son cœur s\'emballa. Ses mains tremblaient. Ses jambes flageolaient.',
    );
    expect(result.passed).toBe(false);
    expect(result.verdict).toBe('REJECT');
    expect(result.violations_count).toBeGreaterThanOrEqual(3);
  });

  // Test 4: blocking_patterns non vide sur REJECT
  it('blocking_patterns liste les matches sur REJECT', () => {
    const result = applySomaGate(
      'Ses mains tremblaient sous la table. Elle ne savait plus quoi dire.',
    );
    expect(result.passed).toBe(false);
    expect(result.blocking_patterns.length).toBeGreaterThanOrEqual(1);
  });

  // Test 5: verdict REJECT → intégration pipeline bloque
  it('verdict REJECT signale blocage pipeline', () => {
    const result = applySomaGate(
      'Ses yeux s\'écarquillèrent devant la scène.',
    );
    expect(result.verdict).toBe('REJECT');
    expect(result.passed).toBe(false);
  });
});
