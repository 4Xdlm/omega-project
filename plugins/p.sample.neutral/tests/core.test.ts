/**
 * p.sample.neutral — Core Tests v1.0
 */
import { describe, it, expect } from 'vitest';
import { analyzeText } from '../src/core.js';

describe('analyzeText', () => {
  it('returns correct word_count and char_count', () => {
    const r = analyzeText('Hello world');
    expect(r.word_count).toBe(2);
    expect(r.char_count).toBe(11);
  });

  it('returns correct language_hint for English', () => {
    const r = analyzeText('The quick brown fox jumps over the lazy dog');
    expect(r.language_hint).toBe('en');
  });

  it('returns correct language_hint for French', () => {
    const r = analyzeText('Le soleil brillait sur la mer calme et étincelante');
    expect(r.language_hint).toBe('fr');
  });

  it('returns "und" for empty-ish content', () => {
    const r = analyzeText(' ');
    expect(r.language_hint).toBe('und');
  });

  it('returns zh for Chinese text', () => {
    const r = analyzeText('这是一个中文测试文本用于语言检测');
    expect(r.language_hint).toBe('zh');
  });

  it('returns ru for Russian text', () => {
    const r = analyzeText('Это тестовый текст на русском языке');
    expect(r.language_hint).toBe('ru');
  });

  it('tags short text', () => {
    const r = analyzeText('Hello');
    expect(r.tags).toContain('short');
  });

  it('tags medium text', () => {
    const words = Array(50).fill('word').join(' ');
    const r = analyzeText(words);
    expect(r.tags).toContain('medium');
  });

  it('tags long text', () => {
    const words = Array(200).fill('word').join(' ');
    const r = analyzeText(words);
    expect(r.tags).toContain('long');
  });

  it('tags interrogative', () => {
    const r = analyzeText('What is this?');
    expect(r.tags).toContain('interrogative');
  });

  it('tags exclamatory', () => {
    const r = analyzeText('Amazing!');
    expect(r.tags).toContain('exclamatory');
  });

  it('tags contains-numbers', () => {
    const r = analyzeText('There are 42 items');
    expect(r.tags).toContain('contains-numbers');
  });

  it('tags nature words', () => {
    const r = analyzeText('The sun shines over the sea');
    expect(r.tags).toContain('nature');
  });

  it('tags emotional words', () => {
    const r = analyzeText('I feel joy and love');
    expect(r.tags).toContain('emotional');
  });

  it('tags descriptive words', () => {
    const r = analyzeText('The beautiful dark forest');
    expect(r.tags).toContain('descriptive');
  });

  it('complexity_score is between 0 and 1', () => {
    const r = analyzeText('Simple text');
    expect(r.complexity_score).toBeGreaterThanOrEqual(0);
    expect(r.complexity_score).toBeLessThanOrEqual(1);
  });

  it('complex text has higher complexity than simple text', () => {
    const simple = analyzeText('The cat sat on the mat');
    const complex = analyzeText('The extraordinarily sophisticated implementation demonstrates unprecedented architectural complexity');
    expect(complex.complexity_score).toBeGreaterThan(simple.complexity_score);
  });

  it('is deterministic — same input = same output', () => {
    const r1 = analyzeText('Determinism test content');
    const r2 = analyzeText('Determinism test content');
    expect(r1).toEqual(r2);
  });

  it('handles single character', () => {
    const r = analyzeText('a');
    expect(r.word_count).toBe(1);
    expect(r.char_count).toBe(1);
  });

  it('summary truncates long text', () => {
    const words = Array(20).fill('word').join(' ');
    const r = analyzeText(words);
    expect(r.summary).toContain('…');
  });

  it('summary does not truncate short text', () => {
    const r = analyzeText('Short text here');
    expect(r.summary).not.toContain('…');
  });

  it('tags multi-sentence', () => {
    const r = analyzeText('First sentence. Second sentence.');
    expect(r.tags).toContain('multi-sentence');
  });

  it('tags single-sentence', () => {
    const r = analyzeText('Just one sentence');
    expect(r.tags).toContain('single-sentence');
  });

  it('max tags <= 20', () => {
    // Input designed to trigger many tags
    const r = analyzeText('What?! The beautiful, dark sun shines 42 times. Joy and love! Amazing extraordinarily sophisticated.');
    expect(r.tags.length).toBeLessThanOrEqual(20);
  });
});
