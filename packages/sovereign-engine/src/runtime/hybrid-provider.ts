/**
 * OMEGA SOVEREIGN STYLE ENGINE — HYBRID PROVIDER (BLOC 6)
 *
 * Routes prose generation → Ollama (0€)
 * Routes all judge/scoring → Claude API
 *
 * D-BLOC5: Ollama draft + Claude judge = -87% API cost
 */

import { execSync } from 'node:child_process';
import type { SovereignProvider, CorrectionPitch } from '../types.js';
import type { AnthropicProviderConfig } from './live-types.js';
import { createAnthropicProvider } from './anthropic-provider.js';

export interface HybridProviderConfig {
  readonly ollamaUrl?: string;
  readonly ollamaModel?: string;
  readonly claudeApiKey: string;
  readonly claudeModel?: string;
  readonly judgeStable?: boolean;
  readonly draftTemperature?: number;
}

let _ollamaDraftCount = 0;
let _claudeJudgeCount = 0;

export function getHybridStats() {
  return { ollamaDrafts: _ollamaDraftCount, claudeJudges: _claudeJudgeCount };
}

function callOllamaSync(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  ollamaUrl: string,
  temperature: number,
): string {
  const isQwen = model.toLowerCase().includes('qwen');
  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    ...(isQwen ? { think: false } : {}),
    options: { temperature, num_predict: 8192, top_p: 0.92 },
  });

  const script = `
    const http = require('http');
    let stdinBuf = '';
    process.stdin.on('data', (chunk) => stdinBuf += chunk);
    process.stdin.on('end', () => {
      const { body, url } = JSON.parse(stdinBuf);
      const parsed = new URL(url + '/api/chat');
      const req = http.request({
        hostname: parsed.hostname, port: parsed.port, path: parsed.pathname,
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) { process.stderr.write('Ollama error ' + res.statusCode + ': ' + data); process.exit(1); }
          const parsed = JSON.parse(data);
          process.stdout.write(parsed.message.content || '');
        });
      });
      req.on('error', (e) => { process.stderr.write(e.message); process.exit(1); });
      req.write(body);
      req.end();
    });
  `.replace(/\n/g, ' ');

  const stdinPayload = JSON.stringify({ body: requestBody, url: ollamaUrl });
  const nodeExe = process.execPath;
  const result = execSync(`"${nodeExe}" -e "${script.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8', timeout: 300000, maxBuffer: 20 * 1024 * 1024, input: stdinPayload,
  });

  let cleaned = result.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return cleaned;
}

function stripFences(text: string): string {
  let result = text.trim();
  const fenced = result.match(/^```(?:markdown|text|json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenced) result = fenced[1].trim();
  if (result.startsWith('"') && result.endsWith('"')) result = result.slice(1, -1);
  return result;
}

/**
 * Create hybrid provider: Ollama for drafts, Claude for everything else.
 */
export function createHybridProvider(config: HybridProviderConfig): SovereignProvider {
  const ollamaUrl = config.ollamaUrl ?? 'http://localhost:11434';
  const ollamaModel = config.ollamaModel ?? 'qwen3.5:35b-a3b';
  const draftTemp = config.draftTemperature ?? 0.75;

  // Claude provider for all judge/scoring/surgery calls
  const claudeConfig: AnthropicProviderConfig = {
    apiKey: config.claudeApiKey,
    model: config.claudeModel ?? 'claude-sonnet-4-20250514',
    judgeStable: config.judgeStable ?? false,
    draftTemperature: draftTemp,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 2000,
  };
  const claude = createAnthropicProvider(claudeConfig);

  return {
    // ── DRAFT GENERATION → OLLAMA (0€) ──
    // HOTFIX BLOC7: retry if chunk < 200 words (avoid catastrophic 2-sentence runs)
    async generateDraft(prompt: string, mode: string, seed: string): Promise<string> {
      _ollamaDraftCount++;
      const systemPrompt = `You are a master prose writer. Écris EXCLUSIVEMENT en français littéraire premium — niveau prix Goncourt. Zéro anglais. Prose émotionnellement résonnante, sensoriellement riche, narrativement dense. Mode: ${mode}. Seed: ${seed}`;
      const MIN_WORDS = 200;
      const MAX_RETRIES = 2;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const attemptSeed = attempt === 0 ? seed : `${seed}_retry${attempt}`;
        const attemptPrompt = `You are a master prose writer. Écris EXCLUSIVEMENT en français littéraire premium — niveau prix Goncourt. Zéro anglais. Prose émotionnellement résonnante, sensoriellement riche, narrativement dense. Mode: ${mode}. Seed: ${attemptSeed}`;
        console.log(`[HYBRID] draft → ollama (${ollamaModel}) [#${_ollamaDraftCount}${attempt > 0 ? ` retry${attempt}` : ''}]`);
        const startMs = Date.now();
        const response = callOllamaSync(attemptPrompt, prompt, ollamaModel, ollamaUrl, draftTemp);
        const durationMs = Date.now() - startMs;
        const cleaned = stripFences(response);
        const words = cleaned.split(/\s+/).filter(w => w.length > 0).length;
        console.log(`[HYBRID] draft done: ${words}w in ${(durationMs / 1000).toFixed(1)}s`);

        if (words >= MIN_WORDS) {
          return cleaned;
        }
        console.warn(`[HYBRID] draft too short (${words}w < ${MIN_WORDS}w) — retry ${attempt + 1}/${MAX_RETRIES}`);
      }
      // Last resort: return whatever we got
      console.warn(`[HYBRID] draft still short after ${MAX_RETRIES} retries — using best attempt`);
      const fallback = callOllamaSync(systemPrompt, prompt, ollamaModel, ollamaUrl, draftTemp);
      return stripFences(fallback);
    },

    // ── ALL JUDGE/SCORING → CLAUDE ──
    async scoreInteriority(prose, context) {
      _claudeJudgeCount++;
      console.log(`[HYBRID] judge → claude (scoreInteriority) [#${_claudeJudgeCount}]`);
      return claude.scoreInteriority(prose, context);
    },

    async scoreSensoryDensity(prose, sensory_counts) {
      _claudeJudgeCount++;
      console.log(`[HYBRID] judge → claude (scoreSensoryDensity) [#${_claudeJudgeCount}]`);
      return claude.scoreSensoryDensity(prose, sensory_counts);
    },

    async scoreNecessity(prose, beat_count, beat_actions, scene_goal, conflict_type) {
      _claudeJudgeCount++;
      console.log(`[HYBRID] judge → claude (scoreNecessity) [#${_claudeJudgeCount}]`);
      return claude.scoreNecessity(prose, beat_count, beat_actions, scene_goal, conflict_type);
    },

    async scoreImpact(opening, closing, context) {
      _claudeJudgeCount++;
      console.log(`[HYBRID] judge → claude (scoreImpact) [#${_claudeJudgeCount}]`);
      return claude.scoreImpact(opening, closing, context);
    },

    async applyPatch(prose, pitch, constraints) {
      _claudeJudgeCount++;
      console.log(`[HYBRID] judge → claude (applyPatch) [#${_claudeJudgeCount}]`);
      return claude.applyPatch(prose, pitch, constraints);
    },

    async generateStructuredJSON(prompt) {
      _claudeJudgeCount++;
      console.log(`[HYBRID] judge → claude (generateStructuredJSON) [#${_claudeJudgeCount}]`);
      return claude.generateStructuredJSON(prompt);
    },

    async rewriteSentence(sentence, reason, context) {
      _claudeJudgeCount++;
      console.log(`[HYBRID] judge → claude (rewriteSentence) [#${_claudeJudgeCount}]`);
      return claude.rewriteSentence(sentence, reason, context);
    },
  };
}
