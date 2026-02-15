/**
 * OMEGA Signal Registry — Type Definitions
 * Gouvernance inter-moteurs : chaque signal est déclaré, versionné, vérifié.
 */

export type SignalStability = 'stable' | 'experimental' | 'deprecated';

export interface SignalDescriptor {
  readonly signal_id: string;
  readonly producer: string;
  readonly stability: SignalStability;
  readonly required_params: readonly string[];
  readonly dimensions?: number;
  readonly description: string;
}

export type ProducerName = 'omega-forge' | 'sovereign-engine' | 'config';

export const VALID_PRODUCERS: readonly ProducerName[] = [
  'omega-forge',
  'sovereign-engine',
  'config',
] as const;

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly degraded_signals: readonly string[];
}
