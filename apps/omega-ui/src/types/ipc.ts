/**
 * IPC Type Definitions for OMEGA UI
 * @module types/ipc
 * @description TypeScript types for Tauri IPC communication
 */

/**
 * Health check response from the Rust backend
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  phase: number;
  timestamp: string;
}

/**
 * Analysis request payload
 */
export interface AnalysisRequest {
  text: string;
  options?: AnalysisOptions;
}

/**
 * Analysis options configuration
 */
export interface AnalysisOptions {
  includeSegments?: boolean;
  includeDNA?: boolean;
  includeFingerprint?: boolean;
}

/**
 * Emotion analysis result
 */
export interface EmotionResult {
  name: string;
  intensity: number;
  valence: number;
}

/**
 * Analysis response from the backend
 */
export interface AnalysisResponse {
  id: string;
  text: string;
  timestamp: string;
  emotions: EmotionResult[];
  dominantEmotion: string;
  overallValence: number;
  confidence: number;
}

/**
 * IPC command names
 */
export type IPCCommand =
  | 'greet'
  | 'get_version'
  | 'health_check'
  | 'analyze_text'
  | 'get_history'
  | 'clear_history';

/**
 * IPC error response
 */
export interface IPCError {
  code: string;
  message: string;
  details?: string;
}

/**
 * Generic IPC result wrapper
 */
export type IPCResult<T> =
  | { success: true; data: T }
  | { success: false; error: IPCError };
