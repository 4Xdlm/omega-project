# P2 — MATRICE DE DÉPENDANCES ET BLOCAGES
**Date** : 2026-04-02 | **Autorité** : Francky
**Standard** : NASA-Grade L4

---

## RÉSUMÉ

P2 se divise en 3 phases parallélisables avec dépendances critiques :
- **P2-01** (R4 Scorer) : fondation, 2 semaines
- **P2-02** (Rosetta Bridge) : dépend de P2-01 partiellement
- **P2-03** (Réduction LLM) : dépend de P2-02 complet

**Chemin critique** : P2-01 → P2-02 → P2-03 = **6 semaines total**.

---

## MATRICE DÉTAILLÉE

### P2-01 : Phase R4 — Scorer V3

#### Étapes internes

| # | Étape | Entrées | Sorties | Blocages | Effort |
|----|-------|---------|---------|----------|--------|
| R4-a | SSOT unique macro-poids | weight-calibrator divergence (F1) | thresholds.ts source unique | P0-09 must PASS | 30 min |
| R4-b | Intégrer coeffs R3 proportionnels | Phase R3 data | alpha=0.43, beta=0.57 | Coeffs R3 must exist | 1h |
| R4-c | Profils typologiques (5 types) | R8 CIF + lambda data | Profils S/A/B/C/D | R8 data disponible? | 1h |
| R4-d | Scorer multi-étages LOCAL+ARC | Profils + coeffs | S3 Macro composite | R4-b, R4-c PASS | 1h |
| R4-e | Validation 30 textes corpus | Scorer V3 code | Spearman >= 0.75 | Textes corpus dispo | 1h |

**Total R4-a à R4-e** : ~5h (peut parallèle : R4-b et R4-c indépendants)

#### Dépendances externes

| Dépendance | Localisation | État | Risque |
|-----------|-------------|------|--------|
| Weight-calibrator alignment (F1) | config.ts vs weight-calibrator.ts | P0-09 | BAS (2 fichiers) |
| Phase R3 coefficients | omega-autopsie/ ou archives/ | À vérifier | MOYEN (data historique) |
| R8 CIF + lambda data | omega-autopsie/ ou nexus/ | À vérifier | MOYEN (data historique) |
| Textes corpus (30) | nexus/sessions/ | EXIST | BAS |

#### Blocage critique
**QUESTION** : Les données Phase R3 et R8 sont-elles accessibles dans nexus/? Sinon → **STOP P2-01** et ouvrir NCR.

---

### P2-02 : Rosetta Bridge — Traduction S1→S2

#### État actuel
- **Fichier** : src/coupling/rosetta-bridge.ts (EXISTE)
- **Tests** : 7/7 PASS
- **Mode** : SHADOW (produit directives, ne les injecte pas)
- **Données** : ROSETTA_BRIDGE_MATRIX.json (19 features classifiées)

#### Étapes P2-02

| # | Étape | Entrées | Sorties | Blocages | Effort |
|----|-------|---------|---------|----------|--------|
| R5-a | Intégrer S0 data v2 (coeffs calibration) | ROSETTA_BRIDGE_MATRIX.json | Data harmonisée | Data dispo | 30 min |
| R5-b | Mapper 42 features GB V1 ↔ text-features | Feature specs | Mapping table | INV-09 partial |
| R5-c | Implémenter PVI bridge (standalone) | PVI interface conçue (INV-09) | pvi-bridge.ts | Python PVI existe? | 1h |
| R5-d | Activer Rosetta SHADOW→PROMPT | Bridge code | Injection dans V5 | P2-01 R4-e PASS | 1h |
| R5-e | Validation directives injectées (10 runs) | V5 prompt + Rosetta | Rapport comparatif | P2-01 scores | 1h |

**Total P2-02** : ~4h de code + validation

#### Dépendances externes

| Dépendance | État | Risque |
|-----------|------|--------|
| R4-e (Scorer V3 validation) PASS | P2-01 | CRITIQUE |
| Feature mapping (42 GB V1) | INV-09 partial (7/42 mappées) | MOYEN |
| Python PVI standalone | nexus/scripts/pvi/ | BAS (standalone exists) |

#### Décisions architecture

**Option A : Direct injection (recommandé)**
- Activer dès R4-e PASS
- Rosetta dirige prompt-assembler-v5
- Mesurer impact directives calibrées

**Option B : Progressive activation (conservative)**
- SHADOW mode pour S1 textes
- A/B test 10 runs V4 vs V5
- Si Spearman diff < 0.05 → activation graduelle

**Recommandation** : Option A (moins de latence, Rosetta est "read-only").

---

### P2-03 : Réduction appels LLM

#### Dépendances

| Composant | Actuel | Cible | Dépend de | Effort |
|-----------|--------|-------|-----------|--------|
| K2 Chunked Gen | 4 appels | 2-3 | Architecture K2 (fixed) | 30 min config |
| Duel (drafts+judge) | ~10 | 4-5 | V3 scorer (P2-01 R4-e PASS) | 1h |
| Sovereign Loop | ~4 | 2 | Threshold tuning | 30 min |
| Polish/MicroSurgery | ~4 | 2 | P0-03 archive polish | 30 min |
| Symbol Map | 1 | 0-1 | CALC logic (deterministic) | 30 min |
| **Total reduction** | **~30** | **~15** | **P2-01 + P2-02** | **~3h** |

#### Risque de régression

| Levier | Si réduit à zéro | Impact | Mitigation |
|--------|------------------|--------|-----------|
| Duel judges | 1 judge seul | Perte variance | Garder 2 judges min |
| Sovereign Loop | Skip si score > 88 | Perte opportunité | Threshold conservateur 88 |
| Symbol Map | Full CALC | Artefact déterministe | Seulement si validate CALC |

**Action** : Tester chaque réduction en isolation avant déploiement. P2-03 doit avoir tests de régression.

---

## CHRONOLOGIE SÉQUENTIELLE

```
P0 (40 min)  ←─── BLOCANT P2-01
    ↓
P1 (12h, peut parallèle)  ← INV-01 à INV-10 = INFORMATIF seulement
    ↓
SEMAINE 1 : P2-01 R4-a, R4-b, R4-c (parallèle)
SEMAINE 2 : P2-01 R4-d, R4-e (validation)
    ↓ (R4-e PASS)
SEMAINE 3 : P2-02 R5-a, R5-b, R5-c (parallèle R5-c = code pur)
SEMAINE 4 : P2-02 R5-d, R5-e (activation + validation)
    ↓ (R5-e bench PASS)
SEMAINE 5-6 : P2-03 (tuning + tests régression)
```

**Chemin critique** : P0 (0.67h) → P2-01 (5h) → P2-02 (4h) → P2-03 (3h) = **12.67h actuel**
**Avec parallélisation P1** : P0 + P2 séquentiel = **12.67h**, P1 parallèle = **+12h opt**.

---

## DOCUMENTS D'ENTRÉE REQUIS

Pour débuter P2 immédiatement après P0+P1 :

| Document | Source | État | Usage |
|----------|--------|------|-------|
| Phase R3 coefficients | omega-autopsie/ | ? | P2-01 R4-b |
| R8 CIF + lambda | omega-autopsie/ | ? | P2-01 R4-c |
| Textes corpus (30 FR+EN) | nexus/sessions/ | ✓ | P2-01 R4-e |
| ROSETTA_BRIDGE_MATRIX.json | sovereign-engine/scoring/data/ | ✓ | P2-02 R5-a |
| Feature mapping spec | INV-09 conçue | ◐ (7/42) | P2-02 R5-b |
| Python PVI standalone | nexus/scripts/pvi/ | ✓ | P2-02 R5-c |
| V3 Scorer test results | P2-01 output | — | P2-02 R5-d |

**Blocking items** :
- R3 coefs (P2-01 R4-b)
- R8 data (P2-01 R4-c)
- Feature mapping complet (P2-02 R5-b)

**Action avant P2 start** : Localiser R3 + R8 archives. Si indisponibles → open NCR.

---

## SIGNAUX D'ARRÊT CRITIQUES

| Signal | Sévérité | Action |
|--------|----------|--------|
| R3 ou R8 data non trouvés | CRITIQUE | **STOP P2-01** → NCR |
| V3 Spearman < 0.65 (R4-e) | HAUTE | **PAUSE P2-02** → diagnostic Scorer |
| Rosetta directives delta composite > 1.0 (R5-e) | HAUTE | **REVIEW architecture** → Option B |
| P2-03 reduction causes SAGA_READY drop < 5% | MOYENNE | **TUNE thresholds**, retry |
| Gateway coupling detected (inv) | CRITIQUE | **ISOLATION FAILURE** → NCR |

---

## ARTEFACTS DE SORTIE P2

### Livrables obligatoires

| # | Artefact | Format | Destinataire |
|----|----------|--------|-------------|
| P2-01-out | Scorer V3 validation report | nexus/proof/P2-01*.md | Francky |
| P2-01-out | S3 Macro composite benchmark | .json (30 textes) | Metrics |
| P2-02-out | Rosetta activation log | .md + .json | Francky |
| P2-02-out | Feature mapping complete | .json (42/42 mapped) | Atlas |
| P2-02-out | A/B test V4 vs V5 (10 runs) | .json + .md | Validation |
| P2-03-out | LLM call reduction audit | .md (cost savings) | Budget |
| P2-03-out | Regression test matrix | .json (all levers) | QA |

### Outputs
- nexus/proof/P2_COMPLETE.md (synthèse finale)
- nexus/proof/COST_MODEL_V2.json (coût post-P2)
- docs/ROSETTA_ACTIVATION_LOG.md (decisions)

---

## RISQUES ET MITIGATIONS

| Risque | Probabilité | Impact | Mitigation |
|--------|-----------|--------|----------|
| R3/R8 data indisponible | MOYENNE | BLOCANT P2-01 | Archiver rapidement (P0 prep) |
| Feature mapping incomplet (42) | MOYENNE | Rosetta suboptimal | Partial activation (7 pilotable suffisant) |
| V3 Spearman < 0.65 | BASSE | Scorer infiable | Revert, tune calibration |
| Gateway discovered integrated | BASSE | Isolation failue | Refactor coupling |
| LLM cost increase (reverse) | BASSE | Budget failure | Conservative thresholds P2-03 |

---

## DÉCISIONS ARCHITECTURALES REQUISES

### D1 : Appellation V3 vs S3
**Proposé** : Multi-stage scorer post-R4 = "Scorer V3 (multi-stage LOCAL+ARC)"
**Décision requise** : Confirmation nomenclature version.

### D2 : Rosetta activation mode
**Option A** : Direct injection dès R4-e PASS
**Option B** : Progressive (10 runs A/B, puis activation)
**Recommandation** : A (latence minimale)
**Décision requise** : Approbation Francky.

### D3 : Feature mapping coverage
**Actuel** : 7/42 mappées (17% de couverture)
**Suffisant?** : 7 PILOTABLE + 7 ILLUSION = 14/19 routing categories définis
**Optionnel** : Compléter les 28 restant post-P2?
**Décision requise** : Criticité mapping complet pour P2 vs déférer P3.

---

## POINTS DE SYNCHRONISATION

Dates clés pour sync avec Francky :

| Point | Trigger | Action |
|-------|---------|--------|
| **P0 DONE** | npm test GREEN | Start P2-01 |
| **R4-a DONE** | SSOT unified | R4-b start |
| **R4-e DONE** | Spearman >= 0.75 | R5-d activation |
| **R5-e DONE** | A/B test bench | P2-03 start |
| **P2-03 DONE** | All levers tuned | P2 COMPLETE, P3 roadmap |

---

**Document P2 planning**
**Date** : 2026-04-02
**Version** : 1.0
**Autorité** : Francky
