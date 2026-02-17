/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FORESHADOWING COMPILER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: temporal/foreshadowing-compiler.ts
 * Sprint: 16.3
 * Invariant: ART-TEMP-03
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Compiles foreshadowing hooks into prompt instructions.
 * Tells the LLM where to plant emotional seeds and where to resolve them.
 *
 * 100% CALC — deterministic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForeshadowingHook, TemporalContract } from './temporal-contract.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ForeshadowingInstruction {
  readonly hook_id: string;
  readonly type: 'plant' | 'resolve';
  readonly position_pct: number;
  readonly instruction_fr: string;
  readonly motif: string;
}

export interface ForeshadowingPlan {
  readonly instructions: readonly ForeshadowingInstruction[];
  readonly total_hooks: number;
  readonly token_budget: number; // estimated tokens for foreshadowing section
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPILER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compile foreshadowing hooks into prompt instructions (French).
 *
 * For each hook:
 * - PLANT instruction at plant_position_pct
 * - RESOLVE instruction at resolve_position_pct
 *
 * Instructions sorted by position for sequential reading.
 * Token budget: ~30 tokens per instruction.
 */
export function compileForeshadowing(contract: TemporalContract): ForeshadowingPlan {
  const instructions: ForeshadowingInstruction[] = [];

  for (const hook of contract.foreshadowing_hooks) {
    // PLANT instruction
    instructions.push({
      hook_id: hook.hook_id,
      type: 'plant',
      position_pct: hook.plant_position_pct,
      instruction_fr: buildPlantInstruction(hook),
      motif: hook.motif,
    });

    // RESOLVE instruction
    instructions.push({
      hook_id: hook.hook_id,
      type: 'resolve',
      position_pct: hook.resolve_position_pct,
      instruction_fr: buildResolveInstruction(hook),
      motif: hook.motif,
    });
  }

  // Sort by position
  instructions.sort((a, b) => a.position_pct - b.position_pct);

  return {
    instructions,
    total_hooks: contract.foreshadowing_hooks.length,
    token_budget: instructions.length * 30,
  };
}

/**
 * Build French plant instruction for a foreshadowing hook.
 */
function buildPlantInstruction(hook: ForeshadowingHook): string {
  return `[${hook.plant_position_pct}%] Planter une graine émotionnelle : évoquer "${hook.motif}" avec une tonalité de ${hook.emotion_planted}. Le lecteur doit ressentir un signal subtil sans comprendre sa signification.`;
}

/**
 * Build French resolve instruction for a foreshadowing hook.
 */
function buildResolveInstruction(hook: ForeshadowingHook): string {
  return `[${hook.resolve_position_pct}%] Résoudre le motif "${hook.motif}" : transformer le ${hook.emotion_planted} initial en ${hook.emotion_resolved}. Le lecteur doit reconnaître le lien avec la scène précédente.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION (post-generation)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ForeshadowingDetectionResult {
  readonly hooks_planted: number;
  readonly hooks_resolved: number;
  readonly total_hooks: number;
  readonly completion_rate: number; // 0-1
  readonly missing_plants: readonly string[];
  readonly missing_resolves: readonly string[];
}

/**
 * Detect if foreshadowing hooks were actually executed in prose.
 * Uses motif presence as proxy (CALC, no LLM).
 *
 * A hook is "planted" if its motif appears in the first half of the text.
 * A hook is "resolved" if its motif appears in the second half of the text.
 *
 * Simplified heuristic — no LLM needed.
 */
export function detectForeshadowing(
  prose: string,
  contract: TemporalContract,
): ForeshadowingDetectionResult {
  if (contract.foreshadowing_hooks.length === 0) {
    return {
      hooks_planted: 0,
      hooks_resolved: 0,
      total_hooks: 0,
      completion_rate: 1.0,
      missing_plants: [],
      missing_resolves: [],
    };
  }

  const lowerProse = prose.toLowerCase();
  const totalLen = lowerProse.length;
  const halfPoint = Math.floor(totalLen / 2);
  const firstHalf = lowerProse.substring(0, halfPoint);
  const secondHalf = lowerProse.substring(halfPoint);

  let planted = 0;
  let resolved = 0;
  const missingPlants: string[] = [];
  const missingResolves: string[] = [];

  for (const hook of contract.foreshadowing_hooks) {
    const motifLower = hook.motif.toLowerCase();
    const motifTokens = motifLower.split(/\s+/).filter(t => t.length > 2);

    // Check if any motif token appears in first half (plant)
    const isPlanted = motifTokens.some(t => firstHalf.includes(t));
    if (isPlanted) {
      planted++;
    } else {
      missingPlants.push(hook.hook_id);
    }

    // Check if any motif token appears in second half (resolve)
    const isResolved = motifTokens.some(t => secondHalf.includes(t));
    if (isResolved) {
      resolved++;
    } else {
      missingResolves.push(hook.hook_id);
    }
  }

  const total = contract.foreshadowing_hooks.length;
  const completion_rate = (planted + resolved) / (total * 2);

  return {
    hooks_planted: planted,
    hooks_resolved: resolved,
    total_hooks: total,
    completion_rate,
    missing_plants: missingPlants,
    missing_resolves: missingResolves,
  };
}
