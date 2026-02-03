# PERF_01_TIMINGS.md

## Test Timings

### Baseline (Full Suite)
| Metric | Run 1 | Run 2 |
|--------|-------|-------|
| Total Duration | 42.14s | 42.91s |
| Transform | 16.51s | 19.27s |
| Import | 28.60s | 31.43s |
| Tests | 103.44s | 107.77s |
| Test Files | 202 | 202 |
| Tests | 4941 | 4941 |

### Decision-Engine
| Metric | Run 1 | Run 2 |
|--------|-------|-------|
| Total Duration | 657ms | 657ms |
| Transform | 1.80s | 1.84s |
| Import | 2.71s | 2.67s |
| Tests | 267ms | 272ms |

### Build
- `dist\runner\main.js`: 31.2kb in 10ms
- `dist\auditpack\index.js`: 13.5kb in 5ms
