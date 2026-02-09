/**
 * OMEGA Governance — History Types
 * Phase D.2 — Types for event logging and history queries
 */

export interface RuntimeEvent {
  readonly event_id: string;
  readonly run_id: string;
  readonly command: 'create' | 'forge' | 'full' | 'compare' | 'drift' | 'certify' | 'bench';
  readonly status: 'SUCCESS' | 'FAIL';
  readonly duration_ms: number;
  readonly manifest_hash: string;
  readonly merkle_root: string;
  readonly forge_score?: number;
  readonly timestamp: string;
}

export interface HistoryQuery {
  readonly since?: string;
  readonly until?: string;
  readonly run_id?: string;
  readonly status?: 'SUCCESS' | 'FAIL';
  readonly limit?: number;
}

export interface TrendAnalysis {
  readonly period: string;
  readonly run_count: number;
  readonly avg_forge_score: number;
  readonly score_variance: number;
  readonly avg_duration_ms: number;
  readonly success_rate: number;
}
