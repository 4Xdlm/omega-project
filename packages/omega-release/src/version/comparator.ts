/**
 * OMEGA Release — Version Comparator
 * Phase G.0 — Compare versions (N+1 > N)
 *
 * INV-G0-03: VERSION_MONOTONIC
 */

import type { SemVer } from './types.js';
import { parseSemVer } from './parser.js';

/** Compare two SemVer: returns -1, 0, or 1 */
export function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;

  // No prerelease > prerelease (1.0.0 > 1.0.0-alpha)
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && !b.prerelease) return 0;

  // Compare prerelease identifiers
  return comparePrerelease(a.prerelease!, b.prerelease!);
}

function comparePrerelease(a: string, b: string): number {
  const aParts = a.split('.');
  const bParts = b.split('.');
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    if (i >= aParts.length) return -1;
    if (i >= bParts.length) return 1;

    const aNum = /^\d+$/.test(aParts[i]);
    const bNum = /^\d+$/.test(bParts[i]);

    if (aNum && bNum) {
      const diff = parseInt(aParts[i], 10) - parseInt(bParts[i], 10);
      if (diff !== 0) return diff > 0 ? 1 : -1;
    } else if (aNum) {
      return -1; // numeric < string
    } else if (bNum) {
      return 1;
    } else {
      const cmp = aParts[i].localeCompare(bParts[i]);
      if (cmp !== 0) return cmp > 0 ? 1 : -1;
    }
  }
  return 0;
}

/** Check if version a > b */
export function isGreaterThan(a: string | SemVer, b: string | SemVer): boolean {
  const semA = typeof a === 'string' ? parseSemVer(a) : a;
  const semB = typeof b === 'string' ? parseSemVer(b) : b;
  return compareSemVer(semA, semB) > 0;
}

/** Check if version a == b */
export function isEqual(a: string | SemVer, b: string | SemVer): boolean {
  const semA = typeof a === 'string' ? parseSemVer(a) : a;
  const semB = typeof b === 'string' ? parseSemVer(b) : b;
  return compareSemVer(semA, semB) === 0;
}

/** Sort versions in ascending order */
export function sortVersions(versions: readonly string[]): string[] {
  return [...versions].sort((a, b) => {
    const semA = parseSemVer(a);
    const semB = parseSemVer(b);
    return compareSemVer(semA, semB);
  });
}
