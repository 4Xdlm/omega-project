/**
 * OMEGA Scribe Engine — Provider Factory
 * Phase P.2-SCRIBE — Creates the appropriate provider based on config
 */

import type { ScribeProvider, ScribeProviderConfig } from './types.js';
import { createMockProvider } from './mock-provider.js';
import { createLlmProvider, createCacheProvider } from './llm-provider.js';

export function createScribeProvider(config: ScribeProviderConfig): ScribeProvider {
  switch (config.mode) {
    case 'mock':
      return createMockProvider(config);
    case 'llm':
      return createLlmProvider(config);
    case 'cache':
      return createCacheProvider(config);
    default:
      throw new Error(`Unknown scribe provider mode: ${config.mode}`);
  }
}
