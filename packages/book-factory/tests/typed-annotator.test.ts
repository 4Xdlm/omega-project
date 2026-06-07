/** OMEGA — MARQUEUR TYPÉ tests (extension Architecte 2026-06-07 : lieux,
 *  événements, objets — même pointeur chiffrable que les personnages). */
import { describe, it, expect } from 'vitest';
import { annotateMentions } from '../src/identity/mention-annotator.js';

const ENTITIES = [
  { charId: 'ent_garcia', canonical: 'Garcia', aliases: [], vital: 'ALIVE' as const, kind: 'CHARACTER' as const },
  { charId: 'loc_mairie', canonical: 'mairie', aliases: [], vital: 'ALIVE' as const, kind: 'PLACE' as const },
  { charId: 'evt_naufrage', canonical: 'naufrage', aliases: [], vital: 'ALIVE' as const, kind: 'EVENT' as const },
  { charId: 'obj_lettre', canonical: 'lettre', aliases: [], vital: 'ALIVE' as const, kind: 'OBJECT' as const },
];

describe('MARK — pointeurs typés (personnage / lieu / événement / objet)', () => {
  it('INV-MARK-001 — lieu, événement et objet reçoivent leur pointeur inline typé', () => {
    const r = annotateMentions([{ chapter: 1, prose: 'Garcia entra dans la mairie. Le naufrage hantait encore le village. La lettre attendait sur la table.' }], ENTITIES);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.annotated).toContain('Garcia{{ent_garcia}}');
    expect(r.value.annotated).toContain('mairie{{loc_mairie}}');
    expect(r.value.annotated).toContain('naufrage{{evt_naufrage}}');
    expect(r.value.annotated).toContain('lettre{{obj_lettre}}');
    const kinds = new Set(r.value.mentions.map((m) => m.kind));
    expect(kinds).toEqual(new Set(['CHARACTER', 'PLACE', 'EVENT', 'OBJECT']));
  });

  it('INV-MARK-002 — casse : « Lettre » (tête de phrase) résolu pour un OBJET ; « garcia » minuscule JAMAIS pour un PERSONNAGE', () => {
    const r = annotateMentions([{ chapter: 2, prose: 'Lettre après lettre, il relisait tout. Le garcia du bar ne répondait pas.' }], ENTITIES);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.annotated).toContain('Lettre{{obj_lettre}}'); // insensible pour OBJECT
    expect(r.value.annotated).not.toContain('garcia{{ent_garcia}}'); // un NOM est sa casse
  });

  it('INV-MARK-003 — carte de PRÉSENCE par chapitre et par type (contrôle de situation étendu)', () => {
    const r = annotateMentions([
      { chapter: 1, prose: 'Garcia regardait la mairie.' },
      { chapter: 2, prose: 'Le naufrage. La lettre. Rien de plus.' },
    ], ENTITIES);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const p1 = r.value.presence.find((p) => p.chapter === 1);
    const p2 = r.value.presence.find((p) => p.chapter === 2);
    expect(p1?.characters).toEqual(['ent_garcia']);
    expect(p1?.places).toEqual(['loc_mairie']);
    expect(p1?.events).toEqual([]);
    expect(p2?.events).toEqual(['evt_naufrage']);
    expect(p2?.objects).toEqual(['obj_lettre']);
    expect(p2?.characters).toEqual([]);
  });

  it('INV-MARK-004 — le contrôle vital (DEAD_SPEAKS) ne concerne QUE les personnages', () => {
    const r = annotateMentions(
      [{ chapter: 3, prose: 'La mairie dit non à tout le monde depuis toujours.' }],
      [{ charId: 'loc_mairie', canonical: 'mairie', aliases: [], vital: 'DEAD', kind: 'PLACE' }],
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.suspicions.length).toBe(0); // un lieu « DEAD » ne déclenche jamais DEAD_SPEAKS
  });
});
