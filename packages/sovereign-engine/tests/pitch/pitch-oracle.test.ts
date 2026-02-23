/**
 * Tests for pitch oracle (deterministic selection)
 */

import { describe, it, expect } from 'vitest';
import { selectBestPitch, selectBestPitchStrategy } from '../../src/pitch/pitch-oracle.js';
import type { OracleDecision } from '../../src/pitch/pitch-oracle.js';
import type { CorrectionPitch } from '../../src/types.js';
import type { PitchStrategy } from '../../src/pitch/triple-pitch-engine.js';
import { generateDeltaReport } from '../../src/delta/delta-report.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD } from '../fixtures/mock-prose.js';

const mockPitchA: CorrectionPitch = {
  pitch_id: 'A',
  strategy: 'emotional_intensification',
  items: [
    {
      id: '1',
      zone: 'Q1',
      op: 'increase_interiority_signal',
      reason: 'test',
      instruction: 'test',
      expected_gain: { axe: 'interiority', delta: 8 },
    },
  ],
  total_expected_gain: 8,
};

const mockPitchB: CorrectionPitch = {
  pitch_id: 'B',
  strategy: 'structural_rupture',
  items: [
    {
      id: '2',
      zone: 'Q2',
      op: 'add_micro_rupture_event',
      reason: 'test',
      instruction: 'test',
      expected_gain: { axe: 'tension_14d', delta: 10 },
    },
  ],
  total_expected_gain: 10,
};

const mockPitchC: CorrectionPitch = {
  pitch_id: 'C',
  strategy: 'compression_musicality',
  items: [
    {
      id: '3',
      zone: 'Q3',
      op: 'tighten_sentence_rhythm',
      reason: 'test',
      instruction: 'test',
      expected_gain: { axe: 'rhythm', delta: 6 },
    },
  ],
  total_expected_gain: 6,
};

describe('selectBestPitch', () => {
  it('sélectionne le pitch avec le meilleur score pondéré', () => {
    const result = selectBestPitch([mockPitchA, mockPitchB, mockPitchC]);

    // Pitch B should win: tension_14d has weight 3.0, so 10 * 3.0 = 30
    // vs interiority 8 * 2.0 = 16, rhythm 6 * 1.0 = 6
    expect(result.selected_pitch_id).toBe('B');
    expect(result.selection_score).toBeGreaterThan(20);
  });

  it('DÉTERMINISME — mêmes pitches = même sélection', () => {
    const result1 = selectBestPitch([mockPitchA, mockPitchB, mockPitchC]);
    const result2 = selectBestPitch([mockPitchA, mockPitchB, mockPitchC]);
    const result3 = selectBestPitch([mockPitchA, mockPitchB, mockPitchC]);

    expect(result1.selected_pitch_id).toBe(result2.selected_pitch_id);
    expect(result2.selected_pitch_id).toBe(result3.selected_pitch_id);
    expect(result1.selection_score).toBe(result2.selection_score);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint S0-C — PitchStrategy Oracle (offline deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

const mockStratA: PitchStrategy = {
  id: 'emotion',
  op_sequence: ['INTENSIFY_EMOTION', 'DEEPEN_INTERIORITY', 'ANCHOR_BEAT'],
  rationale: 'Emotion-focused',
  pitch_hash: 'a'.repeat(64),
};

const mockStratB: PitchStrategy = {
  id: 'tension',
  op_sequence: ['SHARPEN_TENSION', 'STRENGTHEN_OPENING', 'STRENGTHEN_CLOSING'],
  rationale: 'Tension-focused',
  pitch_hash: 'b'.repeat(64),
};

const mockStratC: PitchStrategy = {
  id: 'balanced',
  op_sequence: ['INTENSIFY_EMOTION', 'VARY_RHYTHM', 'TRIM_CLICHE', 'ADD_SENSORY'],
  rationale: 'Balanced mix',
  pitch_hash: 'c'.repeat(64),
};

const oraclePacket = createTestPacket();
const oracleDelta = generateDeltaReport(oraclePacket, PROSE_GOOD);

describe('selectBestPitchStrategy (Sprint S0-C)', () => {
  it('T01: retourne index 0-2', () => {
    const result = selectBestPitchStrategy(
      [mockStratA, mockStratB, mockStratC],
      oracleDelta,
    );

    expect(result.selected_index).toBeGreaterThanOrEqual(0);
    expect(result.selected_index).toBeLessThanOrEqual(2);
    expect(result.selected_strategy).toBeDefined();
  });

  it('T02: déterminisme — même input → même index [INV-S-ORACLE-01]', () => {
    const r1 = selectBestPitchStrategy([mockStratA, mockStratB, mockStratC], oracleDelta);
    const r2 = selectBestPitchStrategy([mockStratA, mockStratB, mockStratC], oracleDelta);
    const r3 = selectBestPitchStrategy([mockStratA, mockStratB, mockStratC], oracleDelta);

    expect(r1.selected_index).toBe(r2.selected_index);
    expect(r2.selected_index).toBe(r3.selected_index);
    expect(r1.oracle_hash).toBe(r2.oracle_hash);
  });

  it('T03: sélection basée sur score pondéré (émotion×0.63 + craft×0.37)', () => {
    // stratA: 3 emotion ops → 3×0.63 = 1.89, 0 craft → 0
    // stratB: 0 emotion, 3 craft → 3×0.37 = 1.11
    // stratC: 1 emotion (INTENSIFY) + 3 craft → 0.63 + 1.11 = 1.74
    // stratA should win with score 1.89
    const result = selectBestPitchStrategy([mockStratA, mockStratB, mockStratC], oracleDelta);

    expect(result.selected_index).toBe(0);
    expect(result.scores[0]).toBeCloseTo(1.89, 2);
    expect(result.scores[1]).toBeCloseTo(1.11, 2);
    expect(result.scores[2]).toBeCloseTo(1.74, 2);
  });

  it('T04: MÉTAMORPHIQUE — swapper stratégie[0] et stratégie[2] → index suit la valeur', () => {
    const r1 = selectBestPitchStrategy([mockStratA, mockStratB, mockStratC], oracleDelta);
    const r2 = selectBestPitchStrategy([mockStratC, mockStratB, mockStratA], oracleDelta);

    // If stratA was winner at index 0, after swap it should be winner at index 2
    expect(r1.selected_strategy.id).toBe(r2.selected_strategy.id);
    if (r1.selected_index === 0) {
      expect(r2.selected_index).toBe(2);
    } else if (r1.selected_index === 2) {
      expect(r2.selected_index).toBe(0);
    }
  });

  it('T05: oracle_hash SHA-256 traçable', () => {
    const result = selectBestPitchStrategy([mockStratA, mockStratB, mockStratC], oracleDelta);

    expect(result.oracle_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
