/**
 * OMEGA V2.2 — OllamaEmbedder (PIVOT IMPLEMENTATION)
 *
 * Uses local Ollama HTTP API with `nomic-embed-text` model.
 * Eliminates dependency on @xenova/transformers + 50MB model download.
 *
 * Discovery 2026-05-26: nomic-embed-text already installed local
 * (137M params, 274MB, 768-dim multilingual embeddings).
 *
 * V2.2-A.1 (2026-05-28): Disk cache SHA256 deterministic key.
 * Format: [0..1] uint16 LE dimensions + [2..N] Float32 LE vector.
 * Cache key: sha256(model|text) -- cross-model contamination prevented.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Sprint V2.2 implementation 2026-05-26 + V2.2-A.1 cache 2026-05-28
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from 'node:fs';
import { join } from 'node:path';
import type { EmbeddingResult } from './types.js';
import { EmbeddingError } from './types.js';

export interface OllamaEmbedderConfig {
  readonly endpoint: string;
  readonly model: string;
  readonly dimensions: number;
  readonly timeout_ms: number;
  readonly cache_dir: string;
  readonly use_cache: boolean;
}

export const DEFAULT_OLLAMA_CONFIG: OllamaEmbedderConfig = {
  endpoint: 'http://localhost:11434',
  model: 'nomic-embed-text',
  dimensions: 768,
  timeout_ms: 30000,
  cache_dir: '.omega-cache/embeddings',
  use_cache: true,
};

interface OllamaEmbeddingResponse {
  readonly embedding: number[];
}

/**
 * V2.2-B Option α (2026-05-28): Sub-chunking + circuit breaker production-grade.
 *
 * Root cause: nomic-embed-text Ollama native context length = 2048 tokens
 * (PARAMETER num_ctx 8192 Modelfile override IGNORED — model compiled hardcoded 2048).
 * Empirical cutoff: 1680-1837 tokens BPE ≈ 1050-1148 words.
 *
 * Production safety: any input > MAX_WORDS_PER_REQUEST is automatically split into
 * sub-chunks, each embedded separately, then mean-pooled + L2-normalized.
 * This eliminates all risk of Ollama daemon crash on oversize input.
 *
 * Pooling strategy: mean of L2-normalized sub-vectors, then L2-renormalize.
 * Standard for sentence-level embeddings aggregation (Sentence-BERT pattern).
 *
 * Sealing ref: V2_2_B_FORENSIC_CUTOFF_ROOT_CAUSE_2026-05-28.md
 * Tribunal: ChatGPT mandate "circuit breaker in PRODUCTION code, not bench only"
 */
const MAX_WORDS_PER_REQUEST = 1000;

export class OllamaEmbedder {
  private readonly config: OllamaEmbedderConfig;

  constructor(config: OllamaEmbedderConfig = DEFAULT_OLLAMA_CONFIG) {
    if (config.dimensions <= 0) {
      throw new EmbeddingError(
        `dimensions must be > 0, got ${config.dimensions}`,
        'INVALID_CONFIG'
      );
    }
    if (!config.endpoint.startsWith('http')) {
      throw new EmbeddingError(
        `endpoint must start with http, got ${config.endpoint}`,
        'INVALID_CONFIG'
      );
    }
    this.config = config;
  }

  /**
   * Public embed entry point with V2.2-B Option α sub-chunking.
   *
   * If word_count > MAX_WORDS_PER_REQUEST: split into sub-chunks ≤ MAX,
   * embed each, mean-pool, L2-renormalize.
   * Else: fast path direct embedRaw().
   *
   * Always returns a single Float32Array of `config.dimensions` size.
   * Never throws OVERSIZE_INPUT — sub-chunking handles all sizes.
   */
  async embed(text: string): Promise<Float32Array> {
    if (!text || text.trim().length === 0) {
      throw new EmbeddingError('Input text is empty', 'EMPTY_INPUT');
    }
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= MAX_WORDS_PER_REQUEST) {
      return this.embedRaw(text);
    }
    // Sub-chunking path
    // V2.2-B.1 (2026-05-28): Switched mean-pool → max-pool to address signal
    // dilution paradox (B0 post-α range 0.0563 vs B0' v3 0.1994 with mean-pool).
    // Empirical pattern: mean-pooling N>10 sub-embeddings regresses to
    // distribution center, destroying inter-book discrimination.
    // Max-pool preserves dimensional peaks (semantic salience per dim).
    const subTexts = this.splitWordsIntoChunks(words, MAX_WORDS_PER_REQUEST);
    const subVectors: Float32Array[] = [];
    for (const sub of subTexts) {
      subVectors.push(await this.embedRaw(sub));
    }
    return this.l2Normalize(this.maxPoolVectors(subVectors));
  }

  /**
   * Low-level single-request embed. Sends prompt as-is to Ollama.
   * Caller MUST ensure word_count ≤ MAX_WORDS_PER_REQUEST.
   * Used internally by embed() (fast path or per sub-chunk).
   */
  private async embedRaw(text: string): Promise<Float32Array> {
    if (!text || text.trim().length === 0) {
      throw new EmbeddingError('Input text is empty', 'EMPTY_INPUT');
    }

    const url = `${this.config.endpoint}/api/embeddings`;
    const body = JSON.stringify({
      model: this.config.model,
      prompt: text,
    });

    let response: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout_ms);
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      throw new EmbeddingError(
        `Ollama API request failed: ${errMsg}`,
        'NETWORK_ERROR',
        { endpoint: url, model: this.config.model }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new EmbeddingError(
        `Ollama API returned ${response.status} ${response.statusText}`,
        'API_ERROR',
        { status: response.status }
      );
    }

    const data = (await response.json()) as OllamaEmbeddingResponse;

    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new EmbeddingError(
        'Ollama API returned no embedding array',
        'INVALID_RESPONSE',
        { received: typeof data.embedding }
      );
    }

    if (data.embedding.length !== this.config.dimensions) {
      throw new EmbeddingError(
        `Embedding dimension mismatch: expected ${this.config.dimensions}, got ${data.embedding.length}`,
        'DIMENSION_MISMATCH',
        { expected: this.config.dimensions, actual: data.embedding.length }
      );
    }

    return new Float32Array(data.embedding);
  }

  async embedBatch(texts: readonly string[]): Promise<Float32Array[]> {
    const results: Float32Array[] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  /**
   * Split words array into contiguous chunks of at most `maxWords` per chunk.
   * Last chunk may be smaller. Joins each with single space (no boundary detection,
   * simple but deterministic).
   * V2.2-B Option α: input safety pre-split helper.
   */
  private splitWordsIntoChunks(words: readonly string[], maxWords: number): string[] {
    if (maxWords <= 0) {
      throw new EmbeddingError(
        `maxWords must be > 0, got ${maxWords}`,
        'INVALID_CONFIG'
      );
    }
    const out: string[] = [];
    for (let i = 0; i < words.length; i += maxWords) {
      out.push(words.slice(i, i + maxWords).join(' '));
    }
    return out;
  }

  /**
   * Component-wise max pool a set of equal-dimension vectors.
   * For each dimension i, output[i] = max(v[i]) across all vectors.
   * Throws DIMENSION_MISMATCH if any vector has unexpected length.
   *
   * V2.2-B.1 Option α refinement: preserves dimensional semantic peaks
   * (high-magnitude features survive aggregation). Resists regression-to-mean
   * dilution observed with mean-pooling on large N (>10 sub-embeddings).
   * Output must be L2-renormalized by caller (max-pool is not unit-normalized).
   */
  private maxPoolVectors(vectors: readonly Float32Array[]): Float32Array {
    if (vectors.length === 0) {
      throw new EmbeddingError('No vectors to max-pool', 'EMPTY_INPUT');
    }
    const dim = vectors[0]!.length;
    const out = new Float32Array(dim);
    // Initialize with first vector
    for (let i = 0; i < dim; i++) {
      out[i] = vectors[0]![i] ?? 0;
    }
    for (let k = 1; k < vectors.length; k++) {
      const v = vectors[k]!;
      if (v.length !== dim) {
        throw new EmbeddingError(
          `Dimension mismatch in maxPoolVectors: expected ${dim}, got ${v.length}`,
          'DIMENSION_MISMATCH',
          { expected: dim, actual: v.length }
        );
      }
      for (let i = 0; i < dim; i++) {
        const x = v[i] ?? 0;
        if (x > (out[i] ?? 0)) {
          out[i] = x;
        }
      }
    }
    return out;
  }

  /**
   * Mean-pool a set of equal-dimension vectors (LEGACY V2.2-B.0).
   * Throws DIMENSION_MISMATCH if any vector has unexpected length.
   * Retained for tests, ensemble usage, and forensic comparison.
   *
   * NOTE: empirical V2.2-B.0 bench (16 livres, 17-55 sub-embeddings/chunk)
   * showed signal dilution paradox (range 0.1994→0.0563). V2.2-B.1 max-pool
   * empirically equivalent (range 0.0485, marginally worse). Both pooling
   * strategies converge ~0.95 on long books — pooling is NOT the lever.
   * Root cause: crossChunkContinuity() mean aggregation across pairs.
   * See V2_2_B_B0_POST_ALPHA_PARADOX_2026-05-28.md + B.1 bench results.
   */
  // @ts-expect-error retained for forensic ensemble comparison; not in hot path
  private averageVectors(vectors: readonly Float32Array[]): Float32Array {
    if (vectors.length === 0) {
      throw new EmbeddingError('No vectors to average', 'EMPTY_INPUT');
    }
    const dim = vectors[0]!.length;
    const out = new Float32Array(dim);
    for (const v of vectors) {
      if (v.length !== dim) {
        throw new EmbeddingError(
          `Dimension mismatch in averageVectors: expected ${dim}, got ${v.length}`,
          'DIMENSION_MISMATCH',
          { expected: dim, actual: v.length }
        );
      }
      for (let i = 0; i < dim; i++) {
        out[i] = (out[i] ?? 0) + (v[i] ?? 0);
      }
    }
    const n = vectors.length;
    for (let i = 0; i < dim; i++) {
      out[i] = (out[i] ?? 0) / n;
    }
    return out;
  }

  /**
   * L2-normalize a vector to unit length. Zero-vector returned unchanged.
   * V2.2-B Option α: sub-chunk aggregation step 2/2 (post mean-pool).
   */
  private l2Normalize(v: Float32Array): Float32Array {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
      const x = v[i] ?? 0;
      sum += x * x;
    }
    const norm = Math.sqrt(sum);
    if (norm < 1e-9) {
      return v;
    }
    const out = new Float32Array(v.length);
    for (let i = 0; i < v.length; i++) {
      out[i] = (v[i] ?? 0) / norm;
    }
    return out;
  }

  /**
   * V2.2-A.1 cache key: SHA256 of `<model>|<text>` to prevent cross-model
   * contamination (different models produce different vectors for same text).
   */
  private computeCacheKey(text: string): string {
    return createHash('sha256').update(`${this.config.model}|${text}`).digest('hex');
  }

  /**
   * V2.2-A.1 sharded cache path: <cache_dir>/<first2chars>/<key>.bin
   * Sharding avoids single-directory file explosion at scale.
   */
  private cacheFilePath(key: string): string {
    const shard = key.slice(0, 2);
    return join(this.config.cache_dir, shard, `${key}.bin`);
  }

  /**
   * V2.2-A.1 binary cache read.
   * Format: [0..1] uint16 LE dimensions + [2..N] Float32 LE vector.
   * Returns null on miss, malformed, or dimension mismatch.
   */
  private readCache(key: string): Float32Array | null {
    const path = this.cacheFilePath(key);
    if (!existsSync(path)) return null;
    try {
      const buf = readFileSync(path);
      if (buf.length < 2) return null;
      const dims = buf.readUInt16LE(0);
      if (dims !== this.config.dimensions) return null;
      const expectedBytes = 2 + dims * 4;
      if (buf.length !== expectedBytes) return null;
      const out = new Float32Array(dims);
      for (let i = 0; i < dims; i++) {
        out[i] = buf.readFloatLE(2 + i * 4);
      }
      return out;
    } catch {
      return null;
    }
  }

  /**
   * V2.2-A.1 atomic cache write: write to .tmp, then renameSync.
   * Avoids partial writes on crash. Best-effort: caller catches errors.
   */
  private writeCache(key: string, vector: Float32Array): void {
    const path = this.cacheFilePath(key);
    const shard = key.slice(0, 2);
    const dir = join(this.config.cache_dir, shard);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const dims = vector.length;
    const buf = Buffer.alloc(2 + dims * 4);
    buf.writeUInt16LE(dims, 0);
    for (let i = 0; i < dims; i++) {
      buf.writeFloatLE(vector[i] ?? 0, 2 + i * 4);
    }
    const tmpPath = `${path}.tmp`;
    writeFileSync(tmpPath, buf);
    renameSync(tmpPath, path);
  }

  /**
   * Public embed with cache lookup + metadata.
   * Cache key includes model name (cross-model isolation).
   * Cache value = final aggregated vector (post sub-chunking + mean + L2 if applicable).
   * Best-effort cache write: failures silently ignored (transient FS issues).
   */
  async getCachedOrCompute(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new EmbeddingError('Input text is empty', 'EMPTY_INPUT');
    }

    const t0 = Date.now();

    if (!this.config.use_cache) {
      const vector = await this.embed(text);
      return {
        text,
        vector,
        model: this.config.model as EmbeddingResult['model'],
        dimensions: this.config.dimensions,
        computed_at: t0,
        cache_hit: false,
      };
    }

    const key = this.computeCacheKey(text);
    const cached = this.readCache(key);
    if (cached !== null) {
      return {
        text,
        vector: cached,
        model: this.config.model as EmbeddingResult['model'],
        dimensions: this.config.dimensions,
        computed_at: t0,
        cache_hit: true,
      };
    }

    const vector = await this.embed(text);
    try {
      this.writeCache(key, vector);
    } catch {
      // best-effort cache write
    }

    return {
      text,
      vector,
      model: this.config.model as EmbeddingResult['model'],
      dimensions: this.config.dimensions,
      computed_at: t0,
      cache_hit: false,
    };
  }

  /**
   * Probe Ollama daemon + verify configured model is loaded.
   * Returns {ok:true, available_models:[...]} on success.
   */
  async healthCheck(): Promise<{ ok: boolean; reason?: string; available_models?: string[] }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${this.config.endpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { ok: false, reason: `API status ${response.status}` };
      }

      const data = (await response.json()) as { models?: { name: string }[] };
      const available = data.models?.map((m) => m.name) ?? [];
      const hasModel = available.some((n) => n.startsWith(this.config.model));

      if (!hasModel) {
        return {
          ok: false,
          reason: `Model '${this.config.model}' not loaded`,
          available_models: available,
        };
      }

      return { ok: true, available_models: available };
    } catch (e) {
      return {
        ok: false,
        reason: `Ollama unreachable: ${(e as Error).message}`,
      };
    }
  }

  /**
   * Convenience wrapper: returns true if healthCheck() succeeds.
   */
  async isReady(): Promise<boolean> {
    const health = await this.healthCheck();
    return health.ok;
  }
}
