/**
 * OMEGA Scribe Engine — Ollama Local Provider
 * Calls local Ollama server for prose generation.
 * Uses synchronous HTTP via execSync (same pattern as llm-provider).
 *
 * ROUTING AUTOMATIQUE :
 *   - 'local-fast'    → qwen3.5:35b-a3b (MoE, ~143 t/s, corrections/auto-repair)
 *   - 'local-quality' → qwen3:32b (dense, ~34 t/s, prose quotidienne)
 *   - 'local-moe'     → qwen3.5:35b-a3b (MoE, ~143 t/s, prose rapide + bonne qualité)
 *
 * IMPORTANT : think: false est obligatoire pour les modèles Qwen
 *             sinon ils consomment tout le budget en réflexion interne.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from '@omega/canon-kernel';
import type { ScribeProvider, ScribeProviderConfig, ScribeProviderResponse, ScribeContext } from './types.js';
import { SCRIBE_SYSTEM_PROMPT } from './master-prompt.js';

// ─── Types ───────────────────────────────────────────────

export type OllamaTaskType = 'prose' | 'correction' | 'repair' | 'continuation' | 'rewrite';

export interface OllamaProviderConfig extends ScribeProviderConfig {
  /** Ollama server URL (default: http://localhost:11434) */
  readonly ollamaUrl?: string;
  /** Model for prose generation (default: qwen3.5:35b-a3b) */
  readonly modelProse?: string;
  /** Model for corrections/auto-repair (default: qwen3.5:35b-a3b) */
  readonly modelFast?: string;
  /** Model for heavy/final rendering (default: qwen3:72b) */
  readonly modelHeavy?: string;
  /** Force a specific model regardless of task routing */
  readonly forceModel?: string;
}

/** Default models — bench winners */
const DEFAULTS = {
  url: 'http://localhost:11434',
  modelProse: 'qwen3.5:35b-a3b',   // Bench winner: 67.3/95, 143 t/s
  modelFast: 'qwen3.5:35b-a3b',    // Same model, ultra rapide pour corrections
  modelHeavy: 'qwen3:72b',         // Rendu de nuit (optionnel, nécessite pull)
} as const;

// ─── Model Router ────────────────────────────────────────

function selectModel(task: OllamaTaskType, config: OllamaProviderConfig): string {
  if (config.forceModel) return config.forceModel;

  switch (task) {
    case 'prose':
    case 'continuation':
      return config.modelProse ?? DEFAULTS.modelProse;
    case 'correction':
    case 'repair':
    case 'rewrite':
      return config.modelFast ?? DEFAULTS.modelFast;
    default:
      return config.modelProse ?? DEFAULTS.modelProse;
  }
}

// ─── Synchronous Ollama Call ─────────────────────────────

function callOllamaSync(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  config: OllamaProviderConfig,
): string {
  const url = config.ollamaUrl ?? DEFAULTS.url;
  const temperature = config.temperature ?? 0.8;
  const maxTokens = config.maxTokens ?? 8192;
  const isQwen = model.toLowerCase().includes('qwen');

  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    // CRITIQUE : think: false obligatoire pour Qwen, sinon 0 mots de sortie
    ...(isQwen ? { think: false } : {}),
    options: {
      temperature,
      num_predict: maxTokens,
      top_p: 0.92,
    },
  });

  // Script Node.js synchrone pour appel HTTP local
  const script = `
    const http = require('http');
    let stdinBuf = '';
    process.stdin.on('data', (chunk) => stdinBuf += chunk);
    process.stdin.on('end', () => {
      const { body, url } = JSON.parse(stdinBuf);
      const parsed = new URL(url + '/api/chat');
      const req = http.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            process.stderr.write('Ollama error ' + res.statusCode + ': ' + data);
            process.exit(1);
          }
          const parsed = JSON.parse(data);
          process.stdout.write(parsed.message.content || '');
        });
      });
      req.on('error', (e) => { process.stderr.write(e.message); process.exit(1); });
      req.write(body);
      req.end();
    });
  `.replace(/\n/g, ' ');

  const stdinPayload = JSON.stringify({ body: requestBody, url });

  // Timeout long pour les modèles lourds (72B peut prendre plusieurs minutes)
  const timeout = model.includes('72b') ? 600000 : 300000;

  const result = execSync(
    `node -e "${script.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8', timeout, maxBuffer: 20 * 1024 * 1024, input: stdinPayload },
  );

  // Nettoyer les tags thinking résiduels
  let cleaned = result.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  return cleaned;
}

// ─── Cache ───────────────────────────────────────────────

function buildCacheKey(prompt: string, context: ScribeContext, model: string): string {
  return sha256(prompt + '\0' + context.sceneId + '\0' + context.skeletonHash + '\0' + context.seed + '\0' + model);
}

function getCachePath(cacheDir: string, key: string): string {
  return join(cacheDir, `scribe-ollama-${key.slice(0, 24)}.json`);
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

// ─── Provider Factory ────────────────────────────────────

export function createOllamaProvider(
  config: OllamaProviderConfig,
  task: OllamaTaskType = 'prose',
): ScribeProvider {
  const model = selectModel(task, config);
  const url = config.ollamaUrl ?? DEFAULTS.url;

  return {
    mode: 'llm' as const,

    generateSceneProse(prompt: string, context: ScribeContext): ScribeProviderResponse {
      // Check cache first
      if (config.cacheDir) {
        const key = buildCacheKey(prompt, context, model);
        const cached = readCache(config.cacheDir, key);
        if (cached) {
          console.log(`  [ollama cache hit] ${context.sceneId}`);
          return cached;
        }
      }

      console.log(`  [ollama:${task}] ${context.sceneId} → ${model} @ ${url}...`);
      const startMs = Date.now();
      const prose = callOllamaSync(SCRIBE_SYSTEM_PROMPT, prompt, model, config);
      const durationMs = Date.now() - startMs;
      const wordCount = prose.split(/\s+/).filter(w => w.length > 0).length;
      const tokensPerSec = durationMs > 0 ? Math.round((wordCount * 1.3) / (durationMs / 1000)) : 0;
      console.log(`  [ollama done] ${context.sceneId} → ${wordCount} words, ${(durationMs / 1000).toFixed(1)}s, ~${tokensPerSec} t/s`);

      if (prose.length === 0) {
        throw new Error(
          `Ollama returned empty prose for ${context.sceneId} with model ${model}. ` +
          `Vérifier que think: false est actif pour les modèles Qwen.`
        );
      }

      const response: ScribeProviderResponse = {
        prose,
        proseHash: sha256(prose),
        mode: 'llm',
        model,
        cached: false,
        timestamp: new Date().toISOString(),
      };

      // Write to cache
      if (config.cacheDir) {
        const key = buildCacheKey(prompt, context, model);
        writeCache(config.cacheDir, key, response);
      }

      return response;
    },
  };
}

// ─── Quick Test Helper ───────────────────────────────────

/**
 * Test rapide pour vérifier qu'Ollama est accessible et que le modèle répond.
 * Usage : node -e "import('./ollama-provider.js').then(m => m.testOllamaConnection())"
 */
export function testOllamaConnection(ollamaUrl = DEFAULTS.url): void {
  console.log(`Testing Ollama connection at ${ollamaUrl}...`);

  try {
    const result = execSync(
      `curl -s ${ollamaUrl}/api/tags`,
      { encoding: 'utf8', timeout: 5000 },
    );
    const data = JSON.parse(result);
    const models = data.models?.map((m: any) => m.name) ?? [];
    console.log(`✅ Ollama OK — ${models.length} modèle(s) disponible(s):`);
    for (const m of models) console.log(`   • ${m}`);

    // Vérifier que nos modèles cibles sont présents
    const required = [DEFAULTS.modelProse, DEFAULTS.modelFast];
    for (const req of required) {
      const found = models.some((m: string) => m.startsWith(req.split(':')[0]));
      if (!found) {
        console.log(`⚠️  Modèle requis absent : ${req} — lance "ollama pull ${req}"`);
      }
    }
  } catch (err: any) {
    console.error(`❌ Ollama inaccessible sur ${ollamaUrl}: ${err.message}`);
    console.error(`   → Lance "ollama serve" ou vérifie l'installation`);
  }
}
