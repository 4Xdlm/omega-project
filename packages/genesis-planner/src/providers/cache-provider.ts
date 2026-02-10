/**
 * OMEGA Genesis Planner — Cache Provider
 * Phase P.1-LLM — Replays stored LLM responses for deterministic reproduction.
 * Cache key = SHA-256(prompt + intentHash + seed + step)
 * If key not found → error (no fallback, cache must be complete).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from '@omega/canon-kernel';
import type { NarrativeProvider, ProviderConfig, ProviderResponse, ProviderContext } from './types.js';

function buildCacheKey(prompt: string, context: ProviderContext): string {
  return sha256(prompt + '\0' + context.intentHash + '\0' + context.seed + '\0' + context.step);
}

function readCacheEntry(cacheDir: string, key: string): ProviderResponse {
  const filePath = join(cacheDir, `${key}.json`);
  if (!existsSync(filePath)) {
    throw new Error(`Cache miss: no entry for key ${key} in ${cacheDir}. Cache must be complete for replay.`);
  }
  const raw = readFileSync(filePath, 'utf8');
  const stored = JSON.parse(raw) as ProviderResponse;
  return {
    content: stored.content,
    contentHash: stored.contentHash,
    mode: 'cache',
    model: stored.model,
    cached: true,
    timestamp: stored.timestamp,
  };
}

export function createCacheProvider(config: ProviderConfig): NarrativeProvider {
  const cacheDir = config.cacheDir;
  if (!cacheDir) {
    throw new Error('Cache provider requires cacheDir (set OMEGA_CACHE_DIR env var)');
  }
  if (!existsSync(cacheDir)) {
    throw new Error(`Cache directory does not exist: ${cacheDir}`);
  }

  return {
    mode: 'cache',

    generateArcs(prompt: string, context: ProviderContext): ProviderResponse {
      const key = buildCacheKey(prompt, context);
      return readCacheEntry(cacheDir, key);
    },

    enrichScenes(prompt: string, context: ProviderContext): ProviderResponse {
      const key = buildCacheKey(prompt, context);
      return readCacheEntry(cacheDir, key);
    },

    detailBeats(prompt: string, context: ProviderContext): ProviderResponse {
      const key = buildCacheKey(prompt, context);
      return readCacheEntry(cacheDir, key);
    },
  };
}
