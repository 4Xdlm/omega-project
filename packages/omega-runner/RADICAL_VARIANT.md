# RADICAL VARIANT — Pure-FP DAG Orchestration

## Concept

Orchestration as an immutable Directed Acyclic Graph (DAG):

1. **Phase PLAN**: Construct the dependency graph without side effects
2. **Phase EXECUTE**: Traverse the DAG and collect results (pure functions only)
3. **Phase MATERIALIZE**: Single IO pass to write all files atomically

## Architecture

```
IntentPack
    |
    v
+---------+
|  PLAN   | -> DAG Node[] (immutable graph of computations)
+---------+
    |
    v
+---------+
| EXECUTE | -> Result[] (pure, no IO, no side effects)
+---------+
    |
    v
+------------+
| MATERIALIZE| -> Files written (single atomic IO pass)
+------------+
```

## DAG Node Definition

```typescript
interface DagNode<T> {
  readonly id: string;
  readonly deps: readonly string[];
  readonly compute: (inputs: Map<string, unknown>) => T;
}

interface DagPlan {
  readonly nodes: readonly DagNode<unknown>[];
  readonly edges: ReadonlyMap<string, readonly string[]>;
  readonly roots: readonly string[];
  readonly sinks: readonly string[];
}
```

## Execution Model

```typescript
// Phase 1: PLAN — build the computation graph
function planFull(intent: IntentPack, seed: string): DagPlan {
  return {
    nodes: [
      { id: 'genesis', deps: [], compute: (inputs) => createGenesisPlan(...) },
      { id: 'scribe', deps: ['genesis'], compute: (inputs) => runScribe(...) },
      { id: 'style', deps: ['scribe'], compute: (inputs) => runStyleEmergence(...) },
      { id: 'creation', deps: ['genesis', 'scribe', 'style'], compute: (...) => runCreation(...) },
      { id: 'forge', deps: ['creation'], compute: (inputs) => runForge(...) },
      { id: 'proofpack', deps: ['creation', 'forge'], compute: (...) => buildProofPack(...) },
    ],
    edges: new Map([...]),
    roots: ['genesis'],
    sinks: ['proofpack'],
  };
}

// Phase 2: EXECUTE — topological traversal, no IO
function executeDag(plan: DagPlan): Map<string, unknown> {
  const results = new Map<string, unknown>();
  for (const node of topologicalSort(plan.nodes)) {
    const inputs = new Map(
      node.deps.map(d => [d, results.get(d)!])
    );
    results.set(node.id, node.compute(inputs));
  }
  return results;
}

// Phase 3: MATERIALIZE — single IO pass
function materialize(results: Map<string, unknown>, outDir: string): void {
  const proofpack = results.get('proofpack') as ProofPackData;
  for (const [path, content] of proofpack.files) {
    writeFileSync(join(outDir, path), content);
  }
}
```

## Advantages

- **Reproducibility**: No mutable state between phases. Pure compute in phase 2.
- **Parallelization**: Independent branches (e.g., canon compliance vs trajectory) can execute concurrently.
- **Testability**: Each node is a pure function. Mock inputs, verify outputs.
- **Rollback**: Nothing is written until phase 3. Crash recovery is trivial.
- **Composability**: New pipeline stages are just new DAG nodes with declared dependencies.

## Risks

- **Memory**: All intermediate results held in RAM until materialization.
  Mitigation: For 100k-word novels, peak memory is ~200MB — acceptable.
- **Complexity**: DAG scheduler adds abstraction layer.
  Mitigation: Topological sort is O(V+E), well-understood algorithm.
- **Debugging**: Stack traces cross the DAG boundary.
  Mitigation: Node IDs in error messages + pre/post hooks for logging.
- **Serialization**: Large intermediate objects must be held as values, not files.
  Mitigation: Use structured sharing (ReadonlyArray, frozen objects).

## Migration Path

Current D.1 uses sequential orchestration (V0 -> V1 -> ... -> V5).
Migration to DAG:

1. Extract each orchestrator step into a `DagNode.compute` function
2. Replace sequential calls with `planFull()` + `executeDag()` + `materialize()`
3. Keep `writeProofPack()` as the sole IO boundary
4. Add parallel execution support when Node.js worker_threads are available

## Comparison

| Aspect | Current (D.1) | DAG Variant |
|--------|--------------|-------------|
| Execution | Sequential | Topological |
| IO | Per-stage | Single pass |
| Testability | Integration | Unit per node |
| Parallelism | None | Potential |
| Memory | Streaming | Buffered |
| Complexity | Low | Medium |
| Determinism | By convention | By construction |
