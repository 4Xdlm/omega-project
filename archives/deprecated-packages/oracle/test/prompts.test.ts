/**
 * Oracle Prompts Tests
 * @module @omega/oracle/test/prompts
 * @description Unit tests for Phase 140 - Oracle Prompts
 */

import { describe, it, expect } from 'vitest';
import {
  createAnalysisPrompt,
  createNarrativePrompt,
  createComparisonPrompt,
  createSummaryPrompt,
  createRecommendationsPrompt,
  getAvailablePromptTypes,
  validatePromptParams,
  estimateTokenCount,
} from '../src/prompts';

describe('OMEGA Oracle - Phase 140: Oracle Prompts', () => {
  const sampleText = 'I am feeling very happy today because everything is going well.';

  describe('createAnalysisPrompt', () => {
    it('should create prompt with system and user messages', () => {
      const prompt = createAnalysisPrompt({
        text: sampleText,
        depth: 'standard',
      });

      expect(prompt.system).toBeDefined();
      expect(prompt.user).toBeDefined();
      expect(prompt.system.length).toBeGreaterThan(0);
      expect(prompt.user.length).toBeGreaterThan(0);
    });

    it('should include text in user prompt', () => {
      const prompt = createAnalysisPrompt({
        text: sampleText,
        depth: 'standard',
      });

      expect(prompt.user).toContain(sampleText);
    });

    it('should configure for quick depth', () => {
      const prompt = createAnalysisPrompt({
        text: sampleText,
        depth: 'quick',
      });

      expect(prompt.system).toContain('quick');
      expect(prompt.system).toContain('3'); // max emotions
    });

    it('should configure for deep depth', () => {
      const prompt = createAnalysisPrompt({
        text: sampleText,
        depth: 'deep',
      });

      expect(prompt.system).toContain('deep');
      expect(prompt.system).toContain('8'); // max emotions
    });

    it('should include context when provided', () => {
      const prompt = createAnalysisPrompt({
        text: sampleText,
        depth: 'standard',
        context: 'Written during a celebration',
      });

      expect(prompt.user).toContain('celebration');
    });
  });

  describe('createNarrativePrompt', () => {
    it('should create narrative analysis prompt', () => {
      const prompt = createNarrativePrompt({
        text: sampleText,
        depth: 'standard',
      });

      expect(prompt.system).toContain('narrative');
      expect(prompt.user).toContain('narrative');
    });

    it('should request arc classification', () => {
      const prompt = createNarrativePrompt({
        text: sampleText,
        depth: 'standard',
      });

      expect(prompt.user).toContain('arc');
    });
  });

  describe('createComparisonPrompt', () => {
    const text1 = 'I am happy today.';
    const text2 = 'I am sad today.';

    it('should include both texts', () => {
      const prompt = createComparisonPrompt(text1, text2, {});

      expect(prompt.user).toContain(text1);
      expect(prompt.user).toContain(text2);
    });

    it('should request comparison elements', () => {
      const prompt = createComparisonPrompt(text1, text2, {});

      expect(prompt.user).toContain('Common emotions');
      expect(prompt.user).toContain('Unique emotions');
      expect(prompt.user).toContain('comparison');
    });
  });

  describe('createSummaryPrompt', () => {
    it('should create concise summary prompt', () => {
      const prompt = createSummaryPrompt({
        text: sampleText,
        depth: 'standard',
      });

      expect(prompt.user).toContain('brief');
      expect(prompt.user).toContain('2-3 sentences');
    });
  });

  describe('createRecommendationsPrompt', () => {
    const insights = [
      { emotion: 'joy', intensity: 0.8 },
      { emotion: 'anticipation', intensity: 0.5 },
    ];

    it('should include insights summary', () => {
      const prompt = createRecommendationsPrompt(sampleText, insights);

      expect(prompt.user).toContain('joy');
      expect(prompt.user).toContain('80%');
    });

    it('should request actionable recommendations', () => {
      const prompt = createRecommendationsPrompt(sampleText, insights);

      expect(prompt.user).toContain('recommendations');
      expect(prompt.user).toContain('3-5');
    });
  });

  describe('getAvailablePromptTypes', () => {
    it('should return all prompt types', () => {
      const types = getAvailablePromptTypes();

      expect(types).toContain('analysis');
      expect(types).toContain('narrative');
      expect(types).toContain('comparison');
      expect(types).toContain('summary');
      expect(types).toContain('recommendations');
    });

    it('should have at least 5 prompt types', () => {
      const types = getAvailablePromptTypes();
      expect(types.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('validatePromptParams', () => {
    it('should pass with valid params', () => {
      const errors = validatePromptParams({
        text: sampleText,
        depth: 'standard',
      });

      expect(errors.length).toBe(0);
    });

    it('should fail with empty text', () => {
      const errors = validatePromptParams({
        text: '',
        depth: 'standard',
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('required');
    });

    it('should fail with text too long', () => {
      const errors = validatePromptParams({
        text: 'a'.repeat(60000),
        depth: 'standard',
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('exceeds');
    });

    it('should fail with invalid depth', () => {
      const errors = validatePromptParams({
        text: sampleText,
        depth: 'invalid' as 'quick',
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid depth');
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate token count', () => {
      const prompt = createAnalysisPrompt({
        text: sampleText,
        depth: 'standard',
      });

      const tokens = estimateTokenCount(prompt);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should increase with longer text', () => {
      const shortPrompt = createAnalysisPrompt({
        text: 'Short text.',
        depth: 'quick',
      });

      const longPrompt = createAnalysisPrompt({
        text: 'This is a much longer text that contains many more words and should result in more tokens.',
        depth: 'quick',
      });

      const shortTokens = estimateTokenCount(shortPrompt);
      const longTokens = estimateTokenCount(longPrompt);

      expect(longTokens).toBeGreaterThan(shortTokens);
    });
  });

  describe('Invariants', () => {
    it('INV-PROMPT-001: System prompt must mention Emotion14', () => {
      const prompt = createAnalysisPrompt({
        text: sampleText,
        depth: 'standard',
      });

      expect(prompt.system).toContain('Emotion14');
    });

    it('INV-PROMPT-002: User prompt must contain analyzed text', () => {
      const prompt = createAnalysisPrompt({
        text: sampleText,
        depth: 'standard',
      });

      expect(prompt.user).toContain(sampleText);
    });

    it('INV-PROMPT-003: Depth must affect max emotions', () => {
      const quickPrompt = createAnalysisPrompt({ text: sampleText, depth: 'quick' });
      const deepPrompt = createAnalysisPrompt({ text: sampleText, depth: 'deep' });

      expect(quickPrompt.system).toContain('3');
      expect(deepPrompt.system).toContain('8');
    });

    it('INV-PROMPT-004: Validation must catch empty text', () => {
      const errors = validatePromptParams({ text: '', depth: 'standard' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('INV-PROMPT-005: Token estimation must be positive', () => {
      const prompt = createAnalysisPrompt({ text: sampleText, depth: 'quick' });
      const tokens = estimateTokenCount(prompt);
      expect(tokens).toBeGreaterThan(0);
    });

    it('INV-PROMPT-006: All prompt types must be available', () => {
      const types = getAvailablePromptTypes();
      expect(types.length).toBeGreaterThanOrEqual(5);
    });
  });
});
