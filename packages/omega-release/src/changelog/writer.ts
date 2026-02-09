/**
 * OMEGA Release — Changelog Writer
 * Phase G.0 — Write CHANGELOG.md
 */

import type { Changelog, ChangelogVersion, ChangelogEntry, ChangeType } from './types.js';
import { CHANGE_TYPES } from './types.js';

/** Render changelog to Markdown string */
export function renderChangelog(changelog: Changelog): string {
  const lines: string[] = [
    '# Changelog',
    '',
    'All notable changes to OMEGA will be documented in this file.',
    '',
    'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),',
    'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
    '',
  ];

  // Unreleased section
  lines.push('## [Unreleased]');
  lines.push('');
  if (changelog.unreleased.length > 0) {
    lines.push(...renderEntries(changelog.unreleased));
    lines.push('');
  }

  // Version sections
  for (const ver of changelog.versions) {
    lines.push(`## [${ver.version}] - ${ver.date}`);
    lines.push('');
    if (ver.entries.length > 0) {
      lines.push(...renderEntries(ver.entries));
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderEntries(entries: readonly ChangelogEntry[]): string[] {
  const lines: string[] = [];
  const grouped = groupByType(entries);

  for (const type of CHANGE_TYPES) {
    const group = grouped.get(type);
    if (group && group.length > 0) {
      lines.push(`### ${type}`);
      for (const entry of group) {
        const issue = entry.issue ? ` (${entry.issue})` : '';
        lines.push(`- ${entry.message}${issue}`);
      }
      lines.push('');
    }
  }

  return lines;
}

function groupByType(entries: readonly ChangelogEntry[]): Map<ChangeType, ChangelogEntry[]> {
  const map = new Map<ChangeType, ChangelogEntry[]>();
  for (const entry of entries) {
    const existing = map.get(entry.type) ?? [];
    existing.push(entry);
    map.set(entry.type, existing);
  }
  return map;
}

/** Add a version to existing changelog */
export function addVersionToChangelog(changelog: Changelog, version: ChangelogVersion): Changelog {
  return {
    versions: [version, ...changelog.versions],
    unreleased: [],
  };
}
