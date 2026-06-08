/** OMEGA — PE-3 regression-guard de régen ciblée (BF-08, pur CALC). */
import { describe, expect, it } from 'vitest';

import { guardRegen } from '../src/polish/targeted-regen-guard.js';

const CAST = ['Léna', 'Garcia', 'Yvon'];
const base = { cast: CAST, deadCanon: [] as string[], defect: 'mover' as const };

describe('PE-3 — regression-guard', () => {
  it('RG-001 — ACCEPT : la candidate gagne un personnage moteur, rien cassé', () => {
    const original = 'La pièce était sombre. Yvon était là, immobile près du mur. Le silence pesait.';
    const candidate = 'Yvon saisit le carnet et le jeta sur la table. — Assez, dit-il. Léna recula d\'un pas.';
    const r = guardRegen({ ...base, original, candidate });
    expect(r.verdict).toBe('ACCEPT');
    expect(r.metrics.moversAfter).toBeGreaterThan(r.metrics.moversBefore);
  });

  it('RG-002 — REJECT NO_MOVER_GAINED : aucun moteur ajouté', () => {
    const original = 'Yvon saisit la lampe. Il courut.';
    const candidate = 'La maison était grise. Le toit était bas. La nuit tombait sur le port.';
    const r = guardRegen({ ...base, original, candidate });
    expect(r.verdict).toBe('REJECT');
    expect(r.reasons).toContain('NO_MOVER_GAINED');
  });

  it('RG-003 — REJECT DEAD_CHARACTER_RESURRECTED : un mort parle (leçon mistral ch.50)', () => {
    const original = 'Léna avança. Garcia gisait, mort, sur les dalles.';
    const candidate = 'Léna saisit la lampe. — Tu mens, dit Garcia en se redressant.';
    const r = guardRegen({ ...base, deadCanon: ['Garcia'], defect: 'mover', original, candidate });
    expect(r.verdict).toBe('REJECT');
    expect(r.reasons).toContain('DEAD_CHARACTER_RESURRECTED');
  });

  it('RG-004 — REJECT CANON_CHARACTER_REMOVED : un personnage de l\'original disparaît', () => {
    const original = 'Léna et Garcia entrèrent. Garcia ferma la porte.';
    const candidate = 'Léna saisit la lampe et courut vers la cale, seule dans le noir.';
    const r = guardRegen({ ...base, original, candidate });
    expect(r.reasons).toContain('CANON_CHARACTER_REMOVED');
  });

  it('RG-005 — REJECT TIC_INCREASED : la candidate sature un tic', () => {
    const original = 'Yvon saisit le carnet et frappa la table avec colère.';
    const candidate = `Léna parla. ${'le silence le silence le silence le silence le silence '.repeat(2)} Yvon saisit le carnet.`;
    const r = guardRegen({ ...base, original, candidate });
    expect(r.reasons).toContain('TIC_INCREASED');
  });

  it('RG-006 — REJECT NEW_SEMANTIC_RESIDUE : guillemet orphelin', () => {
    const original = 'Yvon parla. Léna saisit le carnet et courut.';
    const candidate = 'Yvon saisit la lampe. — « Je sais tout, dit Léna et elle frappa la table.';
    const r = guardRegen({ ...base, original, candidate });
    expect(r.reasons).toContain('NEW_SEMANTIC_RESIDUE');
  });
});
