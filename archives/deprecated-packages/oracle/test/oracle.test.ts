/**
 * Oracle Core Tests
 * @module @omega/oracle/test
 * @description Unit tests for Phase 139 - Oracle Core
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Oracle, createOracle, DEFAULT_CONFIG, OracleError } from '../src';

describe('OMEGA Oracle - Phase 139: Oracle Core', () => {
  let oracle: Oracle;

  beforeEach(async () => {
    oracle = createOracle();
    await oracle.initialize();
  });

  describe('Oracle Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_CONFIG.model).toBe('gpt-4-turbo');
      expect(DEFAULT_CONFIG.maxTokens).toBe(2048);
      expect(DEFAULT_CONFIG.temperature).toBe(0.3);
    });

    it('should accept custom configuration', () => {
      const custom = createOracle({ maxTokens: 4096, temperature: 0.5 });
      const status = custom.getStatus();
      expect(status.model).toBe('gpt-4-turbo');
    });

    it('should validate maxTokens on initialize', async () => {
      const invalid = createOracle({ maxTokens: 50 });
      await expect(invalid.initialize()).rejects.toThrow(OracleError);
    });

    it('should validate temperature on initialize', async () => {
      const invalid = createOracle({ temperature: 1.5 });
      await expect(invalid.initialize()).rejects.toThrow(OracleError);
    });
  });

  describe('Oracle Initialization', () => {
    it('should initialize successfully', async () => {
      const newOracle = createOracle();
      await newOracle.initialize();
      const status = newOracle.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.ready).toBe(true);
    });

    it('should reject analysis before initialization', async () => {
      const uninitialized = createOracle();
      await expect(
        uninitialized.analyze({ text: 'test', depth: 'quick', includeNarrative: false, includeRecommendations: false })
      ).rejects.toThrow('Oracle not initialized');
    });
  });

  describe('Oracle Analysis', () => {
    it('should analyze text successfully', async () => {
      const response = await oracle.analyze({
        text: 'I am so happy today! Everything is wonderful and amazing.',
        depth: 'standard',
        includeNarrative: true,
        includeRecommendations: true,
      });

      expect(response.id).toMatch(/^oracle-/);
      expect(response.insights.length).toBeGreaterThan(0);
      expect(response.summary).toBeDefined();
    });

    it('should reject text shorter than 10 characters', async () => {
      await expect(
        oracle.analyze({ text: 'short', depth: 'quick', includeNarrative: false, includeRecommendations: false })
      ).rejects.toThrow('Text must be at least 10 characters');
    });

    it('should detect joy emotion', async () => {
      const response = await oracle.analyze({
        text: 'I am so happy and delighted with this wonderful news!',
        depth: 'standard',
        includeNarrative: false,
        includeRecommendations: false,
      });

      const joyInsight = response.insights.find((i) => i.primaryEmotion === 'joy');
      expect(joyInsight).toBeDefined();
      expect(joyInsight?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect sadness emotion', async () => {
      const response = await oracle.analyze({
        text: 'I feel so sad and unhappy about this melancholy situation.',
        depth: 'standard',
        includeNarrative: false,
        includeRecommendations: false,
      });

      const sadnessInsight = response.insights.find((i) => i.primaryEmotion === 'sadness');
      expect(sadnessInsight).toBeDefined();
    });

    it('should limit insights based on depth', async () => {
      const quickResponse = await oracle.analyze({
        text: 'I am happy but also sad, angry, and surprised by this fearful situation.',
        depth: 'quick',
        includeNarrative: false,
        includeRecommendations: false,
      });

      const deepResponse = await oracle.analyze({
        text: 'I am happy but also sad, angry, and surprised by this fearful situation.',
        depth: 'deep',
        includeNarrative: false,
        includeRecommendations: false,
      });

      expect(quickResponse.insights.length).toBeLessThanOrEqual(3);
      expect(deepResponse.insights.length).toBeLessThanOrEqual(8);
    });
  });

  describe('Narrative Analysis', () => {
    it('should include narrative when requested', async () => {
      const response = await oracle.analyze({
        text: 'I started this journey feeling unsure. But as I learned and grew, everything changed for the better.',
        depth: 'standard',
        includeNarrative: true,
        includeRecommendations: false,
      });

      expect(response.narrative).toBeDefined();
      expect(response.narrative?.arc).toBeDefined();
      expect(response.narrative?.voice).toBeDefined();
    });

    it('should detect first-person voice', async () => {
      const response = await oracle.analyze({
        text: 'I went to the store and I bought my favorite items.',
        depth: 'standard',
        includeNarrative: true,
        includeRecommendations: false,
      });

      expect(response.narrative?.voice).toBe('first-person narrative');
    });

    it('should detect themes', async () => {
      const response = await oracle.analyze({
        text: 'Through this challenge, I learned to grow and develop new skills.',
        depth: 'standard',
        includeNarrative: true,
        includeRecommendations: false,
      });

      expect(response.narrative?.themes).toBeDefined();
      expect(response.narrative?.themes.length).toBeGreaterThan(0);
    });
  });

  describe('Recommendations', () => {
    it('should include recommendations when requested', async () => {
      const response = await oracle.analyze({
        text: 'This is a sample text for analysis purposes only.',
        depth: 'standard',
        includeNarrative: false,
        includeRecommendations: true,
      });

      expect(response.recommendations).toBeDefined();
      expect(response.recommendations?.length).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    it('should cache responses when enabled', async () => {
      const request = {
        text: 'This is a test text for caching validation.',
        depth: 'standard' as const,
        includeNarrative: false,
        includeRecommendations: false,
      };

      const first = await oracle.analyze(request);
      const second = await oracle.analyze(request);

      expect(first.metadata.cached).toBe(false);
      expect(second.metadata.cached).toBe(true);
    });

    it('should clear cache', async () => {
      await oracle.analyze({
        text: 'This is another test text for cache clearing.',
        depth: 'quick',
        includeNarrative: false,
        includeRecommendations: false,
      });

      oracle.clearCache();
      const status = oracle.getStatus();
      expect(status.cacheSize).toBe(0);
    });
  });

  describe('Oracle Status', () => {
    it('should return correct status', async () => {
      const status = oracle.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.model).toBe('gpt-4-turbo');
      expect(status.cacheSize).toBeGreaterThanOrEqual(0);
    });

    it('should track request count', async () => {
      const initialStatus = oracle.getStatus();
      const initialCount = initialStatus.totalRequests;

      await oracle.analyze({
        text: 'Request counting test text here.',
        depth: 'quick',
        includeNarrative: false,
        includeRecommendations: false,
      });

      const newStatus = oracle.getStatus();
      expect(newStatus.totalRequests).toBe(initialCount + 1);
    });
  });

  describe('Invariants', () => {
    it('INV-ORACLE-001: Oracle must initialize before use', async () => {
      const newOracle = createOracle();
      const status = newOracle.getStatus();
      expect(status.initialized).toBe(false);
    });

    it('INV-ORACLE-002: Response must have unique ID', async () => {
      const response = await oracle.analyze({
        text: 'Test text for unique ID verification.',
        depth: 'quick',
        includeNarrative: false,
        includeRecommendations: false,
      });

      expect(response.id).toMatch(/^oracle-\d+-[a-z0-9]+$/);
    });

    it('INV-ORACLE-003: Insights must be sorted by confidence', async () => {
      const response = await oracle.analyze({
        text: 'I am very happy but also a bit sad and somewhat angry.',
        depth: 'standard',
        includeNarrative: false,
        includeRecommendations: false,
      });

      for (let i = 1; i < response.insights.length; i++) {
        expect(response.insights[i - 1].confidence).toBeGreaterThanOrEqual(
          response.insights[i].confidence
        );
      }
    });

    it('INV-ORACLE-004: Confidence must be between 0 and 1', async () => {
      const response = await oracle.analyze({
        text: 'I feel incredibly happy and joyful today!',
        depth: 'standard',
        includeNarrative: false,
        includeRecommendations: false,
      });

      response.insights.forEach((insight) => {
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('INV-ORACLE-005: Metadata must include processing time', async () => {
      const response = await oracle.analyze({
        text: 'Test text for metadata validation.',
        depth: 'quick',
        includeNarrative: false,
        includeRecommendations: false,
      });

      expect(response.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(response.metadata.timestamp).toBeGreaterThan(0);
    });

    it('INV-ORACLE-006: Cache TTL must be respected', () => {
      expect(DEFAULT_CONFIG.cacheTTL).toBe(3600000);
    });
  });
});
