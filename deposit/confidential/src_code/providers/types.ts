/**
 * OMEGA Providers Types
 * Phase K - NASA-Grade L4
 */

// Provider type enum
export type ProviderId = 'mock' | 'claude' | 'gemini';

// Provider configuration
export interface ProviderConfig {
  version: string;
  default: ProviderId;
  providers: {
    mock: { enabled: boolean };
    claude: { enabled: boolean; model: string; maxTokens: number };
    gemini: { enabled: boolean; model: string };
  };
}

// Provider request
export interface ProviderRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

// Provider response
export interface ProviderResponse {
  text: string;
  finishReason: 'stop' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// Provider interface
export interface Provider {
  readonly id: ProviderId;
  generate(request: ProviderRequest): Promise<ProviderResponse>;
}

// Lock verification result
export interface LockVerifyResult {
  valid: boolean;
  expectedHash: string;
  actualHash: string;
}

// Provider load result
export type ProviderLoadResult =
  | { success: true; provider: Provider }
  | { success: false; error: string; code: 'LOCK_MISMATCH' | 'DISABLED' | 'NOT_FOUND' | 'NO_API_KEY' };
