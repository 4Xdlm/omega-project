/** OMEGA — C12 TESTS GÉNOME NARRATIF (BF-13 : ADN déterministe). */

import { describe, it, expect } from 'vitest';

import { buildNarrativeGenome, sameWork, NARRATIVE_GENOME_SCHEMA } from '../src/mycelium-export/narrative-genome.js';
import type { GenomeInput } from '../src/mycelium-export/narrative-genome.js';
import { analyzeArcCoherence } from '../src/coherence/arc-coherence.js';
import { detectCast } from '../src/doctor/manuscript-import.js';

function mkInput(): GenomeInput {
  return {
    title: 'Le Silence du Phare',
    chapters: [
      { chapter: 1, prose: 'La mer grise montait contre la digue noire du petit port endormi.' },
      { chapter: 2, prose: 'Henri lisait le carnet sous la lampe, et la pluie frappait les volets clos.' },
    ],
    cast: [
      { name: 'Marin', occurrences: 12, firstChapter: 1, nearVariants: [] },
      { name: 'Henri', occurrences: 8, firstChapter: 2, nearVariants: [] },
    ],
    seedLedger: [{ seed: 'carnet', plantedChapter: 2, recallChapters: [], payoffChapter: 'UNPAID' }],
    chapterFunctions: [
      { chapter: 1, fn: 'TRANSITION', dialogueRatio: 0, actionDensity: 0, revelationHits: 0, noveltyVsPrev: 1 },
      { chapter: 2, fn: 'REVELATION', dialogueRatio: 0.1, actionDensity: 1, revelationHits: 2, noveltyVsPrev: 0.9 },
    ],
    tics: [{ gram: 'la mer', occurrences: 9, perChapter: 4.5, level: 'FAIL_SHADOW' }],
    admissionHashes: ['bbb', 'aaa'],
  };
}

describe('C12 narrative-genome (BF-13)', () => {
  it('INV-GEN-N1 — même livre + même config ⇒ MÊME hash (déterminisme total)', () => {
    const a = buildNarrativeGenome(mkInput());
    const b = buildNarrativeGenome(mkInput());
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.genomeHash).toBe(b.value.genomeHash);
    expect(sameWork(a.value, b.value)).toBe(true);
    expect(a.value.schema).toBe(NARRATIVE_GENOME_SCHEMA);
  });

  it('INV-GEN-N2 — UN MOT modifié ⇒ hash DIFFÉRENT (sensibilité au contenu)', () => {
    const a = buildNarrativeGenome(mkInput());
    const modified = mkInput();
    const b = buildNarrativeGenome({
      ...modified,
      chapters: [modified.chapters[0] as { chapter: number; prose: string }, { chapter: 2, prose: 'Henri lisait le carnet sous la lampe, et la pluie frappait les volets ouverts.' }],
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.genomeHash).not.toBe(b.value.genomeHash);
  });

  it('INV-GEN-N3 — l\'ORDRE d\'entrée (cast, admissions) est INDIFFÉRENT au hash', () => {
    const base = mkInput();
    const shuffled: GenomeInput = {
      ...base,
      cast: [...base.cast].reverse(),
      admissionHashes: ['aaa', 'bbb'], // ordre inverse de mkInput
    };
    const a = buildNarrativeGenome(base);
    const b = buildNarrativeGenome(shuffled);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.genomeHash).toBe(b.value.genomeHash);
  });

  it('INV-GEN-N4 — espaces/sauts de ligne non significatifs (normalisation NFC+blancs)', () => {
    const base = mkInput();
    const reflowed: GenomeInput = {
      ...base,
      chapters: base.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose.replace(/ /gu, '\n') })),
    };
    const a = buildNarrativeGenome(base);
    const b = buildNarrativeGenome(reflowed);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.genomeHash).toBe(b.value.genomeHash);
  });

  it('ADV — livre vide = erreur typée', () => {
    expect(buildNarrativeGenome({ ...mkInput(), chapters: [] }).ok).toBe(false);
  });
});

describe('NCR-MYC-001 — l\'ADN ne grave que du validé', () => {
  it('INV-MYC-001 — validatedCast : provenance VALIDATED, alias comptés, inconnus SÉPARÉS, stoplist active', () => {
    const input: GenomeInput = {
      title: 'T', chapters: [
        { chapter: 1, prose: 'Acte premier. Le gardien montait la lampe. Henri lisait son carnet. Clac ! La porte claqua sur Fresnel.' },
        { chapter: 2, prose: 'Le gardien revint vers Henri. Léna observait la mer grise du quai. Acte deux commence.' },
      ],
      cast: [
        { name: 'Acte', occurrences: 46, firstChapter: 1, nearVariants: [] }, // fantôme structurel
        { name: 'Fresnel', occurrences: 3, firstChapter: 1, nearVariants: [] }, // objet technique
        { name: 'Henri', occurrences: 2, firstChapter: 1, nearVariants: [] },
        { name: 'Léna', occurrences: 1, firstChapter: 2, nearVariants: [] },
      ],
      validatedCast: ['Henri', 'Léna'],
      aliases: [{ surface: 'gardien', canonical: 'Henri' }],
      seedLedger: [], chapterFunctions: [], tics: [],
    };
    const g = buildNarrativeGenome(input);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.value.castSource).toBe('VALIDATED');
    expect(g.value.cast.map((c) => c.name)).toEqual(['Henri', 'Léna']); // AUCUN fantôme
    const henri = g.value.cast.find((c) => c.name === 'Henri');
    expect(henri?.occurrences).toBe(4); // Henri×2 + gardien×2 (alias compté)
    expect(g.value.unknownCandidates.map((u) => u.name)).toContain('Fresnel'); // séparé, pas gravé au cast
    expect(g.value.unknownCandidates.map((u) => u.name)).toContain('Acte');
    expect(g.value.aliases[0]?.canonical).toBe('Henri');
  });

  it('INV-MYC-002 — ledger 3 états : recall tardif sans marqueur = UNCERTAIN, jamais faux UNPAID dur', () => {
    const mk = (ch: number, prose: string) => ({ chapter: ch, prose });
    const chapters = [
      mk(1, 'Rien ici sur la digue grise du matin.'), mk(2, 'La lettre apparut sous la porte close. Le registre dormait à la mairie.'),
      mk(3, 'Marin marchait.'), mk(4, 'Le registre fut mentionné une dernière fois ce soir-là.'), mk(5, 'Rien.'),
      mk(6, 'Rien encore.'), mk(7, 'Toujours rien.'), mk(8, 'Rien.'),
      mk(9, 'Elle rangea la lettre dans le coffre, sans un mot de plus.'), mk(10, 'Fin du livre sur le quai.'),
    ];
    const r = analyzeArcCoherence(chapters, { seeds: ['lettre', 'registre'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lettre = r.value.seedLedger.find((s) => s.seed === 'lettre');
    expect(lettre?.payoffChapter).toBe('UNCERTAIN_LATE_RECALL'); // recall ch.9 = dernier quintile (>8)
    const registre = r.value.seedLedger.find((s) => s.seed === 'registre');
    expect(registre?.payoffChapter).toBe('UNPAID'); // dernier recall ch.4 = abandon réel
  });

  it('INV-MYC-003 — stoplist structurelle : Acte/Clac jamais dans detectCast', () => {
    const ch = [{ chapter: 1, title: 't', prose: 'Acte un. Clac ! Acte deux. Clac ! Acte trois. Clac ! Henri lisait. Henri dormait. Henri rêvait.', words: 18 }];
    const cast = detectCast(ch, 3);
    expect(cast.map((c) => c.name)).toEqual(['Henri']);
  });
});
