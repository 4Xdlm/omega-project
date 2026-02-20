/**
 * OMEGA Gemini Provider
 * Phase K - Real Gemini API (requires API key)
 */
import type { Provider, ProviderRequest, ProviderResponse } from './types';

export class GeminiProvider implements Provider {
  readonly id = 'gemini' as const;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    if (!apiKey) {
      throw new Error('Gemini API key required');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: request.prompt }] },
        ],
        generationConfig: {
          maxOutputTokens: request.maxTokens ?? 4096,
          temperature: request.temperature ?? 0.7,
        },
      }),
    });

    if (!response.ok) {
      return {
        text: '',
        finishReason: 'error',
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return {
      text,
      finishReason: data.candidates?.[0]?.finishReason === 'STOP' ? 'stop' : 'length',
    };
  }
}
