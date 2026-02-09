/**
 * OMEGA Release — Changelog Generator
 * Phase G.0 — Generate new changelog entries
 */

import type { ChangelogEntry, ChangelogVersion, ChangeType } from './types.js';

/** Create a new changelog entry */
export function createEntry(type: ChangeType, message: string, issue?: string): ChangelogEntry {
  return { type, message, issue };
}

/** Create a new version section */
export function createVersionSection(version: string, date: string, entries: readonly ChangelogEntry[]): ChangelogVersion {
  return { version, date, entries };
}

/** Generate release date string (YYYY-MM-DD) */
export function generateReleaseDate(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
