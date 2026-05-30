# NCR_P3A_ENGINE_AXES_MASK_REVEAL : `axes: {} as any` masque un champ legacy RÉELLEMENT consommé

**Status**: OPEN_DIAGNOSED (revert effectué, fix différé) · **Severity**: LOW-MEDIUM · **Date**: 2026-05-30
**Origine**: P3-A cluster #2 (tentative de retrait des 2 `axes: {} as any` de engine.ts:622,650)
**Doctrine**: EMP-09/EMP-14 §8 MASK_REVEAL_AUDIT · gate appliqué = STOP + NCR

## Issue (mécanisme, prouvé par mask-reveal)
`engine.ts:622,650` construit un `SScore` de backward-compat avec `axes: {} as any, // Non utilisé en v3`.
Tentative de fix « propre » : rendre `SScore.axes` **optionnel** (`axes?: AxesScores`) + omettre le champ.
**Résultat TSC (mask-reveal)** : **8 erreurs révélées** prouvant que `axes` EST consommé :
- `src/pitch/sovereign-loop.ts:99,100,103,104,105,106` — itère `axes` (`Object.values/entries`), accède `.score` (TS2769/TS18046/TS2339).
- `src/polish/re-score-guard.ts:121` — lit `axes_modified` (TS18048 possibly undefined).

**Conclusion** : le commentaire « Non utilisé en v3 » est **TROMPEUR**. `axes` est lu par `sovereign-loop` et `re-score-guard`. Le `{} as any` injecte donc un objet **structurellement vide mais typé comme complet** dans le SScore qui peut atteindre ces consommateurs → smell de correction latente (itération sur axes vide = no-op silencieux si ce chemin est emprunté à l'exécution).

## Décision
- **Revert** de l'expérience (types.ts + engine.ts) → baseline restaurée (TSC 0, 2522 tests PASS, tree CLEAN). Aucune régression introduite : c'était un *reveal*, pas un *break*.
- Les 2 `as any` engine.ts restent EN PLACE (non « corrigés ») jusqu'à un fix conçu.
- Cluster #2 P3-A = **ABORTED (non sûr)** : ce n'est pas un placeholder trivial mais un écart de contrat avec consommateurs vivants.

## Fix candidat (session dédiée, NON maintenant)
Deux options à instruire :
1. **Peupler de vrais `axes`** depuis `final_score_v3` (mapper les macro-axes v3 vers le breakdown `AxesScores` legacy) — honnête mais demande la table de correspondance v3→legacy.
2. **Rendre `axes` optionnel + garder TOUS les consommateurs** (sovereign-loop, re-score-guard) avec un fallback explicite — change le contrat SScore, cascade à auditer.
Préalable : déterminer si le SScore à `axes` vide atteint réellement sovereign-loop/re-score-guard à l'exécution (sinon le risque est purement théorique).

## Verdict
- Statut : OPEN_DIAGNOSED — finding tracé, fix différé, baseline intacte.
- Faiblesses : (1) `{} as any` reste (dette assumée, documentée) ; (2) comportement runtime du chemin axes-vide non encore confirmé.
- Action requise : session dédiée pour le fix (option 1 ou 2) après confirmation du chemin runtime. Pas d'urgence (TSC 0, tests verts).
