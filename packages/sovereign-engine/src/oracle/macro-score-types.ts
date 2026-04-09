/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — MACRO S-SCORE TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Migré depuis s-score.ts le 2026-04-02 (P1-01).
 * Contains the MacroSScore interface used by the V3 macro-axes scoring system.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { MacroAxesScores } from './macro-axes.js';
import type { DispatcherAttachment } from '../scoring/dispatcher/types.js';

export interface MacroSScore {
  readonly score_id: string;
  readonly score_hash: string;
  readonly scene_id: string;
  readonly seed: string;
  readonly macro_axes: MacroAxesScores;
  readonly composite: number;
  readonly min_axis: number;
  readonly verdict: 'SEAL' | 'PITCH' | 'REJECT';
  readonly ecc_score: number;
  readonly emotion_weight_pct: number;
  /**
   * Shadow-mode attachement du M0b_slim V3.1 Language Dispatcher.
   * Champ OPTIONNEL : présent UNIQUEMENT si OMEGA_DISPATCHER_LANG_V33='1'.
   * N'influe JAMAIS sur composite, verdict, min_axis (INV-NR-01, INV-NR-02).
   * Voir : src/scoring/dispatcher/dispatcher-lang.ts
   */
  readonly baseline_m0b?: DispatcherAttachment;
}
