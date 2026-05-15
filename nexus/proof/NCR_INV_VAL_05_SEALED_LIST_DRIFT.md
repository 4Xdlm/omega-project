# NCR_INV_VAL_05_SEALED_LIST_DRIFT

**ID** : NCR_INV_VAL_05_SEALED_LIST_DRIFT
**Title** : INV-VAL-05 sealed-list désynchronisée du HEAD — `musical-engine.ts` hash divergent depuis commit pré-S10
**Status** : **OPEN_DIAGNOSED**
**Severity** : **HIGH** (invariant scellé, gouvernance)
**Priority** : P1
**Opened** : 2026-05-15 (Phase 3.1.1 — découverte forensique via comparaison 3 hashes)
**Owner** : Francky + Claude
**Référence parent** : commit `847429cb` (P3.1.1) — découverte indépendante

---

## 1. Résumé

Le test `validation-runner.test.ts:146` T08 (INV-VAL-05) attend un hash
SHA256 scellé pour `src/polish/musical-engine.ts`. Le HEAD `16629707`
(puis `847429cb`) contient déjà une version différente du fichier.

→ **HEAD lui-même est désynchronisé du sealed-list**. Un commit antérieur
au HEAD courant a modifié `musical-engine.ts` sans mettre à jour
l'invariant scellé.

**Worktree NUL bytes drift (NCR_NUL_BYTES_DRIFT_PRE_SESSION) aggrave**,
mais le fix worktree seul ne résoudra PAS T08 — l'invariant pointe vers
une version archivée que HEAD ne contient plus.

## 2. Évidence empirique observée 2026-05-15

**3 hashes distincts identifiés** pour `packages/sovereign-engine/src/polish/musical-engine.ts` :

| Source | SHA256 (16 premiers chars) | Provenance |
|---|---|---|
| **Worktree actuel** | `b1908d2cf521e97b...` | HEAD + 4 NUL bytes injectés |
| **HEAD pur** (`git show HEAD:`) | `f618c52746e5bb4d...` | Commit `847429cb` (et antérieurs jusqu'à au moins `16629707`) |
| **Sealed list attendue** | `99f4f03e909ee16c...` | Hardcodé dans `validation-runner.test.ts` (INV-VAL-05) |

**Stack trace T08** :
```
AssertionError: Hash mismatch for src/polish/musical-engine.ts:
  expected '99f4f03e909ee16c...' to be 'f618c52746e5bb4d...'
  // Object.is equality
Expected: "99f4f03e909ee16c9d0a3a675b123504f47889fc53fc8c045c34d0aee03dc291"
Received: "f618c52746e5bb4d1db36567438333999025839666b84dd1ef580fd32c4b0c1f"
```

Note : le test reçoit `f618c527` (HEAD pur) malgré worktree `b1908d2c`
(corrompu). Hypothèse : Vitest lit le source dans un état où le worktree
était propre, OU lit le compiled output sans NUL bytes, OU artefact de
caching tsx/vitest.

## 3. Ce qui est PROUVÉ empiriquement

- HEAD `847429cb` (et antérieurs) contient `musical-engine.ts` hash
  `f618c52746e5bb4d1db36567438333999025839666b84dd1ef580fd32c4b0c1f`
- Sealed-list INV-VAL-05 attend `99f4f03e909ee16c9d0a3a675b123504f47889fc53fc8c045c34d0aee03dc291`
- Les 2 hashes diffèrent **strictement** — pas une simple corruption
  worktree, mais une vraie divergence de contenu HEAD vs scellé
- Test T08 FAIL est ANTÉRIEUR à Phase 3.1.1 (observé déjà sur HEAD `16629707`)
- `git checkout -- src/polish/musical-engine.ts` (revert worktree)
  donnerait `f618c527` ≠ `99f4f03e` → NE RÉSOUDRAIT PAS T08

## 4. Ce qui N'EST PAS prouvé (à investiguer)

- Commit exact qui a introduit la divergence HEAD vs sealed
- Si la modif HEAD était intentionnelle (cleanup, refactor) ou drift
- Si la sealed-list était à jour au moment du sealing initial
- Quelle version (HEAD ou sealed) doit être considérée comme autoritaire
- Combien d'autres fichiers de la sealed-list INV-VAL-05 sont divergés
  (audit complet à faire)

## 5. Hypothèses sur cause racine (NON tranchées)

- **H1** : Modif intentionnelle de `musical-engine.ts` post-sealing
  (refactor légitime) sans procédure de re-scellage suivie
- **H2** : Cleanup automatique (linter, formatter, prettier) a touché
  le fichier sans alerter sur sealed status
- **H3** : Commit qui a modifié le fichier était hors processus sealed-list
  (sprint hors gouvernance)
- **H4** : Sealed-list elle-même était incorrecte au sealing initial
  (hash mal calculé)
- **H5** : Drift pluriel — plusieurs commits ont successivement modifié
  le fichier, le hash actuel HEAD étant le résultat composite

## 6. Risques identifiés

- **R1** : INV-VAL-05 invariant scellé est **fonctionnellement cassé**
  depuis un commit antérieur non identifié — gouvernance compromise
- **R2** : T08 FAIL permanent masque potentiellement d'autres divergences
  sealed-list non détectées (effet "Boy who cried wolf")
- **R3** : Doctrine PROVE IT compromise — un sealed-list inerte est
  pire que pas de sealed-list (faux sentiment de garantie)
- **R4** : Re-scellage non documenté pourrait casser la traçabilité
  doctrinale OMEGA L4
- **R5** : Si autres fichiers de la sealed-list sont aussi divergés,
  audit complet INV-VAL-05 nécessaire

## 7. Tests requis pour trancher (Sprint S10+)

1. `git log -p -- packages/sovereign-engine/src/polish/musical-engine.ts`
   pour identifier tous les commits ayant modifié le fichier
2. Pour chaque commit modifiant : calculer hash post-commit et comparer
   à sealed `99f4f03e...`
3. Identifier le **commit délinquant** (premier ayant divergé du sealed)
4. Lire `validation-runner.test.ts:146` pour voir le contexte sealed-list
   complet (autres fichiers sealed et leurs hashes attendus)
5. Audit complet : pour chaque fichier de la sealed-list INV-VAL-05,
   calculer hash worktree + HEAD + comparer sealed
6. Vérifier si commit/sprint connu a documenté une opération de re-sealing

## 8. Décision actuelle

- **AUCUN fix dans Phase 3.1.1** (scope strict)
- Investigation déférée Sprint S10+ — chantier de gouvernance lourd
- Statut OPEN_DIAGNOSED — preuves rassemblées, décision pending
- Sévérité HIGH justifiée : invariant scellé désynchronisé = risque
  doctrinal majeur

## 9. Options de résolution (pending Francky)

3 options doctrinales :

- (a) **Re-sceller** : mettre à jour `validation-runner.test.ts:146`
  pour attendre `f618c527...` (HEAD actuel). Doctrine lourd : modifier
  un invariant scellé requiert ADR + procédure de re-sealing officielle.
  Risque : si le commit délinquant était lui-même une régression non
  intentionnelle, re-sceller pérennise la régression.

- (b) **Revert vers sealed** : identifier commit délinquant et revert
  ses modifs sur `musical-engine.ts` jusqu'à retrouver hash `99f4f03e...`.
  Risque : peut casser fonctionnalités introduites entre temps.

- (c) **Audit complet d'abord** : Sprint S10+ dédié — vérifier état
  divergence pour TOUS fichiers de sealed-list INV-VAL-05, puis décision
  globale (re-seal de masse vs revert ciblé).

## 10. Refs

- Test affecté : [REPO] `packages/sovereign-engine/tests/validation/validation-runner.test.ts:146`
- Fichier divergé : [REPO] `packages/sovereign-engine/src/polish/musical-engine.ts`
- Sealed hash attendu : `99f4f03e909ee16c9d0a3a675b123504f47889fc53fc8c045c34d0aee03dc291`
- HEAD hash actuel : `f618c52746e5bb4d1db36567438333999025839666b84dd1ef580fd32c4b0c1f`
- Commit parent : `847429cb` (P3.1.1) — découverte indirecte via baseline T08
- NCR superposé worktree : `NCR_NUL_BYTES_DRIFT_PRE_SESSION.md`

---

**Doctrine** : NCR OVER HEROICS + PROVE IT (sealed-list = invariant
fondamental, ne pas re-sceller à la légère).
**Standard** : NASA-Grade L4 / DO-178C Level A.
