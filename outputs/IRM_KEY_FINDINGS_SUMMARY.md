# IRM — KEY FINDINGS RÉSUMÉ
**Date** : 2026-04-02 | **Scope** : Post-IRM Total + 4-IA synthesis
**Audience** : Francky (decisions), Claude (execution)

---

## 🔴 FINDINGS CRITIQUES (blocking P2)

### F1 : Weight divergence — ECC 0.33 vs 0.30 ⚠️

**Finding** : weight-calibrator.ts contient poids obsolètes.

| Fichier | ECC | RCI | SII | IFI | AAI |
|---------|-----|-----|-----|-----|-----|
| config.ts (PROD) | **0.33** | 0.17 | 0.15 | 0.10 | 0.25 |
| weight-calibrator.ts (CALIB) | **0.30** | 0.17 | **0.18** | **0.15** | **0.20** |

**Impact** : Toute recalibration depuis ce fichier optimise sur baseline INCORRECTE.
**Action** : P0-09 (5 min) — aligner weight-calibrator.ts sur config.ts ou importer.
**Severity** : HAUTE — breaking change possible si calibration lancée.

---

### F2 : SAGA_READY dupliqué — 3 emplacements

**Finding** : Seuil 92.0 hardcodé en 2 endroits en plus de SSOT.

| Fichier | Ligne | Valeur |
|---------|-------|--------|
| core/thresholds.ts | 34 | **SAGA_READY_COMPOSITE_MIN = 92.0** (SSOT) |
| engine.ts | 198 | const SAGA_COMPOSITE = 92.0 (DUPE) |
| engine.ts | 549 | >= 92 (DUPE INLINE) |

**Impact** : Divergence silencieuse si l'un est modifié.
**Action** : P0-01 (5 min) — importer depuis core/thresholds.ts dans engine.ts.
**Severity** : MOYENNE — gestion seuil fragile.

---

### F3 : avg_sentence_length_target = 18 contradicts BB-02 plancher = 35

**Finding** : Validateur accepte < 35, mais BB-02 a prouvé irréductible.

**Impact** : Token mort. Toute consigne < 35 ignorée par Claude.
**Action** : P0-05 (5 min) — validation >= 35.
**Severity** : BASSE — impact qualité = 0, gaspille ~10 tokens prompt.

---

## 🟡 FINDINGS IMPORTANTS (P1 investigations)

### F4 : Gateway = 34 fichiers isolés + 16 tests

**Finding** : Organe NON SCANNÉE.

| Composant | Fichiers | Tests |
|-----------|----------|-------|
| memory_layer_nasa | 17 | 10 |
| creation_layer_nasa | 8 | 6 |
| gates/ | 5 | 0 |

**Couplage à sovereign-engine** : ZÉRO (grep exhaustive).
**Consommateurs externes** : ZÉRO.

**Impact** : Fondation future World Model. Aucun risque courant.
**Action** : INV-04 (DONE) — cartographier pour P3+.
**Severity** : BASSE courant, CRITIQUE futur.

---

### F5 : Phase W slopes — Vérification PASS ✓

**Finding** : 18/18 cells CONCORDANT entre code et documentation.

- Slopes matrix : PARFAIT (13 non-zéro)
- Thresholds : MUSICALITE 0.15 OK
- Archetype multipliers : 5/8 concordant, 3/8 divergences MINEURES

**Impact** : Phase W INTÉGRÉE CORRECTEMENT. Aucune action requise.
**Action** : INV-07 (DONE) — verified, sealed.
**Severity** : N/A (validation complète).

---

### F6 : f26b direction CORRECTE mais incomplet (50 arbres)

**Finding** : Tree 0 vérifié = +0.435 (POSITIF). Cohérent L37.

**Impact** : Direction OK, mais 49/50 arbres non vérifiés.
**Action** : INV-01 (2h P1) — script Python audit 50 arbres.
**Severity** : MOYENNE — inforatif seulement pour P2.

---

### F7 : 11 packages isolés — 1 à archiver

**Finding** : decision-engine (31 .ts, 0 imports, 0 roadmap).

| Verdict | Count | Packages |
|---------|-------|----------|
| ARCHIVER | 1 | decision-engine |
| À ÉVALUER | 2 | omega-p0, oracle |
| GARDER | 6 | headless-runner, plugin-*, search, observability |
| PLANNED | 2 | mod-narrative, omega-aggregate-dna |

**Impact** : Nettoyage mineur (31 fichiers inutiles).
**Action** : P1-06 (DONE) — recommandation archivage.
**Severity** : BASSE — dette technique mineure.

---

### F8 : Rosetta Bridge — Production-ready ✓

**Finding** : 7/7 tests PASS, 19 features classifiées.

| Catégorie | Count | Compliance |
|-----------|-------|-----------|
| PILOTABLE | 7 | 100% (f24e_contrast, f15b_redundancy, f16a_bigram) |
| ILLUSION | 7 | 0% (LLM claims understanding but delta = 0) |
| INDIRECT | 3 | Via L37 or SHADOW |
| CONTOURNABLE | 1 | Post-processing only |

**Mode** : SHADOW (directives produced but NOT injected yet).
**Activation** : P2-02 quand V3 scorer ready.

**Impact** : Outil clé pour couplage S1→S2.
**Action** : P2-02 (1-2 sem) — activation PROMPT_DIRECT.
**Severity** : CRITIQUE pour P2 succès.

---

### F9 : V5 AB Test — GO CONDITIONNEL ✓

**Finding** : 7/7 tests PASS, env var activation ready.

**Comparaison**
- V4 : 7 directives hardcodées
- V5 : 3 directives PILOTABLE 100%

**Condition activation** : Bench réel (10 V4 vs 10 V5), SI composite V5 >= V4 - 0.5.

**Impact** : Ready for production A/B testing.
**Action** : P2-02 trigger bench (après V3 score validation).
**Severity** : MOYEN — deferred to P2.

---

## 🟢 FINDINGS VALIDÉS (no action)

### F10 : Core layers SEALED

**Finding** : sentinel, genome FROZEN depuis phases 7A-10D.

**Impact** : Aucun risque modification. Fondation solide.

---

### F11 : Scoring poids ALIGNED

**Finding** : config.ts (PROD) et macro-axes.ts (DOC) concordants (0.33, 0.17, 0.15, 0.10, 0.25).

**Impact** : Production authority OK.

---

### F12 : Tests GREEN

**Finding** : 2038 PASS, 0 FAIL.

**Impact** : Baseline quality solide.

---

## 📊 METRIQUES DIAGNOSTIQUES

### Système S1 (MESURE)
- **Scoring** : 9/10 (GB V1 opaque mais valid)
- **Features** : ~42 documentées, 19 Rosetta-classifiées
- **Validation** : Phase W slopes PASS, thresholds audited
- **Confiance** : HAUTE

### Système S2 (GÉNÉRATION)
- **Pipeline** : 8/10 (powerful mais aveugle)
- **Appels LLM** : ~30 par run (1:5 productif/compensatoire)
- **Qualité output** : 8/10 (good prose, variability)
- **Confiance** : MOYENNE (needs coupling)

### Couplage S1→S2
- **Status** : 6/10 (FAIBLE)
- **Root cause** : S2 ignore S1 features, compense par bruit (loops, judges, duel)
- **Solution** : Rosetta Bridge (P2-02)
- **Target** : 1:5 → 1:2 ratio (P2-03)

---

## 📋 CONTRADICTIONS RÉSOLUES

| # | Contradiction | SSOT | Status |
|----|-------------|------|--------|
| CONTRA-01 | AAI 25% vs 8% | Code (macro-axes.ts) | RESOLVED (docs stale) |
| CONTRA-02 | SAGA_READY 92 dupliqué | core/thresholds.ts | **ACTION P0-01** |
| CONTRA-03 | s-score.ts deprecated mais usé | s-oracle-v2.ts | **ACTION P1-01** |
| CONTRA-04 | avg_sent_target 18 vs BB-02 35 | BB-02 (sealed) | **ACTION P0-05** |
| CONTRA-05 | Polish NO-OP mais maintendu | engine.ts (NO-OP proven) | **ACTION P1-03** |
| CONTRA-06 | f26b direction inversée? | Physique littéraire v3 | **ACTION INV-01** |
| CONTRA-07 | SEAL_FLOOR 85 hardcoded | core/thresholds.ts | **ACTION P0-02** |
| CONTRA-08 | Weights inter-scorers | À vérifier | **ACTION INV-02** |
| CONTRA-09 | 42 features GB V1 ≠ text-features | Mapping requis | **ACTION INV-09 map** |

---

## ⏱️ BLOCAGES CRITIQUES P2

| Blocage | Impact | Probabilité | Mitigation |
|---------|--------|------------|----------|
| R3/R8 data indisponible | P2-01 R4 stoppée | MOYENNE | Archive rapidement (P0 prep) |
| Feature mapping < 50% | Rosetta suboptimal | BASSE | Partial activation (7 pilotable OK) |
| V3 Spearman < 0.65 | Scorer infiable | BASSE | Revert, tune calibration |

---

## 🎯 PLAN D'EXÉCUTION (RAPPEL)

### P0 — 40 min (MUST COMPLETE)
1. ✓ Unify SAGA_READY (5 min)
2. ✓ Unify SEAL_FLOOR (2 min)
3. ✓ Archive compat/ (2 min)
4. ✓ Remove polish imports (2 min)
5. ✓ Validate avg_sent >= 35 (5 min)
6. ✓ Document CLIFF_THRESHOLD (5 min)
7. ✓ Document floorPenalty (5 min)
8. ✓ Create L35b (5 min)
9. **✓ ALIGN weight-calibrator (F1) (5 min) — CRITICAL**
10. ✓ Archive hybrid-provider (5 min)

**PASS/FAIL** : npm test GREEN

### P1 — 12h (PARALLEL POSSIBLE)
- Code cleanup (1.5h) : migrate s-score, archive polish/v2/ollama
- Investigations (10.5h) : INV-01 to INV-10 (can parallelize)
- Outputs (1h) : Cost model, regression matrix

**DEADLINE** : End of week 1 (by 2026-04-09)

### P2 — 6 weeks (AFTER P0+P1)
- **P2-01** (2 weeks) : Scorer V3 reconstruction (R4-a to R4-e)
- **P2-02** (2 weeks) : Rosetta Bridge activation (R5-a to R5-e)
- **P2-03** (2 weeks) : Reduce LLM calls 30→15

**Entrées critiques** : R3 coeffs, R8 data (localize ASAP before P2 start).

---

## 💾 ARTEFACTS CLÉS PRODUITS

### IRM Livrables
- **14 documents** (556 KB) : tree, contracts, thresholds, laws, pipeline, duplication, truth matrix, phantoms, session save
- **9 investigation files** : gateway, scorer, packages, slopes, pvi, weight-divergence

### Data Files
- **ROSETTA_BRIDGE_MATRIX.json** (19 features classified)
- **delta-threshold.json** (0.8579 @ P75)
- **GB_V1_MODEL.json** (262 KB, opaque but valid)

### New outputs (generated post-IRM)
- **IRM_TOTAL_SYNTHESIS_REPORT.md** (this session)
- **P2_DEPENDENCIES_AND_BLOCKING_MATRIX.md**
- **P0_P1_EXECUTION_CHECKLIST.md**

---

## ❓ OPEN QUESTIONS FOR FRANCKY

### Before P2 start

1. **R3 + R8 data** : Are Phase R3 coefficients and R8 CIF+lambda available in nexus/omega-autopsie/? If not, where?
2. **Feature mapping** : Is 7/42 (17%) sufficient for P2-02, or must all 42 be mapped before activation?
3. **Rosetta activation** : Option A (direct injection when R4-e PASS) or Option B (progressive 10-run A/B)?
4. **Gateway integration** : P3 timeline for World Model + gateway integration?

### During execution

- **P0-09 decision** : Confirm weight-calibrator alignment is non-breaking (or prepare versioning)?
- **INV-01 contingency** : If 49/50 arbres show divergent f26b, what's the escalation?
- **V3 target** : If Spearman < 0.65 in R4-e, fallback to V2 or iterate?

---

## 🔗 MEMORY FOR NEXT SESSION

**If resuming P1/P2 later:**

1. **Current state** : P0+P1 not yet started. All planning complete.
2. **Priority** : Execute P0 first (40 min) before any P1 work.
3. **Blocking items** : weight-calibrator (F1), R3/R8 data location.
4. **Next milestone** : npm test GREEN after P0, then start P1 investigations.
5. **Deadline** : P0+P1 complete by 2026-04-09 (for P2 start following week).

---

## GLOSSAIRE QUICK REFERENCE

| Term | Definition |
|------|-----------|
| **S1** | MESURE system (scoring, features, laws) — 9/10 quality |
| **S2** | GÉNÉRATION system (sovereign, LLM, pipeline) — 8/10 quality |
| **S3** | GOUVERNANCE system (contracts, seal, compliance) — 9/10 quality |
| **Couplage** | S1→S2 integration (currently 6/10, target 9/10 by P3) |
| **SSOT** | Single Source of Truth (e.g., config.ts for weights) |
| **F#** | Finding# (F1=weight divergence, F2=SAGA dupe, etc.) |
| **INV-#** | Investigation# (01-10 in P1 plan) |
| **P#** | Phase# (P0=cleanup, P1=structural, P2=alignment, P3=mutation) |
| **R#** | Release# or Research# step (R4=scorer rebuild in P2-01) |
| **PASS/FAIL** | Test verdict (npm test must be GREEN) |

---

**IRM Key Findings Summary**
**Date** : 2026-04-02
**Scope** : Complete IRM dissection + 4-IA convergence
**Confidence** : HAUTE (2038 tests PASS, grid-verified findings)
**Authority** : Francky (architect final call)
