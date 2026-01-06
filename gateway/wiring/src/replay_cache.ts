// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — REPLAY CACHE
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-WIRE-05: Replay Safety - même replay_protection_key
//                         → pas de double exécution non contrôlée
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { Clock } from './types.js';

/**
 * Entrée dans le cache de replay
 */
export interface ReplayCacheEntry {
  /** Clé de protection (replay_protection_key de l'envelope) */
  key: string;
  /** Timestamp d'insertion (pour TTL) */
  insertedAt: number;
  /** Résultat mis en cache (optionnel) */
  cachedResult?: unknown;
}

/**
 * Configuration du ReplayCache
 */
export interface ReplayCacheConfig {
  /** Durée de vie des entrées en ms (défaut: 5 minutes) */
  ttlMs: number;
  /** Taille maximale du cache (défaut: 10000) */
  maxSize: number;
  /** Clock injectable pour les tests */
  clock: Clock;
}

/**
 * Résultat d'une vérification de replay
 */
export type ReplayCheckResult =
  | { isReplay: false }
  | { isReplay: true; cachedResult?: unknown };

/**
 * Cache de protection anti-replay
 * 
 * Empêche la double exécution des messages avec le même replay_protection_key.
 * Utilise un TTL pour éviter une croissance infinie du cache.
 * 
 * @invariant INV-WIRE-05: Replay Safety
 */
export class ReplayCache {
  private readonly cache: Map<string, ReplayCacheEntry> = new Map();
  private readonly config: ReplayCacheConfig;

  constructor(config: Partial<ReplayCacheConfig> & { clock: Clock }) {
    this.config = {
      ttlMs: config.ttlMs ?? 5 * 60 * 1000, // 5 minutes par défaut
      maxSize: config.maxSize ?? 10000,
      clock: config.clock,
    };
  }

  /**
   * Vérifie si une clé est un replay
   * 
   * @param key - replay_protection_key de l'envelope
   * @returns ReplayCheckResult indiquant si c'est un replay
   */
  check(key: string): ReplayCheckResult {
    this.cleanup();

    const entry = this.cache.get(key);
    if (!entry) {
      return { isReplay: false };
    }

    // Vérifier si l'entrée n'a pas expiré
    const now = this.config.clock.nowMs();
    if (now - entry.insertedAt > this.config.ttlMs) {
      this.cache.delete(key);
      return { isReplay: false };
    }

    return {
      isReplay: true,
      cachedResult: entry.cachedResult,
    };
  }

  /**
   * Enregistre une clé comme traitée
   * 
   * @param key - replay_protection_key de l'envelope
   * @param cachedResult - Résultat à mettre en cache (optionnel)
   */
  record(key: string, cachedResult?: unknown): void {
    this.cleanup();

    // Éviction si cache plein (LRU simplifié: on supprime les plus anciens)
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      key,
      insertedAt: this.config.clock.nowMs(),
      cachedResult,
    });
  }

  /**
   * Vérifie et enregistre en une opération atomique
   * Retourne true si c'est un nouveau message (pas un replay)
   * 
   * @param key - replay_protection_key
   * @param cachedResult - Résultat à cacher si nouveau
   * @returns true si nouveau, false si replay
   */
  checkAndRecord(key: string, cachedResult?: unknown): ReplayCheckResult {
    const result = this.check(key);
    if (!result.isReplay) {
      this.record(key, cachedResult);
    }
    return result;
  }

  /**
   * Supprime une clé du cache (pour tests ou reset)
   */
  remove(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Vide le cache complètement
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Retourne le nombre d'entrées dans le cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Vérifie si une clé existe (sans vérifier le TTL)
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = this.config.clock.nowMs();
    const expired: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.insertedAt > this.config.ttlMs) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.cache.delete(key);
    }
  }

  /**
   * Évicte les entrées les plus anciennes pour faire de la place
   */
  private evictOldest(): void {
    // Trouver et supprimer 10% des plus anciens
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].insertedAt - b[1].insertedAt);

    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un ReplayCache avec configuration par défaut
 */
export function createReplayCache(
  clock: Clock,
  options?: { ttlMs?: number; maxSize?: number }
): ReplayCache {
  return new ReplayCache({
    clock,
    ttlMs: options?.ttlMs,
    maxSize: options?.maxSize,
  });
}
