/**
 * OMEGA Scribe Engine — LLM Provider
 * Phase P.2-SCRIBE — Calls Claude API for prose generation.
 * Uses synchronous HTTP via execSync (no async cascade).
 * Uses MASTER PROMPT for literary quality.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from '@omega/canon-kernel';
import type { ScribeProvider, ScribeProviderConfig, ScribeProviderResponse, ScribeContext } from './types.js';
import { SCRIBE_SYSTEM_PROMPT } from './master-prompt.js';

/**
 * Strip markdown fences from LLM response.
 */
export function stripFences(text: string): string {
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

function callClaudeSync(prompt: string, config: ScribeProviderConfig): string {
  if (!config.apiKey) {
    throw new Error('Scribe LLM provider requires ANTHROPIC_API_KEY');
  }

  const model = config.model ?? 'claude-sonnet-4-20250514';
  const temperature = config.temperature ?? 0.75;
  const maxTokens = config.maxTokens ?? 8192;

  const requestBody = JSON.stringify({
    model,
    max_tokens: maxTokens,
    temperature,
    system: SCRIBE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
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

  const result = execSync(
    `node -e "${script.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8', timeout: 180000, maxBuffer: 20 * 1024 * 1024, input: stdinPayload },
  );

  return stripFences(result);
}

function buildCacheKey(prompt: string, context: ScribeContext): string {
  return sha256(prompt + '\0' + context.sceneId + '\0' + context.skeletonHash + '\0' + context.seed);
}

function getCachePath(cacheDir: string, key: string): string {
  return join(cacheDir, `scribe-${key.slice(0, 24)}.json`);
}

function readCache(cacheDir: string, key: string): ScribeProviderResponse | null {
  const path = getCachePath(cacheDir, key);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    const cached = JSON.parse(raw) as ScribeProviderResponse;
    return { ...cached, cached: true };
  } catch {
    return null;
  }
}

function writeCache(cacheDir: string, key: string, response: ScribeProviderResponse): void {
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(getCachePath(cacheDir, key), JSON.stringify(response, null, 2), 'utf8');
}

export function createLlmProvider(config: ScribeProviderConfig): ScribeProvider {
  if (!config.apiKey) {
    throw new Error('Scribe LLM provider requires apiKey (set ANTHROPIC_API_KEY env var)');
  }

  return {
    mode: 'llm',

    generateSceneProse(prompt: string, context: ScribeContext): ScribeProviderResponse {
      // Check cache first
      if (config.cacheDir) {
        const key = buildCacheKey(prompt, context);
        const cached = readCache(config.cacheDir, key);
        if (cached) {
          console.log(`  [cache hit] ${context.sceneId}`);
          return cached;
        }
      }

      console.log(`  [llm call] ${context.sceneId} → ${config.model ?? 'claude-sonnet-4-20250514'}...`);
      const prose = callClaudeSync(prompt, config);
      const wordCount = prose.split(/\s+/).filter(w => w.length > 0).length;
      console.log(`  [llm done] ${context.sceneId} → ${wordCount} words`);

      const response: ScribeProviderResponse = {
        prose,
        proseHash: sha256(prose),
        mode: 'llm',
        model: config.model ?? 'claude-sonnet-4-20250514',
        cached: false,
        timestamp: new Date().toISOString(),
      };

      // Write to cache
      if (config.cacheDir) {
        const key = buildCacheKey(prompt, context);
        writeCache(config.cacheDir, key, response);
      }

      return response;
    },
  };
}

export function createCacheProvider(config: ScribeProviderConfig): ScribeProvider {
  if (!config.cacheDir) {
    throw new Error('Cache provider requires cacheDir');
  }

  return {
    mode: 'cache',

    generateSceneProse(prompt: string, context: ScribeContext): ScribeProviderResponse {
      const key = buildCacheKey(prompt, context);
      const cached = readCache(config.cacheDir!, key);
      if (!cached) {
        throw new Error(`Cache miss for scene ${context.sceneId} (key: ${key.slice(0, 12)}...)`);
      }
      return cached;
    },
  };
}

export { buildCacheKey };
