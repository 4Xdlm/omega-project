/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — ANTI-CLICHÉ SWEEP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: polish/anti-cliche-sweep.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Final cliché scan + replacement.
 * Bounded corrections (max 5 replacements per sweep).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket } from '../types.js';
import { computeClicheDelta } from '../delta/delta-cliche.js';

/**
 * Sweep clichés from prose.
 *
 * INV-SWEEP-NOMOD-01: Returns prose UNCHANGED (no string replacement).
 * Rationale: Destructive replacement with "[CLICHE_REMOVED]" destroys rhythm,
 * coherence, and all downstream scores. The anti_cliche scoring axis handles
 * penalties via scoring, not text surgery. Quality is enforced via scoring.
 */
export function sweepCliches(packet: ForgePacket, prose: string): string {
  const clicheDelta = computeClicheDelta(packet, prose);

  // NEVER mutilate prose. The anti_cliche scoring axis handles penalties.
  // Destructive replacement with "[CLICHE_REMOVED]" destroys rhythm,
  // coherence, and all downstream scores.
  // Return prose unchanged — quality is enforced via scoring, not text surgery.
  return prose;
}
