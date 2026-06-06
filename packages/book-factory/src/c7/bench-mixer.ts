/**
 * OMEGA — C13 BENCH DU MIXAGE (script BF-08) — mandat Gemini exécuté en MIEUX :
 * au lieu de 5 chapitres générés, re-sélection sur les candidats PERSISTÉS du
 * run 88k — 50 chapitres × 7 candidats × {TENSION, MYSTERE, ESPOIR} × {-1,0,+1}
 * = 450 sélections CALC, zéro coût LLM, base = expScore RÉELS des admissions.
 *
 * Questions du bench : (1) le potard change-t-il le gagnant ? (taux par réglage)
 * (2) MONOTONIE : la feature du gagnant suit-elle le potard ? (3) l'ADN bouge-t-il
 * (génome du livre re-sélectionné vs V0) SANS casser la cohérence (gagnants
 * éligibles par construction — étage A) ?
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

import { mixedSelect } from '../mixer/mixer-selector.js';
import type { MixerCandidate } from '../mixer/mixer-selector.js';
import { measureKnobFeatures, traceabilityTable } from '../mixer/knob-bindings.js';
import type { KnobId } from '../mixer/knob-bindings.js';
import { buildNarrativeGenome } from '../mycelium-export/narrative-genome.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';

const RUN = process.env['BENCH_RUN'] ?? 'runs/c8_book60k';
const KNOBS: readonly KnobId[] = ['TENSION', 'MYSTERE', 'ESPOIR'];
const POSITIONS: readonly number[] = [-1, 0, 1];

interface ChapterCandidates { readonly chapter: number; readonly originalWinner: string; readonly candidates: readonly MixerCandidate[]; }

function loadChapters(): readonly ChapterCandidates[] {
  const out: ChapterCandidates[] = [];
  for (const dir of readdirSync(RUN).filter((d) => d.startsWith('chap_')).sort()) {
    const adm = JSON.parse(readFileSync(`${RUN}/${dir}/admission.json`, 'utf8')) as {
      chapter: number; winner: string;
      candidates: readonly { profile: string; eligible: boolean; expScore: number }[];
    };
    const candidates: MixerCandidate[] = [];
    for (const c of adm.candidates) {
      try {
        const prose = readFileSync(`${RUN}/${dir}/candidate_${c.profile}.txt`, 'utf8');
        candidates.push({ id: c.profile, prose, baseScore: c.expScore, eligible: c.eligible });
      } catch { /* candidat non persisté — ignoré, documenté par le compte */ }
    }
    if (candidates.length >= 2) out.push({ chapter: adm.chapter, originalWinner: adm.winner, candidates });
  }
  return out;
}

function main(): void {
  const chapters = loadChapters();
  const rows: {
    knob: KnobId; position: number; changedRate: number; meanWinnerFeature: number;
    profileHistogram: Record<string, number>;
  }[] = [];

  // RÉFÉRENCE PROPRE : le gagnant à potards NULS (= max expScore) — PAS le
  // winner du run (la hostile-selection R6 intégrait d'autres critères : un
  // delta vs run mesurerait la différence de SCORING, pas l'effet du potard).
  const neutralWinners = new Map<number, string>();
  for (const ch of chapters) {
    const r0 = mixedSelect(ch.candidates, {});
    if (r0.ok) neutralWinners.set(ch.chapter, r0.value.winner);
  }

  const winnersAtPlusTension: string[] = [];
  const winnersAtNeutral: string[] = []; // périmètre constant pour le test ADN

  for (const knob of KNOBS) {
    for (const pos of POSITIONS) {
      let changed = 0;
      let featureSum = 0;
      const hist: Record<string, number> = {};
      for (const ch of chapters) {
        const r = mixedSelect(ch.candidates, { [knob]: pos });
        if (!r.ok) continue;
        const winner = r.value.ranked[0];
        if (winner === undefined) continue;
        if (r.value.winner !== neutralWinners.get(ch.chapter)) changed += 1;
        featureSum += winner.features[knob];
        hist[r.value.winner] = (hist[r.value.winner] ?? 0) + 1;
        const prose = ch.candidates.find((c) => c.id === r.value.winner)?.prose ?? '';
        if (knob === 'TENSION' && pos === 1) winnersAtPlusTension.push(prose);
        if (knob === 'TENSION' && pos === 0) winnersAtNeutral.push(prose);
      }
      rows.push({
        knob, position: pos,
        changedRate: Number((changed / chapters.length).toFixed(3)),
        meanWinnerFeature: Number((featureSum / chapters.length).toFixed(3)),
        profileHistogram: hist,
      });
    }
  }

  /* ── Test ADN (mandat Gemini) — PÉRIMÈTRE CONSTANT : remix TENSION+1 vs
   *    remix neutre (deux livres de gagnants NON étendus — comparer au V0
   *    étendu mesurerait l'extension, pas le potard). ─────────────────────── */
  const v0Text = winnersAtNeutral.map((p, i) => `## Chapitre ${i + 1}\n\n${p}`).join('\n\n');
  const remixedText = winnersAtPlusTension.map((p, i) => `## Chapitre ${i + 1}\n\n${p}`).join('\n\n');
  const genomeOf = (text: string): { hash: string; tics: readonly { gram: string; occurrences: number }[] } => {
    const imp = importManuscript(text);
    if (!imp.ok) throw new Error(imp.error.code);
    const audit = runDoctorAudit(imp.value.chapters, imp.value.castProposal.slice(0, 4).map((c) => c.name), []);
    if (!audit.ok) throw new Error(audit.error.code);
    const g = buildNarrativeGenome({
      title: 'Le Silence du Phare', chapters: imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })),
      cast: imp.value.castProposal, seedLedger: audit.value.arc.seedLedger,
      chapterFunctions: audit.value.arc.chapterFunctions, tics: audit.value.tics.rows,
    });
    if (!g.ok) throw new Error(g.error.code);
    return { hash: g.value.genomeHash, tics: g.value.ticsSignature.slice(0, 5) };
  };
  const gV0 = genomeOf(v0Text);
  const gMix = genomeOf(remixedText);

  /* ── Monotonie (verdict par potard) ──────────────────────────────────── */
  const monotonic = KNOBS.map((knob) => {
    const seq = POSITIONS.map((p) => rows.find((r) => r.knob === knob && r.position === p)?.meanWinnerFeature ?? 0);
    return { knob, sequence: seq, monotonicUp: seq[0] !== undefined && seq[1] !== undefined && seq[2] !== undefined && seq[0] <= seq[1] && seq[1] <= seq[2] };
  });

  const report = {
    chaptersUsed: chapters.length,
    selectionsTotal: KNOBS.length * POSITIONS.length * chapters.length,
    rows, monotonic,
    dna: { neutralRemixHash: gV0.hash, tensionPlus1RemixHash: gMix.hash, distinct: gV0.hash !== gMix.hash, neutralTics: gV0.tics, mixedTics: gMix.tics },
    traceability: traceabilityTable(),
  };
  writeFileSync(`${RUN}/BENCH_MIXER_REPORT.json`, JSON.stringify(report, null, 2), 'utf8');

  const md = [
    `# BENCH MIXER — ${RUN} (sélection-only, candidats persistés réels)`,
    `Chapitres: ${chapters.length} · Sélections: ${report.selectionsTotal} · Base: expScore des admissions`,
    `## Réponse au potard (changedRate vs gagnant d'origine · feature moyenne du gagnant)`,
    ...rows.map((r) => `- ${r.knob} @ ${r.position >= 0 ? '+' : ''}${r.position} : changed=${(r.changedRate * 100).toFixed(0)}% · feature=${r.meanWinnerFeature}`),
    `## MONOTONIE (la feature du gagnant suit-elle le potard ?)`,
    ...monotonic.map((m) => `- ${m.knob} : ${m.sequence.join(' → ')} ⇒ ${m.monotonicUp ? 'MONOTONE ✓' : 'NON MONOTONE ✗'}`),
    `## ADN (mandat Gemini, périmètre constant : remix neutre vs remix TENSION+1)`,
    `- neutre : ${gV0.hash.slice(0, 16)}… · TENSION+1 : ${gMix.hash.slice(0, 16)}… · distincts=${report.dna.distinct}`,
    `- Tics neutre top: ${gV0.tics.map((t) => `«${t.gram}»×${t.occurrences}`).join(' ')}`,
    `- Tics TENSION+1 top: ${gMix.tics.map((t) => `«${t.gram}»×${t.occurrences}`).join(' ')}`,
  ].join('\n\n');
  writeFileSync(`${RUN}/BENCH_MIXER_REPORT.md`, md, 'utf8');
  process.stdout.write(`${md}\n`);
}

main();
