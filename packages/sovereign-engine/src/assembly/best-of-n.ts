/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — BEST-OF-N SELECTOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: assembly/best-of-n.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Generates up to N candidates per brick, keeps the best.
 * Early exit on SAGA_READY (composite >= 92 + min_axis >= 85).
 * Fallback: best selection_score = composite - 1.5 * max(0, 85 - min_axis).
 *
 * P(SAGA|1 run) ~ 0.35 → P(SAGA|3 runs) = 1 - 0.65³ ≈ 0.73
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';
import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../engine.js';
import type { ForgePacket, SovereignProvider } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BestOfNConfig {
  readonly max_attempts: number;         // 3 par défaut
  readonly early_exit_composite: number; // 92.0 (SAGA_READY)
  readonly early_exit_min_axis: number;  // 85.0
}

export interface BestOfNResult {
  readonly winner: BrickResult;
  readonly all_candidates: BrickResult[];
  readonly attempts: number;
  readonly early_exit: boolean;
  readonly selection_reason: 'saga_ready' | 'best_composite';
}

export interface BrickResult {
  readonly prose: string;
  readonly words: number;
  readonly composite: number;
  readonly min_axis: number;
  readonly axes: { ECC: number; RCI: number; SII: number; IFI: number; AAI: number };
  readonly hash: string;
  readonly saga_ready: boolean;
}

export const DEFAULT_CONFIG: BestOfNConfig = {
  max_attempts: 3,
  early_exit_composite: 92.0,
  early_exit_min_axis: 85.0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTION SCORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * selection_score = composite - 1.5 * max(0, 85 - min_axis)
 * Pénalise les candidats avec un axe faible.
 */
export function selectionScore(composite: number, min_axis: number): number {
  return composite - 1.5 * Math.max(0, 85 - min_axis);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extracts a BrickResult from a SovereignForgeResult.
 */
function toBrickResult(result: SovereignForgeResult, config: BestOfNConfig): BrickResult {
  const prose = result.final_prose;
  const ms = result.macro_score;
  const composite = ms?.composite ?? 0;
  const min_axis = ms?.min_axis ?? 0;

  return {
    prose,
    words: prose.split(/\s+/).filter(w => w.length > 0).length,
    composite,
    min_axis,
    axes: {
      ECC: ms?.ecc_score ?? 0,
      RCI: ms?.macro_axes?.rci.score ?? 0,
      SII: ms?.macro_axes?.sii.score ?? 0,
      IFI: ms?.macro_axes?.ifi.score ?? 0,
      AAI: ms?.macro_axes?.aai.score ?? 0,
    },
    hash: sha256(prose),
    saga_ready: composite >= config.early_exit_composite && min_axis >= config.early_exit_min_axis,
  };
}

/**
 * Generate up to max_attempts candidates, keep the best.
 * Early exit on SAGA_READY.
 */
export async function generateBestOfN(
  forgePacket: ForgePacket,
  provider: SovereignProvider,
  config: BestOfNConfig = DEFAULT_CONFIG,
): Promise<BestOfNResult> {
  const candidates: BrickResult[] = [];

  for (let i = 0; i < config.max_attempts; i++) {
    const result = await runSovereignForgeWithPacket(forgePacket, provider);
    const brick = toBrickResult(result, config);
    candidates.push(brick);

    // Early exit si SAGA_READY
    if (brick.saga_ready) {
      return {
        winner: brick,
        all_candidates: candidates,
        attempts: i + 1,
        early_exit: true,
        selection_reason: 'saga_ready',
      };
    }

    // Pause 5s entre tentatives (rate limiting)
    if (i < config.max_attempts - 1) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Aucun SAGA_READY → garder le meilleur par selection_score
  const sorted = [...candidates].sort((a, b) =>
    selectionScore(b.composite, b.min_axis) - selectionScore(a.composite, a.min_axis),
  );

  return {
    winner: sorted[0],
    all_candidates: candidates,
    attempts: config.max_attempts,
    early_exit: false,
    selection_reason: 'best_composite',
  };
}
