/**
 * OMEGA Mock Provider
 * Phase K - Deterministic mock for testing
 */
import type { Provider, ProviderRequest, ProviderResponse } from './types';

export class MockProvider implements Provider {
  readonly id = 'mock' as const;

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    // Deterministic mock response
    const mockText = `[MOCK] Generated response for prompt: ${request.prompt.substring(0, 50)}...`;

    return {
      text: mockText,
      finishReason: 'stop',
      usage: {
        promptTokens: request.prompt.length,
        completionTokens: mockText.length,
      },
    };
  }
}
