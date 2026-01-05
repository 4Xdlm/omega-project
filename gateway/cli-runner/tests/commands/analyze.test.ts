/**
 * OMEGA CLI_RUNNER — Analyze Command Tests
 * Phase 16.0 — NASA-Grade
 */

import { describe, it, expect } from 'vitest';
import { analyzeCommand, analyzeText } from '../../src/cli/commands/analyze.js';
import { parse } from '../../src/cli/parser.js';
import { DEFAULTS, EXIT_CODES } from '../../src/cli/constants.js';

describe('Analyze Command', () => {
  describe('analyzeText()', () => {
    it('should return deterministic results for same input (INV-CLI-03)', () => {
      const text = 'The happy warrior felt joy and trust.';
      
      const result1 = analyzeText(text, DEFAULTS.SEED);
      const result2 = analyzeText(text, DEFAULTS.SEED);
      
      expect(result1.wordCount).toBe(result2.wordCount);
      expect(result1.dominantEmotion).toBe(result2.dominantEmotion);
      expect(result1.overallIntensity).toBe(result2.overallIntensity);
      expect(result1.emotions).toEqual(result2.emotions);
    });

    it('should count words correctly', () => {
      const text = 'One two three four five';
      const result = analyzeText(text, DEFAULTS.SEED);
      
      expect(result.wordCount).toBe(5);
    });

    it('should count sentences correctly', () => {
      const text = 'First sentence. Second sentence! Third?';
      const result = analyzeText(text, DEFAULTS.SEED);
      
      expect(result.sentenceCount).toBe(3);
    });

    it('should detect joy emotion', () => {
      const text = 'I am so happy and filled with joy today!';
      const result = analyzeText(text, DEFAULTS.SEED);
      
      const joyScore = result.emotions.find(e => e.emotion === 'joy');
      expect(joyScore).toBeDefined();
      expect(joyScore!.intensity).toBeGreaterThan(0);
    });

    it('should detect fear emotion', () => {
      const text = 'I am terrified and afraid of the dark.';
      const result = analyzeText(text, DEFAULTS.SEED);
      
      const fearScore = result.emotions.find(e => e.emotion === 'fear');
      expect(fearScore).toBeDefined();
      expect(fearScore!.intensity).toBeGreaterThan(0);
    });

    it('should not match substrings (INV-CORE-02)', () => {
      // "mad" should NOT match in "Madame" or "made"
      const text = 'Madame made a decision.';
      const result = analyzeText(text, DEFAULTS.SEED);
      
      // Should not detect anger from "mad" in "Madame" or "made"
      const angerScore = result.emotions.find(e => e.emotion === 'anger');
      expect(angerScore?.intensity).toBe(0);
    });

    it('should handle empty text', () => {
      const result = analyzeText('', DEFAULTS.SEED);
      
      expect(result.wordCount).toBe(0);
      expect(result.sentenceCount).toBe(0);
    });

    it('should set seed in result', () => {
      const result = analyzeText('test', 42);
      
      expect(result.seed).toBe(42);
    });
  });

  describe('execute()', () => {
    it('should analyze sample text successfully', async () => {
      const args = parse(['analyze', 'sample_text.txt']);
      const result = await analyzeCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(result.output).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should fail without file argument', async () => {
      const args = parse(['analyze']);
      const result = await analyzeCommand.execute(args);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(EXIT_CODES.USAGE);
      expect(result.error).toContain('Missing');
    });

    it('should support JSON output format', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--output', 'json']);
      const result = await analyzeCommand.execute(args);
      
      expect(result.success).toBe(true);
      // Should be valid JSON
      expect(() => JSON.parse(result.output!)).not.toThrow();
    });

    it('should support Markdown output format', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--output', 'md']);
      const result = await analyzeCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('#'); // Markdown headers
    });

    it('should add verbose output when flag is set', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--verbose']);
      const result = await analyzeCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('[VERBOSE]');
    });

    it('should handle file not found', async () => {
      const args = parse(['analyze', 'error_file.txt']);
      const result = await analyzeCommand.execute(args);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error');
    });
  });
});
