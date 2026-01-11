/**
 * @fileoverview OMEGA Contracts Canon - Core Types
 * @module @omega/contracts-canon
 *
 * Canonical source of truth for all OMEGA interface contracts.
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 */
/**
 * Contract version following semantic versioning.
 */
export interface ContractVersion {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
}
/**
 * Contract stability level.
 */
export type ContractStability = 'EXPERIMENTAL' | 'UNSTABLE' | 'STABLE' | 'FROZEN' | 'DEPRECATED';
/**
 * Contract metadata attached to every contract.
 */
export interface ContractMetadata {
    readonly id: string;
    readonly name: string;
    readonly version: ContractVersion;
    readonly stability: ContractStability;
    readonly since: string;
    readonly deprecated?: string;
    readonly description: string;
}
/**
 * Invariant severity levels.
 */
export type InvariantSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
/**
 * Invariant definition.
 */
export interface InvariantContract {
    readonly id: string;
    readonly name: string;
    readonly severity: InvariantSeverity;
    readonly description: string;
    readonly module: string;
    readonly condition: string;
    readonly testRef?: string;
}
/**
 * Invariant verification result.
 */
export interface InvariantResult {
    readonly invariant: InvariantContract;
    readonly passed: boolean;
    readonly message?: string;
    readonly timestamp: string;
}
/**
 * Module type classification.
 */
export type ModuleType = 'ROOT' | 'CORE' | 'CLIENT' | 'INTEGRATION' | 'UTILITY';
/**
 * Module dependency relationship.
 */
export interface ModuleDependency {
    readonly module: string;
    readonly version: string;
    readonly type: 'required' | 'optional' | 'peer';
}
/**
 * Module contract definition.
 */
export interface ModuleContract {
    readonly metadata: ContractMetadata;
    readonly type: ModuleType;
    readonly package: string;
    readonly dependencies: readonly ModuleDependency[];
    readonly exports: readonly string[];
    readonly invariants: readonly string[];
}
/**
 * Protocol message direction.
 */
export type MessageDirection = 'REQUEST' | 'RESPONSE' | 'EVENT';
/**
 * Protocol message definition.
 */
export interface ProtocolMessage {
    readonly id: string;
    readonly name: string;
    readonly direction: MessageDirection;
    readonly schema: string;
}
/**
 * Protocol contract between modules.
 */
export interface ProtocolContract {
    readonly metadata: ContractMetadata;
    readonly producer: string;
    readonly consumer: string;
    readonly messages: readonly ProtocolMessage[];
    readonly guarantees: readonly string[];
}
/**
 * Data format specification.
 */
export type DataFormat = 'JSON' | 'NDJSON' | 'BINARY' | 'TEXT' | 'SHA256';
/**
 * Data contract for shared data structures.
 */
export interface DataContract {
    readonly metadata: ContractMetadata;
    readonly format: DataFormat;
    readonly schema: string;
    readonly examples: readonly string[];
    readonly constraints: readonly DataConstraint[];
}
/**
 * Data constraint definition.
 */
export interface DataConstraint {
    readonly field: string;
    readonly type: 'required' | 'type' | 'range' | 'pattern' | 'enum';
    readonly value: unknown;
    readonly message: string;
}
/**
 * Contract entry in registry.
 */
export interface ContractEntry {
    readonly type: 'module' | 'protocol' | 'data' | 'invariant';
    readonly contract: ModuleContract | ProtocolContract | DataContract | InvariantContract;
}
/**
 * Contract registry interface.
 */
export interface ContractRegistry {
    /**
     * Registers a contract.
     */
    register(entry: ContractEntry): void;
    /**
     * Gets a contract by ID.
     */
    get(id: string): ContractEntry | undefined;
    /**
     * Lists all contracts of a type.
     */
    listByType(type: ContractEntry['type']): readonly ContractEntry[];
    /**
     * Lists all contract IDs.
     */
    list(): readonly string[];
    /**
     * Validates a contract.
     */
    validate(entry: ContractEntry): readonly string[];
}
/**
 * Validation result.
 */
export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: readonly ValidationError[];
    readonly warnings: readonly ValidationWarning[];
}
/**
 * Validation error.
 */
export interface ValidationError {
    readonly code: string;
    readonly path: string;
    readonly message: string;
    readonly expected?: unknown;
    readonly actual?: unknown;
}
/**
 * Validation warning.
 */
export interface ValidationWarning {
    readonly code: string;
    readonly path: string;
    readonly message: string;
}
export declare function isContractVersion(obj: unknown): obj is ContractVersion;
export declare function isContractMetadata(obj: unknown): obj is ContractMetadata;
export declare function isInvariantContract(obj: unknown): obj is InvariantContract;
export declare function isModuleContract(obj: unknown): obj is ModuleContract;
//# sourceMappingURL=types.d.ts.map