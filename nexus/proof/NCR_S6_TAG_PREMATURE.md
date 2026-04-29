# NCR_S6_TAG_PREMATURE

**ID** : NCR_S6_TAG_PREMATURE
**Title** : Tag `phase-s-s6-engine-runtime-restored-2026-04-27` posé sur état où gate:imports échouait empiriquement (CWD ≠ project root)
**Status** : **DOCUMENTED** (tag préservé comme preuve historique, tag correctif `r2` ajouté en S6.1)
**Severity** : P1 — non destructif, mais doctrine "PROVE IT" violée par le scellage
**Priority** : P1
**Opened** : 2026-04-27 (Tribunal 3-IA post-S6.P3)
**Owner** : Francky (décision tag policy) + Claude (drafter)

---

## 1. Issue

Le tag git `phase-s-s6-engine-runtime-restored-2026-04-27` (commit `aca0f393`,
"S6.P3: GUARDS — gate:imports CI + noEmitOnError tsconfig") a été posé suite à
un verdict "S6.P3 PASS" basé sur une exécution unique de `gate:imports` depuis
le project root. Le Tribunal 3-IA (Cowork + Gemini + ChatGPT) a démontré
empiriquement que le gate **échoue depuis tout autre CWD** (cf.
NCR_GATE_IMPORTS_PATH_BUG P0).

Le scellage S6 reposait donc sur un état partiellement validé. La doctrine
"PROVE IT — No claim without command + output + artifact" exige que le gate
soit déterministe et invariant ; ce n'était empiriquement pas le cas.

## 2. Preuves

### 2.1 Tag historique posé

```
$ git tag -l phase-s-s6-engine-runtime-restored-2026-04-27
phase-s-s6-engine-runtime-restored-2026-04-27

$ git rev-list -n 1 phase-s-s6-engine-runtime-restored-2026-04-27
aca0f393

$ git show --stat aca0f393 | head -3
commit aca0f393...
Author: Francky
Date:   2026-04-27
    S6.P3: GUARDS — gate:imports CI + noEmitOnError tsconfig
```

### 2.2 Évidence empirique de FAIL pré-tag

Cf. `NCR_GATE_IMPORTS_PATH_BUG` §2.1 : reproduction `cd scripts && npx tsx
gate-imports.ts` produit Test 2 FAIL avec path résolu `scripts/packages/...`.

Le tag ayant été posé **après** ce comportement existant (le bug `process.cwd()`
était dans le script depuis sa création), il a effectivement scellé un état
où le gate était CWD-dépendant.

## 3. Cause racine

Validation de scellage incomplète :
- Test unique du gate exécuté depuis project root → PASS observé
- Aucun test cross-CWD effectué avant scellage
- Confiance excessive dans le commentaire de code "process.cwd() = project root"
  sans vérification empirique

## 4. Impact

### 4.1 Confiance scellage S6

Le tag S6 ne représente pas un état "100% gate-validé" — uniquement un état
"gate-validé depuis project root". L'asymétrie n'avait pas été documentée.

### 4.2 Reproductibilité historique

Tout futur audit du tag S6 devra inclure cette mise au point pour ne pas
conclure à tort que le gate était fonctionnel sur tous CWD à cette date.

### 4.3 Doctrine

Doctrine OMEGA (CLAUDE.md §C.1) "PROVE IT — No claim without command + output
+ artifact" : la commande pour le claim "S6.P3 PASS" était insuffisante
(une seule invocation, un seul CWD).

## 5. Décision Architecte (2026-04-27)

**Préserver le tag historique INTACT.** Pas de réécriture, pas de force-push,
pas de delete-tag. Raisons :
1. Le tag est une preuve historique de l'état du repo à un moment donné.
2. Réécrire un tag publié violerait la traçabilité git et la doctrine
   immutabilité Phase Q.
3. Documenter l'écart via ce NCR + ajouter un tag correctif `r2` est plus
   transparent que d'effacer.

## 6. Résolution (S6.1 hotfix)

1. **Tag préservé** : `phase-s-s6-engine-runtime-restored-2026-04-27` →
   `aca0f393` (état pré-hotfix, gate CWD-dépendant, témoin Tribunal).
2. **Tag correctif ajouté** : `phase-s-s6-engine-runtime-restored-r2-2026-04-27`
   → commit hotfix S6.1 (état post-fix, gate CWD-indépendant).
3. **NCR_GATE_IMPORTS_PATH_BUG** : ouvert P0, RESOLVED par hotfix.
4. **Ce NCR** : DOCUMENTED, restera tracé.

## 7. Recommandation

### 7.1 Court terme

Tout futur scellage de gate doit inclure dans son protocole :
- ✅ Exécution depuis project root
- ✅ Exécution depuis au moins 1 CWD différent
- ✅ Pre-flight check `fs.existsSync` sur les paths absolus dérivés
- ✅ Logging explicite des paths résolus (PROJECT_ROOT, target paths)

### 7.2 Moyen terme

Ajouter un test CI multi-CWD pour `gate:imports` (workflow matrix sur 3 CWDs :
project root, scripts/, packages/sovereign-engine/).

### 7.3 Long terme

Convention OMEGA : tout script de gate de safety DOIT utiliser `import.meta.url`
+ `path.dirname` pour calculer son project root, JAMAIS `process.cwd()`.

## 8. Traçabilité

- **Tag historique** : `phase-s-s6-engine-runtime-restored-2026-04-27` → `aca0f393` (PRÉSERVÉ)
- **Tag correctif** : `phase-s-s6-engine-runtime-restored-r2-2026-04-27` → commit hotfix S6.1 (à venir)
- **NCR P0 lié** : `NCR_GATE_IMPORTS_PATH_BUG.md`
- **Rapport S6.1** : `nexus/proof/S6_1_GATE_IMPORTS_HOTFIX/01_S6_1_REPORT.md`
- **Tribunal source** : Cowork + Gemini + ChatGPT (consensus 3-IA 2026-04-27)

## 9. Signature

```
NCR-ID    : NCR_S6_TAG_PREMATURE
OPENED    : 2026-04-27 (Tribunal 3-IA)
RESOLVED  : DOCUMENTED (tag préservé, r2 ajouté)
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
