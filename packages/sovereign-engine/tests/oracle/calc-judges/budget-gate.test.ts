// tests/oracle/calc-judges/budget-gate.test.ts
// INV-BUDGET-01 + INV-RETEN-01 — Hard Gate révélation — 6 tests
// W2 — Phase T

import { describe, it, expect } from 'vitest';
import { applyBudgetGate, splitIntoQuartiles } from '../../../src/oracle/calc-judges/budget-gate.js';

// Helper: construit une prose de ~400 chars avec le pattern dans le quartile voulu
function buildProseWithPatternInQuartile(pattern: string, quartile: 1 | 2 | 3 | 4): string {
  const filler = 'Les ombres couvraient le sol ancien. '; // 36 chars
  const segments: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (i === quartile - 1) {
      segments.push(filler + pattern + ' ' + filler);
    } else {
      segments.push(filler.repeat(3));
    }
  }
  return segments.join('');
}

describe('budget-gate — INV-BUDGET-01 + INV-RETEN-01', () => {

  // Test 1: prose sans révélation prématurée → PASS
  it('prose sans révélation prématurée → PASS', () => {
    const prose = 'Les ombres couvraient le sol. '.repeat(20);
    const result = applyBudgetGate(prose);
    expect(result.passed).toBe(true);
    expect(result.verdict).toBe('PASS');
    expect(result.violation_type).toBeNull();
    expect(result.penalty).toBe(0);
  });

  // Test 2: "la vérité était" en Q1 → REJECT, violation_quartile=1
  it('"la vérité était" en Q1 → REJECT, quartile=1', () => {
    const prose = buildProseWithPatternInQuartile('la vérité était cachée depuis longtemps', 1);
    const result = applyBudgetGate(prose);
    expect(result.passed).toBe(false);
    expect(result.verdict).toBe('REJECT');
    expect(result.violation_type).toBe('PREMATURE_REVELATION');
    expect(result.violation_quartile).toBe(1);
    expect(result.penalty).toBe(-25);
  });

  // Test 3: "en réalité" en Q2 → REJECT, violation_quartile=2
  it('"en réalité" en Q2 → REJECT, quartile=2', () => {
    const prose = buildProseWithPatternInQuartile('en réalité personne ne savait rien', 2);
    const result = applyBudgetGate(prose);
    expect(result.passed).toBe(false);
    expect(result.verdict).toBe('REJECT');
    expect(result.violation_type).toBe('PREMATURE_REVELATION');
    expect(result.violation_quartile).toBe(2);
  });

  // Test 4: même pattern en Q3 → PASS (révélation tardive = correct)
  it('"la vérité était" en Q3 → PASS (révélation tardive)', () => {
    const prose = buildProseWithPatternInQuartile('la vérité était cachée depuis longtemps', 3);
    const result = applyBudgetGate(prose);
    expect(result.passed).toBe(true);
    expect(result.verdict).toBe('PASS');
  });

  // Test 5: même pattern en Q4 → PASS
  it('"en réalité" en Q4 → PASS', () => {
    const prose = buildProseWithPatternInQuartile('en réalité tout avait changé', 4);
    const result = applyBudgetGate(prose);
    expect(result.passed).toBe(true);
    expect(result.verdict).toBe('PASS');
  });

  // Test 6: splitIntoQuartiles produit 4 chunks
  it('splitIntoQuartiles: 4 chunks de longueur correcte', () => {
    const prose = 'A'.repeat(100);
    const quartiles = splitIntoQuartiles(prose);
    expect(quartiles).toHaveLength(4);
    expect(quartiles[0]).toHaveLength(25);
    expect(quartiles[1]).toHaveLength(25);
    expect(quartiles[2]).toHaveLength(25);
    expect(quartiles[3]).toHaveLength(25);
  });
});
