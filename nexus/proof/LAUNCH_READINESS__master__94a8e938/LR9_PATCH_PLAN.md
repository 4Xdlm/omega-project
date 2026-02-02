# LR9 — PATCH PLAN

**STATUS**: READ-ONLY AUDIT — No patches applied.

This document describes patches that COULD be applied pending WRITE MODE authorization.

---

## PATCH-001: τ_ID_GENERATOR Implementation

**Status**: NOT APPLIED (pending authorization)

### New File: `src/shared/id-generator.ts`

```typescript
/**
 * Seeded ID Generator
 * Replaces Math.random() for deterministic ID generation
 *
 * @invariant Same seed produces same ID sequence
 */

// Mulberry32 PRNG (fast, good distribution)
function mulberry32(seed: number): () => number {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function createIdGenerator(seed: number = 42) {
  const random = mulberry32(seed);

  return {
    next(prefix: string = 'id'): string {
      return `${prefix}_${Date.now()}_${random().toString(36).slice(2, 11)}`;
    },
    // For cases where timestamp shouldn't be included
    nextPure(prefix: string = 'id'): string {
      return `${prefix}_${random().toString(36).slice(2, 11)}`;
    }
  };
}

export const DEFAULT_ID_SEED = 42;
```

### Files to Modify

| File | Line | Current | Replacement |
|------|------|---------|-------------|
| `quarantine.ts` | 50 | `Math.random()` | `idGen.next('quarantine')` |
| `quarantine.ts` | 68 | `Math.random()` | `idGen.next('quarantine')` |
| `apps/omega-ui/src/core/analyzer.ts` | 20 | `Math.random()` | `idGen.next('ana')` |
| `apps/omega-ui/src/hooks/useOracle.ts` | 174 | `Math.random()` | `idGen.next('analysis')` |

---

## PATCH-002: Magic Number Documentation

**Status**: NOT APPLIED (pending authorization)

### File: `genesis-forge/judges/j1_emotion_binding.ts`

```typescript
// Line 278-280
// BEFORE:
const confidence = (consistencyFactor * 0.6 + lengthFactor * 0.4);

// AFTER:
/**
 * Confidence calculation weights
 * @rationale Consistency (60%) is weighted higher than length (40%)
 * because emotional consistency is a stronger signal of binding quality
 */
const τ_CONSISTENCY_WEIGHT = 0.6;
const τ_LENGTH_WEIGHT = 0.4;
const confidence = (consistencyFactor * τ_CONSISTENCY_WEIGHT + lengthFactor * τ_LENGTH_WEIGHT);
```

### File: `src/oracle/muse/physics/inertia.ts`

```typescript
// Line 69
// BEFORE:
const inertia = mass * (0.4 + 0.3 * durationFactor + 0.3 * intensityFactor);

// AFTER:
/**
 * Inertia calculation weights
 * @rationale Base inertia (40%) + duration contribution (30%) + intensity contribution (30%)
 * Sum = 1.0 when all factors are 1.0
 */
const τ_INERTIA_BASE = 0.4;
const τ_INERTIA_DURATION = 0.3;
const τ_INERTIA_INTENSITY = 0.3;
const inertia = mass * (τ_INERTIA_BASE + τ_INERTIA_DURATION * durationFactor + τ_INERTIA_INTENSITY * intensityFactor);
```

---

## PATCH-003: CLAUDE.md Path Fix

**Status**: NOT APPLIED (pending authorization)

```diff
# Line 24
- │   ├── sentinel/              # ROOT — FROZEN
+ │   ├── gateway/sentinel/      # ROOT — FROZEN (gateway layer)
```

---

## AUTHORIZATION REQUIRED

To apply these patches, issue command:

```
WRITE MODE: Apply PATCH-001, PATCH-002, PATCH-003
```

All patches will be applied with:
- Test verification
- Evidence pack generation
- Git commit with proof
