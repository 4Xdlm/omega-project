/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PATCH ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: pitch/patch-engine.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Applies selected pitch to prose via SovereignProvider.
 * Delegates to LLM with structured corrections.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider, CorrectionPitch, ForgePacket } from '../types.js';
import type { PitchStrategy, PitchOp } from './triple-pitch-engine.js';
import { sha256, canonicalize } from '@omega/canon-kernel';

export async function applyPatch(
  prose: string,
  pitch: CorrectionPitch,
  packet: ForgePacket,
  provider: SovereignProvider,
): Promise<string> {
  const constraints = {
    canon: packet.canon.map((c) => c.statement),
    beats: packet.beats.map((b) => b.action),
  };

  const patchedProse = await provider.applyPatch(prose, pitch, constraints);

  return patchedProse;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint S0-C — Offline Patch Engine (deterministic, 0 LLM)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PatchResult {
  readonly original_prose: string;
  readonly patched_prose: string;
  readonly ops_applied: readonly PitchOp[];
  readonly patch_hash: string;
}

/**
 * OFFLINE deterministic patch application.
 * - TRIM_CLICHE: removes banned_cliches matches from kill_lists
 * - COMPRESS_VERBOSE: removes common filter words
 * - Other ops: prose unchanged (annotation-only in offline mode)
 *
 * OFFLINE-HEURISTIC: No LLM involved. Text transformations are regex-based.
 */
export function applyOfflinePatch(
  prose: string,
  strategy: PitchStrategy,
  packet: ForgePacket,
): PatchResult {
  let patched = prose;
  const opsApplied: PitchOp[] = [];

  for (const op of strategy.op_sequence) {
    switch (op) {
      case 'TRIM_CLICHE': {
        // Remove banned clichés from kill_lists
        for (const cliche of packet.kill_lists.banned_cliches) {
          const escaped = cliche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escaped, 'gi');
          patched = patched.replace(regex, '');
        }
        opsApplied.push('TRIM_CLICHE');
        break;
      }
      case 'COMPRESS_VERBOSE': {
        // Remove filter words from kill_lists
        for (const fw of packet.kill_lists.banned_filter_words) {
          const escaped = fw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escaped, 'gi');
          patched = patched.replace(regex, '');
        }
        opsApplied.push('COMPRESS_VERBOSE');
        break;
      }
      default: {
        // Other ops: no-op in offline mode (would require LLM)
        opsApplied.push(op);
        break;
      }
    }
  }

  // Clean up double spaces from removals
  patched = patched.replace(/  +/g, ' ').replace(/\n /g, '\n').trim();

  const hashable = {
    original_hash: sha256(prose),
    patched_hash: sha256(patched),
    ops: opsApplied,
  };

  return {
    original_prose: prose,
    patched_prose: patched,
    ops_applied: opsApplied,
    patch_hash: sha256(canonicalize(hashable)),
  };
}
