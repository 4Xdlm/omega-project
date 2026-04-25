/**
 * compiler/static-analyzer.ts — Instrumentation pré-vol native
 * Sprint P1.1 — V-PARTITION v3.0.0
 *
 * analyzePreFlight() : évalue la qualité de la partition avant appel API.
 * dumpPartition() : produit un dump JSON diffable.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type {
  CompiledPartition,
  CompilerConfig,
  PreFlightReport,
  PartitionDump,
} from './types.js';
import { DEFAULT_COMPILER_CONFIG } from './types.js';

// ── ECC / RCI / SII axis keywords ───────────────────────────────────────────

const ECC_AXES = ['coherence_emotionnelle', 'tension_14d'];
const RCI_AXES = ['rythme_musical', 'anti_cliche', 'signature'];
const SII_AXES = ['densite_sensorielle', 'interiorite', 'necessite_m8'];

// ── PreFlight Analyzer ───────────────────────────────────────────────────────

/**
 * Analyse une partition compilée et produit un rapport pré-vol.
 */
export function analyzePreFlight(
  partition: CompiledPartition,
  config?: Partial<CompilerConfig>,
): PreFlightReport {
  const budgetL1 = config?.budget_l1 ?? DEFAULT_COMPILER_CONFIG.budget_l1;
  const budgetL2 = config?.budget_l2 ?? DEFAULT_COMPILER_CONFIG.budget_l2;
  const budgetL3 = config?.budget_l3 ?? DEFAULT_COMPILER_CONFIG.budget_l3;
  const budgetContract = config?.budget_contract ?? DEFAULT_COMPILER_CONFIG.budget_contract;

  const inst = partition.instrumentation;

  // Densités
  const density_l1 = budgetL1 > 0 ? inst.tokens_by_level.l1 / budgetL1 : 0;
  const density_l2 = budgetL2 > 0 ? inst.tokens_by_level.l2 / budgetL2 : 0;
  const density_l3 = budgetL3 > 0 ? inst.tokens_by_level.l3 / budgetL3 : 0;

  // Scores directs from instrumentation
  const conflict_score = inst.conflict_score;
  const redundancy_score = inst.redundancy_score;

  // Cognitive load
  // base = token saturation (0-50), N2 sacrifices (0.5 each), N3 sacrifices (0.5 each)
  // Conflicts handled separately via conflict_score
  const budgetTotal = budgetL1 + budgetL2 + budgetL3 + budgetContract;
  const n2Sacrifices = inst.sacrificed_elements.filter(s => s.level <= 2).length;
  const n3Sacrifices = inst.sacrificed_elements.filter(s => s.level === 3).length;
  let cognitive_load_score = Math.round(partition.total_tokens / budgetTotal * 50)
    + Math.round(n2Sacrifices * 0.5)
    + Math.round(n3Sacrifices * 0.5);
  cognitive_load_score = Math.min(100, Math.max(0, cognitive_load_score));

  // Risques par axe — based on constraint content targeting
  const l1l2Text = `${partition.level1_laws} ${partition.level2_trajectory}`.toLowerCase();
  const risk_ecc = assessAxisRisk(l1l2Text, ECC_AXES);
  const risk_rci = assessAxisRisk(l1l2Text, RCI_AXES);
  const risk_sii = assessAxisRisk(l1l2Text, SII_AXES);

  // Sacrifices — only N1 sacrifice is critical (N2 sacrifices are expected budget behavior)
  const sacrificed_count = inst.sacrificed_elements.length;
  const sacrificed_critical = inst.sacrificed_elements.some(s => s.level === 1);

  // Verdict
  const warnings: string[] = [...inst.warnings];
  let verdict: 'GREEN' | 'YELLOW' | 'RED';

  if (cognitive_load_score > 70 || conflict_score > 45 || sacrificed_critical) {
    verdict = 'RED';
    if (cognitive_load_score > 70) warnings.push(`cognitive_load=${cognitive_load_score} > 70`);
    if (conflict_score > 45) warnings.push(`conflict_score=${conflict_score} > 45`);
    if (sacrificed_critical) warnings.push('N1 elements sacrificed');
  } else if (
    cognitive_load_score >= 50 ||
    conflict_score >= 35
  ) {
    verdict = 'YELLOW';
  } else {
    verdict = 'GREEN';
  }

  return {
    density_l1,
    density_l2,
    density_l3,
    conflict_score,
    cognitive_load_score,
    redundancy_score,
    risk_ecc,
    risk_rci,
    risk_sii,
    sacrificed_count,
    sacrificed_critical,
    verdict,
    warnings,
  };
}

function assessAxisRisk(
  combinedText: string,
  axisKeywords: string[],
): 'LOW' | 'MEDIUM' | 'HIGH' {
  let hitCount = 0;
  for (const keyword of axisKeywords) {
    // Check if the combined L1+L2 text mentions this axis concept
    if (combinedText.includes(keyword)) {
      hitCount++;
    }
  }

  // Also check for French narrative equivalents
  const frenchHits = countFrenchAxisHits(combinedText, axisKeywords);
  hitCount += frenchHits;

  if (hitCount >= 3) return 'LOW';
  if (hitCount >= 1) return 'MEDIUM';
  return 'HIGH';
}

function countFrenchAxisHits(text: string, axes: string[]): number {
  let count = 0;
  const isECC = axes.includes('coherence_emotionnelle');
  const isRCI = axes.includes('rythme_musical');
  const isSII = axes.includes('densite_sensorielle');

  if (isECC) {
    if (/tension|emotion|quartile|progression/i.test(text)) count++;
    if (/coherence|trajectoire|arc/i.test(text)) count++;
  }
  if (isRCI) {
    if (/rythm|syncope|alternance|cv/i.test(text)) count++;
    if (/clich|interdit|banni/i.test(text)) count++;
  }
  if (isSII) {
    if (/sensor|corps|physique|geste/i.test(text)) count++;
    if (/necessit|densit|interiorit/i.test(text)) count++;
  }

  return count;
}

// ── Partition Dump ───────────────────────────────────────────────────────────

/**
 * Produit un dump JSON sérialisable et diffable de la partition.
 */
export function dumpPartition(
  partition: CompiledPartition,
  config?: Partial<CompilerConfig>,
): PartitionDump {
  const preflight = analyzePreFlight(partition, config);
  return {
    attention_contract: partition.attention_contract,
    level_1: partition.level1_laws,
    level_2: partition.level2_trajectory,
    level_3: partition.level3_decor,
    partition_hash: partition.partition_hash,
    preflight_report: preflight,
  };
}
