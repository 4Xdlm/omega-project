/**
 * OMEGA — BATTERIE D'ATTERRISSAGE NEXT_BOOK_V2 (préparée EN VOL, exécutée à
 * l'atterrissage — interdits tribunal respectés : zéro règle changée en vol).
 * Verdict comparatif V2 vs EMP-16 vs CIBLES (mandat 2/2) + ligne C19.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { appendExperiment } from '../ledger/experiment-ledger.js';
import { buildCanonical } from './build-canonical.js';
import { importManuscript } from '../doctor/manuscript-import.js';
import { runDoctorAudit } from '../doctor/doctor-orchestrator.js';
import { selectorEntropy } from '../control/control-plane.js';
import { sentenceLengths, wassersteinToProfile } from '../v2/v2-conductor.js';

const SEEDS = ['naufrage', 'dette', 'lettre', 'carnet', 'registre'];
const RUN = 'runs/next_book_v2';
const KNOWN = ['Léna', 'Garcia', 'Gaspard', 'Yvon', 'Henri', 'Dubois', 'Jean', 'Maryvonne', 'Squarcioni', 'Marchetti', 'Ker-Morvan', 'Vallet'];

interface Battery {
  readonly words: number; readonly chapters: number;
  readonly incipitUnique: number; readonly incipitClones: number; readonly incipitWeather: number;
  readonly maxTicPer1000w: number; readonly pacingCvMean: number; readonly w1Mean: number;
}

const WEATHER_RE = /^(la pluie|la brume|le vent|la neige|le brouillard|l'orage)/iu;
const TICS = ['le gardien', 'le silence', 'il y a', 'la pluie', 'le village', 'la peur', 'la mer', 'le vent'];

function battery(text: string): Battery {
  const imp = importManuscript(text);
  if (!imp.ok) throw new Error('import battery');
  const chs = imp.value.chapters;
  const words = text.split(/\s+/u).filter((w) => w.length > 0).length;
  const heads = chs.map((c) => c.prose.trim().split(/\s+/u).slice(0, 4).join(' ').toLowerCase());
  const hc = new Map<string, number>();
  for (const h of heads) hc.set(h, (hc.get(h) ?? 0) + 1);
  const cv = (p: string): number => {
    const l = sentenceLengths(p);
    if (l.length < 3) return 0;
    const m = l.reduce((a, b) => a + b, 0) / l.length;
    return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length) / Math.max(1, m);
  };
  const w1s = chs.map((c) => wassersteinToProfile(sentenceLengths(c.prose))).filter((x) => Number.isFinite(x));
  return {
    words, chapters: chs.length,
    incipitUnique: hc.size,
    incipitClones: [...hc.values()].filter((n) => n >= 3).reduce((a, b) => a + b, 0),
    incipitWeather: heads.filter((h) => WEATHER_RE.test(h)).length,
    maxTicPer1000w: Math.max(...TICS.map((t) => (((text.toLowerCase().match(new RegExp(t.replace(/ /gu, '\\s+'), 'gu')) ?? []).length * 1000) / words))),
    pacingCvMean: Number((chs.map((c) => cv(c.prose)).reduce((a, b) => a + b, 0) / Math.max(1, chs.length)).toFixed(3)),
    w1Mean: Number((w1s.reduce((a, b) => a + b, 0) / Math.max(1, w1s.length)).toFixed(3)),
  };
}

async function main(): Promise<void> {
  const v0 = readFileSync(`${RUN}/MANUSCRIT.md`, 'utf8');
  const built = await buildCanonical(v0, { seeds: SEEDS, knownNames: KNOWN });
  if (!built.ok) { console.log(`BUILD FAIL: ${JSON.stringify(built.error).slice(0, 300)}`); process.exit(1); }
  writeFileSync(`${RUN}/MANUSCRIT_CANONICAL.md`, built.value.text, 'utf8');

  const b = battery(built.value.text);
  const bRef = battery(readFileSync('runs/next_book_emp16/MANUSCRIT_CANONICAL.md', 'utf8'));

  const imp = importManuscript(built.value.text);
  if (!imp.ok) throw new Error('import');
  const audit = runDoctorAudit(imp.value.chapters, imp.value.castProposal.slice(0, 4).map((c) => c.name), SEEDS);
  if (!audit.ok) throw new Error('audit');
  const fnCount: Record<string, number> = {};
  for (const f of audit.value.arc.chapterFunctions) fnCount[f.fn] = (fnCount[f.fn] ?? 0) + 1;
  const transRatio = Number(((fnCount['TRANSITION'] ?? 0) / Math.max(1, audit.value.arc.chapterFunctions.length)).toFixed(2));
  const unpaid = audit.value.arc.seedLedger.filter((s) => s.payoffChapter === 'UNPAID').map((s) => s.seed);

  const plan = (JSON.parse(readFileSync('runs/next_book/PLAN_LOCK.json', 'utf8')) as { plan: { fn: string }[] }).plan;
  const plannedRevelations = plan.filter((p) => p.fn === 'REVELATION').length;

  const drift = JSON.parse(readFileSync(`${RUN}/V2_C17_DRIFT_REPORT.json`, 'utf8')) as { control: { driftRate: number; regensRequested: number; acceptedFlagged: number; actBreaches: unknown[] } };
  const c18 = JSON.parse(readFileSync(`${RUN}/V2_C18_DECISIONS.json`, 'utf8')) as { decisions: { c18: string }[] };
  const swaps = c18.decisions.filter((d) => d.c18 === 'SWAPPED').length;
  const winners = [...readFileSync(`${RUN}/progress.log`, 'utf8').matchAll(/winner=([a-z-]+)/gu)].map((m) => m[1] ?? '');

  /* CIBLES mandatées 2/2. */
  const targets = {
    incipitClones0: b.incipitClones === 0,
    weatherLe5: b.incipitWeather <= 5,
    ticLe15: b.maxTicPer1000w <= 1.5,
    transitionLe045: transRatio <= 0.45,
    revelationsGePlan: (fnCount['REVELATION'] ?? 0) >= plannedRevelations,
    semanticResidual0: built.value.cleanliness.detail.semanticResidual === 0,
    narrativeClean: built.value.cleanliness.NARRATIVE_CLEAN,
    seedsAllPaid: unpaid.length === 0,
  };

  const report = {
    run: 'NEXT_BOOK_V2', date: new Date().toISOString().slice(0, 10), planHash: 'df8d650f',
    canonicalHash: built.value.finalHash, cleanliness: built.value.cleanliness,
    v2: b, emp16: bRef,
    delta: {
      incipitClones: `${bRef.incipitClones} -> ${b.incipitClones}`,
      maxTic: `${bRef.maxTicPer1000w.toFixed(2)} -> ${b.maxTicPer1000w.toFixed(2)}`,
      pacingCv: `${bRef.pacingCvMean} -> ${b.pacingCvMean}`,
      w1Rhythm: `${bRef.w1Mean} -> ${b.w1Mean} (PROVISIONAL profile)`,
      transitionRealized: `0.58 -> ${transRatio}`,
      driftRateEmp16Replay: `0.74 -> ${drift.control.driftRate} (V2 runtime)`,
    },
    dramatic: { counts: fnCount, transRatio, plannedRevelations },
    c17: drift.control, c18: { swaps, total: c18.decisions.length },
    selectorEntropy: selectorEntropy(winners).ratio,
    payoff: { unpaid }, targets,
    targetsPass: Object.values(targets).filter(Boolean).length,
  };
  writeFileSync(`${RUN}/V2_VERDICT.json`, JSON.stringify(report, null, 2), 'utf8');

  const led = appendExperiment('../../nexus/proof/EXPERIMENT_LEDGER.json', {
    runId: 'next_book_v2', date: report.date, model: 'gemma4:31b', planHash: 'df8d650f',
    outputHash: built.value.finalHash.slice(0, 16), words: b.words, chapters: b.chapters,
    cleanliness: { SYNTAX: built.value.cleanliness.SYNTAX_CLEAN, SEAM: built.value.cleanliness.SEAM_CLEAN, SEMANTIC: built.value.cleanliness.SEMANTIC_CLEAN, NARRATIVE: built.value.cleanliness.NARRATIVE_CLEAN },
    maxTicPer1000w: Number(b.maxTicPer1000w.toFixed(2)), incipitUnique: b.incipitUnique, incipitClones: b.incipitClones, incipitWeather: b.incipitWeather,
    transitionRatioRealized: transRatio, revelationsRealized: fnCount['REVELATION'] ?? 0,
    pacingCvMean: b.pacingCvMean, selectorEntropyRatio: selectorEntropy(winners).ratio, genomeHash: null,
    failures: Object.entries(targets).filter(([, v]) => !v).map(([k]) => `target_fail:${k}`),
    decisions: [`C18 swaps=${swaps}`, `C17 regens=${drift.control.regensRequested} flagged=${drift.control.acceptedFlagged}`],
  });
  console.log(JSON.stringify({ hash: built.value.finalHash.slice(0, 16), targets, targetsPass: `${report.targetsPass}/8`, delta: report.delta, c19: led.ok ? 'CONSIGNE' : led.error.code }, null, 1));
}

main().catch((e: unknown) => { process.stderr.write(`FATAL ${String(e)}\n`); process.exitCode = 1; });
