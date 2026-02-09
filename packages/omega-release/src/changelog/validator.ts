/**
 * OMEGA Release — Changelog Validator
 * Phase G.0 — Validate Keep a Changelog format
 *
 * INV-G0-06: CHANGELOG_VALID
 */

import type { Changelog } from './types.js';
import { CHANGE_TYPES } from './types.js';

export interface ChangelogValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/** Validate changelog structure */
export function validateChangelog(changelog: Changelog): ChangelogValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (changelog.versions.length === 0 && changelog.unreleased.length === 0) {
    errors.push('Changelog is empty');
  }

  for (const ver of changelog.versions) {
    if (!ver.version) {
      errors.push('Version section missing version number');
    }
    if (!ver.date) {
      warnings.push(`Version ${ver.version} has no date`);
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(ver.date)) {
      errors.push(`Version ${ver.version} has invalid date format: ${ver.date} (expected YYYY-MM-DD)`);
    }
    if (ver.entries.length === 0) {
      warnings.push(`Version ${ver.version} has no entries`);
    }
    for (const entry of ver.entries) {
      if (!CHANGE_TYPES.includes(entry.type)) {
        errors.push(`Version ${ver.version}: invalid change type "${entry.type}"`);
      }
      if (!entry.message || entry.message.trim().length === 0) {
        errors.push(`Version ${ver.version}: empty entry message`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate raw CHANGELOG.md content format */
export function validateChangelogContent(content: string): ChangelogValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content.includes('# Changelog')) {
    errors.push('Missing "# Changelog" header');
  }
  if (!content.includes('Keep a Changelog')) {
    warnings.push('Missing reference to Keep a Changelog');
  }
  if (!content.includes('Semantic Versioning')) {
    warnings.push('Missing reference to Semantic Versioning');
  }

  return { valid: errors.length === 0, errors, warnings };
}
