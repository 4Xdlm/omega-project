/**
 * delta-compressor.test.ts — Tests P2 : Delta Compressor
 * Sprint P2 — V-PARTITION v3.0.0
 *
 * INV-DC-01 : CompressedDelta.token_count ≤ 60
 * 10 tests — 100% CALC — 0 appel LLM.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import {
  compressDelta,
  applyCompressedDelta,
  COMPRESSED_DELTA_TOKEN_MAX,
  type CompressedDelta,
} from '../../src/cde/delta-compressor.js';
import {
  PATHOLOGICAL_SCENE_1,
  PATHOLOGICAL_SCENE_2,
  PATHOLOGICAL_CHAIN,
} from '../bench/pathological-scenes.test.js';
import type { CDEInput, StateDelta } from '../../src/cde/types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SIMPLE_CDE: CDEInput = {
  hot_elements: [
    { id: 'tension-1', type: 'tension', priority: 8, content: 'La tension monte entre les deux personnages' },
  ],
  canon_facts: [
    { id: 'cf-1', fact: 'Le lieu est une cuisine', sealed_at: '2026-01-01T00:00:00Z' },
  ],
  open_debts: [
    { id: 'd-1', content: 'Un secret non revele', opened_at: 'ch-1', resolved: false },
  ],
  arc_states: [
    {
      character_id: 'A',
      arc_phase: 'confrontation',
      current_need: 'verite',
      current_mask: 'calme',
      tension: 'peur vs courage',
    },
  ],
  scene_objective: 'A confronte B sur le secret',
};

const SIMPLE_DELTA: StateDelta = {
  new_facts: ['B a avoue le secret'],
  modified_facts: [],
  debts_opened: [{ content: 'A doit decider quoi faire', evidence: 'aveu' }],
  debts_resolved: [{ id: 'd-1', evidence: 'B a tout dit' }],
  arc_movements: [{ character_id: 'A', movement: 'de la colere vers le pardon' }],
  drift_flags: [],
  prose_hash: 'hash-test',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('P2 — Delta Compressor', () => {

  // ── INV-DC-01 : token_count ≤ 60 ────────────────────────────────────────

  it('INV-DC-01: simple delta → token_count ≤ 60', () => {
    const compressed = compressDelta(SIMPLE_CDE, SIMPLE_DELTA, 1);
    expect(compressed.token_count).toBeLessThanOrEqual(COMPRESSED_DELTA_TOKEN_MAX);
    expect(compressed.token_count).toBeGreaterThan(0);
  });

  it('INV-DC-01: pathological scene 1 → token_count ≤ 60', () => {
    const compressed = compressDelta(
      PATHOLOGICAL_SCENE_1,
      PATHOLOGICAL_CHAIN.delta,
      1,
    );
    expect(compressed.token_count).toBeLessThanOrEqual(COMPRESSED_DELTA_TOKEN_MAX);
  });

  it('INV-DC-01: pathological scene 2 → token_count ≤ 60', () => {
    const compressed = compressDelta(
      PATHOLOGICAL_SCENE_2,
      PATHOLOGICAL_CHAIN.delta,
      1,
    );
    expect(compressed.token_count).toBeLessThanOrEqual(COMPRESSED_DELTA_TOKEN_MAX);
  });

  it('INV-DC-01: chain delta → token_count ≤ 60', () => {
    const compressed = compressDelta(
      PATHOLOGICAL_CHAIN.initial,
      PATHOLOGICAL_CHAIN.delta,
      1,
    );
    expect(compressed.token_count).toBeLessThanOrEqual(COMPRESSED_DELTA_TOKEN_MAX);
  });

  // ── Structure ──────────────────────────────────────────────────────────────

  it('CompressedDelta has all 4 fields + token_count + scene_index', () => {
    const compressed = compressDelta(SIMPLE_CDE, SIMPLE_DELTA, 1);
    expect(compressed.active_truth).toBeDefined();
    expect(compressed.tension).toBeDefined();
    expect(compressed.debt).toBeDefined();
    expect(compressed.narrative_vector).toBeDefined();
    expect(compressed.token_count).toBeDefined();
    expect(compressed.scene_index).toBe(1);
  });

  it('active_truth contains new facts from delta', () => {
    const compressed = compressDelta(SIMPLE_CDE, SIMPLE_DELTA, 1);
    expect(compressed.active_truth).toContain('B a avoue');
  });

  it('tension captures highest-priority tension element', () => {
    const compressed = compressDelta(SIMPLE_CDE, SIMPLE_DELTA, 1);
    expect(compressed.tension.length).toBeGreaterThan(0);
    expect(compressed.tension).toContain('tension');
  });

  it('debt captures unresolved debts from delta', () => {
    const compressed = compressDelta(SIMPLE_CDE, SIMPLE_DELTA, 1);
    // d-1 is resolved, new debt opened
    expect(compressed.debt).toContain('decider');
  });

  // ── Apply ──────────────────────────────────────────────────────────────────

  it('applyCompressedDelta produces valid CDEInput', () => {
    const compressed = compressDelta(SIMPLE_CDE, SIMPLE_DELTA, 1);
    const next = applyCompressedDelta(SIMPLE_CDE, compressed);

    expect(next.hot_elements.length).toBeGreaterThan(0);
    expect(next.canon_facts.length).toBeGreaterThan(0);
    expect(next.scene_objective).toBe(SIMPLE_CDE.scene_objective);
    expect(next.arc_states).toEqual(SIMPLE_CDE.arc_states);
  });

  it('applyCompressedDelta does NOT accumulate — hot_elements reset', () => {
    const compressed = compressDelta(SIMPLE_CDE, SIMPLE_DELTA, 1);
    const next = applyCompressedDelta(SIMPLE_CDE, compressed);

    // hot_elements should be from compressed data, not accumulated
    const originalHotIds = SIMPLE_CDE.hot_elements.map(h => h.id);
    const nextHotIds = next.hot_elements.map(h => h.id);
    // No original IDs should carry over (compressed replaces them)
    for (const origId of originalHotIds) {
      expect(nextHotIds).not.toContain(origId);
    }
  });
});
