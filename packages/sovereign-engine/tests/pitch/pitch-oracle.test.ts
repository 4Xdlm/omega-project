/**
 * Tests for pitch oracle (deterministic selection)
 */

import { describe, it, expect } from 'vitest';
import { selectBestPitch } from '../../src/pitch/pitch-oracle.js';
import type { CorrectionPitch } from '../../src/types.js';

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
