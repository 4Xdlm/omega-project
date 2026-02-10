/**
 * OMEGA Genesis Planner — Provider Factory
 * Phase P.1-LLM — Selects provider based on environment.
 *
 * Resolution order:
 * 1. config.mode parameter
 * 2. OMEGA_PROVIDER_MODE env var ('mock' | 'llm' | 'cache')
 * 3. Default: 'mock'
 *
 * For 'llm' mode: ANTHROPIC_API_KEY env var required
 * For 'cache' mode: OMEGA_CACHE_DIR env var required
 */

import { createMockProvider } from './mock-provider.js';
import { createLlmProvider } from './llm-provider.js';
import { createCacheProvider } from './cache-provider.js';
import type { NarrativeProvider, ProviderConfig, ProviderMode } from './types.js';

const VALID_MODES: readonly ProviderMode[] = ['mock', 'llm', 'cache'];

function resolveMode(config?: Partial<ProviderConfig>): ProviderMode {
  if (config?.mode && VALID_MODES.includes(config.mode)) {
    return config.mode;
  }
  const envMode = process.env.OMEGA_PROVIDER_MODE as ProviderMode | undefined;
  if (envMode && VALID_MODES.includes(envMode)) {
    return envMode;
  }
  return 'mock';
}

export function createProvider(config?: Partial<ProviderConfig>): NarrativeProvider {
  const mode = resolveMode(config);

  switch (mode) {
    case 'mock':
      return createMockProvider();

    case 'llm':
      return createLlmProvider({
        mode: 'llm',
        apiKey: config?.apiKey ?? process.env.ANTHROPIC_API_KEY,
        model: config?.model ?? 'claude-sonnet-4-20250514',
        temperature: config?.temperature ?? 0,
        maxTokens: config?.maxTokens ?? 4096,
        cacheDir: config?.cacheDir ?? process.env.OMEGA_CACHE_DIR,
      });

    case 'cache':
      return createCacheProvider({
        mode: 'cache',
        cacheDir: config?.cacheDir ?? process.env.OMEGA_CACHE_DIR ?? '.omega-cache',
      });

    default:
      return createMockProvider();
  }
}
