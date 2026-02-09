/**
 * OMEGA Governance — Reporter Types
 * Phase F — Types for CI report generation
 */

export type ReportFormat = 'json' | 'markdown';

export interface ReportOutput {
  readonly format: ReportFormat;
  readonly content: string;
  readonly filename: string;
}
