# L1 Phase B' — Design DPO / préférence (fallback data-starvation cadrage B)

**Date** : 2026-06-04 · **Parent** : [L1 Roadmap](L1_AUTONOMOUS_ROADMAP_10H.md) · doc-only, aucune exécution. Garde-fous : réversible, advisory, recalibration EMP-19, **STOP avant intégration (Architecte)**.

## Pourquoi pivoter
Le cadrage B (SFT sur paires **same-content** `OMEGA-faible → réécriture améliorée`) est **data-starved** : le mining two-key STRONG rend ~11 % (1 paire / 9 cellules). Cohérent avec N8 : gemma améliore rarement OMEGA à longueur constante de façon convergente. Un SFT sur ~10-15 paires sur-apprendrait sans rien enseigner. → DPO/ORPO, qui n'exige PAS de paires same-content, est mieux adapté.

## Principe DPO/ORPO
Apprendre une **préférence** (`chosen` ≻ `rejected`) plutôt qu'une cible exacte. Le modèle apprend à favoriser les distributions « chosen ». Pas besoin que chosen soit une réécriture de rejected.

## Source de préférences — 3 options, par sécurité copyright croissante

### Option DPO-1 (RECOMMANDÉE, copyright-clean) — self-preference OMEGA
- `chosen` = sorties **OMEGA** ayant scoré HAUT (radar bge-m3 master-side, golden runs composite ≥ 89, top télémétrie N5).
- `rejected` = sorties **OMEGA** ayant scoré BAS (radar pulp-side, composite faible).
- 100 % OMEGA-généré → **aucun texte sous droits**, aucun problème copyright/redistribution. Données déjà disponibles (N5 télémétrie 42 scènes + benches BOOK_FULL + goldens).
- Enseigne au modèle la frontière **haut vs bas d'OMEGA lui-même** → pousse le générateur vers son propre haut de gamme. Limite : plafonné par le « meilleur OMEGA » (n'importe pas de qualité maître exogène).

### Option DPO-2 (plus puissant, risque copyright) — master vs pulp
- `chosen` = prose **maître** (Gold-Set), `rejected` = pulp.
- Plus fort (vise la qualité maître réelle) MAIS les maîtres modernes = sous droits (`livres_payants`, usage interne strict). Un adapter entraîné dessus pourrait encoder/régurgiter → **risque juridique**. À limiter aux **maîtres domaine public** (Flaubert, Proust selon juridiction) + les 10 pastiches `*-style.txt` (originaux, déjà au repo).

### Option DPO-3 (hybride) — DPO-1 + exemplaires publics en chosen minoritaire
self-preference OMEGA (gros) + une fraction de chosen = pastiches publics maître pour tirer vers le haut, sans texte sous droits.

## Protocole (si GO Architecte)
1. **Build preference set** : extraire de la télémétrie/benches existants les sorties OMEGA scorées ; seuiller haut/bas (radar + composite) ; former N paires (chosen haut, rejected bas), équilibrées par scène/ton. Format chat Gemma + champs `chosen`/`rejected` (TRL `DPOTrainer`/`ORPOTrainer`).
2. **Train** : QLoRA + DPO sur gemma-4-31b-it (4-bit, r=16, language-model targets — PAS all-linear/vision ; VRAM prouvée 22.9 Go en SFT, DPO ~×1.5 → surveiller). β DPO ~0.1.
3. **Éval** : règle des deux clés avant/après (juge gemma + radar bge-m3) sur holdout + échantillons générés + œil Architecte ; anti-copie ; EMP-19 recalibration du générateur LoRA avant toute mesure comparative.
4. **Critère** : gain au juge ≥ seuil dimensionné ET radar non dégradé ET zéro régurgitation ET EMP-16 (≥3 holdouts). Sinon rejet.

## VERDICT
- Statut : DESIGN (doc-only). Confiance : Haute sur la pertinence DPO ; Moyenne sur l'amplitude de gain (plafond self-preference).
- Forces : sort de la data-starvation (pas de paires same-content) ; **DPO-1 copyright-clean** + données déjà là ; réutilise toute la métrologie deux-clés.
- Faiblesses : (1) self-preference plafonne au meilleur OMEGA ; (2) DPO-2 = risque copyright (limiter au domaine public) ; (3) DPO VRAM > SFT (à valider) ; (4) qualité maître exogène non garantie.
- Action requise : **décision Architecte** sur la voie data (DPO-1 self-preference vs DPO-3 hybride vs SFT cadrage B élargi) avant tout entraînement. La faisabilité technique (QLoRA 31B) est déjà PROUVÉE (PASS_31B).
