/**
 * OMEGA Governance — Drift Detector
 * Phase D.2 — Detect 3 types of drift: FUNCTIONAL, QUALITATIVE, STRUCTURAL
 *
 * INV-GOV-04: Every drift has a classification with rule cited.
 */

import type { GovConfig } from '../core/config.js';
import type { ProofPackData } from '../core/types.js';
import type { DriftReport, DriftDetail } from './types.js';
import { classifyNumericDrift, classifyHashDrift, classifyStructuralDrift } from './rules.js';
import { classifyOverallDrift } from './classifier.js';

/** M-score keys for iteration */
const M_KEYS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'] as const;

/** Detect all drift between a baseline and candidate ProofPack */
export function detectDrift(
  baseline: ProofPackData,
  candidate: ProofPackData,
  config: GovConfig,
): DriftReport {
  const details: DriftDetail[] = [];

  details.push(...detectFunctionalDrift(baseline, candidate));
  details.push(...detectQualitativeDrift(baseline, candidate, config));
  details.push(...detectStructuralDrift(baseline, candidate));

  const nonZeroDrifts = details.filter((d) => d.rule !== 'hashes identical' && d.rule !== 'structure identical' && !d.rule.includes('< DRIFT_SOFT'));
  const { level, types, verdict } = classifyOverallDrift(nonZeroDrifts);

  return {
    baseline: baseline.runId,
    candidate: candidate.runId,
    level,
    types,
    details,
    verdict,
    config,
  };
}

/** Detect FUNCTIONAL drift (artifact hash differences) */
function detectFunctionalDrift(
  baseline: ProofPackData,
  candidate: ProofPackData,
): DriftDetail[] {
  const details: DriftDetail[] = [];

  const baselineMap = new Map(baseline.manifest.artifacts.map((a) => [a.path, a.sha256]));
  const candidateMap = new Map(candidate.manifest.artifacts.map((a) => [a.path, a.sha256]));

  const allPaths = new Set([...baselineMap.keys(), ...candidateMap.keys()]);

  for (const path of [...allPaths].sort()) {
    const bHash = baselineMap.get(path);
    const cHash = candidateMap.get(path);

    if (bHash && cHash) {
      const { rule } = classifyHashDrift(bHash, cHash);
      if (bHash !== cHash) {
        details.push({
          type: 'FUNCTIONAL',
          path,
          baseline_value: bHash,
          candidate_value: cHash,
          rule,
        });
      }
    } else if (bHash && !cHash) {
      details.push({
        type: 'FUNCTIONAL',
        path,
        baseline_value: bHash,
        candidate_value: 'MISSING',
        rule: 'artifact missing in candidate (functional drift)',
      });
    } else if (!bHash && cHash) {
      details.push({
        type: 'FUNCTIONAL',
        path,
        baseline_value: 'MISSING',
        candidate_value: cHash,
        rule: 'artifact missing in baseline (functional drift)',
      });
    }
  }

  return details;
}

/** Detect QUALITATIVE drift (score differences) */
function detectQualitativeDrift(
  baseline: ProofPackData,
  candidate: ProofPackData,
  config: GovConfig,
): DriftDetail[] {
  const details: DriftDetail[] = [];

  if (!baseline.forgeReport || !candidate.forgeReport) {
    return details;
  }

  const bm = baseline.forgeReport.metrics;
  const cm = candidate.forgeReport.metrics;

  const scorePairs: Array<{ path: string; bVal: number; cVal: number }> = [
    { path: 'metrics.composite_score', bVal: bm.composite_score, cVal: cm.composite_score },
    { path: 'metrics.emotion_score', bVal: bm.emotion_score, cVal: cm.emotion_score },
    { path: 'metrics.quality_score', bVal: bm.quality_score, cVal: cm.quality_score },
  ];

  for (const key of M_KEYS) {
    scorePairs.push({ path: `metrics.${key}`, bVal: bm[key], cVal: cm[key] });
  }

  for (const { path, bVal, cVal } of scorePairs) {
    const delta = cVal - bVal;
    if (delta !== 0) {
      const { rule } = classifyNumericDrift(delta, config);
      details.push({
        type: 'QUALITATIVE',
        path,
        baseline_value: bVal.toString(),
        candidate_value: cVal.toString(),
        delta,
        rule,
      });
    }
  }

  return details;
}

/** Detect STRUCTURAL drift (manifest structure) */
function detectStructuralDrift(
  baseline: ProofPackData,
  candidate: ProofPackData,
): DriftDetail[] {
  const details: DriftDetail[] = [];

  const { level, rule } = classifyStructuralDrift(
    baseline.manifest.merkle_root,
    candidate.manifest.merkle_root,
    baseline.manifest.stages_completed.length,
    candidate.manifest.stages_completed.length,
  );

  if (level !== 'NO_DRIFT') {
    details.push({
      type: 'STRUCTURAL',
      path: 'manifest.merkle_root',
      baseline_value: baseline.manifest.merkle_root,
      candidate_value: candidate.manifest.merkle_root,
      rule,
    });
  }

  if (baseline.manifest.verdict !== candidate.manifest.verdict) {
    details.push({
      type: 'STRUCTURAL',
      path: 'manifest.verdict',
      baseline_value: baseline.manifest.verdict,
      candidate_value: candidate.manifest.verdict,
      rule: 'verdict changed (structural drift)',
    });
  }

  return details;
}
