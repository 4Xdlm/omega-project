/**
 * OMEGA Forge — Forge Profile
 * Phase C.5 — Multidimensional profile (strengths/weaknesses)
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  ForgeProfile, ForgeScore,
  TrajectoryAnalysis, LawComplianceReport, QualityEnvelope,
} from '../types.js';

/** Build a forge profile from analysis results */
export function buildForgeProfile(
  score: ForgeScore,
  trajectory: TrajectoryAnalysis,
  laws: LawComplianceReport,
  quality: QualityEnvelope,
): ForgeProfile {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (trajectory.compliant_ratio >= 0.8) {
    strengths.push('Strong trajectory compliance');
  } else {
    weaknesses.push('Trajectory deviates from prescribed emotion curve');
  }

  if (laws.overall_compliance >= 0.8) {
    strengths.push('High law compliance');
  } else {
    weaknesses.push('Multiple law violations detected');
  }

  if (laws.forced_transitions === 0) {
    strengths.push('No forced transitions');
  } else {
    weaknesses.push(`${laws.forced_transitions} forced transition(s) without narrative justification`);
  }

  if (laws.law5_compliant) {
    strengths.push('Flux conservation verified');
  } else {
    weaknesses.push('Flux conservation violated');
  }

  const m = quality.metrics;
  if (m.M1_contradiction_rate === 0) {
    strengths.push('Zero canon contradictions');
  } else {
    weaknesses.push('Canon contradictions found');
  }

  if (m.M2_canon_compliance >= 0.9) {
    strengths.push('High canon coverage');
  } else {
    weaknesses.push('Low canon compliance');
  }

  if (m.M6_style_emergence >= 0.7) {
    strengths.push('Strong style emergence');
  } else {
    weaknesses.push('Style appears imposed rather than emergent');
  }

  if (m.M8_sentence_necessity >= 0.95) {
    strengths.push('High sentence necessity');
  } else {
    weaknesses.push('Some sentences may be redundant');
  }

  const hashInput = {
    composite: score.composite,
    traj: trajectory.compliant_ratio,
    law: laws.overall_compliance,
    qual: quality.quality_score,
  };

  return {
    score,
    trajectory_compliance: trajectory.compliant_ratio,
    law_compliance: laws.overall_compliance,
    canon_compliance: m.M2_canon_compliance,
    necessity_score: m.M8_sentence_necessity,
    style_emergence: m.M6_style_emergence,
    strengths,
    weaknesses,
    profile_hash: sha256(canonicalize(hashInput)),
  };
}
