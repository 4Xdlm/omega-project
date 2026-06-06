/** OMEGA — C12 TESTS GÉNOME NARRATIF (BF-13 : ADN déterministe). */

import { describe, it, expect } from 'vitest';

import { buildNarrativeGenome, sameWork, NARRATIVE_GENOME_SCHEMA } from '../src/mycelium-export/narrative-genome.js';
import type { GenomeInput } from '../src/mycelium-export/narrative-genome.js';

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
