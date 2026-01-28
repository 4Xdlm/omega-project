/**
 * OMEGA Memory System - Tiering Module
 * Phase D4 - NASA-Grade L4
 *
 * Barrel export for tiering functionality.
 * All exports are PURE FUNCTIONS.
 */

export {
  // Classification
  classifyTier,
  createTierClassification,

  // Promotion/Eviction
  computePromotion,
  computeEviction,

  // Tier ordering
  getTierIndex,
  compareTiers,
  isHotterThan,
  isColderThan,
  getColderTier,
  getHotterTier,

  // Batch operations
  classifyBatch,
  groupByTier,
} from './policy.js';
