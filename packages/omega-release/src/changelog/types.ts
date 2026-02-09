/**
 * OMEGA Release — Changelog Types
 * Phase G.0 — Keep a Changelog format
 */

export type ChangeType = 'Added' | 'Changed' | 'Deprecated' | 'Removed' | 'Fixed' | 'Security';

export const CHANGE_TYPES: readonly ChangeType[] = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

export interface ChangelogEntry {
  readonly type: ChangeType;
  readonly message: string;
  readonly issue?: string;
}

export interface ChangelogVersion {
  readonly version: string;
  readonly date: string;
  readonly entries: readonly ChangelogEntry[];
}

export interface Changelog {
  readonly versions: readonly ChangelogVersion[];
  readonly unreleased: readonly ChangelogEntry[];
}
