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

  // ==========================================================================
  // NDJSON STREAMING TESTS (Chapter 24)
  // ==========================================================================

  describe('NDJSON streaming (--stream)', () => {
    it('should produce NDJSON output with --stream flag', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--stream']);
      const result = await analyzeCommand.execute(args);

      expect(result.success).toBe(true);
      // NDJSON = newline-delimited JSON
      const lines = result.output!.split('\n').filter(l => l.trim());
      expect(lines.length).toBeGreaterThan(0);

      // Each line should be valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it('should include schema event as first event', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--stream']);
      const result = await analyzeCommand.execute(args);

      const lines = result.output!.split('\n').filter(l => l.trim());
      const firstEvent = JSON.parse(lines[0]);

      expect(firstEvent.type).toBe('schema');
      expect(firstEvent.version).toBe('1.2.0');
      expect(firstEvent.tool).toBe('omega');
      expect(firstEvent.format).toBe('ndjson');
    });

    it('should include all 12 event types in full stream', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--stream']);
      const result = await analyzeCommand.execute(args);

      const lines = result.output!.split('\n').filter(l => l.trim());
      const types = lines.map(l => JSON.parse(l).type);

      // Core event types (excluding artifacts/warning which are conditional)
      expect(types).toContain('schema');
      expect(types).toContain('start');
      expect(types).toContain('progress');
      expect(types).toContain('stats');
      expect(types).toContain('excerpt');
      expect(types).toContain('summary');
      expect(types).toContain('emotion');
      expect(types).toContain('metadata');
      expect(types).toContain('complete');
    });

    it('should emit 8 emotion events (Plutchik)', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--stream']);
      const result = await analyzeCommand.execute(args);

      const lines = result.output!.split('\n').filter(l => l.trim());
      const emotionEvents = lines
        .map(l => JSON.parse(l))
        .filter(e => e.type === 'emotion');

      expect(emotionEvents.length).toBe(8);

      const emotions = emotionEvents.map(e => e.emotion);
      expect(emotions).toContain('joy');
      expect(emotions).toContain('trust');
      expect(emotions).toContain('fear');
      expect(emotions).toContain('surprise');
      expect(emotions).toContain('sadness');
      expect(emotions).toContain('disgust');
      expect(emotions).toContain('anger');
      expect(emotions).toContain('anticipation');
    });
  });

  // ==========================================================================
  // EVENTS FILTER TESTS (Chapter 24 --events)
  // ==========================================================================

  describe('NDJSON events filter (--events)', () => {
    it('should filter to single event type', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--stream', '--events', 'summary']);
      const result = await analyzeCommand.execute(args);

      expect(result.success).toBe(true);
      const lines = result.output!.split('\n').filter(l => l.trim());

      // All events should be type=summary
      for (const line of lines) {
        const event = JSON.parse(line);
        expect(event.type).toBe('summary');
      }
    });

    it('should filter to multiple event types', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--stream', '--events', 'summary,stats']);
      const result = await analyzeCommand.execute(args);

      expect(result.success).toBe(true);
      const lines = result.output!.split('\n').filter(l => l.trim());
      const types = new Set(lines.map(l => JSON.parse(l).type));

      // Only summary and stats
      expect(types.size).toBeLessThanOrEqual(2);
      for (const type of types) {
        expect(['summary', 'stats']).toContain(type);
      }
    });

    it('should pass all events with --events all', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--stream', '--events', 'all']);
      const result = await analyzeCommand.execute(args);

      expect(result.success).toBe(true);
      const lines = result.output!.split('\n').filter(l => l.trim());

      // Should have many events (unfiltered)
      expect(lines.length).toBeGreaterThan(10);
    });

    it('should handle case-insensitive event types', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--stream', '--events', 'SUMMARY']);
      const result = await analyzeCommand.execute(args);

      expect(result.success).toBe(true);
      const lines = result.output!.split('\n').filter(l => l.trim());

      // Filter is case-insensitive
      for (const line of lines) {
        const event = JSON.parse(line);
        expect(event.type).toBe('summary');
      }
    });

    it('should return empty output for non-existent event type', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--stream', '--events', 'nonexistent']);
      const result = await analyzeCommand.execute(args);

      expect(result.success).toBe(true);
      const lines = result.output!.split('\n').filter(l => l.trim());

      // No events match
      expect(lines.length).toBe(0);
    });

    it('should filter emotion events correctly', async () => {
      const args = parse(['analyze', 'sample_text.txt', '--stream', '--events', 'emotion']);
      const result = await analyzeCommand.execute(args);

      expect(result.success).toBe(true);
      const lines = result.output!.split('\n').filter(l => l.trim());

      // Should have exactly 8 emotion events
      expect(lines.length).toBe(8);
      for (const line of lines) {
        const event = JSON.parse(line);
        expect(event.type).toBe('emotion');
        expect(event.emotion).toBeDefined();
        expect(event.intensity).toBeDefined();
        expect(event.confidence).toBeDefined();
      }
    });
  });
});
