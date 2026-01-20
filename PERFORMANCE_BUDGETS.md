# Performance Budgets — OMEGA v5.4.3

**Established**: 2026-01-20
**Baseline**: v5.4.1-benchmarks
**Standard**: NASA-Grade L4

---

## Principles

1. **Budgets are targets**, not hard limits
2. **Tests measure** but don't fail on timing
3. **Track trends** over time
4. **Document decisions** when budgets change

---

## Operation Budgets

### Atlas Operations

| Operation | Target (p95) | Baseline (p95) | Status |
|-----------|--------------|----------------|--------|
| Insert 1000 items | <500ms | 0.43ms | ✅ EXCELLENT |
| Query 10k full scan | <100ms | 0.22ms | ✅ EXCELLENT |
| Query 10k with filter | <100ms | 0.42ms | ✅ EXCELLENT |
| Query 10k with index | <100ms | 0.53ms | ✅ EXCELLENT |
| Get by ID (10k store) | <10ms | 0.00ms | ✅ EXCELLENT |

### Raw Storage Operations

| Operation | Target (p95) | Baseline (p95) | Status |
|-----------|--------------|----------------|--------|
| Store 1000 small items | <200ms | 3.44ms | ✅ EXCELLENT |
| Retrieve 1000 items | <150ms | 2.88ms | ✅ EXCELLENT |
| Store 1 MB file | <100ms | 0.48ms | ✅ EXCELLENT |
| Store 10 MB file | <1000ms | 5.35ms | ✅ EXCELLENT |
| List 1000 items | <50ms | 0.02ms | ✅ EXCELLENT |
| Store 1 MB compressed | <500ms | 4.54ms | ✅ EXCELLENT |

### Proof Utils Operations

| Operation | Target (p95) | Baseline (p95) | Status |
|-----------|--------------|----------------|--------|
| Build manifest 100 files | <300ms | 3.33ms | ✅ EXCELLENT |
| Verify manifest 100 files | <200ms | 5.06ms | ✅ EXCELLENT |
| Build manifest 10 large (1MB) | <500ms | 4.97ms | ✅ EXCELLENT |
| Verify manifest 10 large | <500ms | 6.66ms | ✅ EXCELLENT |

---

## Memory Budgets

| Component | Target | Estimated | Status |
|-----------|--------|-----------|--------|
| Atlas 10k items | <50 MB | ~10 MB | ✅ |
| Raw 1000 items | <20 MB | ~5 MB | ✅ |
| Proof manifest 100 files | <10 MB | ~2 MB | ✅ |

---

## Budget Headroom

Current performance shows significant headroom:

| Category | Average % of Budget Used |
|----------|--------------------------|
| Atlas | <1% |
| Raw Storage | <5% |
| Proof Utils | <5% |

This headroom allows for:
- Feature additions without performance impact
- Reasonable growth in data sizes
- Safety margin for different environments

---

## Review Schedule

| Review Type | Frequency | Actions |
|-------------|-----------|---------|
| Automated tracking | Per benchmark run | Log to results |
| Manual review | Weekly | Check trends |
| Budget adjustment | Monthly | Update targets if needed |
| Major review | Per release | Document changes |

---

## Budget Violation Process

If an operation exceeds its budget:

### 1. Investigate

```bash
# Run benchmarks
npm run bench

# Compare with baseline
npm run perf:track
```

### 2. Classify

| Classification | Criteria | Action |
|----------------|----------|--------|
| Regression | New code caused slowdown | Fix or revert |
| Growth | Data size increased | Adjust budget or optimize |
| Environment | Hardware/runtime difference | Document |
| False positive | Measurement noise | Re-run, verify |

### 3. Decide

- **Fix**: Optimize the code
- **Adjust**: Update budget with justification
- **Accept**: Document as known behavior

### 4. Document

Update this file with:
- Date of change
- Reason for change
- New budget value

---

## Tracking Commands

```bash
# Run benchmarks
npm run bench

# Track against budgets
npm run perf:track

# Save new baseline
npm run bench:baseline
```

---

## Historical Budgets

| Version | Date | Changes |
|---------|------|---------|
| v5.4.3 | 2026-01-20 | Initial budgets established |

---

## Notes

### Why Conservative Targets?

Targets are set conservatively (10-100x baseline) to:
1. Allow for environmental variance
2. Support growth without constant adjustment
3. Catch only significant regressions

### Performance vs. Correctness

**Correctness always wins**. If a feature requires more time:
1. Implement correctly first
2. Measure impact
3. Optimize if needed
4. Adjust budget if optimization not feasible

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Claude Opus 4.5 | Initial performance budgets |
