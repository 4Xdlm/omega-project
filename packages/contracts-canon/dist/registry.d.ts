/**
 * @fileoverview OMEGA Contracts Canon - Contract Registry
 * @module @omega/contracts-canon/registry
 *
 * Registry for managing and validating contracts.
 */
import type { ContractRegistry, ContractEntry, ModuleContract, InvariantContract, ValidationResult } from './types.js';
/**
 * In-memory implementation of ContractRegistry.
 */
export declare class InMemoryContractRegistry implements ContractRegistry {
    private readonly entries;
    register(entry: ContractEntry): void;
    get(id: string): ContractEntry | undefined;
    listByType(type: ContractEntry['type']): readonly ContractEntry[];
    list(): readonly string[];
    validate(entry: ContractEntry): readonly string[];
    private getEntryId;
    private validateModuleContract;
    private validateInvariantContract;
    private validateProtocolContract;
    private validateDataContract;
}
/**
 * Validates a contract and returns detailed result.
 */
export declare function validateContract(entry: ContractEntry): ValidationResult;
/**
 * Checks if an invariant condition is satisfied.
 * Returns a result object with pass/fail status.
 */
export declare function checkInvariant(invariant: InvariantContract, _context: unknown): {
    passed: boolean;
    message?: string;
};
/**
 * Builds a dependency graph from module contracts.
 */
export declare function buildDependencyGraph(modules: readonly ModuleContract[]): Map<string, Set<string>>;
/**
 * Checks for circular dependencies in module graph.
 */
export declare function detectCircularDependencies(modules: readonly ModuleContract[]): readonly string[][];
/**
 * Gets topological order of modules.
 */
export declare function getTopologicalOrder(modules: readonly ModuleContract[]): readonly string[];
//# sourceMappingURL=registry.d.ts.map