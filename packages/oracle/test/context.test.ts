/**
 * Oracle Context Tests
 * @module @omega/oracle/test/context
 * @description Unit tests for Phase 144 - Oracle Context
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OracleContext,
  createContext,
  DEFAULT_CONTEXT_CONFIG,
  type ContextEntry,
  type ContextConfig,
  type EmotionTrend,
  type ContextSummary,
  type ComparisonResult,
} from '../src/context';
import type { OracleResponse } from '../src/types';

describe('OMEGA Oracle - Phase 144: Oracle Context', () => {
  let context: OracleContext;

  const createMockResponse = (
    id: string,
    emotion: string = 'joy',
    confidence: number = 0.8
  ): OracleResponse => ({
    id,
    text: `Test text for ${id}`,
    insights: [
      { primaryEmotion: emotion, confidence, evidence: ['test'], intensity: 0.7 },
    ],
    summary: 'Test summary',
    metadata: {
      model: 'test',
      tokensUsed: 100,
      processingTime: 50,
      cached: false,
      timestamp: Date.now(),
    },
  });

  beforeEach(() => {
    context = createContext({ autoDecay: false }); // Disable auto decay for tests
  });

  afterEach(() => {
    context.dispose();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      expect(DEFAULT_CONTEXT_CONFIG.maxEntries).toBe(100);
      expect(DEFAULT_CONTEXT_CONFIG.decayRate).toBe(0.1);
      expect(DEFAULT_CONTEXT_CONFIG.minWeight).toBe(0.01);
      expect(DEFAULT_CONTEXT_CONFIG.autoDecay).toBe(true);
    });

    it('should accept custom configuration', () => {
      const custom = createContext({ maxEntries: 50, decayRate: 0.2 });
      expect(custom.size).toBe(0);
      custom.dispose();
    });
  });

  describe('Entry Management', () => {
    it('should add entry to context', () => {
      const response = createMockResponse('test-1');
      const id = context.addEntry(response);
      expect(id).toBe('test-1');
      expect(context.size).toBe(1);
    });

    it('should get entry by ID', () => {
      const response = createMockResponse('test-1');
      context.addEntry(response);
      const entry = context.getEntry('test-1');
      expect(entry).not.toBeNull();
      expect(entry!.id).toBe('test-1');
    });

    it('should return null for missing entry', () => {
      const entry = context.getEntry('nonexistent');
      expect(entry).toBeNull();
    });

    it('should remove entry by ID', () => {
      const response = createMockResponse('test-1');
      context.addEntry(response);
      expect(context.removeEntry('test-1')).toBe(true);
      expect(context.size).toBe(0);
    });

    it('should return false when removing nonexistent entry', () => {
      expect(context.removeEntry('nonexistent')).toBe(false);
    });

    it('should get all entries', () => {
      context.addEntry(createMockResponse('test-1'));
      context.addEntry(createMockResponse('test-2'));
      const entries = context.getAllEntries();
      expect(entries.length).toBe(2);
    });

    it('should clear all entries', () => {
      context.addEntry(createMockResponse('test-1'));
      context.addEntry(createMockResponse('test-2'));
      context.clear();
      expect(context.size).toBe(0);
    });
  });

  describe('Tags', () => {
    it('should add entry with tags', () => {
      const response = createMockResponse('test-1');
      context.addEntry(response, ['chapter1', 'intro']);
      const entry = context.getEntry('test-1');
      expect(entry!.tags).toContain('chapter1');
      expect(entry!.tags).toContain('intro');
    });

    it('should get entries by tag', () => {
      context.addEntry(createMockResponse('test-1'), ['chapter1']);
      context.addEntry(createMockResponse('test-2'), ['chapter2']);
      context.addEntry(createMockResponse('test-3'), ['chapter1']);

      const chapter1Entries = context.getEntriesByTag('chapter1');
      expect(chapter1Entries.length).toBe(2);
    });

    it('should return empty array for nonexistent tag', () => {
      context.addEntry(createMockResponse('test-1'), ['chapter1']);
      const entries = context.getEntriesByTag('nonexistent');
      expect(entries.length).toBe(0);
    });
  });

  describe('Weight Management', () => {
    it('should initialize entry with weight 1.0', () => {
      context.addEntry(createMockResponse('test-1'));
      const entry = context.getEntry('test-1');
      expect(entry!.weight).toBe(1.0);
    });

    it('should apply decay to entries', () => {
      context.addEntry(createMockResponse('test-1'));
      context.applyDecay();
      const entry = context.getEntry('test-1');
      expect(entry!.weight).toBeLessThan(1.0);
    });

    it('should remove entries below minimum weight', () => {
      const lowWeightContext = createContext({ minWeight: 0.5, decayRate: 0.6, autoDecay: false });
      lowWeightContext.addEntry(createMockResponse('test-1'));
      lowWeightContext.applyDecay(); // 1.0 * 0.4 = 0.4 < 0.5
      expect(lowWeightContext.size).toBe(0);
      lowWeightContext.dispose();
    });

    it('should boost entry weight', () => {
      context.addEntry(createMockResponse('test-1'));
      context.applyDecay(); // Reduce weight
      const beforeBoost = context.getEntry('test-1')!.weight;
      context.boostEntry('test-1', 0.3);
      const afterBoost = context.getEntry('test-1')!.weight;
      expect(afterBoost).toBeGreaterThan(beforeBoost);
    });

    it('should cap weight at 1.0', () => {
      context.addEntry(createMockResponse('test-1'));
      context.boostEntry('test-1', 0.5);
      const entry = context.getEntry('test-1');
      expect(entry!.weight).toBeLessThanOrEqual(1.0);
    });

    it('should return false when boosting nonexistent entry', () => {
      expect(context.boostEntry('nonexistent')).toBe(false);
    });
  });

  describe('Max Entries Limit', () => {
    it('should enforce max entries limit', () => {
      const smallContext = createContext({ maxEntries: 3, autoDecay: false });

      smallContext.addEntry(createMockResponse('test-1'));
      smallContext.addEntry(createMockResponse('test-2'));
      smallContext.addEntry(createMockResponse('test-3'));
      smallContext.addEntry(createMockResponse('test-4')); // Should evict lowest weight

      expect(smallContext.size).toBe(3);
      smallContext.dispose();
    });

    it('should remove lowest weight entry when at limit', () => {
      const smallContext = createContext({ maxEntries: 2, autoDecay: false });

      smallContext.addEntry(createMockResponse('test-1'));
      smallContext.applyDecay(); // Reduce weight of test-1
      smallContext.addEntry(createMockResponse('test-2'));
      smallContext.addEntry(createMockResponse('test-3')); // Should evict test-1

      expect(smallContext.getEntry('test-1')).toBeNull();
      expect(smallContext.getEntry('test-2')).not.toBeNull();
      expect(smallContext.getEntry('test-3')).not.toBeNull();
      smallContext.dispose();
    });
  });

  describe('Dominant Emotions', () => {
    it('should get dominant emotions', () => {
      context.addEntry(createMockResponse('test-1', 'joy', 0.9));
      context.addEntry(createMockResponse('test-2', 'joy', 0.8));
      context.addEntry(createMockResponse('test-3', 'sadness', 0.5));

      const dominant = context.getDominantEmotions(3);
      expect(dominant[0]).toBe('joy');
    });

    it('should limit dominant emotions count', () => {
      context.addEntry(createMockResponse('test-1', 'joy'));
      context.addEntry(createMockResponse('test-2', 'sadness'));
      context.addEntry(createMockResponse('test-3', 'anger'));
      context.addEntry(createMockResponse('test-4', 'fear'));

      const dominant = context.getDominantEmotions(2);
      expect(dominant.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for empty context', () => {
      const dominant = context.getDominantEmotions();
      expect(dominant.length).toBe(0);
    });
  });

  describe('Emotion Trends', () => {
    it('should calculate emotion trends', async () => {
      const ctx = createContext({ autoDecay: false });

      // Add entries with increasing joy
      for (let i = 0; i < 5; i++) {
        const response = createMockResponse(`test-${i}`, 'joy', 0.3 + i * 0.1);
        response.metadata.timestamp = Date.now() + i * 1000;
        ctx.addEntry(response);
        await new Promise((r) => setTimeout(r, 10));
      }

      const trends = ctx.getEmotionTrends();
      expect(trends.length).toBeGreaterThan(0);

      const joyTrend = trends.find((t) => t.emotion === 'joy');
      expect(joyTrend).toBeDefined();
      expect(joyTrend!.values.length).toBe(5);
      ctx.dispose();
    });

    it('should detect increasing trend', async () => {
      const ctx = createContext({ autoDecay: false });

      for (let i = 0; i < 6; i++) {
        const response = createMockResponse(`test-${i}`, 'joy', 0.2 + i * 0.12);
        response.metadata.timestamp = Date.now() + i * 1000;
        ctx.addEntry(response);
      }

      const trends = ctx.getEmotionTrends();
      const joyTrend = trends.find((t) => t.emotion === 'joy');
      expect(joyTrend!.trend).toBe('increasing');
      ctx.dispose();
    });

    it('should detect decreasing trend', async () => {
      const ctx = createContext({ autoDecay: false });

      for (let i = 0; i < 6; i++) {
        const response = createMockResponse(`test-${i}`, 'sadness', 0.8 - i * 0.12);
        response.metadata.timestamp = Date.now() + i * 1000;
        ctx.addEntry(response);
      }

      const trends = ctx.getEmotionTrends();
      const sadTrend = trends.find((t) => t.emotion === 'sadness');
      expect(sadTrend!.trend).toBe('decreasing');
      ctx.dispose();
    });

    it('should detect stable trend', async () => {
      const ctx = createContext({ autoDecay: false });

      for (let i = 0; i < 4; i++) {
        const response = createMockResponse(`test-${i}`, 'trust', 0.5);
        response.metadata.timestamp = Date.now() + i * 1000;
        ctx.addEntry(response);
      }

      const trends = ctx.getEmotionTrends();
      const trustTrend = trends.find((t) => t.emotion === 'trust');
      expect(trustTrend!.trend).toBe('stable');
      ctx.dispose();
    });
  });

  describe('Comparison', () => {
    it('should compare two entries', () => {
      context.addEntry(createMockResponse('test-1', 'joy', 0.8));
      context.addEntry(createMockResponse('test-2', 'joy', 0.7));

      const result = context.compare('test-1', 'test-2');
      expect(result).not.toBeNull();
      expect(result!.similarity).toBeGreaterThan(0);
    });

    it('should return null for nonexistent entries', () => {
      context.addEntry(createMockResponse('test-1'));
      expect(context.compare('test-1', 'nonexistent')).toBeNull();
      expect(context.compare('nonexistent', 'test-1')).toBeNull();
    });

    it('should identify shared emotions', () => {
      context.addEntry(createMockResponse('test-1', 'joy'));
      context.addEntry(createMockResponse('test-2', 'joy'));

      const result = context.compare('test-1', 'test-2');
      expect(result!.sharedEmotions).toContain('joy');
    });

    it('should calculate similarity score', () => {
      context.addEntry(createMockResponse('test-1', 'joy', 0.9));
      context.addEntry(createMockResponse('test-2', 'joy', 0.9));

      const result = context.compare('test-1', 'test-2');
      expect(result!.similarity).toBeGreaterThan(0.8);
    });

    it('should identify divergent emotions', () => {
      context.addEntry(createMockResponse('test-1', 'joy', 0.9));
      context.addEntry(createMockResponse('test-2', 'sadness', 0.9));

      const result = context.compare('test-1', 'test-2');
      expect(result!.divergentEmotions.length).toBeGreaterThan(0);
    });

    it('should generate comparison narrative', () => {
      context.addEntry(createMockResponse('test-1', 'joy'));
      context.addEntry(createMockResponse('test-2', 'joy'));

      const result = context.compare('test-1', 'test-2');
      expect(result!.narrative).toBeTruthy();
    });
  });

  describe('Similar Entries', () => {
    it('should find similar entries', () => {
      context.addEntry(createMockResponse('test-1', 'joy', 0.8));
      context.addEntry(createMockResponse('test-2', 'joy', 0.75));
      context.addEntry(createMockResponse('test-3', 'sadness', 0.9));

      const similar = context.findSimilar('test-1', 0.5);
      expect(similar.some((e) => e.id === 'test-2')).toBe(true);
    });

    it('should return empty array for nonexistent entry', () => {
      const similar = context.findSimilar('nonexistent');
      expect(similar.length).toBe(0);
    });

    it('should respect threshold', () => {
      context.addEntry(createMockResponse('test-1', 'joy', 0.9));
      context.addEntry(createMockResponse('test-2', 'sadness', 0.9));

      const similar = context.findSimilar('test-1', 0.9);
      expect(similar.length).toBe(0); // Different emotions, low similarity
    });
  });

  describe('Context Summary', () => {
    it('should generate context summary', () => {
      context.addEntry(createMockResponse('test-1', 'joy'), ['chapter1']);
      context.addEntry(createMockResponse('test-2', 'joy'), ['chapter1']);
      context.addEntry(createMockResponse('test-3', 'sadness'), ['chapter2']);

      const summary = context.getSummary();
      expect(summary.entryCount).toBe(3);
      expect(summary.totalWeight).toBeGreaterThan(0);
      expect(summary.dominantEmotions.length).toBeGreaterThan(0);
    });

    it('should return empty summary for empty context', () => {
      const summary = context.getSummary();
      expect(summary.entryCount).toBe(0);
      expect(summary.totalWeight).toBe(0);
      expect(summary.dominantEmotions.length).toBe(0);
    });

    it('should include themes from tags', () => {
      context.addEntry(createMockResponse('test-1'), ['love', 'adventure']);
      context.addEntry(createMockResponse('test-2'), ['love']);

      const summary = context.getSummary();
      expect(summary.themes).toContain('love');
    });

    it('should calculate timespan', () => {
      const response1 = createMockResponse('test-1');
      response1.metadata.timestamp = 1000;
      context.addEntry(response1);

      const response2 = createMockResponse('test-2');
      response2.metadata.timestamp = 5000;
      context.addEntry(response2);

      const summary = context.getSummary();
      expect(summary.timespan.start).toBe(1000);
      expect(summary.timespan.end).toBe(5000);
    });
  });

  describe('Export/Import', () => {
    it('should export context', () => {
      context.addEntry(createMockResponse('test-1'));
      context.addEntry(createMockResponse('test-2'));

      const exported = context.export();
      expect(exported.length).toBe(2);
    });

    it('should import context', () => {
      const entries: ContextEntry[] = [
        {
          id: 'import-1',
          text: 'Imported text',
          insights: [{ primaryEmotion: 'joy', confidence: 0.8, evidence: [], intensity: 0.7 }],
          timestamp: Date.now(),
          weight: 1.0,
          tags: [],
        },
      ];

      context.import(entries);
      expect(context.size).toBe(1);
      expect(context.getEntry('import-1')).not.toBeNull();
    });

    it('should trim on import if over limit', () => {
      const smallContext = createContext({ maxEntries: 2, autoDecay: false });

      const entries: ContextEntry[] = [
        { id: 'import-1', text: '', insights: [], timestamp: Date.now(), weight: 0.9, tags: [] },
        { id: 'import-2', text: '', insights: [], timestamp: Date.now(), weight: 0.8, tags: [] },
        { id: 'import-3', text: '', insights: [], timestamp: Date.now(), weight: 0.7, tags: [] },
      ];

      smallContext.import(entries);
      expect(smallContext.size).toBe(2);
      smallContext.dispose();
    });
  });

  describe('Invariants', () => {
    it('INV-CONTEXT-001: Entry weight must be 0-1', () => {
      context.addEntry(createMockResponse('test-1'));
      const entry = context.getEntry('test-1');
      expect(entry!.weight).toBeGreaterThanOrEqual(0);
      expect(entry!.weight).toBeLessThanOrEqual(1);
    });

    it('INV-CONTEXT-002: Context size must not exceed maxEntries', () => {
      const smallContext = createContext({ maxEntries: 5, autoDecay: false });
      for (let i = 0; i < 10; i++) {
        smallContext.addEntry(createMockResponse(`test-${i}`));
      }
      expect(smallContext.size).toBeLessThanOrEqual(5);
      smallContext.dispose();
    });

    it('INV-CONTEXT-003: Decay must reduce weight', () => {
      context.addEntry(createMockResponse('test-1'));
      const before = context.getEntry('test-1')!.weight;
      context.applyDecay();
      const after = context.getEntry('test-1')!.weight;
      expect(after).toBeLessThan(before);
    });

    it('INV-CONTEXT-004: Similarity must be 0-1', () => {
      context.addEntry(createMockResponse('test-1', 'joy'));
      context.addEntry(createMockResponse('test-2', 'sadness'));
      const result = context.compare('test-1', 'test-2');
      expect(result!.similarity).toBeGreaterThanOrEqual(0);
      expect(result!.similarity).toBeLessThanOrEqual(1);
    });

    it('INV-CONTEXT-005: Trend must be valid type', () => {
      context.addEntry(createMockResponse('test-1', 'joy'));
      context.addEntry(createMockResponse('test-2', 'joy'));
      const trends = context.getEmotionTrends();
      if (trends.length > 0) {
        expect(['increasing', 'decreasing', 'stable']).toContain(trends[0].trend);
      }
    });

    it('INV-CONTEXT-006: Dispose must clean up resources', () => {
      context.addEntry(createMockResponse('test-1'));
      context.dispose();
      expect(context.size).toBe(0);
    });
  });
});
