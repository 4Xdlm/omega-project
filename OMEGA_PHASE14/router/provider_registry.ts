/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Provider Registry
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Deterministic provider registry with health tracking.
 * 
 * @module router/provider_registry
 * @version 3.14.0
 */

import type {
  ProviderId,
  ProviderStatic,
  ProviderHealth,
  ProviderRuntime,
} from './types.js';
import { DEFAULT_HEALTH } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new RegistryError(message);
  }
}

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
  }
}

/** Validate provider static config */
export function validateProvider(p: ProviderStatic): void {
  assert(p.id && p.id.length > 0, 'Provider id required');
  assert(p.name && p.name.length > 0, 'Provider name required');
  assert(p.baseline_latency_ms > 0, 'baseline_latency_ms must be > 0');
  assert(p.weight >= 1 && p.weight <= 100, 'weight must be 1-100');
  assert(p.caps.max_input_chars > 0, 'max_input_chars must be > 0');
  assert(p.caps.max_output_tokens > 0, 'max_output_tokens must be > 0');
  assert(p.pricing.cost_per_1k_in >= 0, 'cost_per_1k_in must be >= 0');
  assert(p.pricing.cost_per_1k_out >= 0, 'cost_per_1k_out must be >= 0');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER REGISTRY CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ProviderRegistry {
  private providers = new Map<ProviderId, ProviderRuntime>();
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Register a new provider
   */
  register(provider: ProviderStatic): void {
    validateProvider(provider);
    assert(!this.providers.has(provider.id), `Provider already registered: ${provider.id}`);
    
    const runtime: ProviderRuntime = {
      static: Object.freeze({ ...provider }),
      health: Object.freeze({ ...DEFAULT_HEALTH }),
    };
    
    this.providers.set(provider.id, Object.freeze(runtime));
  }
  
  /**
   * Unregister a provider
   */
  unregister(id: ProviderId): boolean {
    return this.providers.delete(id);
  }
  
  /**
   * Check if provider exists
   */
  has(id: ProviderId): boolean {
    return this.providers.has(id);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RETRIEVAL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get provider by ID
   * @throws RegistryError if not found
   */
  get(id: ProviderId): ProviderRuntime {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new RegistryError(`Provider not found: ${id}`);
    }
    return provider;
  }
  
  /**
   * Get provider or undefined
   */
  tryGet(id: ProviderId): ProviderRuntime | undefined {
    return this.providers.get(id);
  }
  
  /**
   * List all providers (deterministic order by ID)
   */
  list(): ProviderRuntime[] {
    return Array.from(this.providers.values())
      .sort((a, b) => a.static.id.localeCompare(b.static.id));
  }
  
  /**
   * List only UP providers
   */
  listAvailable(): ProviderRuntime[] {
    return this.list().filter(p => p.health.up);
  }
  
  /**
   * Get provider count
   */
  size(): number {
    return this.providers.size;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Update provider health
   */
  setHealth(id: ProviderId, health: ProviderHealth): void {
    const provider = this.get(id);
    const updated: ProviderRuntime = {
      static: provider.static,
      health: Object.freeze({ ...health }),
    };
    this.providers.set(id, Object.freeze(updated));
  }
  
  /**
   * Mark provider as down
   */
  markDown(id: ProviderId, now_ms: number): void {
    const provider = this.get(id);
    const health = provider.health;
    
    this.setHealth(id, {
      ...health,
      up: false,
      last_error_ts_ms: now_ms,
      consecutive_failures: health.consecutive_failures + 1,
      consecutive_successes: 0,
    });
  }
  
  /**
   * Mark provider as up
   */
  markUp(id: ProviderId, now_ms: number): void {
    const provider = this.get(id);
    const health = provider.health;
    
    this.setHealth(id, {
      ...health,
      up: true,
      last_success_ts_ms: now_ms,
      consecutive_failures: 0,
      consecutive_successes: health.consecutive_successes + 1,
    });
  }
  
  /**
   * Record successful request
   */
  recordSuccess(id: ProviderId, latency_ms: number, now_ms: number): void {
    const provider = this.get(id);
    const health = provider.health;
    
    // Exponential moving average for latency (alpha = 0.2)
    const alpha = 0.2;
    const prev = health.observed_latency_ms || provider.static.baseline_latency_ms;
    const observed_latency_ms = Math.round(alpha * latency_ms + (1 - alpha) * prev);
    
    // Check daily reset
    const today = Math.floor(now_ms / 86400000);
    const daily_requests = health.daily_reset_day === today
      ? health.daily_requests + 1
      : 1;
    
    this.setHealth(id, {
      ...health,
      up: true,
      last_success_ts_ms: now_ms,
      consecutive_failures: 0,
      consecutive_successes: health.consecutive_successes + 1,
      observed_latency_ms,
      daily_requests,
      daily_reset_day: today,
    });
  }
  
  /**
   * Record failed request
   */
  recordFailure(id: ProviderId, now_ms: number): void {
    const provider = this.get(id);
    const health = provider.health;
    
    this.setHealth(id, {
      ...health,
      last_error_ts_ms: now_ms,
      consecutive_failures: health.consecutive_failures + 1,
      consecutive_successes: 0,
    });
  }
  
  /**
   * Check if provider is within daily limit
   */
  isWithinDailyLimit(id: ProviderId, now_ms: number): boolean {
    const provider = this.get(id);
    const limit = provider.static.pricing.daily_limit;
    
    if (limit === 0) return true; // Unlimited
    
    const today = Math.floor(now_ms / 86400000);
    if (provider.health.daily_reset_day !== today) return true; // New day
    
    return provider.health.daily_requests < limit;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Reset all providers to default health
   */
  resetAllHealth(): void {
    for (const [id, provider] of this.providers.entries()) {
      this.providers.set(id, Object.freeze({
        static: provider.static,
        health: Object.freeze({ ...DEFAULT_HEALTH }),
      }));
    }
  }
  
  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
  }
}
