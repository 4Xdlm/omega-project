# ADR-0003: Determinism Strategy

**Status**: ACCEPTED
**Date**: 2026-01-19
**Decision Makers**: Francky (Architect)

## Context

NASA-Grade L4 / DO-178C Level A requires deterministic behavior:
- Same inputs must produce same outputs
- No hidden state dependencies
- Reproducible test results

## Decision

**Inject all non-deterministic dependencies**

## Sources of Non-Determinism

| Source | Strategy |
|--------|----------|
| Current time | Clock injection |
| Random numbers | RNG injection with seed |
| File system order | Explicit sorting |
| Map/Set iteration | Sorted key iteration |
| Async timing | Controlled execution |
| Platform differences | Normalization |

## Implementation

### Clock Injection

```typescript
// Interface
export interface Clock {
  now(): number;
}

// Production
export const systemClock: Clock = {
  now: () => Date.now()
};

// Test
export const mockClock = (fixedTime: number): Clock => ({
  now: () => fixedTime
});

// Usage
function createEntry(clock: Clock = systemClock) {
  return { timestamp: clock.now() };
}
```

### RNG Injection

```typescript
// Interface
export interface RNG {
  random(): number;
  randomInt(min: number, max: number): number;
}

// Seeded implementation
export function seededRNG(seed: number): RNG {
  let state = seed;
  return {
    random() {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    },
    randomInt(min, max) {
      return Math.floor(this.random() * (max - min + 1)) + min;
    }
  };
}
```

### Sorted Iteration

```typescript
// Always sort when order matters
function processEntries(entries: Map<string, unknown>) {
  const sortedKeys = [...entries.keys()].sort();
  for (const key of sortedKeys) {
    process(entries.get(key));
  }
}

// Stable sort for arrays
function stableSort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {
  return [...arr]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => compare(a.item, b.item) || a.index - b.index)
    .map(({ item }) => item);
}
```

### Path Normalization

```typescript
// Normalize path separators
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

// Normalize line endings
function normalizeEOL(text: string): string {
  return text.replace(/\r\n/g, '\n');
}
```

## Testing Determinism

```typescript
describe('determinism', () => {
  it('produces identical output across 100 runs', () => {
    const clock = mockClock(1000000000);
    const rng = seededRNG(42);

    const results = Array.from({ length: 100 }, () =>
      process(input, { clock, rng })
    );

    const first = JSON.stringify(results[0]);
    for (const result of results) {
      expect(JSON.stringify(result)).toBe(first);
    }
  });
});
```

## Rationale

1. **Dependency Injection**
   - Makes tests deterministic
   - Enables replay debugging
   - Clear contract for side effects

2. **Explicit Over Implicit**
   - No global state
   - All dependencies visible in signatures
   - Easy to trace data flow

3. **Default to Production**
   - Injected deps have sensible defaults
   - No change to production API surface
   - Tests opt-in to control

## Consequences

### Positive
- ✓ 100% reproducible tests
- ✓ Easy debugging
- ✓ NASA-Grade compliance
- ✓ Time-travel debugging possible

### Negative
- More function parameters
- Some runtime overhead (minimal)

### Mitigation
- Use default parameters
- Interface types for IDE support

## Rules

1. **Never use Date.now() directly**
   - Always inject clock

2. **Never use Math.random() directly**
   - Always inject RNG with seed

3. **Always sort collections before iteration**
   - If order affects output

4. **Normalize platform differences**
   - Paths, line endings, etc.

## References

- R0.5: Déterminisme requirement
- DO-178C determinism requirements
