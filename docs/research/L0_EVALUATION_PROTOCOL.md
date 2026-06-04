# L0 — Protocole d'évaluation LoRA (doc-only)

**Date** : 2026-06-04 · **Parent** : [L0 Preflight](L0_LORA_FEASIBILITY_PREFLIGHT.md). But : définir comment juger un LoRA AVANT de croire qu'il marche — sous EMP-16, EMP-18, EMP-19 et la Règle des Deux Clés.

## Principe directeur
Un LoRA change les poids → **profil EMP-19 EXPIRED**. Toute mesure post-LoRA est invalide tant que les instruments ne sont pas recalibrés sur les nouveaux poids. L'évaluation se fait donc en deux temps : (1) recalibration des instruments, (2) mesure avant/après deux clés + œil humain.

## Étape L4 — Recalibration EMP-19 (préalable OBLIGATOIRE à toute mesure)
Le LoRA produit un **nouveau générateur**. À recalibrer / re-vérifier :
- **Juge gemma calibré** : inchangé SI le juge reste gemma4 base (le LoRA est sur le générateur, pas le juge) — mais re-vérifier biais position/tie sur sorties LoRA (distribution nouvelle).
- **Rosetta (bridge génération)** : le profil gemma4 base ne s'applique plus au générateur LoRA → **recalibration Rosetta S0 sur le générateur LoRA** si on veut piloter par bridge (sinon bridge désactivé).
- **Radar bge-m3** : inchangé (embedder indépendant du générateur) — reste valide comme 2e clé.
- Power-On Self-Test `calibration_check.py` : enregistrer le couple {gemma4+LoRA-vN} dans le registre, statut CALIBRATION_REQUIRED jusqu'à re-vérif.

## Étape L3 — Évaluation avant/après (deux clés + humain)
Sur un holdout de scènes JAMAIS vues à l'entraînement :
- **Clé 1 — Juge gemma calibré** (`ecfb32d6`, double-ordre) : pairwise `OMEGA-base` vs `OMEGA-LoRA` sur la même scène. Métrique = taux de victoire LoRA, tie_rate.
- **Clé 2 — Radar bge-m3 LOAO** : Δradar (LoRA − base) vers le centroïde maître. Doit être ≥ 0 (non dégradé), idéalement positif.
- **Clé 3 — Œil Architecte** (vérité finale) : lecture en aveugle d'un échantillon, verdict humain. Le juge LLM ne scelle jamais seul (cf calibrage paliers, biais d'engagement N8).
- **Contrôles** : longueur (thermostat, pas de triche par expansion), répétition/copie (anti-régurgitation : vérifier absence de n-grammes longs d'œuvres sous droits), perte de matière narrative.

## Critère PASS/FAIL (L5 décision)
- **PASS intégration V2** si : victoire juge ≥ seuil dimensionné (n≥6 scènes, idéalement bootstrap) **ET** radar non dégradé (≥0) **ET** validation Architecte positive **ET** zéro copie verbatim **ET** longueur tenue. (Deux clés + humain concordants.)
- **FAIL** si une clé diverge nettement (ex. juge gagne mais radar s'effondre = « excellent pulp », pattern N8 subtext) → rejet, retour L1/L2 ou abandon.
- **EMP-16** : confirmer sur ≥3 corpus/holdouts indépendants avant toute intégration moteur définitive.

## Garde-fous
- Base figée + adapter détachable : V1 reste le fallback (gel DEC-022 intact).
- Aucun gate de production sur le LoRA tant que L5 n'a pas PASS sous deux clés + humain + EMP-16.
- Mesures Ollama-local ; validation finale Anthropic API autorisée pour arbitrage humain seulement.

## VERDICT
- Statut : PASS (protocole défini, conforme doctrine). Confiance : Haute.
- Forces : EMP-19 anticipé (recalibration avant mesure) ; règle des deux clés + œil humain ; anti-copie et anti-triche-longueur explicites ; base réversible.
- Faiblesses : (1) recalibration Rosetta du générateur LoRA = coût ; (2) holdout humain = goulot Architecte ; (3) seuil de victoire dimensionné à fixer (n, bootstrap).
- Action requise : à activer seulement si L0→L1 validé par l'Architecte. Aucune mesure post-LoRA sans recalibration EMP-19 préalable.
