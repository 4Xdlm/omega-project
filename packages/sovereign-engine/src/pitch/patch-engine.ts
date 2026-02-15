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
