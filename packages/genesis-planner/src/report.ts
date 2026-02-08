/**
 * OMEGA Genesis Planner — Deterministic Report Generator
 * Phase C.1 — Produces verifiable report with metrics and evidence.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  GenesisPlan, ValidationResult, GEvidenceChain, GConfig,
  GenesisReport, GenesisMetrics, Scene, ConflictType,
} from './types.js';

function computeMetrics(plan: GenesisPlan): GenesisMetrics {
  const allScenes: Scene[] = [];
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      allScenes.push(scene);
    }
  }

  const totalBeats = allScenes.reduce((sum, s) => sum + s.beats.length, 0);
  const avgBeats = allScenes.length > 0 ? totalBeats / allScenes.length : 0;

  const conflictTypes = new Set<ConflictType>();
  for (const scene of allScenes) {
    conflictTypes.add(scene.conflict_type);
  }

  const subtextCoverage = allScenes.length > 0
    ? allScenes.filter((s) =>
      s.subtext &&
      s.subtext.character_thinks.trim() !== '' &&
      s.subtext.character_thinks !== '__pending__' &&
      s.subtext.implied_emotion.trim() !== '' &&
      s.subtext.implied_emotion !== '__pending__'
    ).length / allScenes.length
    : 0;

  const emotionCoverage = allScenes.length > 0
    ? plan.emotion_trajectory.length / allScenes.length
    : 0;

  return {
    arc_count: plan.arcs.length,
    scene_count: allScenes.length,
    beat_count: totalBeats,
    seed_count: plan.seed_registry.length,
    tension_curve_length: plan.tension_curve.length,
    emotion_coverage_percent: Math.round(emotionCoverage * 100) / 100,
    subtext_coverage_percent: Math.round(subtextCoverage * 100) / 100,
    avg_beats_per_scene: Math.round(avgBeats * 100) / 100,
    conflict_type_diversity: conflictTypes.size,
  };
}

export function generateReport(
  plan: GenesisPlan,
  validation: ValidationResult,
  evidence: GEvidenceChain,
  config: GConfig,
  timestamp: string,
): GenesisReport {
  const metrics = computeMetrics(plan);
  const configHash = sha256(canonicalize(config));

  return {
    plan_id: plan.plan_id,
    plan_hash: plan.plan_hash,
    verdict: validation.verdict,
    validation,
    evidence,
    metrics,
    config_hash: configHash,
    timestamp_deterministic: timestamp,
  };
}

export function reportToMarkdown(report: GenesisReport): string {
  const lines: string[] = [];

  lines.push('# OMEGA Genesis Planner — Report');
  lines.push('');
  lines.push(`## Plan ID: ${report.plan_id}`);
  lines.push(`## Plan Hash: ${report.plan_hash}`);
  lines.push(`## Verdict: ${report.verdict}`);
  lines.push(`## Timestamp: ${report.timestamp_deterministic}`);
  lines.push('');

  lines.push('## Metrics');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Arcs | ${report.metrics.arc_count} |`);
  lines.push(`| Scenes | ${report.metrics.scene_count} |`);
  lines.push(`| Beats | ${report.metrics.beat_count} |`);
  lines.push(`| Seeds | ${report.metrics.seed_count} |`);
  lines.push(`| Tension Curve Length | ${report.metrics.tension_curve_length} |`);
  lines.push(`| Emotion Coverage | ${report.metrics.emotion_coverage_percent} |`);
  lines.push(`| Subtext Coverage | ${report.metrics.subtext_coverage_percent} |`);
  lines.push(`| Avg Beats/Scene | ${report.metrics.avg_beats_per_scene} |`);
  lines.push(`| Conflict Diversity | ${report.metrics.conflict_type_diversity} |`);
  lines.push('');

  lines.push('## Validation');
  lines.push('');
  lines.push(`Invariants checked: ${report.validation.invariants_checked.join(', ')}`);
  lines.push(`Invariants passed: ${report.validation.invariants_passed.join(', ')}`);
  lines.push('');

  if (report.validation.errors.length > 0) {
    lines.push('### Errors');
    lines.push('');
    for (const err of report.validation.errors) {
      lines.push(`- **${err.invariant}** [${err.severity}] ${err.path}: ${err.message}`);
    }
    lines.push('');
  }

  lines.push('## Evidence Chain');
  lines.push('');
  lines.push(`Chain Hash: ${report.evidence.chain_hash}`);
  lines.push(`Steps: ${report.evidence.steps.length}`);
  lines.push('');

  for (const step of report.evidence.steps) {
    lines.push(`- **${step.step}**: ${step.verdict} (rule: ${step.rule_applied})`);
  }
  lines.push('');

  lines.push(`## Config Hash: ${report.config_hash}`);

  return lines.join('\n');
}
