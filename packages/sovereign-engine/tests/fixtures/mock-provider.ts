/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — MOCK SOVEREIGN PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/fixtures/mock-provider.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Mock implementation of SovereignProvider for testing.
 * Returns fixed scores for deterministic test execution.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider, CorrectionPitch } from '../../src/types.js';

export class MockSovereignProvider implements SovereignProvider {
  private interiorityScore = 75;
  private sensoryDensityScore = 75;
  private necessityScore = 75;
  private impactScore = 75;

  setInteriorityScore(score: number): void {
    this.interiorityScore = score;
  }

  setSensoryDensityScore(score: number): void {
    this.sensoryDensityScore = score;
  }

  setNecessityScore(score: number): void {
    this.necessityScore = score;
  }

  setImpactScore(score: number): void {
    this.impactScore = score;
  }

  async scoreInteriority(
    _prose: string,
    _context: { readonly pov: string; readonly character_state: string },
  ): Promise<number> {
    return this.interiorityScore;
  }

  async scoreSensoryDensity(
    _prose: string,
    _sensory_counts: Record<string, number>,
  ): Promise<number> {
    return this.sensoryDensityScore;
  }

  async scoreNecessity(_prose: string, _beat_count: number, _beat_actions?: string, _scene_goal?: string, _conflict_type?: string): Promise<number> {
    return this.necessityScore;
  }

  async scoreImpact(
    _opening: string,
    _closing: string,
    _context: { readonly story_premise: string },
  ): Promise<number> {
    return this.impactScore;
  }

  async applyPatch(
    prose: string,
    _pitch: CorrectionPitch,
    _constraints: { readonly canon: readonly string[]; readonly beats: readonly string[] },
  ): Promise<string> {
    return prose + ' [PATCHED]';
  }

  async generateDraft(_prompt: string, _mode: string, _seed: string): Promise<string> {
    return 'Mock draft prose generated with specified mode.';
  }

  async generateStructuredJSON(_prompt: string): Promise<unknown> {
    return {
      joy: 0.5,
      trust: 0.5,
      fear: 0.5,
      surprise: 0.5,
      sadness: 0.5,
      disgust: 0.5,
      anger: 0.5,
      anticipation: 0.5,
      love: 0.5,
      submission: 0.5,
      awe: 0.5,
      disapproval: 0.5,
      remorse: 0.5,
      contempt: 0.5,
    };
  }

  async rewriteSentence(
    sentence: string,
    reason: string,
    _context: { readonly prev_sentence: string; readonly next_sentence: string },
  ): Promise<string> {
    // Deterministic mock: prefix with correction marker
    // Length stays within ±20% (marker is short)
    return `[CORR:${reason}] ${sentence}`;
  }
}
