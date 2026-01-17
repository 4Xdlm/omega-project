# PERFORMANCE_REPORT.md
# Phase 5.2 - Performance Optimization

**Date**: 2026-01-17
**Mode**: OPTIMISATION AUTORISÉE — UNIQUEMENT SI MESURÉE
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## 1. SUMMARY

| Metric | Value |
|--------|-------|
| Targets optimized | 1 (tokenize) |
| Files modified | 1 |
| Gain achieved | 16.8% (tokenize long) |
| Tests | 1389 PASS |
| Exports changed | 0 |
| FROZEN touched | 0 |

---

## 2. OPTIMIZATION TARGETS

### Target: SearchEngine.tokenize()

**File**: `packages/search/src/engine.ts`

**Optimizations Applied**:

1. **Stop words lookup: O(n) → O(1)**
   - BEFORE: `!this.config.stopWords.includes(t)` — Array.includes() is O(n)
   - AFTER: `!this.stopWordsSet.has(t)` — Set.has() is O(1)
   - Added `stopWordsSet: Set<string>` field initialized from config

2. **Stemming suffixes: allocation per call → module constant**
   - BEFORE: `const suffixes = ['ing', 'ed', ...]` created on every stem() call
   - AFTER: `STEM_SUFFIXES` module-level constant, zero allocations per call

---

## 3. BENCHMARK RESULTS

### BEFORE (Baseline)

| Benchmark | Iterations | Mean (ms) | P95 (ms) |
|-----------|------------|-----------|----------|
| tokenize(short) | 10000 | 0.0014 | 0.0022 |
| tokenize(medium) | 5000 | 0.0082 | 0.0156 |
| tokenize(long) | 1000 | 0.0864 | 0.0914 |

### AFTER (Optimized)

| Benchmark | Iterations | Mean (ms) | P95 (ms) |
|-----------|------------|-----------|----------|
| tokenize(short) | 10000 | 0.0013 | 0.0023 |
| tokenize(medium) | 5000 | 0.0074 | 0.0145 |
| tokenize(long) | 1000 | 0.0719 | 0.0765 |

### GAINS

| Benchmark | Before | After | Gain | Decision |
|-----------|--------|-------|------|----------|
| tokenize(short) | 0.0014ms | 0.0013ms | 7.1% | < 10% threshold |
| tokenize(medium) | 0.0082ms | 0.0074ms | 9.8% | borderline (~10%) |
| tokenize(long) | 0.0864ms | 0.0719ms | **16.8%** | ✅ KEEP |

**Decision**: KEEP optimization — tokenize(long) exceeds 10% threshold.

---

## 4. CODE CHANGES

### File: packages/search/src/engine.ts

**Change 1**: Add module-level constant for stemming suffixes

```typescript
// ADDED at line 30
const STEM_SUFFIXES = ['ing', 'ed', 'ly', 'es', 's', 'ment', 'ness', 'tion', 'able', 'ible'] as const;
```

**Change 2**: Add stopWordsSet field

```typescript
// ADDED to SearchEngine class
private stopWordsSet: Set<string>;

// In constructor:
this.stopWordsSet = new Set(this.config.stopWords);
```

**Change 3**: Use Set.has() instead of Array.includes()

```typescript
// BEFORE (line 307)
!this.config.stopWords.includes(t)

// AFTER
!this.stopWordsSet.has(t)
```

**Change 4**: Use module constant in stem()

```typescript
// BEFORE
const suffixes = ['ing', 'ed', 'ly', 'es', 's', 'ment', 'ness', 'tion', 'able', 'ible'];

// AFTER
for (const suffix of STEM_SUFFIXES) {
```

---

## 5. TEST RESULTS

```
Test Files  49 passed (49)
Tests       1389 passed (1389)
Start at    19:50:23
Duration    48.66s
```

Breakdown:
- Original: 1377
- Benchmark: 12

---

## 6. TRACE MATRIX

| REQ ID | Requirement | Status |
|--------|-------------|--------|
| R-01 | Baseline écrite | PASS (PERF_BASELINE.md) |
| R-02 | Gain ≥ 10% sur ≥1 cible | PASS (16.8% on tokenize long) |
| R-03 | ≤10 fichiers modifiés | PASS (1) |
| R-04 | Exports INCHANGÉS | PASS (diff vide) |
| R-05 | Tests pass | PASS (1389) |
| R-06 | FROZEN untouched | PASS (diff 0) |

---

## 7. GUARD RAILS COMPLIANCE

| Guard Rail | Status |
|------------|--------|
| No new dependencies | PASS |
| No FROZEN modules touched | PASS |
| No API changes | PASS |
| No validation removal | PASS |
| ≤10 files modified | PASS (1) |
| Gain ≥ 10% measured | PASS (16.8%) |

---

## 8. TECHNICAL ANALYSIS

### Why the optimization works

1. **Set vs Array lookup complexity**:
   - `Array.includes()`: O(n) where n = stopWords.length (~40)
   - `Set.has()`: O(1) average case (hash table lookup)
   - For each token in text, this saves ~40 comparisons

2. **Scaling behavior**:
   - Short text: ~9 tokens → 9 × O(1) vs 9 × O(40) = minimal visible gain
   - Long text: ~1500 tokens → 1500 × O(1) vs 1500 × O(40) = significant gain
   - Observed: gain scales with input size as predicted

3. **Memory tradeoff**:
   - Added: 1 Set (~40 entries, ~2KB)
   - Removed: 1 array allocation per stem() call
   - Net: negligible memory increase, significant CPU reduction

---

**Standard**: NASA-Grade L4 / DO-178C Level A
