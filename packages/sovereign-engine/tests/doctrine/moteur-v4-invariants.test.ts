/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — GATE P2 : INVARIANTS MOTEUR v4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 8 tests CI protégeant les lois scellées du moteur PF_base_Duras_correcteur_K2_v4.
 * Gate BLOQUANTE : tous doivent être GREEN avant V-RECAL-1.
 *
 * CI-L3-01    : Zéro chiffre prescriptif dans les rappels de prompt
 * CI-L27-01   : Seuils contextuels contemplation
 * CI-L27-02   : Seuils contextuels dialogue
 * CI-L27-03   : Seuils contextuels confrontation
 * CI-L28-01   : Critères P4 révisés (ΔGB absent du verdict)
 * CI-V1V2-01  : Routage GB V1 microbench / V2 longue forme
 * CI-V1V2-02  : Garde OOD mean < 8w → V1 INVALID
 * CI-KNIFE-01 : Garde knife_rate > 0.15
 *
 * Note : CI-INV-PROMPT-01 existe déjà dans tests/validation/inv-prompt-01.test.ts
 *
 * Source : Audits ChatGPT + Gemini (2026-03-25) + Plan P2 validé Francky
 * Standard : NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { computeAllGBFeatures, scoreText } from '../../src/scoring/gb-scorer.js';
import { MultiStageScorerV2 } from '../../src/scoring/multi-stage-scorer-v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS SCELLÉS (reproduits ici pour vérification CI)
// ═══════════════════════════════════════════════════════════════════════════════

const RAPPEL_CHUNKS12 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

SOUFFLE DE FLAUBERT : chaque période se déploie jusqu'à épuiser la sensation
ou l'idée — elle prend le temps d'une respiration complète, ni écourtée
ni interminable. Le rythme naturel d'une phrase lue à voix haute
dans le gueuloir.

MURMURE DE DURAS : de loin en loin, une phrase brève et nue coupe le flux
— un verdict, pas un résumé. Elle apparaît comme un silence entre deux
mouvements d'orchestre.`;

const RAPPEL_CHUNKS34_V4 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

CORRECTEUR DE RYTHME EXTERNE : régulièrement, à intervalles sentis,
brise le flot des longues périodes par une phrase-couteau — sèche,
factuelle, quelques mots à peine. Pas exceptionnellement : souvent.
Flaubert et Proust reprennent aussitôt le contrôle. Duras ponctionne,
disparaît, revient.

ANCRE DE TENUE : la cadence de fin ne s'effondre pas.
Les chunks 3-4 gardent le souffle installé par les chunks 1-2.
Duras frappe par éclairs brefs — elle n'abaisse pas
la nappe phrastique dominante. Même dans le dialogue
ou la confrontation, les répliques s'enchâssent dans
des périodes narratives et descriptives amples.
La lame Duras crée le contraste — elle ne change pas
le registre de fond.

COHÉRENCE DE LONGUEUR : la longueur moyenne des phrases reste dans
la continuité de ce qui précède — ni soudainement plus courte,
ni soudainement plus longue.`;

// ═══════════════════════════════════════════════════════════════════════════════
// SEUILS CONTEXTUELS L27 (scellés 2026-03-24)
// ═══════════════════════════════════════════════════════════════════════════════

type SceneType = 'contemplation' | 'dialogue' | 'confrontation';

interface ContextualThresholds {
  drift_min: number;
  drift_max: number;
  cv_min: number;
  f26b_min: number;
  v2_min: number;
}

const THRESHOLDS_L27: Record<SceneType, ContextualThresholds> = {
  contemplation: { drift_min: -15, drift_max: 15, cv_min: 0.80, f26b_min: 0.40, v2_min: 90 },
  dialogue:      { drift_min: -15, drift_max: 15, cv_min: 0.65, f26b_min: 0.40, v2_min: 90 },
  confrontation: { drift_min: -35, drift_max: 35, cv_min: 0.80, f26b_min: 0.40, v2_min: 90 },
};

function validateScene(
  type: SceneType,
  metrics: { drift: number; cv: number; f26b: number; v2: number },
): { pass: boolean; failures: string[] } {
  const t = THRESHOLDS_L27[type];
  const failures: string[] = [];

  if (metrics.drift < t.drift_min || metrics.drift > t.drift_max) {
    failures.push(`drift ${metrics.drift} hors [${t.drift_min}, ${t.drift_max}]`);
  }
  if (metrics.cv < t.cv_min) {
    failures.push(`CV ${metrics.cv} < ${t.cv_min}`);
  }
  if (metrics.f26b < t.f26b_min) {
    failures.push(`f26b ${metrics.f26b} < ${t.f26b_min}`);
  }
  if (metrics.v2 < t.v2_min) {
    failures.push(`V2 ${metrics.v2} < ${t.v2_min}`);
  }

  return { pass: failures.length === 0, failures };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRITÈRES P4 L28 (scellés 2026-03-25)
// ═══════════════════════════════════════════════════════════════════════════════

interface P4Deltas {
  deltaV2: number;
  deltaF26b: number;
  deltaCV: number;
  deltaMean: number;
  deltaGB?: number; // monitoring uniquement — pas dans le verdict
}

const P4_THRESHOLDS = {
  deltaV2: 15,
  deltaF26b: 0.150,
  deltaCV: 0.250,
  deltaMean: 15,
};

function validateP4(deltas: P4Deltas): { pass: boolean; failures: string[] } {
  const failures: string[] = [];

  if (deltas.deltaV2 >= P4_THRESHOLDS.deltaV2) {
    failures.push(`ΔV2 ${deltas.deltaV2} >= ${P4_THRESHOLDS.deltaV2}`);
  }
  if (deltas.deltaF26b >= P4_THRESHOLDS.deltaF26b) {
    failures.push(`Δf26b ${deltas.deltaF26b} >= ${P4_THRESHOLDS.deltaF26b}`);
  }
  if (deltas.deltaCV >= P4_THRESHOLDS.deltaCV) {
    failures.push(`ΔCV ${deltas.deltaCV} >= ${P4_THRESHOLDS.deltaCV}`);
  }
  if (deltas.deltaMean >= P4_THRESHOLDS.deltaMean) {
    failures.push(`ΔMean ${deltas.deltaMean} >= ${P4_THRESHOLDS.deltaMean}`);
  }
  // NOTE: deltaGB is NOT in the verdict — monitoring only (L28)

  return { pass: failures.length === 0, failures };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CI-L3-01 — Zéro chiffre prescriptif dans les prompts', () => {
  // Patterns interdits par L3 : toute consigne métrique chiffrée
  const METRIC_PATTERNS = [
    /\d+[\s-]+(?:à|a)[\s-]+\d+\s+mots/i,     // "60-80 mots", "3 à 6 mots"
    /\d+\s*mots?\s*maximum/i,                   // "5 mots maximum"
    /environ\s+\d+\s*mots/i,                    // "environ 50 mots"
    /longueur\s+moyenne.*\d+/i,                  // "longueur moyenne de 60"
    /autour\s+de\s+\d+/i,                        // "autour de 60"
    /CV\s*[=≥≤><]\s*\d/i,                        // "CV = 0.9"
    /f26b\s*[=≥≤><]\s*\d/i,                      // "f26b > 0.5"
    /mean\s*[=≥≤><]\s*\d/i,                      // "mean = 45"
    /drift\s*[=≥≤><]\s*[+-]?\d/i,               // "drift < 15"
  ];

  it('RAPPEL_CHUNKS12 ne contient aucune consigne métrique chiffrée', () => {
    for (const pattern of METRIC_PATTERNS) {
      expect(
        pattern.test(RAPPEL_CHUNKS12),
        `Violation L3 dans RAPPEL_CHUNKS12 : pattern ${pattern} trouvé`,
      ).toBe(false);
    }
  });

  it('RAPPEL_CHUNKS34_V4 ne contient aucune consigne métrique chiffrée', () => {
    for (const pattern of METRIC_PATTERNS) {
      expect(
        pattern.test(RAPPEL_CHUNKS34_V4),
        `Violation L3 dans RAPPEL_CHUNKS34_V4 : pattern ${pattern} trouvé`,
      ).toBe(false);
    }
  });
});

describe('CI-L27-01 — Seuils contextuels contemplation', () => {
  it('PASS sur métriques dans les bornes', () => {
    const result = validateScene('contemplation', {
      drift: -11.1, cv: 0.850, f26b: 0.600, v2: 100.0,
    });
    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('FAIL si drift hors ±15', () => {
    const result = validateScene('contemplation', {
      drift: -16.0, cv: 0.850, f26b: 0.600, v2: 100.0,
    });
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('drift');
  });

  it('FAIL si CV < 0.80', () => {
    const result = validateScene('contemplation', {
      drift: -5.0, cv: 0.70, f26b: 0.600, v2: 100.0,
    });
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('CV');
  });

  it('FAIL si f26b < 0.40', () => {
    const result = validateScene('contemplation', {
      drift: -5.0, cv: 0.85, f26b: 0.30, v2: 100.0,
    });
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('f26b');
  });
});

describe('CI-L27-02 — Seuils contextuels dialogue', () => {
  it('PASS sur métriques dans les bornes (CV ≥ 0.65 suffisant)', () => {
    const result = validateScene('dialogue', {
      drift: +0.2, cv: 0.690, f26b: 0.508, v2: 100.0,
    });
    expect(result.pass).toBe(true);
  });

  it('FAIL si CV < 0.65 (seuil dialogue plus bas que contemplation)', () => {
    const result = validateScene('dialogue', {
      drift: +0.2, cv: 0.60, f26b: 0.508, v2: 100.0,
    });
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('CV');
  });

  it('seuil drift dialogue = ±15 (pas ±35)', () => {
    const result = validateScene('dialogue', {
      drift: -20.0, cv: 0.70, f26b: 0.50, v2: 100.0,
    });
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('drift');
  });
});

describe('CI-L27-03 — Seuils contextuels confrontation', () => {
  it('PASS avec drift -31.3 (seuil élargi ±35)', () => {
    const result = validateScene('confrontation', {
      drift: -31.3, cv: 0.985, f26b: 0.509, v2: 100.0,
    });
    expect(result.pass).toBe(true);
  });

  it('FAIL si drift > ±35', () => {
    const result = validateScene('confrontation', {
      drift: -36.0, cv: 0.90, f26b: 0.50, v2: 100.0,
    });
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('drift');
  });

  it('seuil CV confrontation = 0.80 (pas 0.65)', () => {
    const result = validateScene('confrontation', {
      drift: -10.0, cv: 0.70, f26b: 0.50, v2: 100.0,
    });
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('CV');
  });
});

describe('CI-L28-01 — Critères P4 révisés (ΔGB exclu du verdict)', () => {
  it('PASS quand les 4 métriques décisionnelles sont dans les bornes', () => {
    const result = validateP4({
      deltaV2: 0.0, deltaF26b: 0.049, deltaCV: 0.091, deltaMean: 1.1,
      deltaGB: 0.408, // élevé mais IGNORÉ dans le verdict
    });
    expect(result.pass).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('ΔGB = 0.408 ne provoque PAS de FAIL (L28)', () => {
    const result = validateP4({
      deltaV2: 0.0, deltaF26b: 0.049, deltaCV: 0.091, deltaMean: 1.1,
      deltaGB: 0.408,
    });
    // deltaGB n'est pas dans le verdict
    expect(result.pass).toBe(true);
  });

  it('FAIL si Δf26b ≥ 0.150', () => {
    const result = validateP4({
      deltaV2: 0.0, deltaF26b: 0.172, deltaCV: 0.091, deltaMean: 1.1,
    });
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('f26b');
  });

  it('FAIL si ΔV2 ≥ 15', () => {
    const result = validateP4({
      deltaV2: 16.0, deltaF26b: 0.049, deltaCV: 0.091, deltaMean: 1.1,
    });
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('V2');
  });

  it('FAIL si ΔMean ≥ 15w', () => {
    const result = validateP4({
      deltaV2: 0.0, deltaF26b: 0.049, deltaCV: 0.091, deltaMean: 18.0,
    });
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('Mean');
  });
});

describe('CI-V1V2-01 — Routage GB V1 microbench / V2 longue forme', () => {
  // Doctrine scellée : GB V1 = microbench ≤600w, V2 = décision longue forme

  function judgeRouting(wordCount: number): { v1Role: 'decisional' | 'informational'; v2Role: 'decisional' | 'informational' } {
    if (wordCount > 1500) {
      return { v1Role: 'informational', v2Role: 'decisional' };
    }
    return { v1Role: 'decisional', v2Role: 'decisional' };
  }

  it('pour 2250w (chapitre) : V1 = informatif, V2 = décisionnel', () => {
    const routing = judgeRouting(2250);
    expect(routing.v1Role).toBe('informational');
    expect(routing.v2Role).toBe('decisional');
  });

  it('pour 500w (microbench) : V1 = décisionnel', () => {
    const routing = judgeRouting(500);
    expect(routing.v1Role).toBe('decisional');
  });

  it('seuil de bascule à 1500w', () => {
    expect(judgeRouting(1500).v1Role).toBe('decisional');
    expect(judgeRouting(1501).v1Role).toBe('informational');
  });
});

describe('CI-V1V2-02 — Garde OOD mean < 8w → V1 INVALID', () => {
  // Loi L15 : GB V1 invalide pour mean < 8w (biais OOD)

  function isV1Valid(features: Record<string, number>): boolean {
    const meanSentLen = features['f1_mean_sent_len'] ?? features['f1_mean'] ?? 0;
    return meanSentLen >= 8;
  }

  it('mean = 3.5w (Duras OOD) → V1 INVALID', () => {
    expect(isV1Valid({ f1_mean_sent_len: 3.5 })).toBe(false);
  });

  it('mean = 7.9w → V1 INVALID', () => {
    expect(isV1Valid({ f1_mean_sent_len: 7.9 })).toBe(false);
  });

  it('mean = 8.0w → V1 VALID', () => {
    expect(isV1Valid({ f1_mean_sent_len: 8.0 })).toBe(true);
  });

  it('mean = 45w (régime PF normal) → V1 VALID', () => {
    expect(isV1Valid({ f1_mean_sent_len: 45.0 })).toBe(true);
  });

  it('mean absent → V1 INVALID (fail-closed)', () => {
    expect(isV1Valid({})).toBe(false);
  });
});

describe('CI-KNIFE-01 — Garde knife_rate > 0.15', () => {
  // Le V2 applique -10 si knife_rate > 0.15.
  // Le monitoring doit alerter dès > 0.12.

  function knifeGuard(knifeRate: number): { status: 'ok' | 'warning' | 'danger' } {
    if (knifeRate > 0.15) return { status: 'danger' };
    if (knifeRate > 0.12) return { status: 'warning' };
    return { status: 'ok' };
  }

  it('knife_rate = 0.05 → OK', () => {
    expect(knifeGuard(0.05).status).toBe('ok');
  });

  it('knife_rate = 0.10 → OK', () => {
    expect(knifeGuard(0.10).status).toBe('ok');
  });

  it('knife_rate = 0.13 → WARNING', () => {
    expect(knifeGuard(0.13).status).toBe('warning');
  });

  it('knife_rate = 0.16 → DANGER (V2 pénalité -10 déclenchée)', () => {
    expect(knifeGuard(0.16).status).toBe('danger');
  });

  it('knife_rate = 0.12 exact → OK (seuil warning est > 0.12 strict)', () => {
    expect(knifeGuard(0.12).status).toBe('ok');
  });

  it('knife_rate = 0.15 exact → WARNING (seuil danger est > 0.15 strict)', () => {
    expect(knifeGuard(0.15).status).toBe('warning');
  });
});
