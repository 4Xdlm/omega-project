/**
 * OMEGA — VERDICT EMP-16 (le verdict de l'instrument, pas de l'enthousiasme).
 * Batterie complète sur NEXT_BOOK_V1_FULLSTACK_EMP16 + comparaison 88k
 * (Le Silence du Phare, canonique c8). 10 dimensions, PASS/FAIL chacune.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { sha256 } from '@omega/canon-kernel';

import { buildCanonical } from './build-canonical.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';
import { scanSemanticResidue } from '../doctor/semantic-residue.js';
import { annotateMentions } from '../identity/mention-annotator.js';
import { buildNarrativeGenome } from '../mycelium-export/narrative-genome.js';
import { EntityRegistry, verifyManuscriptIdentities } from '../identity/entity-registry.js';

const SEEDS = ['naufrage', 'dette', 'lettre', 'carnet', 'registre'];
const TICS = ['le gardien', 'le silence', 'il y a', 'la pluie', 'le village', 'la peur', 'la mer', 'le vent'];
const WEATHER_RE = /^(la pluie|la brume|le vent|la neige|le brouillard|l'orage)/iu;

interface Ch { readonly chapter: number; readonly prose: string; }

function sentenceCv(prose: string): number {
  const lens = prose.split(/(?<=[.!?…»])\s+(?!»)/u).map((s) => s.trim().split(/\s+/u).length).filter((n) => n > 1);
  if (lens.length < 3) return 0;
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const v = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
  return Math.sqrt(v) / Math.max(1, mean);
}

function battery(chapters: readonly Ch[], fullText: string): Record<string, unknown> {
  const words = fullText.split(/\s+/u).filter((w) => w.length > 0).length;
  const wc = chapters.map((c) => c.prose.split(/\s+/u).filter((w) => w.length > 0).length);
  const wMean = wc.reduce((a, b) => a + b, 0) / Math.max(1, wc.length);
  const wSd = Math.sqrt(wc.reduce((a, b) => a + (b - wMean) ** 2, 0) / Math.max(1, wc.length));
  const cvs = chapters.map((c) => sentenceCv(c.prose));
  const cvMean = cvs.reduce((a, b) => a + b, 0) / Math.max(1, cvs.length);
  const heads = chapters.map((c) => c.prose.trim().split(/\s+/u).slice(0, 4).join(' ').toLowerCase());
  const headCount = new Map<string, number>();
  for (const h of heads) headCount.set(h, (headCount.get(h) ?? 0) + 1);
  const clones = [...headCount.values()].filter((n) => n >= 3).reduce((a, b) => a + b, 0);
  const weather = heads.filter((h) => WEATHER_RE.test(h)).length;
  const tics: Record<string, number> = {};
  for (const t of TICS) tics[t] = Number((((fullText.toLowerCase().match(new RegExp(t.replace(/ /gu, '\\s+'), 'gu')) ?? []).length * 1000) / words).toFixed(2));
  const maxTic = Math.max(...Object.values(tics));
  return { words, chapters: chapters.length, wordMeanPerCh: Math.round(wMean), wordSd: Math.round(wSd), pacingCvMean: Number(cvMean.toFixed(3)), pacingCvMin: Number(Math.min(...cvs).toFixed(3)), incipitUnique: headCount.size, incipitClones: clones, incipitWeather: weather, ticsPer1000w: tics, maxTicPer1000w: maxTic };
}

async function main(): Promise<void> {
  const NEW = 'runs/next_book_emp16';
  const newV0 = readFileSync(`${NEW}/MANUSCRIT.md`, 'utf8');
  const knownNames = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Dubois', 'Jean', 'Maryvonne', 'Squarcioni', 'Marchetti', 'Ker-Morvan'];

  /* 1. LE NOTAIRE (5 niveaux) — pas de sceaux : registre book-scoped, livre neuf. */
  const built = await buildCanonical(newV0, { seeds: SEEDS, knownNames });
  if (!built.ok) { console.log('BUILD FAIL: ' + JSON.stringify(built.error).slice(0, 300)); process.exit(1); }
  writeFileSync(`${NEW}/MANUSCRIT_CANONICAL.md`, built.value.text, 'utf8');
  writeFileSync(`${NEW}/SEAM.csv`, built.value.csv.seam, 'utf8');
  writeFileSync(`${NEW}/SEMANTIC.csv`, built.value.csv.semantic, 'utf8');
  const imp = importManuscript(built.value.text);
  if (!imp.ok) throw new Error('import');
  const chapters: Ch[] = imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose }));

  /* 2-5. Batterie EMP-16 + audit Doctor (fonctions réelles, seeds, tics fins). */
  const bNew = battery(chapters, built.value.text);
  const protagonists = imp.value.castProposal.slice(0, 4).map((c) => c.name);
  const audit = runDoctorAudit(imp.value.chapters, protagonists, SEEDS);
  if (!audit.ok) throw new Error('audit');
  const fns = audit.value.arc.chapterFunctions;
  const fnCount: Record<string, number> = {};
  for (const f of fns) fnCount[f.fn] = (fnCount[f.fn] ?? 0) + 1;
  const transRatio = (fnCount['TRANSITION'] ?? 0) / Math.max(1, fns.length);
  const ledger = audit.value.arc.seedLedger;
  const unpaid = ledger.filter((s) => s.payoffChapter === 'UNPAID' || s.plantedChapter === 'ABSENT').map((s) => s.seed);

  /* 7. Cohérence personnages : annotation typée + déficit casting. */
  const reg = new EntityRegistry('next_book_v1');
  const MINTS: ReadonlyArray<Parameters<EntityRegistry['mint']>[0]> = [
    { kind: 'CHARACTER', canonical: 'Léna', aliases: ['Marchetti'] }, { kind: 'CHARACTER', canonical: 'Garcia' },
    { kind: 'CHARACTER', canonical: 'Gaspard' }, { kind: 'CHARACTER', canonical: 'Yvon', aliases: ['Squarcioni'] },
    { kind: 'CHARACTER', canonical: 'Henri', aliases: ['Morel'], vital: 'DEAD' }, { kind: 'CHARACTER', canonical: 'Dubois' },
    { kind: 'CHARACTER', canonical: 'Jean' }, { kind: 'CHARACTER', canonical: 'Maryvonne' },
    { kind: 'PLACE', canonical: 'Ker-Morvan' }, { kind: 'PLACE', canonical: 'mairie' }, { kind: 'PLACE', canonical: 'port' },
    { kind: 'PLACE', canonical: 'église' }, { kind: 'PLACE', canonical: 'cale' }, { kind: 'PLACE', canonical: 'phare' },
    { kind: 'EVENT', canonical: 'naufrage' }, { kind: 'EVENT', canonical: 'dette', aliases: ['dettes'] },
    { kind: 'OBJECT', canonical: 'lettre' }, { kind: 'OBJECT', canonical: 'carnet' }, { kind: 'OBJECT', canonical: 'registre', aliases: ['registres'] },
  ];
  for (const m of MINTS) { const r = reg.mint(m); if (!r.ok) throw new Error(r.error.detail); }
  const ann = annotateMentions(chapters, reg.toAnnotatorEntities());
  const cast = verifyManuscriptIdentities(chapters, reg);
  const residue = scanSemanticResidue(chapters);

  /* 9. ADN Mycelium (hash chaîne d'admissions depuis progress.log). */
  const admissions = [...readFileSync(`${NEW}/progress.log`, 'utf8').matchAll(/hash=([0-9a-f]+)/gu)].map((m) => m[1] ?? '');
  const genome = buildNarrativeGenome({
    title: 'NEXT_BOOK_V1_FULLSTACK_EMP16', chapters,
    cast: imp.value.castProposal, seedLedger: ledger,
    chapterFunctions: fns, tics: audit.value.tics.rows, admissionHashes: admissions,
  });

  /* 10. RÉFÉRENCES : 88k (c8, le grand livre à défauts) + 18k « Le Silence du Phare » (c7). */
  const refText = readFileSync('runs/c8_book60k/MANUSCRIT_V1_FINAL.md', 'utf8');
  const refImp = importManuscript(refText);
  const bRef = refImp.ok ? battery(refImp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })), refText) : {};
  const ref18Text = readFileSync('runs/c7_book/MANUSCRIT.md', 'utf8');
  const ref18Imp = importManuscript(ref18Text);
  const bRef18 = ref18Imp.ok ? battery(ref18Imp.value.chapters.map((c) => ({ chapter: c.chapter, prose: c.prose })), ref18Text) : {};

  const report = {
    run: 'NEXT_BOOK_V1_FULLSTACK_EMP16', date: '2026-06-07',
    canonicalHash: built.value.finalHash, cleanliness: built.value.cleanliness,
    emp16: bNew, reference88k: bRef, reference18k: bRef18,
    dramaticFunctions: { counts: fnCount, transitionRatio: Number(transRatio.toFixed(2)) },
    payoff: { ledger, unpaid },
    characters: ann.ok ? { totalMentions: ann.value.totalMentions, resolvedRate: ann.value.resolvedRate, suspicionsDeadSpeaks: ann.value.suspicions.length, castingDeficit: cast.ok ? cast.value.undefinedMentions.length : -1, deficitTop: cast.ok ? [...cast.value.undefinedMentions].sort((a, b) => b.count - a.count).slice(0, 5) : [] } : {},
    residue: residue.ok ? { brokenComparisons: residue.value.brokenComparisons, functionalRedundancies: residue.value.functionalRedundancies } : {},
    genome: genome.ok ? { genomeHash: genome.value.genomeHash, admissionCount: admissions.length } : { error: 'genome fail' },
  };
  writeFileSync(`${NEW}/EMP16_VERDICT.json`, JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(`${NEW}/VERDICT_HASH.txt`, String(sha256(JSON.stringify(report))), 'utf8');
  console.log(JSON.stringify({ hash: built.value.finalHash.slice(0, 16), clean: built.value.cleanliness, emp16: bNew, fns: fnCount, transRatio: Number(transRatio.toFixed(2)), unpaid, chars: report.characters, residue: report.residue, genome: report.genome, ref88k: { maxTic: (bRef as { maxTicPer1000w?: number }).maxTicPer1000w, clones: (bRef as { incipitClones?: number }).incipitClones, weather: (bRef as { incipitWeather?: number }).incipitWeather, cv: (bRef as { pacingCvMean?: number }).pacingCvMean } }, null, 1));
}
main().catch((e: unknown) => { process.stderr.write(`FATAL ${String(e)}\n`); process.exitCode = 1; });
