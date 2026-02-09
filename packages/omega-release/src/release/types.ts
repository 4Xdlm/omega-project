/**
 * OMEGA Release — Release Types
 * Phase G.0 — Release artifacts and manifest
 */

export type Platform = 'win-x64' | 'linux-x64' | 'macos-arm64';
export type ArchiveFormat = 'zip' | 'tar.gz';

export const ALL_PLATFORMS: readonly Platform[] = ['win-x64', 'linux-x64', 'macos-arm64'];

export const PLATFORM_FORMAT: Readonly<Record<Platform, ArchiveFormat>> = {
  'win-x64': 'zip',
  'linux-x64': 'tar.gz',
  'macos-arm64': 'tar.gz',
};

export interface ReleaseConfig {
  readonly version: string;
  readonly platforms: readonly Platform[];
  readonly outputDir: string;
  readonly includeSource: boolean;
  readonly generateSbom: boolean;
}

export interface ReleaseArtifact {
  readonly filename: string;
  readonly platform: Platform;
  readonly format: ArchiveFormat;
  readonly path: string;
  readonly size: number;
  readonly sha256: string;
  readonly sha512: string;
}

export interface ReleaseManifest {
  readonly version: string;
  readonly release_date: string;
  readonly commit: string;
  readonly tag: string;
  readonly platforms: readonly Platform[];
  readonly artifacts: readonly ReleaseArtifact[];
  readonly tests: { readonly total: number; readonly passed: number };
  readonly invariants: { readonly total: number; readonly verified: number };
  readonly node_minimum: string;
  readonly hash: string;
}

export interface SBOM {
  readonly bomFormat: 'CycloneDX';
  readonly specVersion: '1.4';
  readonly version: number;
  readonly components: readonly SBOMComponent[];
}

export interface SBOMComponent {
  readonly type: 'library' | 'application';
  readonly name: string;
  readonly version: string;
  readonly purl?: string;
  readonly licenses?: readonly string[];
}

export interface ReleaseResult {
  readonly version: string;
  readonly artifacts: readonly ReleaseArtifact[];
  readonly manifest: ReleaseManifest;
  readonly checksumFile: string;
}
