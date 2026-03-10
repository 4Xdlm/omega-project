/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TESTS — POLISH ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/validation/polish-engine.test.ts
 * Coverage: shouldApplyPolish, checkDrift, applyPolishPass (mock provider)
 *
 * INV-PE-01..06 testés.
 * Standard: NASA-Grade L4 / DO-178C
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';
import {
  shouldApplyPolish,
  checkDrift,
  applyPolishPass,
  verifyAxesStability,
  POLISH_MIN_COMPOSITE,
  POLISH_SEAL_THRESHOLD,
  NEAR_SEAL_THRESHOLD,
  COMPOSITE_TOLERANCE,
  MIN_TARGET_AXIS_GAIN,
  SII_FLOOR,
  NOVELTY_TARGET,
  DRIFT_MAX_PARAGRAPHS,
  MAX_REGRESSION_DELTA,
  type PolishAxesSnapshot,
} from '../../src/validation/phase-u/polish-engine.js';
import type { SovereignProvider } from '../../src/types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAxes(overrides: Partial<PolishAxesSnapshot> = {}): PolishAxesSnapshot {
  return {
    composite: 93.3,
    ecc: 96.6,
    rci: 87.9,
    sii: 84.8,
    ifi: 99,
    aai: 95.6,
    metaphor_novelty: 72.4,
    necessity: 85,
    anti_cliche: 97,
    ...overrides,
  };
}

// ~80 mots par version pour que le delta (+2 mots) reste < 7%
const PROSE_3_PARAGRAPHS = `Elle traversa la salle sans regarder personne. Les chaises alignées comme des témoins muets formaient deux rangées étroites. Le parquet grinçait sous ses pas, régulièrement.

Il était assis près de la fenêtre, le dos tourné. Elle reconnut la forme de ses épaules avant même d’apercevoir son visage. La lumière du dehors le découpait en silhouette sombre.

Elle posa la main sur la table. Rien d’autre.`;

// Version polie : un seul mot remplacé dans le premier paragraphe (Δ = 0 mot, drift < 1%)
const PROSE_POLISHED_3_PARAGRAPHS = `Elle traversa la salle sans regarder personne. Les chaises alignées comme des témoins muets formaient deux rangées étroites. Le plancher grinçait sous ses pas, régulièrement.

Il était assis près de la fenêtre, le dos tourné. Elle reconnut la forme de ses épaules avant même d’apercevoir son visage. La lumière du dehors le découpait en silhouette sombre.

Elle posa la main sur la table. Rien d’autre.`;

function makeMockProvider(response: string): SovereignProvider {
  return {
    generateDraft: vi.fn().mockResolvedValue(response),
    generateStructuredJSON: vi.fn(),
    scoreInteriority: vi.fn(),
    scoreSensoryDensity: vi.fn(),
    scoreNecessity: vi.fn(),
    scoreImpact: vi.fn(),
    applyPatch: vi.fn(),
    rewriteSentence: vi.fn(),
  } as unknown as SovereignProvider;
}

// ── shouldApplyPolish ─────────────────────────────────────────────────────────

describe('shouldApplyPolish — INV-PE-01 + INV-PE-06', () => {
  it('PE-01: retourne TRUE pour le Patient Zéro U-07 Run 3 (composite=93.3 mais SII=84.8 < floor)', () => {
    // composite=93.3 >= 93.0 MAIS sii=84.8 < 85 — pas SEAL-compliant — polish doit s'appliquer
    const axes = makeAxes(); // composite=93.3, sii=84.8, metaphor_novelty=72.4, ecc=96.6, rci=87.9
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(true);
    expect(result.target_axis).toBe('sii');
    expect(result.reason).toContain('polish sii ciblé');
  });

  it('PE-01b: retourne true pour composite=92.5, SII=84.8, metaphor_novelty=72.4', () => {
    const axes = makeAxes({ composite: 92.5 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(true);
    expect(result.target_axis).toBe('sii');
    expect(result.reason).toContain('polish sii ciblé');
  });

  it('PE-01c: retourne false si composite < POLISH_MIN', () => {
    const axes = makeAxes({ composite: 88.0, sii: 82.0 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(false);
    expect(result.reason).toContain('trop dégradé');
  });

  it('PE-01d: retourne false si composite >= 93 ET tous les floors atteints (SEAL-compliant)', () => {
    const axes = makeAxes({ composite: 94.0, sii: 86.0, ecc: 90.0, rci: 86.0, metaphor_novelty: 85.0 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(false);
    expect(result.reason).toContain('SEAL-compliant');
  });

  it('PE-01e2: retourne TRUE si composite >= 93 mais SII < 85 (floors incomplets)', () => {
    const axes = makeAxes({ composite: 93.3, sii: 84.8, ecc: 96.6, rci: 87.9, metaphor_novelty: 72.4 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(true);
  });

  it('PE-06a: retourne TRUE si SII >= floor mais composite < 93 (INV-PE-10 — ciblage dynamique)', () => {
    // Cas TK1 : sii=86, rci=87.9, composite=91.0 — tous floors OK mais composite < 93
    // Nouveau comportement : polish déclenché, target = sii (le plus faible)
    const axes = makeAxes({ composite: 91.0, sii: 86.0, rci: 87.9, metaphor_novelty: 80.0 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(true);
    expect(result.target_axis).toBe('sii');  // INV-PE-10 : RCI interdit, toujours sii
    expect(result.reason).toContain('92.5');
  });

  it('PE-06b: retourne false si sii < floor ET metaphor_novelty >= NOVELTY_TARGET ET rci OK', () => {
    // SII sous floor mais metaphor_novelty déjà >= 82 → gap vient de anti_cliche/necessity
    // Le polish métaphore ne peut pas aider → NO_OP
    const axes = makeAxes({ composite: 91.0, sii: 84.0, rci: 87.9, metaphor_novelty: 83.0 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(false);
    expect(result.reason).toContain('metaphor_novelty');
  });

  it('PE-06c: retourne false si ECC < 88 — INV-PE-06 (trop dégradé pour polish)', () => {
    const axes = makeAxes({ composite: 91.0, sii: 83.0, metaphor_novelty: 70.0, ecc: 87.0 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(false);
    expect(result.reason).toContain('ECC');
  });

  it('PE-01e: POLISH_MIN_COMPOSITE est 89.0', () => {
    expect(POLISH_MIN_COMPOSITE).toBe(89.0);
  });

  it('PE-01f: POLISH_SEAL_THRESHOLD est 93.0', () => {
    expect(POLISH_SEAL_THRESHOLD).toBe(93.0);
  });

  it('PE-06d: SII_FLOOR est 85.0', () => {
    expect(SII_FLOOR).toBe(85.0);
  });

  it('PE-06e: NOVELTY_TARGET est 82.0', () => {
    expect(NOVELTY_TARGET).toBe(82.0);
  });

  // ── INV-PE-09 : ciblage dynamique ────────────────────────────────────────────

  it('PE-09a: cible SII si sii=85.5, rci=87.9, composite=91.47 (cas TK1 réel)', () => {
    // TK1 était NO_OP à cause de sii >= 85 — doit maintenant se déclencher
    const axes = makeAxes({ composite: 91.47, sii: 85.5, rci: 87.9, ecc: 92.7, metaphor_novelty: 75 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(true);
    expect(result.target_axis).toBe('sii');  // 85.5 < 87.9 → sii plus faible
  });

  it('PE-09b: cible SII si sii=83.0, rci=86.0, composite=90.6 (cas TK2 réel)', () => {
    // siiGap = 2.0 > rciGap = 0 → target sii
    const axes = makeAxes({ composite: 90.6, sii: 83.0, rci: 86.0, ecc: 91.0, metaphor_novelty: 64.0 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(true);
    expect(result.target_axis).toBe('sii');
  });

  it('PE-10a: cible RCI si rciGap > siiGap', () => {
    // sii=88 (gap=0), rci=83 (gap=2) → target rci
    const axes = makeAxes({ composite: 90.2, sii: 88.0, rci: 83.0, ecc: 90.9, metaphor_novelty: 75 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(true);
    expect(result.target_axis).toBe('rci');
  });

  it('PE-10b: cible SII si siiGap > rciGap', () => {
    // sii=82 (gap=3), rci=84.3 (gap=0.7) → target sii
    const axes = makeAxes({ composite: 90.5, sii: 82.0, rci: 84.3, ecc: 91.6, metaphor_novelty: 74.0 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(true);
    expect(result.target_axis).toBe('sii');
  });

  it('PE-10c: target_axis est null si NO_OP', () => {
    const axes = makeAxes({ composite: 88.0, sii: 82.0 }); // composite < POLISH_MIN
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(false);
    expect(result.target_axis).toBeNull();
  });

  it('PE-10d: cible SII si tous floors OK (INV-PE-10 — SII exclusif)', () => {
    const axes = makeAxes({ composite: 90.5, sii: 85.3, rci: 87.0, ecc: 91.5, metaphor_novelty: 76 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(true);
    expect(result.target_axis).toBe('sii');  // INV-PE-10 : RCI interdit, toujours sii
  });

  // ── INV-PE-11 : NEAR_SEAL_THRESHOLD ───────────────────────────────────────────

  it('PE-11a: NO_OP si composite >= NEAR_SEAL_THRESHOLD ET tous floors OK (cas TK1 réel)', () => {
    // TK1 U-ROSETTE-11 : composite=92.9945, sii=90.3, rci=88.1, ecc=95.2 → variance oracle > gap
    const axes = makeAxes({ composite: 92.9945, sii: 90.3, rci: 88.1, ecc: 95.2, metaphor_novelty: 85 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(false);
    expect(result.target_axis).toBeNull();
    expect(result.reason).toContain('NEAR_SEAL');
  });

  it('PE-11b: NO_OP si composite=92.5 (exactement NEAR_SEAL) ET floors OK', () => {
    const axes = makeAxes({ composite: 92.5, sii: 86.0, rci: 86.0, ecc: 90.0, metaphor_novelty: 83 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(false);
    expect(result.reason).toContain('NEAR_SEAL');
  });

  it('PE-11c: polish autorisé si composite=92.4 ET floors OK (sous NEAR_SEAL, INV-PE-10)', () => {
    const axes = makeAxes({ composite: 92.4, sii: 86.0, rci: 86.0, ecc: 90.0, metaphor_novelty: 83 });
    const result = shouldApplyPolish(axes);
    expect(result.should_polish).toBe(true);
    expect(result.target_axis).toBe('sii');  // INV-PE-10 : RCI interdit
  });

  it('PE-11d: NEAR_SEAL_THRESHOLD vaut 92.5', () => {
    expect(NEAR_SEAL_THRESHOLD).toBe(92.5);
  });

  // ── INV-PE-12 : constantes d’acceptance ──────────────────────────────────────

  it('PE-12a: COMPOSITE_TOLERANCE vaut 1.0', () => {
    expect(COMPOSITE_TOLERANCE).toBe(1.0);
  });

  it('PE-12b: MIN_TARGET_AXIS_GAIN vaut 1.0', () => {
    expect(MIN_TARGET_AXIS_GAIN).toBe(1.0);
  });
});

// ── checkDrift ────────────────────────────────────────────────────────────────

describe('checkDrift — INV-PE-02 + INV-PE-04', () => {
  it('PE-02a: drift ok si même nombre de paragraphes', () => {
    const result = checkDrift(PROSE_3_PARAGRAPHS, PROSE_POLISHED_3_PARAGRAPHS);
    expect(result.paragraphs_before).toBe(3);
    expect(result.paragraphs_after).toBe(3);
    expect(result.drift_paragraphs).toBe(0);
    expect(result.drift_ok).toBe(true);
  });

  it('PE-02b: drift ko si nombre de paragraphes change', () => {
    const polishedExtra = PROSE_3_PARAGRAPHS + '\n\nQuatrième paragraphe ajouté par le LLM hors contrat.';
    const result = checkDrift(PROSE_3_PARAGRAPHS, polishedExtra);
    expect(result.paragraphs_before).toBe(3);
    expect(result.paragraphs_after).toBe(4);
    expect(result.drift_paragraphs).toBe(1);
    expect(result.drift_ok).toBe(false);
  });

  it('PE-04a: DRIFT_MAX_PARAGRAPHS est 0 (strict)', () => {
    expect(DRIFT_MAX_PARAGRAPHS).toBe(0);
  });

  it('PE-02c: drift ok si variation mots < 7%', () => {
    // ~40 mots original, ~42 mots poli = 5% de drift
    const original = 'Un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dix-sept dix-huit dix-neuf vingt vingt-et-un vingt-deux vingt-trois vingt-quatre vingt-cinq vingt-six vingt-sept vingt-huit vingt-neuf trente trente-et-un trente-deux trente-trois trente-quatre trente-cinq trente-six trente-sept trente-huit trente-neuf quarante.';
    const polished = 'Un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dix-sept dix-huit dix-neuf vingt vingt-et-un vingt-deux vingt-trois vingt-quatre vingt-cinq vingt-six vingt-sept vingt-huit vingt-neuf trente trente-et-un trente-deux trente-trois trente-quatre trente-cinq trente-six trente-sept trente-huit trente-neuf quarante plus.';
    const result = checkDrift(original, polished);
    expect(result.drift_ok).toBe(true);
  });

  it('PE-04b: drift ko si variation mots > 7%', () => {
    const original = 'Phrase courte.';
    const polished = 'Phrase très longue avec beaucoup de mots supplémentaires ajoutés par le LLM qui dépasse la limite.';
    const result = checkDrift(original, polished);
    expect(result.drift_ok).toBe(false);
  });
});

// ── applyPolishPass ───────────────────────────────────────────────────────────

describe('applyPolishPass — INV-PE-03 + INV-PE-05', () => {
  it('PE-05a: FAIL-CLOSED — status=FAIL_INFRA si provider lance une erreur', async () => {
    const errorProvider: SovereignProvider = {
      generateDraft: vi.fn().mockRejectedValue(new Error('LLM timeout')),
      generateStructuredJSON: vi.fn(),
      scoreInteriority: vi.fn(),
      scoreSensoryDensity: vi.fn(),
      scoreNecessity: vi.fn(),
      scoreImpact: vi.fn(),
      applyPatch: vi.fn(),
      rewriteSentence: vi.fn(),
    } as unknown as SovereignProvider;

    const axes = makeAxes({ composite: 91.0, sii: 84.0 });
    const result = await applyPolishPass(PROSE_3_PARAGRAPHS, axes, errorProvider, 1);

    expect(result.status).toBe('FAIL_INFRA');
    expect(result.applied).toBe(false);
    expect(result.polished_prose).toBe(PROSE_3_PARAGRAPHS);
    expect(result.reason).toContain('LLM_ERROR');
  });

  it('PE-05b: FAIL-CLOSED — status=FAIL_INFRA si réponse vide', async () => {
    const provider = makeMockProvider('');
    const axes = makeAxes({ composite: 91.0, sii: 84.0 });
    const result = await applyPolishPass(PROSE_3_PARAGRAPHS, axes, provider, 1);

    expect(result.status).toBe('FAIL_INFRA');
    expect(result.applied).toBe(false);
    expect(result.polished_prose).toBe(PROSE_3_PARAGRAPHS);
    expect(result.reason).toContain('EMPTY_RESPONSE');
  });

  it('PE-04c: status=REJECTED_DRIFT si drift paragraphes', async () => {
    const polishedWithExtraParagraph = PROSE_3_PARAGRAPHS + '\n\nParagraphe supplémentaire ajouté par le LLM.';
    const provider = makeMockProvider(polishedWithExtraParagraph);
    const axes = makeAxes({ composite: 91.0, sii: 84.0 });
    const result = await applyPolishPass(PROSE_3_PARAGRAPHS, axes, provider, 1);

    expect(result.status).toBe('REJECTED_DRIFT');
    expect(result.applied).toBe(false);
    expect(result.polished_prose).toBe(PROSE_3_PARAGRAPHS);
    expect(result.reason).toContain('DRIFT_REJECTED');
  });

  it('PE-03: status=POLISHED si drift ok', async () => {
    const provider = makeMockProvider(PROSE_POLISHED_3_PARAGRAPHS);
    const axes = makeAxes({ composite: 91.0, sii: 84.0 });
    const result = await applyPolishPass(PROSE_3_PARAGRAPHS, axes, provider, 1);

    expect(result.status).toBe('POLISHED');
    expect(result.applied).toBe(true);
    expect(result.polished_prose).toBe(PROSE_POLISHED_3_PARAGRAPHS);
    expect(result.pass_number).toBe(1);
  });

  it('PE-03b: passe le numéro de passe correctement', async () => {
    const provider = makeMockProvider(PROSE_POLISHED_3_PARAGRAPHS);
    const axes = makeAxes({ composite: 91.0, sii: 84.0 });
    const result = await applyPolishPass(PROSE_3_PARAGRAPHS, axes, provider, 2);

    expect(result.pass_number).toBe(2);
  });

  it('PE-02d: drift report contient les métriques correctes', async () => {
    const provider = makeMockProvider(PROSE_POLISHED_3_PARAGRAPHS);
    const axes = makeAxes({ composite: 91.0, sii: 84.0 });
    const result = await applyPolishPass(PROSE_3_PARAGRAPHS, axes, provider, 1);

    expect(result.drift.paragraphs_before).toBe(3);
    expect(result.drift.paragraphs_after).toBe(3);
    expect(result.drift.drift_paragraphs).toBe(0);
    expect(result.drift.drift_ok).toBe(true);
  });
});

// ── verifyAxesStability (INV-PE-08) ──────────────────────────────────────────────────────────────

describe('verifyAxesStability — INV-PE-08 (garde-fou régression ECC/RCI/IFI)', () => {
  it('PE-08a: stable si aucune régression (cas nominal)', () => {
    const before = makeAxes(); // ecc=96.6, rci=87.9, ifi=99
    const after  = makeAxes({ ecc: 96.0, rci: 87.5, ifi: 99, metaphor_novelty: 85, sii: 86, composite: 93.5 });
    const report = verifyAxesStability(before, after);
    expect(report.stability_ok).toBe(true);
    expect(report.failed_axes).toHaveLength(0);
  });

  it('PE-08b: REJET si ECC régresse de plus de MAX_REGRESSION_DELTA', () => {
    // Simulation exacte U-07→U-08 : ecc 96.6→88.0 = −8.6 (à comparer avec MAX=1.5)
    const before = makeAxes(); // ecc=96.6
    const after  = makeAxes({ ecc: 88.0, rci: 83.3, ifi: 99, metaphor_novelty: 87.4, sii: 87.5, composite: 89.6 });
    const report = verifyAxesStability(before, after);
    expect(report.stability_ok).toBe(false);
    expect(report.failed_axes.some(a => a.startsWith('ECC'))).toBe(true);
    expect(report.failed_axes.some(a => a.startsWith('RCI'))).toBe(true);
  });

  it('PE-08c: REJET si RCI seul régresse au-delà du seuil', () => {
    const before = makeAxes(); // rci=87.9
    const after  = makeAxes({ rci: 85.8, ecc: 96.6, ifi: 99, metaphor_novelty: 85, sii: 86, composite: 93.2 });
    // delta = 85.8 - 87.9 = -2.1 > MAX_REGRESSION_DELTA(2.0) → FAIL
    const report = verifyAxesStability(before, after);
    expect(report.stability_ok).toBe(false);
    expect(report.failed_axes.some(a => a.startsWith('RCI'))).toBe(true);
    expect(report.failed_axes.some(a => a.startsWith('ECC'))).toBe(false); // ECC stable
  });

  it('PE-08d: tolére une légère régression < MAX_REGRESSION_DELTA', () => {
    const before = makeAxes(); // ecc=96.6, rci=87.9
    const after  = makeAxes({ ecc: 95.5, rci: 87.0, ifi: 99, metaphor_novelty: 85, sii: 87, composite: 93.4 });
    // ecc: -1.1, rci: -0.9 — tous deux < MAX_REGRESSION_DELTA(1.5) → OK
    const report = verifyAxesStability(before, after);
    expect(report.stability_ok).toBe(true);
  });

  it('PE-08e: MAX_REGRESSION_DELTA vaut 2.0 (INV-PE-13)', () => {
    expect(MAX_REGRESSION_DELTA).toBe(2.0);
  });

  // ── INV-PE-13 : tolérance élargie + garde-fous ────────────────────────────────────

  it('PE-13a: stable si ECC régresse de -1.9 (cas TK2 réel — anciennement rejeté)', () => {
    // TK2 U-ROSETTE-12 : ECC 95.1→93.2 = δ=-1.9, rejeté car 1.9 > 1.5
    // Avec MAX=2.0 : 1.9 < 2.0 → accepté
    const before = makeAxes({ ecc: 95.1, rci: 87.9, ifi: 99 });
    const after  = makeAxes({ ecc: 93.2, rci: 87.9, ifi: 99, metaphor_novelty: 82, sii: 86, composite: 92.0 });
    const report = verifyAxesStability(before, after);
    expect(report.stability_ok).toBe(true);
    expect(report.failed_axes).toHaveLength(0);
  });

  it('PE-13b: rejeté si ECC régresse de -2.5 (dépasse la nouvelle tolérance 2.0)', () => {
    const before = makeAxes({ ecc: 95.1 });
    const after  = makeAxes({ ecc: 92.6, rci: 87.9, ifi: 99, metaphor_novelty: 82, sii: 86, composite: 91.5 });
    // delta = 92.6 - 95.1 = -2.5 > MAX_REGRESSION_DELTA(2.0) → FAIL
    const report = verifyAxesStability(before, after);
    expect(report.stability_ok).toBe(false);
    expect(report.failed_axes.some(a => a.startsWith('ECC'))).toBe(true);
  });

  it('PE-13c: rejeté si ECC régresse de -8.6 (cas catastrophique U-ROSETTE-08)', () => {
    // Prouvé que la nouvelle tolérance ne réintègre pas les crashs massifs
    const before = makeAxes(); // ecc=96.6
    const after  = makeAxes({ ecc: 88.0, rci: 83.3, ifi: 99, metaphor_novelty: 87.4, sii: 87.5, composite: 89.6 });
    // delta = 88.0 - 96.6 = -8.6 >> MAX_REGRESSION_DELTA(2.0) → FAIL à 4x la marge
    const report = verifyAxesStability(before, after);
    expect(report.stability_ok).toBe(false);
    expect(report.failed_axes.some(a => a.startsWith('ECC'))).toBe(true);
  });

  it('PE-13d: exactement à 2.0 — limite de tolérance (bord inclusif)', () => {
    const before = makeAxes({ ecc: 95.0 });
    const after  = makeAxes({ ecc: 93.0, rci: 87.9, ifi: 99, metaphor_novelty: 82, sii: 86, composite: 92.0 });
    // delta = 93.0 - 95.0 = -2.0 exactement → NOT < -2.0 → stable
    const report = verifyAxesStability(before, after);
    expect(report.stability_ok).toBe(true);
  });

  it('PE-08f: les delta sont calculés correctement', () => {
    const before = makeAxes(); // ecc=96.6, rci=87.9, ifi=99
    const after  = makeAxes({ ecc: 95.0, rci: 86.0, ifi: 98.0, metaphor_novelty: 85, sii: 86, composite: 93.0 });
    const report = verifyAxesStability(before, after);
    expect(report.ecc_regression).toBeCloseTo(95.0 - 96.6, 5);
    expect(report.rci_regression).toBeCloseTo(86.0 - 87.9, 5);
    expect(report.ifi_regression).toBeCloseTo(98.0 - 99.0, 5);
  });
});

// ── Invariants structurels ────────────────────────────────────────────────────

describe('Invariants structurels Polish Engine', () => {
  it('INV-PE-01: POLISH_MIN < SEAL_THRESHOLD', () => {
    expect(POLISH_MIN_COMPOSITE).toBeLessThan(POLISH_SEAL_THRESHOLD);
  });

  it('INV-PE-06: NOVELTY_TARGET <= 85 (accessible sans sur-optimisation)', () => {
    expect(NOVELTY_TARGET).toBeLessThanOrEqual(85);
    expect(NOVELTY_TARGET).toBeGreaterThan(70);
  });

  it('INV-PE-02: DRIFT_MAX_PARAGRAPHS est strict (0)', () => {
    expect(DRIFT_MAX_PARAGRAPHS).toBe(0);
  });
});
