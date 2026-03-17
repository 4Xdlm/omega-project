/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DAMAGE GATE DRY RUN VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/microsurgery/dry-run-validation.test.ts
 * Version: 1.0.0 (Phase W Hotfix)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Simulates a complete micro-surgeon pipeline WITHOUT API calls.
 * Validates that the Damage Gate allows micro-interventions at realistic amplitudes.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateDamageGate,
  type ArchetypeId,
} from '../../src/microsurgery/damage-gate.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST PROSE — ~15 sentences, French literary scene
// ═══════════════════════════════════════════════════════════════════════════════

// ~80 sentences — realistic production prose length
const TEST_PROSE = `Le soleil déclinait derrière les collines. La lumière rasante colorait les murs d'une teinte orangée. Pierre marchait lentement dans la rue déserte. Ses pas résonnaient sur les pavés mouillés. Il pensait à Marie, à leur dernière conversation. Les mots qu'elle avait prononcés tournaient dans sa tête. Une voiture passa au loin. Le silence retomba aussitôt. Il s'arrêta devant la vieille porte cochère. La peinture s'écaillait par endroits. Il poussa le battant qui grinça. L'escalier montait dans la pénombre. Ses doigts effleurèrent la rampe froide. Au premier étage, une lumière filtrait sous une porte. Il hésita un instant. Puis il frappa trois coups brefs. Le bois vibra sous ses phalanges. Un froissement se fit entendre derrière la porte. Des pas légers approchèrent. La serrure cliqueta doucement. Marie se tenait dans l'embrasure. Son visage ne trahissait aucune émotion. Elle portait la robe bleue qu'il aimait tant. Ses cheveux étaient défaits sur ses épaules. Ils se regardèrent en silence. Pierre ouvrit la bouche mais aucun son n'en sortit. Elle s'effaça pour le laisser entrer. L'appartement sentait le café froid. Les rideaux étaient tirés malgré le jour. Un livre ouvert gisait sur la table. Les pages étaient cornées par l'usage. Pierre s'assit sur le bord du canapé. Marie resta debout près de la fenêtre. Le silence entre eux pesait comme du plomb. Dehors, un chien aboya dans la cour. Le son se perdit dans les étages. Pierre joua nerveusement avec ses clés. Le métal tintait entre ses doigts. Marie croisa les bras sur sa poitrine. Son regard fixait un point invisible. Les minutes s'écoulaient avec lenteur. Le tic-tac de la pendule mesurait leur malaise. Pierre inspira profondément. Il chercha les mots justes. Rien ne venait. Marie tourna enfin les yeux vers lui. Son expression s'était adoucie. Elle fit un pas dans sa direction. Le plancher craqua sous son pied. Pierre leva la main comme pour la toucher. Ses doigts s'arrêtèrent à mi-chemin. L'air entre eux semblait chargé d'électricité. Marie baissa les yeux la première. Elle murmura quelque chose d'inaudible. Pierre se pencha pour entendre. Leurs souffles se mêlèrent un instant. Le temps parut se suspendre entre eux. Marie recula d'un pas imperceptible. Pierre laissa retomber sa main. Le geste n'avait duré qu'une seconde. Mais ils savaient tous les deux ce qu'il signifiait. Marie se détourna vers la cuisine. Elle remplit la bouilloire sans un mot. L'eau coula bruyamment dans l'évier. Pierre resta immobile sur le seuil. Il observait la ligne de ses épaules. La tension dans sa nuque était visible. Elle posa deux tasses sur le comptoir. Le porcelaine tinta contre le marbre. Pierre reconnut les tasses bleues de Bretagne. Elles dataient de leur premier été ensemble. Un souvenir flotta entre eux comme un fantôme. Marie versa l'eau bouillante sans trembler. La vapeur dessina des volutes dans l'air. Pierre s'approcha lentement du comptoir. Il prit la tasse qu'elle lui tendait. Leurs doigts se frôlèrent brièvement. Marie retira sa main aussitôt. Pierre porta la tasse à ses lèvres. Le thé brûlant lui piqua la langue. Il ne dit rien et but une autre gorgée. Marie s'adossa au mur de la cuisine. Ses yeux erraient sur les carreaux fissurés.`;

describe('Dry Run Validation (Phase W Hotfix)', () => {
  it('DRY-01: test prose has expected sentence count (75+)', () => {
    const sentences = TEST_PROSE.split(/[.!?…]+/).filter(s => s.trim().length > 5);
    expect(sentences.length).toBeGreaterThanOrEqual(75);
    expect(sentences.length).toBeLessThanOrEqual(90);
  });

  it('DRY-02: realistic amplitude is computed correctly', () => {
    const sentences = TEST_PROSE.split(/[.!?…]+/).filter(s => s.trim().length > 5);
    const amplitude = 1 / sentences.length;
    // ~16 sentences → amplitude ~0.0625
    expect(amplitude).toBeGreaterThan(0.005);
    expect(amplitude).toBeLessThan(0.15);
  });

  it('DRY-03: TENSION_14D passes gate at realistic amplitude for BALANCED archetype', () => {
    const sentences = TEST_PROSE.split(/[.!?…]+/).filter(s => s.trim().length > 5);
    const amplitude = 1 / sentences.length;

    // BALANCED (default) — most common archetype, should always pass at 80+ sentences
    const result = evaluateDamageGate('TENSION_14D', amplitude, 'BALANCED');
    expect(result.blocked).toBe(false);
  });

  it('DRY-03b: INTERIOR archetype TENSION_14D — passes at 80 sentences, blocks on very short texts', () => {
    const sentences = TEST_PROSE.split(/[.!?…]+/).filter(s => s.trim().length > 5);
    const amplitude = 1 / sentences.length;

    // INTERIOR has ×1.73 on P05→MUSICALITE.
    // At 80 sentences: amplitude=0.0125 → delta = -1.156×0.0125×1.73 = -0.025 < 0.10 → PASS
    // Threshold recalibrated 0.02→0.10: INTERIOR now passes at realistic scene amplitudes.
    // Math: INTERIOR blocked only if amplitude > 0.10 / (1.156 × 1.73) = 0.050 (i.e. < 20 sentences)
    const result = evaluateDamageGate('TENSION_14D', amplitude, 'INTERIOR');
    expect(result.blocked).toBe(false);

    // At 15 sentences (amplitude=0.067): delta = -1.156×0.067×1.73 = -0.134 > 0.10 → BLOCKED
    const shortResult = evaluateDamageGate('TENSION_14D', 1 / 15, 'INTERIOR');
    expect(shortResult.blocked).toBe(true);

    // At 100+ sentences (amplitude <= 0.01), all archetypes always pass
    const longResult = evaluateDamageGate('TENSION_14D', 0.009, 'INTERIOR');
    expect(longResult.blocked).toBe(false);
  });

  it('DRY-04: HOOK_INJECTION passes gate at realistic amplitude for all archetypes', () => {
    const sentences = TEST_PROSE.split(/[.!?…]+/).filter(s => s.trim().length > 5);
    const amplitude = 1 / sentences.length;
    const archetypes: ArchetypeId[] = ['BALANCED', 'BRUTAL', 'CATHEDRAL', 'INTERIOR', 'SENSORY'];

    for (const archetype of archetypes) {
      const result = evaluateDamageGate('HOOK_INJECTION', amplitude, archetype);
      expect(result.blocked).toBe(false);
    }
  });

  it('DRY-05: all predicted deltas are small at realistic amplitude', () => {
    const sentences = TEST_PROSE.split(/[.!?…]+/).filter(s => s.trim().length > 5);
    const amplitude = 1 / sentences.length;

    const result = evaluateDamageGate('TENSION_14D', amplitude, 'BALANCED');
    for (const pred of result.predictions) {
      // At amplitude ~0.06, even the steepest slope (-1.156) gives delta ~0.072
      // All deltas should be well under 0.1 for a single sentence modification
      expect(Math.abs(pred.predicted_delta)).toBeLessThan(0.1);
    }
  });

  it('DRY-06: full pipeline simulation — plan + gate check for each intervention', () => {
    const sentences = TEST_PROSE.split(/[.!?…]+/).filter(s => s.trim().length > 5);
    const amplitude = 1 / sentences.length;

    // Simulate 2 TENSION_14D + 1 HOOK_INJECTION (max micro-surgeon workload)
    const simulatedInterventions = [
      { type: 'TENSION_14D', quartile: 0 },
      { type: 'TENSION_14D', quartile: 2 },
      { type: 'HOOK_INJECTION', quartile: 1 },
    ];

    let passCount = 0;
    for (const intervention of simulatedInterventions) {
      const result = evaluateDamageGate(intervention.type, amplitude, 'BALANCED');
      if (!result.blocked) passCount++;
    }

    // All 3 interventions should pass the gate
    expect(passCount).toBe(3);
  });

  it('DRY-07: gate correctly blocks if prose is very short (high amplitude)', () => {
    // Only 2 sentences → amplitude = 0.5 → massive delta → blocked
    const shortProse = 'Une seule phrase. Puis une autre.';
    const shortSentences = shortProse.split(/[.!?…]+/).filter(s => s.trim().length > 5);
    const amplitude = 1 / Math.max(shortSentences.length, 1);

    const result = evaluateDamageGate('TENSION_14D', amplitude, 'BALANCED');
    // At amplitude 0.5: MUSICALITE delta = -1.156 × 0.5 = -0.578 >> 0.02 → BLOCKED
    expect(result.blocked).toBe(true);
  });
});
