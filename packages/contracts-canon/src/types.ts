/**
 * @fileoverview OMEGA Contracts Canon - Core Types
 * @module @omega/contracts-canon
 *
 * Canonical source of truth for all OMEGA interface contracts.
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT METADATA
// ═══════════════════════════════════════════════════════════════════════════════

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
export type ContractStability =
  | 'EXPERIMENTAL'  // May change without notice
  | 'UNSTABLE'      // May change with deprecation notice
  | 'STABLE'        // Follows semver
  | 'FROZEN'        // Never changes
  | 'DEPRECATED';   // Will be removed

/**
 * Contract metadata attached to every contract.
 */
export interface ContractMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: ContractVersion;
  readonly stability: ContractStability;
  readonly since: string;  // ISO date
  readonly deprecated?: string;  // ISO date if deprecated
  readonly description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Invariant severity levels.
 */
export type InvariantSeverity =
  | 'CRITICAL'  // Violation = system halt
  | 'HIGH'      // Violation = operation abort
  | 'MEDIUM'    // Violation = warning + retry
  | 'LOW';      // Violation = warning only

/**
 * Invariant definition.
 */
export interface InvariantContract {
  readonly id: string;
  readonly name: string;
  readonly severity: InvariantSeverity;
  readonly description: string;
  readonly module: string;
  readonly condition: string;  // Human-readable condition
  readonly testRef?: string;   // Reference to test file
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

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Module type classification.
 */
export type ModuleType =
  | 'ROOT'        // Foundation module (e.g., Sentinel)
  | 'CORE'        // Core infrastructure
  | 'CLIENT'      // Client module (consumes ROOT)
  | 'INTEGRATION' // Integration layer
  | 'UTILITY';    // Utility/helper module

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
  readonly invariants: readonly string[];  // Invariant IDs
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

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
  readonly schema: string;  // JSON Schema reference or inline
}

/**
 * Protocol contract between modules.
 */
export interface ProtocolContract {
  readonly metadata: ContractMetadata;
  readonly producer: string;
  readonly consumer: string;
  readonly messages: readonly ProtocolMessage[];
  readonly guarantees: readonly string[];  // Invariant IDs
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Data format specification.
 */
export type DataFormat =
  | 'JSON'
  | 'NDJSON'
  | 'BINARY'
  | 'TEXT'
  | 'SHA256';

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

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export function isContractVersion(obj: unknown): obj is ContractVersion {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'major' in obj &&
    typeof (obj as ContractVersion).major === 'number' &&
    'minor' in obj &&
    typeof (obj as ContractVersion).minor === 'number' &&
    'patch' in obj &&
    typeof (obj as ContractVersion).patch === 'number'
  );
}

export function isContractMetadata(obj: unknown): obj is ContractMetadata {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as ContractMetadata).id === 'string' &&
    'name' in obj &&
    typeof (obj as ContractMetadata).name === 'string' &&
    'version' in obj &&
    isContractVersion((obj as ContractMetadata).version) &&
    'stability' in obj &&
    typeof (obj as ContractMetadata).stability === 'string' &&
    'since' in obj &&
    typeof (obj as ContractMetadata).since === 'string' &&
    'description' in obj &&
    typeof (obj as ContractMetadata).description === 'string'
  );
}

export function isInvariantContract(obj: unknown): obj is InvariantContract {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'severity' in obj &&
    'description' in obj &&
    'module' in obj &&
    'condition' in obj
  );
}

export function isModuleContract(obj: unknown): obj is ModuleContract {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'metadata' in obj &&
    isContractMetadata((obj as ModuleContract).metadata) &&
    'type' in obj &&
    'package' in obj &&
    'dependencies' in obj &&
    'exports' in obj &&
    'invariants' in obj
  );
}
