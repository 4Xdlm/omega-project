/**
 * OMEGA Release — Policy Types
 * Phase G.0 — Support & rollback policies
 */

export type SupportStatus = 'CURRENT' | 'MAINTENANCE' | 'EOL';

export interface SupportPolicy {
  readonly version: string;
  readonly status: SupportStatus;
  readonly releaseDate: string;
  readonly eolDate?: string;
  readonly maintenanceDate?: string;
}

export interface RollbackStep {
  readonly order: number;
  readonly action: string;
  readonly description: string;
  readonly command?: string;
  readonly critical: boolean;
}

export interface RollbackPlan {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly steps: readonly RollbackStep[];
  readonly estimatedDowntime: string;
  readonly requiresDataMigration: boolean;
}
