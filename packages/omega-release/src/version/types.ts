/**
 * OMEGA Release — Version Types
 * Phase G.0 — SemVer 2.0.0 compliant
 */

export interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease?: string;
  readonly build?: string;
}

export type VersionBump = 'major' | 'minor' | 'patch';

export interface VersionInfo {
  readonly version: SemVer;
  readonly raw: string;
  readonly isPrerelease: boolean;
}

export interface VersionFile {
  readonly path: string;
  readonly version: string;
  readonly hash: string;
}
