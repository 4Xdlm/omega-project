# NCR_ORPHAN_TESTS_BENCH_V3

**ID** : NCR_ORPHAN_TESTS_BENCH_V3
**Title** : 15 tests `ncr-m2-v4-fusion.test.ts` importent de `scripts/bench-p1-robustness-v3.js` inexistant — FAIL permanents
**Status** : **OPEN_DIAGNOSED**
**Severity** : **MEDIUM**
**Priority** : P1 (faux signal masque régressions réelles)
**Opened** : 2026-05-15 (Phase 3.1.1 — audit baseline tests FAIL pre-existing)
**Owner** : Francky + Claude
**Référence parent** : commit `847429cb` (P3.1.1)

---

## 1. Résumé

15 tests du fichier `packages/sovereign-engine/tests/bench/ncr-m2-v4-fusion.test.ts`
échouent systématiquement avec `TypeError: buildOllamaOptions is not a function`
ou `repeatPatternScore is not a function`. La cause empirique : ces tests
importent depuis `../../scripts/bench-p1-robustness-v3.js` qui **n'existe
pas** sur le repo.

Le commit `c395a316 bench(v4): freeze fusion suite after BENCH_INVALID verdict`
a probablement archivé/supprimé `bench-p1-robustness-v3.ts` sans nettoyer
les imports des tests qui en dépendaient.

→ 15 FAIL permanents qui polluent la baseline et masquent potentiellement
de vraies régressions.

## 2. Évidence empirique observée 2026-05-15

**Tests run baseline (commit HEAD `16629707`, puis post-`847429cb`)** :

- 2357 PASS / **16 FAIL** / 2373 total
- 15/16 fails dans `tests/bench/ncr-m2-v4-fusion.test.ts`
- Stack traces uniformes :
  ```
  TypeError: (0 , __vite_ssr_import_2__.buildOllamaOptions) is not a function
  TypeError: (0 , __vite_ssr_import_2__.repeatPatternScore) is not a function
  ```

**Imports du test (L60-69)** :
```ts
} from '../../scripts/bench-p1-v4-fusion.js';

import {
  buildOllamaOptions,
  hashOptions,
  repeatPatternScore,
} from '../../scripts/bench-p1-robustness-v3.js';
```

**Vérification filesystem** :
- `find packages/sovereign-engine -name "*v4-fusion*"` retourne :
  - `bench-p1-v4-fusion-results.json`
  - `bench-p1-v4-fusion-verdict.md`
  - `bench-p1-v4-fusion.log`
  - `scripts/analyze-bench-p1-v4.ts`
  - `scripts/bench-p1-v4-fusion.ts` ✅
  - `tests/bench/ncr-m2-v4-fusion.test.ts`
- **`scripts/bench-p1-robustness-v3.ts` ABSENT du filesystem**

**Grep `export function buildOllamaOptions|export const buildOllamaOptions`
dans `packages/sovereign-engine/src/`** : 0 match.

## 3. Ce qui est PROUVÉ empiriquement

- `scripts/bench-p1-robustness-v3.js` n'existe pas sur le repo
- `buildOllamaOptions` et `repeatPatternScore` ne sont définis nulle part
  dans `packages/sovereign-engine/src/`
- 15 tests dépendent de ces fonctions et FAIL systématiquement
- Le FAIL est antérieur au commit `847429cb` (P3.1.1) — observé déjà
  sur HEAD `16629707`
- Le commit `c395a316 bench(v4): freeze fusion suite after BENCH_INVALID
  verdict` est le candidat probable de la suppression source

## 4. Ce qui N'EST PAS prouvé (à investiguer)

- Date exacte de disparition de `bench-p1-robustness-v3.ts` (git log à faire)
- Si une version archivée existe sous `archive/`, `attic/`, ou ailleurs
- Si la fusion v4 nécessitait une recréation des fonctions ou pas
- Combien de temps les 15 fails ont pollué la baseline

## 5. Hypothèses sur cause racine (NON tranchées)

- **H1** : `c395a316` a supprimé `bench-p1-robustness-v3.ts` sans nettoyer
  les imports du test dérivé `ncr-m2-v4-fusion.test.ts`
- **H2** : Refactor v3→v4 a renommé les fonctions sans mettre à jour imports
- **H3** : `bench-p1-robustness-v3.ts` n'a jamais été commité (DRAFT perdu)
- **H4** : Le test était un draft anticipé d'une suite v4 jamais finalisée

## 6. Risques identifiés

- **R1** : Faux signal de régression — 15 fails permanents masquent
  une régression réelle nouvelle
- **R2** : Baseline noise — `2357/16` devient le "normal", déshabitue
  l'œil au vrai zéro
- **R3** : Doctrine PROVE IT compromise — une suite test ne devrait
  jamais avoir d'imports cassés en HEAD
- **R4** : CI false confidence — si un humain lit 2357 PASS sans
  regarder les 16 fails, il croit la suite saine

## 7. Tests requis pour trancher (Sprint S10+)

1. `git log --all --format="%H %s %ad" -- packages/sovereign-engine/scripts/bench-p1-robustness-v3.ts`
   pour identifier la naissance/mort du fichier
2. `git log --diff-filter=D -- packages/sovereign-engine/scripts/bench-p1-robustness-v3.ts`
   pour confirmer commit de suppression
3. `git show <commit-suppression>` pour voir le contexte
4. Recherche dans `archive/`, `attic/`, sessions précédentes
5. Décision : recréer le fichier, supprimer le test, ou skip-with-NCR

## 8. Décision actuelle

- **AUCUN fix dans Phase 3.1.1** (scope strict)
- Tests laissés FAIL en attente investigation
- Statut OPEN_DIAGNOSED — preuves rassemblées, décision pending

## 9. Options de résolution (pending Francky)

- (a) **Skip avec annotation** : `it.skip()` les 15 tests avec ref
  `// SKIPPED: see NCR_ORPHAN_TESTS_BENCH_V3` — baseline propre, fail visible
- (b) **Supprimer le fichier test** : si la suite v4 fusion est obsolète
  (cf. tag `c395a316` mentionne BENCH_INVALID verdict)
- (c) **Recréer `bench-p1-robustness-v3.ts`** : reconstituer le fichier
  depuis git reflog ou archive — restaurer la suite fonctionnelle
- (d) **Status quo** : accepter les 15 fails comme bruit de baseline

## 10. Refs

- Test affecté : [REPO] `packages/sovereign-engine/tests/bench/ncr-m2-v4-fusion.test.ts:60-69`
- Fichier orphelin : [REPO] `packages/sovereign-engine/scripts/bench-p1-robustness-v3.js` (INEXISTANT)
- Commit candidat suppression : `c395a316 bench(v4): freeze fusion suite after BENCH_INVALID verdict`
- Mémoire liée : `project_bench_v4_fusion_invalid_2026-04-21.md`

---

**Doctrine** : NCR OVER HEROICS + PROVE IT (baseline noise inacceptable).
**Standard** : NASA-Grade L4 / DO-178C Level A.
