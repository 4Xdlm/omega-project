/**
 * Tests for Patch Engine (offline deterministic)
 * Sprint S0-C — TDD
 */

import { describe, it, expect } from 'vitest';
import { applyOfflinePatch } from '../../src/pitch/patch-engine.js';
import type { PatchResult } from '../../src/pitch/patch-engine.js';
import type { PitchStrategy } from '../../src/pitch/triple-pitch-engine.js';
import { PITCH_CATALOG } from '../../src/pitch/triple-pitch-engine.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD, PROSE_BAD } from '../fixtures/mock-prose.js';

const packet = createTestPacket();

const mockStrategy: PitchStrategy = {
  id: 'balanced',
  op_sequence: ['TRIM_CLICHE', 'COMPRESS_VERBOSE', 'VARY_RHYTHM'],
  rationale: 'Clean and tighten',
  pitch_hash: 'a'.repeat(64),
};

describe('Patch Engine (offline)', () => {
  it('T01: applyOfflinePatch retourne prose modifiée non vide', () => {
    const result = applyOfflinePatch(PROSE_GOOD, mockStrategy, packet);

    expect(result.patched_prose).toBeTruthy();
    expect(result.patched_prose.length).toBeGreaterThan(0);
    expect(result.original_prose).toBe(PROSE_GOOD);
  });

  it('T02: patch préserve les beats canoniques [INV-S-POLISH-01]', () => {
    // Beats from packet: 'Character enters the room'
    // Canon: 'Marie has blue eyes'
    // Prose that mentions canon
    const proseWithCanon = PROSE_GOOD + '\nMarie has blue eyes.';
    const strategy: PitchStrategy = {
      id: 'tension',
      op_sequence: ['COMPRESS_VERBOSE'],
      rationale: 'compress',
      pitch_hash: 'b'.repeat(64),
    };

    const result = applyOfflinePatch(proseWithCanon, strategy, packet);

    // Canon statements must be preserved
    expect(result.patched_prose).toContain('Marie has blue eyes');
  });

  it('T03: 0 op hors catalogue dans patch appliqué [INV-S-CATALOG-01]', () => {
    const result = applyOfflinePatch(PROSE_GOOD, mockStrategy, packet);

    for (const op of result.ops_applied) {
      expect((PITCH_CATALOG as readonly string[]).includes(op)).toBe(true);
    }
  });

  it('T04: MÉTAMORPHIQUE — appliquer même patch 2× = résultat identique (idempotence)', () => {
    const r1 = applyOfflinePatch(PROSE_GOOD, mockStrategy, packet);
    const r2 = applyOfflinePatch(PROSE_GOOD, mockStrategy, packet);

    expect(r1.patched_prose).toBe(r2.patched_prose);
    expect(r1.patch_hash).toBe(r2.patch_hash);
  });

  it('T05: patch_hash SHA-256', () => {
    const result = applyOfflinePatch(PROSE_GOOD, mockStrategy, packet);

    expect(result.patch_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
