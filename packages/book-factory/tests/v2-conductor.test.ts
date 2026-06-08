/** OMEGA — V2 CONDUCTOR (BF-08) : C18 sélection, Wasserstein, Emergence, Lyapunov. */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EmergenceTracker, V2Conductor, lyapunovReadout, sentenceLengths, wassersteinToProfile } from '../src/v2/v2-conductor.js';
import { FEWSHOT_EXEMPLARS } from '../src/rosetta/dramatic-grid.js';

describe('V2 — Wasserstein rythme (ADVISORY, profil PROVISOIRE)', () => {
  it('V2-001 — prose monotone (toutes phrases ~10 mots) plus LOIN du profil que prose à queue lourde', () => {
    const flat = Array<string>(20).fill('Il marcha le long du quai en regardant la mer grise.').join(' ');
    const varied = 'Rien. Il marcha le long du quai désert en regardant la mer grise se lever par paquets contre les pierres noires, et chaque vague semblait peser le poids exact de ce qu\'il refusait de dire depuis le naufrage. Trois mots. Puis le silence retomba sur le port comme une dalle. Léna attendait toujours.';
    expect(wassersteinToProfile(sentenceLengths(varied))).toBeLessThan(wassersteinToProfile(sentenceLengths(flat)));
  });

  it('V2-002 — moins de 5 phrases ⇒ Infinity (jamais de score sur un échantillon vide)', () => {
    expect(wassersteinToProfile(sentenceLengths('Une seule phrase courte ici.'))).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('V2 — Emergence Tracker (SHADOW, jamais d\'auto-mint)', () => {
  it('V2-003 — entité non mintée récurrente atteint la masse ⇒ AUTHOR_REVIEW_REQUIRED ; mintée ignorée', () => {
    const t = new EmergenceTracker(['Garcia', 'Léna']);
    for (const ch of [3, 9, 15]) t.observe('Il revit le visage de Morvan ce soir-là. Garcia parlait encore de Morvan.', ch);
    const r = t.report(5);
    const morvan = r.find((e) => e.name === 'Morvan');
    expect(morvan?.verdict).toBe('AUTHOR_REVIEW_REQUIRED');
    expect(morvan?.mass).toBe(6 + 2 * 3); // 6 occurrences + 2×3 chapitres
    expect(r.find((e) => e.name === 'Garcia')).toBeUndefined(); // minté = invisible
  });

  it('V2-004 — les débuts de phrase ne polluent pas (La/Il majuscule de position)', () => {
    const t = new EmergenceTracker([]);
    t.observe('La pluie tombait. Il marchait vite. Le port dormait.', 1);
    t.observe('La pluie tombait. Il marchait vite. Le port dormait.', 2);
    expect(t.report(1).length).toBe(0); // aucune capitale de milieu de phrase
  });
});

describe('V2 — Lyapunov readout (SHADOW, gains PROVISOIRES=1)', () => {
  it('V2-005 — V = somme exacte des termes (auditables un à un)', () => {
    const r = lyapunovReadout({ chapter: 7, unpaidSeeds: 3, motifSaturation: 2, driftRate: 0.5, emergenceCandidates: 1, actBreaches: 0, rhythmFlatness: 4.2 });
    expect(r.V).toBeCloseTo(10.7, 3);
  });
});

describe('V2 — escalade C17 calibrée S0 (few-shot prouvé, pas reformulation)', () => {
  it('V2-007 — l\'escalade REVELATION/CONFRONTATION injecte l\'EXEMPLAR prouvé (S0-bis)', () => {
    const v2 = new V2Conductor(mkdtempSync(join(tmpdir(), 'v2-')), []);
    const rev = v2.escalationDirective('REVELATION', 5);
    expect(rev).toContain(FEWSHOT_EXEMPLARS.REVELATION);
    expect(rev).toMatch(/avoua|comprit que|la vérité éclata/u);
    const conf = v2.escalationDirective('CONFRONTATION', 5);
    expect(conf).toContain(FEWSHOT_EXEMPLARS.CONFRONTATION);
    // ACTION : pas d'exemplar (gemma4 la produit déjà — S0 succès dès variante A)
    expect(v2.escalationDirective('ACTION', 5)).not.toContain(FEWSHOT_EXEMPLARS.REVELATION);
  });
});

describe('V2 — C18 sélection (le CALC contrôle la SÉLECTION, ADR-003)', () => {
  it('V2-006 — gagnante cloneuse ⇒ SWAP vers admissible éligible ; saine ⇒ PASS', () => {
    const v2 = new V2Conductor(mkdtempSync(join(tmpdir(), 'v2-')), []);
    /* deux occurrences préalables de la même tête */
    expect(v2.field.observe({ kind: 'INCIPIT_HEAD', motif: 'la cale sentait le', chapter: 1 }).ok).toBe(true);
    expect(v2.field.observe({ kind: 'INCIPIT_HEAD', motif: 'la cale sentait le', chapter: 5 }).ok).toBe(true);
    const candidates = [
      { profile: 'synthese', prose: 'La cale sentait le sel et la nuit froide du large.', eligible: true },
      { profile: 'dialogue', prose: 'Garcia posa le registre ouvert devant Yvon sans un mot.', eligible: true },
    ];
    const swapped = v2.applyIncipitGate(candidates, 'synthese', 9);
    expect(swapped).toEqual({ profile: 'dialogue', c18: 'SWAPPED' });
    const pass = v2.applyIncipitGate(candidates, 'dialogue', 9);
    expect(pass.c18).toBe('PASS');
  });
});
