// scripts/analyze-ablation-w3.ts
// Analyse des 30 runs W3a — delta axe par axe vs baseline W2
// Usage: npx tsx scripts/analyze-ablation-w3.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const validationDir = path.join(pkgRoot, 'validation');

// Seuil adoption calibrable via env (R7 — no magic constant)
const ABLATION_ADOPT_DELTA_MIN = parseFloat(process.env.ABLATION_ADOPT_DELTA_MIN ?? '5');

// Baseline W2
const BASELINE_SEAL_RATE = 46.7;

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

// Trouver le dernier ValidationPack — déterministe via run-meta.json date
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
  console.error('[analyze-w3] Aucun ValidationPack trouvé. Lancer ablation:w3 d\'abord.');
  process.exit(1);
}

const latestPack = packs[0].dir;
const packDir = path.join(validationDir, latestPack);
console.log(`[analyze-w3] Pack analysé: ${latestPack}`);
console.log(`[analyze-w3] ABLATION_ADOPT_DELTA_MIN=${ABLATION_ADOPT_DELTA_MIN}`);
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
console.log('  OMEGA Phase T — W3a GENESIS v2 — RAPPORT ABLATION');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log(`  Baseline W2:           ${BASELINE_SEAL_RATE.toFixed(1)}% SEAL rate`);
console.log(`  W3a GENESIS v2:        ${globalSealRate.toFixed(1)}% SEAL rate`);
console.log(`  Delta SEAL rate:       ${sealRateDelta >= 0 ? '+' : ''}${sealRateDelta.toFixed(1)}%`);
console.log(`  Verdict:               ${sealRateDelta >= ABLATION_ADOPT_DELTA_MIN ? `ADOPTÉ (delta >= +${ABLATION_ADOPT_DELTA_MIN}%)` : sealRateDelta >= 0 ? `PARTIEL (delta < +${ABLATION_ADOPT_DELTA_MIN}%)` : 'REJETÉ (régression)'}`);
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
console.log('    INV-PARADOX-01/02/03 (forbidden lexicon / metaphor / anchor): vérifier logs');
console.log('    INV-SOMA-01 (anatomie générique): vérifier logs forensic');
console.log('    INV-BUDGET-01 (révélation prématurée): vérifier logs forensic');
console.log('');

// Décision ablation
console.log('  Décision W3a GENESIS v2:');
if (sealRateDelta >= ABLATION_ADOPT_DELTA_MIN) {
  console.log(`  GENESIS v2 ADOPTÉ — delta >= +${ABLATION_ADOPT_DELTA_MIN}% -> activer Diffusion W3b`);
} else if (sealRateDelta >= 0) {
  console.log(`  GENESIS v2 PARTIEL — delta < +${ABLATION_ADOPT_DELTA_MIN}% -> analyser paradox gate false-positive`);
  console.log('    Action: vérifier si paradox gate trop agressif (forbidden_lexicon trop large)');
} else {
  console.log('  GENESIS v2 REJETÉ — régression détectée -> analyser hard gates');
  console.log('    Action: vérifier taux false-positive paradox + soma + budget gates');
}
console.log('');

// Écrire rapport JSON
const report = {
  phase: 'T',
  sprint: 'W3a',
  lot: 'LOT3',
  pack: latestPack,
  date: new Date().toISOString(),
  baseline_seal_rate: BASELINE_SEAL_RATE,
  w3a_seal_rate: globalSealRate,
  delta_seal_rate: sealRateDelta,
  verdict: sealRateDelta >= ABLATION_ADOPT_DELTA_MIN ? 'ADOPTE' : sealRateDelta >= 0 ? 'PARTIEL' : 'REJETE',
  ablation_adopt_delta_min: ABLATION_ADOPT_DELTA_MIN,
  genesis_v2: true,
  hard_gates: ['INV-PARADOX-01', 'INV-PARADOX-02', 'INV-PARADOX-03', 'INV-SOMA-01', 'INV-BUDGET-01'],
  lot3_instructions: ['LOT3-01', 'LOT3-02', 'LOT3-03', 'LOT3-04'],
  experiments: summaries,
};

const reportPath = path.join(pkgRoot, 'validation', 'ablation-w3-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`[analyze-w3] Rapport écrit: ${reportPath}`);
