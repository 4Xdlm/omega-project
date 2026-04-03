/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARC-02 — Calibration du ARC Scorer sur corpus existant
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Objectifs :
 * 1. Valider les 3 sous-scores (progression, tension_variance, closure_signal)
 *    sur des données réelles
 * 2. Vérifier la capacité discriminante (bon arc vs mauvais arc)
 * 3. Comparer arc_new (3 sous-scores) vs arc_old (moving average)
 * 4. Ajuster les poids si nécessaire
 *
 * Sources de données :
 * - BLOC7_HYBRID_32 : 32 entrées (4 scènes × 8 runs), 5 axes complets
 * - V5 Bench : 20 entrées (10 scènes × 2 versions), 5 axes complets
 *
 * 0 appel LLM. 100% CALC.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeArcFromScores,
  computeProgression,
  computeTensionVariance,
  computeClosureSignal,
  W_PROGRESSION,
  W_TENSION_VARIANCE,
  W_CLOSURE,
} from '../src/scoring/arc-scorer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = resolve(__dirname, '../sessions');

// ── Types ──
interface SceneScore {
  scene: string;
  run: number;
  composite: number;
  ECC: number;
  RCI: number;
  SII: number;
  IFI: number;
  AAI: number;
  verdict?: string;
  word_count?: number;
  cliff_score?: number;
}

interface BenchScore {
  scene_id: string;
  composite: number;
  ecc: number;
  rci: number;
  sii: number;
  ifi: number;
  aai: number;
  word_count?: number;
}

interface ArcCalibrationResult {
  label: string;
  scores: number[];
  closure_target: number;
  arc_new: {
    progression: number;
    tension_variance: number;
    closure_signal: number;
    arc_composite: number;
  };
  arc_old: number; // simple moving average
  expected_quality: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ── Helpers ──

function movingAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const window = scores.slice(-5);
  return window.reduce((a, b) => a + b, 0) / window.length;
}

function spearman(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;

  function rank(arr: number[]): number[] {
    const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(n);
    for (let i = 0; i < n; i++) {
      ranks[sorted[i].i] = i + 1;
    }
    return ranks;
  }

  const rx = rank(x);
  const ry = rank(y);
  let d2sum = 0;
  for (let i = 0; i < n; i++) {
    d2sum += (rx[i] - ry[i]) ** 2;
  }
  return 1 - (6 * d2sum) / (n * (n * n - 1));
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// ── Data Loading ──

function loadBLOC7(): SceneScore[] {
  const path = resolve(SESSIONS_DIR, 'BLOC7_HYBRID_32/hybrid_data.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadV5Bench(): { v4: BenchScore[]; v5: BenchScore[] } {
  const path = resolve(SESSIONS_DIR, 'v5-bench-2026-04-02T22-28-19.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return {
    v4: data.v4_results.scores,
    v5: data.v5_results.scores,
  };
}

// ── Build Calibration Sequences ──

function buildSequencesFromBLOC7(data: SceneScore[]): ArcCalibrationResult[] {
  const results: ArcCalibrationResult[] = [];
  const scenes = [...new Set(data.map(d => d.scene))];

  for (const scene of scenes) {
    const sceneRuns = data
      .filter(d => d.scene === scene && d.composite > 0) // Exclure les runs ratés (composite=0)
      .sort((a, b) => a.run - b.run);
    if (sceneRuns.length < 2) continue; // Pas assez de données pour un arc
    const composites = sceneRuns.map(r => r.composite);

    // Séquence complète (8 runs)
    const target = 88.0; // LITTERAIRE seal_threshold
    const arc = computeArcFromScores(composites, target);
    const avgComposite = mean(composites);
    const quality: 'HIGH' | 'MEDIUM' | 'LOW' =
      avgComposite >= 88 ? 'HIGH' : avgComposite >= 82 ? 'MEDIUM' : 'LOW';

    results.push({
      label: `BLOC7_${scene}_full`,
      scores: composites,
      closure_target: target,
      arc_new: arc,
      arc_old: movingAverage(composites),
      expected_quality: quality,
    });

    // Sous-séquences : première moitié vs seconde moitié
    if (composites.length >= 4) {
      const first = composites.slice(0, 4);
      const second = composites.slice(4);

      results.push({
        label: `BLOC7_${scene}_first4`,
        scores: first,
        closure_target: target,
        arc_new: computeArcFromScores(first, target),
        arc_old: movingAverage(first),
        expected_quality: mean(first) >= 88 ? 'HIGH' : mean(first) >= 82 ? 'MEDIUM' : 'LOW',
      });

      results.push({
        label: `BLOC7_${scene}_last4`,
        scores: second,
        closure_target: target,
        arc_new: computeArcFromScores(second, target),
        arc_old: movingAverage(second),
        expected_quality: mean(second) >= 88 ? 'HIGH' : mean(second) >= 82 ? 'MEDIUM' : 'LOW',
      });
    }

    // Per-axis arcs (ECC, RCI, SII pour les axes les plus variables)
    for (const axis of ['ECC', 'RCI', 'SII'] as const) {
      const axisScores = sceneRuns.map(r => r[axis]).filter((s): s is number => s != null);
      if (axisScores.length === 0) continue;
      const axisArc = computeArcFromScores(axisScores, target);
      results.push({
        label: `BLOC7_${scene}_${axis}`,
        scores: axisScores,
        closure_target: target,
        arc_new: axisArc,
        arc_old: movingAverage(axisScores),
        expected_quality: mean(axisScores) >= 88 ? 'HIGH' : mean(axisScores) >= 82 ? 'MEDIUM' : 'LOW',
      });
    }
  }

  return results;
}

function buildSequencesFromBench(v4: BenchScore[], v5: BenchScore[]): ArcCalibrationResult[] {
  const results: ArcCalibrationResult[] = [];
  const target = 88.0;

  // V4 arc (all 10 scenes as a quality sequence)
  const v4composites = v4.map(s => s.composite);
  results.push({
    label: 'BENCH_V4_all',
    scores: v4composites,
    closure_target: target,
    arc_new: computeArcFromScores(v4composites, target),
    arc_old: movingAverage(v4composites),
    expected_quality: mean(v4composites) >= 88 ? 'HIGH' : 'MEDIUM',
  });

  // V5 arc
  const v5composites = v5.map(s => s.composite);
  results.push({
    label: 'BENCH_V5_all',
    scores: v5composites,
    closure_target: target,
    arc_new: computeArcFromScores(v5composites, target),
    arc_old: movingAverage(v5composites),
    expected_quality: mean(v5composites) >= 88 ? 'HIGH' : 'MEDIUM',
  });

  // Per-axis arcs for V4 and V5
  for (const version of ['v4', 'v5'] as const) {
    const data = version === 'v4' ? v4 : v5;
    for (const axis of ['ecc', 'rci', 'sii'] as const) {
      const scores = data.map(s => s[axis]);
      results.push({
        label: `BENCH_${version.toUpperCase()}_${axis.toUpperCase()}`,
        scores,
        closure_target: target,
        arc_new: computeArcFromScores(scores, target),
        arc_old: movingAverage(scores),
        expected_quality: mean(scores) >= 88 ? 'HIGH' : mean(scores) >= 82 ? 'MEDIUM' : 'LOW',
      });
    }
  }

  return results;
}

// ── Synthetic Patterns (ground truth) ──

function buildSyntheticPatterns(): ArcCalibrationResult[] {
  const target = 88.0;
  const patterns: { label: string; scores: number[]; expected: 'HIGH' | 'MEDIUM' | 'LOW' }[] = [
    // IDEAL : croissance monotone vers le seuil
    { label: 'SYNTH_ideal_ascending', scores: [82, 84, 86, 88, 91], expected: 'HIGH' },
    // BON : stable au-dessus du seuil
    { label: 'SYNTH_stable_high', scores: [89, 90, 88, 91, 89], expected: 'HIGH' },
    // PLAT MOYEN : stable sous le seuil
    { label: 'SYNTH_flat_medium', scores: [83, 84, 83, 84, 83], expected: 'MEDIUM' },
    // DESCENTE : dégradation
    { label: 'SYNTH_descending', scores: [92, 89, 85, 82, 78], expected: 'LOW' },
    // CHAOTIQUE : pas de tendance
    { label: 'SYNTH_chaotic', scores: [95, 72, 91, 68, 88], expected: 'LOW' },
    // PLAT BAS : uniformément mauvais
    { label: 'SYNTH_flat_low', scores: [72, 73, 71, 72, 73], expected: 'LOW' },
    // V-SHAPE : chute puis remontée
    { label: 'SYNTH_v_shape', scores: [88, 80, 75, 82, 90], expected: 'MEDIUM' },
    // PLATEAU HAUT LONG
    { label: 'SYNTH_plateau_high', scores: [90, 91, 90, 91, 90, 91, 90], expected: 'HIGH' },
    // DÉBUT FORT FIN FAIBLE
    { label: 'SYNTH_strong_start_weak_end', scores: [95, 93, 88, 82, 76], expected: 'LOW' },
    // MONTÉE TARDIVE
    { label: 'SYNTH_late_rise', scores: [78, 79, 80, 88, 93], expected: 'MEDIUM' },
  ];

  return patterns.map(p => ({
    label: p.label,
    scores: p.scores,
    closure_target: target,
    arc_new: computeArcFromScores(p.scores, target),
    arc_old: movingAverage(p.scores),
    expected_quality: p.expected,
  }));
}

// ── Analysis ──

function analyzeDiscriminance(results: ArcCalibrationResult[]): void {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ANALYSE DE DISCRIMINATION ARC');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const byQuality: Record<string, ArcCalibrationResult[]> = { HIGH: [], MEDIUM: [], LOW: [] };
  for (const r of results) {
    byQuality[r.expected_quality].push(r);
  }

  for (const quality of ['HIGH', 'MEDIUM', 'LOW'] as const) {
    const group = byQuality[quality];
    if (group.length === 0) continue;
    const arcs = group.map(g => g.arc_new.arc_composite);
    const olds = group.map(g => g.arc_old);
    console.log(`  ${quality} (n=${group.length}):`);
    console.log(`    arc_new  : mean=${mean(arcs).toFixed(2)}, stdev=${stdev(arcs).toFixed(2)}, range=[${Math.min(...arcs).toFixed(1)}, ${Math.max(...arcs).toFixed(1)}]`);
    console.log(`    arc_old  : mean=${mean(olds).toFixed(2)}, stdev=${stdev(olds).toFixed(2)}, range=[${Math.min(...olds).toFixed(1)}, ${Math.max(...olds).toFixed(1)}]`);
    console.log();
  }

  // Separation test : HIGH vs LOW
  const highArcs = byQuality['HIGH'].map(g => g.arc_new.arc_composite);
  const lowArcs = byQuality['LOW'].map(g => g.arc_new.arc_composite);
  const highOld = byQuality['HIGH'].map(g => g.arc_old);
  const lowOld = byQuality['LOW'].map(g => g.arc_old);

  if (highArcs.length > 0 && lowArcs.length > 0) {
    const sepNew = mean(highArcs) - mean(lowArcs);
    const sepOld = mean(highOld) - mean(lowOld);
    console.log(`  SÉPARATION HIGH-LOW:`);
    console.log(`    arc_new  : delta=${sepNew.toFixed(2)} (mieux = plus grand)`);
    console.log(`    arc_old  : delta=${sepOld.toFixed(2)}`);
    console.log(`    arc_new ${sepNew > sepOld ? '>' : '<'} arc_old → ${sepNew > sepOld ? 'ARC_NEW MEILLEUR DISCRIMINANT' : 'ARC_OLD MEILLEUR DISCRIMINANT'}`);
  }
}

function analyzeCorrelations(results: ArcCalibrationResult[]): void {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  CORRÉLATIONS SPEARMAN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Quality as numeric: HIGH=3, MEDIUM=2, LOW=1
  const qualityMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const qualityNumeric = results.map(r => qualityMap[r.expected_quality]);
  const arcNew = results.map(r => r.arc_new.arc_composite);
  const arcOld = results.map(r => r.arc_old);
  const closureSig = results.map(r => r.arc_new.closure_signal);
  const progSig = results.map(r => r.arc_new.progression);
  const tensionSig = results.map(r => r.arc_new.tension_variance);

  console.log(`  vs Expected Quality (n=${results.length}):`);
  console.log(`    ρ(arc_new, quality)           = ${spearman(arcNew, qualityNumeric).toFixed(4)}`);
  console.log(`    ρ(arc_old, quality)           = ${spearman(arcOld, qualityNumeric).toFixed(4)}`);
  console.log(`    ρ(progression, quality)       = ${spearman(progSig, qualityNumeric).toFixed(4)}`);
  console.log(`    ρ(tension_var, quality)       = ${spearman(tensionSig, qualityNumeric).toFixed(4)}`);
  console.log(`    ρ(closure_signal, quality)    = ${spearman(closureSig, qualityNumeric).toFixed(4)}`);

  // arc_new vs arc_old
  console.log(`\n  arc_new vs arc_old:`);
  console.log(`    ρ(arc_new, arc_old) = ${spearman(arcNew, arcOld).toFixed(4)}`);
}

function analyzeSubScoreDistribution(results: ArcCalibrationResult[]): void {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  DISTRIBUTION DES SOUS-SCORES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const prog = results.map(r => r.arc_new.progression);
  const tens = results.map(r => r.arc_new.tension_variance);
  const clos = results.map(r => r.arc_new.closure_signal);

  console.log(`  progression      : mean=${mean(prog).toFixed(2)}, stdev=${stdev(prog).toFixed(2)}, range=[${Math.min(...prog).toFixed(1)}, ${Math.max(...prog).toFixed(1)}]`);
  console.log(`  tension_variance : mean=${mean(tens).toFixed(2)}, stdev=${stdev(tens).toFixed(2)}, range=[${Math.min(...tens).toFixed(1)}, ${Math.max(...tens).toFixed(1)}]`);
  console.log(`  closure_signal   : mean=${mean(clos).toFixed(2)}, stdev=${stdev(clos).toFixed(2)}, range=[${Math.min(...clos).toFixed(1)}, ${Math.max(...clos).toFixed(1)}]`);

  // Check for degenerate sub-scores
  const degenerateThreshold = 5;
  if (stdev(prog) < degenerateThreshold) console.log(`  ⚠ progression stdev < ${degenerateThreshold} — sous-score DÉGÉNÉRÉ (ne discrimine pas)`);
  if (stdev(tens) < degenerateThreshold) console.log(`  ⚠ tension_variance stdev < ${degenerateThreshold} — sous-score DÉGÉNÉRÉ (ne discrimine pas)`);
  if (stdev(clos) < degenerateThreshold) console.log(`  ⚠ closure_signal stdev < ${degenerateThreshold} — sous-score DÉGÉNÉRÉ (ne discrimine pas)`);
}

function printDetailedResults(results: ArcCalibrationResult[]): void {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  RÉSULTATS DÉTAILLÉS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  Label                              | Q     | ARC_new | ARC_old | Prog  | Tens  | Clos  | Scores');
  console.log('  ─────────────────────────────────────────────────────────────────────────────────────────────────');

  for (const r of results) {
    const scores = r.scores.map(s => (s ?? 0).toFixed(0)).join(',');
    console.log(
      `  ${r.label.padEnd(36)} | ${r.expected_quality.padEnd(5)} | ${r.arc_new.arc_composite.toFixed(1).padStart(7)} | ${r.arc_old.toFixed(1).padStart(7)} | ${r.arc_new.progression.toFixed(1).padStart(5)} | ${r.arc_new.tension_variance.toFixed(1).padStart(5)} | ${r.arc_new.closure_signal.toFixed(1).padStart(5)} | [${scores}]`,
    );
  }
}

// ── Main ──

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ARC-02 CALIBRATION — OMEGA ARC SCORER');
console.log(`  Date: ${new Date().toISOString()}`);
console.log(`  Poids: progression=${W_PROGRESSION}, tension=${W_TENSION_VARIANCE}, closure=${W_CLOSURE}`);
console.log('═══════════════════════════════════════════════════════════════');

// 1. Load data
console.log('\n[LOAD] Chargement des données corpus...');
const bloc7 = loadBLOC7();
console.log(`  BLOC7: ${bloc7.length} entrées`);
const bench = loadV5Bench();
console.log(`  V5 Bench: V4=${bench.v4.length} + V5=${bench.v5.length} entrées`);

// 2. Build sequences
console.log('\n[BUILD] Construction des séquences de calibration...');
const bloc7Sequences = buildSequencesFromBLOC7(bloc7);
const benchSequences = buildSequencesFromBench(bench.v4, bench.v5);
const syntheticSequences = buildSyntheticPatterns();

const allResults = [...bloc7Sequences, ...benchSequences, ...syntheticSequences];
console.log(`  BLOC7 séquences: ${bloc7Sequences.length}`);
console.log(`  Bench séquences: ${benchSequences.length}`);
console.log(`  Synthetic patterns: ${syntheticSequences.length}`);
console.log(`  TOTAL: ${allResults.length}`);

// 3. Print all results
printDetailedResults(allResults);

// 4. Analyze
analyzeSubScoreDistribution(allResults);
analyzeDiscriminance(allResults);
analyzeCorrelations(allResults);

// 5. Verdict
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  VERDICT CALIBRATION ARC-02');
console.log('═══════════════════════════════════════════════════════════════\n');

const qualityMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const qualityNumeric = allResults.map(r => qualityMap[r.expected_quality]);
const arcNewScores = allResults.map(r => r.arc_new.arc_composite);
const arcOldScores = allResults.map(r => r.arc_old);

const rhoNew = spearman(arcNewScores, qualityNumeric);
const rhoOld = spearman(arcOldScores, qualityNumeric);

const highGroup = allResults.filter(r => r.expected_quality === 'HIGH').map(r => r.arc_new.arc_composite);
const lowGroup = allResults.filter(r => r.expected_quality === 'LOW').map(r => r.arc_new.arc_composite);
const separation = highGroup.length > 0 && lowGroup.length > 0 ? mean(highGroup) - mean(lowGroup) : 0;

const pass =
  rhoNew > rhoOld &&      // arc_new corrèle mieux que arc_old
  separation > 5 &&        // séparation HIGH-LOW > 5 points
  rhoNew > 0.3;           // corrélation minimale significative

console.log(`  ρ(arc_new, quality) = ${rhoNew.toFixed(4)}`);
console.log(`  ρ(arc_old, quality) = ${rhoOld.toFixed(4)}`);
console.log(`  Séparation HIGH-LOW = ${separation.toFixed(2)} points`);
console.log(`  arc_new > arc_old   = ${rhoNew > rhoOld ? 'OUI' : 'NON'}`);
console.log();
console.log(`  VERDICT: ${pass ? 'PASS ✓' : 'FAIL ✗'}`);
console.log(`  ${pass ? 'ARC-02 CALIBRATION VALIDÉE — prêt pour ARC-03 (retrait SHADOW)' : 'ARC-02 CALIBRATION INSUFFISANTE — ajustement des poids nécessaire'}`);
