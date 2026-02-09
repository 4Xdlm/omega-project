/**
 * OMEGA Release — Release Notes Generator
 * Phase G.0 — Generate RELEASE_NOTES.md
 */

import type { ChangelogVersion } from '../changelog/types.js';
import type { ReleaseManifest } from './types.js';

/** Generate release notes from changelog version and manifest */
export function generateReleaseNotes(
  version: ChangelogVersion,
  manifest: ReleaseManifest,
): string {
  const lines: string[] = [
    `# OMEGA ${version.version}`,
    '',
    `Release date: ${version.date}`,
    '',
  ];

  // Group entries by type
  const grouped = new Map<string, string[]>();
  for (const entry of version.entries) {
    const group = grouped.get(entry.type) ?? [];
    const issue = entry.issue ? ` (${entry.issue})` : '';
    group.push(`- ${entry.message}${issue}`);
    grouped.set(entry.type, group);
  }

  for (const [type, items] of grouped) {
    lines.push(`## ${type}`);
    lines.push('');
    lines.push(...items);
    lines.push('');
  }

  lines.push('## Artifacts');
  lines.push('');
  for (const artifact of manifest.artifacts) {
    lines.push(`- \`${artifact.filename}\` (${artifact.platform}, ${formatSize(artifact.size)})`);
    lines.push(`  SHA-256: \`${artifact.sha256}\``);
  }
  lines.push('');

  lines.push('## Verification');
  lines.push('');
  lines.push(`- Tests: ${manifest.tests.passed}/${manifest.tests.total} passed`);
  lines.push(`- Invariants: ${manifest.invariants.verified}/${manifest.invariants.total} verified`);
  lines.push(`- Node.js minimum: ${manifest.node_minimum}`);
  lines.push(`- Commit: \`${manifest.commit}\``);
  lines.push('');

  return lines.join('\n');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
