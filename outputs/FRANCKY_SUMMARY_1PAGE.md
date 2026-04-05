# OMEGA IRM — 1-PAGE SUMMARY FOR FRANCKY
**Date** : 2026-04-02 | **Status** : Ready for P0 execution

---

## THE STATE

**IRM Complete** (17 livrables, 2038 tests PASS). Diagnostic: **couplage S1→S2 insuffisant (6/10)**.

---

## 3 CRITICAL FINDINGS → ACTION BEFORE P2

| # | Finding | P0 Action | Effort | Risk |
|----|---------|-----------|--------|------|
| F1 | weight-calibrator.ts poids divergents (ECC 0.33 vs 0.30) | Align to config.ts | 5 min | HAUTE si ignoré |
| F2 | SAGA_READY 92.0 hardcodé 3 emplacements | Unify via core/thresholds.ts | 5 min | MOYENNE |
| F3 | avg_sent_target = 18 vs BB-02 plancher = 35 | Validate >= 35 | 5 min | BASSE |

**PLUS 7 minor fixes + document 2 ADRs (30 min total).**

**P0 TOTAL : 40 min**. npm test must stay GREEN.

---

## P1 PLAN (12h, week 1)

- **Code cleanup** (1.5h) : migrate s-score, archive dead code (polish, v2, compat, ollama)
- **10 investigations** (10.5h, can parallelize) : INV-01 to INV-10 (f26b audit, scorer bench, token budget, etc.)
- **2 outputs** (1h) : COST_MODEL, REGRESSION_RISK JSON

**DEADLINE : End of week 1 (by 2026-04-09)**. Prerequisite for P2 start.

---

## P2 PLAN (6 weeks, starting week 2)

### P2-01 (Weeks 2–3) : Scorer V3 reconstruction
- **Depends on** : P0 complete, R3/R8 data located
- **Output** : V3 validation (Spearman >= 0.75)
- **Effort** : ~5h code + validation

### P2-02 (Weeks 4–5) : Rosetta Bridge activation
- **Depends on** : P2-01 R4-e PASS
- **Output** : A/B bench V4 vs V5 (10 runs each)
- **Effort** : ~4h code + bench

### P2-03 (Weeks 6–7) : Reduce LLM calls
- **Depends on** : P2-02 R5-e PASS
- **Output** : Cost model v2 (target 15 calls/run, -50%)
- **Effort** : ~3h tuning

---

## ROSETTA BRIDGE STATUS ✓

Already coded, 7/7 tests PASS, ready for activation. 19 features classified:
- **PILOTABLE** (7) : f24e_contrast, f15b_redundancy, f16a_bigram + 4 others (100% compliance)
- **ILLUSION** (7) : Don't inject (LLM claims understanding but delta=0)
- **INDIRECT** (3) : Via L37 only
- **CONTOURNABLE** (1) : Post-processing

**Current mode** : SHADOW. **P2-02 activates** PROMPT_DIRECT.

---

## PHASE W VERIFICATION ✓

18/18 slopes cells CONCORDANT between code & docs. Slopes, thresholds, archetype multipliers all validated. **NO ACTION.**

---

## GATEWAY ISOLATION ✓

34 files + 16 tests. ZERO coupling to sovereign-engine. ZERO external consumers. **Sealed foundation for P3 World Model.** NO ACTION.

---

## QUESTIONS FOR YOU

Before P2 start (week 2):

1. **R3/R8 data** : Where are Phase R3 coefficients + R8 CIF+lambda? (Blocking P2-01 R4-b/c)
2. **Feature mapping** : Is 7/42 (17%) sufficient, or all 42 before Rosetta activation?
3. **Rosetta strategy** : Option A (direct inject when ready) or Option B (10-run A/B first)?
4. **weight-calibrator F1** : Is P0-09 alignment non-breaking, or need versioning?

---

## TIMELINE

```
Week 1 (by 2026-04-09) : P0 (40 min) + P1 code (1.5h) + P1 inv (10.5h, parallel)
        ↓ npm test GREEN
Weeks 2–7 (by 2026-05-23) : P2-01/02/03 (6 weeks)
        ↓ Cost -50%, SAGA_READY >= 30%
Week 8+ : P3 (Inverse Engine, V5, ChromaDB Loom)
```

---

## ARTEFACTS PRODUCED (THIS SESSION)

- **IRM_TOTAL_SYNTHESIS_REPORT.md** : Full analysis + P0/P1/P2/P3 plan
- **IRM_KEY_FINDINGS_SUMMARY.md** : Quick ref (10 findings, glossary)
- **P0_P1_EXECUTION_CHECKLIST.md** : Step-by-step ops guide (27 items)
- **P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md** : P2 planning, blockers, decisions
- **README_IRM_SESSION.md** : Session overview + memory

**All in `/omega-project/outputs/`**

---

## NEXT IMMEDIATE ACTION

**Execute P0 today** (40 min):
1. P0-01 : Unify SAGA_READY threshold
2. P0-02 : Unify SEAL_FLOOR
3. P0-03 to P0-08 : Archive, document, validate
4. **P0-09 : ALIGN weight-calibrator (critical F1)**
5. P0-10 : Archive hybrid-provider

Then `npm test` → GREEN.

Then start P1 code cleanup (1.5h) + parallel investigations.

---

**Confidence** : HAUTE (2038 tests PASS, complete audit)
**Risk** : BASSE (P0 is cleanup only, 0 logic changes except weight alignment)
**Recommendation** : Start P0 immediately, P2 unblocked if R3/R8 data available by week 2.

---

*For detailed context, see full synthesis documents in outputs/.*
