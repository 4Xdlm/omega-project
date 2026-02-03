# PERF_02_TOP_SLOW_TESTS.md

## Slowest Test Files (from run 1)

| # | File | Duration | Tests |
|---|------|----------|-------|
| 1 | tests/streaming_invariants.test.ts | 41.748s | 15 |
| 2 | tests/scale_invariants.test.ts | 24.166s | 14 |
| 3 | tests/progress_invariants.test.ts | 8.136s | 10 |
| 4 | tests/oracles/oracle_dist_manifest.test.ts | 7.792s | 6 |
| 5 | gateway/cli-runner/tests/commands/analyze.test.ts | 2.338s | 24 |

## Slowest Individual Tests
| Test | Duration |
|------|----------|
| 10 consecutive runs produce identical rootHash | 10.577s |
| handles large file without OOM (scale) | 8.659s |
| handles large file (50k lines) without OOM (streaming) | 5.360s |
| auto-stream produces same result as explicit --stream | 5.411s |
| different chunk sizes produce identical rootHash | 3.958s |
| should produce identical rootHash with different throttle values (10 runs) | 3.216s |
| streaming + concurrency produces same hash as sequential | 2.518s |
| should produce deterministic output (double run) | 2.444s |
| concurrency=1 produces same rootHash as concurrency=4 | 2.342s |

## Note
Slow tests are primarily determinism/stress invariants â€” they run multiple pipeline invocations to verify reproducibility. This is expected behavior.
