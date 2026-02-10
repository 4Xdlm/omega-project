/**
 * OMEGA Genesis Planner — LLM Provider Interface
 * Phase P.1-LLM — Abstraction layer for narrative generation
 */

/** Provider mode */
export type ProviderMode = 'mock' | 'llm' | 'cache';

/** Provider configuration */
export interface ProviderConfig {
  readonly mode: ProviderMode;
  readonly apiKey?: string;
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly cacheDir?: string;
}

/** Result of a provider call */
export interface ProviderResponse {
  readonly content: string;
  readonly contentHash: string;
  readonly mode: ProviderMode;
  readonly model: string;
  readonly cached: boolean;
  readonly timestamp: string;
}

/** Context passed to provider */
export interface ProviderContext {
  readonly intentHash: string;
  readonly seed: string;
  readonly step: 'arcs' | 'scenes' | 'beats';
}

/** Provider interface */
export interface NarrativeProvider {
  readonly mode: ProviderMode;
  generateArcs(prompt: string, context: ProviderContext): ProviderResponse;
  enrichScenes(prompt: string, context: ProviderContext): ProviderResponse;
  detailBeats(prompt: string, context: ProviderContext): ProviderResponse;
}
