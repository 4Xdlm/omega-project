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

---

## RESOLUTION (P3-A2 Option C+, 2026-05-30, commit 89741949)

**Status: RESOLVED** (risque theorique confirme, dette cosmetique purgee).

Audit de contrat (P3-A2, cf workspace outputs/P3_A2_ENGINE_AXES_CONTRACT_AUDIT_v1.md) :
- Les 3 consommateurs des 9 micro-axes (sovereign-loop, re-score-guard + appelants polish) s'alimentent via le juge V2 (judgeAesthetic), PAS via le placeholder de engine.ts.
- Le SScore backward-compat de engine.ts ne sort que par executePipeline().s_score ; AUCUN consommateur (intra-paquet ou cross-package, grep vide) ne lit son champ axes.
- Conclusion : les 8 erreurs mask-reveal etaient de niveau TYPE (axes optionnel casse tous les sites lisant .axes), PAS une preuve que l'instance vide les atteint. Risque purement theorique = CONFIRME.

Fix applique (Option C+, decision Architecte) :
- Les 2 `{} as any` (engine.ts:622,650) remplaces par const EMPTY_AXES_BACKCOMPAT typee AxesScores (9 axes neutres score 0), zero `any`.
- Commentaire trompeur "Non utilise en v3" corrige -> placeholder backward-compat non consomme runtime (renvoi a ce NCR).
- Option 2 (axes optionnel) REJETEE (polluerait les consommateurs legitimes a axes peuples). Option 1 (mapping V3->9) jugee sur-ingenierie (benefice runtime nul, 5->9 non trivial) -> reservee a un polissage de contrat futur si besoin.

Gate : casts sovereign src 43->41, TSC exit 0, vitest 2522 pass / 0 fail (wrapper EMP-10). Push origin 89741949.
