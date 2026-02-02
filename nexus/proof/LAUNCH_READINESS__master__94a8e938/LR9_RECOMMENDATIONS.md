# LR9 — RECOMMENDATIONS (Prioritized)

## PRIORITY MATRIX

| Priority | Findings | Action Window |
|----------|----------|---------------|
| P1 (High) | 0 | Immediate |
| P2 (Medium) | 5 | Next sprint |
| P3 (Low) | 8 | Backlog |

---

## P2 — MEDIUM PRIORITY (Next Sprint)

### REC-001: Implement τ_ID_GENERATOR

**Findings**: FND-001, FND-002, FND-003
**Effort**: 2-4 hours

**Action**:
1. Create `src/shared/id-generator.ts`
2. Implement seeded PRNG (e.g., `mulberry32`)
3. Replace Math.random() in:
   - `quarantine.ts:50,68`
   - `apps/omega-ui/src/core/analyzer.ts:20`
   - `apps/omega-ui/src/hooks/useOracle.ts:174`

**Validation**:
```typescript
// Two calls with same seed produce same ID sequence
const gen1 = createIdGenerator(42);
const gen2 = createIdGenerator(42);
expect(gen1.next()).toBe(gen2.next());
```

### REC-002: Document Magic Numbers (Judges)

**Findings**: FND-004, FND-005
**Effort**: 1-2 hours

**Action**:
1. Extract to constants with τ_ prefix
2. Add rationale comments
3. Update LR6 audit

**Files**:
- `genesis-forge/judges/j1_emotion_binding.ts`
- `genesis-forge/core/emotion_bridge.ts`
- `src/oracle/muse/physics/inertia.ts`

---

## P3 — LOW PRIORITY (Backlog)

### REC-003: Update Nested Vitest

**Finding**: FND-006
**Effort**: 30 minutes

**Action**:
```powershell
cd packages/canon-kernel && npm update vitest
cd packages/emotion-gate && npm update vitest
cd packages/sentinel-judge && npm update vitest
cd packages/truth-gate && npm update vitest
```

### REC-004: Fix CLAUDE.md Path Reference

**Finding**: FND-007
**Effort**: 5 minutes

**Action**: Change line 24 from `packages/sentinel/` to `gateway/sentinel/`

### REC-005: Add UI Tests to Suite

**Finding**: FND-008
**Effort**: 30 minutes

**Action**: Update `vitest.config.ts` to include `apps/omega-ui/tests/`

### REC-006: Document Legacy Folders

**Finding**: FND-009
**Effort**: 30 minutes

**Action**: Add "Legacy Code" section to CONTRIBUTING.md

---

## NO ACTION REQUIRED

| Finding | Reason |
|---------|--------|
| FND-010 | Metadata timestamps acceptable |
| FND-011 | UI-only, cosmetic |
| FND-012 | Test code only |
| FND-013 | Timing metrics, no output impact |

---

## IMPLEMENTATION ORDER

1. **REC-001** (τ_ID_GENERATOR) — Highest value, improves determinism
2. **REC-002** (Document magic numbers) — Improves traceability
3. **REC-004** (Fix CLAUDE.md) — Quick fix
4. **REC-003** (Update vitest) — Security hygiene
5. **REC-005** (UI tests) — Improves coverage
6. **REC-006** (Document legacy) — Documentation hygiene
