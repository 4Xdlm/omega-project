/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — ANTHROPIC PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: runtime/anthropic-provider.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Real SovereignProvider implementation using Anthropic API.
 * Uses synchronous HTTP via execSync (no async cascade).
 * Fail-closed: API errors throw immediately.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'node:child_process';
import type { SovereignProvider, CorrectionPitch } from '../types.js';
import type { AnthropicProviderConfig } from './live-types.js';

/**
 * Call Claude API synchronously via execSync
 * Returns response text or throws on error
 */
function callClaudeSync(
  systemPrompt: string,
  userPrompt: string,
  config: AnthropicProviderConfig,
  structured: boolean = false,
): string {
  if (!config.apiKey) {
    throw new Error('Anthropic API key required');
  }

  const temperature = structured ? 0.0 : config.draftTemperature;
  const maxTokens = config.judgeMaxTokens;

  const requestBody = JSON.stringify({
    model: config.model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const script = `
    const https = require('https');
    let stdinBuf = '';
    process.stdin.on('data', (chunk) => stdinBuf += chunk);
    process.stdin.on('end', () => {
      const input = JSON.parse(stdinBuf);
      const data = input.body;
      const apiKey = input.apiKey;
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            process.stderr.write('API error ' + res.statusCode + ': ' + body);
            process.exit(1);
          }
          const parsed = JSON.parse(body);
          const text = parsed.content[0].text;
          process.stdout.write(text);
        });
      });
      req.on('error', (e) => { process.stderr.write(e.message); process.exit(1); });
      req.write(data);
      req.end();
    });
  `.replace(/\n/g, ' ');

  const stdinPayload = JSON.stringify({ body: requestBody, apiKey: config.apiKey });

  try {
    // Use absolute node path to avoid PATH resolution issues on Windows cmd.exe
    const nodeExe = process.execPath;
    const result = execSync(`"${nodeExe}" -e "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      timeout: 180000,
      maxBuffer: 20 * 1024 * 1024,
      input: stdinPayload,
    });
    return result.trim();
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new Error(`Claude API call failed: ${err.message}`);
    }
    throw new Error('Claude API call failed with unknown error');
  }
}

/**
 * Strip markdown fences and quotes from LLM response
 */
function stripFences(text: string): string {
  let result = text.trim();
  // Remove code fences
  const fenced = result.match(/^```(?:markdown|text|json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenced) result = fenced[1].trim();
  // Remove leading/trailing quotes
  if (result.startsWith('"') && result.endsWith('"')) {
    result = result.slice(1, -1);
  }
  return result;
}

/**
 * Extract numeric score from LLM response
 * Expects format: "Score: 85" or just "85"
 */
function extractScore(response: string): number {
  const trimmed = response.trim();
  // Try to extract number from "Score: XX" format
  const match = trimmed.match(/(?:Score:\s*)?(\d+(?:\.\d+)?)/i);
  if (!match) {
    throw new Error(`Failed to extract score from response: ${trimmed.slice(0, 100)}`);
  }
  const raw = parseFloat(match[1]);
  if (isNaN(raw)) {
    throw new Error(`Invalid score value: ${raw}`);
  }
  // Clamp to [0, 100] — LLMs sometimes return out-of-range values
  const score = Math.max(0, Math.min(100, raw));
  return score;
}

/**
 * Create Anthropic SovereignProvider
 */
export function createAnthropicProvider(config: AnthropicProviderConfig): SovereignProvider {
  return {
    async scoreInteriority(
      prose: string,
      context: { readonly pov: string; readonly character_state: string },
    ): Promise<number> {
      const systemPrompt = `You are an expert literary critic specializing in interiority analysis. Tu évalues de la prose française littéraire premium. Score prose on interiority depth (0-100). Consider POV and character state.`;
      const userPrompt = `POV: ${context.pov}\nCharacter State: ${context.character_state}\n\nProse:\n${prose}\n\nProvide interiority score (0-100) where 100 = maximum depth of internal experience. Format: "Score: XX"`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, config.judgeStable);
      return extractScore(response);
    },

    async scoreSensoryDensity(prose: string, sensory_counts: Record<string, number>): Promise<number> {
      const systemPrompt = `You are an expert literary critic specializing in sensory writing analysis. Tu évalues de la prose française littéraire premium. Score prose on sensory density (0-100).`;
      const userPrompt = `Sensory Counts: ${JSON.stringify(sensory_counts)}\n\nProse:\n${prose}\n\nProvide sensory density score (0-100) where 100 = richly sensory, immersive prose. Format: "Score: XX"`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, config.judgeStable);
      return extractScore(response);
    },

    async scoreNecessity(prose: string, beat_count: number, beat_actions?: string, scene_goal?: string, conflict_type?: string): Promise<number> {
      const systemPrompt = `You are an expert literary editor scoring narrative necessity. Tu évalues de la prose française littéraire premium. Score 0-100 where 100 = every sentence advances plot, character, atmosphere, or theme. Literary prose that builds atmosphere, establishes setting, or deepens character IS necessary. Only pure filler/redundancy should score low.`;
      const contextLines: string[] = [`Beat Count: ${beat_count}`];
      if (scene_goal) contextLines.push(`Scene Goal: ${scene_goal}`);
      if (conflict_type) contextLines.push(`Conflict Type: ${conflict_type}`);
      if (beat_actions) contextLines.push(`Beat Actions: ${beat_actions}`);
      const userPrompt = `${contextLines.join('\n')}\n\nProse:\n${prose}\n\nScore necessity (0-100). Literary atmosphere-building counts as necessary. Format: "Score: XX"`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, config.judgeStable);
      return extractScore(response);
    },

    async scoreImpact(
      opening: string,
      closing: string,
      context: { readonly story_premise: string },
    ): Promise<number> {
      const systemPrompt = `You are an expert literary critic specializing in narrative impact. Tu évalues de la prose française littéraire premium. Score opening and closing on emotional/thematic impact (0-100).`;
      const userPrompt = `Story Premise: ${context.story_premise}\n\nOpening:\n${opening}\n\nClosing:\n${closing}\n\nProvide impact score (0-100) where 100 = maximum resonance and memorability. Format: "Score: XX"`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, config.judgeStable);
      return extractScore(response);
    },

    async applyPatch(
      prose: string,
      pitch: CorrectionPitch,
      constraints: { readonly canon: readonly string[]; readonly beats: readonly string[] },
    ): Promise<string> {
      const systemPrompt = `You are an expert literary editor. Tu corriges de la prose française littéraire premium. Apply the requested correction to the prose while respecting all constraints. La sortie DOIT rester en français. Return ONLY the revised prose, no commentary.`;
      const userPrompt = `Canon:\n${constraints.canon.join('\n')}\n\nBeats:\n${constraints.beats.join('\n')}\n\nCorrection: ${pitch.correction_text}\nTarget: ${pitch.target_axis}\n\nProse:\n${prose}\n\nProvide revised prose:`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, false);
      return stripFences(response);
    },

    async generateDraft(prompt: string, mode: string, seed: string): Promise<string> {
      const systemPrompt = `You are a master prose writer. Écris EXCLUSIVEMENT en français littéraire premium — niveau prix Goncourt. Zéro anglais. Prose émotionnellement résonnante, sensoriellement riche, narrativement dense. Mode: ${mode}. Seed: ${seed}`;
      const userPrompt = prompt;

      const response = callClaudeSync(systemPrompt, userPrompt, config, false);
      return stripFences(response);
    },
  };
}
