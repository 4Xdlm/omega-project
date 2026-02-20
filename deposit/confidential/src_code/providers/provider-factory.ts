/**
 * OMEGA Provider Factory
 * Phase K - Lock-gated provider instantiation
 */
import { loadProviderConfig, verifyProviderLock } from './lock-verifier';
import { MockProvider } from './mock-provider';
import { ClaudeProvider } from './claude-provider';
import { GeminiProvider } from './gemini-provider';
import type { Provider, ProviderId, ProviderLoadResult } from './types';

export interface ProviderOptions {
  providerId?: ProviderId;
  apiKey?: string;
}

export function createProvider(options: ProviderOptions = {}): ProviderLoadResult {
  // Load and verify config
  const configResult = loadProviderConfig();

  if (!configResult.success) {
    return {
      success: false,
      error: configResult.error,
      code: 'LOCK_MISMATCH',
    };
  }

  const config = configResult.config;
  const providerId = options.providerId ?? config.default;

  // Mock provider - no network, always available
  if (providerId === 'mock') {
    return {
      success: true,
      provider: new MockProvider(),
    };
  }

  // Check if provider is known (before API key check)
  if (providerId !== 'claude' && providerId !== 'gemini') {
    return {
      success: false,
      error: `Unknown provider: ${providerId}`,
      code: 'NOT_FOUND',
    };
  }

  // Check if provider is enabled
  const providerConfig = config.providers[providerId];
  if (!providerConfig?.enabled) {
    return {
      success: false,
      error: `Provider not enabled: ${providerId}`,
      code: 'DISABLED',
    };
  }

  // Real providers require API key
  if (!options.apiKey) {
    return {
      success: false,
      error: `API key required for provider: ${providerId}`,
      code: 'NO_API_KEY',
    };
  }

  // Create provider
  switch (providerId) {
    case 'claude':
      return {
        success: true,
        provider: new ClaudeProvider(
          options.apiKey,
          config.providers.claude.model,
          config.providers.claude.maxTokens
        ),
      };

    case 'gemini':
      return {
        success: true,
        provider: new GeminiProvider(
          options.apiKey,
          config.providers.gemini.model
        ),
      };
  }
}

// Export for testing
export { verifyProviderLock, loadProviderConfig };
