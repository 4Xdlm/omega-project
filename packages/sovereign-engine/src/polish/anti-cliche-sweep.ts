/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — ANTI-CLICHÉ SWEEP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: polish/anti-cliche-sweep.ts
 * Version: 2.0.0 (Sprint 10 Commit 10.6)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-POL-05
 *
 * Final cliché scan + replacement via surgeonPass().
 * Detects clichés from blacklist, applies bounded corrections (max 5).
 * All corrections validated via reScoreGuard.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignProvider } from '../types.js';
import { computeClicheDelta } from '../delta/delta-cliche.js';
import { surgeonPass, DEFAULT_SURGEON_CONFIG } from './sentence-surgeon.js';
import { judgeAestheticV3 } from '../oracle/aesthetic-oracle.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint S2 — Offline Anti-Cliché Sweep (deterministic, 0 LLM) [INV-S-NOCLICHE-01]
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClicheSweepResult {
  readonly swept_prose: string;
  readonly nb_replacements: number;
}

/**
 * OFFLINE deterministic cliché removal.
 * Removes all matches from packet.kill_lists.banned_cliches via regex.
 *
 * OFFLINE-HEURISTIC: No LLM involved. Regex-based removal.
 */
export function sweepClichesOffline(
  prose: string,
  packet: ForgePacket,
): ClicheSweepResult {
  let swept = prose;
  let replacements = 0;

  for (const cliche of packet.kill_lists.banned_cliches) {
    const escaped = cliche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = swept.match(regex);
    if (matches) {
      replacements += matches.length;
      swept = swept.replace(regex, '');
    }
  }

  // Also sweep AI patterns
  for (const pattern of packet.kill_lists.banned_ai_patterns) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = swept.match(regex);
    if (matches) {
      replacements += matches.length;
      swept = swept.replace(regex, '');
    }
  }

  // Clean up double spaces
  swept = swept.replace(/  +/g, ' ').replace(/\n /g, '\n').trim();

  // If no replacements, return original prose exactly
  if (replacements === 0) {
    return { swept_prose: prose, nb_replacements: 0 };
  }

  return { swept_prose: swept, nb_replacements: replacements };
}

/**
 * Sweep clichés from prose via surgeonPass().
 * ART-POL-05: Corrections validated via reScoreGuard.
 *
 * @param packet - Forge packet with constraints
 * @param prose - Input prose to sweep
 * @param provider - SovereignProvider for LLM operations
 * @returns Swept prose (or original if no corrections accepted)
 *
 * @remarks
 * Algorithm:
 * 1. Detect clichés via computeClicheDelta (uses blacklist)
 * 2. If clichés detected → call surgeonPass() with reason='cliche'
 * 3. surgeonPass() uses reScoreGuard internally → no regression possible
 * 4. Return modified prose (or original if no corrections accepted)
 *
 * Previous version returned prose unchanged (no-op) to avoid destructive
 * replacement. New version uses surgeonPass() which preserves coherence.
 */
export async function sweepCliches(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<string> {
  const clicheDelta = computeClicheDelta(packet, prose);

  // If no clichés detected, return prose unchanged
  if (clicheDelta.cliche_count === 0) {
    return prose;
  }

  // Create scorer for surgeonPass
  const scorer = async (p: string): Promise<number> => {
    const result = await judgeAestheticV3(packet, p, provider, {}, null);
    return result.composite;
  };

  // Apply surgeonPass to remove clichés
  const config = {
    ...DEFAULT_SURGEON_CONFIG,
    max_corrections_per_pass: 5, // Limit corrections (as per original comment)
    min_improvement: 2.0,
  };

  const result = await surgeonPass(prose, packet, provider, scorer, config);

  return result.prose_after;
}
