/**
 * OMEGA Governance — Badge Types
 * Phase F — Types for badge generation
 */

export type BadgeStatus = 'passing' | 'failing' | 'unknown';

export interface BadgeConfig {
  readonly label: string;
  readonly status: BadgeStatus;
  readonly color: string;
}

export interface BadgeResult {
  readonly svg: string;
  readonly shield_url: string;
  readonly alt_text: string;
  readonly status: BadgeStatus;
}
