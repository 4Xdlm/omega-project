# L0 — LoRA Feasibility Preflight (doc-only, AUCUN entraînement)

**Date** : 2026-06-04 · **Statut** : PREFLIGHT (faisabilité uniquement — décision d'entraîner = Architecte) · **Parent** : [DEC-022 Prompt-Forge Exhausted](../architecture/DEC-20260604-022-PROMPT-FORGE-EXHAUSTED.md) · **Famille** : EMP-19 (un LoRA = nouveaux poids = recalibration complète).

## Pourquoi LoRA maintenant
La forge par prompt est épuisée (surface). La seule voie restante pour franchir le plafond maître = **modifier les poids du générateur**. LoRA/QLoRA = adaptation à bas rang, réversible (adapter détachable), peu coûteuse vs fine-tuning complet. **Mais** : changer les poids = nouveau couple {modèle} → **profil EMP-19 EXPIRED** → recalibration juge + Rosetta + radar obligatoire avant toute mesure post-LoRA.

## Questions de faisabilité à résoudre AVANT tout train (L0)
1. **Objectif** : imitation des maîtres OU correction des défauts OMEGA ? (cf `L0_DATASET_STRATEGY.md` — reco : paires OMEGA→amélioré, PAS imitation brute).
2. **Modèle cible** : gemma4:31b (générateur de prod actuel, déjà calibré Rosetta+juge) — cohérent ; alternative = modèle plus petit pour itération rapide (mais recalibration séparée).
3. **Méthode** : QLoRA 4-bit (VRAM réduite) vs LoRA fp16. Rang r, alpha, target_modules à fixer en L1.
4. **Hardware** : VRAM disponible locale à auditer (gemma4:31b en 4-bit ≈ besoin ~24-40 Go pour train ; à vérifier — sinon cloud/CPU offload). **Inconnu à ce stade — à mesurer en L0 hardware probe.**
5. **Dataset** : taille minimale viable, source, légalité (cf dataset strategy). Risque copyright = bloquant.
6. **Réversibilité** : adapter détachable + base figée → V1 reste intact (gel DEC-022 préservé).
7. **Mesure avant/après** : protocole deux clés + humain (cf `L0_EVALUATION_PROTOCOL.md`).
8. **Risques** : pastiche/sur-style, copie verbatim, perte de la voix OMEGA, prose précieuse, overfitting petit dataset.

## Critères PASS/FAIL de L0 (faisabilité)
- **PASS L0** si : objectif clair + dataset légal et constructible + modèle cible + budget VRAM/temps chiffré + protocole avant/après deux-clés + plan recalibration EMP-19 + critères de réussite L5 définis.
- **FAIL L0** si : pas de dataset légal (copyright bloquant) OU hardware insuffisant sans alternative OU pas de métrique de réussite robuste → alors LoRA reste théorique, V1 = plafond accepté.

## Architecture cible du chantier (si GO post-L0)
```
L0  faisabilité (CE DOC, doc-only)            ← STOP ICI sans GO Architecte
L1  mini-dataset 50 paires OMEGA→amélioré
L2  LoRA micro-test (QLoRA, petit r)
L3  évaluation deux clés (gemma + bge-m3) + œil Architecte
L4  recalibration EMP-19 complète (juge + Rosetta + radar sur nouveaux poids)
L5  décision intégration V2 ou rejet
```

## VERDICT
- Statut : PASS (preflight livré, faisabilité cadrée). Confiance : Moyenne (hardware VRAM non encore mesuré ; dataset à constituer).
- Forces : voie profonde cadrée sans précipitation ; réversibilité préservée ; EMP-19 anticipé.
- Faiblesses : (1) budget VRAM/temps non chiffré (probe hardware à faire) ; (2) faisabilité dataset dépend de la stratégie légale ; (3) risque overfitting petit n.
- Action requise : Architecte décide d'engager L1 (constitution dataset) ou de surseoir. **Aucun entraînement tant que L0 n'est pas validé par l'Architecte.**
