/**
 * OMEGA Scribe Engine — Provider Factory
 * Phase P.2-SCRIBE — Creates the appropriate provider based on config
 */

import type { ScribeProvider, ScribeProviderConfig } from './types.js';
import { createMockProvider } from './mock-provider.js';
import { createLlmProvider, createCacheProvider } from './llm-provider.js';
import { createOllamaProvider } from './ollama-provider.js';
import type { OllamaProviderConfig, OllamaTaskType } from './ollama-provider.js';

export function createScribeProvider(
  config: ScribeProviderConfig,
  ollamaTask?: OllamaTaskType,
): ScribeProvider {
  switch (config.mode) {
    case 'mock':
      return createMockProvider(config);
    case 'llm':
      return createLlmProvider(config);
    case 'cache':
      return createCacheProvider(config);
    case 'ollama':
      return createOllamaProvider(config as OllamaProviderConfig, ollamaTask ?? 'prose');
    default:
      throw new Error(`Unknown scribe provider mode: ${config.mode}`);
  }
}
