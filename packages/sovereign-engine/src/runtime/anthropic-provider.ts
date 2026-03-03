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
 * Extract numeric score from LLM response.
 * Tries multiple patterns; last resort = scan all numbers and pick one in [0,100].
 */
function extractScore(response: string): number {
  const trimmed = response.trim();

  // Pattern 1: "Score: 85" or "Score: 85/100"
  const p1 = trimmed.match(/Score\s*:\s*(\d+(?:\.\d+)?)/i);
  if (p1) return clamp(parseFloat(p1[1]));

  // Pattern 2: "85/100" or "85 / 100"
  const p2 = trimmed.match(/(\d+(?:\.\d+)?)\s*\/\s*100/);
  if (p2) return clamp(parseFloat(p2[1]));

  // Pattern 3: standalone number on its own line
  const lines = trimmed.split('\n').map(l => l.trim());
  for (const line of lines) {
    if (/^\d+(?:\.\d+)?$/.test(line)) return clamp(parseFloat(line));
  }

  // Pattern 4: last number in [0,100] found anywhere in text
  const allNums = [...trimmed.matchAll(/(\d+(?:\.\d+)?)/g)]
    .map(m => parseFloat(m[1]))
    .filter(n => n >= 0 && n <= 100);
  if (allNums.length > 0) return clamp(allNums[allNums.length - 1]);

  throw new Error(`Failed to extract score from response: ${trimmed.slice(0, 100)}`);
}

function clamp(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
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
      const systemPrompt = `You are a literary scoring engine. Return ONLY a single integer between 0 and 100. No explanation. No text. Just the number.`;
      const userPrompt = `Rate interiority depth (0-100) of this prose.\nPOV: ${context.pov}\nCharacter State: ${context.character_state}\n\nProse:\n${prose}\n\nReturn ONLY the integer score:`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, config.judgeStable);
      return extractScore(response);
    },

    async scoreSensoryDensity(prose: string, sensory_counts: Record<string, number>): Promise<number> {
      const systemPrompt = `You are a literary scoring engine. Return ONLY a single integer between 0 and 100. No explanation. No text. Just the number.`;
      const userPrompt = `Rate sensory density (0-100) of this prose.\nSensory Counts: ${JSON.stringify(sensory_counts)}\n\nProse:\n${prose}\n\nReturn ONLY the integer score:`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, config.judgeStable);
      return extractScore(response);
    },

    async scoreNecessity(prose: string, beat_count: number, beat_actions?: string, scene_goal?: string, conflict_type?: string): Promise<number> {
      const systemPrompt = `You are a literary scoring engine. Return ONLY a single integer between 0 and 100. No explanation. No text. Just the number.`;
      const contextLines: string[] = [`Beat Count: ${beat_count}`];
      if (scene_goal) contextLines.push(`Scene Goal: ${scene_goal}`);
      if (conflict_type) contextLines.push(`Conflict Type: ${conflict_type}`);
      if (beat_actions) contextLines.push(`Beat Actions: ${beat_actions}`);
      const userPrompt = `Rate narrative necessity (0-100) of this prose. Atmosphere-building counts as necessary.\n${contextLines.join('\n')}\n\nProse:\n${prose}\n\nReturn ONLY the integer score:`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, config.judgeStable);
      return extractScore(response);
    },

    async scoreImpact(
      opening: string,
      closing: string,
      context: { readonly story_premise: string },
    ): Promise<number> {
      const systemPrompt = `You are a literary scoring engine. Return ONLY a single integer between 0 and 100. No explanation. No text. Just the number.`;
      const userPrompt = `Rate narrative impact (0-100) of opening+closing. 100 = maximum resonance.\nStory Premise: ${context.story_premise}\n\nOpening:\n${opening}\n\nClosing:\n${closing}\n\nReturn ONLY the integer score:`;

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

      // generateDraft requires much more tokens than scoring calls
      const draftConfig = { ...config, judgeMaxTokens: 2000 };
      const response = callClaudeSync(systemPrompt, userPrompt, draftConfig, false);
      return stripFences(response);
    },

    async generateStructuredJSON(prompt: string): Promise<unknown> {
      const systemPrompt = `You are a structured data extraction engine. Return ONLY valid JSON, no markdown fences, no commentary.`;
      const response = callClaudeSync(systemPrompt, prompt, config, true);
      const cleaned = stripFences(response);
      try {
        return JSON.parse(cleaned);
      } catch {
        throw new Error(`Failed to parse structured JSON from LLM: ${cleaned.slice(0, 200)}`);
      }
    },

    async rewriteSentence(
      sentence: string,
      reason: string,
      context: { readonly prev_sentence: string; readonly next_sentence: string },
    ): Promise<string> {
      const systemPrompt = `Tu es un chirurgien littéraire français. Tu réécris UNE SEULE phrase pour corriger un défaut précis. Règles strictes :
- La phrase réécrite DOIT rester en français littéraire premium
- La longueur doit rester dans ±20% de l'original
- Le sens narratif doit être préservé
- Retourne UNIQUEMENT la phrase réécrite, rien d'autre`;
      const userPrompt = `Contexte précédent : "${context.prev_sentence}"
Phrase à corriger : "${sentence}"
Contexte suivant : "${context.next_sentence}"

Défaut à corriger : ${reason}

Phrase réécrite :`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, false);
      return stripFences(response);
    },
  };
}
