/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PIPELINE TELEMETRY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: telemetry/pipeline-telemetry.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * OBSERVATEUR PUR — ne modifie AUCUNE donnee, score, ou decision.
 * Collecte des snapshots a chaque etape du pipeline et exporte en JSON.
 *
 * 7 points de mesure :
 *   1. CHUNKED_DRAFT        — apres generation des 4 chunks
 *   2. DUEL_CANDIDATE_*     — chaque candidat Duel (loop + 3 modes)
 *   3. DUEL_WINNER          — winner selectionne
 *   4. PRE_MICROSURGERY     — etat avant interventions
 *   5. POST_MICROSURGERY    — etat apres interventions
 *   6. FINAL                — score definitif
 *   7. DELTA_SUMMARY        — calcule automatiquement (draft → final)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TelemetryFeatures {
  readonly f1_mean_sent_len: number;
  readonly f1a_rhythm_variance: number;
  readonly f26b_long_sent_rate: number;
  readonly cv_sent: number;
  readonly cv_para: number;
  readonly f17_knife_count: number;
  readonly f19a_approx_entropy: number;
  readonly paragraph_count: number;
}

export interface TelemetryScores {
  readonly composite: number;
  readonly min_axis: number;
  readonly ECC: number;
  readonly RCI: number;
  readonly SII: number;
  readonly IFI: number;
  readonly AAI: number;
}

export interface TelemetryEmotion14D {
  readonly quartile: number;
  readonly target: Record<string, number>;
  readonly actual: Record<string, number>;
  readonly cosine_similarity: number;
}

export interface TelemetrySnapshot {
  readonly stage: string;
  readonly timestamp: number;
  readonly words: number;
  readonly prose_hash: string;
  readonly features: TelemetryFeatures;
  readonly scores?: TelemetryScores;
  readonly emotion_14d?: TelemetryEmotion14D[];
  readonly details?: Record<string, unknown>;
}

export interface TelemetryReport {
  readonly scene: string;
  readonly attempt: number;
  readonly snapshots: TelemetrySnapshot[];
  readonly summary: {
    total_stages: number;
    duration_ms: number;
    winner_stage: string;
    winner_words: number;
    delta_draft_to_winner: {
      words: number;
      delta_cv: number;
      delta_mean_sent: number;
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK FEATURES — lightweight text analysis
// ═══════════════════════════════════════════════════════════════════════════════

export function computeQuickFeatures(prose: string): TelemetryFeatures {
  const sentences = prose.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const wordCounts = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
  const paragraphs = prose.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paraWordCounts = paragraphs.map(p => p.split(/\s+/).filter(w => w.length > 0).length);

  const n = wordCounts.length || 1;
  const mean = wordCounts.reduce((a, b) => a + b, 0) / n;
  const variance = wordCounts.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const cv_sent = mean > 0 ? Math.sqrt(variance) / mean : 0;

  const pn = paraWordCounts.length || 1;
  const paraMean = paraWordCounts.reduce((a, b) => a + b, 0) / pn;
  const paraVar = paraWordCounts.reduce((s, v) => s + (v - paraMean) ** 2, 0) / pn;
  const cv_para = paraMean > 0 ? Math.sqrt(paraVar) / paraMean : 0;

  return {
    f1_mean_sent_len: Math.round(mean * 100) / 100,
    f1a_rhythm_variance: Math.round(variance * 100) / 100,
    f26b_long_sent_rate: Math.round((wordCounts.filter(w => w > 40).length / n) * 1000) / 1000,
    cv_sent: Math.round(cv_sent * 1000) / 1000,
    cv_para: Math.round(cv_para * 1000) / 1000,
    f17_knife_count: wordCounts.filter(w => w < 10).length,
    f19a_approx_entropy: 0,
    paragraph_count: paragraphs.length,
  };
}

function countWords(prose: string): number {
  return prose.split(/\s+/).filter(w => w.length > 0).length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON TELEMETRY
// ═══════════════════════════════════════════════════════════════════════════════

class PipelineTelemetry {
  private _enabled: boolean = false;
  private _scene: string = '';
  private _attempt: number = 0;
  private _snapshots: TelemetrySnapshot[] = [];
  private _startTime: number = 0;

  get enabled(): boolean { return this._enabled; }

  enable(): void { this._enabled = true; }
  disable(): void { this._enabled = false; }

  start(scene: string, attempt: number): void {
    this._scene = scene;
    this._attempt = attempt;
    this._snapshots = [];
    this._startTime = Date.now();
  }

  record(snapshot: TelemetrySnapshot): void {
    if (!this._enabled) return;
    this._snapshots.push(snapshot);
  }

  /** Record a snapshot from raw prose + optional scores */
  recordFromProse(stage: string, prose: string, scores?: TelemetryScores, details?: Record<string, unknown>): void {
    if (!this._enabled) return;
    this.record({
      stage,
      timestamp: Date.now(),
      words: countWords(prose),
      prose_hash: sha256(prose).slice(0, 16),
      features: computeQuickFeatures(prose),
      scores,
      details,
    });
  }

  get snapshots(): readonly TelemetrySnapshot[] {
    return this._snapshots;
  }

  export(): TelemetryReport {
    const draftSnap = this._snapshots.find(s => s.stage === 'CHUNKED_DRAFT');
    const finalSnap = this._snapshots.find(s => s.stage === 'FINAL');
    const winnerSnap = this._snapshots.find(s => s.stage === 'DUEL_WINNER');

    return {
      scene: this._scene,
      attempt: this._attempt,
      snapshots: [...this._snapshots],
      summary: {
        total_stages: this._snapshots.length,
        duration_ms: Date.now() - this._startTime,
        winner_stage: winnerSnap?.stage ?? 'unknown',
        winner_words: winnerSnap?.words ?? finalSnap?.words ?? 0,
        delta_draft_to_winner: {
          words: (finalSnap?.words ?? 0) - (draftSnap?.words ?? 0),
          delta_cv: Math.round(((finalSnap?.features.cv_sent ?? 0) - (draftSnap?.features.cv_sent ?? 0)) * 1000) / 1000,
          delta_mean_sent: Math.round(((finalSnap?.features.f1_mean_sent_len ?? 0) - (draftSnap?.features.f1_mean_sent_len ?? 0)) * 100) / 100,
        },
      },
    };
  }

  reset(): void {
    this._snapshots = [];
    this._scene = '';
    this._attempt = 0;
    this._startTime = 0;
  }
}

export const telemetry = new PipelineTelemetry();
