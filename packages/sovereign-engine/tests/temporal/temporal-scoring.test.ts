/**
 * Tests: Temporal Scoring (Sprint 16.2)
 * Invariant: ART-TEMP-02
 */

import { describe, it, expect } from 'vitest';
import { scoreTemporalPacing } from '../../src/temporal/temporal-scoring.js';
import { createDefaultTemporalContract } from '../../src/temporal/temporal-contract.js';

// Prose with varied paragraph sizes: larger paragraphs at key positions
const PROSE_WELL_PACED = `Ouverture brève. Le jour se levait.

La porte s'ouvrit dans un grincement long et douloureux. Elle entra dans la pièce en retenant son souffle. Chaque pas résonnait sur le carrelage froid comme un battement de cœur mécanique qui refusait de s'éteindre. Les murs suintaient une humidité ancienne et tenace.

Elle avança encore plus profondément dans cette maison qui semblait l'attendre depuis des années entières.

Le moment vint. Elle trouva la lettre posée sur la table, cette lettre qu'elle cherchait depuis si longtemps, cette lettre qui contenait la vérité sur la disparition de son frère. Ses mains tremblèrent quand elle brisa le sceau de cire rouge. Les mots dansaient devant ses yeux embués de larmes. Chaque phrase était un coup de poignard dans sa poitrine serrée. La vérité était là, crue, brutale, insoutenable, et pourtant elle ne pouvait plus la fuir. Elle lut trois fois la dernière phrase avant de comprendre que rien ne serait plus jamais pareil.

Transition rapide. La nuit tomba.

La résolution arriva comme un souffle. Elle posa la lettre. Elle comprit. Les épaules s'affaissèrent lentement tandis qu'elle acceptait enfin ce que personne n'avait osé lui dire. Un silence profond enveloppa la pièce comme un drap funéraire.

Elle sortit. La porte se referma.`;

describe('TemporalScoring (ART-TEMP-02)', () => {
  it('TSCORE-01: prose bien rythmée → composite > 40', () => {
    const contract = createDefaultTemporalContract(200);
    const result = scoreTemporalPacing(PROSE_WELL_PACED, contract);

    expect(result.composite).toBeGreaterThan(40);
    expect(result.dilatation_score).toBeGreaterThanOrEqual(0);
    expect(result.dilatation_score).toBeLessThanOrEqual(100);
    expect(result.compression_score).toBeGreaterThanOrEqual(0);
    expect(result.compression_score).toBeLessThanOrEqual(100);
  });

  it('TSCORE-02: moment scores have correct structure', () => {
    const contract = createDefaultTemporalContract(200);
    const result = scoreTemporalPacing(PROSE_WELL_PACED, contract);

    expect(result.details.length).toBe(3); // 3 key moments
    for (const ms of result.details) {
      expect(ms.moment_id).toBeDefined();
      expect(ms.target_pct).toBeGreaterThan(0);
      expect(ms.actual_pct).toBeGreaterThanOrEqual(0);
      expect(ms.ratio).toBeGreaterThanOrEqual(0);
    }
  });

  it('TSCORE-03: zone scores have correct structure', () => {
    const contract = createDefaultTemporalContract(200);
    const result = scoreTemporalPacing(PROSE_WELL_PACED, contract);

    expect(result.zone_details.length).toBe(2); // 2 compression zones
    for (const zs of result.zone_details) {
      expect(zs.zone_id).toBeDefined();
      expect(zs.max_pct).toBeGreaterThan(0);
      expect(zs.actual_pct).toBeGreaterThanOrEqual(0);
    }
  });

  it('TSCORE-04: déterminisme — même prose + même contract = même score', () => {
    const contract = createDefaultTemporalContract(200);
    const r1 = scoreTemporalPacing(PROSE_WELL_PACED, contract);
    const r2 = scoreTemporalPacing(PROSE_WELL_PACED, contract);

    expect(r1.composite).toBe(r2.composite);
    expect(r1.dilatation_score).toBe(r2.dilatation_score);
    expect(r1.compression_score).toBe(r2.compression_score);
  });

  it('TSCORE-05: empty prose → neutral score', () => {
    const contract = createDefaultTemporalContract(200);
    const result = scoreTemporalPacing('', contract);

    expect(result.composite).toBe(50);
  });
});
