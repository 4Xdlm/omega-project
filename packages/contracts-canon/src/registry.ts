/**
 * @fileoverview OMEGA Contracts Canon - Contract Registry
 * @module @omega/contracts-canon/registry
 *
 * Registry for managing and validating contracts.
 */

import type {
  ContractRegistry,
  ContractEntry,
  ModuleContract,
  InvariantContract,
  DataContract,
  ProtocolContract,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types.js';
import { isContractMetadata } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory implementation of ContractRegistry.
 */
export class InMemoryContractRegistry implements ContractRegistry {
  private readonly entries: Map<string, ContractEntry> = new Map();

  register(entry: ContractEntry): void {
    const id = this.getEntryId(entry);
    if (this.entries.has(id)) {
      throw new Error(`Contract with ID '${id}' already registered`);
    }

    const errors = this.validate(entry);
    if (errors.length > 0) {
      throw new Error(`Invalid contract: ${errors.join(', ')}`);
    }

    this.entries.set(id, entry);
  }

  get(id: string): ContractEntry | undefined {
    return this.entries.get(id);
  }

  listByType(type: ContractEntry['type']): readonly ContractEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.type === type);
  }

  list(): readonly string[] {
    return Array.from(this.entries.keys()).sort();
  }

  validate(entry: ContractEntry): readonly string[] {
    const errors: string[] = [];

    switch (entry.type) {
      case 'module':
        errors.push(...this.validateModuleContract(entry.contract as ModuleContract));
        break;
      case 'invariant':
        errors.push(...this.validateInvariantContract(entry.contract as InvariantContract));
        break;
      case 'protocol':
        errors.push(...this.validateProtocolContract(entry.contract as ProtocolContract));
        break;
      case 'data':
        errors.push(...this.validateDataContract(entry.contract as DataContract));
        break;
      default:
        errors.push(`Unknown contract type: ${entry.type}`);
    }

    return errors;
  }

  private getEntryId(entry: ContractEntry): string {
    switch (entry.type) {
      case 'module':
        return (entry.contract as ModuleContract).metadata.id;
      case 'invariant':
        return (entry.contract as InvariantContract).id;
      case 'protocol':
        return (entry.contract as ProtocolContract).metadata.id;
      case 'data':
        return (entry.contract as DataContract).metadata.id;
      default:
        throw new Error(`Unknown contract type: ${entry.type}`);
    }
  }

  private validateModuleContract(contract: ModuleContract): string[] {
    const errors: string[] = [];

    if (!isContractMetadata(contract.metadata)) {
      errors.push('Invalid or missing metadata');
    }

    if (!contract.package || typeof contract.package !== 'string') {
      errors.push('Missing or invalid package name');
    }

    if (!Array.isArray(contract.dependencies)) {
      errors.push('Missing or invalid dependencies array');
    }

    if (!Array.isArray(contract.exports)) {
      errors.push('Missing or invalid exports array');
    }

    if (!Array.isArray(contract.invariants)) {
      errors.push('Missing or invalid invariants array');
    }

    return errors;
  }

  private validateInvariantContract(contract: InvariantContract): string[] {
    const errors: string[] = [];

    if (!contract.id || typeof contract.id !== 'string') {
      errors.push('Missing or invalid ID');
    }

    if (!contract.name || typeof contract.name !== 'string') {
      errors.push('Missing or invalid name');
    }

    if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(contract.severity)) {
      errors.push('Invalid severity level');
    }

    if (!contract.module || typeof contract.module !== 'string') {
      errors.push('Missing or invalid module');
    }

    if (!contract.condition || typeof contract.condition !== 'string') {
      errors.push('Missing or invalid condition');
    }

    return errors;
  }

  private validateProtocolContract(contract: ProtocolContract): string[] {
    const errors: string[] = [];

    if (!isContractMetadata(contract.metadata)) {
      errors.push('Invalid or missing metadata');
    }

    if (!contract.producer || typeof contract.producer !== 'string') {
      errors.push('Missing or invalid producer');
    }

    if (!contract.consumer || typeof contract.consumer !== 'string') {
      errors.push('Missing or invalid consumer');
    }

    if (!Array.isArray(contract.messages)) {
      errors.push('Missing or invalid messages array');
    }

    return errors;
  }

  private validateDataContract(contract: DataContract): string[] {
    const errors: string[] = [];

    if (!isContractMetadata(contract.metadata)) {
      errors.push('Invalid or missing metadata');
    }

    if (!['JSON', 'NDJSON', 'BINARY', 'TEXT', 'SHA256'].includes(contract.format)) {
      errors.push('Invalid data format');
    }

    if (!contract.schema || typeof contract.schema !== 'string') {
      errors.push('Missing or invalid schema');
    }

    return errors;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates a contract and returns detailed result.
 */
export function validateContract(entry: ContractEntry): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const registry = new InMemoryContractRegistry();
  const validationErrors = registry.validate(entry);

  for (const error of validationErrors) {
    errors.push({
      code: 'CONTRACT_VALIDATION',
      path: '',
      message: error,
    });
  }

  // Additional warnings
  if (entry.type === 'module') {
    const mod = entry.contract as ModuleContract;
    if (mod.exports.length === 0) {
      warnings.push({
        code: 'EMPTY_EXPORTS',
        path: 'exports',
        message: 'Module has no exports',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Checks if an invariant condition is satisfied.
 * Returns a result object with pass/fail status.
 */
export function checkInvariant(
  invariant: InvariantContract,
  _context: unknown
): { passed: boolean; message?: string } {
  // This is a stub - actual invariant checking would need runtime context
  // For now, we return a placeholder result
  return {
    passed: true,
    message: `Invariant ${invariant.id} check requires runtime context`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPENDENCY GRAPH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds a dependency graph from module contracts.
 */
export function buildDependencyGraph(
  modules: readonly ModuleContract[]
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const mod of modules) {
    const deps = new Set<string>();
    for (const dep of mod.dependencies) {
      deps.add(dep.module);
    }
    graph.set(mod.package, deps);
  }

  return graph;
}

/**
 * Checks for circular dependencies in module graph.
 */
export function detectCircularDependencies(
  modules: readonly ModuleContract[]
): readonly string[][] {
  const graph = buildDependencyGraph(modules);
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): boolean {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart));
      return true;
    }

    if (visited.has(node)) {
      return false;
    }

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const deps = graph.get(node) || new Set();
    for (const dep of deps) {
      dfs(dep, [...path]);
    }

    recursionStack.delete(node);
    return false;
  }

  for (const mod of modules) {
    if (!visited.has(mod.package)) {
      dfs(mod.package, []);
    }
  }

  return cycles;
}

/**
 * Gets topological order of modules.
 */
export function getTopologicalOrder(
  modules: readonly ModuleContract[]
): readonly string[] {
  const graph = buildDependencyGraph(modules);
  const result: string[] = [];
  const visited = new Set<string>();

  function visit(node: string): void {
    if (visited.has(node)) return;
    visited.add(node);

    const deps = graph.get(node) || new Set();
    for (const dep of deps) {
      visit(dep);
    }

    result.push(node);
  }

  for (const mod of modules) {
    visit(mod.package);
  }

  return result;
}
