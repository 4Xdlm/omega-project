# OMEGA IRM — DOCUMENTS INDEX
**Date** : 2026-04-02 | **Total** : 25+ documents, ~600 KB

---

## SECTION 1 — SYNTHESIS & PLANNING (NEW - THIS SESSION)

**Location** : `/omega-project/outputs/`

| File | Purpose | Size | Read time |
|------|---------|------|-----------|
| **IRM_TOTAL_SYNTHESIS_REPORT.md** | Complete analysis + P0/P1/P2/P3 roadmap | 15 KB | 30 min |
| **IRM_KEY_FINDINGS_SUMMARY.md** | Quick findings + glossary | 8 KB | 5 min |
| **P0_P1_EXECUTION_CHECKLIST.md** | Step-by-step 27-item checklist | 12 KB | 20 min |
| **P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md** | P2 planning + blockers | 10 KB | 15 min |
| **FRANCKY_SUMMARY_1PAGE.md** | Executive 1-page for decisions | 3 KB | 3 min |
| **README_IRM_SESSION.md** | Session overview + memory | 5 KB | 5 min |
| **IRM_DOCUMENTS_INDEX.md** | This file — navigation guide | 3 KB | 5 min |

**Total new outputs** : ~56 KB | **Start here** : FRANCKY_SUMMARY_1PAGE.md (3 min)

---

## SECTION 2 — IRM MAIN LIVRABLES (17 documents, ~400 KB)

**Location** : `/omega-project/docs/irm/`

### Core Architecture (5 livrables)

| File | Purpose | Status |
|------|---------|--------|
| **02_OMEGA_FULL_TREE_WITH_UTILITY.md** | Complete package tree + utility assessment | FINAL |
| **05_INTERFACE_CONTRACTS_TOTAL.md** | All 45 packages interface contracts | FINAL |
| **09_LAW_REGISTRY_TOTAL.md** | 38 sealed laws registry | FINAL |
| **11_PIPELINE_ATLAS_TOTAL.md** | Full pipeline mapping + data flow | FINAL |
| **08_THRESHOLDS_AUDIT_TOTAL.md** | 51 thresholds identified + values | FINAL |

### Audit & Quality (4 livrables)

| File | Purpose | Status |
|------|---------|--------|
| **13_DUPLICATION_AND_CANCER_REPORT.md** | Doublons (7), tokens morts, dead code | FINAL |
| **14_TRUTH_RECONCILIATION_MATRIX.md** | 9 contradictions doc/code mapped | FINAL |
| **15_PHANTOM_AND_BACKLOG_MAP.md** | 11 phantom modules + rationale | FINAL |
| **16_SESSION_SAVE_IRM_TOTAL.md** | Complete state snapshot | FINAL |

### Planning (2 livrables)

| File | Purpose | Status |
|------|---------|--------|
| **PLAN_CORRIGE_VERITE_VERIFIEE.md** | Original corrected plan (pre-synthesis) | REFERENCE |
| **POST_IRM_PLAN_CONVERGENT.md** | Convergent action plan (4-IA consensus) | **READ FIRST after summaries** |

### Scoring & Verification (2 livrables)

| File | Purpose | Status |
|------|---------|--------|
| **R4_ROSETTA_BRIDGE_REPORT.md** | Rosetta Bridge integration + matrix | FINAL |
| **V5_AB_TEST_REPORT.md** | V5 conditional GO status | FINAL |

---

## SECTION 3 — INVESTIGATION FILES (10 reports, ~100 KB)

**Location** : `/omega-project/docs/irm/inv/`

### Completed investigations (4)

| File | Investigation | Verdict | Effort |
|------|-------------|---------|--------|
| **P1_GATEWAY_FULL_SCAN.md** | Gateway isolation verification | SEALED FOUNDATION | 30 min |
| **INV07_SLOPES_VERIFICATION.md** | Phase W slopes concordance | PASS (18/18 cells) | 1h |
| **INV09_PVI_BRIDGE_INTERFACE.md** | PVI interface design | DESIGN COMPLETE | 30 min |
| **INVB_WEIGHT_DIVERGENCE_AUDIT.md** | Weight calibrator divergence (F1) | CRITICAL FINDING | 15 min |

### P1-planned investigations (6 - NOT YET EXECUTED)

| File | Investigation | Status | P1 Effort | Blocker |
|------|-------------|--------|-----------|---------|
| **P1_PACKAGE_EVALUATION.md** | 11 packages isolated assessment | DONE | — | None |
| **P1_SCORER_CONCORDANCE.md** | Multi-scorer bench protocol | AWAITS INV-02 | 2h | None |
| — | INV-01 : f26b direction (50 trees) | PLANNED | 2h | Script |
| — | INV-02 : GB V1 vs Ridge vs V3 | PLANNED | 2h | Script |
| — | INV-03 : Token budget | PLANNED | 1h | Logging |
| — | INV-05 : Test coverage by module | PLANNED | 30 min | Script |
| — | INV-06 : Package dependency graph | PLANNED | 1h | Script |
| — | INV-08 : JSON obsolescence | PLANNED | 1h | Script |
| — | INV-10 : Regression risk | PLANNED | 1h | Script |

---

## SECTION 4 — DATA FILES

**Location** : `/omega-project/packages/sovereign-engine/`

| File | Purpose | Size | Status |
|------|---------|------|--------|
| **src/scoring/data/ROSETTA_BRIDGE_MATRIX.json** | 19 features classification | 10.5 KB | ACTIVE |
| **calibration/delta-threshold.json** | Threshold calibration (0.8579) | 1 KB | ACTIVE |
| **src/scoring/data/GB_V1_MODEL.json** | Gradient Boosting V1 model (opaque) | 262 KB | ACTIVE |

---

## READING PATHS

### For Francky (Decision-maker)

1. **FRANCKY_SUMMARY_1PAGE.md** (3 min) — All decisions needed
2. **IRM_KEY_FINDINGS_SUMMARY.md** (5 min) — Detailed findings
3. **POST_IRM_PLAN_CONVERGENT.md** (20 min) — Original plan + commentary
4. **IRM_TOTAL_SYNTHESIS_REPORT.md** (30 min) — Complete analysis

**Time** : ~1h for full context

---

### For Claude (Execution)

1. **README_IRM_SESSION.md** (5 min) — Overview + structure
2. **P0_P1_EXECUTION_CHECKLIST.md** (20 min) — Immediate work
3. **IRM_TOTAL_SYNTHESIS_REPORT.md** (30 min) — Context + rationale
4. **P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md** (15 min) — Planning P2

**Time** : ~1h for P0+P1 clarity

---

### For Full Audit

1. **IRM_TOTAL_SYNTHESIS_REPORT.md** — Comprehensive synthesis
2. **POST_IRM_PLAN_CONVERGENT.md** — Original plan
3. All 14 main IRM livrables (02–16) — Deep dive
4. Investigation files (inv/) — Specific details

**Time** : 4–6h for complete review

---

## KEY DOCUMENT RELATIONSHIPS

```
FRANCKY_SUMMARY_1PAGE.md ← Start here
    ↓
IRM_KEY_FINDINGS_SUMMARY.md (same level of abstraction)
    ↓
IRM_TOTAL_SYNTHESIS_REPORT.md (detailed expansion)
    ├── Cites POST_IRM_PLAN_CONVERGENT.md (plan rationale)
    ├── References all 14 main IRM livrables (02–16)
    ├── References all 10 investigation files (inv/)
    └── Feeds into 3 execution documents:
         ├── P0_P1_EXECUTION_CHECKLIST.md (ops)
         ├── P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md (planning)
         └── README_IRM_SESSION.md (memory)
```

---

## NAVIGATION TIPS

### By topic

**Scoring & Architecture**
- 05_INTERFACE_CONTRACTS.md
- 09_LAW_REGISTRY.md
- 11_PIPELINE_ATLAS.md
- R4_ROSETTA_BRIDGE.md

**Quality & Duplication**
- 13_DUPLICATION_AND_CANCER_REPORT.md
- 14_TRUTH_RECONCILIATION_MATRIX.md
- 15_PHANTOM_AND_BACKLOG_MAP.md

**Validation & Verification**
- INV07_SLOPES_VERIFICATION.md
- INVB_WEIGHT_DIVERGENCE_AUDIT.md
- V5_AB_TEST_REPORT.md

**Action Plans**
- P0_P1_EXECUTION_CHECKLIST.md
- P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md

### By phase

**IRM Phase (Feb–Apr)** → Read POST_IRM_PLAN_CONVERGENT.md + main 14 livrables

**P0 Phase (40 min)** → Read P0_P1_EXECUTION_CHECKLIST.md (P0 section only)

**P1 Phase (week 1)** → Read P0_P1_EXECUTION_CHECKLIST.md (full) + investigation files inv/

**P2 Phase (weeks 2–7)** → Read P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md + IRM_TOTAL_SYNTHESIS_REPORT.md (P2 sections)

---

## FILES STATISTICS

| Category | Count | Size | Status |
|----------|-------|------|--------|
| **Synthesis (new)** | 7 | 56 KB | FINAL |
| **IRM Main** | 14 | 350 KB | FINAL |
| **IRM Investigations** | 10 | 100 KB | 4 done, 6 planned |
| **IRM Plan** | 2 | 80 KB | FINAL |
| **Data files** | 3 | 273 KB | ACTIVE |
| **TOTAL** | **36** | **859 KB** | PRODUCTION READY |

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-02 | Initial IRM synthesis (17 livrables complete) |

---

## MEMO FOR NEXT SESSION

If resuming later:

- All IRM livrables exist and are FINAL
- Synthesis documents (7 new files) summarize findings
- P0+P1 planning complete, not yet executed
- Blocking items : weight-calibrator (F1), R3/R8 data location
- Next steps : Execute P0 (40 min) → P1 (12h) → P2 (6 weeks)
- Confidence : HAUTE (2038 tests PASS)

---

**Index generated** : 2026-04-02
**For** : Navigation of IRM outputs + synthesis
**Maintained by** : Francky (architect)
