/**
 * OMEGA — C19 BACKFILL : les 3 livres scellés deviennent les 3 premières
 * lignes du registre expérimental. Sources : valeurs SCELLÉES uniquement
 * (EMP16_VERDICT.json + rapports canoniques) — null quand la donnée n'existe
 * pas (jamais d'invention : le 18k n'a ni plan ni entropie de sélecteur).
 */

import { readFileSync } from 'node:fs';

import { appendExperiment } from '../ledger/experiment-ledger.js';
import type { ExperimentRow } from '../ledger/experiment-ledger.js';

const LEDGER = '../../nexus/proof/EXPERIMENT_LEDGER.json';
const v = JSON.parse(readFileSync('runs/next_book_emp16/EMP16_VERDICT.json', 'utf8')) as Record<string, never>;
const e = v['emp16'] as Record<string, number>; const r88 = v['reference88k'] as Record<string, number>; const r18 = v['reference18k'] as Record<string, number>;
const clean = (v['cleanliness'] as { SYNTAX_CLEAN: boolean; SEAM_CLEAN: boolean; SEMANTIC_CLEAN: boolean; NARRATIVE_CLEAN: boolean });
const fns = (v['dramaticFunctions'] as { counts: Record<string, number>; transitionRatio: number });

const rows: ExperimentRow[] = [
  {
    runId: 'c7_book_18k_silence', date: '2026-05-30', model: 'gemma4:31b', planHash: null,
    outputHash: 'sha-non-notarise', words: r18['words'] ?? 0, chapters: r18['chapters'] ?? 0,
    cleanliness: { SYNTAX: false, SEAM: false, SEMANTIC: false, NARRATIVE: false },
    maxTicPer1000w: r18['maxTicPer1000w'] ?? 0, incipitUnique: r18['incipitUnique'] ?? 0,
    incipitClones: r18['incipitClones'] ?? 0, incipitWeather: r18['incipitWeather'] ?? 0,
    transitionRatioRealized: null, revelationsRealized: null, pacingCvMean: r18['pacingCvMean'] ?? null,
    selectorEntropyRatio: null, genomeHash: null,
    failures: ['7 têtes d\'incipit uniques sur 30', 'tics 5.47/1000w'], decisions: ['livre pré-tour-de-contrôle — baseline historique'],
  },
  {
    runId: 'c8_book60k_88k', date: '2026-06-06', model: 'gemma4:31b', planHash: null,
    outputHash: '3ce2d56d', words: r88['words'] ?? 0, chapters: r88['chapters'] ?? 0,
    cleanliness: { SYNTAX: true, SEAM: true, SEMANTIC: true, NARRATIVE: false },
    maxTicPer1000w: r88['maxTicPer1000w'] ?? 0, incipitUnique: r88['incipitUnique'] ?? 0,
    incipitClones: r88['incipitClones'] ?? 0, incipitWeather: r88['incipitWeather'] ?? 0,
    transitionRatioRealized: 0.72, revelationsRealized: 0, pacingCvMean: r88['pacingCvMean'] ?? null,
    selectorEntropyRatio: null, genomeHash: null,
    failures: ['48/50 incipits météo', '0 RÉVÉLATION réalisée', 'TRANSITION 72%'], decisions: ['HOLD export (tribunal)', '9 sceaux d\'auteur actifs'],
  },
  {
    runId: 'next_book_emp16', date: '2026-06-07', model: 'gemma4:31b', planHash: 'df8d650f',
    outputHash: String(v['canonicalHash']).slice(0, 16), words: e['words'] ?? 0, chapters: e['chapters'] ?? 0,
    cleanliness: { SYNTAX: clean.SYNTAX_CLEAN, SEAM: clean.SEAM_CLEAN, SEMANTIC: clean.SEMANTIC_CLEAN, NARRATIVE: clean.NARRATIVE_CLEAN },
    maxTicPer1000w: e['maxTicPer1000w'] ?? 0, incipitUnique: e['incipitUnique'] ?? 0,
    incipitClones: e['incipitClones'] ?? 0, incipitWeather: e['incipitWeather'] ?? 0,
    transitionRatioRealized: fns.transitionRatio, revelationsRealized: fns.counts['REVELATION'] ?? 0,
    pacingCvMean: e['pacingCvMean'] ?? null, selectorEntropyRatio: 0.9618, genomeHash: '05b23ef1',
    failures: ['11 incipits clonés', 'driftRate plan→réalisé 0.74'],
    decisions: ['PASS CONDITIONNEL', 'Vallet MINT', 'ch39 KEEP (NCR-PX2-001)', 'clones REPAIR_SYSTEMIC→C18'],
  },
];

for (const row of rows) {
  const r = appendExperiment(LEDGER, row);
  console.log(`${row.runId}: ${r.ok ? 'CONSIGNÉ' : `SKIP (${r.error.code})`}`);
}
