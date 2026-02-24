/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — ANTHROPIC LLM PROVIDER (REAL)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: validation/real-llm-provider.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Phase VALIDATION — Real LLM Runs
 *
 * AnthropicLLMProvider: calls the Anthropic Messages API.
 * - Rate limiting: configurable delay between calls (default 3000ms)
 * - Retry: exponential backoff on 429 (max 3 attempts)
 * - Model lock: verifies response model matches requested model [INV-VAL-04]
 * - Native fetch: no SDK dependency (Node 18+)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket } from '../types.js';
import type { LLMProvider } from './validation-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_RETRIES = 3;
const DEFAULT_RATE_LIMIT_MS = 3000;
const DEFAULT_RETRY_BASE_MS = 5000;
const MAX_GENERATION_TOKENS = 2000;
const MAX_JUDGE_TOKENS = 100;

export interface AnthropicProviderOptions {
  readonly rateLimitMs?: number;
  readonly retryBaseMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTHROPIC LLM PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export class AnthropicLLMProvider implements LLMProvider {
  readonly model_id: string;
  private readonly apiKey: string;
  private readonly rateLimitMs: number;
  private readonly retryBaseMs: number;
  private lastCallTime = 0;

  constructor(modelId: string, apiKey: string, options?: AnthropicProviderOptions) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('AnthropicLLMProvider: API key must not be empty');
    }
    this.model_id = modelId;
    this.apiKey = apiKey.trim();
    this.rateLimitMs = options?.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
    this.retryBaseMs = options?.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LLMProvider INTERFACE
  // ═══════════════════════════════════════════════════════════════════════════

  async generateDraft(packet: ForgePacket, seed: string): Promise<string> {
    const prompt = buildGenerationPrompt(packet, seed);
    return this.callAnthropic([{ role: 'user', content: prompt }], MAX_GENERATION_TOKENS);
  }

  async judgeLLMAxis(prose: string, axis: string, seed: string): Promise<number> {
    const prompt = buildJudgePrompt(prose, axis, seed);
    const response = await this.callAnthropic([{ role: 'user', content: prompt }], MAX_JUDGE_TOKENS);
    const trimmed = response.trim();
    const score = parseFloat(trimmed);
    if (isNaN(score) || score < 0 || score > 1) {
      throw new Error(`judgeLLMAxis: invalid score "${trimmed}" for axis ${axis} — expected number in [0,1]`);
    }
    return score;
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

  // ═══════════════════════════════════════════════════════════════════════════
  // API CALL WITH RETRY
  // ═══════════════════════════════════════════════════════════════════════════

  private async callAnthropic(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number,
  ): Promise<string> {
    await this.rateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const response = await globalThis.fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.model_id,
          max_tokens: maxTokens,
          messages,
        }),
      });

      if (response.status === 429 || response.status === 529 || response.status === 503) {
        const backoff = Math.pow(2, attempt) * this.retryBaseMs;
        await new Promise((r) => setTimeout(r, backoff));
        lastError = new Error(`Retryable error (${response.status}) on attempt ${attempt + 1}`);
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `Anthropic API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        model?: string;
        content?: Array<{ type: string; text: string }>;
      };

      // Model lock verification [INV-VAL-04]
      if (data.model && data.model !== this.model_id) {
        throw new Error(
          `MODEL DRIFT: requested ${this.model_id}, got ${data.model}`,
        );
      }

      const text = data.content?.[0]?.text;
      if (!text) {
        throw new Error('Anthropic API returned no text content');
      }

      return text;
    }

    throw lastError || new Error('All retry attempts failed');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildGenerationPrompt(packet: ForgePacket, seed: string): string {
  const intent = packet.intent;
  const emotion = packet.emotion_contract;
  const q1 = emotion.curve_quartiles[0];
  const beats = packet.beats.map((b) => `- ${b.action}`).join('\n');
  const killWords = packet.kill_lists.banned_filter_words.slice(0, 10).join(', ');
  const cliches = packet.kill_lists.banned_cliches.slice(0, 10).join(', ');

  return `Tu es un écrivain littéraire français de haut niveau. Génère une prose littéraire en français pour la scène suivante.

CONTEXTE:
- Objectif narratif: ${intent.story_goal}
- Objectif de scène: ${intent.scene_goal}
- Type de conflit: ${intent.conflict_type}
- POV: ${intent.pov}
- Temps verbal: ${intent.tense}
- Mots cibles: ${intent.target_word_count}

ÉMOTION:
- Dominante: ${q1.dominant}
- Valence: ${q1.valence}
- Arousal: ${q1.arousal}
- Instruction: ${q1.narrative_instruction}
- Tension: pente ${emotion.tension.slope_target}, pic à ${emotion.tension.pic_position_pct}%

BEATS:
${beats}

STYLE:
- Univers: ${packet.style_genome.universe}
- Mots-signature: ${packet.style_genome.lexicon.signature_words.join(', ')}

CONTRAINTES:
- Mots interdits: ${killWords}
- Clichés interdits: ${cliches}
- Langue: français uniquement
- Pas de dialogue excessif
- Prose littéraire immersive et sensorielle

SEED: ${seed}

Écris UNIQUEMENT la prose, sans explication, sans titre, sans commentaire.`;
}

function buildJudgePrompt(prose: string, axis: string, seed: string): string {
  return `Tu es un juge littéraire expert. Évalue la prose suivante sur l'axe "${axis}".

PROSE:
---
${prose.slice(0, 1500)}
---

Donne un score entre 0.0 et 1.0 pour l'axe "${axis}".
- 0.0 = très faible
- 0.5 = moyen
- 1.0 = excellent

SEED: ${seed}

Réponds UNIQUEMENT avec le nombre décimal (ex: 0.73). Rien d'autre.`;
}
