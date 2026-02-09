/**
 * OMEGA Governance — Certificate Templates
 * Phase D.2 — Generate certificate output in JSON and Markdown
 */

import type { Certificate } from './types.js';

/** Generate JSON certificate (deterministic — no timestamps) */
export function certificateToJSON(cert: Certificate): string {
  return JSON.stringify(cert, null, 2);
}

/** Generate Markdown certificate */
export function certificateToMarkdown(cert: Certificate): string {
  const lines: string[] = [
    '# OMEGA Governance — Certificate',
    '',
    `**Run ID**: ${cert.run_id}`,
    `**Verdict**: ${cert.verdict}`,
    `**Signature**: ${cert.signature}`,
    '',
    '## Scores',
    '',
    '| Score | Value |',
    '|-------|-------|',
    `| Forge Score | ${cert.scores.forge_score.toFixed(4)} |`,
    `| Emotion Score | ${cert.scores.emotion_score.toFixed(4)} |`,
    `| Quality Score | ${cert.scores.quality_score.toFixed(4)} |`,
    `| Trajectory Compliance | ${cert.scores.trajectory_compliance.toFixed(4)} |`,
    '',
    '## Checks',
    '',
    '| ID | Name | Status | Message |',
    '|----|------|--------|---------|',
  ];

  for (const check of cert.checks) {
    lines.push(`| ${check.id} | ${check.name} | ${check.status} | ${check.message ?? '-'} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push(`*Config: CERT_MIN_SCORE=${cert.config.CERT_MIN_SCORE}, CERT_WARN_SCORE=${cert.config.CERT_WARN_SCORE}*`);

  return lines.join('\n');
}
