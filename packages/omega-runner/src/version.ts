/**
 * OMEGA Runner — Version Constants
 * Phase D.1 — Deterministic version tracking
 */

export const RUNNER_VERSION = '0.1.0';
export const GENESIS_VERSION = '0.1.0';
export const SCRIBE_VERSION = '0.1.0';
export const STYLE_VERSION = '0.1.0';
export const CREATION_VERSION = '0.1.0';
export const FORGE_VERSION = '0.1.0';

export interface VersionMap {
  readonly runner: string;
  readonly genesis: string;
  readonly scribe: string;
  readonly style: string;
  readonly creation: string;
  readonly forge: string;
}

export function getVersionMap(): VersionMap {
  return {
    runner: RUNNER_VERSION,
    genesis: GENESIS_VERSION,
    scribe: SCRIBE_VERSION,
    style: STYLE_VERSION,
    creation: CREATION_VERSION,
    forge: FORGE_VERSION,
  };
}
