# OMEGA Memory System — Tiering Formulas

**Phase**: D4
**Standard**: NASA-Grade L4 / DO-178C
**Rule**: All formulas are PURE FUNCTIONS — no heuristics, no ML, no probabilistic logic.

---

## 1. Tier Definitions

| Tier | Description | TTL Symbol | Default Value |
|------|-------------|------------|---------------|
| HOT | Recently accessed/created | `TTL_HOT` | 1 hour (3,600,000 ms) |
| WARM | Moderate age | `TTL_WARM` | 24 hours (86,400,000 ms) |
| COLD | Old entries | `TTL_COLD` | 7 days (604,800,000 ms) |
| FROZEN | Sealed or very old | N/A | Infinite |

---

## 2. Classification Formula

```
FUNCTION classifyTier(entry, now, config) -> Tier:

    // Rule 1: Sealed entries are always FROZEN
    IF entry.meta.sealed == TRUE:
        RETURN FROZEN

    // Calculate age
    age = now - parse_timestamp(entry.ts_utc)

    // Rule 2: Age-based classification (pure)
    IF age < config.TTL_HOT:
        RETURN HOT
    ELSE IF age < config.TTL_WARM:
        RETURN WARM
    ELSE IF age < config.TTL_COLD:
        RETURN COLD
    ELSE:
        RETURN FROZEN
```

### Properties

- **Deterministic**: Same (entry, now, config) always produces same result.
- **Pure**: No side effects, no external state.
- **Total**: Defined for all valid inputs.

---

## 3. Promotion Formula

```
FUNCTION computePromotion(entry, currentTier) -> Tier:

    // Only automatic promotion: unsealed -> sealed
    IF entry.meta.sealed == TRUE AND currentTier != FROZEN:
        RETURN FROZEN

    // No other automatic promotions
    RETURN currentTier
```

### Properties

- **No heuristics**: No access-count-based promotion.
- **No ML**: No predictive models.
- **Pure**: Depends only on entry and current tier.

---

## 4. Eviction Formula

```
FUNCTION computeEviction(entry, currentTier, now, config) -> Tier:

    // FROZEN never evicts
    IF currentTier == FROZEN:
        RETURN FROZEN

    // Sealed entries become FROZEN
    IF entry.meta.sealed == TRUE:
        RETURN FROZEN

    // Calculate age
    age = now - parse_timestamp(entry.ts_utc)

    // Pure age-based eviction
    SWITCH currentTier:
        CASE HOT:
            IF age >= config.TTL_HOT:
                RETURN WARM
        CASE WARM:
            IF age >= config.TTL_WARM:
                RETURN COLD
        CASE COLD:
            IF age >= config.TTL_COLD:
                RETURN FROZEN

    RETURN currentTier
```

### Properties

- **Deterministic**: Same inputs always produce same output.
- **Pure**: No side effects.
- **No adaptation**: Does not learn from access patterns.

---

## 5. Tier Ordering

```
TIER_ORDER = [HOT, WARM, COLD, FROZEN]

FUNCTION getTierIndex(tier) -> Integer:
    RETURN indexOf(TIER_ORDER, tier)

FUNCTION isHotterThan(a, b) -> Boolean:
    RETURN getTierIndex(a) < getTierIndex(b)

FUNCTION isColderThan(a, b) -> Boolean:
    RETURN getTierIndex(a) > getTierIndex(b)

FUNCTION getColderTier(tier) -> Tier:
    idx = getTierIndex(tier)
    IF idx >= length(TIER_ORDER) - 1:
        RETURN FROZEN
    RETURN TIER_ORDER[idx + 1]

FUNCTION getHotterTier(tier) -> Tier:
    idx = getTierIndex(tier)
    IF idx <= 0:
        RETURN HOT
    RETURN TIER_ORDER[idx - 1]
```

---

## 6. Configuration Symbols

| Symbol | Type | Description | Default |
|--------|------|-------------|---------|
| `TTL_HOT` | Integer (ms) | Maximum age for HOT tier | 3,600,000 |
| `TTL_WARM` | Integer (ms) | Maximum age for WARM tier | 86,400,000 |
| `TTL_COLD` | Integer (ms) | Maximum age for COLD tier | 604,800,000 |

All TTL values are:
- Configurable at initialization time
- Immutable after initialization
- Positive integers only

---

## 7. Invariants

| ID | Statement |
|----|-----------|
| INV-D4-01 | Every promotion is a pure function of (entry, currentTier) |
| INV-D4-02 | Every eviction is a pure function of (entry, currentTier, now, config) |
| INV-D4-03 | Formulas are documented in this file |
| INV-D4-04 | No probabilistic, ML, or adaptive logic exists |
| INV-D4-05 | TTL values are configurable symbols only |

---

## 8. Proof of Purity

For a function `f(x1, x2, ..., xn)` to be pure:

1. **Determinism**: `f(a, b, c) == f(a, b, c)` for all calls with same arguments.
2. **No side effects**: Calling `f` does not modify any external state.
3. **Referential transparency**: Can replace `f(x)` with its result.

All tiering functions satisfy these properties:
- `classifyTier`: Pure function of (entry, now, config)
- `computePromotion`: Pure function of (entry, currentTier)
- `computeEviction`: Pure function of (entry, currentTier, now, config)
- All helper functions: Pure

**No exceptions.**

---

## 9. Signature

```
Document: memory_tiering_formula.md
Version: 1.0
Phase: D4
Standard: NASA-Grade L4 / DO-178C
Author: Claude Code
Architect: Francky
```
