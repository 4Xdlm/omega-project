/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — MOCK LLM PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: validation/mock-llm-provider.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Phase VALIDATION — Offline Mock Runner
 *
 * MockLLMProvider: deterministic prose selection + pseudo-random axis scoring.
 * RealLLMProvider: stub (throws in offline mode).
 *
 * INV-VAL-01: Determinism — same seed → same result
 * INV-VAL-03: No network — 0 HTTP calls in offline mode
 * INV-VAL-04: model_id = "offline-mock"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';
import type { ForgePacket } from '../types.js';
import type { LLMProvider } from './validation-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK LLM PROVIDER — 100% OFFLINE, DETERMINISTIC
// ═══════════════════════════════════════════════════════════════════════════════

export class MockLLMProvider implements LLMProvider {
  readonly model_id = 'offline-mock' as const;

  constructor(private readonly corpus: readonly string[]) {
    if (corpus.length === 0) {
      throw new Error('MockLLMProvider: corpus must not be empty');
    }
  }

  /**
   * Selects a prose from the corpus deterministically.
   * Index = parseInt(sha256(seed + packet_id).slice(0, 4), 16) % corpus.length
   * AUCUN appel réseau [INV-VAL-03]
   */
  async generateDraft(packet: ForgePacket, seed: string): Promise<string> {
    const hash = sha256(seed + packet.packet_id);
    const index = parseInt(hash.slice(0, 4), 16) % this.corpus.length;
    return this.corpus[index];
  }

  /**
   * Returns a pseudo-random value in [0, 1] deterministically.
   * Value = parseInt(sha256(axis + seed + prose.slice(0, 32)).slice(0, 8), 16) / 0xFFFFFFFF
   * AUCUN appel réseau [INV-VAL-03]
   */
  async judgeLLMAxis(prose: string, axis: string, seed: string): Promise<number> {
    const hash = sha256(axis + seed + prose.slice(0, 32));
    return parseInt(hash.slice(0, 8), 16) / 0xFFFFFFFF;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL LLM PROVIDER — STUB (NOT IMPLEMENTED)
// ═══════════════════════════════════════════════════════════════════════════════

export class RealLLMProvider implements LLMProvider {
  readonly model_id = 'PENDING_REAL_RUN' as const;

  async generateDraft(_packet: ForgePacket, _seed: string): Promise<string> {
    throw new Error('RealLLMProvider: not implemented in offline mode');
  }

  async judgeLLMAxis(_prose: string, _axis: string, _seed: string): Promise<number> {
    throw new Error('RealLLMProvider: not implemented in offline mode');
  }
}
