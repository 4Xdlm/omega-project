/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — META MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module meta
 * @version 3.28.0
 * @license MIT
 * 
 * The META module contains self-referential components:
 * - Boundary Ledger (limitations declaration)
 * - Inventory (invariant registry)
 * - Self-certification components
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Boundary Ledger — Types and Core Functions
export {
  // Types
  type BoundarySeverity,
  type BoundaryCategory,
  type BoundaryRisk,
  type BoundaryEntry,
  type BoundaryLedger,
  type BoundaryLedgerSummary,
  type BoundaryLedgerReference,
  
  // Constants
  BOUNDARY_LEDGER_VERSION,
  
  // Functions
  validateBoundaryEntry,
  validateBoundaryLedger,
  computeBoundaryLedgerHash,
  generateLedgerReference,
  buildLedgerSummary,
  createBoundaryLedger,
  getHardBoundaries,
  getBoundariesByCategory,
  getBoundariesForInvariant,
  getBoundariesForModule,
  hasHardBoundary
} from './boundary_ledger.js';

// Boundary Ledger — Default Entries
export {
  MANDATORY_BOUNDARIES,
  EXPECTED_BOUNDARY_COUNT,
  createDefaultBoundaryLedger,
  BOUND_001,
  BOUND_002,
  BOUND_003,
  BOUND_004,
  BOUND_005,
  BOUND_006,
  BOUND_007,
  BOUND_008,
  BOUND_009,
  BOUND_010,
  BOUND_011,
  BOUND_012,
  BOUND_013,
  BOUND_014,
  BOUND_015
} from './boundary_ledger.default.js';

// Inventory — Sprint 27.1
export {
  // Types
  type InvariantCategory,
  type Criticality,
  type SourceKind,
  type InvariantSource,
  type InvariantRecord,
  type InventoryValidationResult,
  
  // Constants
  INVENTORY,
  INVENTORY_COUNT,
  EXPECTED_MODULES,
  INVARIANT_ID_PATTERN,
  DISCOVERY_PATTERN,
  DISCOVERY_EXCLUSIONS,
  
  // Validation
  isValidInvariantId,
  isExcludedFromDiscovery,
  validateInventory,
  
  // Queries
  getInventoryIds,
  getInventoryByModule,
  getInventoryByCategory,
  getInventoryByCriticality,
  getInventoryRecord,
  hasInventoryRecord,
} from './inventory.js';
