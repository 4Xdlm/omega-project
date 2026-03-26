/**
 * Tests: Best-of-N Selector
 * Validates: early exit, max attempts, selection logic, defaults
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateBestOfN,
  selectionScore,
  DEFAULT_CONFIG,
  type BestOfNConfig,
  type BrickResult,
} from '../../src/assembly/best-of-n.js';

// Mock the engine to avoid real pipeline calls
vi.mock('../../src/engine.js', () => ({
  runSovereignForgeWithPacket: vi.fn(),
}));

import { runSovereignForgeWithPacket } from '../../src/engine.js';
const mockForge = vi.mocked(runSovereignForgeWithPacket);

beforeEach(() => {
  vi.useFakeTimers();
  mockForge.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

// ═══ HELPERS ═══

function makeFakeForgeResult(composite: number, min_axis: number, ecc = 90, rci = 85, sii = 85, ifi = 90, aai = 90) {
  return {
    version: '2.0.0' as const,
    final_prose: `Prose with composite=${composite} and min=${min_axis}. Words here to count.`,
    s_score: {} as any,
    macro_score: {
      score_id: 'test',
      score_hash: 'a'.repeat(64),
      scene_id: 'test',
      seed: 'test',
      composite,
      min_axis,
      verdict: composite >= 92 ? 'SEAL' as const : 'REJECT' as const,
      ecc_score: ecc,
      emotion_weight_pct: 33,
      macro_axes: {
        ecc: { score: ecc, weight_pct: 33, sub_scores: [], reasons: { top_contributors: [], top_penalties: [] } },
        rci: { score: rci, weight_pct: 17, sub_scores: [], reasons: { top_contributors: [], top_penalties: [] } },
        sii: { score: sii, weight_pct: 15, sub_scores: [], reasons: { top_contributors: [], top_penalties: [] } },
        ifi: { score: ifi, weight_pct: 10, sub_scores: [], reasons: { top_contributors: [], top_penalties: [] } },
        aai: { score: aai, weight_pct: 25, sub_scores: [], reasons: { top_contributors: [], top_penalties: [] } },
      },
    },
    verdict: composite >= 92 ? 'SEAL' as const : 'REJECT' as const,
    loop_result: {} as any,
    passes_executed: 3,
  };
}

const MOCK_PACKET = {} as any;
const MOCK_PROVIDER = {} as any;

describe('Best-of-N Selector', () => {
  it('BestOfNConfig defaults are correct', () => {
    expect(DEFAULT_CONFIG.max_attempts).toBe(3);
    expect(DEFAULT_CONFIG.early_exit_composite).toBe(92.0);
    expect(DEFAULT_CONFIG.early_exit_min_axis).toBe(85.0);
  });

  it('selectionScore penalizes low min_axis', () => {
    // min_axis >= 85 → no penalty
    expect(selectionScore(90, 90)).toBe(90);
    expect(selectionScore(90, 85)).toBe(90);

    // min_axis < 85 → penalty = 1.5 * (85 - min_axis)
    expect(selectionScore(90, 80)).toBe(90 - 1.5 * 5); // 82.5
    expect(selectionScore(90, 70)).toBe(90 - 1.5 * 15); // 67.5
  });

  it('generateBestOfN returns early on SAGA_READY', async () => {
    mockForge
      .mockResolvedValueOnce(makeFakeForgeResult(88, 82))  // attempt 1: not saga
      .mockResolvedValueOnce(makeFakeForgeResult(93, 87)); // attempt 2: saga!

    const promise = generateBestOfN(MOCK_PACKET, MOCK_PROVIDER, {
      ...DEFAULT_CONFIG,
      max_attempts: 3,
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.early_exit).toBe(true);
    expect(result.attempts).toBe(2);
    expect(result.selection_reason).toBe('saga_ready');
    expect(result.winner.composite).toBe(93);
    expect(result.winner.saga_ready).toBe(true);
    expect(result.all_candidates).toHaveLength(2);
    // 3rd attempt NOT called
    expect(mockForge).toHaveBeenCalledTimes(2);
  });

  it('generateBestOfN tries max_attempts when no SAGA_READY', async () => {
    mockForge
      .mockResolvedValueOnce(makeFakeForgeResult(88, 82))
      .mockResolvedValueOnce(makeFakeForgeResult(90, 84))
      .mockResolvedValueOnce(makeFakeForgeResult(89, 83));

    const promise = generateBestOfN(MOCK_PACKET, MOCK_PROVIDER, {
      ...DEFAULT_CONFIG,
      max_attempts: 3,
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.early_exit).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.selection_reason).toBe('best_composite');
    expect(result.all_candidates).toHaveLength(3);
    expect(mockForge).toHaveBeenCalledTimes(3);
  });

  it('generateBestOfN selects best composite when no SAGA_READY', async () => {
    // Candidate 2 has best selection_score (90 - 1.5*1 = 88.5)
    // Candidate 1: 88 - 1.5*3 = 83.5
    // Candidate 3: 91 - 1.5*5 = 83.5
    mockForge
      .mockResolvedValueOnce(makeFakeForgeResult(88, 82))  // score=83.5
      .mockResolvedValueOnce(makeFakeForgeResult(90, 84))  // score=88.5 ← winner
      .mockResolvedValueOnce(makeFakeForgeResult(91, 80)); // score=83.5

    const promise = generateBestOfN(MOCK_PACKET, MOCK_PROVIDER);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.winner.composite).toBe(90);
    expect(result.winner.min_axis).toBe(84);
    expect(result.selection_reason).toBe('best_composite');
  });

  it('generateBestOfN returns all_candidates array', async () => {
    mockForge
      .mockResolvedValueOnce(makeFakeForgeResult(85, 80))
      .mockResolvedValueOnce(makeFakeForgeResult(87, 81))
      .mockResolvedValueOnce(makeFakeForgeResult(86, 79));

    const promise = generateBestOfN(MOCK_PACKET, MOCK_PROVIDER);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.all_candidates).toHaveLength(3);
    expect(result.all_candidates[0].composite).toBe(85);
    expect(result.all_candidates[1].composite).toBe(87);
    expect(result.all_candidates[2].composite).toBe(86);
  });

  it('generateBestOfN first attempt SAGA_READY → attempts=1', async () => {
    mockForge.mockResolvedValueOnce(makeFakeForgeResult(95, 90));

    const promise = generateBestOfN(MOCK_PACKET, MOCK_PROVIDER);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.early_exit).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.all_candidates).toHaveLength(1);
    expect(mockForge).toHaveBeenCalledTimes(1);
  });
});
