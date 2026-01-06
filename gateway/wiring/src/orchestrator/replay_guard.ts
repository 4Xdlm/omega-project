// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — REPLAY GUARD
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INNOVATION: Multi-Level Replay Protection
//
// Trois stratégies de protection contre les replays:
// - REJECT: Refuse strictement les duplicates
// - IDEMPOTENT: Retourne le résultat caché (safe for reads)
// - ALLOW: Autorise les replays (dangerous, for specific cases)
//
// @invariant INV-ORCH-04: Replay Guard (duplicate → action defined)
// @invariant INV-REPLAY-01: Key Required
// @invariant INV-REPLAY-02: Strategy Enforced
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { NexusEnvelope, NexusResult } from '../types.js';
import { ok, fail } from '../types.js';
import { adapterError } from '../errors.js';

const MODULE = 'replay_guard';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════════

export const ReplayErrorCodes = {
  NO_KEY: 'REPLAY_NO_KEY',
  DUPLICATE: 'REPLAY_DUPLICATE',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Stratégie de gestion des replays
 */
export type ReplayStrategy = 'reject' | 'idempotent' | 'allow';

/**
 * Entry dans le store
 */
export interface ReplayEntry {
  /** Timestamp de première vue */
  readonly firstSeen: number;
  /** Résultat caché (pour idempotent) */
  readonly cachedResult?: unknown;
  /** Nombre de tentatives */
  readonly attempts: number;
}

/**
 * Résultat du check replay
 */
export type ReplayCheckResult =
  | { status: 'new'; key: string }
  | { status: 'duplicate_rejected'; key: string }
  | { status: 'duplicate_idempotent'; key: string; cachedResult: unknown }
  | { status: 'duplicate_allowed'; key: string };

/**
 * Interface du store
 */
export interface ReplayStore {
  get(key: string): ReplayEntry | undefined;
  set(key: string, entry: ReplayEntry): void;
  delete(key: string): boolean;
  has(key: string): boolean;
  clear(): void;
  size(): number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY REPLAY STORE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Store en mémoire avec TTL et LRU
 */
export class InMemoryReplayStore implements ReplayStore {
  private readonly entries = new Map<string, ReplayEntry>();
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly clock: { now(): number };

  constructor(maxSize: number = 10000, ttlMs: number = 5 * 60 * 1000, clock?: { now(): number }) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.clock = clock ?? { now: () => Date.now() };
  }

  get(key: string): ReplayEntry | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (this.clock.now() - entry.firstSeen > this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, entry: ReplayEntry): void {
    // Eviction si nécessaire
    if (this.entries.size >= this.maxSize && !this.entries.has(key)) {
      const oldest = this.entries.keys().next().value;
      if (oldest) this.entries.delete(oldest);
    }

    this.entries.set(key, entry);
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY GUARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration du ReplayGuard
 */
export interface ReplayGuardConfig {
  /** Stratégie par défaut */
  defaultStrategy: ReplayStrategy;
  /** Stratégies par schema (override) */
  schemaStrategies?: Map<string, ReplayStrategy>;
  /** Stratégies par kind */
  kindStrategies?: Map<string, ReplayStrategy>;
  /** Clock injectable */
  clock?: { now(): number };
}

const DEFAULT_CONFIG: ReplayGuardConfig = {
  defaultStrategy: 'reject',
};

/**
 * Replay Guard - Protection contre les messages dupliqués
 * 
 * @invariant INV-ORCH-04: Duplicate → action définie
 * @invariant INV-REPLAY-01: Key required
 * @invariant INV-REPLAY-02: Strategy enforced
 */
export class ReplayGuard {
  private readonly store: ReplayStore;
  private readonly config: ReplayGuardConfig;
  private readonly clock: { now(): number };

  constructor(store: ReplayStore, config?: Partial<ReplayGuardConfig>) {
    this.store = store;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clock = this.config.clock ?? { now: () => Date.now() };
  }

  /**
   * Vérifie si un message est un replay
   * 
   * @invariant INV-REPLAY-01: Key required
   */
  check(env: NexusEnvelope): NexusResult<ReplayCheckResult> {
    const key = env.replay_protection_key;

    // INV-REPLAY-01: Key required
    if (!key || key.length === 0) {
      return fail(
        adapterError(
          MODULE,
          ReplayErrorCodes.NO_KEY,
          'Missing replay_protection_key',
          false
        )
      );
    }

    // Get strategy for this envelope
    const strategy = this.getStrategy(env);

    // Check existing entry
    const existing = this.store.get(key);

    if (!existing) {
      // New message
      return ok({ status: 'new', key });
    }

    // Duplicate detected - apply strategy
    switch (strategy) {
      case 'reject':
        return fail(
          adapterError(
            MODULE,
            ReplayErrorCodes.DUPLICATE,
            `Duplicate message rejected: ${key}`,
            false
          )
        );

      case 'idempotent':
        // Update attempt count
        this.store.set(key, {
          ...existing,
          attempts: existing.attempts + 1,
        });
        return ok({
          status: 'duplicate_idempotent',
          key,
          cachedResult: existing.cachedResult,
        });

      case 'allow':
        // Update attempt count
        this.store.set(key, {
          ...existing,
          attempts: existing.attempts + 1,
        });
        return ok({ status: 'duplicate_allowed', key });

      default:
        // Should never happen
        return fail(
          adapterError(MODULE, ReplayErrorCodes.DUPLICATE, `Unknown strategy`, false)
        );
    }
  }

  /**
   * Enregistre un message comme vu
   */
  record(key: string, cachedResult?: unknown): void {
    const existing = this.store.get(key);
    if (existing) {
      // Update
      this.store.set(key, {
        ...existing,
        cachedResult: cachedResult ?? existing.cachedResult,
        attempts: existing.attempts + 1,
      });
    } else {
      // New
      this.store.set(key, {
        firstSeen: this.clock.now(),
        cachedResult,
        attempts: 1,
      });
    }
  }

  /**
   * Check + Record atomique
   */
  checkAndRecord(env: NexusEnvelope): NexusResult<ReplayCheckResult> {
    const result = this.check(env);
    
    if (result.ok && result.value.status === 'new') {
      this.record(env.replay_protection_key);
    }

    return result;
  }

  /**
   * Met à jour le résultat caché
   */
  updateCachedResult(key: string, result: unknown): void {
    const existing = this.store.get(key);
    if (existing) {
      this.store.set(key, {
        ...existing,
        cachedResult: result,
      });
    }
  }

  /**
   * Détermine la stratégie pour une envelope
   */
  private getStrategy(env: NexusEnvelope): ReplayStrategy {
    // 1. Check schema-specific strategy
    if (this.config.schemaStrategies) {
      const schemaStrategy = this.config.schemaStrategies.get(env.payload_schema);
      if (schemaStrategy) return schemaStrategy;
    }

    // 2. Check kind-specific strategy
    if (this.config.kindStrategies) {
      const kindStrategy = this.config.kindStrategies.get(env.kind);
      if (kindStrategy) return kindStrategy;
    }

    // 3. Default strategy
    return this.config.defaultStrategy;
  }

  /**
   * Retourne le store (pour tests)
   */
  getStore(): ReplayStore {
    return this.store;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un ReplayGuard avec store en mémoire
 */
export function createReplayGuard(config?: Partial<ReplayGuardConfig>): ReplayGuard {
  return new ReplayGuard(new InMemoryReplayStore(), config);
}

/**
 * Crée un ReplayGuard strict (reject all duplicates)
 */
export function createStrictReplayGuard(): ReplayGuard {
  return new ReplayGuard(new InMemoryReplayStore(), {
    defaultStrategy: 'reject',
  });
}

/**
 * Crée un ReplayGuard idempotent pour reads
 */
export function createIdempotentReplayGuard(): ReplayGuard {
  return new ReplayGuard(new InMemoryReplayStore(), {
    defaultStrategy: 'idempotent',
    kindStrategies: new Map([
      ['query', 'idempotent'],
      ['command', 'reject'],
      ['event', 'reject'],
    ]),
  });
}
