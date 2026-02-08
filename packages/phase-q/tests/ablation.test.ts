import { describe, it, expect } from 'vitest';
import { segmentOutput, generateAblations, evaluateNecessity, checkNecessityRatio } from '../src/ablation.js';

describe('Phase Q — Ablation (Q-INV-02)', () => {
  describe('segmentOutput', () => {
    it('should split on double newline', () => {
      const output = 'Segment one.\n\nSegment two.\n\nSegment three.';
      const segments = segmentOutput(output);
      expect(segments).toHaveLength(3);
      expect(segments[0]!.content).toBe('Segment one.');
      expect(segments[1]!.content).toBe('Segment two.');
      expect(segments[2]!.content).toBe('Segment three.');
    });

    it('should assign sequential indices', () => {
      const output = 'A\n\nB\n\nC';
      const segments = segmentOutput(output);
      expect(segments.map(s => s.index)).toEqual([0, 1, 2]);
    });

    it('should skip empty segments', () => {
      const output = 'A\n\n\n\nB';
      const segments = segmentOutput(output);
      expect(segments).toHaveLength(2);
    });

    it('should handle single segment', () => {
      const segments = segmentOutput('Single block of text');
      expect(segments).toHaveLength(1);
    });

    it('should handle empty string', () => {
      const segments = segmentOutput('');
      expect(segments).toHaveLength(0);
    });
  });

  describe('generateAblations', () => {
    it('should generate N ablations for N segments', () => {
      const segments = segmentOutput('A\n\nB\n\nC');
      const ablations = generateAblations(segments);
      expect(ablations).toHaveLength(3);
    });

    it('should remove one segment at a time', () => {
      const segments = segmentOutput('A\n\nB\n\nC');
      const ablations = generateAblations(segments);
      expect(ablations[0]!.ablatedIndex).toBe(0);
      expect(ablations[0]!.remainingOutput).toBe('B\n\nC');
      expect(ablations[1]!.ablatedIndex).toBe(1);
      expect(ablations[1]!.remainingOutput).toBe('A\n\nC');
    });

    it('should produce deterministic results', () => {
      const segments = segmentOutput('X\n\nY\n\nZ');
      const run1 = generateAblations(segments);
      const run2 = generateAblations(segments);
      expect(run1).toEqual(run2);
    });
  });

  describe('evaluateNecessity', () => {
    it('should mark segment as necessary when removing it loses a property', () => {
      const output = 'The system is valid.\n\nThe system is correct.';
      const segments = segmentOutput(output);
      const ablation = { ablatedIndex: 0, remainingOutput: 'The system is correct.' };
      const result = evaluateNecessity(output, ablation, ['valid', 'correct'], segments);

      expect(result.is_necessary).toBe(true);
      expect(result.properties_lost).toContain('valid');
    });

    it('should mark segment as unnecessary when no property is lost', () => {
      const output = 'The system is valid.\n\nThe system is also valid and correct.';
      const segments = segmentOutput(output);
      const ablation = { ablatedIndex: 0, remainingOutput: 'The system is also valid and correct.' };
      const result = evaluateNecessity(output, ablation, ['valid', 'correct'], segments);

      expect(result.is_necessary).toBe(false);
    });
  });

  describe('checkNecessityRatio', () => {
    it('should pass when all segments are necessary', () => {
      const results = [
        { original_segments: [], ablated_index: 0, remaining_output: '', properties_preserved: [], properties_lost: ['a'], is_necessary: true },
        { original_segments: [], ablated_index: 1, remaining_output: '', properties_preserved: [], properties_lost: ['b'], is_necessary: true },
      ];
      const { passed, ratio } = checkNecessityRatio(results, 0.85);
      expect(passed).toBe(true);
      expect(ratio).toBe(1);
    });

    it('should fail when too many segments are unnecessary', () => {
      const results = [
        { original_segments: [], ablated_index: 0, remaining_output: '', properties_preserved: [], properties_lost: [], is_necessary: false },
        { original_segments: [], ablated_index: 1, remaining_output: '', properties_preserved: [], properties_lost: [], is_necessary: false },
        { original_segments: [], ablated_index: 2, remaining_output: '', properties_preserved: [], properties_lost: ['a'], is_necessary: true },
      ];
      const { passed, ratio, unnecessarySegments } = checkNecessityRatio(results, 0.85);
      expect(passed).toBe(false);
      expect(ratio).toBeCloseTo(1 / 3, 2);
      expect(unnecessarySegments).toEqual([0, 1]);
    });

    it('should pass for empty results', () => {
      const { passed, ratio } = checkNecessityRatio([], 0.85);
      expect(passed).toBe(true);
      expect(ratio).toBe(1);
    });
  });
});
