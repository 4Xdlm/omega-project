/**
 * OMEGA Release — Version Validator
 * Phase G.0 — Validate SemVer format
 *
 * INV-G0-02: SEMVER_VALID
 */

import { isSemVer, parseSemVer } from './parser.js';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/** Validate a version string against SemVer 2.0.0 */
export function validateVersion(version: string): ValidationResult {
  const errors: string[] = [];

  if (!version || version.trim().length === 0) {
    errors.push('Version string is empty');
    return { valid: false, errors };
  }

  const trimmed = version.trim();

  if (trimmed.startsWith('v') || trimmed.startsWith('V')) {
    errors.push('Version must not start with "v" prefix (use for git tags only)');
  }

  if (!isSemVer(trimmed)) {
    errors.push(`"${trimmed}" is not valid SemVer 2.0.0 (expected MAJOR.MINOR.PATCH[-prerelease][+build])`);
    return { valid: false, errors };
  }

  const semver = parseSemVer(trimmed);

  if (semver.major < 0 || semver.minor < 0 || semver.patch < 0) {
    errors.push('Version components must be non-negative');
  }

  return { valid: errors.length === 0, errors };
}

/** Validate prerelease identifier */
export function validatePrerelease(prerelease: string): boolean {
  if (!prerelease) return true;
  const parts = prerelease.split('.');
  for (const part of parts) {
    if (part.length === 0) return false;
    if (/^[0-9]+$/.test(part) && part.length > 1 && part.startsWith('0')) return false;
  }
  return true;
}
