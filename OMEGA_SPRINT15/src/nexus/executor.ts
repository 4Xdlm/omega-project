/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — EXECUTOR
 * Dispatch and execution
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Executor responsibilities:
 * - Dispatch requests to module adapters
 * - Handle timeouts
 * - Capture execution duration
 * - Propagate errors properly
 */

import {
  NexusRequest,
  NexusError,
  NexusErrorCode,
  ModuleAdapter,
  RoutingDecision,
  DEFAULT_TIMEOUT_MS,
  createNexusError,
} from './types';
import { resolveAdapter } from './router';

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: NexusError;
  duration_ms: number;
  adapter_version?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMEOUT UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a timeout promise that rejects after specified ms
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Execution timeout after ${ms}ms`));
    }, ms);
  });
}

/**
 * Execute with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([promise, createTimeout(timeoutMs)]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute a request using the resolved adapter
 */
export async function execute<T>(
  request: NexusRequest,
  decision: RoutingDecision
): Promise<ExecutionResult<T>> {
  const startTime = Date.now();
  const timeoutMs = request.timeout_ms ?? DEFAULT_TIMEOUT_MS;
  
  // Resolve adapter
  const adapter = resolveAdapter(decision);
  if (!adapter) {
    return {
      success: false,
      error: createNexusError(
        NexusErrorCode.EXECUTION_FAILED,
        `No adapter registered for: ${decision.adapter_id}`,
        false,
        { adapter_id: decision.adapter_id }
      ),
      duration_ms: Date.now() - startTime,
    };
  }
  
  try {
    // Execute with timeout
    const result = await withTimeout(
      adapter.execute<T>(decision.action, request.payload, request.seed),
      timeoutMs
    );
    
    return {
      success: true,
      data: result,
      duration_ms: Date.now() - startTime,
      adapter_version: adapter.version,
    };
  } catch (error) {
    const duration_ms = Date.now() - startTime;
    
    // Check if it was a timeout
    if (error instanceof Error && error.message.includes('timeout')) {
      return {
        success: false,
        error: createNexusError(
          NexusErrorCode.TIMEOUT,
          `Execution timed out after ${timeoutMs}ms`,
          true,
          { timeout_ms: timeoutMs, duration_ms }
        ),
        duration_ms,
        adapter_version: adapter.version,
      };
    }
    
    // Module error
    return {
      success: false,
      error: createNexusError(
        NexusErrorCode.MODULE_ERROR,
        error instanceof Error ? error.message : 'Unknown execution error',
        false,
        { original_error: error instanceof Error ? error.message : String(error) }
      ),
      duration_ms,
      adapter_version: adapter.version,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK ADAPTER FOR TESTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a mock adapter for testing
 */
export function createMockAdapter<T>(
  module: 'PIPELINE' | 'ORACLE' | 'MUSE',
  response: T,
  options: {
    delay?: number;
    shouldFail?: boolean;
    errorMessage?: string;
    version?: string;
  } = {}
): ModuleAdapter {
  return {
    id: `mock-${module.toLowerCase()}-adapter`,
    module,
    version: options.version ?? '1.0.0',
    execute: async <R>(_action: string, _payload: unknown, _seed?: number): Promise<R> => {
      if (options.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
      
      if (options.shouldFail) {
        throw new Error(options.errorMessage ?? 'Mock execution failed');
      }
      
      return response as unknown as R;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify execution is deterministic (same seed = same result)
 * Note: This only works if the adapter itself is deterministic
 */
export async function verifyExecutionDeterminism<T>(
  request: NexusRequest,
  decision: RoutingDecision
): Promise<{ deterministic: boolean; results: [T | undefined, T | undefined] }> {
  const result1 = await execute<T>(request, decision);
  const result2 = await execute<T>(request, decision);
  
  const deterministic = 
    result1.success === result2.success &&
    JSON.stringify(result1.data) === JSON.stringify(result2.data);
  
  return {
    deterministic,
    results: [result1.data, result2.data],
  };
}
