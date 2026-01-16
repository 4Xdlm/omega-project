/**
 * IPC Bridge Module for OMEGA UI
 * @module lib/ipc
 * @description Tauri IPC command invocations
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  HealthCheckResponse,
  AnalysisRequest,
  AnalysisResponse,
  IPCResult,
  IPCError,
} from '../types/ipc';

/**
 * Wraps IPC calls with error handling
 * @param fn - The async function to wrap
 * @returns Wrapped result with success/error status
 */
async function wrapIPCCall<T>(fn: () => Promise<T>): Promise<IPCResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const ipcError: IPCError = {
      code: 'IPC_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: String(error),
    };
    return { success: false, error: ipcError };
  }
}

/**
 * Greet command - test IPC connection
 * @param name - Name to greet
 * @returns Greeting message
 */
export async function greet(name: string): Promise<IPCResult<string>> {
  return wrapIPCCall(() => invoke<string>('greet', { name }));
}

/**
 * Get application version from Rust backend
 * @returns Version string
 */
export async function getVersion(): Promise<IPCResult<string>> {
  return wrapIPCCall(() => invoke<string>('get_version'));
}

/**
 * Health check - verify backend status
 * @returns Health check response
 */
export async function healthCheck(): Promise<IPCResult<HealthCheckResponse>> {
  return wrapIPCCall(() => invoke<HealthCheckResponse>('health_check'));
}

/**
 * Analyze text for emotional content
 * @param request - Analysis request payload
 * @returns Analysis response
 */
export async function analyzeText(
  request: AnalysisRequest
): Promise<IPCResult<AnalysisResponse>> {
  return wrapIPCCall(() => invoke<AnalysisResponse>('analyze_text', { request }));
}

/**
 * Get analysis history
 * @param limit - Maximum number of entries to return
 * @returns Array of previous analysis results
 */
export async function getHistory(
  limit?: number
): Promise<IPCResult<AnalysisResponse[]>> {
  return wrapIPCCall(() => invoke<AnalysisResponse[]>('get_history', { limit }));
}

/**
 * Clear analysis history
 * @returns Success status
 */
export async function clearHistory(): Promise<IPCResult<boolean>> {
  return wrapIPCCall(() => invoke<boolean>('clear_history'));
}

/**
 * Check if running in Tauri environment
 * @returns True if Tauri is available
 */
export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}
