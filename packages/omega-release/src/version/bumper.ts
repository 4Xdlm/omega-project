/**
 * OMEGA Release — Version Bumper
 * Phase G.0 — Bump major/minor/patch
 *
 * INV-G0-03: VERSION_MONOTONIC
 */

import type { SemVer, VersionBump } from './types.js';
import { parseSemVer, formatSemVer } from './parser.js';

/** Bump a version component */
export function bumpVersion(version: string, bump: VersionBump): string {
  const semver = parseSemVer(version);
  const bumped = bumpSemVer(semver, bump);
  return formatSemVer(bumped);
}

/** Bump SemVer struct */
export function bumpSemVer(semver: SemVer, bump: VersionBump): SemVer {
  switch (bump) {
    case 'major':
      return { major: semver.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: semver.major, minor: semver.minor + 1, patch: 0 };
    case 'patch':
      return { major: semver.major, minor: semver.minor, patch: semver.patch + 1 };
  }
}

/** Set version explicitly */
export function setVersion(newVersion: string): string {
  const semver = parseSemVer(newVersion);
  return formatSemVer(semver);
}
