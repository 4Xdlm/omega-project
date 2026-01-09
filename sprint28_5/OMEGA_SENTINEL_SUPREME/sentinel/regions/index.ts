/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — REGIONS MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module regions
 * @version 2.0.0
 * 
 * REGIONS — Certification Landscape
 * 
 * The regions module provides:
 * - Definitions: The 7 certification regions with thresholds
 * - Containment: Region membership testing
 * - Promotion: Requirements to reach higher regions
 * 
 * The 7 Regions:
 *   0. VOID          - Uncertifiable (fundamental flaw)
 *   1. THEORETICAL   - Conceptually valid, no proofs
 *   2. EXPLORATORY   - Early testing, low coverage
 *   3. PROVISIONAL   - Good tests, partial falsification
 *   4. PROVEN        - Survived sincere falsification
 *   5. FOUNDATIONAL  - Multi-dimensional proof
 *   6. TRANSCENDENT  - External certifier required
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type RegionId,
  type RegionColor,
  type RegionThresholds,
  type RegionDefinition,
  
  // Constants
  REGION_ORDER,
  REGION_DEFINITIONS,
  ALL_REGIONS,
  
  // Accessors
  getRegion,
  getAllRegions,
  getThresholds,
  getRegionName,
  getRegionColor,
  getRegionOrder,
  
  // Comparison
  compareRegions,
  isAtLeastRegion,
  isHigherThan,
  maxRegion,
  minRegion,
  getNextRegion,
  getPreviousRegion,
  
  // Type guards
  isRegionId,
  requiresExternalCertifier,
  
  // Documentation
  generateRegionHierarchy,
  generateThresholdTable
} from './definitions.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTAINMENT
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type CertificationMetrics,
  type ContainmentResult,
  type RegionDetermination,
  type PromotionRequirements,
  type PromotionGap,
  
  // Containment testing
  testContainment,
  isContainedIn,
  
  // Region determination
  determineRegion,
  
  // Promotion requirements
  computePromotionRequirements,
  
  // Utilities
  createDefaultMetrics,
  createInvalidMetrics,
  canReachTranscendent,
  getCertificationSummary,
  isAtMaxRegion,
  canPromote
} from './containment.js';
