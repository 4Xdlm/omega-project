/**
 * OMEGA Genesis Planner — LLM Provider
 * Phase P.1-LLM — Calls Claude API for narrative generation.
 * Uses synchronous HTTP via execSync (no async cascade).
 * All responses are hashed for auditability.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from '@omega/canon-kernel';
import type { NarrativeProvider, ProviderConfig, ProviderResponse, ProviderContext } from './types.js';

const SYSTEM_PROMPT = `You are OMEGA, a deterministic narrative structure engine.
You generate narrative structures as valid JSON.
You MUST return ONLY valid JSON — no markdown, no commentary, no wrapping.
Temperature is set to 0 for maximum determinism.`;

function callClaudeSync(prompt: string, config: ProviderConfig): string {
  if (!config.apiKey) {
    throw new Error('LLM provider requires ANTHROPIC_API_KEY');
  }

  const model = config.model ?? 'claude-sonnet-4-20250514';
  const temperature = config.temperature ?? 0;
  const maxTokens = config.maxTokens ?? 4096;

  const requestBody = JSON.stringify({
    model,
    max_tokens: maxTokens,
    temperature,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  // Inline Node.js script for synchronous HTTP call
  const script = `
    const https = require('https');
    const data = process.argv[1];
    const apiKey = process.argv[2];
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
  `.replace(/\n/g, ' ');

  const result = execSync(
    `node -e "${script.replace(/"/g, '\\"')}" "${requestBody.replace(/"/g, '\\"')}" "${config.apiKey}"`,
    { encoding: 'utf8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 },
  );

  return result;
}

function writeCacheEntry(cacheDir: string, key: string, response: ProviderResponse): void {
  mkdirSync(cacheDir, { recursive: true });
  const filePath = join(cacheDir, `${key}.json`);
  writeFileSync(filePath, JSON.stringify(response, null, 2), 'utf8');
}

function buildCacheKey(prompt: string, context: ProviderContext): string {
  return sha256(prompt + '\0' + context.intentHash + '\0' + context.seed + '\0' + context.step);
}

function callAndCache(prompt: string, context: ProviderContext, config: ProviderConfig): ProviderResponse {
  const content = callClaudeSync(prompt, config);
  const response: ProviderResponse = {
    content,
    contentHash: sha256(content),
    mode: 'llm',
    model: config.model ?? 'claude-sonnet-4-20250514',
    cached: false,
    timestamp: new Date().toISOString(),
  };

  if (config.cacheDir) {
    const key = buildCacheKey(prompt, context);
    writeCacheEntry(config.cacheDir, key, response);
  }

  return response;
}

export function createLlmProvider(config: ProviderConfig): NarrativeProvider {
  if (!config.apiKey) {
    throw new Error('LLM provider requires apiKey (set ANTHROPIC_API_KEY env var)');
  }

  return {
    mode: 'llm',

    generateArcs(prompt: string, context: ProviderContext): ProviderResponse {
      return callAndCache(prompt, context, config);
    },

    enrichScenes(prompt: string, context: ProviderContext): ProviderResponse {
      return callAndCache(prompt, context, config);
    },

    detailBeats(prompt: string, context: ProviderContext): ProviderResponse {
      return callAndCache(prompt, context, config);
    },
  };
}

export { buildCacheKey };
