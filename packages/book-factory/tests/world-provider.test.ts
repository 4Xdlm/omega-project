/**
 * OMEGA Book-Factory — WORLD_PROVIDER tests (BF-08, Phase 2). Mandat ChatGPT :
 * prouver que le RecallFact « présent dans la scène » satisfait NO_RECALL_FOR
 * (continuité de présence) SANS autoriser d'information NOUVELLE (anti-abus).
 */

import { describe, expect, it } from 'vitest';

import { guardPatch } from '../src/doctor/seam-surgeon.js';
import { makeWorldProvider, type WorldStateData } from '../src/doctor/world-provider.js';

const DATA: WorldStateData = {
  '1': { chapterId: 1, pov: 'THIRD', location: 'le bureau', activeCharacters: ['Yvon', 'Garcia'], activeObjects: ['carnet', 'registre'] },
};
const wp = makeWorldProvider(DATA);

describe('WORLD_PROVIDER — extraction + contrat guardPatch', () => {
  it('1. personnage actif → RecallFact présent (INV-SS-003 satisfait)', () => {
    expect(wp(1).recallPack.some((r) => r.entity === 'Yvon')).toBe(true);
  });

  it('2. personnage non actif → aucun RecallFact', () => {
    expect(wp(1).recallPack.some((r) => r.entity === 'Napoléon')).toBe(false);
  });

  it('3. objet actif disponible', () => {
    expect(wp(1).activeObjects).toContain('carnet');
  });

  it('4. objet absent non présent dans l’état du monde', () => {
    expect(wp(1).activeObjects).not.toContain('bazooka');
  });

  it('5. fallback chapitre inconnu = sûr (vide, sans throw)', () => {
    const w = wp(99);
    expect(w.activeCharacters).toEqual([]);
    expect(w.activeObjects).toEqual([]);
    expect(w.location).toBe('');
  });

  it('6. ANTI-ABUS — « présent dans la scène » autorise la continuité, PAS une info nouvelle', () => {
    const established = 'Yvon entra dans le bureau. Garcia attendait avec le carnet.';
    const ok = guardPatch('Yvon referma le carnet.', {
      world: wp(1), left: established, right: '', established, chapterId: 1,
    });
    expect(ok.join(' ')).not.toContain('NO_RECALL_FOR');
    expect(ok.join(' ')).not.toContain('NEW_ENTITY');

    const bad = guardPatch('Yvon salua Napoléon.', {
      world: wp(1), left: established, right: '', established, chapterId: 1,
    });
    expect(bad.join(' ')).toContain('NEW_ENTITY');
  });
});
