# NCR_BUILD_CASCADE_INCOMPLETE

**ID** : NCR_BUILD_CASCADE_INCOMPLETE
**Title** : S6.P2 build cascade — 11/41 packages buildés (PASS partiel), 30 packages non buildés non documentés
**Status** : **STILL_OPEN** (Sprint S8 Vague 2 reconfirmation 2026-05-01 — issue persiste, drift régression détecté)
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
STATUS    : STILL_OPEN — issue empiriquement reconfirmée 2026-05-01 (Sprint S8 Vague 2)
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```

---

## 10. Reconfirmation empirique (Sprint S8 Vague 2, 2026-05-01)

### 10.1 Audit empirique runtime

Audit `dist/` per package via PowerShell (lecture seule, aucun build lancé) :

```powershell
$workspaces = (Get-Content package.json | ConvertFrom-Json).workspaces
foreach ($ws in $workspaces) {
  if (Test-Path "$ws/dist" -PathType Container) {
    $files = (Get-ChildItem "$ws/dist" -Recurse -File).Count
    if ($files -gt 0) { Write-Host "$ws : BUILT ($files dist files)" }
    else { Write-Host "$ws : dist-empty" }
  } else { Write-Host "$ws : NO-dist" }
}
```

### 10.2 Résultat 2026-05-01

| Métrique | Valeur 2026-04-27 (S6.P2) | Valeur 2026-05-01 | Δ |
|----------|---------------------------|-------------------|---|
| Workspaces déclarés | 41 | 41 | 0 |
| Packages BUILT (dist/ avec fichiers) | 11 (revendiqué NCR §2.2) | **16** | +5 |
| Packages UNBUILT (no dist ou vide) | 30 (implicite) | **25** | -5 |
| Couverture | 27% | **39%** | +12 pts |

### 10.3 Liste BUILT empiriquement vérifiée (16/41)

| # | Package | Fichiers dist |
|---|---------|--------------:|
| 1 | `packages/canon-kernel` | 76 |
| 2 | `packages/creation-pipeline` | 120 |
| 3 | `packages/genesis-planner` | 108 |
| 4 | `packages/genome` | 52 |
| 5 | `packages/mycelium` | 24 |
| 6 | `packages/omega-forge` | 124 |
| 7 | `packages/omega-governance` | 160 |
| 8 | `packages/omega-metrics` | 44 |
| 9 | `packages/omega-p0` | 89 |
| 10 | `packages/omega-runner` | 104 |
| 11 | `packages/orchestrator-core` | 52 |
| 12 | `packages/scribe-engine` | 180 |
| 13 | `packages/sentinel-judge` | 40 |
| 14 | `packages/signal-registry` | 16 |
| 15 | `packages/sovereign-engine` | 1021 |
| 16 | `packages/style-emergence-engine` | 84 |

### 10.4 Liste UNBUILT (25/41) — issue persistante

```
contracts-canon, decision-engine, emotion-gate, gold-cli, gold-internal,
gold-master, gold-suite, hardening, headless-runner,
integration-nexus-dep, mod-narrative, mycelium-bio, omega-aggregate-dna,
omega-bridge-ta-mycelium, omega-observability, omega-release,
omega-segment-engine, oracle, performance, phase-q, plugin-gateway,
plugin-sdk, proof-pack, search, truth-gate
```

### 10.5 Drift régression détecté (NEW finding Vague 2)

**4 packages listés "buildés" en S6.P2 §2.2 du NCR sont aujourd'hui NON-buildés** :

| Package | S6.P2 (NCR §2.2) | 2026-05-01 |
|---------|------------------|------------|
| `@omega/contracts-canon` | revendiqué BUILT | **NO-dist** |
| `@omega/hardening` | revendiqué BUILT | **NO-dist** |
| `@omega/integration-nexus-dep` | revendiqué BUILT | **NO-dist** |
| `@omega/omega-segment-engine` | revendiqué BUILT | **NO-dist** |

Hypothèses sur ce drift :
- (a) NCR §2.2 (S6.P2) inexact (liste théorique non vérifiée empiriquement)
- (b) `dist/` supprimé localement post-S6.P2 (cleanup, gitignore, ou perte)
- (c) Build régression silencieuse depuis S6.P2

Action future : investigation pour discriminer (Sprint S9+).

### 10.6 Décision empirique : STILL_OPEN justifié

Critères empiriques :

| Critère RESOLVED | État |
|------------------|------|
| 41/41 packages buildés | ❌ 16/41 (39%) |
| Couverture intégrale documentée | ❌ 25 unbuilt encore non auditées |
| Plan d'action §7 #2-#5 exécuté | ❌ Tous PENDING (S6.2 jamais lancé) |
| Architecte décision finale tracée | ❌ aucune décision tracée post-§7 |

→ Aucun critère RESOLVED satisfait. Status reste **STILL_OPEN**.

### 10.7 Recommandation Sprint S9+

L'instruction Vague 2 a posé la question RESOLVED vs DEFERRED. Réponse
empirique :

- **Pas RESOLVED** (issue empiriquement non résolue)
- **DEFERRED Sprint S9+** acceptable comme statut administratif si
  l'Architecte décide formellement le différé. Mais en l'absence d'une
  telle décision tracée à ce jour, **STILL_OPEN** est plus honnête —
  l'issue n'est pas explicitement différée, elle est **non traitée**.

### 10.8 Risques restants

- **R1 — Faux sens de complétude tag S6** : malgré la mitigation
  `NCR_S6_TAG_PREMATURE` (RESOLVED Vague 2 C12 dual-tag pattern), le tag
  S6 reste interprétable comme "all green" sans relire ce NCR. Risque
  audit futur.
- **R2 — Dépendances cassées non détectées** : tout package UNBUILT
  important pour un consommateur cross-package peut faire échouer un
  import runtime. `gate:imports` couvre 6 packages critiques + engine.ts,
  pas les 35 autres.
- **R3 — Drift régression silencieuse** : 4 packages perdus depuis S6.P2.
  Sans audit périodique, plus de packages peuvent dériver.
- **R4 — Plan §7 actions PENDING** : tous les items #2-#5 du plan d'action
  sont restés PENDING (Audit `dist/`, Build cascade complet, Décision
  Architecte gate:imports, Étendre CRITICAL_PACKAGES). 9 jours de Sprint
  passés (S6.2 → S8) sans progression.

### 10.9 Closure officielle

```
RECONFIRMATION EMPIRIQUE NCR_BUILD_CASCADE_INCOMPLETE
======================================================
Date            : 2026-05-01 (Sprint S8 Vague 2)
Status final    : STILL_OPEN (transition OPEN → STILL_OPEN
                  pour lever ambiguïté DRAFT vs ouverture active)
Authority       : Claude Code (runtime arbiter Sprint S8 Vague 2)
                  + Francky décisionnaire si transition vers DEFERRED
Evidence anchor : audit dist/ 41 packages 2026-05-01 — 16 BUILT, 25 UNBUILT
Scope           : couverture build workspace partielle (39%) — issue
                  persistante depuis 2026-04-27, **drift régression
                  détecté** (4 packages perdus depuis S6.P2)
Risks           : R1 faux sens complétude tag S6, R2 imports cross-package
                  cassés indétectables, R3 drift régression silencieuse,
                  R4 plan §7 #2-#5 PENDING depuis 9 jours
Recommandation  : décision Architecte Sprint S9+ — soit (a) DEFERRED formel,
                  soit (b) lancement Option A (build cascade 41/41), soit
                  (c) acceptation explicite via ACCEPTED_DIAGNOSED_UNKNOWN
                  avec scope "16/41 BUILT acceptés comme baseline"
```
