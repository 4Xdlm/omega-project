# PERF_03_SCALE_RISKS.md

## Scale Risk Assessment

### Current Metrics
- Repo size (excl. node_modules/dist/.git): ~98.25 MB
- File count: 4580 files
- Test count: 4941 + 593 = 5534 tests
- Test duration: ~42s (baseline) + ~0.66s (decision-engine)
- Build time: 15ms total

### x10 Projection
| Metric | Current | x10 | Risk |
|--------|---------|-----|------|
| Files | 4580 | 45,800 | MEDIUM: SHA256 manifest generation would scale linearly |
| Tests | 5534 | 55,340 | HIGH: ~420s baseline test run (7 min) |
| Repo size | 98 MB | 980 MB | LOW: git/esbuild handle well |
| Build | 15ms | ~150ms | LOW |

### x100 Projection
| Metric | Current | x100 | Risk |
|--------|---------|------|------|
| Files | 4580 | 458,000 | HIGH: SHA256 manifest becomes expensive (~hours) |
| Tests | 5534 | 553,400 | CRITICAL: ~70min baseline test run |
| Repo size | 98 MB | 9.8 GB | HIGH: git clone/operations slow |

### Identified Bottlenecks
1. **SHA256 manifest**: O(n) file count, disk I/O bound
2. **Streaming invariant tests**: Each test invokes pipeline subprocess multiple times
3. **Oracle dist manifest**: Depends on dist/ state, fragile to concurrent modifications
