/**
 * Core Integration Tests for OMEGA UI
 * @module tests/core.test
 * @description Unit tests for Phase 128 - Core Integration
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeText,
  analyzeSegment,
  detectEmotions,
  findDominantEmotion,
  calculateValence,
  calculateConfidence,
  segmentText,
  EMOTION14_LIST,
} from '../src/core/analyzer';
import { generateDNA, calculateSimilarity } from '../src/core/dna';
import type { Emotion14, EmotionVector } from '../src/core/types';

describe('OMEGA UI - Phase 128: Core Integration', () => {
  describe('Emotion14 List', () => {
    it('should contain exactly 14 emotions', () => {
      expect(EMOTION14_LIST).toHaveLength(14);
    });

    it('should include all canonical emotions', () => {
      expect(EMOTION14_LIST).toContain('joy');
      expect(EMOTION14_LIST).toContain('sadness');
      expect(EMOTION14_LIST).toContain('anger');
      expect(EMOTION14_LIST).toContain('fear');
      expect(EMOTION14_LIST).toContain('love');
      expect(EMOTION14_LIST).toContain('contempt');
    });
  });

  describe('Text Segmentation', () => {
    it('should segment text by sentences', () => {
      const text = 'Hello world. How are you? I am fine!';
      const segments = segmentText(text);
      expect(segments).toHaveLength(3);
    });

    it('should handle empty text', () => {
      const segments = segmentText('');
      expect(segments).toHaveLength(0);
    });

    it('should trim whitespace from segments', () => {
      const text = '  Hello world.   Nice day.  ';
      const segments = segmentText(text);
      expect(segments[0]).toBe('Hello world');
    });
  });

  describe('Emotion Detection', () => {
    it('should detect joy in happy text', () => {
      const emotions = detectEmotions('I am so happy and delighted today!');
      expect(emotions.joy).toBeGreaterThan(0);
    });

    it('should detect sadness in sad text', () => {
      const emotions = detectEmotions('I feel sad and unhappy.');
      expect(emotions.sadness).toBeGreaterThan(0);
    });

    it('should return empty vector for neutral text', () => {
      const emotions = detectEmotions('The table is brown.');
      const values = Object.values(emotions).filter(v => v && v > 0);
      expect(values.length).toBe(0);
    });
  });

  describe('Dominant Emotion', () => {
    it('should find highest intensity emotion', () => {
      const emotions: EmotionVector = { joy: 0.8, sadness: 0.2, anger: 0.1 };
      const dominant = findDominantEmotion(emotions);
      expect(dominant).toBe('joy');
    });

    it('should return null for empty vector', () => {
      const emotions: EmotionVector = {};
      const dominant = findDominantEmotion(emotions);
      expect(dominant).toBeNull();
    });
  });

  describe('Valence Calculation', () => {
    it('should return positive valence for positive emotions', () => {
      const emotions: EmotionVector = { joy: 0.8, trust: 0.5 };
      const valence = calculateValence(emotions);
      expect(valence).toBeGreaterThan(0);
    });

    it('should return negative valence for negative emotions', () => {
      const emotions: EmotionVector = { sadness: 0.8, anger: 0.5 };
      const valence = calculateValence(emotions);
      expect(valence).toBeLessThan(0);
    });

    it('should return zero for empty vector', () => {
      const emotions: EmotionVector = {};
      const valence = calculateValence(emotions);
      expect(valence).toBe(0);
    });
  });

  describe('Confidence Calculation', () => {
    it('should return value between 0 and 1', () => {
      const emotions: EmotionVector = { joy: 0.5, love: 0.3 };
      const confidence = calculateConfidence(emotions);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should return 0.5 for empty vector', () => {
      const emotions: EmotionVector = {};
      const confidence = calculateConfidence(emotions);
      expect(confidence).toBe(0.5);
    });
  });

  describe('Segment Analysis', () => {
    it('should analyze a single segment', () => {
      const segment = analyzeSegment('I am happy today.', 0);
      expect(segment.id).toBeDefined();
      expect(segment.text).toBe('I am happy today.');
      expect(segment.startIndex).toBe(0);
      expect(segment.endIndex).toBe(17);
    });

    it('should include emotion analysis', () => {
      const segment = analyzeSegment('I am happy and joyful!', 0);
      expect(segment.emotions).toBeDefined();
      expect(segment.dominantEmotion).toBeDefined();
    });
  });

  describe('Full Text Analysis', () => {
    it('should analyze complete text', () => {
      const result = analyzeText('I am happy. Life is good. Love is everywhere!');
      expect(result.id).toBeDefined();
      expect(result.originalText).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it('should calculate word count', () => {
      const result = analyzeText('Hello world today');
      expect(result.wordCount).toBe(3);
    });

    it('should calculate segment count', () => {
      const result = analyzeText('First sentence. Second sentence. Third one!');
      expect(result.segmentCount).toBe(3);
    });

    it('should include aggregate emotions', () => {
      const result = analyzeText('I am so happy! Joy fills my heart.');
      expect(result.aggregateEmotions).toBeDefined();
    });
  });

  describe('DNA Fingerprint', () => {
    it('should generate 128 components', () => {
      const result = analyzeText('Sample text for DNA analysis.');
      const dna = generateDNA(result);
      expect(dna.components).toHaveLength(128);
    });

    it('should include hash', () => {
      const result = analyzeText('Sample text.');
      const dna = generateDNA(result);
      expect(dna.hash).toBeDefined();
      expect(typeof dna.hash).toBe('string');
    });

    it('should include timestamp', () => {
      const result = analyzeText('Sample text.');
      const dna = generateDNA(result);
      expect(dna.timestamp).toBeDefined();
    });
  });

  describe('DNA Similarity', () => {
    it('should return 1 for identical fingerprints', () => {
      const result = analyzeText('Same text.');
      const dna1 = generateDNA(result);
      const similarity = calculateSimilarity(dna1, dna1);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return value between 0 and 1', () => {
      const result1 = analyzeText('I am happy and joyful!');
      const result2 = analyzeText('I am sad and depressed.');
      const dna1 = generateDNA(result1);
      const dna2 = generateDNA(result2);
      const similarity = calculateSimilarity(dna1, dna2);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('Invariants', () => {
    it('INV-CORE-001: Emotion14 count must be 14', () => {
      expect(EMOTION14_LIST.length).toBe(14);
    });

    it('INV-CORE-002: Valence must be in range [-1, 1]', () => {
      const emotions: EmotionVector = { joy: 1, anger: 1 };
      const valence = calculateValence(emotions);
      expect(valence).toBeGreaterThanOrEqual(-1);
      expect(valence).toBeLessThanOrEqual(1);
    });

    it('INV-CORE-003: DNA must have 128 components', () => {
      const result = analyzeText('Test.');
      const dna = generateDNA(result);
      expect(dna.components.length).toBe(128);
    });

    it('INV-CORE-004: Confidence must be in range [0, 1]', () => {
      const segment = analyzeSegment('Happy joyful delighted!', 0);
      expect(segment.confidence).toBeGreaterThanOrEqual(0);
      expect(segment.confidence).toBeLessThanOrEqual(1);
    });

    it('INV-CORE-005: Analysis ID must be unique format', () => {
      const result = analyzeText('Test.');
      expect(result.id).toMatch(/^ana-\d+-[a-z0-9]+$/);
    });
  });
});
