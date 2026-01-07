/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — LINEAGE TRACKING
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module crystal/lineage
 * @version 2.0.0
 * @license MIT
 * 
 * LINEAGE — GENETIC TRACEABILITY
 * ===============================
 * 
 * Tracks relationships between invariants:
 * - Parent-child relationships
 * - Generation calculation
 * - Ancestor/descendant queries
 * - DAG validation (no cycles)
 * 
 * INVARIANTS:
 * - INV-LIN-01: Lineage forms a DAG (Directed Acyclic Graph)
 * - INV-LIN-02: Generation = max(parent generations) + 1
 * - INV-LIN-03: Root invariants have generation 0 and no parents
 * - INV-LIN-04: All parent references are valid
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { type CrystallineInvariant, type InvariantLineage } from './grammar.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lineage graph node
 */
export interface LineageNode {
  /** Invariant ID */
  readonly id: string;
  
  /** Parent IDs */
  readonly parents: readonly string[];
  
  /** Child IDs (computed) */
  readonly children: readonly string[];
  
  /** Generation number */
  readonly generation: number;
}

/**
 * Complete lineage graph
 */
export interface LineageGraph {
  /** All nodes indexed by ID */
  readonly nodes: ReadonlyMap<string, LineageNode>;
  
  /** Root nodes (no parents) */
  readonly roots: readonly string[];
  
  /** Leaf nodes (no children) */
  readonly leaves: readonly string[];
  
  /** Maximum generation number */
  readonly maxGeneration: number;
}

/**
 * Lineage validation result
 */
export interface LineageValidationResult {
  /** Is the lineage valid? */
  readonly isValid: boolean;
  
  /** Errors found */
  readonly errors: readonly string[];
  
  /** Has cycles? */
  readonly hasCycles: boolean;
  
  /** Invalid parent references */
  readonly invalidParents: readonly string[];
  
  /** Inconsistent generations */
  readonly inconsistentGenerations: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH CONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a lineage graph from a collection of invariants
 */
export function buildLineageGraph(
  invariants: readonly CrystallineInvariant[]
): LineageGraph {
  // Build node map
  const nodeMap = new Map<string, {
    id: string;
    parents: string[];
    children: string[];
    generation: number;
  }>();
  
  // First pass: create nodes
  for (const inv of invariants) {
    nodeMap.set(inv.id, {
      id: inv.id,
      parents: [...inv.lineage.parents],
      children: [],
      generation: inv.lineage.generation
    });
  }
  
  // Second pass: compute children
  for (const inv of invariants) {
    for (const parentId of inv.lineage.parents) {
      const parent = nodeMap.get(parentId);
      if (parent) {
        parent.children.push(inv.id);
      }
    }
  }
  
  // Convert to readonly
  const nodes = new Map<string, LineageNode>();
  for (const [id, node] of nodeMap) {
    nodes.set(id, Object.freeze({
      id: node.id,
      parents: Object.freeze(node.parents),
      children: Object.freeze(node.children),
      generation: node.generation
    }));
  }
  
  // Find roots and leaves
  const roots: string[] = [];
  const leaves: string[] = [];
  let maxGeneration = 0;
  
  for (const [id, node] of nodes) {
    if (node.parents.length === 0) {
      roots.push(id);
    }
    if (node.children.length === 0) {
      leaves.push(id);
    }
    if (node.generation > maxGeneration) {
      maxGeneration = node.generation;
    }
  }
  
  return Object.freeze({
    nodes,
    roots: Object.freeze(roots),
    leaves: Object.freeze(leaves),
    maxGeneration
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate lineage for a collection of invariants
 */
export function validateLineage(
  invariants: readonly CrystallineInvariant[]
): LineageValidationResult {
  const errors: string[] = [];
  const invalidParents: string[] = [];
  const inconsistentGenerations: string[] = [];
  let hasCycles = false;
  
  // Build ID set for quick lookup
  const idSet = new Set(invariants.map(i => i.id));
  
  // Check each invariant
  for (const inv of invariants) {
    // Check parent references
    for (const parentId of inv.lineage.parents) {
      if (!idSet.has(parentId)) {
        errors.push(`${inv.id}: Parent ${parentId} not found`);
        invalidParents.push(parentId);
      }
    }
    
    // Check generation consistency
    if (inv.lineage.parents.length === 0 && inv.lineage.generation !== 0) {
      errors.push(`${inv.id}: Root invariant must have generation 0`);
      inconsistentGenerations.push(inv.id);
    }
    
    if (inv.lineage.parents.length > 0 && inv.lineage.generation === 0) {
      errors.push(`${inv.id}: Non-root invariant cannot have generation 0`);
      inconsistentGenerations.push(inv.id);
    }
  }
  
  // Check for cycles using DFS
  hasCycles = detectCycles(invariants);
  if (hasCycles) {
    errors.push('Lineage contains cycles (not a valid DAG)');
  }
  
  return Object.freeze({
    isValid: errors.length === 0,
    errors: Object.freeze(errors),
    hasCycles,
    invalidParents: Object.freeze([...new Set(invalidParents)]),
    inconsistentGenerations: Object.freeze([...new Set(inconsistentGenerations)])
  });
}

/**
 * Detect cycles in the lineage graph using DFS
 */
function detectCycles(invariants: readonly CrystallineInvariant[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  // Build adjacency map (child -> parents)
  const parentMap = new Map<string, string[]>();
  for (const inv of invariants) {
    parentMap.set(inv.id, [...inv.lineage.parents]);
  }
  
  function hasCycleDFS(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true;  // Back edge = cycle
    }
    if (visited.has(nodeId)) {
      return false;  // Already processed, no cycle through here
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const parents = parentMap.get(nodeId) ?? [];
    for (const parentId of parents) {
      if (hasCycleDFS(parentId)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  }
  
  // Check from each node
  for (const inv of invariants) {
    if (hasCycleDFS(inv.id)) {
      return true;
    }
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANCESTOR/DESCENDANT QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all ancestors of an invariant (transitive parents)
 */
export function getAncestors(
  graph: LineageGraph,
  id: string
): readonly string[] {
  const ancestors = new Set<string>();
  const queue: string[] = [];
  
  const node = graph.nodes.get(id);
  if (!node) return [];
  
  // Start with direct parents
  queue.push(...node.parents);
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (ancestors.has(currentId)) continue;
    
    ancestors.add(currentId);
    
    const currentNode = graph.nodes.get(currentId);
    if (currentNode) {
      queue.push(...currentNode.parents);
    }
  }
  
  return Object.freeze([...ancestors]);
}

/**
 * Get all descendants of an invariant (transitive children)
 */
export function getDescendants(
  graph: LineageGraph,
  id: string
): readonly string[] {
  const descendants = new Set<string>();
  const queue: string[] = [];
  
  const node = graph.nodes.get(id);
  if (!node) return [];
  
  // Start with direct children
  queue.push(...node.children);
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (descendants.has(currentId)) continue;
    
    descendants.add(currentId);
    
    const currentNode = graph.nodes.get(currentId);
    if (currentNode) {
      queue.push(...currentNode.children);
    }
  }
  
  return Object.freeze([...descendants]);
}

/**
 * Check if one invariant is an ancestor of another
 */
export function isAncestor(
  graph: LineageGraph,
  ancestorId: string,
  descendantId: string
): boolean {
  const ancestors = getAncestors(graph, descendantId);
  return ancestors.includes(ancestorId);
}

/**
 * Check if one invariant is a descendant of another
 */
export function isDescendant(
  graph: LineageGraph,
  descendantId: string,
  ancestorId: string
): boolean {
  return isAncestor(graph, ancestorId, descendantId);
}

/**
 * Get the common ancestors of two invariants
 */
export function getCommonAncestors(
  graph: LineageGraph,
  id1: string,
  id2: string
): readonly string[] {
  const ancestors1 = new Set(getAncestors(graph, id1));
  const ancestors2 = getAncestors(graph, id2);
  
  const common = ancestors2.filter(a => ancestors1.has(a));
  return Object.freeze(common);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATION QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all invariants at a specific generation
 */
export function getByGeneration(
  graph: LineageGraph,
  generation: number
): readonly string[] {
  const result: string[] = [];
  for (const [id, node] of graph.nodes) {
    if (node.generation === generation) {
      result.push(id);
    }
  }
  return Object.freeze(result);
}

/**
 * Calculate the correct generation for a new invariant
 * based on its parents
 */
export function calculateGeneration(
  graph: LineageGraph,
  parentIds: readonly string[]
): number {
  if (parentIds.length === 0) {
    return 0;  // Root
  }
  
  let maxParentGen = 0;
  for (const parentId of parentIds) {
    const parent = graph.nodes.get(parentId);
    if (parent && parent.generation > maxParentGen) {
      maxParentGen = parent.generation;
    }
  }
  
  return maxParentGen + 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOPOLOGICAL OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get invariants in topological order (parents before children)
 */
export function topologicalSort(graph: LineageGraph): readonly string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  
  function visit(id: string): void {
    if (visited.has(id)) return;
    
    const node = graph.nodes.get(id);
    if (!node) return;
    
    // Visit parents first
    for (const parentId of node.parents) {
      visit(parentId);
    }
    
    visited.add(id);
    result.push(id);
  }
  
  // Visit all nodes
  for (const id of graph.nodes.keys()) {
    visit(id);
  }
  
  return Object.freeze(result);
}

/**
 * Get the depth (longest path from any root) for an invariant
 */
export function getDepth(graph: LineageGraph, id: string): number {
  const node = graph.nodes.get(id);
  if (!node) return -1;
  
  if (node.parents.length === 0) {
    return 0;  // Root
  }
  
  let maxParentDepth = 0;
  for (const parentId of node.parents) {
    const parentDepth = getDepth(graph, parentId);
    if (parentDepth > maxParentDepth) {
      maxParentDepth = parentDepth;
    }
  }
  
  return maxParentDepth + 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a lineage object for a new invariant
 */
export function createLineage(
  parentIds: readonly string[],
  existingGraph?: LineageGraph
): InvariantLineage {
  const generation = existingGraph 
    ? calculateGeneration(existingGraph, parentIds)
    : (parentIds.length === 0 ? 0 : 1);
  
  return Object.freeze({
    parents: Object.freeze([...parentIds]),
    generation
  });
}

/**
 * Create a root lineage (no parents, generation 0)
 */
export function createRootLineage(): InvariantLineage {
  return Object.freeze({
    parents: Object.freeze([]),
    generation: 0
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get statistics about the lineage graph
 */
export function getGraphStats(graph: LineageGraph): {
  readonly totalNodes: number;
  readonly totalRoots: number;
  readonly totalLeaves: number;
  readonly maxGeneration: number;
  readonly avgChildrenPerNode: number;
} {
  let totalChildren = 0;
  for (const node of graph.nodes.values()) {
    totalChildren += node.children.length;
  }
  
  return Object.freeze({
    totalNodes: graph.nodes.size,
    totalRoots: graph.roots.length,
    totalLeaves: graph.leaves.length,
    maxGeneration: graph.maxGeneration,
    avgChildrenPerNode: graph.nodes.size > 0 
      ? totalChildren / graph.nodes.size 
      : 0
  });
}
