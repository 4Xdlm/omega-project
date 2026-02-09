/**
 * OMEGA Release — CLI Changelog Command
 * Phase G.0
 */

import type { ParsedArgs } from '../parser.js';
import { parseChangelog } from '../../changelog/parser.js';
import { validateChangelogContent } from '../../changelog/validator.js';
import { renderChangelog } from '../../changelog/writer.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Handle changelog command */
export function handleChangelog(parsed: ParsedArgs, projectRoot: string): string {
  const changelogPath = join(projectRoot, 'CHANGELOG.md');
  const subcommand = parsed.args[0] ?? 'show';

  switch (subcommand) {
    case 'show': {
      if (!existsSync(changelogPath)) return 'ERROR: CHANGELOG.md not found';
      const content = readFileSync(changelogPath, 'utf-8');
      const changelog = parseChangelog(content);
      if (changelog.versions.length === 0) return 'No versions in changelog';
      const latest = changelog.versions[0];
      return `Latest: [${latest.version}] - ${latest.date} (${latest.entries.length} entries)`;
    }
    case 'validate': {
      if (!existsSync(changelogPath)) return 'ERROR: CHANGELOG.md not found';
      const content = readFileSync(changelogPath, 'utf-8');
      const result = validateChangelogContent(content);
      return result.valid
        ? 'VALID: changelog format correct'
        : `INVALID: ${result.errors.join(', ')}`;
    }
    case 'render': {
      if (!existsSync(changelogPath)) return 'ERROR: CHANGELOG.md not found';
      const content = readFileSync(changelogPath, 'utf-8');
      const changelog = parseChangelog(content);
      return renderChangelog(changelog);
    }
    case 'init': {
      if (existsSync(changelogPath)) return 'CHANGELOG.md already exists';
      const initial = renderChangelog({ versions: [], unreleased: [] });
      writeFileSync(changelogPath, initial, 'utf-8');
      return 'Created CHANGELOG.md';
    }
    default:
      return `Unknown changelog subcommand: ${subcommand}`;
  }
}
