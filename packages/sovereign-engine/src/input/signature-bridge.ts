/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SIGNATURE BRIDGE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: input/signature-bridge.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Bridges SymbolMap quartile hooks → ForgePacket.style_genome.lexicon.signature_words
 * and SymbolMap quartile hooks → ForgePacket.style_genome.imagery.recurrent_motifs
 *
 * 100% CALC — 0 token — fully deterministic.
 *
 * INV-S-SIGNATURE-BRIDGE-01:
 *   If symbolMap has quartile hooks, enriched packet MUST have signature_words.length > 0
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket } from '../types.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';

/**
 * Extract signature hooks from SymbolMap quartiles and inject into ForgePacket.
 * Returns a NEW packet (immutability preserved).
 *
 * Algorithm:
 * 1. Collect all quartile signature_hooks → dedupe → lowercase → signature_words
 * 2. Collect unique lexical_fields → recurrent_motifs
 * 3. Return enriched packet with non-empty signature_words
 */
export function bridgeSignatureFromSymbolMap(
  packet: ForgePacket,
  symbolMap: SymbolMap,
): ForgePacket {
  // 1. Extract all signature hooks from quartiles
  const allHooks: string[] = [];
  for (const quartile of symbolMap.quartiles) {
    if (quartile.signature_hooks && Array.isArray(quartile.signature_hooks)) {
      for (const hook of quartile.signature_hooks) {
        const normalized = hook.toLowerCase().trim();
        if (normalized.length > 0 && !allHooks.includes(normalized)) {
          allHooks.push(normalized);
        }
      }
    }
  }

  // 2. Extract recurrent motifs from lexical fields (unique across quartiles)
  const allMotifs: string[] = [];
  for (const quartile of symbolMap.quartiles) {
    if (quartile.lexical_fields && Array.isArray(quartile.lexical_fields)) {
      for (const field of quartile.lexical_fields) {
        const normalized = field.toLowerCase().trim();
        if (normalized.length > 0 && !allMotifs.includes(normalized)) {
          allMotifs.push(normalized);
        }
      }
    }
  }

  // 3. Merge with existing signature_words (if any)
  const existingWords = packet.style_genome.lexicon.signature_words.map(
    (w) => w.toLowerCase().trim(),
  );
  const mergedSignatureWords = [...new Set([...existingWords, ...allHooks])];

  // 4. Merge with existing recurrent_motifs (if any)
  const existingMotifs = packet.style_genome.imagery.recurrent_motifs.map(
    (m) => m.toLowerCase().trim(),
  );
  const mergedMotifs = [...new Set([...existingMotifs, ...allMotifs])];

  // 5. Build enriched packet (immutable — new object)
  return {
    ...packet,
    style_genome: {
      ...packet.style_genome,
      lexicon: {
        ...packet.style_genome.lexicon,
        signature_words: mergedSignatureWords,
      },
      imagery: {
        ...packet.style_genome.imagery,
        recurrent_motifs: mergedMotifs,
      },
    },
  };
}
