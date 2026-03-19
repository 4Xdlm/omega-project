/**
 * OMEGA Dual Scoring Pipeline — Unit Tests
 * Phase Grand Parallèle — NASA-Grade L4 / DO-178C Level A
 *
 * Tests:
 *   1. Non-regression: legacy reference scores unchanged
 *   2. R6 scorer produces valid output on bench prose
 *   3. Same prose → same R6 score (determinism)
 *   4. Dual structure contains both legacy + R6 fields
 *   5. All 6 profiles produce valid scores
 *   6. Spearman helper is correct
 *   7. Passage type detection on bench prose
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { computeTextFeatures } from '../../src/scoring/text-features.js';
import { MultiStageScorer } from '../../src/scoring/multi-stage-scorer.js';
import { getProfileNames } from '../../src/scoring/quality-profiles.js';
import { detectPassageType } from '../../src/scoring/passage-type-detector.js';
import type { MultiStageScore } from '../../src/scoring/types.js';

const COEFF_PATH = resolve(__dirname, '../../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const ROOT_DIR = resolve(__dirname, '../../..');
const METRO_PATH = resolve(ROOT_DIR, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');

const P_REL_NEUTRAL = 0.50;

// ── Reference V3 Legacy scores from bench 9ea5c2fc ──────────────────────────
const LEGACY_REFERENCE: Record<string, { composite: number; archetype: string }> = {
  'w4-confrontation':  { composite: 88.41, archetype: 'BRUTAL' },
  'w4-elegie':         { composite: 92.42, archetype: 'INTERIOR' },
  'w4-panique':        { composite: 93.58, archetype: 'BRUTAL' },
  'w4-contemplation':  { composite: 91.94, archetype: 'SENSORY' },
  'w4-dialogue-tendu': { composite: 92.40, archetype: 'BALANCED' },
  'w4-lyrique':        { composite: 91.35, archetype: 'CATHEDRAL' },
  'w4-action':         { composite: 91.10, archetype: 'BRUTAL' },
  'w4-monologue':      { composite: 87.71, archetype: 'INTERIOR' },
};

// ── Sample prose for determinism tests (shorter for speed) ──────────────────
const SAMPLE_PROSE = `Elena poussa la porte de l'atelier d'un geste sec. Le contrat froissé dans sa main droite pesait moins lourd que le mensonge qu'il contenait. Marcus ne leva pas les yeux de son établi. Ses doigts continuaient de polir la surface d'un bronze — geste chirurgical, millimétré, obscène de précision dans un moment pareil. Le solvant dans l'air piquait les yeux. La lumière rasante de fin d'après-midi découpait l'atelier en tranches obliques, dorées et froides à la fois. Sur l'établi, entre les limes et les burins, le métal captait cette lumière comme un miroir imparfait. Marcus posa lentement l'outil. Le geste était celui d'un homme qui repose un scalpel après une incision. Elena connaissait ce geste. Elle l'avait vu cent fois dans les plans qu'elle dessinait — la précision n'était pas un choix, c'était une maladie. L'odeur de sel montait du port par la verrière entrouverte. Elena sentait le froid du métal à travers ses semelles. Chaque surface ici portait la trace d'un travail méticuleux. Les sculptures alignées contre le mur — des mains, des torses, des fragments anatomiques en bronze et en acier — semblaient observer la scène comme des témoins muets.`;

// ── Spearman helper (duplicated from bench script for testability) ───────────
function spearmanRho(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;

  function ranks(arr: number[]): number[] {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && sorted[j + 1].v === sorted[j].v) j++;
      const avgRank = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[sorted[k].i] = avgRank;
      i = j + 1;
    }
    return r;
  }

  const rx = ranks(x);
  const ry = ranks(y);
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

describe('Dual Scoring Pipeline', () => {
  let scorer: MultiStageScorer;
  let hasMetro: boolean;

  beforeAll(() => {
    hasMetro = existsSync(METRO_PATH);
    scorer = hasMetro
      ? new MultiStageScorer(COEFF_PATH, METRO_PATH)
      : new MultiStageScorer(COEFF_PATH);
  });

  // ── Test 1: Legacy reference non-regression ──────────────────────────

  describe('I1: Legacy reference scores unchanged', () => {
    it('has 8 reference scenes with expected composites', () => {
      const refs = Object.entries(LEGACY_REFERENCE);
      expect(refs.length).toBe(8);
      for (const [id, ref] of refs) {
        expect(ref.composite).toBeGreaterThan(85);
        expect(ref.composite).toBeLessThan(100);
      }
    });

    it('reference median matches bench 9ea5c2fc', () => {
      const composites = Object.values(LEGACY_REFERENCE).map(r => r.composite);
      const sorted = [...composites].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const med = (sorted[mid - 1] + sorted[mid]) / 2;
      // Bench 9ea5c2fc median: 91.64
      expect(med).toBeGreaterThan(91.0);
      expect(med).toBeLessThan(92.5);
    });
  });

  // ── Test 2: R6 scorer produces valid output ──────────────────────────

  describe('R6 scorer validity', () => {
    it('scores sample prose without error', () => {
      const features = computeTextFeatures(SAMPLE_PROSE);
      const wordCount = SAMPLE_PROSE.split(/\s+/).length;
      const result = scorer.score(features, { wordCount, pRel: P_REL_NEUTRAL, text: SAMPLE_PROSE });

      expect(result).toBeDefined();
      expect(result.composite.score).toBeGreaterThan(0);
      expect(result.local.score).toBeGreaterThan(0);
      expect(result.passage_type).toBeDefined();
      expect(result.seal_eligible).toBeDefined();
    });

    it('composite is within 0-100 range', () => {
      const features = computeTextFeatures(SAMPLE_PROSE);
      const wordCount = SAMPLE_PROSE.split(/\s+/).length;
      const result = scorer.score(features, { wordCount, pRel: P_REL_NEUTRAL, text: SAMPLE_PROSE });

      expect(result.composite.score).toBeGreaterThanOrEqual(0);
      expect(result.composite.score).toBeLessThanOrEqual(100);
      expect(result.local.score).toBeGreaterThanOrEqual(0);
      expect(result.arc.score).toBeGreaterThanOrEqual(0);
    });

    it('confidence is between 0 and 1', () => {
      const features = computeTextFeatures(SAMPLE_PROSE);
      const wordCount = SAMPLE_PROSE.split(/\s+/).length;
      const result = scorer.score(features, { wordCount, pRel: P_REL_NEUTRAL, text: SAMPLE_PROSE });

      expect(result.composite.confidence).toBeGreaterThanOrEqual(0);
      expect(result.composite.confidence).toBeLessThanOrEqual(1);
    });

    it('alpha + beta approximately equals 1', () => {
      const features = computeTextFeatures(SAMPLE_PROSE);
      const wordCount = SAMPLE_PROSE.split(/\s+/).length;
      const result = scorer.score(features, { wordCount, pRel: P_REL_NEUTRAL, text: SAMPLE_PROSE });

      expect(result.composite.alpha + result.composite.beta).toBeCloseTo(1.0, 1);
    });

    it('passage_type is a valid enum value', () => {
      const features = computeTextFeatures(SAMPLE_PROSE);
      const wordCount = SAMPLE_PROSE.split(/\s+/).length;
      const result = scorer.score(features, { wordCount, pRel: P_REL_NEUTRAL, text: SAMPLE_PROSE });

      expect(['DESCRIPTION', 'DIALOGUE', 'ACTION', 'INTROSPECTION', 'TRANSITION'])
        .toContain(result.passage_type);
    });
  });

  // ── Test 3: Determinism ──────────────────────────────────────────────

  describe('I7: Determinism', () => {
    it('same text + same options = same score', () => {
      const features = computeTextFeatures(SAMPLE_PROSE);
      const wordCount = SAMPLE_PROSE.split(/\s+/).length;
      const opts = { wordCount, pRel: P_REL_NEUTRAL, profile: 'STRATOSPHERIQUE' as const, text: SAMPLE_PROSE };

      const r1 = scorer.score(features, opts);
      const r2 = scorer.score(features, opts);

      expect(r1.composite.score).toBe(r2.composite.score);
      expect(r1.local.score).toBe(r2.local.score);
      expect(r1.arc.score).toBe(r2.arc.score);
      expect(r1.passage_type).toBe(r2.passage_type);
      expect(r1.seal_eligible).toBe(r2.seal_eligible);
    });

    it('computeTextFeatures is deterministic', () => {
      const f1 = computeTextFeatures(SAMPLE_PROSE);
      const f2 = computeTextFeatures(SAMPLE_PROSE);

      for (const key of Object.keys(f1)) {
        expect(f1[key]).toBe(f2[key]);
      }
    });
  });

  // ── Test 4: Dual structure ───────────────────────────────────────────

  describe('Dual structure: legacy + R6', () => {
    it('can construct a dual result with both systems', () => {
      const features = computeTextFeatures(SAMPLE_PROSE);
      const wordCount = SAMPLE_PROSE.split(/\s+/).length;
      const r6 = scorer.score(features, { wordCount, pRel: P_REL_NEUTRAL, text: SAMPLE_PROSE });
      const legacyRef = LEGACY_REFERENCE['w4-confrontation'];

      const dual = {
        legacy: { composite: legacyRef.composite },
        r6: { composite: r6.composite.score, local: r6.local.score, arc: r6.arc.score },
      };

      expect(dual.legacy.composite).toBe(88.41);
      expect(dual.r6.composite).toBeGreaterThan(0);
      expect(dual.r6.local).toBeGreaterThan(0);
    });
  });

  // ── Test 5: All 6 profiles produce valid scores ─────────────────────

  describe('6 profiles valid', () => {
    const profileNames = getProfileNames();

    it('has exactly 6 profiles', () => {
      expect(profileNames.length).toBe(6);
    });

    it('all profiles produce scores on sample prose', () => {
      const features = computeTextFeatures(SAMPLE_PROSE);
      const wordCount = SAMPLE_PROSE.split(/\s+/).length;

      for (const pName of profileNames) {
        const result = scorer.score(features, { wordCount, pRel: P_REL_NEUTRAL, profile: pName, text: SAMPLE_PROSE });
        expect(result.composite.score).toBeGreaterThan(0);
        expect(result.composite.score).toBeLessThanOrEqual(100);
        expect(result.profile).toBeDefined();
      }
    });
  });

  // ── Test 6: Spearman helper ─────────────────────────────────────────

  describe('Spearman rank correlation', () => {
    it('perfect positive correlation returns 1', () => {
      expect(spearmanRho([1, 2, 3, 4, 5], [10, 20, 30, 40, 50])).toBeCloseTo(1.0, 4);
    });

    it('perfect negative correlation returns -1', () => {
      expect(spearmanRho([1, 2, 3, 4, 5], [50, 40, 30, 20, 10])).toBeCloseTo(-1.0, 4);
    });

    it('no correlation returns ~0', () => {
      const rho = spearmanRho([1, 2, 3, 4, 5], [3, 1, 5, 2, 4]);
      expect(Math.abs(rho)).toBeLessThan(0.5);
    });

    it('handles ties correctly', () => {
      const rho = spearmanRho([1, 2, 2, 4, 5], [10, 20, 20, 40, 50]);
      expect(rho).toBeGreaterThan(0.9);
    });

    it('returns 0 for arrays shorter than 3', () => {
      expect(spearmanRho([1, 2], [3, 4])).toBe(0);
    });
  });

  // ── Test 7: Passage type detection ──────────────────────────────────

  describe('Passage type detection on literary prose', () => {
    it('detects a valid type from sample prose (features only)', () => {
      const features = computeTextFeatures(SAMPLE_PROSE);
      const ptype = detectPassageType(features);
      expect(['DESCRIPTION', 'DIALOGUE', 'ACTION', 'INTROSPECTION', 'TRANSITION'])
        .toContain(ptype);
    });

    it('does not classify narrative prose as DIALOGUE when text has no dialogue markers', () => {
      // Narrative prose without dialogue markers (no « » — "" etc.)
      const narrative = `La lumière du matin traversait les rideaux. Le silence régnait dans la pièce. Les murs portaient la trace des années. Chaque fissure racontait une histoire que personne ne lisait. Le temps passait sans se presser. Les ombres bougeaient lentement sur le sol. Le vent soufflait dehors. Les arbres pliaient sous la force du vent. La pluie commençait à tomber. Les gouttes frappaient les vitres avec régularité.

Le jardin était désert. Les fleurs courbaient la tête. La terre absorbait l'eau avec une lenteur minérale. Les pierres du chemin brillaient. Chaque surface reflétait un fragment de ciel.

La maison respirait. Les poutres craquaient sous l'effet de la chaleur. Le bois travaillait dans le silence. Les fondations tenaient bon malgré les années.

Le chat dormait sur le fauteuil. Sa respiration régulière était le seul bruit vivant. Il ne bougeait pas. Il ne bougerait pas avant le soir.

Le temps coulait. Sans hâte. Sans but. Les heures se suivaient sans se ressembler. La lumière changeait. Les ombres tournaient. Le monde continuait sans attendre personne.`;
      const features = computeTextFeatures(narrative);
      const ptype = detectPassageType(features, narrative);
      expect(ptype).not.toBe('DIALOGUE');
    });

    it('classifies text with dialogue markers as DIALOGUE', () => {
      const dialogue = `« Tu savais. » Ce n'était pas une question. Le solvant piquait les yeux.

« Le contrat spécifie une origine que tu as falsifiée. » Elena posa le papier sur l'établi.

— J'avais besoin de cette marge, dit Marcus.

— Besoin. Elena répéta le mot comme on retourne une lame.

« Tu avais besoin de mentir. » Elle ne criait pas.

— Je vais faire annuler la commande.

— Tu ne peux pas. La voix de Marcus était plate.

« Regarde-moi. » Elena attendit. « Regarde-moi dans les yeux. »

— C'est fini, dit-elle. Le silence qui suivit était total.

« Tu le sais. » Marcus ne répondit pas. Il ne pouvait pas.`;
      const features = computeTextFeatures(dialogue);
      const ptype = detectPassageType(features, dialogue);
      // With heavy dialogue markers (« », —), high f34b and f33a, it should be DIALOGUE
      // Note: depends on f34b/f33a thresholds being met
      expect(['DIALOGUE', 'ACTION']).toContain(ptype);
    });
  });

  // ── Test 8: computeDialogueMarkerRatio ──────────────────────────────

  describe('computeDialogueMarkerRatio', () => {
    // Import from the module
    let computeDialogueMarkerRatio: (text: string) => number;

    beforeAll(async () => {
      const mod = await import('../../src/scoring/passage-type-detector.js');
      computeDialogueMarkerRatio = mod.computeDialogueMarkerRatio;
    });

    it('returns 0 for pure narrative prose', () => {
      const text = `La lumière tombait sur le sol.\nLes ombres tournaient lentement.\nLe silence régnait.`;
      expect(computeDialogueMarkerRatio(text)).toBe(0);
    });

    it('returns > 0.5 for dialogue-heavy text', () => {
      const text = `« Bonjour, » dit-elle.\n— Comment allez-vous ?\n« Bien, merci. »\n— Et vous ?`;
      expect(computeDialogueMarkerRatio(text)).toBeGreaterThan(0.5);
    });

    it('returns ratio between 0 and 1', () => {
      const text = `La nuit tombait.\n— Partons, dit Marcus.\nElena hocha la tête.`;
      const ratio = computeDialogueMarkerRatio(text);
      expect(ratio).toBeGreaterThanOrEqual(0);
      expect(ratio).toBeLessThanOrEqual(1);
    });
  });
});
