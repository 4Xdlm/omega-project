/**
 * OMEGA Governance — CI Configuration
 * Phase F — All CI thresholds centralized
 */

import type { DriftLevel } from '../drift/types.js';
import type { CertVerdict } from '../certify/types.js';

export interface CIConfig {
  /** Default seed for replay */
  readonly DEFAULT_SEED: string;
  /** Timeout for replay in ms */
  readonly REPLAY_TIMEOUT_MS: number;
  /** Enable fail-fast mode */
  readonly FAIL_FAST: boolean;
  /** Acceptable drift levels (G3) */
  readonly ACCEPTABLE_DRIFT_LEVELS: readonly DriftLevel[];
  /** Max variance percent for benchmarks (G4) */
  readonly MAX_VARIANCE_PERCENT: number;
  /** Max duration in ms for benchmarks (G4) */
  readonly MAX_DURATION_MS: number;
  /** Acceptable certification verdicts (G5) */
  readonly ACCEPTABLE_CERT_VERDICTS: readonly CertVerdict[];
}

export const DEFAULT_CI_CONFIG: CIConfig = {
  DEFAULT_SEED: 'omega-ci',
  REPLAY_TIMEOUT_MS: 120000,
  FAIL_FAST: true,
  ACCEPTABLE_DRIFT_LEVELS: ['NO_DRIFT', 'SOFT_DRIFT'],
  MAX_VARIANCE_PERCENT: 5,
  MAX_DURATION_MS: 60000,
  ACCEPTABLE_CERT_VERDICTS: ['PASS', 'PASS_WITH_WARNINGS'],
};

/** Create CI config with overrides */
export function createCIConfig(overrides?: Partial<CIConfig>): CIConfig {
  return { ...DEFAULT_CI_CONFIG, ...overrides };
}
