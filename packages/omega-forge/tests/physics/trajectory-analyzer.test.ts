/**
 * OMEGA Forge — Trajectory Analyzer Tests
 * Phase C.5 — Omega_target(t) vs Omega_actual(t) -> Delta_Omega(t)
 * 14 tests
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeEmotionFromText,
  buildPrescribedTrajectory,
  buildActualTrajectory,
  computeDeviations,
} from '../../src/physics/trajectory-analyzer.js';
import {
  CANONICAL_TABLE,
  DEFAULT_F5_CONFIG,
  INTENT_PACK_A,
  makeParagraph,
} from '../fixtures.js';

const C = 100;

const EMOTION_14_KEYS = [
  'joy', 'trust', 'fear', 'surprise', 'sadness',
  'disgust', 'anger', 'anticipation', 'love', 'submission',
  'awe', 'disapproval', 'remorse', 'contempt',
] as const;

/** Minimal GenesisPlan mock for buildPrescribedTrajectory */
const MOCK_PLAN = {
  plan_id: 'PLAN-001',
  arcs: [],
  scenes: [],
  beats: [],
  seeds: [],
  plan_hash: 'abc123',
  timestamp_deterministic: '2026-02-08T00:00:00.000Z',
} as any;

describe('trajectory-analyzer', () => {
  it('analyzeEmotionFromText: text with fear keywords scores fear', () => {
    const text = 'The dark shadow crept forward, filling him with dread and terror.';
    const state = analyzeEmotionFromText(text);
    expect(state['fear']).toBeGreaterThan(0);
    // Fear should be dominant or at least significant
    let maxKey = 'joy';
    let maxVal = 0;
    for (const key of EMOTION_14_KEYS) {
      if (state[key] > maxVal) {
        maxVal = state[key];
        maxKey = key;
      }
    }
    expect(maxKey).toBe('fear');
  });

  it('analyzeEmotionFromText: text with joy keywords scores joy', () => {
    const text = 'She laughed with delight, her smile radiating warmth and joy.';
    const state = analyzeEmotionFromText(text);
    expect(state['joy']).toBeGreaterThan(0);
  });

  it('analyzeEmotionFromText: no keywords returns zero-ish state', () => {
    const text = 'The table had four legs and a surface.';
    const state = analyzeEmotionFromText(text);
    // All values should be 0 (no keyword matches)
    let total = 0;
    for (const key of EMOTION_14_KEYS) {
      total += state[key];
    }
    expect(total).toBeCloseTo(0, 5);
  });

  it('buildPrescribedTrajectory: builds from waypoints', () => {
    const totalParagraphs = 10;
    const trajectory = buildPrescribedTrajectory(
      INTENT_PACK_A,
      MOCK_PLAN,
      totalParagraphs,
      CANONICAL_TABLE,
      C,
    );
    expect(trajectory.length).toBe(totalParagraphs);
    for (const state of trajectory) {
      expect(state.paragraph_index).toBeGreaterThanOrEqual(0);
      expect(state.target_14d).toBeDefined();
      expect(state.target_omega).toBeDefined();
      expect(state.source).toContain('waypoint_interpolation');
    }
  });

  it('buildActualTrajectory: builds from paragraphs', () => {
    const paragraphs = [
      makeParagraph('The dark shadow filled him with dread.', 0),
      makeParagraph('He smiled with joy and delight.', 1),
      makeParagraph('A quiet moment of trust and faith.', 2),
    ];
    const trajectory = buildActualTrajectory(paragraphs, CANONICAL_TABLE, C);
    expect(trajectory.length).toBe(3);
    for (const state of trajectory) {
      expect(state.paragraph_index).toBeGreaterThanOrEqual(0);
      expect(state.state_14d).toBeDefined();
      expect(state.omega_state).toBeDefined();
      expect(state.paragraph_hash).toBeDefined();
      expect(state.dominant_emotion).toBeDefined();
      expect(typeof state.valence).toBe('number');
      expect(typeof state.arousal).toBe('number');
    }
  });

  it('computeDeviations: all compliant when prescribed equals actual', () => {
    const paragraphs = [
      makeParagraph('fear terror dread', 0),
      makeParagraph('fear terror dread', 1),
    ];
    const actual = buildActualTrajectory(paragraphs, CANONICAL_TABLE, C);
    // Build prescribed that matches actual exactly
    const prescribed = actual.map((a, i) => ({
      paragraph_index: i,
      target_14d: a.state_14d,
      target_omega: a.omega_state,
      source: 'test',
    }));
    const analysis = computeDeviations(prescribed, actual, DEFAULT_F5_CONFIG);
    for (const dev of analysis.deviations) {
      expect(dev.cosine_distance).toBeCloseTo(0, 5);
      expect(dev.euclidean_distance).toBeCloseTo(0, 5);
      expect(dev.compliant).toBe(true);
    }
  });

  it('computeDeviations: some non-compliant when prescribed differs from actual', () => {
    const paragraphs = [
      makeParagraph('fear terror dread dark shadow', 0),
      makeParagraph('joy happy delight smile warmth', 1),
    ];
    const actual = buildActualTrajectory(paragraphs, CANONICAL_TABLE, C);
    // Prescribe the opposite emotions
    const prescribed = [
      {
        paragraph_index: 0,
        target_14d: actual[1].state_14d, // joy prescribed where fear is actual
        target_omega: actual[1].omega_state,
        source: 'test',
      },
      {
        paragraph_index: 1,
        target_14d: actual[0].state_14d, // fear prescribed where joy is actual
        target_omega: actual[0].omega_state,
        source: 'test',
      },
    ];
    const analysis = computeDeviations(prescribed, actual, DEFAULT_F5_CONFIG);
    const nonCompliant = analysis.deviations.filter((d) => !d.compliant);
    expect(nonCompliant.length).toBeGreaterThan(0);
  });

  it('computeDeviations: max_deviation_index identifies worst paragraph', () => {
    const paragraphs = [
      makeParagraph('trust faith believe safe', 0),
      makeParagraph('trust faith believe safe', 1),
      makeParagraph('anger rage fury wrath hostile furious', 2),
    ];
    const actual = buildActualTrajectory(paragraphs, CANONICAL_TABLE, C);
    // Prescribe trust for all — paragraph 2 (anger) should have max deviation
    const prescribed = actual.map((a, i) => ({
      paragraph_index: i,
      target_14d: actual[0].state_14d, // trust for all
      target_omega: actual[0].omega_state,
      source: 'test',
    }));
    const analysis = computeDeviations(prescribed, actual, DEFAULT_F5_CONFIG);
    expect(analysis.max_deviation_index).toBe(2);
  });

  it('computeDeviations: coverage equals paragraph count', () => {
    const paragraphs = [
      makeParagraph('fear dread', 0),
      makeParagraph('joy smile', 1),
      makeParagraph('trust safe', 2),
      makeParagraph('anger rage', 3),
    ];
    const actual = buildActualTrajectory(paragraphs, CANONICAL_TABLE, C);
    const prescribed = actual.map((a, i) => ({
      paragraph_index: i,
      target_14d: a.state_14d,
      target_omega: a.omega_state,
      source: 'test',
    }));
    const analysis = computeDeviations(prescribed, actual, DEFAULT_F5_CONFIG);
    expect(analysis.deviations.length).toBe(4);
    expect(analysis.paragraph_states.length).toBe(4);
  });

  it('computeDeviations: avg distances are computed', () => {
    const paragraphs = [
      makeParagraph('fear dark shadow dread', 0),
      makeParagraph('joy smile delight', 1),
    ];
    const actual = buildActualTrajectory(paragraphs, CANONICAL_TABLE, C);
    const prescribed = actual.map((a, i) => ({
      paragraph_index: i,
      target_14d: a.state_14d,
      target_omega: a.omega_state,
      source: 'test',
    }));
    const analysis = computeDeviations(prescribed, actual, DEFAULT_F5_CONFIG);
    expect(typeof analysis.avg_cosine_distance).toBe('number');
    expect(typeof analysis.avg_euclidean_distance).toBe('number');
    expect(analysis.avg_cosine_distance).toBeGreaterThanOrEqual(0);
    expect(analysis.avg_euclidean_distance).toBeGreaterThanOrEqual(0);
  });

  it('computeDeviations: empty arrays return safe defaults', () => {
    const analysis = computeDeviations([], [], DEFAULT_F5_CONFIG);
    expect(analysis.deviations.length).toBe(0);
    expect(analysis.avg_cosine_distance).toBe(0);
    expect(analysis.avg_euclidean_distance).toBe(0);
    expect(analysis.compliant_ratio).toBe(1);
  });

  it('buildActualTrajectory: single paragraph', () => {
    const paragraphs = [
      makeParagraph('The keeper felt a deep fear creep over him.', 0),
    ];
    const trajectory = buildActualTrajectory(paragraphs, CANONICAL_TABLE, C);
    expect(trajectory.length).toBe(1);
    expect(trajectory[0].paragraph_index).toBe(0);
    expect(trajectory[0].paragraph_hash.length).toBe(64);
  });

  it('computeDeviations: trajectory_hash is stable', () => {
    const paragraphs = [
      makeParagraph('fear terror dread', 0),
      makeParagraph('joy smile delight', 1),
    ];
    const actual = buildActualTrajectory(paragraphs, CANONICAL_TABLE, C);
    const prescribed = actual.map((a, i) => ({
      paragraph_index: i,
      target_14d: a.state_14d,
      target_omega: a.omega_state,
      source: 'test',
    }));
    const a1 = computeDeviations(prescribed, actual, DEFAULT_F5_CONFIG);
    const a2 = computeDeviations(prescribed, actual, DEFAULT_F5_CONFIG);
    expect(a1.trajectory_hash).toBe(a2.trajectory_hash);
    expect(a1.trajectory_hash.length).toBe(64);
  });

  it('determinism: same inputs produce identical outputs', () => {
    const text = 'The dark shadow crept forward with terror and dread.';
    const s1 = analyzeEmotionFromText(text);
    const s2 = analyzeEmotionFromText(text);
    for (const key of EMOTION_14_KEYS) {
      expect(s1[key]).toBe(s2[key]);
    }

    const paragraphs = [
      makeParagraph('fear dread terror', 0),
      makeParagraph('joy delight smile', 1),
    ];
    const t1 = buildActualTrajectory(paragraphs, CANONICAL_TABLE, C);
    const t2 = buildActualTrajectory(paragraphs, CANONICAL_TABLE, C);
    expect(t1.length).toBe(t2.length);
    for (let i = 0; i < t1.length; i++) {
      expect(t1[i].paragraph_hash).toBe(t2[i].paragraph_hash);
      expect(t1[i].omega_state.X).toBe(t2[i].omega_state.X);
    }
  });
});
