/**
 * OMEGA — VERDICT DUEL : gemma4 (fewshot) vs mistral-small (REV-natif/CONF-fewshot),
 * 2 livres 50 chap, MÊME PLAN_LOCK, chacun avec SA config calibrée (plan Francky).
 * Batterie EMP-16 complète + fonctions dramatiques réalisées + drift C17.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

import { buildCanonical } from './build-canonical.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';
import { sentenceLengths } from '../v2/v2-conductor.js';

const SEEDS = ['naufrage', 'dette', 'lettre', 'carnet', 'registre'];
const TICS = ['le gardien', 'le silence', 'il y a', 'la pluie', 'le village', 'la peur', 'la mer', 'le vent'];
const WEATHER_RE = /^(la pluie|la brume|le vent|la neige|le brouillard|l'orage)/iu;
const KNOWN = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Dubois', 'Jean', 'Maryvonne', 'Squarcioni', 'Marchetti', 'Ker-Morvan', 'Vallet'];

async function battery(dir: string, model: string): Promise<Record<string, unknown>> {
  const v0 = readFileSync(`${dir}/MANUSCRIT.md`, 'utf8');
  const built = await buildCanonical(v0, { seeds: SEEDS, knownNames: KNOWN });
  if (!built.ok) return { model, error: JSON.stringify(built.error).slice(0, 200) };
  const text = built.value.text;
  const imp = importManuscript(text);
  if (!imp.ok) return { model, error: 'import' };
  const chs = imp.value.chapters;
  const words = text.split(/\s+/u).filter((w) => w.length > 0).length;
  const audit = runDoctorAudit(chs, imp.value.castProposal.slice(0, 4).map((c) => c.name), SEEDS);
  const fn: Record<string, number> = {};
  const ledgerUnpaid: string[] = [];
  if (audit.ok) {
    for (const f of audit.value.arc.chapterFunctions) fn[f.fn] = (fn[f.fn] ?? 0) + 1;
    for (const s of audit.value.arc.seedLedger) if (s.payoffChapter === 'UNPAID') ledgerUnpaid.push(s.seed);
  }
  const heads = chs.map((c) => c.prose.trim().split(/\s+/u).slice(0, 4).join(' ').toLowerCase());
  const hc = new Map<string, number>(); for (const h of heads) hc.set(h, (hc.get(h) ?? 0) + 1);
  const cvs = chs.map((c) => { const l = sentenceLengths(c.prose); if (l.length < 3) return 0; const m = l.reduce((a, b) => a + b, 0) / l.length; return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length) / Math.max(1, m); });
  let drift: Record<string, unknown> = {};
  if (existsSync(`${dir}/V2_C17_DRIFT_REPORT.json`)) {
    const d = JSON.parse(readFileSync(`${dir}/V2_C17_DRIFT_REPORT.json`, 'utf8')) as { control: { driftRate: number; regensRequested: number; acceptedFlagged: number; actBreaches: unknown[] }; selectorEntropy?: { ratio: number } };
    drift = { driftRate: d.control.driftRate, regens: d.control.regensRequested, flagged: d.control.acceptedFlagged, actBreaches: d.control.actBreaches.length, selectorEntropy: d.selectorEntropy?.ratio ?? null };
  }
  return {
    model, hash: built.value.finalHash.slice(0, 12), chapters: chs.length, words, wordsPerCh: Math.round(words / Math.max(1, chs.length)),
    NARRATIVE_CLEAN: built.value.cleanliness.NARRATIVE_CLEAN, SEMANTIC_CLEAN: built.value.cleanliness.SEMANTIC_CLEAN,
    semanticResidual: built.value.cleanliness.detail.semanticResidual,
    maxTicPer1000w: Number(Math.max(...TICS.map((t) => (((text.toLowerCase().match(new RegExp(t.replace(/ /gu, '\\s+'), 'gu')) ?? []).length * 1000) / words))).toFixed(2)),
    incipitUnique: hc.size, incipitClones: [...hc.values()].filter((n) => n >= 3).reduce((a, b) => a + b, 0), incipitWeather: heads.filter((h) => WEATHER_RE.test(h)).length,
    revelation: fn['REVELATION'] ?? 0, confrontation: fn['CONFRONTATION'] ?? 0, action: fn['ACTION'] ?? 0, transition: fn['TRANSITION'] ?? 0,
    transitionRatio: Number(((fn['TRANSITION'] ?? 0) / Math.max(1, chs.length)).toFixed(2)),
    seedsUnpaid: ledgerUnpaid, pacingCvMean: Number((cvs.reduce((a, b) => a + b, 0) / Math.max(1, cvs.length)).toFixed(3)),
    ...drift,
  };
}

async function main(): Promise<void> {
  const gemma = await battery('runs/duel_gemma', 'gemma4:31b');
  const mistral = await battery('runs/duel_mistral', 'mistral-small:24b');
  const out = { duel: 'SCRIBE_DUEL', date: '2026-06-08', plan: 'df8d650f (identique aux 2)', gemma, mistral };
  writeFileSync('runs/DUEL_VERDICT.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e: unknown) => { process.stderr.write(`FATAL ${String(e)}\n`); process.exitCode = 1; });
