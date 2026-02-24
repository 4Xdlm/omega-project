/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — LLM JUDGE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/llm-judge.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * LLM-based axis judge: calls Anthropic Messages API.
 * - JSON schema validation (fail-closed)
 * - 30s timeout (fail-closed)
 * - Retry on 429/503 (max 2 retries, backoff 2s×n)
 * - Model lock verification [INV-VAL-04]
 * - SHA256 cache integration (judge-cache.ts)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';
import type { JudgeCache, JudgeResult } from '../validation/judge-cache.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export class JudgeSchemaError extends Error {
  constructor(axis: string, rawText: string) {
    super(`JudgeSchemaError [${axis}]: invalid JSON schema — raw: "${rawText.slice(0, 200)}"`);
    this.name = 'JudgeSchemaError';
  }
}

export class JudgeTimeoutError extends Error {
  constructor(axis: string, timeoutMs: number) {
    super(`JudgeTimeoutError [${axis}]: exceeded ${timeoutMs}ms`);
    this.name = 'JudgeTimeoutError';
  }
}

export class ModelDriftError extends Error {
  constructor(expected: string, actual: string) {
    super(`ModelDriftError: expected ${expected}, got ${actual}`);
    this.name = 'ModelDriftError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_RETRIES = 3; // initial + 2 retries
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRY_BASE_MS = 2000;
const DEFAULT_RATE_LIMIT_MS = 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// JUDGE PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const JUDGE_PROMPTS: Record<string, string> = {
  interiorite: `Tu es un juge littéraire expert. Note l'intériorité de ce texte.
Intériorité = accès à la vie intérieure du personnage: pensées, perceptions subjectives, états émotionnels non-dits, voix interne.`,

  impact: `Tu es un juge littéraire expert. Note l'impact émotionnel de ce texte.
Impact = force de la réaction émotionnelle provoquée chez le lecteur: tension, empathie, saisissement, résonance affective durable.`,

  necessite: `Tu es un juge littéraire expert. Note la nécessité de ce texte.
Nécessité = chaque mot/phrase est indispensable, 0 superflu, 0 remplissage, densité maximale, rien ne peut être supprimé sans perte.`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface LLMJudgeOptions {
  readonly timeoutMs?: number;
  readonly retryBaseMs?: number;
  readonly rateLimitMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM JUDGE
// ═══════════════════════════════════════════════════════════════════════════════

export class LLMJudge {
  private readonly modelId: string;
  private readonly apiKey: string;
  private readonly cache: JudgeCache;
  private readonly timeoutMs: number;
  private readonly retryBaseMs: number;
  private readonly rateLimitMs: number;
  private lastCallTime = 0;

  constructor(
    modelId: string,
    apiKey: string,
    cache: JudgeCache,
    options?: LLMJudgeOptions,
  ) {
    this.modelId = modelId;
    this.apiKey = apiKey;
    this.cache = cache;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryBaseMs = options?.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;
    this.rateLimitMs = options?.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
  }

  /**
   * Judge a prose text on a given axis.
   * Cache key = SHA256(axis + prose + seed)
   */
  async judge(axis: string, prose: string, seed: string): Promise<JudgeResult> {
    const cacheKey = sha256(axis + prose + seed);

    // Cache hit → return immediately, 0 API calls
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Cache miss → call API
    const prompt = this.buildPrompt(axis, prose);
    const rawText = await this.callWithRetry(axis, prompt);
    const result = this.parseAndValidate(axis, rawText);

    // Store in cache
    this.cache.set(cacheKey, result);

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT BUILDING
  // ═══════════════════════════════════════════════════════════════════════════

  private buildPrompt(axis: string, prose: string): string {
    const preamble = JUDGE_PROMPTS[axis];
    if (!preamble) {
      // Generic judge prompt for axes not explicitly defined
      return `Tu es un juge littéraire expert. Note la qualité "${axis}" de ce texte.
Texte: ${prose.slice(0, 3000)}
Réponds UNIQUEMENT en JSON: {"score": <0.0-1.0>, "reason": "<max 100 chars>"}`;
    }

    return `${preamble}
Texte: ${prose.slice(0, 3000)}
Réponds UNIQUEMENT en JSON: {"score": <0.0-1.0>, "reason": "<max 100 chars>"}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API CALL WITH RETRY + TIMEOUT
  // ═══════════════════════════════════════════════════════════════════════════

  private async callWithRetry(axis: string, prompt: string): Promise<string> {
    await this.rateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const text = await this.callWithTimeout(prompt, axis);
        return text;
      } catch (error: unknown) {
        if (error instanceof JudgeTimeoutError || error instanceof ModelDriftError) {
          throw error; // Don't retry on timeout or model drift
        }

        const message = error instanceof Error ? error.message : String(error);

        // Retry on 429 or 503
        if (message.includes('429') || message.includes('503')) {
          const backoff = this.retryBaseMs * (attempt + 1);
          await new Promise((r) => setTimeout(r, backoff));
          lastError = error instanceof Error ? error : new Error(message);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error(`LLMJudge [${axis}]: all retry attempts failed`);
  }

  private async callWithTimeout(prompt: string, axis: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await globalThis.fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.modelId,
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      if (response.status === 429 || response.status === 503) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        model?: string;
        content?: Array<{ type: string; text: string }>;
      };

      // Model lock check [INV-VAL-04]
      if (data.model && data.model !== this.modelId) {
        throw new ModelDriftError(this.modelId, data.model);
      }

      const text = data.content?.[0]?.text;
      if (!text) {
        throw new JudgeSchemaError(axis, 'empty response content');
      }

      return text;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new JudgeTimeoutError(axis, this.timeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEMA VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private parseAndValidate(axis: string, rawText: string): JudgeResult {
    // Extract JSON from response (may have surrounding text)
    const jsonMatch = rawText.match(/\{[^}]*"score"\s*:\s*[\d.]+[^}]*\}/);
    if (!jsonMatch) {
      throw new JudgeSchemaError(axis, rawText);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new JudgeSchemaError(axis, rawText);
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('score' in parsed) ||
      !('reason' in parsed)
    ) {
      throw new JudgeSchemaError(axis, rawText);
    }

    const obj = parsed as { score: unknown; reason: unknown };
    const score = Number(obj.score);
    const reason = String(obj.reason);

    if (isNaN(score) || score < 0 || score > 1) {
      throw new JudgeSchemaError(axis, rawText);
    }

    if (reason.length > 200) {
      throw new JudgeSchemaError(axis, rawText);
    }

    return { score, reason: reason.slice(0, 100) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ═══════════════════════════════════════════════════════════════════════════

  private async rateLimit(): Promise<void> {
    if (this.rateLimitMs <= 0) return;
    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    if (elapsed < this.rateLimitMs) {
      await new Promise((r) => setTimeout(r, this.rateLimitMs - elapsed));
    }
    this.lastCallTime = Date.now();
  }
}
