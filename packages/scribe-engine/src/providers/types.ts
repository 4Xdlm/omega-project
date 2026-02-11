/**
 * OMEGA Scribe Engine — Provider Types
 * Phase P.2-SCRIBE — LLM abstraction for prose generation
 */

/** Provider mode */
export type ScribeProviderMode = 'mock' | 'llm' | 'cache';

/** Provider configuration */
export interface ScribeProviderConfig {
  readonly mode: ScribeProviderMode;
  readonly apiKey?: string;
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly cacheDir?: string;
}

/** Context for a scene prose generation call */
export interface ScribeContext {
  readonly sceneId: string;
  readonly arcId: string;
  readonly skeletonHash: string;
  readonly seed: string;
}

/** Result of a provider call */
export interface ScribeProviderResponse {
  readonly prose: string;
  readonly proseHash: string;
  readonly mode: ScribeProviderMode;
  readonly model: string;
  readonly cached: boolean;
  readonly timestamp: string;
}

/** Provider interface — one method per generation step */
export interface ScribeProvider {
  readonly mode: ScribeProviderMode;
  /** Generate prose for a single scene from its prompt */
  generateSceneProse(prompt: string, context: ScribeContext): ScribeProviderResponse;
}
