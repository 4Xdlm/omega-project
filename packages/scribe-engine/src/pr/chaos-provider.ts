/**
 * OMEGA — CHAOS PROVIDER FOR FAULT INJECTION
 * Phase: PR-3 | Invariant: INV-FAILCLOSED-01
 *
 * Injects deterministic failures based on chaos config profile.
 * Features:
 * - 6 failure modes including empty_response (GAP-3A)
 * - Deterministic PRNG (xorshift128)
 * - Chaos log output (GAP-3B)
 * - Fail-closed: any injected failure propagates correctly
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ============================================================================
// TYPES
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

export type ChaosFailureType =
  | 'rate_limit_429'
  | 'timeout'
  | 'invalid_json'
  | 'api_error_500'
  | 'network_error'
  | 'empty_response'; // GAP-3A

export interface ChaosConfig {
  CHAOS_RATE: number;
  failure_types: ChaosFailureType[];
  seed?: number;
  logPath?: string; // GAP-3B
}

export interface ChaosLogEntry {
  call_index: number;
  scene_id: string;
  injected: boolean;
  failure_type?: ChaosFailureType;
  timestamp: string;
}

// ============================================================================
// DETERMINISTIC PRNG (xorshift128)
// ============================================================================

class XorShift128 {
  private state: [number, number, number, number];

  constructor(seed: number) {
    this.state = [seed, seed + 1, seed + 2, seed + 3];
  }

  next(): number {
    let t = this.state[3];
    const s = this.state[0];
    this.state[3] = this.state[2];
    this.state[2] = this.state[1];
    this.state[1] = s;

    t ^= t << 11;
    t ^= t >>> 8;
    this.state[0] = t ^ s ^ (s >>> 19);

    return (this.state[0] >>> 0) / 0xffffffff;
  }
}

// ============================================================================
// CHAOS PROVIDER
// ============================================================================

export function createChaosProvider(
  innerProvider: ScribeProvider,
  config: ChaosConfig
): ScribeProvider {
  const prng = new XorShift128(config.seed ?? 42);
  const log: ChaosLogEntry[] = [];
  let callIndex = 0;

  return {
    mode: `chaos(${innerProvider.mode})`,

    generateSceneProse(prompt: string, context: ScribeContext): ScribeProviderResponse {
      const currentCallIndex = callIndex++;
      const shouldInject = prng.next() < config.CHAOS_RATE;

      if (!shouldInject) {
        // No injection: normal call
        const response = innerProvider.generateSceneProse(prompt, context);

        log.push({
          call_index: currentCallIndex,
          scene_id: context.sceneId,
          injected: false,
          timestamp: new Date().toISOString(),
        });

        // Write log if path specified (GAP-3B)
        if (config.logPath) {
          writeChaosLog(config.logPath, log);
        }

        return response;
      }

      // Inject failure
      const failureType =
        config.failure_types[Math.floor(prng.next() * config.failure_types.length)];

      log.push({
        call_index: currentCallIndex,
        scene_id: context.sceneId,
        injected: true,
        failure_type: failureType,
        timestamp: new Date().toISOString(),
      });

      // Write log before throwing (GAP-3B)
      if (config.logPath) {
        writeChaosLog(config.logPath, log);
      }

      // Inject specific failure
      switch (failureType) {
        case 'rate_limit_429':
          throw new Error('[chaos] Injected 429 Rate Limit');

        case 'timeout':
          throw new Error('[chaos] Injected timeout (ETIMEDOUT)');

        case 'invalid_json':
          throw new Error('[chaos] Injected invalid JSON response');

        case 'api_error_500':
          throw new Error('[chaos] Injected 500 API error');

        case 'network_error':
          throw new Error('[chaos] Injected network error (ECONNRESET)');

        case 'empty_response': // GAP-3A
          // Return 200 OK but empty prose (silent failure)
          return {
            prose: '',
            mode: 'chaos-empty',
            model: 'chaos-injected',
            cached: false,
            timestamp: new Date().toISOString(),
            chaos_injected: true,
          };

        default:
          throw new Error(`[chaos] Unknown failure type: ${failureType}`);
      }
    },
  };
}

// ============================================================================
// CHAOS LOG WRITER (GAP-3B)
// ============================================================================

function writeChaosLog(logPath: string, entries: ChaosLogEntry[]): void {
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    writeFileSync(
      logPath,
      JSON.stringify({ entries }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.warn(`[chaos-provider] Failed to write chaos log: ${err}`);
  }
}

// ============================================================================
// CHAOS CONFIG PROFILES
// ============================================================================

export const CHAOS_PROFILES: Record<string, Omit<ChaosConfig, 'seed' | 'logPath'>> = {
  light: {
    CHAOS_RATE: 0.05,
    failure_types: ['rate_limit_429', 'timeout'],
  },
  medium: {
    CHAOS_RATE: 0.15,
    failure_types: ['rate_limit_429', 'timeout', 'invalid_json', 'api_error_500'],
  },
  heavy: {
    CHAOS_RATE: 0.30,
    failure_types: [
      'rate_limit_429',
      'timeout',
      'invalid_json',
      'api_error_500',
      'network_error',
      'empty_response',
    ],
  },
  hellfire: {
    CHAOS_RATE: 0.50,
    failure_types: [
      'rate_limit_429',
      'timeout',
      'invalid_json',
      'api_error_500',
      'network_error',
      'empty_response',
    ],
  },
};
