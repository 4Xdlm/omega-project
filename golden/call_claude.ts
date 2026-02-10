/**
 * Golden Run — Claude API Direct Caller
 * Phase Q-B — Bypasses execSync shell escaping issue on Windows.
 * Calls Claude API, saves response as cache file.
 *
 * Usage: npx tsx golden/call_claude.ts <prompt_file> <cache_dir> <cache_key>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import https from 'node:https';

const promptFile = process.argv[2];
const cacheDir = process.argv[3];
const cacheKey = process.argv[4];

if (!promptFile || !cacheDir || !cacheKey) {
  console.error('Usage: call_claude.ts <prompt_file> <cache_dir> <cache_key>');
  process.exit(1);
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set');
  process.exit(1);
}

const prompt = readFileSync(promptFile, 'utf8');
const model = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are OMEGA, a deterministic narrative structure engine.
You generate narrative structures as valid JSON.
You MUST return ONLY valid JSON — no markdown, no commentary, no wrapping.
Temperature is set to 0 for maximum determinism.`;

const requestBody = JSON.stringify({
  model,
  max_tokens: 4096,
  temperature: 0,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: prompt }],
});

function callAPI(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey!,
        'anthropic-version': '2023-06-01',
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => body += chunk.toString());
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API error ${res.statusCode}: ${body}`));
          return;
        }
        const parsed = JSON.parse(body);
        const text = parsed.content[0].text;
        resolve(text);
      });
    });
    req.on('error', (e: Error) => reject(e));
    req.write(requestBody);
    req.end();
  });
}

async function main() {
  console.log(`[CLAUDE] Calling ${model}...`);
  console.log(`[CLAUDE] Prompt file: ${promptFile}`);
  console.log(`[CLAUDE] Cache key: ${cacheKey}`);

  const content = await callAPI();
  console.log(`[CLAUDE] Response length: ${content.length} chars`);

  // Import sha256 from canon-kernel
  const { sha256 } = await import('../packages/canon-kernel/src/index.js');
  const contentHash = sha256(content);
  console.log(`[CLAUDE] Content hash: ${contentHash.substring(0, 16)}...`);

  // Save as cache file (ProviderResponse format)
  const cacheEntry = {
    content,
    contentHash,
    mode: 'llm',
    model,
    cached: false,
    timestamp: new Date().toISOString(),
  };

  mkdirSync(cacheDir, { recursive: true });
  const filePath = join(cacheDir, `${cacheKey}.json`);
  writeFileSync(filePath, JSON.stringify(cacheEntry, null, 2), 'utf8');
  console.log(`[CLAUDE] Cache saved: ${filePath}`);

  // Also save raw content for inspection
  const rawPath = join(cacheDir, `${cacheKey}.raw.json`);
  writeFileSync(rawPath, content, 'utf8');
  console.log(`[CLAUDE] Raw saved: ${rawPath}`);
}

main().catch(e => {
  console.error('[CLAUDE] FATAL:', e.message);
  process.exit(1);
});
