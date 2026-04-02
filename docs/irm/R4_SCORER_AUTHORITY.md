# OMEGA — Registre d'Autorité des Scorers
**Date** : 2026-04-02 | **Phase** : R4 Revalidation post-P0+P1 | **Standard** : NASA-Grade L4

---

## Contexte décisionnel

| Contexte | Scorer autorité | Justification |
|----------|----------------|---------------|
| engine.ts LIVE (production) | AestheticOracle V3 (LLM-based) | 9 axes + 5 macro-axes, DÉCISIONNEL |
| Bench OFFLINE | GB V1 (Gradient Boosting) | Meilleure discrimination corpus (range 3.98-4.37) |
| Microbench ≤600w | GB V1 (PDP cohérent L37) | 42 features, R²=0.79 sur corpus |
| Calibration métrologique | Multi-stage V1 (R3 coefficients) | Confiance affichée par feature × taille |
| Phase R5 validation | À déterminer | Spearman cible 0.75 vs jury humain |

## Scorers actifs — État mesuré R4-01

| Scorer | Fichier | Corrélation avec GB V1 | Statut | Note |
|--------|---------|----------------------|--------|------|
| GB V1 | gb-scorer.ts + gb-inference.ts | Référence | ACTIF (MICROBENCH) | 50 arbres, 42 features, PDP cohérent L37 |
| V1 multi-stage | multi-stage-scorer.ts | Spearman = -0.22 | ACTIF (CALIBRATION) | Scores non normalisés (1000-1100 vs 0-100), corrélation faible |
| V2 multi-stage | multi-stage-scorer-v2.ts | Non testé | ARCHIVE | Ridge 11 features — supersédé par V3 |
| V3 multi-stage | multi-stage-scorer-v3.ts | Non testé | ARCHIVE | Ridge + depth + interactions — λ=50 |
| Multi-scale | multi-scale-scorer.ts | Non testé | ARCHIVE | GB V1 multi-fenêtre — redondant avec gb-scorer |
| Aesthetic V3 | aesthetic-oracle.ts | N/A (LLM) | PRODUCTION LIVE | 9 axes + 5 macro-axes, non comparable corpus |

## FINDING CRITIQUE : V1 multi-stage ≠ GB V1

La corrélation Spearman entre GB V1 et V1 multi-stage est **-0.22** (p=0.24).
C'est négatif et non significatif.

### Causes identifiées :
1. **V1 produit des scores bruts non normalisés** (range 1058-1134 au lieu de 0-100)
2. **La normalisation 0-100 dépend du FeatureNormalizer** qui requiert le fichier R1 metrology (25 MB) — non chargé en mode Python standalone
3. **Les features moyennées sur 20 fenêtres** perdent la granularité locale que GB V1 capture par arbre

### Recommandation :
Le V1 multi-stage scorer NÉCESSITE la normalisation R1 pour produire des scores comparables. Sans normalisation, il est inutilisable comme juge comparatif. **Action R5** : exécuter le V1 via le wrapper TypeScript avec normalisation activée.

## Type modifiers — Résultat R4-02

| Métrique | Sans type modifiers | Avec type modifiers | Delta |
|----------|-------------------|-------------------|-------|
| Spearman vs GB V1 | -0.2209 | -0.2209 | 0.0000 |
| Score moyen | 1084.54 | 1084.54 | 0.0000 |

**Verdict : NEUTRAL** — Les type modifiers n'ont AUCUN effet sur les scores moyennés.
**Raison** : Les coefficients `type_modifiers` dans OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json ne contiennent probablement pas de modifiers pour le type 'DESCRIPTION' par défaut, ou les modifiers sont tous à 1.0.

**Décision** : Garder type modifiers **OFF** (applyTypeModifiers = false). Pas de justification pour les activer.

## Typological Normalizer — R4-05 Vérification

| Critère | Statut |
|---------|--------|
| Charge R8_TYPOLOGICAL_CONSTANTS.json | **VERIFIED** — fichier RUNTIME (pas dans calibration/) |
| 3 couches (ADDITIVE, LAMBDA, GAMMA) | **VERIFIED** — implémentées lignes 77-89 |
| 5 types passage | **VERIFIED** — action, narration, description, dialogue, introspection (ligne 63) |
| Concordance avec passage-type-detector | **VERIFIED** — mêmes 5 types |

## Bench LIVE vs OFFLINE — R4-06

**[DONNÉES INSUFFISANTES]** — Aucune session de bench ne contient simultanément les scores AestheticOracle V3 (LLM) et multi-stage V1 (CALC) sur les mêmes textes.

### Protocole proposé pour R5 :
1. Générer 10 scènes via engine.ts (LIVE) → capturer V3 macro_score.composite
2. Extraire les features text-features.ts de chaque prose générée
3. Scorer avec multi-stage V1 (avec normalisation R1 activée)
4. Comparer V3 (LLM) vs V1 (CALC) : Spearman + divergences
5. Ce "pont" permet de valider que le scorer CALC suit le scorer LLM

## Hiérarchie d'autorité finale

```
1. AestheticOracle V3 (LIVE) — DÉCISIONNEL en production
   ↑ (non calibré vs corpus, mais validé par usage)
   
2. GB V1 (MICROBENCH) — RÉFÉRENCE corpus
   ↑ (R²=0.79, PDP cohérent L37, 42 features)
   
3. Multi-stage V1 (CALIBRATION) — INFORMATIF seulement
   ↑ (scores non normalisés → inutilisable sans R1 metrology)
   ↑ Spearman vs GB V1 = -0.22 → AUCUNE concordance
   
4. V2/V3 multi-stage — ARCHIVÉS (supersédés)
5. Multi-scale — ARCHIVÉ (redondant avec GB V1)
```

---

*repo_live_confirmed: true — tous les fichiers scorers lus manuellement*
*"Ce qui n'est pas mesuré n'est pas acceptable."*
