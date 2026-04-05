# P2 Analysis — Complete Documentation Index
**Date**: 2026-04-02
**Status**: Analysis complete (NO CODE MODIFICATIONS)
**Scope**: Sovereign-engine LLM call audit, Rosetta Bridge integration, SAGA_READY bottleneck

---

## DOCUMENTS

### 1. **P2_KEY_FINDINGS.md** (START HERE)
**Length**: 1 page
**Audience**: Francky, architecture review
**Contains**:
- Executive summary of all 5 key findings
- Call reduction roadmap (Phase A/B/C)
- Verdict on each goal (30→15 calls, 8%→30% SAGA_READY)
- Week-by-week recommendations

**Read this if**: You need quick summary of findings, priorities, and feasibility

---

### 2. **P2_INTERVENTION_ANALYSIS.md** (TECHNICAL DEEP-DIVE)
**Length**: 8 pages
**Audience**: Engineers, architects
**Contains**:
- Complete LLM call audit (30 calls identified, 60% compensatory)
- Rosetta Bridge status & activation requirements
- Scorer V3 analysis (100% CALC, macro-axes breakdown)
- SAGA_READY bottleneck (8% plateau, why)
- 5-call reductions (low-hanging fruit)
- 5-10 call medium-effort reductions
- 3-5 call aggressive reductions
- Detailed file-by-file breakdown with line numbers
- Intervention points checklist

**Read this if**: You need to understand the full picture, implement interventions, or review architecture decisions

---

### 3. **P2_EXACT_LOCATIONS.md** (REFERENCE GUIDE)
**Length**: 6 pages
**Audience**: Implementers, code reviewers
**Contains**:
- All 9 LLM call sites with exact file/line references
- judgeAesthetic breakdown (6 calls per invocation)
- judgeAestheticV3 breakdown (9-10 calls per invocation)
- Macro-axes sub-component mapping
- Rosetta Bridge implementation details
- Caching opportunity locations
- Loop early exit insertion point
- Scoring pipeline flow chart
- Quick reference table (intervention → file/line/savings/effort)

**Read this if**: You're implementing P2 changes or need to understand exact code locations

---

## QUICK STATS

```
Current state:
  - LLM calls per run: 30 (range: 25-35)
  - Productive calls: 10 (draft generation, patches)
  - Compensatory calls: 20 (rejudging prose)
  - SAGA_READY rate: 8%
  - Rosetta Bridge status: implemented, inactive

P2 targets:
  - LLM calls: 30 → 15 (50% reduction)
  - SAGA_READY rate: 8% → 30%+
  - Bridge activation: Required for full P2 success

Effort estimate:
  - Phase A (quick wins): 4 hours → -5 calls
  - Phase B (medium wins): 8 hours → -10 calls
  - Phase C (aggressive): conditional
  - Total Phase A+B: 12 hours → -15 calls (50% reduction)

Recommended approach:
  1. Activate Rosetta Bridge (2 hours) — prerequisite
  2. Implement cache + skip duel (3 hours) — Phase A
  3. Implement duel pre-filter (4 hours) — biggest win
  4. Loop tuning + early exit (2 hours) — Phase B completion
```

---

## KEY FINDINGS AT A GLANCE

| Finding | Impact | Confidence |
|---------|--------|-----------|
| **Rosetta Bridge is production-ready** | Can activate now, unlock P3 features | HIGH |
| **60% of calls are compensatory** | Prose rejudging after failed patches | HIGH |
| **SAGA_READY bottleneck is min_axis floor** | Not composite score, axis balance | HIGH |
| **Duel is 40 calls, mostly wasteful** | Pre-filter would save 20 calls | MEDIUM-HIGH |
| **Scorer V3 calls 9-10 LLM ops** | Not "pure CALC" as name suggests | HIGH |
| **Cache hit rate ~30-40%** | Prose unchanged after failed patches | MEDIUM |

---

## HOW TO USE THESE DOCS

### For Francky (Architecture decision):
1. Read **P2_KEY_FINDINGS.md** (5 min)
2. Make go/no-go decision on Bridge activation
3. Approve Phase A/B timeline

### For Engineers (Implementation):
1. Read **P2_KEY_FINDINGS.md** + **P2_INTERVENTION_ANALYSIS.md** sections 5-7
2. Reference **P2_EXACT_LOCATIONS.md** for file/line locations
3. Implement interventions in suggested order (cache → duel skip → pre-filter → loop tuning)

### For Code Review:
1. Use **P2_EXACT_LOCATIONS.md** table to validate changes hit correct files/lines
2. Check against telemetry requirements (Bridge logging, cache hit rate, etc.)
3. Verify no SEAL definition changes

---

## VALIDATION CHECKLIST

After implementation, verify:

- [ ] **Cache working**: Measure cache hit rate (target ≥30%)
- [ ] **Duel skip working**: Count skipped duels (target ≥30% of runs meet ≥88 threshold)
- [ ] **Pre-filter implemented**: Measure time savings vs accuracy trade-off
- [ ] **Loop early exit**: Count early exits, verify min 1-2 calls saved per exit
- [ ] **Bridge activated**: Telemetry shows Bridge directives injected, compliance rate logged
- [ ] **Call count reduced**: Measure total calls per run (target 18-20 after Phase B)
- [ ] **SAGA_READY improved**: Measure rate after Bridge (target ≥15%, stretch ≥25%)
- [ ] **No regressions**: Verify SEAL definition unchanged, no new failure modes

---

## NEXT STEPS

**Immediate (this week)**:
1. Get Francky approval on approach (which phase to prioritize)
2. Verify ROSETTA_BRIDGE_MATRIX.json location + loadability
3. Confirm V5 prompt-assembler.ts is production-ready (no TODOs)

**Short-term (week 1-2)**:
1. Activate Rosetta Bridge (env guard + fallback + telemetry)
2. Run 50-run sample, measure compliance rate
3. Implement prose-hash cache (quick win)

**Medium-term (week 2-4)**:
1. Implement duel skip + pre-filter (biggest savings)
2. Tune loop early exit threshold
3. Final telemetry + validation

---

## APPENDIX: FILES MODIFIED

**No modifications made** — analysis only.

Documents created:
- `/analysis/P2_KEY_FINDINGS.md`
- `/analysis/P2_INTERVENTION_ANALYSIS.md`
- `/analysis/P2_EXACT_LOCATIONS.md`
- `/analysis/README.md` (this file)

---

## QUESTIONS ANSWERED

**Q: Can we reach 15 LLM calls from 30?**
A: YES, through cache + duel pre-filter + loop tuning (Phase A+B = 12 hours work)

**Q: Is Rosetta Bridge ready to use?**
A: YES, just needs env activation + fallback + telemetry (2 hours work)

**Q: Why is SAGA_READY stuck at 8%?**
A: min_axis floor (85) requires axis balance, not just composite height. Real prose naturally imbalanced.

**Q: Will activating Bridge improve SAGA_READY?**
A: Indirectly YES — Bridge reduces loop iterations → fewer correction failures → more drafts survive to duel → better chance of balance.

**Q: Should we lower SAGA_READY thresholds?**
A: NO (yet) — preserve SEAL definition, solve via Bridge + axis-specific loop tuning instead.

---

**Analysis completed 2026-04-02. Ready for Francky review.**
