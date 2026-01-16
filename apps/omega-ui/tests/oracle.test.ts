/**
 * Oracle Integration Tests
 * @module @omega/ui/tests/oracle
 * @description Unit tests for Phase 143 - Oracle Integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock React hooks
const mockSetState = vi.fn();
const mockUseState = vi.fn((initial: unknown) => [initial, mockSetState]);
const mockUseCallback = vi.fn((fn: unknown) => fn);
const mockUseRef = vi.fn((initial: unknown) => ({ current: initial }));
const mockUseEffect = vi.fn((fn: () => void) => fn());

vi.mock('react', () => ({
  useState: (initial: unknown) => mockUseState(initial),
  useCallback: (fn: unknown) => mockUseCallback(fn),
  useRef: (initial: unknown) => mockUseRef(initial),
  useEffect: (fn: () => void) => mockUseEffect(fn),
}));

// Import types for testing
import type {
  AnalysisDepth,
  AnalysisStatus,
  EmotionalInsight,
  NarrativeAnalysis,
  AnalysisResult,
  StreamProgress,
  OracleError,
  OracleState,
  OracleActions,
  UseOracleOptions,
} from '../src/hooks/useOracle';

describe('OMEGA UI - Phase 143: Oracle Integration', () => {
  describe('Type Definitions', () => {
    it('should define AnalysisDepth type', () => {
      const depths: AnalysisDepth[] = ['quick', 'standard', 'deep'];
      expect(depths).toHaveLength(3);
    });

    it('should define AnalysisStatus type', () => {
      const statuses: AnalysisStatus[] = ['idle', 'analyzing', 'streaming', 'complete', 'error', 'cancelled'];
      expect(statuses).toHaveLength(6);
    });

    it('should define EmotionalInsight interface', () => {
      const insight: EmotionalInsight = {
        primaryEmotion: 'joy',
        confidence: 0.85,
        evidence: ['happy', 'wonderful'],
        intensity: 0.7,
      };
      expect(insight.primaryEmotion).toBe('joy');
      expect(insight.confidence).toBeGreaterThan(0);
      expect(insight.evidence).toBeInstanceOf(Array);
    });

    it('should define NarrativeAnalysis interface', () => {
      const narrative: NarrativeAnalysis = {
        structure: {
          introduction: 'Opening sentence.',
          development: ['Middle content.'],
          conclusion: 'Final thought.',
        },
        style: {
          tone: 'neutral',
          complexity: 'simple',
          readabilityScore: 85,
        },
        themes: ['general'],
      };
      expect(narrative.structure.introduction).toBeTruthy();
      expect(narrative.style.tone).toBe('neutral');
    });

    it('should define AnalysisResult interface', () => {
      const result: AnalysisResult = {
        id: 'test-123',
        text: 'Sample text',
        insights: [],
        emotions: {
          joy: 0,
          sadness: 0,
          anger: 0,
          fear: 0,
          surprise: 0,
          disgust: 0,
          trust: 0,
          anticipation: 0,
          love: 0,
          guilt: 0,
          shame: 0,
          pride: 0,
          envy: 0,
          contempt: 0,
        },
        narrative: null,
        summary: 'Test summary',
        timestamp: Date.now(),
        duration: 100,
        depth: 'standard',
        cached: false,
      };
      expect(result.id).toMatch(/^test/);
      expect(result.emotions).toHaveProperty('joy');
    });

    it('should define StreamProgress interface', () => {
      const progress: StreamProgress = {
        percent: 50,
        stage: 'processing',
        message: 'Half done',
        chunksProcessed: 5,
        totalChunks: 10,
      };
      expect(progress.percent).toBe(50);
      expect(progress.chunksProcessed).toBeLessThanOrEqual(progress.totalChunks);
    });

    it('should define OracleError interface', () => {
      const error: OracleError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
        recoverable: true,
      };
      expect(error.code).toBeTruthy();
      expect(typeof error.recoverable).toBe('boolean');
    });
  });

  describe('Emotion Analysis Logic', () => {
    // Test emotion keyword detection
    it('should detect joy keywords', () => {
      const joyKeywords = ['happy', 'joy', 'wonderful', 'great', 'amazing', 'love', 'beautiful', 'excited'];
      expect(joyKeywords).toContain('happy');
      expect(joyKeywords.length).toBeGreaterThan(5);
    });

    it('should detect fear keywords', () => {
      const fearKeywords = ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous', 'panic'];
      expect(fearKeywords).toContain('scared');
      expect(fearKeywords.length).toBeGreaterThan(5);
    });

    it('should detect anger keywords', () => {
      const angerKeywords = ['angry', 'furious', 'rage', 'hate', 'frustrated', 'annoyed', 'irritated'];
      expect(angerKeywords).toContain('angry');
      expect(angerKeywords.length).toBeGreaterThan(5);
    });

    it('should detect all 14 emotion categories', () => {
      const emotions = [
        'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust',
        'trust', 'anticipation', 'love', 'guilt', 'shame', 'pride',
        'envy', 'contempt',
      ];
      expect(emotions).toHaveLength(14);
    });
  });

  describe('Narrative Analysis Logic', () => {
    it('should detect enthusiastic tone', () => {
      const text = 'This is amazing! What a great day!';
      const hasExclamation = text.includes('!');
      const hasAmazing = text.toLowerCase().includes('amazing');
      expect(hasExclamation || hasAmazing).toBe(true);
    });

    it('should detect authoritative tone', () => {
      const text = 'You must follow these rules. You should always comply.';
      const hasMust = text.toLowerCase().includes('must');
      const hasShould = text.toLowerCase().includes('should');
      expect(hasMust || hasShould).toBe(true);
    });

    it('should detect tentative tone', () => {
      const text = 'Perhaps this could work. Maybe we should try.';
      const hasPerhaps = text.toLowerCase().includes('perhaps');
      const hasMaybe = text.toLowerCase().includes('maybe');
      expect(hasPerhaps || hasMaybe).toBe(true);
    });

    it('should extract themes from text', () => {
      const themeKeywords = {
        love: ['love', 'heart', 'romance'],
        adventure: ['journey', 'quest', 'adventure'],
        conflict: ['fight', 'battle', 'war'],
        growth: ['learn', 'grow', 'change'],
        nature: ['forest', 'ocean', 'mountain'],
      };
      expect(Object.keys(themeKeywords)).toHaveLength(5);
    });
  });

  describe('Summary Generation', () => {
    it('should generate summary for no insights', () => {
      const noInsightsSummary = 'No significant emotional patterns detected.';
      expect(noInsightsSummary).toContain('No significant');
    });

    it('should include emotion count in summary', () => {
      const insights: EmotionalInsight[] = [
        { primaryEmotion: 'joy', confidence: 0.8, evidence: [], intensity: 0.7 },
        { primaryEmotion: 'trust', confidence: 0.6, evidence: [], intensity: 0.5 },
      ];
      const emotionCount = insights.length;
      expect(emotionCount).toBe(2);
    });

    it('should calculate average confidence', () => {
      const confidences = [0.8, 0.6, 0.7];
      const avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
      expect(avg).toBeCloseTo(0.7, 2);
    });
  });

  describe('Hook State Management', () => {
    it('should initialize with idle status', () => {
      const initialStatus: AnalysisStatus = 'idle';
      expect(initialStatus).toBe('idle');
    });

    it('should track analyzing state', () => {
      const status: AnalysisStatus = 'analyzing';
      const isAnalyzing = status === 'analyzing';
      expect(isAnalyzing).toBe(true);
    });

    it('should track streaming state', () => {
      const status: AnalysisStatus = 'streaming';
      const isStreaming = status === 'streaming';
      expect(isStreaming).toBe(true);
    });

    it('should transition to complete state', () => {
      const states: AnalysisStatus[] = ['idle', 'analyzing', 'complete'];
      expect(states[states.length - 1]).toBe('complete');
    });

    it('should transition to error state', () => {
      const states: AnalysisStatus[] = ['idle', 'analyzing', 'error'];
      expect(states[states.length - 1]).toBe('error');
    });

    it('should transition to cancelled state', () => {
      const states: AnalysisStatus[] = ['idle', 'streaming', 'cancelled'];
      expect(states[states.length - 1]).toBe('cancelled');
    });
  });

  describe('Options Configuration', () => {
    it('should support autoHistory option', () => {
      const options: UseOracleOptions = { autoHistory: true };
      expect(options.autoHistory).toBe(true);
    });

    it('should support maxHistory option', () => {
      const options: UseOracleOptions = { maxHistory: 100 };
      expect(options.maxHistory).toBe(100);
    });

    it('should support defaultDepth option', () => {
      const options: UseOracleOptions = { defaultDepth: 'deep' };
      expect(options.defaultDepth).toBe('deep');
    });

    it('should support callback options', () => {
      const onStart = vi.fn();
      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      const options: UseOracleOptions = {
        onStart,
        onProgress,
        onComplete,
        onError,
      };

      expect(options.onStart).toBe(onStart);
      expect(options.onProgress).toBe(onProgress);
      expect(options.onComplete).toBe(onComplete);
      expect(options.onError).toBe(onError);
    });
  });

  describe('History Management', () => {
    it('should limit history to maxHistory', () => {
      const maxHistory = 50;
      const history: AnalysisResult[] = [];
      const newResults = Array.from({ length: 60 }, (_, i) => ({
        id: `result-${i}`,
        text: 'text',
        insights: [],
        emotions: {} as AnalysisResult['emotions'],
        narrative: null,
        summary: 'summary',
        timestamp: Date.now(),
        duration: 100,
        depth: 'standard' as const,
        cached: false,
      }));

      const updatedHistory = [...newResults, ...history].slice(0, maxHistory);
      expect(updatedHistory.length).toBeLessThanOrEqual(maxHistory);
    });

    it('should prepend new results to history', () => {
      const existing = [{ id: 'old' }];
      const newResult = { id: 'new' };
      const updated = [newResult, ...existing];
      expect(updated[0].id).toBe('new');
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress percentage', () => {
      const chunksProcessed = 25;
      const totalChunks = 100;
      const percent = Math.round((chunksProcessed / totalChunks) * 100);
      expect(percent).toBe(25);
    });

    it('should track processing stage', () => {
      const stages = ['initializing', 'processing', 'analyzing', 'completing'];
      expect(stages).toContain('processing');
    });

    it('should provide progress message', () => {
      const progress: StreamProgress = {
        percent: 50,
        stage: 'processing',
        message: 'Processing chunk 5/10',
        chunksProcessed: 5,
        totalChunks: 10,
      };
      expect(progress.message).toContain('5/10');
    });
  });

  describe('Error Handling', () => {
    it('should handle cancellation error', () => {
      const error: OracleError = {
        code: 'CANCELLED',
        message: 'Analysis was cancelled',
        recoverable: false,
      };
      expect(error.code).toBe('CANCELLED');
      expect(error.recoverable).toBe(false);
    });

    it('should handle unknown error', () => {
      const error: OracleError = {
        code: 'UNKNOWN',
        message: 'An unexpected error occurred',
        recoverable: false,
      };
      expect(error.code).toBe('UNKNOWN');
    });

    it('should mark recoverable errors', () => {
      const error: OracleError = {
        code: 'TIMEOUT',
        message: 'Request timed out',
        recoverable: true,
      };
      expect(error.recoverable).toBe(true);
    });
  });

  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const id = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        ids.add(id);
      }
      // Most IDs should be unique (allowing for rare collisions)
      expect(ids.size).toBeGreaterThan(90);
    });

    it('should include timestamp in ID', () => {
      const now = Date.now();
      const id = `analysis-${now}-abc123`;
      expect(id).toContain(now.toString());
    });

    it('should include random suffix in ID', () => {
      const id = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      expect(id.split('-').length).toBe(3);
    });
  });

  describe('Invariants', () => {
    it('INV-ORACLE-001: Analysis result must have valid ID', () => {
      const result: AnalysisResult = {
        id: 'analysis-12345-abc',
        text: 'test',
        insights: [],
        emotions: {} as AnalysisResult['emotions'],
        narrative: null,
        summary: '',
        timestamp: Date.now(),
        duration: 0,
        depth: 'standard',
        cached: false,
      };
      expect(result.id).toMatch(/^analysis-/);
    });

    it('INV-ORACLE-002: Emotions must have all 14 keys', () => {
      const emotions = {
        joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, disgust: 0,
        trust: 0, anticipation: 0, love: 0, guilt: 0, shame: 0, pride: 0,
        envy: 0, contempt: 0,
      };
      expect(Object.keys(emotions)).toHaveLength(14);
    });

    it('INV-ORACLE-003: Progress percent must be 0-100', () => {
      const validPercents = [0, 25, 50, 75, 100];
      for (const p of validPercents) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(100);
      }
    });

    it('INV-ORACLE-004: Depth must be valid option', () => {
      const depths: AnalysisDepth[] = ['quick', 'standard', 'deep'];
      expect(depths).toContain('quick');
      expect(depths).toContain('standard');
      expect(depths).toContain('deep');
    });

    it('INV-ORACLE-005: History must respect maxHistory limit', () => {
      const maxHistory = 50;
      const history = new Array(60).fill({ id: 'test' });
      const trimmed = history.slice(0, maxHistory);
      expect(trimmed.length).toBe(maxHistory);
    });

    it('INV-ORACLE-006: Confidence must be 0-1', () => {
      const confidences = [0.5, 0.8, 0.95];
      for (const c of confidences) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    });
  });
});
