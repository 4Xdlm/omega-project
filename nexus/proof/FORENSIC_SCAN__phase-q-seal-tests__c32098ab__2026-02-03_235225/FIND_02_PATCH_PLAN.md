# FIND_02_PATCH_PLAN.md

## Sequenced Patch Plan

### Phase 1: Foundation (no dependencies)
1. **Fix oracle dist manifest test** (P1-002)
   - Run `npm run build` before test, or update baseline hash
   - Risk: LOW
   - Files: tests/oracles/oracle_dist_manifest.test.ts, baseline file

2. **Configure root typecheck** (P2-002)
   - Add `tsconfig.json` at root with project references
   - Update `npm run typecheck` to invoke `tsc --noEmit`
   - Risk: MEDIUM (may reveal hidden type errors)

### Phase 2: Type Safety (depends on Phase 1.2)
3. **Migrate Vitest poolOptions** (P2-003)
   - Update `vitest.config.ts` in decision-engine
   - Risk: LOW

4. **Audit @ts-ignore usage** (P2-001)
   - Review 4 occurrences, replace with proper types
   - Risk: LOW

5. **Begin any-type reduction** (P1-001)
   - Start with public API exports
   - Batch: 20-30 files per PR
   - Risk: MEDIUM

### Phase 3: Maintenance
6. **Resolve TODO** (P3-001)
7. **Fix fs.rmdir deprecation** (P3-002)
