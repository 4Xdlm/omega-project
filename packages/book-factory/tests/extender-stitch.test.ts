/** C9 — tests de couture extender sur le CAS RÉEL du run 60k (D-AUD-3). */
import { describe, it, expect } from 'vitest';
import { trimToCompleteSentence, dedupOverlap } from '../src/loop/chapter-extender.js';

describe('C9 couture extender (D-AUD-3)', () => {
  it('INV-STITCH-001 — le cas réel ch.1 60k se recoud proprement', () => {
    const prev = 'Elle fouille dans sa poche, sort son couteau suisse. Le métal est froid, luisant. Elle l';
    const next = "Le métal est froid, luisant. Elle l'ouvre à la hâte, le cliquetis de la lame.";
    const trimmed = trimToCompleteSentence(prev);
    expect(trimmed.endsWith('luisant.')).toBe(true); // « Elle l » éliminé
    const stitched = dedupOverlap(trimmed, next);
    expect(stitched.startsWith("Elle l'ouvre")).toBe(true); // reprise dédupliquée
    expect(`${trimmed} ${stitched}`).not.toContain('luisant. Le métal'); // plus de doublon
  });
  it('INV-STITCH-002 — sans chevauchement, la continuation est intacte', () => {
    expect(dedupOverlap('La mer montait sur les rochers noirs.', 'Garcia ouvrit son carnet humide et nota la date.')).toBe('Garcia ouvrit son carnet humide et nota la date.');
  });
  it('INV-STITCH-003 — prose finissant proprement = inchangée par trim', () => {
    expect(trimToCompleteSentence('Il pleuvait. Elle entra.')).toBe('Il pleuvait. Elle entra.');
    expect(trimToCompleteSentence('« Du naufrage », dit Yvon. »')).toContain('Yvon');
  });
  it('INV-STITCH-004 — continuation 100% répétée devient vide (stop propre en boucle)', () => {
    const s = 'Le silence pesait sur la salle commune du village.';
    expect(dedupOverlap(s, s)).toBe('');
  });
});
