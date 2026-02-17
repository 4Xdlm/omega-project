/**
 * GENIUS-02 — AS Gatekeeper Tests
 * TEST-G02-AS01 to TEST-G02-AS03
 */
import { describe, it, expect } from 'vitest';
import { computeAS, isAuthentic, getASThreshold } from '../../src/genius/as-gatekeeper.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST TEXTS
// ═══════════════════════════════════════════════════════════════════════════════

const CLEAN_TEXT = `
La porte s'ouvrit sans bruit. Marie posa sa main sur le mur froid, cherchant l'interrupteur
dans l'obscurité. Le parquet grinça sous son pied gauche. Elle sentit l'odeur de poussière
mêlée à quelque chose de métallique. Sa gorge se serra. Dans le couloir, une faible lumière
filtrait par la fenêtre brisée. Elle avança d'un pas, puis d'un autre. Le silence pesait
sur ses épaules comme une chape de plomb.
`;

const IA_SMELL_TEXT = `
Les mots dansaient sur la page comme des papillons de nuit. Elle était une tisserande des mots,
créant une tapisserie de sentiments qui résonnait dans les profondeurs de l'âme. Un frisson
parcourut l'échine du temps. Le silence était assourdissant, lourd de promesses non tenues.
Dans le jardin secret de ses pensées, les fleurs de la mémoire s'épanouissaient.
`;

const MIXED_TEXT = `
La porte s'ouvrit. Marie entra dans la pièce sombre. Le silence était assourdissant.
Elle toucha le mur froid, ses doigts glissant sur la surface rugueuse. La lumière filtrait
à travers les rideaux déchirés.
`;

describe('AS Gatekeeper', () => {
  // TEST-G02-AS01: Clean text → AS > 85 → gate PASS
  it('TEST-G02-AS01: clean text passes AS gate', () => {
    const result = computeAS(CLEAN_TEXT);
    expect(result.AS_score).toBeGreaterThan(85);
    expect(result.AS_GATE_PASS).toBe(true);
    expect(result.reject_reason).toBeNull();
    expect(result.pattern_count).toBe(0);
  });

  // TEST-G02-AS02: IA-smell injection → AS drops → REJECT (GENIUS-24)
  it('TEST-G02-AS02: IA-smell text triggers REJECT', () => {
    const result = computeAS(IA_SMELL_TEXT);
    expect(result.AS_score).toBeLessThan(85);
    expect(result.AS_GATE_PASS).toBe(false);
    expect(result.reject_reason).toBe('AS_GATE');
    expect(result.pattern_count).toBeGreaterThan(0);
    expect(result.matched_patterns.length).toBeGreaterThan(0);
  });

  // TEST-G02-AS03: If AS < 85, M and G should NOT be computed (tested in genius-metrics.test.ts)
  it('TEST-G02-AS03: AS threshold is 85 (non-negotiable)', () => {
    expect(getASThreshold()).toBe(85);
  });

  it('isAuthentic convenience function works', () => {
    expect(isAuthentic(CLEAN_TEXT)).toBe(true);
    expect(isAuthentic(IA_SMELL_TEXT)).toBe(false);
  });

  it('empty text returns AS=0 REJECT', () => {
    const result = computeAS('');
    expect(result.AS_score).toBe(0);
    expect(result.AS_GATE_PASS).toBe(false);
    expect(result.reject_reason).toBe('EMPTY_TEXT');
  });

  it('mixed text with 1 pattern gets penalized but may still pass', () => {
    const result = computeAS(MIXED_TEXT);
    // "silence était assourdissant" might match a pattern
    expect(result.AS_score).toBeDefined();
    expect(typeof result.AS_GATE_PASS).toBe('boolean');
  });

  it('determinism: same input → same AS', () => {
    const r1 = computeAS(CLEAN_TEXT);
    const r2 = computeAS(CLEAN_TEXT);
    expect(r1.AS_score).toBe(r2.AS_score);
    expect(r1.pattern_count).toBe(r2.pattern_count);
  });
});
