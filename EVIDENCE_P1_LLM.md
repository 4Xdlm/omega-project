# EVIDENCE PACK — Phase P.1-LLM

## Date
2026-02-10

## HEAD before
6021b5d5

## HEAD after
6e9dd6a5

## Scope
LLM provider adapter in genesis-planner

## Files created
- packages/genesis-planner/src/providers/types.ts
- packages/genesis-planner/src/providers/mock-provider.ts
- packages/genesis-planner/src/providers/llm-provider.ts
- packages/genesis-planner/src/providers/cache-provider.ts
- packages/genesis-planner/src/providers/factory.ts
- packages/genesis-planner/src/providers/index.ts
- packages/genesis-planner/tests/providers/provider.test.ts
- docs/phase-p1-llm/GOLDEN_RUN_REPORT.md

## Files modified
- packages/genesis-planner/src/planner.ts (provider injection — mock mode unchanged)
- packages/genesis-planner/src/index.ts (provider exports added)

## Other packages modified
NONE

## Tests
- genesis-planner before: 154 tests
- genesis-planner after: 176 tests (154 existing + 22 new)
- Global (9 main packages + root) before: 2377 tests
- Global (9 main packages + root) after: 2399 tests (2377 - 154 + 176)
- Regressions: 0
- Byte-identical test: PASS (determinism.test.ts + provider integration tests)

## Determinism Model
- Mock: byte-identical to pre-P.1-LLM (same code path, no serialization)
- Cache: byte-identical to source LLM run (tested with synthetic entries)
- LLM: non-deterministic per call, deterministic via cache replay

## Provider Modes
| Mode | Env Var | Behavior | Deterministic |
|------|---------|----------|---------------|
| mock | (default) | Uses existing generators directly | YES (byte-identical) |
| llm | OMEGA_PROVIDER_MODE=llm + ANTHROPIC_API_KEY | Calls Claude API via execSync | NO (per call) |
| cache | OMEGA_PROVIDER_MODE=cache + OMEGA_CACHE_DIR | Replays stored responses | YES (via cache) |

## Golden Run
Status: SKIP (no ANTHROPIC_API_KEY available)
See: docs/phase-p1-llm/GOLDEN_RUN_REPORT.md

## Invariants

| Invariant | Description | Status |
|-----------|-------------|--------|
| INV-P1-01 | Only genesis-planner modified (code) | PASS |
| INV-P1-02 | Mode mock = byte-identical to pre-P.1-LLM | PASS |
| INV-P1-03 | 154 existing tests PASS | PASS |
| INV-P1-04 | Zero runtime dependencies added | PASS |
| INV-P1-05 | Provider mode configurable by env var | PASS |
| INV-P1-06 | Every LLM response is hashed (SHA-256) | PASS |
| INV-P1-07 | Cache replay = byte-identical to source | PASS (synthetic) |
| INV-P1-08 | No LLM call in mock/cache mode | PASS |

8/8 invariants PASS

## Verdict
PASS
