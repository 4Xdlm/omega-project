/**
 * OMEGA — C3 : Re-Score P1 avec MultiStageScorerV2
 * TRIBUNAL D'APPEL — 0 appels API, lecture proses existants
 *
 * Re-score les 9 proses P1 (3 configs × 3 runs) avec V2.
 * Tableau comparatif GB V1 vs MS V2 pour décision moteur.
 *
 * Usage : npx tsx scripts/rescore-p1-v2.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { computeAllGBFeatures, scoreText } from '../src/scoring/gb-scorer.js';
import { MultiStageScorerV2 } from '../src/scoring/multi-stage-scorer-v2.js';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const scorer = new MultiStageScorerV2();
const PROSE_DIR = join('sessions', 'P1_2026-03-24T18-09-28');

const configs = [
  { id: 'FDP_trio_K2',        runs: [1, 2, 3] },
  { id: 'proust_flaubert_K2', runs: [1, 2, 3] },
  { id: 'duras_solo_K2_ctrl', runs: [1, 2, 3] },
];

const allResults: any[] = [];

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  OMEGA — C3 : RE-SCORE P1 AVEC MULTI-STAGE V2');
console.log('  TRIBUNAL D\'APPEL — 0 appels API');
console.log('═══════════════════════════════════════════════════════════════════\n');

for (const config of configs) {
  console.log(`\n${'═'.repeat(65)}`);
  console.log(`  CONFIG : ${config.id}`);
  console.log('═'.repeat(65));

  for (const run of config.runs) {
    const proseFile = join(PROSE_DIR, `${config.id}_r${run}.txt`);
    const prose = readFileSync(proseFile, 'utf-8');

    // 1. GB V1 score
    const gbResult = scoreText(prose);

    // 2. MS V2 score
    const features = computeAllGBFeatures(prose);
    const wordCount = prose.split(/\s+/).length;
    const v2Result = scorer.score(features, { wordCount });

    // Key features
    const f26b   = features['f26b_long_sent_rate'] ?? 0;
    const f1mean = features['f1_mean'] ?? 0;
    const f1var  = features['f1a_rhythm_variance'] ?? 0;
    const ttr    = features['f29d_ttr_score'] ?? 0;

    // Bonuses/penalties triggered
    const bonusRhythm  = v2Result.bonuses.find(b => b.name === 'rhythmic_mastery')?.triggered ?? false;
    const bonusBreath  = v2Result.bonuses.find(b => b.name === 'controlled_breathing')?.triggered ?? false;
    const bonusDepth   = v2Result.bonuses.find(b => b.name === 'narrative_depth')?.triggered ?? false;
    const penaltyKnife = v2Result.penalties.find(p => p.name === 'knife_excess')?.triggered ?? false;

    const result = {
      config: config.id,
      run,
      word_count: wordCount,
      // Scores
      gb_v1: Math.round(gbResult.score * 1000) / 1000,
      v2_raw: v2Result.raw,
      v2_score100: v2Result.score100,
      v2_final: v2Result.final,
      v2_confidence: v2Result.confidence,
      // Key features
      f26b: Math.round(f26b * 1000) / 1000,
      f1_mean: Math.round(f1mean * 10) / 10,
      f1_variance: Math.round(f1var * 10) / 10,
      ttr: Math.round(ttr * 1000) / 1000,
      // Bonuses/penalties
      bonus_rhythmic_mastery: bonusRhythm,
      bonus_controlled_breathing: bonusBreath,
      bonus_narrative_depth: bonusDepth,
      penalty_knife_excess: penaltyKnife,
      // Top V2 contributions (top 5)
      top5_contributions: v2Result.contributions.slice(0, 5).map(c => ({
        feature: c.feature,
        value: c.value,
        contribution: c.contribution,
      })),
    };

    allResults.push(result);

    console.log(`  Run ${run}: GB_V1=${result.gb_v1.toFixed(3)} V2_final=${result.v2_final.toFixed(1)} f26b=${result.f26b.toFixed(3)} f1_mean=${result.f1_mean.toFixed(1)} ttr=${result.ttr.toFixed(3)}`);
    console.log(`           Bonuses: rhythm=${bonusRhythm ? '✅' : '❌'} breath=${bonusBreath ? '✅' : '❌'} depth=${bonusDepth ? '✅' : '❌'} | Penalty knife=${penaltyKnife ? '⚠️' : '✅'}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SYNTHÈSE
// ═══════════════════════════════════════════════════════════════════════

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

console.log('\n\n' + '═'.repeat(75));
console.log('  TRIBUNAL D\'APPEL — GB V1 vs MULTI-STAGE V2');
console.log('═'.repeat(75));
console.log('  Config                   GB_V1  V2_final  f26b    f1_mean   VERDICT V2');
console.log('  ' + '-'.repeat(73));

for (const configId of ['FDP_trio_K2', 'proust_flaubert_K2', 'duras_solo_K2_ctrl']) {
  const runs = allResults.filter(r => r.config === configId);
  const gbMed  = median(runs.map(r => r.gb_v1));
  const v2Med  = median(runs.map(r => r.v2_final));
  const f26bMed = median(runs.map(r => r.f26b));
  const meanMed = median(runs.map(r => r.f1_mean));

  const v2Pass = v2Med >= 45;
  console.log(`  ${configId.padEnd(26)} ${gbMed.toFixed(3)}  ${v2Med.toFixed(1).padStart(8)}  ${f26bMed.toFixed(3)}  ${meanMed.toFixed(1).padStart(7)}w   ${v2Pass ? '✅' : '❌'}`);
}

// Per-run detail table
console.log('\n--- DÉTAIL PAR RUN ---\n');
console.log('  Config                   Run  GB_V1  V2_final  f26b   f1_mean  ttr    rhythm breath depth  knife');
console.log('  ' + '-'.repeat(100));
for (const r of allResults) {
  console.log(`  ${r.config.padEnd(26)} ${r.run}   ${r.gb_v1.toFixed(3)}  ${r.v2_final.toFixed(1).padStart(8)}  ${r.f26b.toFixed(3)}  ${r.f1_mean.toFixed(1).padStart(7)}  ${r.ttr.toFixed(3)}  ${r.bonus_rhythmic_mastery ? '✅' : '❌'}      ${r.bonus_controlled_breathing ? '✅' : '❌'}     ${r.bonus_narrative_depth ? '✅' : '❌'}     ${r.penalty_knife_excess ? '⚠️' : '✅'}`);
}

// Classement comparatif
const fdpGb   = median(allResults.filter(r => r.config === 'FDP_trio_K2').map(r => r.gb_v1));
const pfGb    = median(allResults.filter(r => r.config === 'proust_flaubert_K2').map(r => r.gb_v1));
const durasGb = median(allResults.filter(r => r.config === 'duras_solo_K2_ctrl').map(r => r.gb_v1));

const fdpV2   = median(allResults.filter(r => r.config === 'FDP_trio_K2').map(r => r.v2_final));
const pfV2    = median(allResults.filter(r => r.config === 'proust_flaubert_K2').map(r => r.v2_final));
const durasV2 = median(allResults.filter(r => r.config === 'duras_solo_K2_ctrl').map(r => r.v2_final));

console.log('\n  CLASSEMENT GB V1 :');
const rankGb = [
  { name: 'Duras', score: durasGb },
  { name: 'FDP',   score: fdpGb },
  { name: 'PF',    score: pfGb },
].sort((a, b) => b.score - a.score);
rankGb.forEach((r, i) => console.log(`    #${i+1} ${r.name.padEnd(8)} = ${r.score.toFixed(3)}`));

console.log('\n  CLASSEMENT V2 :');
const rankV2 = [
  { name: 'Duras', score: durasV2 },
  { name: 'FDP',   score: fdpV2 },
  { name: 'PF',    score: pfV2 },
].sort((a, b) => b.score - a.score);
rankV2.forEach((r, i) => console.log(`    #${i+1} ${r.name.padEnd(8)} = ${r.score.toFixed(1)}`));

const rankingChanged = rankGb[0].name !== rankV2[0].name;
console.log(`\n  Classement inversé : ${rankingChanged ? '✅ OUI — biais V1 confirmé par V2' : '❌ NON — même classement'}`);

// Top contributions per config
console.log('\n--- TOP 5 CONTRIBUTIONS V2 (run médian de chaque config) ---\n');
for (const configId of ['FDP_trio_K2', 'proust_flaubert_K2', 'duras_solo_K2_ctrl']) {
  const runs = allResults.filter(r => r.config === configId);
  const v2Scores = runs.map(r => r.v2_final);
  const medV2 = median(v2Scores);
  const medianRun = runs.reduce((best, r) => Math.abs(r.v2_final - medV2) < Math.abs(best.v2_final - medV2) ? r : best);
  console.log(`  ${configId}:`);
  for (const c of medianRun.top5_contributions) {
    console.log(`    ${c.feature.padEnd(30)} val=${c.value.toFixed(3).padStart(7)} contrib=${c.contribution > 0 ? '+' : ''}${c.contribution.toFixed(3)}`);
  }
  console.log('');
}

// Décision moteur
console.log('═'.repeat(75));
console.log('  DÉCISION MOTEUR LONGUE FORME (juge V2)');
console.log('═'.repeat(75));

if (fdpV2 >= pfV2 && fdpV2 >= durasV2 && fdpV2 >= 45) {
  console.log('  → FDP+K2 : ✅ CANDIDAT VALIDÉ (V2) — drift et takeover = problème réel à corriger');
  console.log('     Prochaine étape : redesign FDP (PF base + Duras correcteur externe)');
} else if (pfV2 >= fdpV2 && pfV2 >= 45) {
  console.log('  → proust_flaubert+K2 : ✅ MEILLEUR SCORE V2 — mais CV trop faible pour production');
  console.log('     Prochaine étape : ajouter un correcteur de contraste externe');
} else {
  console.log('  → AUCUN moteur validé par V2 au seuil 45');
  console.log('     Signaler à l\'Architecte pour révision du seuil V2');
}

if (durasV2 < fdpV2 && durasV2 < pfV2) {
  console.log(`\n  → Duras ctrl : V2=${durasV2.toFixed(1)} < FDP et PF → biais GB V1 CONFIRMÉ PAR V2`);
  console.log('     Duras 3000w est un exploit du juge V1, pas une qualité littéraire');
} else if (durasV2 >= fdpV2 || durasV2 >= pfV2) {
  console.log(`\n  → Duras ctrl : V2=${durasV2.toFixed(1)} — reste compétitif même en V2`);
  console.log('     Biais V1 partiellement corrigé mais pas totalement éliminé');
}

// Sauvegarde
const outDir = join('src', 'scoring', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, 'P2_RESCORE_V2_RESULTS.json'),
  JSON.stringify({
    metadata: { test: 'C3_RESCORE_V2', timestamp, source: 'P1_2026-03-24T18-09-28' },
    results: allResults,
    summary: {
      FDP:   { gb_v1_med: fdpGb,   v2_med: fdpV2 },
      PF:    { gb_v1_med: pfGb,    v2_med: pfV2 },
      Duras: { gb_v1_med: durasGb, v2_med: durasV2 },
      ranking_changed: rankingChanged,
    }
  }, null, 2)
);

console.log(`\nSaved: ${join(outDir, 'P2_RESCORE_V2_RESULTS.json')}`);
