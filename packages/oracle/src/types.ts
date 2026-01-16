/**
 * Oracle Types
 * @module @omega/oracle/types
 * @description Type definitions for Oracle AI analysis engine
 */

/**
 * Oracle configuration options
 */
export interface OracleConfig {
  /** Model identifier */
  model: string;
  /** Maximum tokens for response */
  maxTokens: number;
  /** Temperature for generation (0-1) */
  temperature: number;
  /** API endpoint */
  endpoint?: string;
  /** API key (optional, can use env) */
  apiKey?: string;
  /** Request timeout in ms */
  timeout: number;
  /** Enable response caching */
  cacheEnabled: boolean;
  /** Cache TTL in ms */
  cacheTTL: number;
}

/**
 * Default Oracle configuration
 */
export const DEFAULT_CONFIG: OracleConfig = {
  model: 'gpt-4-turbo',
  maxTokens: 2048,
  temperature: 0.3,
  timeout: 30000,
  cacheEnabled: true,
  cacheTTL: 3600000, // 1 hour
};

/**
 * Oracle request options
 */
export interface OracleRequest {
  /** Text to analyze */
  text: string;
  /** Analysis depth */
  depth: 'quick' | 'standard' | 'deep';
  /** Include emotional narrative */
  includeNarrative: boolean;
  /** Include recommendations */
  includeRecommendations: boolean;
  /** Custom system prompt */
  systemPrompt?: string;
}

/**
 * Emotional insight from Oracle
 */
export interface EmotionalInsight {
  /** Primary emotion detected */
  primaryEmotion: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Supporting evidence from text */
  evidence: string[];
  /** Emotional intensity (0-1) */
  intensity: number;
}

/**
 * Narrative analysis result
 */
export interface NarrativeAnalysis {
  /** Overall tone description */
  tone: string;
  /** Narrative arc detected */
  arc: 'rising' | 'falling' | 'stable' | 'mixed';
  /** Key themes identified */
  themes: string[];
  /** Character/voice analysis */
  voice: string;
}

/**
 * Oracle analysis response
 */
export interface OracleResponse {
  /** Unique response ID */
  id: string;
  /** Original text analyzed */
  text: string;
  /** Emotional insights */
  insights: EmotionalInsight[];
  /** Narrative analysis */
  narrative?: NarrativeAnalysis;
  /** AI-generated summary */
  summary: string;
  /** Recommendations for improvement */
  recommendations?: string[];
  /** Processing metadata */
  metadata: {
    /** Model used */
    model: string;
    /** Tokens consumed */
    tokensUsed: number;
    /** Processing time in ms */
    processingTime: number;
    /** Cache hit */
    cached: boolean;
    /** Timestamp */
    timestamp: number;
  };
}

/**
 * Oracle error types
 */
export type OracleErrorType =
  | 'INVALID_INPUT'
  | 'API_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'PARSE_ERROR'
  | 'UNKNOWN';

/**
 * Oracle error
 */
export class OracleError extends Error {
  readonly type: OracleErrorType;
  readonly details?: unknown;

  constructor(type: OracleErrorType, message: string, details?: unknown) {
    super(message);
    this.name = 'OracleError';
    this.type = type;
    this.details = details;
  }
}

/**
 * Oracle status
 */
export interface OracleStatus {
  /** Oracle is initialized */
  initialized: boolean;
  /** Oracle is ready for requests */
  ready: boolean;
  /** Current model */
  model: string;
  /** Cache size */
  cacheSize: number;
  /** Total requests processed */
  totalRequests: number;
  /** Total errors */
  totalErrors: number;
  /** Average response time */
  avgResponseTime: number;
}
