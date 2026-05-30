# P3-SCRIBE — Audit de contrat (cadrage) : NE PAS PATCHER À LA CHAÎNE

```
Status            : OPEN_DIAGNOSED · NO_PATCH · DEDICATED_SESSION_REQUIRED
Décision          : Tribunal 2/2 (Gemini 2e verdict + ChatGPT) 2026-05-30 — DIFFÉRÉ
Doctrine          : EMP-14 (qualité > vitesse, pas de refactor production à l'aveugle)
```

## Pourquoi un audit de contrat, pas un nettoyage de casts
Les 19 `as any` de `scribe-engine/src` ne sont PAS le pattern « bypass readonly » de truth-gate (sûr). Ce sont des **accès à des champs hors-contrat partagés entre modules** :
- `(intent as any).constraints/genome/emotion` — `intent` typé `Record<string, unknown>` (weaver-llm.ts:31) → faiblesse de contrat `Intent/IntentPack`.
- `(scene.subtext as any)?.character_thinks / implied_emotion / reader_knows / tension_type` — le type `Scene.subtext` (issu de `GenesisPlan`, genesis-planner) **ne déclare pas** ces champs ; pourtant genesis-planner les **produit** (scene-generator.ts, subtext-modeler.ts) et forge-packet-assembler.ts les **consomme** (`scene.subtext.character_thinks`).
- Les `?? '' / ?? {}` ne sont **pas neutres** : ce sont des comportements de fallback. Changer les types peut changer les prompts → changer le texte généré.

**Le vrai sujet** : *quel est le contrat narratif réel entre `genesis-planner`, `scribe-engine` et `ForgeSubtext` ?* Tant qu'on n'y répond pas, patcher = risque de divergence génération silencieuse.

## Plan de la session dédiée (à exécuter à tête reposée)
**Phase 0 — Preflight runtime** : `git status` / HEAD / origin sync / tests baseline / recompte casts scribe-engine.
**Phase 1 — Contract map** : cartographier `Intent`/`IntentPack`, `Scene`, `Scene.subtext`, `ForgeSubtext`, `GenesisPlan`, `CreationResult`. Répondre : qui produit `character_thinks` / `implied_emotion` / `reader_knows` ? attendus, legacy, ou hallucination de code ?
**Phase 2 — Classer les 19 casts** : A=champ réel mais type manquant · B=legacy encore consommé · C=halluciné/jamais produit · D=frontière JSON/LLM légitime · E=fallback comportemental à préserver.
**Phase 3 — Tests de protection** : fixtures intent + scene.subtext ; vérifier que la génération reçoit les **mêmes champs** avant/après (shape, pas style).
**Phase 4 — Patch par cluster** : 1 contrat = 1 patch = 1 commit, TSC+tests avant/après. Jamais de sweep.

## Interdits (cette session)
Aucun patch scribe-engine. Aucun changement d'interface `ForgeSubtext`/`Scene` sans la contract map. Pas de `git add -A`.

## Verdict
- Statut : OPEN_DIAGNOSED — investigation faite, patch différé à session dédiée.
- Note de clôture de session 2026-05-30 : l'investigation scribe-engine a révélé des **contrats cross-package fantômes**, justifiant un arrêt stratégique (EMP-14). Repo sécurisé, working tree clean.
