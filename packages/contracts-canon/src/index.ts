/**
 * @fileoverview OMEGA Contracts Canon - Public API
 * @module @omega/contracts-canon
 *
 * Canonical source of truth for all OMEGA interface contracts.
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Contract metadata
  ContractVersion,
  ContractStability,
  ContractMetadata,
  // Invariants
  InvariantSeverity,
  InvariantContract,
  InvariantResult,
  // Modules
  ModuleType,
  ModuleDependency,
  ModuleContract,
  // Protocols
  MessageDirection,
  ProtocolMessage,
  ProtocolContract,
  // Data
  DataFormat,
  DataContract,
  DataConstraint,
  // Registry
  ContractEntry,
  ContractRegistry,
  // Validation
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  isContractVersion,
  isContractMetadata,
  isInvariantContract,
  isModuleContract,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Determinism invariants
  INV_DET_01,
  INV_DET_02,
  INV_DET_03,
  INV_DET_04,
  INV_DET_05,
  // Execution invariants
  INV_EXE_01,
  INV_EXE_02,
  INV_EXE_03,
  INV_EXE_04,
  // Replay invariants
  INV_REP_01,
  INV_REP_02,
  INV_REP_03,
  INV_REP_04,
  // Artifact invariants
  INV_ART_01,
  INV_ART_02,
  INV_ART_03,
  // Nexus invariants
  INV_NEX_01,
  INV_NEX_02,
  INV_NEX_03,
  // Sanctuary invariants
  INV_SAN_01,
  INV_SAN_02,
  // Registry
  ALL_INVARIANTS,
  INVARIANT_COUNT,
  // Utilities
  getInvariantsByModule,
  getInvariantsBySeverity,
  getInvariant,
} from './invariants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MODULES
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Root
  MOD_SENTINEL,
  // Core
  MOD_ORCHESTRATOR_CORE,
  MOD_HEADLESS_RUNNER,
  MOD_CONTRACTS_CANON,
  // Client
  MOD_GENOME,
  MOD_MYCELIUM,
  MOD_MYCELIUM_BIO,
  // Integration
  MOD_NEXUS_DEP,
  // Utility
  MOD_SEGMENT_ENGINE,
  MOD_OBSERVABILITY,
  // Registry
  ALL_MODULES,
  MODULE_COUNT,
  // Utilities
  getModulesByType,
  getModule,
  getModuleByPackage,
} from './modules.js';

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export {
  InMemoryContractRegistry,
  validateContract,
  checkInvariant,
  buildDependencyGraph,
  detectCircularDependencies,
  getTopologicalOrder,
} from './registry.js';
