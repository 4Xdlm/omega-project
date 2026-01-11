/**
 * @fileoverview OMEGA Contracts Canon - Module Contracts
 * @module @omega/contracts-canon/modules
 *
 * Canonical registry of all OMEGA module contracts.
 */
import type { ModuleContract, ModuleType } from './types.js';
export declare const MOD_SENTINEL: ModuleContract;
export declare const MOD_ORCHESTRATOR_CORE: ModuleContract;
export declare const MOD_HEADLESS_RUNNER: ModuleContract;
export declare const MOD_CONTRACTS_CANON: ModuleContract;
export declare const MOD_GENOME: ModuleContract;
export declare const MOD_MYCELIUM: ModuleContract;
export declare const MOD_MYCELIUM_BIO: ModuleContract;
export declare const MOD_NEXUS_DEP: ModuleContract;
export declare const MOD_SEGMENT_ENGINE: ModuleContract;
export declare const MOD_OBSERVABILITY: ModuleContract;
/**
 * All module contracts.
 */
export declare const ALL_MODULES: readonly ModuleContract[];
/**
 * Get modules by type.
 */
export declare function getModulesByType(type: ModuleType): readonly ModuleContract[];
/**
 * Get module by ID.
 */
export declare function getModule(id: string): ModuleContract | undefined;
/**
 * Get module by package name.
 */
export declare function getModuleByPackage(packageName: string): ModuleContract | undefined;
/**
 * Total module count.
 */
export declare const MODULE_COUNT: number;
//# sourceMappingURL=modules.d.ts.map