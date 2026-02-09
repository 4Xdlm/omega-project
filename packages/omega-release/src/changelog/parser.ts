/**
 * OMEGA Release — Changelog Parser
 * Phase G.0 — Parse CHANGELOG.md (Keep a Changelog)
 *
 * INV-G0-06: CHANGELOG_VALID
 */

import type { Changelog, ChangelogVersion, ChangelogEntry, ChangeType } from './types.js';
import { CHANGE_TYPES } from './types.js';

/** Parse CHANGELOG.md content */
export function parseChangelog(content: string): Changelog {
  const lines = content.split('\n');
  const versions: ChangelogVersion[] = [];
  const unreleased: ChangelogEntry[] = [];

  let currentVersion: { version: string; date: string; entries: ChangelogEntry[] } | null = null;
  let currentType: ChangeType | null = null;
  let inUnreleased = false;

  for (const line of lines) {
    // Version header: ## [1.0.0] - 2026-02-10 or ## [Unreleased]
    const versionMatch = /^## \[([^\]]+)\](?:\s*-\s*(.+))?/.exec(line);
    if (versionMatch) {
      if (currentVersion) {
        versions.push({ ...currentVersion, entries: currentVersion.entries });
      }
      if (versionMatch[1] === 'Unreleased') {
        inUnreleased = true;
        currentVersion = null;
      } else {
        inUnreleased = false;
        currentVersion = {
          version: versionMatch[1],
          date: versionMatch[2]?.trim() ?? '',
          entries: [],
        };
      }
      currentType = null;
      continue;
    }

    // Change type: ### Added, ### Changed, etc.
    const typeMatch = /^### (.+)/.exec(line);
    if (typeMatch) {
      const typeName = typeMatch[1].trim() as ChangeType;
      if (CHANGE_TYPES.includes(typeName)) {
        currentType = typeName;
      }
      continue;
    }

    // Entry: - message (#123)
    const entryMatch = /^- (.+)/.exec(line);
    if (entryMatch && currentType) {
      const message = entryMatch[1].trim();
      const issueMatch = /\(#(\d+)\)/.exec(message);
      const entry: ChangelogEntry = {
        type: currentType,
        message: issueMatch ? message.replace(issueMatch[0], '').trim() : message,
        issue: issueMatch ? `#${issueMatch[1]}` : undefined,
      };

      if (inUnreleased) {
        unreleased.push(entry);
      } else if (currentVersion) {
        currentVersion.entries.push(entry);
      }
    }
  }

  if (currentVersion) {
    versions.push({ ...currentVersion, entries: currentVersion.entries });
  }

  return { versions, unreleased };
}

/** Find a specific version in changelog */
export function findVersion(changelog: Changelog, version: string): ChangelogVersion | null {
  return changelog.versions.find((v) => v.version === version) ?? null;
}
