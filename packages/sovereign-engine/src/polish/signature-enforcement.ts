/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SIGNATURE ENFORCEMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: polish/signature-enforcement.ts
 * Version: 2.0.0 (Sprint 10 Commit 10.6)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-POL-06
 *
 * Final signature conformity check via surgeonPass().
 * Micro-corrections for signature word injection if hit rate < threshold.
 * All corrections validated via reScoreGuard.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignProvider } from '../types.js';
import { computeStyleDelta } from '../delta/delta-style.js';
import { SOVEREIGN_CONFIG } from '../config.js';
import { surgeonPass, DEFAULT_SURGEON_CONFIG } from './sentence-surgeon.js';
import { judgeAestheticV3 } from '../oracle/aesthetic-oracle.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint S2 — Offline Signature Enforcer (deterministic, 0 LLM) [INV-S-GENOME-01]
// ═══════════════════════════════════════════════════════════════════════════════

export interface SignatureEnforcementResult {
  readonly enforced_prose: string;
  readonly enforced: boolean;
}

/**
 * OFFLINE deterministic signature enforcement.
 * Checks if ≥1 genome marker is present. If not, appends signature note.
 *
 * OFFLINE-HEURISTIC: No LLM involved.
 */
export function enforceSignatureOffline(
  prose: string,
  packet: ForgePacket,
): SignatureEnforcementResult {
  const signatureWords = packet.style_genome.lexicon.signature_words;
  if (signatureWords.length === 0) {
    return { enforced_prose: prose, enforced: false };
  }

  const proseLower = prose.toLowerCase();
  const hasMarker = signatureWords.some((w) => proseLower.includes(w.toLowerCase()));

  if (hasMarker) {
    return { enforced_prose: prose, enforced: false };
  }

  // No marker found — append first signature word as sensory note
  const marker = signatureWords[0];
  const enforcedProse = prose.trimEnd() + `\n\n[Signature: ${marker}]`;

  return { enforced_prose: enforcedProse, enforced: true };
}

/**
 * Enforce signature word density via surgeonPass().
 * ART-POL-06: Corrections validated via reScoreGuard.
 *
 * @param packet - Forge packet with constraints
 * @param prose - Input prose to enforce
 * @param provider - SovereignProvider for LLM operations
 * @returns Enforced prose (or original if no corrections accepted)
 *
 * @remarks
 * Algorithm:
 * 1. Measure signature_hit_rate via computeStyleDelta
 * 2. If hit_rate < threshold → call surgeonPass() with reason='signature'
 * 3. surgeonPass() uses reScoreGuard internally → no regression possible
 * 4. Return modified prose (or original if no corrections accepted)
 */
export async function enforceSignature(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<string> {
  const styleDelta = computeStyleDelta(packet, prose);

  // If signature hit rate is sufficient, return prose unchanged
  if (styleDelta.signature_hit_rate >= SOVEREIGN_CONFIG.SIGNATURE_HIT_RATE_MIN) {
    return prose;
  }

  // Create scorer for surgeonPass
  const scorer = async (p: string): Promise<number> => {
    const result = await judgeAestheticV3(packet, p, provider, {}, null);
    return result.composite;
  };

  // Apply surgeonPass to inject signature words
  const config = {
    ...DEFAULT_SURGEON_CONFIG,
    max_corrections_per_pass: 5, // Limit corrections
    min_improvement: 2.0,
  };

  const result = await surgeonPass(prose, packet, provider, scorer, config);

  return result.prose_after;
}
