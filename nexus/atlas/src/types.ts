/**
 * Atlas View Model Types
 * Standard: NASA-Grade L4
 */

export interface AtlasView {
  readonly id: string;
  readonly data: Record<string, unknown>;
  readonly timestamp: number;
}

export interface AtlasQuery {
  readonly filter?: Record<string, unknown>;
  readonly limit?: number;
  readonly offset?: number;
}

export interface AtlasResult {
  readonly views: readonly AtlasView[];
  readonly total: number;
}
