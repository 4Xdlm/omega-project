/**
 * OMEGA Memory System - Tiering Policy
 * Phase D4 - NASA-Grade L4
 *
 * PURE FUNCTIONS ONLY - No heuristics, no ML, no probabilistic logic.
 *
 * INV-D4-01: Toute promotion = fonction pure
 * INV-D4-02: Toute éviction = fonction pure
 * INV-D4-04: Aucune logique probabiliste/ML/adaptative
 *
 * Formulas documented in: docs/memory/memory_tiering_formula.md
 */

import type {
  Tier,
  TieringConfig,
  TierClassification,
  MemoryEntry,
  EntryId,
  Timestamp,
} from '../types.js';
import { nowTimestamp } from '../types.js';
import { DEFAULT_TIERING_CONFIG } from '../constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TIER CLASSIFICATION - PURE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine tier based on entry age and sealed status.
 *
 * FORMULA (PURE - deterministic):
 *
 *   if entry.meta.sealed == true:
 *     return FROZEN
 *
 *   age = now - entry.ts_utc
 *
 *   if age < TTL_HOT:
 *     return HOT
 *   else if age < TTL_WARM:
 *     return WARM
 *   else if age < TTL_COLD:
 *     return COLD
 *   else:
 *     return FROZEN
 *
 * @param entry - Memory entry to classify
 * @param now - Current timestamp (injected for determinism)
 * @param config - Tiering configuration
 * @returns Tier classification
 */
export function classifyTier(
  entry: MemoryEntry,
  now: number,
  config: TieringConfig = DEFAULT_TIERING_CONFIG
): Tier {
  // Rule 1: Sealed entries are always FROZEN
  if (entry.meta.sealed === true) {
    return 'FROZEN';
  }

  // Calculate age in milliseconds
  const entryTime = new Date(entry.ts_utc).getTime();
  const ageMs = now - entryTime;

  // Rule 2: Age-based tier classification (pure formula)
  if (ageMs < config.ttlHotMs) {
    return 'HOT';
  } else if (ageMs < config.ttlWarmMs) {
    return 'WARM';
  } else if (ageMs < config.ttlColdMs) {
    return 'COLD';
  } else {
    return 'FROZEN';
  }
}

/**
 * Create full tier classification result.
 *
 * @param entry - Memory entry to classify
 * @param now - Current timestamp (injected for determinism)
 * @param config - Tiering configuration
 * @returns Complete classification result
 */
export function createTierClassification(
  entry: MemoryEntry,
  now: number,
  config: TieringConfig = DEFAULT_TIERING_CONFIG
): TierClassification {
  const entryTime = new Date(entry.ts_utc).getTime();
  const ageMs = now - entryTime;
  const tier = classifyTier(entry, now, config);

  return {
    entryId: entry.id,
    tier,
    ageMs,
    classifiedAt: new Date(now).toISOString() as Timestamp,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTION/EVICTION - PURE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine if entry should be promoted to hotter tier.
 *
 * FORMULA (PURE):
 *   Promotion is NOT time-based.
 *   Promotion happens ONLY when:
 *   - Entry becomes sealed (-> FROZEN)
 *   - Manual promotion requested (not implemented in Phase D)
 *
 * In Phase D, no automatic promotion occurs.
 * This is a placeholder for Sentinel-controlled promotion.
 *
 * @param entry - Entry to check
 * @param currentTier - Current tier
 * @returns Target tier (same as current = no promotion)
 */
export function computePromotion(
  entry: MemoryEntry,
  currentTier: Tier
): Tier {
  // Only promotion path: unsealed -> sealed = FROZEN
  if (entry.meta.sealed === true && currentTier !== 'FROZEN') {
    return 'FROZEN';
  }

  // No other automatic promotions
  return currentTier;
}

/**
 * Determine if entry should be evicted to colder tier.
 *
 * FORMULA (PURE):
 *   Eviction is purely age-based.
 *   if age >= TTL for current tier:
 *     return next colder tier
 *
 * @param entry - Entry to check
 * @param currentTier - Current tier
 * @param now - Current timestamp
 * @param config - Tiering configuration
 * @returns Target tier (colder = eviction occurred)
 */
export function computeEviction(
  entry: MemoryEntry,
  currentTier: Tier,
  now: number,
  config: TieringConfig = DEFAULT_TIERING_CONFIG
): Tier {
  // FROZEN entries never evict
  if (currentTier === 'FROZEN') {
    return 'FROZEN';
  }

  // Sealed entries become FROZEN
  if (entry.meta.sealed === true) {
    return 'FROZEN';
  }

  // Calculate age
  const entryTime = new Date(entry.ts_utc).getTime();
  const ageMs = now - entryTime;

  // Pure age-based eviction
  switch (currentTier) {
    case 'HOT':
      if (ageMs >= config.ttlHotMs) {
        return 'WARM';
      }
      break;
    case 'WARM':
      if (ageMs >= config.ttlWarmMs) {
        return 'COLD';
      }
      break;
    case 'COLD':
      if (ageMs >= config.ttlColdMs) {
        return 'FROZEN';
      }
      break;
  }

  return currentTier;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER ORDER - PURE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tier order from hottest to coldest.
 */
const TIER_ORDER: readonly Tier[] = ['HOT', 'WARM', 'COLD', 'FROZEN'] as const;

/**
 * Get tier index (0 = HOT, 3 = FROZEN).
 */
export function getTierIndex(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Compare tiers.
 * @returns negative if a is hotter, positive if b is hotter, 0 if equal
 */
export function compareTiers(a: Tier, b: Tier): number {
  return getTierIndex(a) - getTierIndex(b);
}

/**
 * Check if tier a is hotter than tier b.
 */
export function isHotterThan(a: Tier, b: Tier): boolean {
  return getTierIndex(a) < getTierIndex(b);
}

/**
 * Check if tier a is colder than tier b.
 */
export function isColderThan(a: Tier, b: Tier): boolean {
  return getTierIndex(a) > getTierIndex(b);
}

/**
 * Get next colder tier (or FROZEN if already coldest).
 */
export function getColderTier(tier: Tier): Tier {
  const idx = getTierIndex(tier);
  if (idx >= TIER_ORDER.length - 1) {
    return 'FROZEN';
  }
  return TIER_ORDER[idx + 1];
}

/**
 * Get next hotter tier (or HOT if already hottest).
 */
export function getHotterTier(tier: Tier): Tier {
  const idx = getTierIndex(tier);
  if (idx <= 0) {
    return 'HOT';
  }
  return TIER_ORDER[idx - 1];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH CLASSIFICATION - PURE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify multiple entries.
 * Pure function - same inputs always produce same outputs.
 *
 * @param entries - Entries to classify
 * @param now - Current timestamp (injected for determinism)
 * @param config - Tiering configuration
 * @returns Array of classifications in same order as input
 */
export function classifyBatch(
  entries: readonly MemoryEntry[],
  now: number,
  config: TieringConfig = DEFAULT_TIERING_CONFIG
): readonly TierClassification[] {
  return entries.map(entry => createTierClassification(entry, now, config));
}

/**
 * Group entries by tier.
 * Pure function.
 *
 * @param entries - Entries to group
 * @param now - Current timestamp
 * @param config - Tiering configuration
 * @returns Map of tier -> entry IDs
 */
export function groupByTier(
  entries: readonly MemoryEntry[],
  now: number,
  config: TieringConfig = DEFAULT_TIERING_CONFIG
): ReadonlyMap<Tier, readonly EntryId[]> {
  const groups = new Map<Tier, EntryId[]>();

  for (const tier of TIER_ORDER) {
    groups.set(tier, []);
  }

  for (const entry of entries) {
    const tier = classifyTier(entry, now, config);
    const group = groups.get(tier)!;
    group.push(entry.id);
  }

  // Convert to readonly
  return new Map(
    Array.from(groups.entries()).map(([k, v]) => [k, Object.freeze(v)])
  );
}
