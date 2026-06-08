/**
 * OMEGA — FULL WRITER BENCH analyse : compare 4 scribes sur 5 chapitres RÉELS
 * passés par le pipeline complet (C18 + C17 soft + escalade few-shot = Rosetta).
 * Ordre Francky 2026-06-08. Batterie identique au verdict EMP-16/V2 + vitesse.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { buildCanonical } from './build-canonical.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';
import { sentenceLengths, wassersteinToProfile } from '../v2/v2-conductor.js';

const SEEDS = ['naufrage', 'dette', 'lettre', 'carnet', 'registre'];
const TICS = ['le gardien', 'le silence', 'il y a', 'la pluie', 'le village', 'la peur', 'la mer', 'le vent'];
const WEATHER_RE = /^(la pluie|la brume|le vent|la neige|le brouillard|l'orage)/iu;
const KNOWN = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Dubois', 'Jean', 'Maryvonne', 'Squarcioni', 'Marchetti', 'Ker-Morvan', 'Vallet'];

const MODELS = [
  { id: 'mistral-small3.2:24b', dir: 'runs/fwb_mistral32' },
  { id: 'mistral-small:24b', dir: 'runs/fwb_mistralsmall' },
  { id: 'qwen3:30b', dir: 'runs/fwb_qwen330' },
  { id: 'qwen3:32b', dir: 'runs/fwb_qwen3' },
  { id: 'deepseek-r1:32b', dir: 'runs/fwb_deepseek' },
  { id: 'gemma4:31b', dir: 'runs/fwb_gemma4' },
  { id: 'llama3.3:70b', dir: 'runs/fwb_llama33' },
];

async function analyzeModel(id: string, dir: string): Promise<Record<string, unknown> | null> {
  if (!existsSync(`${dir}/MANUSCRIT.md`)) return null;
  const v0 = readFileSync(`${dir}/MANUSCRIT.md`, 'utf8');
  const built = await buildCanonical(v0, { seeds: SEEDS, knownNames: KNOWN });
  if (!built.ok) return { model: id, error: JSON.stringify(built.error).slice(0, 200) };
  const text = built.value.text;
  const imp = importManuscript(text);
  if (!imp.ok) return { model: id, error: 'import' };
  const chs = imp.value.chapters;
  const words = text.split(/\s+/u).filter((w) => w.length > 0).length;
  const audit = runDoctorAudit(chs, imp.value.castProposal.slice(0, 4).map((c) => c.name), SEEDS);
  const fnCount: Record<string, number> = {};
  if (audit.ok) for (const f of audit.value.arc.chapterFunctions) fnCount[f.fn] = (fnCount[f.fn] ?? 0) + 1;
  const heads = chs.map((c) => c.prose.trim().split(/\s+/u).slice(0, 4).join(' ').toLowerCase());
  const hc = new Map<string, number>(); for (const h of heads) hc.set(h, (hc.get(h) ?? 0) + 1);
  const cvs = chs.map((c) => { const l = sentenceLengths(c.prose); if (l.length < 3) return 0; const m = l.reduce((a, b) => a + b, 0) / l.length; return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length) / Math.max(1, m); });
  const w1s = chs.map((c) => wassersteinToProfile(sentenceLengths(c.prose))).filter((x) => Number.isFinite(x));
  /* drift + regens depuis le rapport C17 si présent. */
  let drift: Record<string, unknown> = {};
  if (existsSync(`${dir}/V2_C17_DRIFT_REPORT.json`)) {
    const d = JSON.parse(readFileSync(`${dir}/V2_C17_DRIFT_REPORT.json`, 'utf8')) as { control: { driftRate: number; regensRequested: number; acceptedFlagged: number } };
    drift = { driftRate: d.control.driftRate, regens: d.control.regensRequested, flagged: d.control.acceptedFlagged };
  }
  return {
    model: id, hash: built.value.finalHash.slice(0, 12), chapters: chs.length, words,
    wordsPerCh: Math.round(words / Math.max(1, chs.length)),
    cleanliness: { SYNTAX: built.value.cleanliness.SYNTAX_CLEAN, SEAM: built.value.cleanliness.SEAM_CLEAN, SEMANTIC: built.value.cleanliness.SEMANTIC_CLEAN, NARRATIVE: built.value.cleanliness.NARRATIVE_CLEAN },
    semanticResidual: built.value.cleanliness.detail.semanticResidual,
    maxTicPer1000w: Number(Math.max(...TICS.map((t) => (((text.toLowerCase().match(new RegExp(t.replace(/ /gu, '\\s+'), 'gu')) ?? []).length * 1000) / words))).toFixed(2)),
    incipitUnique: hc.size, incipitClones: [...hc.values()].filter((n) => n >= 3).reduce((a, b) => a + b, 0),
    incipitWeather: heads.filter((h) => WEATHER_RE.test(h)).length,
    dramaticFns: fnCount,
    dramaticHard: (fnCount['REVELATION'] ?? 0) + (fnCount['CONFRONTATION'] ?? 0),
    pacingCvMean: Number((cvs.reduce((a, b) => a + b, 0) / Math.max(1, cvs.length)).toFixed(3)),
    w1Mean: Number((w1s.reduce((a, b) => a + b, 0) / Math.max(1, w1s.length)).toFixed(2)),
    ...drift,
  };
}

async function main(): Promise<void> {
  const rows = (await Promise.all(MODELS.map((m) => analyzeModel(m.id, m.dir)))).filter((r): r is Record<string, unknown> => r !== null);
  /* Classement : drame dur d'abord, puis propreté (tics bas + semantic 0), puis rythme. */
  const ranked = [...rows].filter((r) => r['error'] === undefined).sort((a, b) =>
    (b['dramaticHard'] as number) - (a['dramaticHard'] as number)
    || (a['maxTicPer1000w'] as number) - (b['maxTicPer1000w'] as number)
    || (a['incipitClones'] as number) - (b['incipitClones'] as number),
  );
  const out = {
    bench: 'FULL_WRITER_BENCH', date: new Date().toISOString().slice(0, 10),
    note: 'Ordre Francky : 4 scribes x 5 chapitres, pipeline complet (C18+C17 soft+escalade few-shot). Batterie EMP-16. EMP-19 : chaque modele = couple distinct ; adoption production = decision Architecte.',
    rows, ranked: ranked.map((r) => r['model']), best: ranked[0]?.['model'] ?? null,
  };
  writeFileSync('runs/FULL_WRITER_BENCH_VERDICT.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 1));
}

main().catch((e: unknown) => { process.stderr.write(`FATAL ${String(e)}\n`); process.exitCode = 1; });
