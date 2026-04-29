# NCR_BUILD_CASCADE_INCOMPLETE

**ID** : NCR_BUILD_CASCADE_INCOMPLETE
**Title** : S6.P2 build cascade — 11/41 packages buildés (PASS partiel), 30 packages non buildés non documentés
**Status** : **OPEN** (DRAFT 2026-04-27)
**Severity** : P2 — pipeline sovereign-engine OK (chain critique), mais 73% du workspace non couvert
**Priority** : P2
**Opened** : 2026-04-27 (Tribunal 3-IA, retro post-S6.P2)
**Owner** : Francky + Claude

---

## 1. Issue

Le sprint S6.P2 a déclaré "BUILD CASCADE complete" (commit `e9e32e62`) avec :
- 11 packages buildés sur la chaîne sovereign-engine (path critique production prose)
- 30 packages restants du workspace (sur 41 total) **non buildés**
- Aucun build status documenté pour les 30 autres

Empirique :
```
$ ls packages/*/dist | wc -l
~11 (chaîne sovereign-engine)

$ wc -l < <(grep -c '"packages/' package.json)
41 packages déclarés en workspace
```

Le verdict "S6.P2 PASS" reposait implicitement sur "la chaîne critique
sovereign-engine est buildée". Cette restriction n'a pas été explicitée dans
le tag, donnant une fausse impression de complétude.

## 2. Preuves

### 2.1 Workspace size

`package.json` racine déclare 41 packages dans `workspaces[]` (vérifiable par
grep). Cf. listing complet dans `package.json`.

### 2.2 Packages buildés (11)

Chaîne sovereign-engine (commit `e9e32e62` log) :
1. @omega/canon-kernel
2. @omega/contracts-canon
3. @omega/genesis-planner
4. @omega/genome
5. @omega/hardening
6. @omega/integration-nexus-dep
7. @omega/omega-forge
8. @omega/omega-segment-engine
9. @omega/phonetic-stack
10. @omega/signal-registry
11. @omega/sovereign-engine

(Liste à confirmer empiriquement par audit `dist/` per package — non fait
en S6.1.)

### 2.3 Packages non buildés (30, hypothèse)

Les autres packages workspace (gold-suite, omega-runner, omega-governance,
plugin-gateway, etc.) — statut build inconnu au tag S6. Aucune trace ni de
PASS ni de FAIL.

## 3. Cause racine

Décision implicite S6.P2 : prioriser la chaîne sovereign-engine (path critique
prose generation) et différer le reste. Cette priorisation était légitime
mais **non explicitement scellée**.

Conséquence : le tag `phase-s-s6-engine-runtime-restored-2026-04-27` peut
être interprété comme "tout le repo est runtime-restored" alors que la
réalité est "le pipeline sovereign-engine est runtime-restored".

## 4. Impact

### 4.1 Surface non couverte

73% du workspace en statut inconnu. Tout package non buildé peut :
- Ne pas être importable (dist/ absent)
- Avoir des erreurs TS résiduelles non détectées
- Produire des dépendances cassées si imports cross-package

### 4.2 Faux sens de complétude

Tag S6 fait office de "milestone scellé" en doctrine. Sans documentation
explicite des 30 packages non couverts, audits futurs peuvent conclure à
tort à un état "all green".

### 4.3 Limite gate:imports

`gate:imports` (S6.1 fixed) couvre 6 packages critiques + engine.ts. Il ne
couvre **pas** les 30 packages non listés. Donc passage gate:imports ≠
"tout le workspace est buildé".

## 5. Options de résolution

### Option A — Build cascade complet 41/41

**Description** : exécuter `npm run build --workspaces` pour les 41 packages,
documenter PASS/FAIL pour chacun.

**Effort** : 1-3h compute (selon échec en cascade) + 1h triage des FAILs.

**Bénéfice** : couverture totale, statut explicite par package.

### Option B — Audit statique sans build

**Description** : audit `dist/` directory pour chaque package — présence,
fraîcheur, exhaustivité des exports.

**Effort** : 30 min script + grep workspace.

**Bénéfice** : photographie rapide. **Limite** : ne re-builde pas, ne capte
pas drift TS récents.

### Option C — Étendre `gate:imports` à 41 packages

**Description** : ajouter les 41 packages dans `CRITICAL_PACKAGES` du gate.
Fail-closed si l'un manque ou casse.

**Effort** : 1h script + audit imports cassés résultants.

**Bénéfice** : régression detection auto. **Limite** : peut être lent (~10s
au lieu de 250ms).

## 6. Recommandation

**Option A puis C** :
1. Build cascade complet (Option A) pour cartographier l'état réel
2. Documenter le résultat dans NCR Sprint S6.2
3. Étendre `gate:imports` (Option C) avec les packages confirmés runtime-importable

Application : sprint S6.2 ou ultérieur, **pas en S6.1** (hotfix scope-limité).

## 7. Plan d'action

| # | Action | Owner | Sprint | Statut |
|---|--------|-------|--------|--------|
| 1 | Drafter ce NCR | Claude | S6.1 | **DONE** |
| 2 | Audit `dist/` 41 packages (Option B) | Claude | S6.2 | PENDING |
| 3 | Build cascade complet (Option A) | Claude | S6.2 | PENDING |
| 4 | Décision Architecte étendre gate:imports | Francky | S6.2 | PENDING |
| 5 | Étendre `CRITICAL_PACKAGES` (Option C) | Claude | S6.2+ | PENDING |

## 8. Traçabilité

- **Tag S6** : `phase-s-s6-engine-runtime-restored-2026-04-27` → `aca0f393`
- **Commit S6.P2** : `e9e32e62` "S6.P2: BUILD CASCADE complete (sovereign-engine chain, 11 packages built)"
- **Hotfix S6.1** : `nexus/proof/S6_1_GATE_IMPORTS_HOTFIX/01_S6_1_REPORT.md`
- **NCRs liés S6.1** : `NCR_GATE_IMPORTS_PATH_BUG`, `NCR_S6_TAG_PREMATURE`

## 9. Signature

```
NCR-ID    : NCR_BUILD_CASCADE_INCOMPLETE
OPENED    : 2026-04-27 (Tribunal 3-IA)
STATUS    : OPEN — résolution S6.2+
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
