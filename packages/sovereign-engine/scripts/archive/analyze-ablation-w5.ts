// scripts/analyze-ablation-w5.ts
// Analyse des runs W5b — delta E1 vs baseline W4b E1 40%
// Usage: npx tsx scripts/analyze-ablation-w5.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const validationDir = path.join(pkgRoot, 'validation');

// Seuil adoption calibrable via env
const ABLATION_ADOPT_DELTA_MIN = parseFloat(process.env.ABLATION_ADOPT_DELTA_MIN ?? '5');

// Baseline W4b E1
const BASELINE_E1_SEAL_RATE = 40.0;

interface ExperimentSummary {
  experiment_id: string;
  total_runs: number;
  sealed_count: number;
  rejected_count: number;
  failed_count: number;
  reject_rate: number;
  mean_s_score_sealed: number;
  mean_corr_14d: number;
  summary_hash: string;
}

// Trouver le dernier ValidationPack
const packs = fs.readdirSync(validationDir)
  .filter(d => d.startsWith('ValidationPack_') && fs.statSync(path.join(validationDir, d)).isDirectory())
  .map(d => {
    const metaPath = path.join(validationDir, d, 'run-meta.json');
    let date = '1970-01-01T00:00:00.000Z';
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.date) date = meta.date;
      } catch { /* fallback to epoch */ }
    }
    return { dir: d, date };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

if (packs.length === 0) {
  console.error('[analyze-w5] Aucun ValidationPack trouve. Lancer ablation:w5 d\'abord.');
  process.exit(1);
}

const latestPack = packs[0].dir;
const packDir = path.join(validationDir, latestPack);
console.log(`[analyze-w5] Pack analyse: ${latestPack}`);
console.log(`[analyze-w5] ABLATION_ADOPT_DELTA_MIN=${ABLATION_ADOPT_DELTA_MIN}`);
console.log('');

// Lire les summaries
const reportsDir = path.join(packDir, 'reports');
const summaries: ExperimentSummary[] = fs.readdirSync(reportsDir)
  .filter(f => f.endsWith('_summary.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(reportsDir, f), 'utf8')));

// Focus E1 only
const e1Summary = summaries.find(s => s.experiment_id === 'E1_continuity_impossible');
const e1SealRate = e1Summary
  ? (e1Summary.sealed_count / e1Summary.total_runs) * 100
  : 0;
const e1Delta = e1SealRate - BASELINE_E1_SEAL_RATE;

// Rapport
console.log('===============================================================');
console.log('  W5b Multi-Prompt E1 — RAPPORT ABLATION');
console.log('===============================================================');
console.log('');
console.log(`  Baseline W4b E1:       ${BASELINE_E1_SEAL_RATE.toFixed(1)}% SEAL rate`);
console.log(`  W5b Multi-Prompt E1:   ${e1SealRate.toFixed(1)}% SEAL rate`);
console.log(`  Delta SEAL rate E1:    ${e1Delta >= 0 ? '+' : ''}${e1Delta.toFixed(1)}%`);
console.log(`  Verdict E1:            ${e1Delta >= ABLATION_ADOPT_DELTA_MIN ? `ADOPTE (delta >= +${ABLATION_ADOPT_DELTA_MIN}%)` : e1Delta >= 0 ? `PARTIEL (delta < +${ABLATION_ADOPT_DELTA_MIN}%)` : 'REJETE (regression)'}`);
console.log('');
console.log('  Resultats par experience:');
console.log('  +----------------------------------+-------+--------+--------+----------+');
console.log('  | Experience                       | Runs  | SEAL   | REJECT | SEAL%    |');
console.log('  +----------------------------------+-------+--------+--------+----------+');
for (const s of summaries) {
  const sealPct = ((s.sealed_count / s.total_runs) * 100).toFixed(1);
  const id = s.experiment_id.padEnd(32);
  console.log(`  | ${id} | ${String(s.total_runs).padStart(5)} | ${String(s.sealed_count).padStart(6)} | ${String(s.rejected_count).padStart(6)} | ${sealPct.padStart(7)}% |`);
}
console.log('  +----------------------------------+-------+--------+--------+----------+');
console.log('');

// Decision ablation
console.log('  Decision W5b Multi-Prompt:');
if (e1Delta >= ABLATION_ADOPT_DELTA_MIN) {
  console.log(`  W5b ADOPTE — delta E1 >= +${ABLATION_ADOPT_DELTA_MIN}% -> multi-prompt valide`);
  console.log('    Action: integrer E1_MULTI_PROMPT=1 comme default pour E1');
} else if (e1Delta >= 0) {
  console.log(`  W5b PARTIEL — delta E1 < +${ABLATION_ADOPT_DELTA_MIN}% -> analyser qualite prose`);
  console.log('    Action: verifier coherence inter-scenes, tension curve adherence');
} else {
  console.log('  W5b REJETE — regression detectee -> rollback multi-prompt');
  console.log('    Action: verifier si multi-prompt degrade la coherence globale');
}
console.log('');

// Ecrire rapport JSON
const report = {
  phase: 'T',
  sprint: 'W5b',
  lot: 'MULTI_PROMPT_E1',
  pack: latestPack,
  date: new Date().toISOString(),
  baseline_e1_seal_rate: BASELINE_E1_SEAL_RATE,
  w5b_e1_seal_rate: e1SealRate,
  delta_e1_seal_rate: e1Delta,
  verdict: e1Delta >= ABLATION_ADOPT_DELTA_MIN ? 'ADOPTE' : e1Delta >= 0 ? 'PARTIEL' : 'REJETE',
  ablation_adopt_delta_min: ABLATION_ADOPT_DELTA_MIN,
  strategy: 'multi-prompt 10 scenes with continuity plan',
  flag: 'E1_MULTI_PROMPT=1',
  experiments: summaries,
};

const reportPath = path.join(pkgRoot, 'validation', 'ablation-w5-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`[analyze-w5] Rapport ecrit: ${reportPath}`);
