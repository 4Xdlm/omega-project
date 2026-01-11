/**
 * @fileoverview OMEGA Contracts Canon - System Invariants
 * @module @omega/contracts-canon/invariants
 *
 * Canonical registry of all OMEGA system invariants.
 * These are the inviolable rules of the system.
 */

import type { InvariantContract, InvariantSeverity } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

function createInvariant(
  id: string,
  name: string,
  severity: InvariantSeverity,
  module: string,
  condition: string,
  description: string,
  testRef?: string
): InvariantContract {
  return Object.freeze({
    id,
    name,
    severity,
    module,
    condition,
    description,
    testRef,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM INVARIANTS (INV-DET-*)
// ═══════════════════════════════════════════════════════════════════════════════

export const INV_DET_01 = createInvariant(
  'INV-DET-01',
  'Same Seed Same Result',
  'CRITICAL',
  '@omega/orchestrator-core',
  'run(plan, seed) === run(plan, seed)',
  'Two executions with the same plan and seed must produce identical results',
  'test/integration/determinism-double-run.test.ts'
);

export const INV_DET_02 = createInvariant(
  'INV-DET-02',
  'Injectable Clock',
  'CRITICAL',
  '@omega/orchestrator-core',
  'typeof clock.now === "function"',
  'All time sources must be injectable for deterministic replay',
  'test/unit/clock.test.ts'
);

export const INV_DET_03 = createInvariant(
  'INV-DET-03',
  'Injectable ID Factory',
  'CRITICAL',
  '@omega/orchestrator-core',
  'typeof idFactory.next === "function"',
  'All ID generators must be injectable for deterministic replay',
  'test/unit/RunContext.test.ts'
);

export const INV_DET_04 = createInvariant(
  'INV-DET-04',
  'Stable JSON Serialization',
  'CRITICAL',
  '@omega/orchestrator-core',
  'stableStringify(obj1) === stableStringify(obj2) when deepEqual(obj1, obj2)',
  'JSON serialization must produce consistent output regardless of insertion order',
  'test/unit/stableJson.test.ts'
);

export const INV_DET_05 = createInvariant(
  'INV-DET-05',
  'Hash Determinism',
  'CRITICAL',
  '@omega/orchestrator-core',
  'sha256(data) === sha256(data)',
  'SHA-256 hashes must be deterministic and cross-platform consistent',
  'test/unit/hash.test.ts'
);

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION INVARIANTS (INV-EXE-*)
// ═══════════════════════════════════════════════════════════════════════════════

export const INV_EXE_01 = createInvariant(
  'INV-EXE-01',
  'Dependency Order',
  'CRITICAL',
  '@omega/orchestrator-core',
  'step.depends_on.every(d => isCompleted(d)) before execute(step)',
  'Steps must only execute after all dependencies have completed',
  'test/unit/Executor.test.ts'
);

export const INV_EXE_02 = createInvariant(
  'INV-EXE-02',
  'No Circular Dependencies',
  'CRITICAL',
  '@omega/orchestrator-core',
  'detectCycles(plan.steps) === []',
  'Plan dependency graph must be acyclic',
  'test/unit/Plan.test.ts'
);

export const INV_EXE_03 = createInvariant(
  'INV-EXE-03',
  'Complete Result',
  'HIGH',
  '@omega/orchestrator-core',
  'result.steps.length === plan.steps.length',
  'Run result must contain results for all plan steps',
  'test/integration/execute-plan.test.ts'
);

export const INV_EXE_04 = createInvariant(
  'INV-EXE-04',
  'Result Immutability',
  'HIGH',
  '@omega/orchestrator-core',
  'Object.isFrozen(result)',
  'Run results must be immutable after creation',
  'test/unit/Executor.test.ts'
);

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY INVARIANTS (INV-REP-*)
// ═══════════════════════════════════════════════════════════════════════════════

export const INV_REP_01 = createInvariant(
  'INV-REP-01',
  'Recording Integrity',
  'CRITICAL',
  '@omega/headless-runner',
  'sha256(recordingWithoutHash) === recording.hash',
  'Recording hash must match computed hash of recording content',
  'test/unit/replay.test.ts'
);

export const INV_REP_02 = createInvariant(
  'INV-REP-02',
  'Replay Equivalence',
  'CRITICAL',
  '@omega/headless-runner',
  'compareResults(original, replayed).length === 0',
  'Replay with same context must produce identical results',
  'test/integration/replay.test.ts'
);

export const INV_REP_03 = createInvariant(
  'INV-REP-03',
  'Difference Detection',
  'HIGH',
  '@omega/headless-runner',
  'original !== replayed => compareResults().length > 0',
  'Differences between runs must be detected and reported',
  'test/integration/replay.test.ts'
);

export const INV_REP_04 = createInvariant(
  'INV-REP-04',
  'Recording Store CRUD',
  'MEDIUM',
  '@omega/headless-runner',
  'store.load(store.save(r)).hash === r.hash',
  'Recording store must preserve recording integrity',
  'test/unit/replay.test.ts'
);

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT INVARIANTS (INV-ART-*)
// ═══════════════════════════════════════════════════════════════════════════════

export const INV_ART_01 = createInvariant(
  'INV-ART-01',
  'Artifact Immutability',
  'CRITICAL',
  '@omega/orchestrator-core',
  '!registry.update(id, newContent)',
  'Artifacts cannot be modified after registration',
  'test/unit/ArtifactRegistry.test.ts'
);

export const INV_ART_02 = createInvariant(
  'INV-ART-02',
  'Hash Verification',
  'CRITICAL',
  '@omega/orchestrator-core',
  'registry.verify(id) === true',
  'Artifact content must match stored hash',
  'test/unit/ArtifactRegistry.test.ts'
);

export const INV_ART_03 = createInvariant(
  'INV-ART-03',
  'Unique Artifact IDs',
  'HIGH',
  '@omega/orchestrator-core',
  'registry.register(id) throws if exists(id)',
  'Artifact IDs must be unique within a registry',
  'test/unit/ArtifactRegistry.test.ts'
);

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS INVARIANTS (INV-NEX-*)
// ═══════════════════════════════════════════════════════════════════════════════

export const INV_NEX_01 = createInvariant(
  'INV-NEX-01',
  'Adapter Read-Only',
  'CRITICAL',
  '@omega/integration-nexus-dep',
  'adapter.isReadOnly === true',
  'NEXUS adapters are read-only and cannot modify sanctuarized modules',
  'test/unit/adapters.test.ts'
);

export const INV_NEX_02 = createInvariant(
  'INV-NEX-02',
  'Request ID Uniqueness',
  'HIGH',
  '@omega/integration-nexus-dep',
  'new Set(requests.map(r => r.id)).size === requests.length',
  'All NEXUS requests must have unique identifiers',
  'test/unit/types.test.ts'
);

export const INV_NEX_03 = createInvariant(
  'INV-NEX-03',
  'Execution Trace',
  'MEDIUM',
  '@omega/integration-nexus-dep',
  'response.trace?.steps.length > 0',
  'All operations must produce an execution trace for auditability',
  'test/integration/pipeline.test.ts'
);

// ═══════════════════════════════════════════════════════════════════════════════
// SANCTUARY INVARIANTS (INV-SAN-*)
// ═══════════════════════════════════════════════════════════════════════════════

export const INV_SAN_01 = createInvariant(
  'INV-SAN-01',
  'Frozen Module Protection',
  'CRITICAL',
  '@omega/sentinel',
  'module.status === "FROZEN" => !canModify(module)',
  'Frozen modules cannot be modified',
  'packages/sentinel/tests/meta.test.ts'
);

export const INV_SAN_02 = createInvariant(
  'INV-SAN-02',
  'Unidirectional Flow',
  'CRITICAL',
  '@omega/sentinel',
  'client.dependencies.includes(root) && !root.dependencies.includes(client)',
  'Dependency flow is unidirectional from ROOT to CLIENT',
  'packages/sentinel/tests/foundation.test.ts'
);

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All system invariants.
 */
export const ALL_INVARIANTS: readonly InvariantContract[] = Object.freeze([
  // Determinism
  INV_DET_01,
  INV_DET_02,
  INV_DET_03,
  INV_DET_04,
  INV_DET_05,
  // Execution
  INV_EXE_01,
  INV_EXE_02,
  INV_EXE_03,
  INV_EXE_04,
  // Replay
  INV_REP_01,
  INV_REP_02,
  INV_REP_03,
  INV_REP_04,
  // Artifact
  INV_ART_01,
  INV_ART_02,
  INV_ART_03,
  // Nexus
  INV_NEX_01,
  INV_NEX_02,
  INV_NEX_03,
  // Sanctuary
  INV_SAN_01,
  INV_SAN_02,
]);

/**
 * Get invariants by module.
 */
export function getInvariantsByModule(module: string): readonly InvariantContract[] {
  return ALL_INVARIANTS.filter((inv) => inv.module === module);
}

/**
 * Get invariants by severity.
 */
export function getInvariantsBySeverity(
  severity: InvariantSeverity
): readonly InvariantContract[] {
  return ALL_INVARIANTS.filter((inv) => inv.severity === severity);
}

/**
 * Get invariant by ID.
 */
export function getInvariant(id: string): InvariantContract | undefined {
  return ALL_INVARIANTS.find((inv) => inv.id === id);
}

/**
 * Total invariant count.
 */
export const INVARIANT_COUNT = ALL_INVARIANTS.length;
