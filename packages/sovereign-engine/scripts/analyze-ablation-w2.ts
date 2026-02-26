// scripts/analyze-ablation-w2.ts
// Analyse des 30 runs W2 — delta axe par axe vs baseline W1 (no-lot4)
// Usage: npx tsx scripts/analyze-ablation-w2.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const validationDir = path.join(pkgRoot, 'validation');

// Baseline W1 (no-lot4)
const BASELINE_SEAL_RATE = 40.0;
const AXES = [
  'tension_14d',
  'coherence_emotionnelle',
  'interiorite',
  'impact_ouverture_cloture',
  'densite_sensorielle',
  'necessite_m8',
  'anti_cliche',
  'rythme_musical',
  'signature',
];

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

// Trouver le dernier ValidationPack W2 — déterministe via run-meta.json date
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
  console.error('[analyze-w2] Aucun ValidationPack trouvé. Lancer ablation:w2 d\'abord.');
  process.exit(1);
}

const latestPack = packs[0].dir;
const packDir = path.join(validationDir, latestPack);
console.log(`[analyze-w2] Pack analysé: ${latestPack}`);
console.log('');

// Lire les summaries
const reportsDir = path.join(packDir, 'reports');
const summaries: ExperimentSummary[] = fs.readdirSync(reportsDir)
  .filter(f => f.endsWith('_summary.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(reportsDir, f), 'utf8')));

// Calculer SEAL rate global
const totalRuns = summaries.reduce((s, e) => s + e.total_runs, 0);
const totalSealed = summaries.reduce((s, e) => s + e.sealed_count, 0);
const globalSealRate = totalRuns > 0 ? (totalSealed / totalRuns) * 100 : 0;
const sealRateDelta = globalSealRate - BASELINE_SEAL_RATE;

// Rapport
console.log('═══════════════════════════════════════════════════════');
console.log('  OMEGA Phase T — W2 LOT 2 — RAPPORT ABLATION');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log(`  Baseline W1 (no-lot4): ${BASELINE_SEAL_RATE.toFixed(1)}% SEAL rate`);
console.log(`  W2 LOT 2:              ${globalSealRate.toFixed(1)}% SEAL rate`);
console.log(`  Delta SEAL rate:       ${sealRateDelta >= 0 ? '+' : ''}${sealRateDelta.toFixed(1)}%`);
console.log(`  Verdict:               ${sealRateDelta >= 5 ? 'ADOPTÉ (delta >= +5%)' : sealRateDelta >= 0 ? 'PARTIEL (delta < +5%)' : 'REJETÉ (régression)'}`);
console.log('');
console.log('  Résultats par expérience:');
console.log('  +----------------------------------+-------+--------+--------+----------+');
console.log('  | Expérience                       | Runs  | SEAL   | REJECT | SEAL%    |');
console.log('  +----------------------------------+-------+--------+--------+----------+');
for (const s of summaries) {
  const sealPct = ((s.sealed_count / s.total_runs) * 100).toFixed(1);
  const id = s.experiment_id.padEnd(32);
  console.log(`  | ${id} | ${String(s.total_runs).padStart(5)} | ${String(s.sealed_count).padStart(6)} | ${String(s.rejected_count).padStart(6)} | ${sealPct.padStart(7)}% |`);
}
console.log('  +----------------------------------+-------+--------+--------+----------+');
console.log('');

// Hard gate stats
console.log('  Hard Gate rejections:');
console.log('    INV-SOMA-01 (anatomie générique): vérifier logs forensic');
console.log('    INV-BUDGET-01 (révélation prématurée): vérifier logs forensic');
console.log('');

// Décision ablation
console.log('  Décision LOT 2:');
if (sealRateDelta >= 5) {
  console.log('  LOT 2 ADOPTÉ — delta >= +5% -> passer W3');
} else if (sealRateDelta >= 0) {
  console.log('  LOT 2 PARTIEL — delta < +5% -> analyser hard gates individuellement');
  console.log('    Action: vérifier si soma-gate ou budget-gate trop agressifs');
} else {
  console.log('  LOT 2 REJETÉ — régression détectée -> analyser hard gates');
  console.log('    Action: vérifier taux false-positive soma-gate + budget-gate');
}
console.log('');

// Écrire rapport JSON
const report = {
  phase: 'T',
  sprint: 'W2',
  lot: 'LOT2',
  pack: latestPack,
  date: new Date().toISOString(),
  baseline_seal_rate: BASELINE_SEAL_RATE,
  w2_seal_rate: globalSealRate,
  delta_seal_rate: sealRateDelta,
  verdict: sealRateDelta >= 5 ? 'ADOPTE' : sealRateDelta >= 0 ? 'PARTIEL' : 'REJETE',
  hard_gates: ['INV-SOMA-01', 'INV-BUDGET-01', 'INV-RETEN-01'],
  lot2_instructions: ['LOT2-01', 'LOT2-02', 'LOT2-03'],
  experiments: summaries,
};

const reportPath = path.join(pkgRoot, 'validation', 'ablation-w2-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`[analyze-w2] Rapport écrit: ${reportPath}`);
