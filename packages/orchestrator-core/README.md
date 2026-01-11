# @omega/orchestrator-core

Deterministic execution engine for OMEGA pipeline orchestration.

## Features

- **Deterministic Execution**: Injectable clock, ID factory, and RNG ensure reproducible runs
- **Plan-Based Orchestration**: Define execution plans with steps, dependencies, and hooks
- **Adapter Pattern**: Pluggable step adapters for different execution types
- **Full Traceability**: SHA-256 hashes and structured results for audit trails
- **Type-Safe**: Full TypeScript support with strict mode

## Installation

```bash
npm install @omega/orchestrator-core
```

## Quick Start

```typescript
import {
  createRunContext,
  createPlanBuilder,
  createExecutor,
  SimpleAdapterRegistry,
  DeterministicClock,
} from '@omega/orchestrator-core';

// 1. Create a deterministic context
const clock = new DeterministicClock(Date.UTC(2026, 0, 1));
const ctx = createRunContext({
  seed: 'my-deterministic-seed',
  clock,
});

// 2. Register adapters for step kinds
const adapters = new SimpleAdapterRegistry();
adapters.register({
  kind: 'echo',
  async execute(input) {
    return { echoed: input };
  },
});

// 3. Build a plan
const plan = createPlanBuilder('my-plan', '1.0.0')
  .addStep({
    id: 'step-1',
    kind: 'echo',
    input: { message: 'Hello, OMEGA!' },
  })
  .build();

// 4. Execute
const executor = createExecutor();
const result = await executor.execute(plan, ctx, adapters);

console.log(result.status); // 'SUCCESS'
console.log(result.hash);   // SHA-256 hash of result
```

## API Reference

### RunContext

Execution context with injectable dependencies.

```typescript
interface RunContextOptions {
  seed: string;        // Required - determinism seed
  clock?: Clock;       // Optional - injectable clock
  idFactory?: IdFactory; // Optional - injectable ID generator
}

const ctx = createRunContext({ seed: 'my-seed' });
```

### OrchestratorPlan

Plan definition with steps and hooks.

```typescript
interface PlanStep {
  id: string;           // Unique step ID
  kind: string;         // Adapter kind
  input: unknown;       // Step input
  timeout_ms?: number;  // Optional timeout
  depends_on?: string[]; // Optional dependencies
}

const plan = createPlanBuilder('plan-id', '1.0.0')
  .addStep({ id: 'step-1', kind: 'process', input: data })
  .onPreStep((step, ctx) => console.log('Starting:', step.id))
  .onPostStep((step, result) => console.log('Completed:', result.status))
  .build();
```

### Executor

Executes plans deterministically.

```typescript
const executor = createExecutor({
  defaultTimeoutMs: 30000,
  continueOnFailure: false,
});

const result = await executor.execute(plan, ctx, adapters);
```

### DeterminismGuard

Verifies deterministic execution.

```typescript
const guard = createDeterminismGuard();
const report = guard.verify(run1, run2);

if (!report.is_deterministic) {
  console.error('Differences:', report.differences);
}

// Or use assertion helper
assertDeterministic(run1, run2); // Throws if not deterministic
```

## Determinism Guarantees

For two runs to produce identical results:

1. Same `seed` in RunContext
2. Same plan (id, version, steps)
3. Same adapters (with deterministic implementations)
4. Use `DeterministicClock` instead of `SystemClock`

```typescript
// Run 1
const ctx1 = createRunContext({ seed: 'test', clock: new DeterministicClock(0) });
const result1 = await executor.execute(plan, ctx1, adapters);

// Run 2
const ctx2 = createRunContext({ seed: 'test', clock: new DeterministicClock(0) });
const result2 = await executor.execute(plan, ctx2, adapters);

// Verify
assertDeterministic(result1, result2); // Passes
```

## License

UNLICENSED - Internal OMEGA Project use only.
