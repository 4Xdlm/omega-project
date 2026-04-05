# README — IRM INVESTIGATION SESSION
**Date** : 2026-04-02 | **Duration** : IRM completion review
**Output Location** : `/omega-project/outputs/`

---

## SESSION OBJECTIVE

Complete review of all IRM-generated investigations (17 livrables, 556 KB) and synthesize findings into actionable P0/P1/P2/P3 plan.

**Input** : IRM livrables (Feb 3–Apr 2)
**Output** : 4 synthesis documents + execution checklists
**Audience** : Francky (decisions), Claude (execution)

---

## DOCUMENTS GENERATED (This Session)

### 1. **IRM_TOTAL_SYNTHESIS_REPORT.md** (Main Deliverable)
**Purpose** : Complete synthesis of all 17 IRM livrables + 4-IA convergence diagnosis.

**Sections** :
- Executive summary (state of IRM)
- 10 critical/important findings (F1–F10)
- Complete P0+P1+P2+P3 plan with effort/risk
- Metrics + success criteria
- Artefacts produced
- Recommendations

**Read this if** : You need one document covering everything.

### 2. **IRM_KEY_FINDINGS_SUMMARY.md** (Quick Reference)
**Purpose** : Condensed findings in priority order with quick glossary.

**Sections** :
- 🔴 3 critical findings (blocking P2)
- 🟡 6 important findings (P1 investigations)
- 🟢 3 validated findings (no action)
- Metrics diagnostics (S1/S2 quality)
- Contradictions resolved (9 total)
- Open questions for Francky

**Read this if** : You need key points fast (<5 min) or memory for next session.

### 3. **P0_P1_EXECUTION_CHECKLIST.md** (Operational Roadmap)
**Purpose** : Step-by-step checklist for P0 (40 min) and P1 (12h) execution.

**Sections** :
- P0 : 10 items with exact file locations, bash commands, test steps
- P1 : 17 items (5 code cleanup + 10 investigations + 2 outputs)
- Validation checkpoints (npm test GREEN gates)
- Git commit guidelines
- Estimation (13h serial, 2–3h wall-clock if parallel)

**Read this if** : You're executing P0 or P1 work.

### 4. **P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md** (Planning)
**Purpose** : P2 (6 weeks) planning with internal task dependencies, blockers, mitigations.

**Sections** :
- P2-01 : R4 Scorer (5h code, 2 weeks including validation)
- P2-02 : Rosetta Bridge (4h code, 2 weeks including bench)
- P2-03 : Reduce LLM calls (3h code, 2 weeks tuning)
- Critical dependencies matrix
- Signaux d'arrêt (stop conditions)
- Architecture decisions required (D1–D3)

**Read this if** : You're planning P2 or managing timeline risks.

---

## KEY FINDINGS AT A GLANCE

### 🔴 BLOCKING P2 (Action required before P2 start)

| Finding | Severity | P0/P1 Action | Impact if ignored |
|---------|----------|-------------|------------------|
| **F1 : Weight divergence** | HAUTE | P0-09 (5 min) | Calibration diverges from production |
| **F2 : SAGA_READY duplicated** | MOYENNE | P0-01 (5 min) | Silent threshold drift |
| **F3 : avg_sent_target < 35** | BASSE | P0-05 (5 min) | ~10 tokens wasted / run |

### 🟡 IMPORTANT (P1 investigations)

| Finding | Investigation | Effort | Verdict path |
|---------|-------------|--------|-------------|
| f26b direction incomplete | INV-01 | 2h | Validate 50 trees |
| Multi-scorer concordance absent | INV-02 | 2h | Bench GB V1 + Ridge + V3 |
| Token budget unmeasured | INV-03 | 1h | Cost model |
| Gateway 34 files isolated | INV-04 | DONE | Sealed foundation OK |
| Test coverage by module | INV-05 | 30 min | Metric |
| Package dependency graph | INV-06 | 1h | Metric |
| Phase W slopes | INV-07 | DONE | PASS ✓ |
| JSON scoring data obsolescence | INV-08 | 1h | Metric |
| PVI bridge interface | INV-09 | DONE | Design ready |
| Module regression risk | INV-10 | 1h | Metric |

### 🟢 VALIDATED (No action)

- Phase W slopes : 18/18 cells concordant ✓
- Rosetta Bridge : 7/7 tests PASS, production-ready ✓
- V5 AB test : GO conditional ✓
- Core FROZEN layers : Secure, no drift ✓

---

## EXECUTION SEQUENCE

### Week 1 (by 2026-04-09)

**P0 (40 min)** — CRITICAL PATH
```
Day 1 : P0-01 to P0-10
  - Unify thresholds (SAGA_READY, SEAL_FLOOR)
  - Archive dead code (compat/, polish/, v2)
  - Validate avg_sent >= 35
  - ALIGN weight-calibrator (F1)

GATE : npm test GREEN
```

**P1 code cleanup (1.5h)** — After P0
```
  - Migrate computeMacroSScore (P1-01)
  - Remove s-score.ts (P1-02)
  - Archive polish, v2, ollama (P1-03 to P1-05)

GATE : npm test GREEN
```

**P1 investigations (10.5h)** — CAN PARALLELIZE
```
  - INV-01 : f26b audit (2h)
  - INV-02 : Scorer bench (2h)
  - INV-03 : Token budget (1h)
  - INV-05 : Test coverage (30 min)
  - INV-06 : Package graph (1h)
  - INV-08 : JSON obsolescence (1h)
  - INV-10 : Regression risk (1h)
  + 2 outputs (COST_MODEL, REGRESSION_RISK) (1h)
```

**DEADLINE** : All P0+P1 COMPLETE by end of week 1.

---

### Weeks 2–7 (by 2026-05-23)

**P2-01 (Weeks 2–3)** : Scorer V3 reconstruction
- Depends on : P0 COMPLETE, R3/R8 data located
- Deliverable : V3 validation (Spearman >= 0.75)

**P2-02 (Weeks 4–5)** : Rosetta Bridge activation
- Depends on : P2-01 R4-e PASS
- Deliverable : A/B bench 10 runs (V4 vs V5)

**P2-03 (Weeks 6–7)** : LLM call reduction
- Depends on : P2-02 R5-e PASS
- Deliverable : Cost model v2 (target ~15 calls/run)

---

## DOCUMENT RELATIONSHIPS

```
IRM_TOTAL_SYNTHESIS_REPORT.md (main)
  ├── References all 17 IRM livrables (docs/irm/*.md)
  ├── Cites all 9 investigation files (docs/irm/inv/*.md)
  └── Feeds into 3 downstream documents

IRM_KEY_FINDINGS_SUMMARY.md (quick ref)
  ├── Distills F1–F10 from SYNTHESIS
  ├── Adds glossary + open questions
  └── Designed for 5-min read + session memory

P0_P1_EXECUTION_CHECKLIST.md (ops)
  ├── Breaks P0+P1 into 27 checklist items
  ├── References SYNTHESIS for context
  └── Provides bash commands, file paths, gates

P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md (planning)
  ├── Depends on P0+P1 completion (no P2 start before)
  ├── Maps internal P2-01/02/03 dependencies
  └── Architecture decisions (D1–D3) for Francky
```

---

## CRITICAL QUESTIONS FOR FRANCKY

**Must answer before P2 start:**

1. **Data availability** : Where are Phase R3 coefficients and R8 CIF+lambda data? (Blocking P2-01 R4-b/c)
2. **Feature mapping** : Is 7/42 (17% coverage) sufficient, or must all 42 be mapped before Rosetta activation?
3. **Rosetta strategy** : Option A (direct injection when ready) or Option B (progressive A/B test)?
4. **weight-calibrator F1** : Is alignment in P0-09 non-breaking, or need versioning strategy?

---

## NOTES FOR MEMORY

If resuming later or in next session:

- **Current status** : IRM analysis COMPLETE, P0+P1 planning ready, not yet executed
- **Blocking items** : weight-calibrator divergence (F1), R3/R8 data location
- **Next steps** : Execute P0 (40 min) → npm test GREEN → P1 code cleanup (1.5h) → P1 investigations (10.5h parallel)
- **Timeline** : P0+P1 complete by 2026-04-09 for P2 start 2026-04-10
- **Confidence** : HAUTE (2038 tests PASS, complete audit coverage)

---

## GLOSSARY

| Term | Meaning |
|------|---------|
| **IRM** | Investigation Root-cause Mapping (Feb–Apr) |
| **SSOT** | Single Source of Truth |
| **F#** | Finding # (F1–F10 identified) |
| **INV-#** | Investigation # (01–10 in P1 plan) |
| **P#** | Phase # (P0=cleanup, P1=structural, P2=alignment, P3=mutation) |
| **R#** | Release step or research phase (R4=Scorer rebuild) |
| **S1/S2/S3** | Measure / Generation / Governance systems |
| **GREEN** | npm test all PASS |
| **Couplage** | S1→S2 integration (goal: improve from 6/10 to 9/10) |

---

## FILES CHECKLIST

**Generated this session** (in /outputs/):
- ✓ `IRM_TOTAL_SYNTHESIS_REPORT.md` (15 KB)
- ✓ `IRM_KEY_FINDINGS_SUMMARY.md` (8 KB)
- ✓ `P0_P1_EXECUTION_CHECKLIST.md` (12 KB)
- ✓ `P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md` (10 KB)
- ✓ `README_IRM_SESSION.md` (this file, 5 KB)

**Total** : ~50 KB new outputs

**Referenced IRM livrables** (in /docs/irm/):
- ✓ 14 main IRM documents (02–16)
- ✓ 9 investigation files (inv/)
- ✓ 1 plan file (POST_IRM_PLAN_CONVERGENT.md)

**Referenced data files** (in packages/):
- ✓ ROSETTA_BRIDGE_MATRIX.json
- ✓ delta-threshold.json
- ✓ GB_V1_MODEL.json

---

## SUCCESS CRITERIA

**P0 success** :
- [ ] All 10 items completed (40 min)
- [ ] npm test GREEN (2038+ PASS, 0 FAIL)
- [ ] weight-calibrator aligned (F1 resolved)

**P1 success** :
- [ ] Code cleanup done (s-score migration, archives)
- [ ] 7/10 investigations complete (INV-01, 02, 03, 05, 06, 08, 10)
- [ ] COST_MODEL_BY_PIPELINE.json generated
- [ ] REGRESSION_RISK_MATRIX.json generated
- [ ] npm test GREEN

**P2 readiness** :
- [ ] R3/R8 data located and accessible
- [ ] P0+P1 COMPLETE (gate for P2 start)
- [ ] Feature mapping >= 50% (ideally 100%)

---

## SUPPORT

**If blocked during execution:**
- Check `P0_P1_EXECUTION_CHECKLIST.md` for exact file paths
- See `IRM_KEY_FINDINGS_SUMMARY.md` for context on each finding
- Reference `P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md` for P2 dependencies

**For Francky decisions:**
- All questions listed in `IRM_TOTAL_SYNTHESIS_REPORT.md` "RECOMMANDATIONS PRIORITAIRES"
- Architecture decisions (D1–D3) in `P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md`

---

**IRM Session Complete**
**Date** : 2026-04-02
**Standard** : NASA-Grade L4 / DO-178C Level A
**Ready for** : P0+P1 execution, then P2 start
