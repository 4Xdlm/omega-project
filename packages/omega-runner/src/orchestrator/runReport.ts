/**
 * OMEGA Runner — Report Orchestrator
 * Phase D.1 — Generate consolidated report from run artifacts
 */

import { canonicalJSON } from '../proofpack/canonical.js';
import { hashString } from '../proofpack/hash.js';
import type { Manifest, ConsolidatedReport, InvariantResult } from '../types.js';

/** Build consolidated JSON report */
export function buildConsolidatedReport(
  manifest: Manifest,
  invariants: readonly InvariantResult[],
): ConsolidatedReport {
  return {
    run_id: manifest.run_id,
    verdict: manifest.verdict,
    creation_verdict: manifest.stages_completed.includes('40-creation') ? manifest.verdict : undefined,
    forge_verdict: manifest.stages_completed.includes('50-forge') ? manifest.verdict : undefined,
    stages: manifest.stages_completed,
    invariants,
    manifest_hash: hashString(canonicalJSON(manifest)),
    merkle_root: manifest.merkle_root,
  };
}

/** Build human-readable markdown report */
export function buildMarkdownReport(manifest: Manifest, invariants: readonly InvariantResult[]): string {
  const lines: string[] = [];

  lines.push(`# OMEGA Run Report — ${manifest.run_id}`);
  lines.push('');
  lines.push(`**Verdict**: ${manifest.verdict}`);
  lines.push(`**Seed**: ${manifest.seed || '(empty)'}`);
  lines.push(`**Merkle Root**: \`${manifest.merkle_root}\``);
  lines.push('');

  lines.push('## Stages');
  lines.push('');
  for (const stage of manifest.stages_completed) {
    lines.push(`- [x] ${stage}`);
  }
  lines.push('');

  lines.push('## Artifacts');
  lines.push('');
  lines.push('| Stage | File | SHA-256 |');
  lines.push('|-------|------|---------|');
  for (const art of manifest.artifacts) {
    lines.push(`| ${art.stage} | ${art.filename} | \`${art.sha256.substring(0, 16)}...\` |`);
  }
  lines.push('');

  lines.push('## Invariants');
  lines.push('');
  lines.push('| ID | Status | Message |');
  lines.push('|----|--------|---------|');
  for (const inv of invariants) {
    const msg = inv.message ?? '';
    lines.push(`| ${inv.id} | ${inv.status} | ${msg} |`);
  }
  lines.push('');

  lines.push('## Versions');
  lines.push('');
  for (const [key, value] of Object.entries(manifest.versions)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('');

  return lines.join('\n');
}

/** Read an existing run from manifest and produce report */
export function buildReportFromManifest(manifest: Manifest, invariants: readonly InvariantResult[]): {
  reportJson: string;
  reportMd: string;
} {
  const consolidated = buildConsolidatedReport(manifest, invariants);
  return {
    reportJson: canonicalJSON(consolidated),
    reportMd: buildMarkdownReport(manifest, invariants),
  };
}
