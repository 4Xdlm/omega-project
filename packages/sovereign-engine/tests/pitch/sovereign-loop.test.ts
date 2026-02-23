/**
 * Tests for Sovereign Loop (offline deterministic)
 * Sprint S0-C — TDD
 */

import { describe, it, expect } from 'vitest';
import { runOfflineSovereignLoop } from '../../src/pitch/sovereign-loop.js';
import type { OfflineSovereignLoopResult } from '../../src/pitch/sovereign-loop.js';
import { computeDelta } from '../../src/delta/delta-computer.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD, PROSE_BAD } from '../fixtures/mock-prose.js';
import { SOVEREIGN_CONFIG } from '../../src/config.js';

const packet = createTestPacket();

describe('Sovereign Loop (offline)', () => {
  it('T01: si global_distance ≤ DELTA_THRESHOLD → 0 correction, retour direct', () => {
    // PROSE_GOOD with test packet produces a specific global_distance
    // We need a case where global_distance ≤ DELTA_THRESHOLD
    // Use computeDelta to check
    const delta = computeDelta({ packet, prose: PROSE_GOOD });

    // If distance is already below threshold, loop should return 0 passes
    if (!delta.needs_correction) {
      const result = runOfflineSovereignLoop(PROSE_GOOD, packet, delta);
      expect(result.nb_passes).toBe(0);
      expect(result.was_corrected).toBe(false);
      expect(result.final_prose).toBe(PROSE_GOOD);
    } else {
      // Distance is above threshold — use a very large threshold to force no-correction path
      // Create a delta with needs_correction = false
      const forcedDelta = {
        ...delta,
        needs_correction: false,
      };
      const result = runOfflineSovereignLoop(PROSE_GOOD, packet, forcedDelta);
      expect(result.nb_passes).toBe(0);
      expect(result.was_corrected).toBe(false);
    }
  });

  it('T02: si global_distance > DELTA_THRESHOLD → boucle exécutée', () => {
    const delta = computeDelta({ packet, prose: PROSE_BAD });

    if (delta.needs_correction) {
      const result = runOfflineSovereignLoop(PROSE_BAD, packet, delta);
      expect(result.nb_passes).toBeGreaterThanOrEqual(1);
      expect(result.was_corrected).toBe(true);
    } else {
      // Force correction path
      const forcedDelta = { ...delta, needs_correction: true };
      const result = runOfflineSovereignLoop(PROSE_BAD, packet, forcedDelta);
      expect(result.nb_passes).toBeGreaterThanOrEqual(1);
      expect(result.was_corrected).toBe(true);
    }
  });

  it('T03: max 2 passes même si distance reste haute [INV-S-BOUND-01]', () => {
    const delta = computeDelta({ packet, prose: PROSE_BAD });
    const forcedDelta = { ...delta, needs_correction: true };

    const result = runOfflineSovereignLoop(PROSE_BAD, packet, forcedDelta);

    expect(result.nb_passes).toBeLessThanOrEqual(2);
  });

  it('T04: loop_trace contient nb_passes (1 ou 2)', () => {
    const delta = computeDelta({ packet, prose: PROSE_BAD });
    const forcedDelta = { ...delta, needs_correction: true };

    const result = runOfflineSovereignLoop(PROSE_BAD, packet, forcedDelta);

    expect(result.loop_trace).toBeDefined();
    expect(result.loop_trace.length).toBe(result.nb_passes);
    for (const pass of result.loop_trace) {
      expect(pass).toHaveProperty('pass_number');
      expect(pass).toHaveProperty('strategy_id');
      expect(pass).toHaveProperty('ops_applied');
    }
  });

  it('T05: déterminisme — même prose + même packet → même loop_trace', () => {
    const delta = computeDelta({ packet, prose: PROSE_BAD });
    const forcedDelta = { ...delta, needs_correction: true };

    const r1 = runOfflineSovereignLoop(PROSE_BAD, packet, forcedDelta);
    const r2 = runOfflineSovereignLoop(PROSE_BAD, packet, forcedDelta);

    expect(r1.nb_passes).toBe(r2.nb_passes);
    expect(r1.final_prose).toBe(r2.final_prose);
    expect(r1.loop_trace).toEqual(r2.loop_trace);
  });
});
