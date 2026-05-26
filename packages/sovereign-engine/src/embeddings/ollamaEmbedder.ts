/**
 * OMEGA V2.2 — OllamaEmbedder (PIVOT IMPLEMENTATION)
 *
 * Uses local Ollama HTTP API with `nomic-embed-text` model.
 * Eliminates dependency on @xenova/transformers + 50MB model download.
 *
 * Discovery 2026-05-26: nomic-embed-text already installed local
 * (137M params, 274MB, 768-dim multilingual embeddings).
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Sprint V2.2 implementation 2026-05-26
 */

import type { EmbeddingResult } from './types.js';
import { EmbeddingError } from './types.js';

export interface OllamaEmbedderConfig {
  readonly endpoint: string; // default: http://localhost:11434
  readonly model: string; // default: nomic-embed-text
  readonly dimensions: number; // 768 for nomic-embed-text
  readonly timeout_ms: number; // default: 30000
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
   * Embed a single text via Ollama API.
   *
   * @param text - Text to embed
   * @returns Float32Array of size config.dimensions
   * @throws EmbeddingError on API failure or dimension mismatch
   */
  async embed(text: string): Promise<Float32Array> {
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
      // Audit 2026-05-26 P1 fix : clearTimeout in finally prevents leak + race
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

  /**
   * Embed multiple texts in batch (sequentially via Ollama).
   *
   * Note: Ollama API doesn't have native batch endpoint, so we sequentialize.
   * Future optimization: parallel with concurrency limit.
   *
   * @param texts - Texts to embed
   * @returns Array of Float32Array embeddings
   */
  async embedBatch(texts: readonly string[]): Promise<Float32Array[]> {
    const results: Float32Array[] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  /**
   * Get embedding with metadata + cache placeholder.
   *
   * Cache implementation: Sprint V2.2.1 (disk-based deterministic SHA256 key).
   * Current behavior: always recomputes.
   */
  async getCachedOrCompute(text: string, _cacheKey: string): Promise<EmbeddingResult> {
    const t0 = Date.now();
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

  /**
   * Check if Ollama API is reachable + model available.
   *
   * @returns true if API responds and configured model is loaded
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
   * Check if embedder is production-ready.
   * Returns true if healthCheck() succeeds.
   */
  async isReady(): Promise<boolean> {
    const health = await this.healthCheck();
    return health.ok;
  }
}
