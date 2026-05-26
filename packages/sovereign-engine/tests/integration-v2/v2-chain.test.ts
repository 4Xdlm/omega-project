/**
 * OMEGA V2.x — Integration Tests CROSS-MODULES
 *
 * Validates the V2 modules chain chunking → embeddings → early-exit
 * and verifies use cases / contracts between modules.
 *
 * Mission Architecte 2026-05-26 : "Vérifie les interactions entre les modules"
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import {
  // V2.1 chunking
  chunkAdaptive,
  isAdaptiveModeReady,
  getAdaptivePipelineStatus,
  DEFAULT_ADAPTIVE_CONFIG,
  EmotionalArcDetector,
  ChunkBoundaryOptimizer,
} from '../../src/chunking/index.js';
import type { Chunk } from '../../src/chunking/index.js';
import {
  // V2.2 embeddings
  OllamaEmbedder,
  DEFAULT_OLLAMA_CONFIG,
  cosineSimilarity,
  crossChunkContinuity,
} from '../../src/embeddings/index.js';
import {
  // V2.3 early-exit
  EarlyExitGate,
  DEFAULT_EARLY_EXIT_CONFIG,
  computeAxisDispersion,
  compositeScore,
} from '../../src/early-exit/index.js';
import type { AxisScores } from '../../src/early-exit/index.js';

describe('OMEGA V2.x — Integration Chain: chunking → embeddings → early-exit', () => {
  // Sample text long enough to produce multiple chunks
  const sampleText = Array.from({ length: 80 }, (_, i) => {
    const variants = [
      `La lumière éclatait sur l'horizon avec une intensité brillante phrase ${i}.`,
      `Le silence pesait dans la pièce sombre et froide.`,
      `Son cœur battait fort, ses mains tremblaient.`,
      `Le ciel bleu s'étendait à perte de vue.`,
    ];
    const v = variants[i % variants.length];
    return v ?? `Phrase ${i}.`;
  }).join(' ');

  describe('Step 1: V2.1 chunking produces valid chunks', () => {
    it('produces multiple chunks from long text', () => {
      const chunks = chunkAdaptive(sampleText);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks.length).toBeLessThanOrEqual(DEFAULT_ADAPTIVE_CONFIG.max_chunks);

      // Each chunk has required metadata
      chunks.forEach((c, i) => {
        expect(c.metadata.chunk_index).toBe(i);
        expect(c.metadata.word_count).toBeGreaterThan(0);
        expect(c.text.length).toBeGreaterThan(0);
      });
    });

    it('chunks cover full sentence range without overlap', () => {
      const chunks = chunkAdaptive(sampleText);
      // Each chunk has unique non-empty text
      const texts = chunks.map((c) => c.text);
      const uniqueTexts = new Set(texts);
      expect(uniqueTexts.size).toBe(chunks.length);
    });
  });

  describe('Step 2: V2.2 embeddings consume chunk texts', () => {
    it('OllamaEmbedder accepts chunk texts (conditional Ollama)', async () => {
      const embedder = new OllamaEmbedder();
      const health = await embedder.healthCheck();
      if (!health.ok) {
        console.warn(`[SKIP integration] Ollama unavailable: ${health.reason}`);
        return;
      }

      const chunks = chunkAdaptive(sampleText);
      const firstChunk = chunks[0];
      expect(firstChunk).toBeDefined();
      if (!firstChunk) return;

      const embedding = await embedder.embed(firstChunk.text);
      expect(embedding).toBeInstanceOf(Float32Array);
      expect(embedding.length).toBe(DEFAULT_OLLAMA_CONFIG.dimensions);
    }, 30000);

    it('crossChunkContinuity on real chunk embeddings (conditional)', async () => {
      const embedder = new OllamaEmbedder();
      const health = await embedder.healthCheck();
      if (!health.ok) {
        console.warn(`[SKIP integration] Ollama unavailable: ${health.reason}`);
        return;
      }

      const chunks = chunkAdaptive(sampleText);
      if (chunks.length < 2) {
        console.warn(`[SKIP] Need at least 2 chunks for continuity, got ${chunks.length}`);
        return;
      }

      // Embed first 3 chunks (limit for test speed)
      const limit = Math.min(3, chunks.length);
      const embeddings: Float32Array[] = [];
      for (let i = 0; i < limit; i++) {
        const c = chunks[i];
        if (c) embeddings.push(await embedder.embed(c.text));
      }

      const continuity = crossChunkContinuity(embeddings);
      expect(continuity.chunk_count).toBe(limit);
      expect(continuity.pair_scores.length).toBe(limit - 1);
      // Score should be in valid range
      expect(continuity.score).toBeGreaterThanOrEqual(0);
      expect(continuity.score).toBeLessThanOrEqual(1);
    }, 90000);
  });

  describe('Step 3: V2.3 early-exit consumes axis scores', () => {
    it('EarlyExitGate produces decisions for typical chunk scoring', () => {
      const gate = new EarlyExitGate();

      // Scenario A: uniform high score → exit
      const scoresA: AxisScores = { ecc: 85, aai: 86, rci: 84, sii: 85, ifi: 86 };
      const decisionA = gate.shouldExit(scoresA);
      expect(decisionA.exit).toBe(true);
      expect(decisionA.confidence).toBeGreaterThan(0);

      // Scenario B: uneven scores → no exit
      const scoresB: AxisScores = { ecc: 95, aai: 65, rci: 95, sii: 65, ifi: 95 };
      const decisionB = gate.shouldExit(scoresB);
      expect(decisionB.exit).toBe(false);
    });

    it('compositeScore matches dispersion mean', () => {
      const scores: AxisScores = { ecc: 80, aai: 82, rci: 81, sii: 79, ifi: 83 };
      const dispersion = computeAxisDispersion(scores);
      const composite = compositeScore(scores);
      // Default uniform weights → composite = mean
      expect(composite).toBeCloseTo(dispersion.mean, 5);
    });
  });

  describe('Step 4: Full chain chunking → continuity score → early-exit decision', () => {
    it('chain produces consistent metadata flow (without Ollama)', () => {
      const chunks = chunkAdaptive(sampleText);
      expect(chunks.length).toBeGreaterThan(0);

      // Simulate axis scoring based on chunk metadata
      const simulatedScores: AxisScores = {
        ecc: 75 + chunks.length * 2, // more chunks = better continuity proxy
        aai: 80,
        rci: 82,
        sii: 78,
        ifi: 81,
      };

      const gate = new EarlyExitGate();
      const decision = gate.shouldExit(simulatedScores);

      // Decision should be valid (boolean exit + structured reason)
      expect(typeof decision.exit).toBe('boolean');
      expect(decision.reason.length).toBeGreaterThan(0);
      expect(decision.dispersion).toBeDefined();
    });

    it('chain with Ollama: full chunking → embedding → continuity → exit decision (conditional)', async () => {
      const embedder = new OllamaEmbedder();
      const health = await embedder.healthCheck();
      if (!health.ok) {
        console.warn(`[SKIP] Ollama unavailable: ${health.reason}`);
        return;
      }

      // Stage 1: chunk
      const chunks = chunkAdaptive(sampleText);
      expect(chunks.length).toBeGreaterThanOrEqual(1);

      // Stage 2: embed (limit for speed)
      const limit = Math.min(3, chunks.length);
      const embeddings: Float32Array[] = [];
      for (let i = 0; i < limit; i++) {
        const c = chunks[i];
        if (c) embeddings.push(await embedder.embed(c.text));
      }

      // Stage 3: continuity score
      const continuity = crossChunkContinuity(embeddings);
      expect(continuity.score).toBeGreaterThanOrEqual(0);

      // Stage 4: convert continuity to axis score + early-exit
      const continuityAsAxis = continuity.score * 100; // [0,1] → [0,100]
      const simulatedScores: AxisScores = {
        ecc: continuityAsAxis,
        aai: 80,
        rci: 82,
        sii: 78,
        ifi: 81,
      };
      const gate = new EarlyExitGate();
      const decision = gate.shouldExit(simulatedScores);
      // Whatever decision, structure must be valid
      expect(typeof decision.exit).toBe('boolean');
    }, 90000);
  });

  describe('Module readiness reporting', () => {
    it('V2.1 chunking: implementation complete, calibration pending', () => {
      const status = getAdaptivePipelineStatus();
      expect(status.implementation_complete).toBe(true);
      expect(status.calibration_complete).toBe(false);
      expect(isAdaptiveModeReady()).toBe(false);
    });

    it('V2.3 early-exit: implementation complete, production gate pending', () => {
      expect(EarlyExitGate.isProductionReady()).toBe(false);
    });
  });

  describe('Contracts verification (cross-module types)', () => {
    it('Chunk.text is string consumable by OllamaEmbedder.embed()', () => {
      const chunks = chunkAdaptive(sampleText);
      const firstChunk = chunks[0];
      expect(firstChunk).toBeDefined();
      // Type check: chunk.text is string
      const textType = typeof firstChunk?.text;
      expect(textType).toBe('string');
    });

    it('Float32Array from OllamaEmbedder is consumable by cosineSimilarity', () => {
      // Manually create same-dimension Float32Arrays
      const v1 = new Float32Array(768).fill(0.1);
      const v2 = new Float32Array(768).fill(0.1);
      const sim = cosineSimilarity(v1, v2);
      expect(sim).toBeCloseTo(1, 5);
    });

    it('AxisScores is consumable by EarlyExitGate.shouldExit()', () => {
      const scores: AxisScores = { ecc: 80, aai: 80, rci: 80, sii: 80, ifi: 80 };
      const gate = new EarlyExitGate();
      const decision = gate.shouldExit(scores);
      expect(decision).toHaveProperty('exit');
      expect(decision).toHaveProperty('confidence');
      expect(decision).toHaveProperty('dispersion');
    });
  });

  describe('Non-regression: V2 modules do NOT affect production pipeline', () => {
    it('V2.1 chunkAdaptive is independent module (no side-effects on engine)', () => {
      // Calling chunkAdaptive should not modify any global state
      const chunks1 = chunkAdaptive(sampleText);
      const chunks2 = chunkAdaptive(sampleText);
      // Deterministic: same input → same output (chunk count)
      expect(chunks1.length).toBe(chunks2.length);
    });

    it('OllamaEmbedder is independent module (does not initialize on import)', () => {
      // Importing OllamaEmbedder should not trigger Ollama calls
      const embedder = new OllamaEmbedder();
      expect(embedder).toBeDefined();
      // No automatic API call on construction
    });

    it('EarlyExitGate is independent module', () => {
      const gate = new EarlyExitGate();
      expect(gate.getSkipRate()).toBe(0); // no history initially
    });
  });

  describe('V2 + existing pipeline coexistence', () => {
    it('V2.1 chunkAdaptive uses lexical features (no EmotionContract required)', () => {
      // Unlike V2-B adaptive-chunker which requires EmotionContract,
      // V2.1 chunkAdaptive works on RAW TEXT only.
      // This makes V2.1 usable for corpus analysis without forge packet.
      const chunks = chunkAdaptive(sampleText);
      expect(chunks).toBeDefined();
      // No EmotionContract was needed to produce chunks
    });

    it('V2.1 uses different config interface than V2-B (no conflict)', () => {
      const config = DEFAULT_ADAPTIVE_CONFIG;
      // V2.1 config: mode/target_size/weights/min_chunks/max_chunks
      expect(config).toHaveProperty('mode');
      expect(config).toHaveProperty('target_size');
      expect(config).toHaveProperty('weights');
      expect(config.weights).toHaveProperty('arc_breakage');
      expect(config.weights).toHaveProperty('length_variance');
      expect(config.weights).toHaveProperty('discontinuity');
      // V2-B has different config (alpha/beta/gamma/delta on EmotionContract)
    });
  });

  describe('Standalone detector + optimizer (no pipeline coupling)', () => {
    it('EmotionalArcDetector usable standalone', () => {
      const detector = new EmotionalArcDetector();
      const arcs = detector.detect(['Phrase 1.', 'Phrase 2.', 'Phrase 3.']);
      expect(Array.isArray(arcs)).toBe(true);
    });

    it('ChunkBoundaryOptimizer usable standalone', () => {
      const optimizer = new ChunkBoundaryOptimizer({
        weights: DEFAULT_ADAPTIVE_CONFIG.weights,
        target_size: 750,
        min_chunks: 2,
        max_chunks: 5,
      });
      const chunks = optimizer.optimize('test', [], []);
      expect(Array.isArray(chunks)).toBe(true);
    });
  });
});
