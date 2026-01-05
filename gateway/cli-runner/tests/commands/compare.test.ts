/**
 * OMEGA CLI_RUNNER — Compare Command Tests
 * Phase 16.0 — NASA-Grade
 */

import { describe, it, expect } from 'vitest';
import { compareCommand, calculateSimilarity } from '../../src/cli/commands/compare.js';
import { analyzeText } from '../../src/cli/commands/analyze.js';
import { parse } from '../../src/cli/parser.js';
import { EXIT_CODES, DEFAULTS } from '../../src/cli/constants.js';

describe('Compare Command', () => {
  describe('calculateSimilarity()', () => {
    it('should return 1 for identical texts', () => {
      const text = 'The happy joyful day was wonderful.';
      const result1 = analyzeText(text, DEFAULTS.SEED);
      const result2 = analyzeText(text, DEFAULTS.SEED);
      
      const similarity = calculateSimilarity(result1, result2);
      
      expect(similarity).toBe(1);
    });

    it('should return similarity between 0 and 1', () => {
      const text1 = 'I am happy and joyful!';
      const text2 = 'I am sad and melancholy.';
      
      const result1 = analyzeText(text1, DEFAULTS.SEED);
      const result2 = analyzeText(text2, DEFAULTS.SEED);
      
      const similarity = calculateSimilarity(result1, result2);
      
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should handle empty emotion scores', () => {
      const text1 = '';
      const text2 = '';
      
      const result1 = analyzeText(text1, DEFAULTS.SEED);
      const result2 = analyzeText(text2, DEFAULTS.SEED);
      
      const similarity = calculateSimilarity(result1, result2);
      
      expect(similarity).toBe(0); // Both have zero intensity
    });
  });

  describe('execute()', () => {
    it('should compare two files successfully', async () => {
      const args = parse(['compare', 'sample_text.txt', 'sample_text_2.txt']);
      const result = await compareCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(result.output).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should fail with only one file', async () => {
      const args = parse(['compare', 'sample_text.txt']);
      const result = await compareCommand.execute(args);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(EXIT_CODES.USAGE);
      expect(result.error).toContain('Missing');
    });

    it('should fail with no files', async () => {
      const args = parse(['compare']);
      const result = await compareCommand.execute(args);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    });

    it('should support JSON output', async () => {
      const args = parse(['compare', 'sample_text.txt', 'sample_text_2.txt', '--output', 'json']);
      const result = await compareCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.output!)).not.toThrow();
    });

    it('should support Markdown output', async () => {
      const args = parse(['compare', 'sample_text.txt', 'sample_text_2.txt', '--output', 'md']);
      const result = await compareCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('# Comparaison');
    });

    it('should include similarity score', async () => {
      const args = parse(['compare', 'sample_text.txt', 'sample_text_2.txt']);
      const result = await compareCommand.execute(args);
      
      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.output!);
      expect(parsed.similarity).toBeDefined();
      expect(typeof parsed.similarity).toBe('number');
    });
  });
});
