// scripts/analyze-ablation-w5c.ts
// Analyse W5c — 100-run baseline W4b — Phase T SEAL candidate
// Usage: npx tsx scripts/analyze-ablation-w5c.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const validationDir = path.join(pkgRoot, 'validation');

// Critères Phase T SEALED (roadmap v6.0)
const CRITERIA = {
  global_seal_min: 50.0,
  e1_seal_min: 30.0,
  e3_seal_min: 28.0,
  composite_mean_min: 93.0,
};

interface ExperimentSummary {
  experiment_id: string;
  total_runs: number;
  sealed_count: number;
  rejected_count: number;
  failed_count: number;
  reject_rate: number;
  mean_s_score_sealed: number;
  mean_corr_14d: number;
  composite_p75?: number;
  summary_hash: string;
  runs?: Array<{
    verdict: string;
    s_score_final?: { composite: number };
    s_score_initial?: { composite: number };
  }>;
}

// Trouver le ValidationPack le plus récent
const packs = fs.readdirSync(validationDir)
  .filter(d => d.startsWith('ValidationPack_') && fs.statSync(path.join(validationDir, d)).isDirectory())
  .map(d => {
    const metaPath = path.join(validationDir, d, 'run-meta.json');
    let date = '1970-01-01T00:00:00.000Z';
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.date) date = meta.date;
      } catch { /* fallback */ }
    }
    return { dir: d, date };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

if (packs.length === 0) {
  console.error('[analyze-w5c] Aucun ValidationPack trouvé. Lancer run-ablation-w5c.ts d\'abord.');
  process.exit(1);
}

const latestPack = packs[0].dir;
const packDir = path.join(validationDir, latestPack);
const reportsDir = path.join(packDir, 'reports');

console.log(`[analyze-w5c] Pack analysé: ${latestPack}`);
console.log('');

// Lire les summaries
const summaries: ExperimentSummary[] = fs.readdirSync(reportsDir)
  .filter(f => f.endsWith('_summary.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(reportsDir, f), 'utf8')));

// Calculer composite_mean sur tous les runs (SEAL + REJECT)
function getCompositeMean(s: ExperimentSummary): number {
  if (!s.runs || s.runs.length === 0) return 0;
  const scores = s.runs.map(r => r.s_score_final?.composite ?? r.s_score_initial?.composite ?? 0);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// Statistiques globales
const totalRuns = summaries.reduce((acc, s) => acc + s.total_runs, 0);
const totalSealed = summaries.reduce((acc, s) => acc + s.sealed_count, 0);
const totalFailed = summaries.reduce((acc, s) => acc + s.failed_count, 0);
const globalSealRate = totalRuns > 0 ? (totalSealed / totalRuns) * 100 : 0;

const e1 = summaries.find(s => s.experiment_id === 'E1_continuity_impossible');
const e2 = summaries.find(s => s.experiment_id === 'E2_non_classifiable');
const e3 = summaries.find(s => s.experiment_id === 'E3_absolute_necessity');

const e1SealRate = e1 ? (e1.sealed_count / e1.total_runs) * 100 : 0;
const e2SealRate = e2 ? (e2.sealed_count / e2.total_runs) * 100 : 0;
const e3SealRate = e3 ? (e3.sealed_count / e3.total_runs) * 100 : 0;

// Composite mean global (tous runs confondus)
const allCompositeMeans = summaries.map(getCompositeMean);
const globalCompositeMean = allCompositeMeans.length > 0
  ? allCompositeMeans.reduce((a, b) => a + b, 0) / allCompositeMeans.length
  : 0;

// Évaluation critères
const criteriaResults = {
  global_seal: { value: globalSealRate, min: CRITERIA.global_seal_min, pass: globalSealRate >= CRITERIA.global_seal_min },
  e1_seal:     { value: e1SealRate,     min: CRITERIA.e1_seal_min,     pass: e1SealRate >= CRITERIA.e1_seal_min },
  e3_seal:     { value: e3SealRate,     min: CRITERIA.e3_seal_min,     pass: e3SealRate >= CRITERIA.e3_seal_min },
  composite:   { value: globalCompositeMean, min: CRITERIA.composite_mean_min, pass: globalCompositeMean >= CRITERIA.composite_mean_min },
};

const allPass = Object.values(criteriaResults).every(c => c.pass);
const passCount = Object.values(criteriaResults).filter(c => c.pass).length;

// ─────────────────────────────────────────────────────────────────────────────
// RAPPORT
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════');
console.log('  W5c — BASELINE 100-RUN VALIDATION — RAPPORT FINAL');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log(`  Pack:         ${latestPack}`);
console.log(`  Total runs:   ${totalRuns} (E1=${e1?.total_runs ?? 0} E2=${e2?.total_runs ?? 0} E3=${e3?.total_runs ?? 0})`);
console.log(`  SEAL total:   ${totalSealed}/${totalRuns}`);
console.log(`  FAIL total:   ${totalFailed}/${totalRuns}`);
console.log('');
console.log('  RÉSULTATS PAR EXPÉRIENCE:');
console.log('  +-----------------------------+-------+------+-------+--------+-----------+');
console.log('  | Expérience                  | Runs  | SEAL | REJ   | SEAL%  | corr_14d  |');
console.log('  +-----------------------------+-------+------+-------+--------+-----------+');
for (const s of summaries) {
  const sealPct = ((s.sealed_count / s.total_runs) * 100).toFixed(1);
  const id = s.experiment_id.replace('E1_continuity_impossible', 'E1_continuity')
                             .replace('E2_non_classifiable', 'E2_non_classif')
                             .replace('E3_absolute_necessity', 'E3_necessity')
                             .padEnd(27);
  const corr = s.mean_corr_14d?.toFixed(3) ?? '—';
  console.log(`  | ${id} | ${String(s.total_runs).padStart(5)} | ${String(s.sealed_count).padStart(4)} | ${String(s.rejected_count).padStart(5)} | ${sealPct.padStart(5)}% | ${corr.padStart(9)} |`);
}
console.log('  +-----------------------------+-------+------+-------+--------+-----------+');
console.log('');
console.log('  CRITÈRES PHASE T SEALED (roadmap v6.0):');
console.log('  +------------------------------+----------+----------+--------+');
console.log('  | Critère                      | Mesuré   | Cible    | Status |');
console.log('  +------------------------------+----------+----------+--------+');
console.log(`  | Global SEAL rate             | ${globalSealRate.toFixed(1).padStart(7)}% | ≥${String(CRITERIA.global_seal_min).padEnd(6)}% | ${criteriaResults.global_seal.pass ? '✅ PASS' : '❌ FAIL'} |`);
console.log(`  | E1 SEAL rate                 | ${e1SealRate.toFixed(1).padStart(7)}% | ≥${String(CRITERIA.e1_seal_min).padEnd(6)}% | ${criteriaResults.e1_seal.pass ? '✅ PASS' : '❌ FAIL'} |`);
console.log(`  | E3 SEAL rate                 | ${e3SealRate.toFixed(1).padStart(7)}% | ≥${String(CRITERIA.e3_seal_min).padEnd(6)}% | ${criteriaResults.e3_seal.pass ? '✅ PASS' : '❌ FAIL'} |`);
console.log(`  | Composite mean (tous runs)   | ${globalCompositeMean.toFixed(2).padStart(8)} | ≥${String(CRITERIA.composite_mean_min).padEnd(6)} | ${criteriaResults.composite.pass ? '✅ PASS' : '❌ FAIL'} |`);
console.log('  +------------------------------+----------+----------+--------+');
console.log('');
console.log(`  CRITÈRES: ${passCount}/4 PASS`);
console.log('');

if (allPass) {
  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log('  ║  VERDICT: PHASE T — SEAL CANDIDATE (4/4 PASS)           ║');
  console.log('  ╚══════════════════════════════════════════════════════════╝');
} else {
  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log(`  ║  VERDICT: PARTIAL (${passCount}/4 PASS) — PHASE T non SEALED   ║`);
  console.log('  ║  → Décision Option B (corr_14d segmenté) requise        ║');
  console.log('  ╚══════════════════════════════════════════════════════════╝');
}

console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// JSON REPORT
// ─────────────────────────────────────────────────────────────────────────────

const report = {
  phase: 'T',
  sprint: 'W5c',
  type: 'BASELINE_100_RUN',
  architecture: 'W4b_one_shot',
  pack: latestPack,
  date: new Date().toISOString(),
  total_runs: totalRuns,
  total_sealed: totalSealed,
  total_failed: totalFailed,
  global_seal_rate: globalSealRate,
  e1_seal_rate: e1SealRate,
  e2_seal_rate: e2SealRate,
  e3_seal_rate: e3SealRate,
  global_composite_mean: globalCompositeMean,
  criteria: criteriaResults,
  criteria_pass_count: passCount,
  verdict: allPass ? 'PHASE_T_SEAL_CANDIDATE' : 'PARTIAL',
  next_action: allPass ? 'SEAL Phase T' : 'Option B — corr_14d segmenté sur branche dédiée',
  experiments: summaries.map(s => ({
    id: s.experiment_id,
    total: s.total_runs,
    sealed: s.sealed_count,
    rejected: s.rejected_count,
    failed: s.failed_count,
    seal_rate: (s.sealed_count / s.total_runs) * 100,
    mean_corr_14d: s.mean_corr_14d,
    composite_p75: s.composite_p75,
    summary_hash: s.summary_hash,
  })),
};

const reportPath = path.join(pkgRoot, 'validation', 'ablation-w5c-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`[analyze-w5c] Rapport JSON écrit: ${reportPath}`);
console.log(`[analyze-w5c] SHA-256 (rapport): run Get-FileHash -Algorithm SHA256 ${reportPath}`);
