/** OMEGA — ANNOTATEUR DE MENTIONS tests (proposition Architecte : pointeur chiffrable). */
import { describe, it, expect } from 'vitest';
import { annotateMentions } from '../src/identity/mention-annotator.js';

const ENTITIES = [
  { charId: 'ent_henri', canonical: 'Henri', aliases: ['gardien', 'Morel'], vital: 'DEAD' as const },
  { charId: 'ent_lena', canonical: 'Léna', aliases: ['Marchetti'], vital: 'ALIVE' as const },
];

describe('Annotateur de mentions (pointeur chiffrable + contrôle situation)', () => {
  it('INV-ANN-001 — chaque mention reçoit son pointeur, alias résolus au MÊME charId, longest-match-first', () => {
    const r = annotateMentions([{ chapter: 1, prose: 'Léna lisait. Le gardien était mort. Marchetti pleurait Henri Morel en silence.' }], ENTITIES);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.annotated).toContain('Léna{{ent_lena}}');
    expect(r.value.annotated).toContain('gardien{{ent_henri}}');
    expect(r.value.annotated).toContain('Marchetti{{ent_lena}}'); // alias → même pointeur
    expect(r.value.resolvedRate).toBe(1);
    const henriMentions = r.value.mentions.filter((m) => m.charId === 'ent_henri');
    expect(henriMentions.reduce((s, m) => s + m.count, 0)).toBeGreaterThanOrEqual(2); // gardien + Henri/Morel
  });

  it('INV-ANN-002 — CONTRÔLE DE SITUATION : un DEAD qui parle = DEAD_SPEAKS avec evidence', () => {
    const r = annotateMentions([{ chapter: 9, prose: '« Le phare tiendra », dit Henri en posant son verre près du feu.' }], ENTITIES);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.suspicions.length).toBe(1);
    expect(r.value.suspicions[0]?.kind).toBe('DEAD_SPEAKS');
    expect(r.value.suspicions[0]?.charId).toBe('ent_henri');
  });

  it('INV-ANN-003 — vitalOverride par chapitre : DEAD au ch.N seulement (mort en cours de livre)', () => {
    const chapters = [
      { chapter: 1, prose: 'Henri marcha vers la jetée sous la pluie fine du matin.' },
      { chapter: 5, prose: 'Henri ouvrit la porte de la remise sans un bruit.' },
    ];
    const r = annotateMentions(chapters, [{ ...ENTITIES[0]!, vital: 'ALIVE' }], [{ chapter: 5, vitalOverrides: { ent_henri: 'DEAD' } }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.suspicions.filter((s) => s.chapter === 1).length).toBe(0); // vivant ch.1 : rien
    expect(r.value.suspicions.filter((s) => s.chapter === 5 && s.kind === 'DEAD_ACTS').length).toBe(1);
  });

  it('INV-ANN-004 — nom propre inconnu = UNRESOLVED jamais silencieux ; déterminisme ×2', () => {
    const ch = [{ chapter: 2, prose: 'Léna parla longtemps avec Bertrand près du quai désert de Ker-Morvan.' }];
    const a = annotateMentions(ch, ENTITIES);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.value.unresolved.map((u) => u.name)).toContain('Bertrand');
    expect(a.value.resolvedRate).toBeLessThan(1);
    expect(JSON.stringify(annotateMentions(ch, ENTITIES))).toBe(JSON.stringify(annotateMentions(ch, ENTITIES)));
  });

  it('ADV — entrées vides = erreurs typées', () => {
    expect(annotateMentions([], ENTITIES).ok).toBe(false);
    expect(annotateMentions([{ chapter: 1, prose: 'x.' }], []).ok).toBe(false);
  });
});
