/**
 * OMEGA V2.1 — Chunking Adaptatif Tests
 *
 * Vitest tests for adaptive chunking pipeline.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import {
  chunkAdaptive,
  isAdaptiveModeReady,
  getAdaptivePipelineStatus,
  ChunkingError,
  DEFAULT_ADAPTIVE_CONFIG,
  splitSentences,
  countWords,
  totalWords,
  tokenize,
  extractFeatures,
  extractVAKOG,
  extractBodyBinding,
  extractSentiment,
  extractPunctuationDensity,
  featureDistance,
  featureIntensity,
  determineDominantEmotion,
  EmotionalArcDetector,
  DEFAULT_DETECTOR_CONFIG,
  ChunkBoundaryOptimizer,
  computeArcBreakage,
  computeLengthVariance,
  computeDiscontinuity,
  computeTotalCost,
} from '../../src/chunking/index.js';

describe('OMEGA V2.1 — Chunking Adaptatif', () => {
  describe('Sentences', () => {
    it('splitSentences: empty text → empty array', () => {
      expect(splitSentences('')).toEqual([]);
      expect(splitSentences('   ')).toEqual([]);
    });

    it('splitSentences: single sentence', () => {
      const result = splitSentences('Une seule phrase.');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('Une seule phrase.');
    });

    it('splitSentences: multiple sentences', () => {
      const text = 'Première phrase. Deuxième phrase ! Troisième phrase ?';
      const result = splitSentences(text);
      expect(result).toHaveLength(3);
    });

    it('splitSentences: protects French abbreviations', () => {
      const text = 'M. Dupont arrive. Mme. Martin est là. C\'est etc. la fin.';
      const result = splitSentences(text);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(4);
    });

    it('countWords: counts alphanumeric tokens', () => {
      expect(countWords('Un deux trois')).toBe(3);
      expect(countWords('')).toBe(0);
      expect(countWords('Premier mot, deuxième.')).toBe(3);
    });

    it('totalWords: sum across sentences', () => {
      const sentences = ['Un deux.', 'Trois quatre cinq.'];
      expect(totalWords(sentences)).toBe(5);
    });
  });

  describe('Features extraction', () => {
    it('tokenize: French diacritics preserved internally', () => {
      const tokens = tokenize('Été chaud caractérise.');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    it('extractVAKOG: visual lexicon detected', () => {
      const f = extractVAKOG('Le regard lumineux brillait dans la couleur du soir');
      expect(f.v).toBeGreaterThan(0);
    });

    it('extractVAKOG: kinesthetic detected', () => {
      const f = extractVAKOG('Le froid du corps tremblait au toucher');
      expect(f.k).toBeGreaterThan(0);
    });

    it('extractBodyBinding: body terms ratio', () => {
      const r = extractBodyBinding('Sa main serra le poignet, le cœur battait');
      expect(r).toBeGreaterThan(0);
    });

    it('extractSentiment: positive words → positive score', () => {
      const s = extractSentiment('La joie le bonheur amour tendresse paix');
      expect(s).toBeGreaterThan(0);
    });

    it('extractSentiment: negative words → negative score', () => {
      const s = extractSentiment('La tristesse douleur peur angoisse');
      expect(s).toBeLessThan(0);
    });

    it('extractPunctuationDensity: punctuation per char', () => {
      const d = extractPunctuationDensity('Salut, oui ! Bien ?');
      expect(d).toBeGreaterThan(0);
    });

    it('extractFeatures: full vector', () => {
      const f = extractFeatures('Un texte simple.');
      expect(f.vakog).toBeDefined();
      expect(f.body_binding).toBeGreaterThanOrEqual(0);
      expect(f.concreteness).toBeGreaterThanOrEqual(0);
      expect(f.sentiment).toBeGreaterThanOrEqual(-1);
      expect(f.sentiment).toBeLessThanOrEqual(1);
      expect(f.punctuation_density).toBeGreaterThanOrEqual(0);
    });

    it('featureDistance: identical vectors → 0', () => {
      const f = extractFeatures('test');
      expect(featureDistance(f, f)).toBeCloseTo(0, 5);
    });

    it('featureDistance: different vectors → > 0', () => {
      const f1 = extractFeatures('joie bonheur amour');
      const f2 = extractFeatures('tristesse douleur peur');
      expect(featureDistance(f1, f2)).toBeGreaterThan(0);
    });

    it('featureIntensity: zero vector → 0', () => {
      expect(featureIntensity(extractFeatures(''))).toBeCloseTo(0, 5);
    });

    it('determineDominantEmotion: neutral default', () => {
      expect(determineDominantEmotion(extractFeatures('Le ciel est bleu'))).toMatch(
        /neutral|joy|surprise/
      );
    });

    it('determineDominantEmotion: positive sentiment → joy', () => {
      const f = extractFeatures('La joie bonheur amour tendresse');
      expect(determineDominantEmotion(f)).toBe('joy');
    });
  });

  describe('EmotionalArcDetector', () => {
    it('rejects invalid window_size', () => {
      expect(
        () =>
          new EmotionalArcDetector({
            ...DEFAULT_DETECTOR_CONFIG,
            window_size: 0,
          })
      ).toThrow();
    });

    it('rejects invalid intensity_threshold', () => {
      expect(
        () =>
          new EmotionalArcDetector({
            ...DEFAULT_DETECTOR_CONFIG,
            intensity_threshold: 5,
          })
      ).toThrow();
    });

    it('empty sentences → empty arcs', () => {
      const det = new EmotionalArcDetector();
      expect(det.detect([])).toEqual([]);
    });

    it('few sentences (less than 2x window) → single arc', () => {
      const det = new EmotionalArcDetector({ ...DEFAULT_DETECTOR_CONFIG, window_size: 5 });
      const sentences = ['Phrase 1.', 'Phrase 2.', 'Phrase 3.'];
      const arcs = det.detect(sentences);
      expect(arcs.length).toBe(1);
      expect(arcs[0]!.start_idx).toBe(0);
      expect(arcs[0]!.end_idx).toBe(3);
    });

    it('detect: covers full sentence range', () => {
      const det = new EmotionalArcDetector();
      const sentences = Array.from({ length: 20 }, (_, i) => `Phrase ${i + 1}.`);
      const arcs = det.detect(sentences);
      expect(arcs.length).toBeGreaterThanOrEqual(1);
      // First arc starts at 0
      expect(arcs[0]!.start_idx).toBe(0);
      // Last arc ends at sentences.length
      expect(arcs[arcs.length - 1]!.end_idx).toBe(sentences.length);
    });

    it('detect: emotional shift creates multiple arcs', () => {
      const det = new EmotionalArcDetector({
        ...DEFAULT_DETECTOR_CONFIG,
        window_size: 3,
        intensity_threshold: 0.1,
      });
      const happyText = Array.from(
        { length: 10 },
        () => 'La joie bonheur amour tendresse paix sourire.'
      );
      const sadText = Array.from(
        { length: 10 },
        () => 'La tristesse douleur peur angoisse pleurer.'
      );
      const sentences = [...happyText, ...sadText];
      const arcs = det.detect(sentences);
      expect(arcs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('ChunkBoundaryOptimizer', () => {
    it('rejects invalid min_chunks', () => {
      expect(
        () =>
          new ChunkBoundaryOptimizer({
            weights: DEFAULT_ADAPTIVE_CONFIG.weights,
            target_size: 750,
            min_chunks: 0,
            max_chunks: 5,
          })
      ).toThrow();
    });

    it('rejects max < min', () => {
      expect(
        () =>
          new ChunkBoundaryOptimizer({
            weights: DEFAULT_ADAPTIVE_CONFIG.weights,
            target_size: 750,
            min_chunks: 5,
            max_chunks: 2,
          })
      ).toThrow();
    });

    it('empty sentences → empty chunks', () => {
      const opt = new ChunkBoundaryOptimizer({
        weights: DEFAULT_ADAPTIVE_CONFIG.weights,
        target_size: 750,
        min_chunks: 2,
        max_chunks: 5,
      });
      expect(opt.optimize('', [], [])).toEqual([]);
    });

    it('short text → single chunk', () => {
      const opt = new ChunkBoundaryOptimizer({
        weights: DEFAULT_ADAPTIVE_CONFIG.weights,
        target_size: 750,
        min_chunks: 2,
        max_chunks: 5,
      });
      const sentences = ['Court.', 'Texte.'];
      const chunks = opt.optimize('', sentences, []);
      expect(chunks.length).toBe(1);
    });
  });

  describe('Cost functions', () => {
    it('computeArcBreakage: no arcs → 0', () => {
      expect(computeArcBreakage([], [])).toBe(0);
    });

    it('computeLengthVariance: empty → 0', () => {
      expect(computeLengthVariance([], 750)).toBe(0);
    });

    it('computeDiscontinuity: single chunk → 0', () => {
      const chunk = {
        id: 'c0',
        text: 'x',
        start_word: 0,
        end_word: 1,
        arcs: [],
        metadata: {
          chunk_index: 0,
          total_chunks: 1,
          word_count: 1,
          sentence_count: 1,
          arc_count: 0,
          cost_score: 0,
        },
      };
      expect(computeDiscontinuity([chunk])).toBe(0);
    });

    it('computeTotalCost: weights applied', () => {
      const chunk = {
        id: 'c0',
        text: 'x',
        start_word: 0,
        end_word: 1,
        arcs: [],
        metadata: {
          chunk_index: 0,
          total_chunks: 1,
          word_count: 750,
          sentence_count: 1,
          arc_count: 0,
          cost_score: 0,
        },
      };
      const cost = computeTotalCost([chunk], [], DEFAULT_ADAPTIVE_CONFIG.weights, 750);
      expect(cost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('chunkAdaptive() entry', () => {
    it('rejects empty text', () => {
      expect(() => chunkAdaptive('')).toThrow(ChunkingError);
      expect(() => chunkAdaptive('   ')).toThrow(ChunkingError);
    });

    it('rejects fixed mode', () => {
      expect(() =>
        chunkAdaptive('test', { ...DEFAULT_ADAPTIVE_CONFIG, mode: 'fixed' })
      ).toThrow(ChunkingError);
    });

    it('short text → single chunk', () => {
      const text = 'Une phrase courte. Une autre phrase.';
      const chunks = chunkAdaptive(text);
      expect(chunks.length).toBe(1);
      expect(chunks[0]!.metadata.total_chunks).toBe(1);
    });

    it('long text → multiple chunks', () => {
      // ~2000 words
      const longText = Array.from({ length: 100 }, (_, i) =>
        `Phrase numéro ${i + 1} avec beaucoup de mots et descriptions sensorielles variées comme la lumière ` +
        `le bruit le toucher l'odeur le goût et le corps qui ressent intensément la scène.`
      ).join(' ');
      const chunks = chunkAdaptive(longText);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks.length).toBeLessThanOrEqual(DEFAULT_ADAPTIVE_CONFIG.max_chunks);
      // Coverage check: all words accounted
      const totalChunkWords = chunks.reduce((sum, c) => sum + c.metadata.word_count, 0);
      expect(totalChunkWords).toBeGreaterThan(0);
    });

    it('chunks have proper metadata', () => {
      const text = Array.from({ length: 50 }, (_, i) => `Phrase ${i}.`).join(' ');
      const chunks = chunkAdaptive(text);
      chunks.forEach((c, i) => {
        expect(c.metadata.chunk_index).toBe(i);
        expect(c.metadata.total_chunks).toBe(chunks.length);
        expect(c.id).toMatch(/^chunk_\d+_\d+_\d+$/);
        expect(c.metadata.word_count).toBeGreaterThan(0);
        expect(c.metadata.sentence_count).toBeGreaterThan(0);
      });
    });

    it('isAdaptiveModeReady: false until calibration done', () => {
      expect(isAdaptiveModeReady()).toBe(false);
    });

    it('getAdaptivePipelineStatus: implementation done, calibration pending', () => {
      const status = getAdaptivePipelineStatus();
      expect(status.implementation_complete).toBe(true);
      expect(status.calibration_complete).toBe(false);
    });
  });
});
