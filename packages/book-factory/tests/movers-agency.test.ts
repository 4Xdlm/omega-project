/** OMEGA — EMP-16 : lexique mover élargi (agence par confrontation/interrogation).
 *  Verrouille la distinction AGENCY_BY_CONFRONTATION vs NO_AGENCY + la SPÉCIFICITÉ
 *  (un chapitre mort reste à 0 — le lexique n'inflate pas tout). */
import { describe, expect, it } from 'vitest';

import { moverBreakdown } from '../src/polish/targeted-regen-guard.js';

const CAST = ['Garcia', 'Léna', 'Yvon'];

describe('EMP-16 — movers agence élargie', () => {
  it('MV-001 — scène d\'interrogation = agence par CONFRONTATION (physique 0, total > 0)', () => {
    const prose = 'Garcia fixa Yvon Squarcioni. — Pourquoi mentir maintenant ? exigea-t-il. Léna interrogea le vieil homme sans le quitter des yeux.';
    const b = moverBreakdown(prose, CAST);
    expect(b.total).toBeGreaterThan(0);
    expect(b.confrontation).toBeGreaterThan(0);
    expect(b.physical).toBe(0); // aucune action physique — mais agence réelle
  });

  it('MV-002 — chapitre mort = total 0 (spécificité : le lexique ne compte pas l\'inertie)', () => {
    const prose = 'Garcia se tenait là sans bouger. Léna occupait le coin gauche. La porte demeurait close. La pièce servait de réserve.';
    expect(moverBreakdown(prose, CAST).total).toBe(0);
  });

  it('MV-003 — action physique = agence PHYSIQUE comptée', () => {
    const prose = 'Garcia frappa la table du poing. Léna courut vers la porte et la saisit.';
    const b = moverBreakdown(prose, CAST);
    expect(b.physical).toBeGreaterThan(0);
    expect(b.total).toBeGreaterThanOrEqual(2);
  });

  it('MV-004 — l\'OBJET d\'un verbe n\'est pas compté agent (Yvon fixé, pas agent)', () => {
    // « Garcia fixa Yvon » : Garcia agent, Yvon objet. Yvon ne devient agent que s'il agit lui-même.
    const b = moverBreakdown('Garcia fixa Yvon.', CAST);
    expect(b.total).toBe(1); // seul Garcia
  });
});
