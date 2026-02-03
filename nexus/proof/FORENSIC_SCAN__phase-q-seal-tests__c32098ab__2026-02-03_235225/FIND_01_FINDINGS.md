# FIND_01_FINDINGS.md

## Findings Classification

### BLOCKING (0)
None identified. All tests pass on first run, build succeeds, 0 npm vulnerabilities.

### P1 â€” High Priority (2)

**P1-001**: `any` type usage (471 occurrences in source)
- **Evidence**: QA_05_TODO_ANY_TSIGNORE.md
- **Impact**: Type safety degradation, potential runtime errors
- **Location**: Across multiple source files
- **Recommendation**: Gradual replacement with proper types, prioritize public API surfaces

**P1-002**: Oracle dist manifest non-determinism after build
- **Evidence**: DET_02_REPEATABILITY.md, run 2 failure
- **Impact**: `oracle_dist_manifest.test.ts` fails when dist/ changes between test runs
- **Root cause**: Test reads dist/ hashes which change after `npm run build`
- **Recommendation**: Pin baseline after build, or make test build-aware

### P2 â€” Medium Priority (3)

**P2-001**: `@ts-ignore` / `@ts-expect-error` usage (4 occurrences)
- **Evidence**: QA_05_TODO_ANY_TSIGNORE.md
- **Impact**: Suppressed type errors may hide real issues
- **Recommendation**: Audit each occurrence, replace with proper typing

**P2-002**: Typecheck is a no-op stub
- **Evidence**: QA_04_TYPECHECK.md
- **Impact**: No static type verification at root level
- **Recommendation**: Configure `tsc --noEmit` for workspace-level typecheck

**P2-003**: Vitest deprecated `test.poolOptions` warning
- **Evidence**: Decision-engine test output
- **Impact**: Will break on Vitest upgrade
- **Recommendation**: Migrate to top-level pool options per Vitest 4 migration guide

### P3 â€” Low Priority (2)

**P3-001**: 1 TODO comment in source
- **Evidence**: QA_05_TODO_ANY_TSIGNORE.md
- **Impact**: Unfinished work marker
- **Recommendation**: Resolve or convert to tracked issue

**P3-002**: Node.js DEP0147 deprecation warning (fs.rmdir recursive)
- **Evidence**: Baseline test output
- **Impact**: Will log warning in future Node.js versions
- **Recommendation**: Replace with fs.rm in affected code
