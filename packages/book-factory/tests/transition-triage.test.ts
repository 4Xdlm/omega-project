/** OMEGA — PE-7 TRANSITION_TRIAGE : proxy d'atmosphère + logique de triage.
 *  Loi vérifiée : « atmosphère lourde ≠ ventre mou » (ch.25 KEEP) ; un chapitre
 *  qui fait un acte n'est JAMAIS coupé (INV-TRIAGE-002). Le module TRIE, jamais coupe. */
import { describe, expect, it } from 'vitest';

import {
  atmosphereDensity, rhythmCV, transitionSignals, triageTransitions,
} from '../src/polish/transition-triage.js';
import type { TriageSignals } from '../src/polish/transition-triage.js';

const ATMOSPHERE = 'La pénombre noyait la cale. Une odeur de sel et de moisissure montait des planches humides, lourde, tenace, et le froid glissait le long des parois rouillées comme une eau lente. Un craquement. Le silence retomba, plus épais qu\'avant, et la lueur grise de l\'aube peinait à franchir le hublot encrassé d\'iode.';
const EMPTY = 'Le bureau se trouvait au fond du couloir. La table avait quatre pieds. Il y avait deux chaises et une étagère. Le calendrier datait de l\'année passée. La cour donnait sur la rue. Une autre porte menait au débarras. Le plafond restait bas. La salle servait de réserve administrative.';
const FLAT = 'Il marcha. Il marcha encore. Il marcha toujours. Il marcha longtemps.';

describe('PE-7 — proxy atmosphère (direction mesurable, pas oracle)', () => {
  it('TT-001 — densité sensorielle : atmosphère lourde > pièce vide', () => {
    expect(atmosphereDensity(ATMOSPHERE)).toBeGreaterThan(atmosphereDensity(EMPTY));
    expect(atmosphereDensity(EMPTY)).toBeLessThan(5); // quasi nulle
  });

  it('TT-002 — rythme CV : phrases variées > phrases plates', () => {
    expect(rhythmCV(ATMOSPHERE)).toBeGreaterThan(rhythmCV(FLAT));
  });

  it('TT-003 — gardes dégénérées : vide ⇒ 0, jamais de NaN/throw', () => {
    expect(atmosphereDensity('')).toBe(0);
    expect(rhythmCV('')).toBe(0);
    expect(rhythmCV('Une seule phrase.')).toBe(0); // < 2 phrases
    expect(triageTransitions([])).toEqual([]);
  });

  it('TT-004 — signals bruts exposés (décision 3-IA sur les nombres, pas mes poids)', () => {
    const s = transitionSignals(25, ATMOSPHERE, 0.9);
    expect(s.chapter).toBe(25);
    expect(s.atmosphereDensity).toBeGreaterThan(0);
    expect(s.atmoScore).toBeGreaterThanOrEqual(0);
    expect(s.atmoScore).toBeLessThanOrEqual(1);
  });
});

describe('PE-7 — triage par terciles relatifs (déterministe)', () => {
  /* Signaux fabriqués : atmoScore distincts pour exercer chaque branche sans
   * dépendre de la saturation du proxy sur de courts fixtures. */
  const base = { comfortRatio: 0.9, noveltyVsPrev: 0.5, atmosphereDensity: 10, rhythmCV: 0.5 };
  const signals: readonly TriageSignals[] = [
    { chapter: 1, dramaHits: 0, atmoScore: 0.95, emptiness: 0.80, ...base }, // haut → KEEP
    { chapter: 2, dramaHits: 0, atmoScore: 0.85, emptiness: 0.70, ...base }, // haut → KEEP
    { chapter: 3, dramaHits: 0, atmoScore: 0.45, emptiness: 0.20, ...base }, // milieu, peu vide → REINFORCE
    { chapter: 4, dramaHits: 0, atmoScore: 0.10, emptiness: 0.90, ...base }, // bas + vide → CUT_MERGE
    { chapter: 5, dramaHits: 3, atmoScore: 0.05, emptiness: 0.95, ...base }, // acte dramatique → KEEP (INV-002)
  ];
  const rows = triageTransitions(signals);
  const bucketOf = (ch: number): string => rows.find((r) => r.chapter === ch)?.bucket ?? 'MISSING';

  it('TT-005 — atmosphère défendable (haut tercile) ⇒ KEEP', () => {
    expect(bucketOf(1)).toBe('KEEP');
    expect(bucketOf(2)).toBe('KEEP');
  });

  it('TT-006 — ambiance mince mais pas vide ⇒ REINFORCE (jamais coupe directe)', () => {
    expect(bucketOf(3)).toBe('REINFORCE');
  });

  it('TT-007 — réellement vide (bas tercile + vide + zéro acte) ⇒ CUT_MERGE', () => {
    expect(bucketOf(4)).toBe('CUT_MERGE');
  });

  it('TT-008 — INV-TRIAGE-002 : un chapitre qui fait un acte n\'est JAMAIS CUT_MERGE', () => {
    expect(bucketOf(5)).toBe('KEEP'); // malgré atmoScore 0.05 / emptiness 0.95
    expect(rows.every((r) => !(r.bucket === 'CUT_MERGE' && r.dramaHits >= 2))).toBe(true);
  });

  it('TT-009 — sortie triée par chapitre, un bucket par entrée, rationale non vide', () => {
    expect(rows.map((r) => r.chapter)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.every((r) => r.rationale.length > 0)).toBe(true);
  });
});
