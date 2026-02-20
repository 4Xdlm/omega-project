/**
 * OMEGA Claude Provider
 * Phase K - Real Claude API (requires API key)
 */
import type { Provider, ProviderRequest, ProviderResponse } from './types';

export class ClaudeProvider implements Provider {
  readonly id = 'claude' as const;
  private apiKey: string;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, model: string, maxTokens: number) {
    if (!apiKey) {
      throw new Error('Claude API key required');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    // Real Claude API call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? this.maxTokens,
        messages: [
          { role: 'user', content: request.prompt },
        ],
        system: request.systemPrompt,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        text: '',
        finishReason: 'error',
      };
    }

    const data = await response.json();

    return {
      text: data.content[0]?.text ?? '',
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
      },
    };
  }
}
