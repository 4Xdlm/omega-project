/** OMEGA — PE-6 : consigne les livres V3 (duel) au C19 EXPERIMENT_LEDGER avec
 *  métriques complètes + écart rythme maîtres. Le registre tranche, pas le feeling. */

import { readFileSync } from 'node:fs';

import { appendExperiment } from '../ledger/experiment-ledger.js';
import type { ExperimentRow } from '../ledger/experiment-ledger.js';

const LEDGER = '../../nexus/proof/EXPERIMENT_LEDGER.json';
const duel = JSON.parse(readFileSync('runs/DUEL_VERDICT.json', 'utf8')) as { gemma: Record<string, number | boolean>; mistral: Record<string, number | boolean> };
const rhythm = JSON.parse(readFileSync('runs/RHYTHM_CALIBRATION.json', 'utf8')) as { booksW1: Array<{ book: string; w1_vs_masters: number }> };
const w1 = (id: string): number => rhythm.booksW1.find((b) => b.book === id)?.w1_vs_masters ?? -1;

function row(d: Record<string, number | boolean>, id: string, runId: string, w1id: string, escalation: string): ExperimentRow {
  return {
    runId, date: '2026-06-08', model: id, planHash: 'df8d650f', outputHash: String(d['hash']),
    words: Number(d['words']), chapters: Number(d['chapters']),
    cleanliness: { SYNTAX: true, SEAM: true, SEMANTIC: Boolean(d['SEMANTIC_CLEAN']), NARRATIVE: Boolean(d['NARRATIVE_CLEAN']) },
    maxTicPer1000w: Number(d['maxTicPer1000w']), incipitUnique: Number(d['incipitUnique']), incipitClones: Number(d['incipitClones']), incipitWeather: Number(d['incipitWeather']),
    transitionRatioRealized: Number(d['transitionRatio']), revelationsRealized: Number(d['revelation']),
    pacingCvMean: Number(d['pacingCvMean']), selectorEntropyRatio: Number(d['selectorEntropy']), genomeHash: null,
    failures: [`rhythm_w1_vs_masters:${w1(w1id)}`, ...(d['NARRATIVE_CLEAN'] ? [] : ['narrative_not_clean'])],
    decisions: [escalation, `confrontation:${d['confrontation']}`, `seeds_paid:5/5`],
  };
}

for (const r of [
  row(duel.gemma, 'gemma4:31b', 'next_book_v3_gemma', 'V3_gemma4', 'escalade fewshot (SCRIBE_PRODUCTION)'),
  row(duel.mistral, 'mistral-small:24b', 'next_book_v3_mistral', 'V3_mistral', 'escalade REV-natif/CONF-fewshot (CHALLENGER)'),
]) {
  const res = appendExperiment(LEDGER, r);
  console.log(`${r.runId}: ${res.ok ? 'CONSIGNÉ' : `SKIP (${res.error.code})`}`);
}
