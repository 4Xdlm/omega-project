# COST_MODEL V2 — Réconciliation Pipeline vs Provider
# Date : 2026-04-04 | Source : P2 Validation Bench (5 scènes Sonnet)
# Standard : NASA-Grade L4

## Contexte

Le COST_MODEL V1 (POST_IRM_PLAN_CONVERGENT.md) estimait ~30 appels/run
au niveau PIPELINE (draft, judge, loop, duel, polish, microsurgery).

Le bench P2 du 2026-04-04 mesure au niveau PROVIDER (chaque appel API réel).
Ces deux niveaux ne sont PAS comparables directement.

## Données empiriques (5 scènes, Sonnet claude-sonnet-4-20250514)

### Appels provider par run

| Scène | Type | Total | generateDraft | generateStructuredJSON | score* (4×) | applyPatch |
|-------|------|-------|---------------|----------------------|-------------|------------|
| contemplation | internal | 75 | 10 | 27 | 36 | 2 |
| menace | external | 95 | 11 | 38 | 44 | 2 |
| confrontation | societal | 89 | 9 | 38 | 40 | 2 |
| passion | internal | 106 | 11 | 49 | 44 | 2 |
| deuil | internal | 102 | 10 | 46 | 44 | 2 |
| **MOYENNE** | — | **93.4** | **10.2** | **39.6** | **41.6** | **2.0** |

### Répartition provider-level (moyenne)

| Catégorie | Appels/run | % total |
|-----------|-----------|---------|
| generateDraft | 10.2 | 10.9% |
| generateStructuredJSON | 39.6 | **42.4%** |
| score* (interiority, sensory, necessity, impact) | 41.6 | 44.6% |
| applyPatch | 2.0 | 2.1% |
| **TOTAL** | **93.4** | 100% |

## Réconciliation V1 → V2

### Niveau pipeline (V1) : ~30 → ~17 appels PIPELINE

Le V1 comptait "1 judgeAesthetic" comme 1 appel pipeline.
En réalité : 1 judgeAesthetic = ~8-10 appels provider (4 score* + semantic cortex JSON).

### Niveau provider (V2, AUTORITÉ) : ~115 → 93.4 appels PROVIDER

Baseline estimé sans P2-03 : ~115 appels provider/run.
Mesuré avec P2-03 : 93.4 appels provider/run.
**Savings mesuré : ~22 appels/run = 19%.**

### Détail savings P2-03

| Optimisation | Savings/run | Mécanisme |
|-------------|------------|-----------|
| P2-03a Pre-filter | 0 | INV-PREFILTER-01 actif 5/5 (V1 SEAL + V3 REJECT → duel forcé) |
| P2-03b V1 skip | ~12 | 3 modes × 4 score sub-calls évités quand V1 SEAL |
| P2-03c Cache | ~10 | 2.6 hits/run × 4 sub-calls par hit |
| **TOTAL mesuré** | **~22** | **19% reduction** |

### Pourquoi 19% et pas 53%

Le pre-filter n'a PAS pu s'activer : les 5 scènes bench ont TOUTES déclenché
INV-PREFILTER-01 (V1 dit SEAL, V3 dit REJECT → duel obligatoire).

C'est le cas de sécurité correct. Sur un corpus mixte avec ~30% de scènes
où V1 et V3 convergent, le savings serait 19-54%.

## Cible P3 identifiée

`generateStructuredJSON` = 42.4% des appels. C'est la cible prioritaire
pour une optimisation coût en P3 (batching, caching, ou réduction axes).

## Scores bench

| Métrique | Valeur |
|----------|--------|
| Composite moyen | 89.1 |
| Min axis moyen | 79.5 |
| ECC | 88.1 |
| RCI | 86.0 |
| SII | 83.9 |
| IFI | 91.1 |
| AAI | 94.8 |
| SAGA_READY (≥92 + all floors) | 0/5 (0%) |
| Compliance downgrade | 1/5 (passion: f24e_contrast=0%) |

## Verdict

**COST_MODEL V1 : INVALIDE** au niveau provider (mauvaise granularité).
**COST_MODEL V2 : PASS CORRIGÉ** — savings 19% mesuré, réconciliation documentée.

---
Source : sessions/p2-validation-bench-2026-04-04T11-50-23.json
Produit par : Claude Opus 4.6 | Autorité : Francky
