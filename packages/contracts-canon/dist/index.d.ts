/**
 * @fileoverview OMEGA Contracts Canon - Public API
 * @module @omega/contracts-canon
 *
 * Canonical source of truth for all OMEGA interface contracts.
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 */
export type { ContractVersion, ContractStability, ContractMetadata, InvariantSeverity, InvariantContract, InvariantResult, ModuleType, ModuleDependency, ModuleContract, MessageDirection, ProtocolMessage, ProtocolContract, DataFormat, DataContract, DataConstraint, ContractEntry, ContractRegistry, ValidationResult, ValidationError, ValidationWarning, } from './types.js';
export { isContractVersion, isContractMetadata, isInvariantContract, isModuleContract, } from './types.js';
export { INV_DET_01, INV_DET_02, INV_DET_03, INV_DET_04, INV_DET_05, INV_EXE_01, INV_EXE_02, INV_EXE_03, INV_EXE_04, INV_REP_01, INV_REP_02, INV_REP_03, INV_REP_04, INV_ART_01, INV_ART_02, INV_ART_03, INV_NEX_01, INV_NEX_02, INV_NEX_03, INV_SAN_01, INV_SAN_02, ALL_INVARIANTS, INVARIANT_COUNT, getInvariantsByModule, getInvariantsBySeverity, getInvariant, } from './invariants.js';
export { MOD_SENTINEL, MOD_ORCHESTRATOR_CORE, MOD_HEADLESS_RUNNER, MOD_CONTRACTS_CANON, MOD_GENOME, MOD_MYCELIUM, MOD_MYCELIUM_BIO, MOD_NEXUS_DEP, MOD_SEGMENT_ENGINE, MOD_OBSERVABILITY, ALL_MODULES, MODULE_COUNT, getModulesByType, getModule, getModuleByPackage, } from './modules.js';
export { InMemoryContractRegistry, validateContract, checkInvariant, buildDependencyGraph, detectCircularDependencies, getTopologicalOrder, } from './registry.js';
//# sourceMappingURL=index.d.ts.map