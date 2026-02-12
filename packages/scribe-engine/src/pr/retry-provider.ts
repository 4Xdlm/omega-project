/**
 * OMEGA — RETRY PROVIDER WITH EXPONENTIAL BACKOFF
 * Phase: PR-3 | Invariant: INV-RETRY-BOUND-01
 *
 * Wraps LLM provider with retry logic for transient failures.
 * Backoff parameters loaded from calibration.json (GAP-3D).
 */

import { readFileSync, existsSync } from 'node:fs';

// ============================================================================
// TYPES (matching scribe-engine provider interface)
// ============================================================================

export interface ScribeContext {
  sceneId: string;
  [key: string]: unknown;
}

export interface ScribeProviderResponse {
  prose: string;
  mode: string;
  model?: string;
  cached?: boolean;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ScribeProvider {
  mode: string;
  generateSceneProse(prompt: string, context: ScribeContext): ScribeProviderResponse;
}

export interface RetryConfig {
  baseBackoffMs: number;
  maxBackoffMs: number;
  maxRetries: number;
}

// ============================================================================
// CALIBRATION LOADING (GAP-3D)
// ============================================================================

export function loadRetryConfigFromCalibration(calibrationPath?: string): RetryConfig {
  const defaults: RetryConfig = {
    baseBackoffMs: 1000,
    maxBackoffMs: 30000,
    maxRetries: 3,
  };

  if (!calibrationPath) {
    calibrationPath = 'budgets/calibration.json';
  }

  if (!existsSync(calibrationPath)) {
    console.warn(`[retry-provider] calibration.json not found, using defaults`);
    return defaults;
  }

  try {
    const raw = readFileSync(calibrationPath, 'utf8');
    const data = JSON.parse(raw);

    return {
      baseBackoffMs: data.BACKOFF_BASE_MS ?? defaults.baseBackoffMs,
      maxBackoffMs: data.BACKOFF_MAX_MS ?? defaults.maxBackoffMs,
      maxRetries: data.MAX_RETRIES ?? defaults.maxRetries,
    };
  } catch (err) {
    console.warn(`[retry-provider] failed to load calibration: ${err}, using defaults`);
    return defaults;
  }
}

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

export type ErrorClass = 'transient' | 'permanent' | 'unknown';

/**
 * Classify errors into transient (retriable) vs permanent (fail immediately).
 */
export function classifyError(err: unknown): ErrorClass {
  if (!(err instanceof Error)) return 'unknown';

  const msg = err.message.toLowerCase();

  // Transient: rate limits, timeouts, temporary network issues
  if (
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('503') ||
    msg.includes('502')
  ) {
    return 'transient';
  }

  // Permanent: auth errors, invalid requests, missing resources
  if (
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('404') ||
    msg.includes('invalid api key') ||
    msg.includes('bad request')
  ) {
    return 'permanent';
  }

  return 'unknown';
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Execute function with exponential backoff retry.
 */
export async function executeWithRetry<T>(
  fn: () => T | Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const errorClass = classifyError(err);

      // Permanent errors: fail immediately
      if (errorClass === 'permanent') {
        throw err;
      }

      // Last attempt: propagate error
      if (attempt === config.maxRetries) {
        throw err;
      }

      // Compute backoff with exponential increase and jitter
      const backoff = Math.min(
        config.baseBackoffMs * Math.pow(2, attempt),
        config.maxBackoffMs
      );
      const jitter = Math.random() * 0.2 * backoff; // ±10% jitter
      const delayMs = Math.floor(backoff + jitter);

      console.warn(
        `[retry-provider] Attempt ${attempt + 1}/${config.maxRetries + 1} failed (${errorClass}), ` +
        `retrying in ${delayMs}ms...`
      );

      // Sleep (async-safe)
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// ============================================================================
// RETRY PROVIDER
// ============================================================================

/**
 * Wrap a ScribeProvider with retry logic.
 */
export function createRetryProvider(
  innerProvider: ScribeProvider,
  retryConfig?: RetryConfig
): ScribeProvider {
  const config = retryConfig ?? loadRetryConfigFromCalibration();

  return {
    mode: `retry(${innerProvider.mode})`,

    generateSceneProse(prompt: string, context: ScribeContext): ScribeProviderResponse {
      // Synchronous wrapper for async retry logic
      // (In real implementation, this would be async, but keeping interface compat)
      try {
        return innerProvider.generateSceneProse(prompt, context);
      } catch (err) {
        const errorClass = classifyError(err);
        if (errorClass === 'permanent') {
          throw err;
        }

        // For transient errors, attempt retries with backoff
        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
          const backoff = Math.min(
            config.baseBackoffMs * Math.pow(2, attempt - 1),
            config.maxBackoffMs
          );

          console.warn(
            `[retry-provider] Retry ${attempt}/${config.maxRetries} after ${backoff}ms for ${context.sceneId}`
          );

          // Busy-wait (sync sleep approximation)
          const start = Date.now();
          while (Date.now() - start < backoff) {
            // Spin
          }

          try {
            return innerProvider.generateSceneProse(prompt, context);
          } catch (retryErr) {
            if (attempt === config.maxRetries) {
              throw retryErr;
            }
          }
        }

        throw err;
      }
    },
  };
}
