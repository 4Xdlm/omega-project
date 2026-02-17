/**
 * Tests: Euphony Basic Axis (Sprint 15.3)
 * Invariant: ART-PHON-03
 */

import { describe, it, expect } from 'vitest';
import { scoreEuphonyBasic } from '../../../src/oracle/axes/euphony-basic.js';
import { MOCK_PACKET } from '../../fixtures/mock-packet.js';

// Fluid literary prose
const PROSE_EUPHONIC = `Le vent caressait les feuilles mortes. La lumière dorée filtrait entre les branches nues.

Un silence apaisant régnait dans la clairière. Elle avança d'un pas.

— Personne, murmura-t-elle.

Les ombres dansaient sur le sol humide. Au loin, un merle chantait.

La nuit tombait lentement sur les collines, enveloppant tout de son manteau sombre.`;

// Harsh prose with cacophonies
const PROSE_CACOPHONIC = `Ses six chats chassèrent sans cesse. Pierre porta patiemment plusieurs paquets pesants par ce passage particulièrement pentu. Il a à peine aperçu sa silhouette.

Puis elle sortit. Puis il la suivit. Puis la pluie commença. Puis le vent se leva. Puis tout finit.`;

describe('EuphonyBasic Axis (ART-PHON-03)', () => {
  it('EUPH-01: prose fluide → score élevé (> 60)', () => {
    const result = scoreEuphonyBasic(MOCK_PACKET, PROSE_EUPHONIC);

    expect(result.name).toBe('euphony_basic');
    expect(result.score).toBeGreaterThan(60);
    expect(result.weight).toBe(1.0);
    expect(result.method).toBe('CALC');
    expect(result.details).toBeDefined();
  });

  it('EUPH-02: prose cacophonique → score plus bas', () => {
    const euphonic = scoreEuphonyBasic(MOCK_PACKET, PROSE_EUPHONIC);
    const cacophonic = scoreEuphonyBasic(MOCK_PACKET, PROSE_CACOPHONIC);

    // Cacophonic prose should score lower
    expect(cacophonic.score).toBeLessThan(euphonic.score);
  });

  it('EUPH-03: déterminisme — même prose = même score', () => {
    const r1 = scoreEuphonyBasic(MOCK_PACKET, PROSE_EUPHONIC);
    const r2 = scoreEuphonyBasic(MOCK_PACKET, PROSE_EUPHONIC);

    expect(r1.score).toBe(r2.score);
    expect(r1.details).toBe(r2.details);
  });
});
