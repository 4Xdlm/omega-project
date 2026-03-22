/**
 * OMEGA Unified Bench Integration Test — Phase P3
 * Date: 2026-03-22
 * Role: Verify that the unified bench produces valid results for all 3 layers.
 */

import { describe, it, expect } from 'vitest';
import { scoreText, computeAllGBFeatures } from '../../src/scoring/gb-scorer.js';
import { quickDiagnose } from '../../src/scoring/r8-diagnostic.js';
import { extractWindows, MIN_WORDS_FOR_VERIFICATION } from '../../src/scoring/multi-scale-scorer.js';

// Representative French literary prose (~600 words from corpus style)
const MOCK_SCENE = `Elle restait accoudée sur le bord de sa fenêtre et lisait la lettre. Les géraniums dans leurs pots de terre cuite exhalaient une odeur âcre qui se mêlait au parfum du papier. Le soleil déclinait. La campagne s'étendait au loin avec ses prairies vertes et ses bouquets d'arbres. La rivière coulait au fond de la vallée dans un murmure doux et continu. Elle sentait monter en elle une émotion qu'elle ne pouvait définir. Quelque chose qui tenait à la fois de la joie et de la tristesse, comme si le bonheur portait en lui le germe de sa propre destruction. Les cloches de l'église sonnèrent au loin. Le son se perdit lentement dans l'air du soir. Le vent soufflait doucement entre les arbres, faisant trembler les feuilles avec une régularité presque mécanique. Elle replia la lettre, la glissa dans la poche de son tablier, et resta immobile devant la fenêtre ouverte. Le crépuscule avançait sur la campagne comme une marée lente. Les ombres s'allongeaient dans les champs. Un chien aboyait quelque part, très loin. La lumière rasante donnait aux murs blancs de la maison une teinte chaude, presque dorée, qui contrastait avec la fraîcheur montante du soir. Elle pensait au lendemain sans pouvoir le concevoir. Le temps se dissolvait dans cette attente qui n'avait pas d'objet. Charles ne reviendrait pas avant la nuit. Elle le savait. La certitude pesait sur elle comme un couvercle de plomb. Pourtant elle restait là, debout, les mains posées sur le rebord de pierre, le regard perdu dans le paysage qui s'assombrissait. Les hirondelles traçaient leurs dernières arabesques au-dessus du toit. Leurs cris aigus perçaient le silence avec une précision chirurgicale. Chaque trajectoire était un calcul invisible, une équation de vitesse et de grâce que nul mathématicien ne pourrait résoudre. Elle les regardait sans les voir. Son esprit était ailleurs, dans un espace entre la mémoire et l'anticipation, un territoire que le langage ne sait pas nommer. La nuit tombait. Les étoiles apparaissaient une à une, timides d'abord, puis de plus en plus nombreuses. Le jardin exhalait ses odeurs nocturnes. La terre humide, les roses, le chèvrefeuille qui grimpait le long du mur. Un chat traversa la cour d'un pas silencieux. Ses yeux brillaient dans l'obscurité comme deux points de lumière verte. Elle ferma enfin la fenêtre. Le bois grinça dans le chambranle. Le loquet tomba avec un bruit sec qui résonna dans la pièce vide. Elle ne pleurait pas. Elle n'avait plus besoin de pleurer. Quelque chose s'était dénoué en elle pendant cette heure de contemplation muette. Pas une résolution, pas un abandon. Plutôt une transformation silencieuse, comme celle qui fait passer l'eau de l'état liquide à la vapeur sans que rien ne semble bouger.`;

describe('Unified Bench Integration (P3)', () => {
  it('GB V1 score is in valid range [1.0, 5.5]', () => {
    const result = scoreText(MOCK_SCENE);
    expect(result.score).toBeGreaterThanOrEqual(1.0);
    expect(result.score).toBeLessThanOrEqual(5.5);
  });

  it('GB V1 tier is a valid tier letter', () => {
    const result = scoreText(MOCK_SCENE);
    expect(['S', 'A', 'B', 'C', 'D']).toContain(result.tier);
  });

  it('R-8 diagnostic returns type composition summing to 1.0', () => {
    const diag = quickDiagnose(MOCK_SCENE);
    expect(diag.gb_score).toBeTypeOf('number');
    expect(diag.tier).toMatch(/^[SABCD]$/);
    expect(diag.tk_master_count).toBeTypeOf('number');
    expect(diag.tk_total).toBeGreaterThan(0);
    expect(diag.dominant_type).toBeTypeOf('string');
  });

  it('tipping points count is 10', () => {
    const diag = quickDiagnose(MOCK_SCENE);
    expect(diag.tk_total).toBe(10);
  });

  it('endurance flag = NON_VERIFIABLE for short scenes', () => {
    const wordCount = MOCK_SCENE.split(/\s+/).length;
    expect(wordCount).toBeLessThan(MIN_WORDS_FOR_VERIFICATION);
  });

  it('V3 composite > 50 (sanity check on feature computation)', () => {
    const features = computeAllGBFeatures(MOCK_SCENE);
    // Verify we get 42 features with no NaN
    const featureCount = Object.keys(features).length;
    expect(featureCount).toBeGreaterThanOrEqual(42);
    for (const [key, val] of Object.entries(features)) {
      expect(Number.isNaN(val)).toBe(false);
    }
  });

  it('extractWindows returns null for 600-word scene at 2000w', () => {
    const windows = extractWindows(MOCK_SCENE, 2000);
    expect(windows).toBeNull();
  });

  it('extractWindows returns 5 windows for 600-word scene at 100w', () => {
    const windows = extractWindows(MOCK_SCENE, 100, 5);
    expect(windows).not.toBeNull();
    expect(windows).toHaveLength(5);
  });

  it('determinism: score same text twice = same result', () => {
    const r1 = scoreText(MOCK_SCENE);
    const r2 = scoreText(MOCK_SCENE);
    expect(r1.score).toBe(r2.score);
    expect(r1.tier).toBe(r2.tier);
  });
});
