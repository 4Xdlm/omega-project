/**
 * OMEGA Release — Version Parser
 * Phase G.0 — Parse SemVer strings
 *
 * INV-G0-02: All versions must be valid SemVer 2.0.0
 */

import type { SemVer, VersionInfo } from './types.js';

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/** Parse a SemVer string into structured components */
export function parseSemVer(version: string): SemVer {
  const trimmed = version.trim();
  const match = SEMVER_REGEX.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid SemVer: "${version}"`);
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || undefined,
    build: match[5] || undefined,
  };
}

/** Parse to full VersionInfo */
export function parseVersionInfo(version: string): VersionInfo {
  const semver = parseSemVer(version);
  return {
    version: semver,
    raw: version.trim(),
    isPrerelease: semver.prerelease !== undefined,
  };
}

/** Format SemVer back to string */
export function formatSemVer(semver: SemVer): string {
  let result = `${semver.major}.${semver.minor}.${semver.patch}`;
  if (semver.prerelease) {
    result += `-${semver.prerelease}`;
  }
  if (semver.build) {
    result += `+${semver.build}`;
  }
  return result;
}

/** Check if string is valid SemVer */
export function isSemVer(version: string): boolean {
  return SEMVER_REGEX.test(version.trim());
}
