# NCR_GATE_IMPORTS_PATH_BUG

**ID** : NCR_GATE_IMPORTS_PATH_BUG
**Title** : `scripts/gate-imports.ts` utilise `process.cwd()` comme racine projet — Test 2 (engine.ts) FAIL si CWD ≠ project root
**Status** : **RESOLVED** (S6.1 hotfix 2026-04-27, fix CWD-independent via `import.meta.url`)
**Severity** : **P0** — gate CI bloquant pouvait passer/échouer selon CWD d'invocation, doctrine NASA-Grade L4 violée
**Priority** : P0
**Opened** : 2026-04-27 (Tribunal 3-IA Cowork+Gemini+ChatGPT)
**Resolved** : 2026-04-27 (S6.1 hotfix)
**Owner** : Claude (autonome) + Francky (décisionnaire)

---

## 1. Issue

Le gate CI `npm run gate:imports` (script `scripts/gate-imports.ts`) résolvait
le path d'`engine.ts` depuis `process.cwd()` :

```ts
// Avant S6.1 (BUGGY) :
const ENGINE_PATH = pathToFileURL(
  path.resolve(process.cwd(), 'packages/sovereign-engine/src/engine.ts'),
).href;
```

Conséquence : invoquer le gate depuis un CWD différent du project root produisait
un path invalide. Empiriquement (2026-04-27) :

```
$ cd scripts && npx tsx gate-imports.ts
❌ engine.ts : FAIL — Cannot find module
   'C:\Users\elric\omega-project\scripts\packages\sovereign-engine\src\engine.ts'
   imported from 'C:\Users\elric\omega-project\scripts\gate-imports.ts'
```

Le path résolu `scripts/packages/...` est faux : `scripts/` ne contient pas
`packages/`. Le gate devait être stable quel que soit le CWD.

## 2. Preuves

### 2.1 Reproduction empirique pré-fix (2026-04-29 16:13 UTC)

```
$ cd scripts && npx tsx gate-imports.ts
═══ GATE IMPORTS — pipeline souverain runtime check ═══
Date: 2026-04-29T16:13:00.090Z

--- Test 1 : 6 critical packages ---
✅ @omega/omega-forge : 88 exports
✅ @omega/canon-kernel : 67 exports
✅ @omega/genesis-planner : 33 exports
✅ @omega/genome : 36 exports
✅ @omega/phonetic-stack : 14 exports
✅ @omega/signal-registry : 6 exports

--- Test 2 : engine.ts loadable ---
❌ engine.ts : FAIL — Cannot find module
   'C:\Users\elric\omega-project\scripts\packages\sovereign-engine\src\engine.ts'
   imported from 'C:\Users\elric\omega-project\scripts\gate-imports.ts'

🚨 GATE IMPORTS FAIL : 1 critical issues detected (120ms)
```

Log archivé : `gate-imports-BEFORE-fix-CWD-SCRIPTS.log`

### 2.2 Validation post-fix (2026-04-29 16:14 UTC)

Empirique CWD=project root :
```
SCRIPT_PATH  : C:\Users\elric\omega-project\scripts\gate-imports.ts
PROJECT_ROOT : C:\Users\elric\omega-project
ENGINE_PATH  : C:\Users\elric\omega-project\packages\sovereign-engine\src\engine.ts
✅ GATE IMPORTS PASS : pipeline souverain importable runtime (241ms)
```

Empirique CWD=scripts/ (cas qui échouait) :
```
SCRIPT_PATH  : C:\Users\elric\omega-project\scripts\gate-imports.ts
PROJECT_ROOT : C:\Users\elric\omega-project
ENGINE_PATH  : C:\Users\elric\omega-project\packages\sovereign-engine\src\engine.ts
✅ GATE IMPORTS PASS : pipeline souverain importable runtime (242ms)
```

Logs archivés : `gate-imports-AFTER-fix-CWD-ROOT.log`, `gate-imports-AFTER-fix-CWD-SCRIPTS.log`

## 3. Cause racine

`process.cwd()` retourne le répertoire d'invocation, **pas** la position du
script sur le filesystem. Le gate supposait à tort que `npm run gate:imports`
serait toujours invoqué depuis project root (commentaire L.28-29 de l'ancien
script : "invoked via `npm run gate:imports` so process.cwd() = project root").

Cette supposition n'était :
- Pas formellement contractée (aucun pre-flight check)
- Pas testée (aucun test CWD-independent)
- Violée empiriquement par le Tribunal 3-IA en simulation

## 4. Impact

### 4.1 Tag historique

Le tag `phase-s-s6-engine-runtime-restored-2026-04-27` (commit `aca0f393`) a
été posé sur un état où le gate **passait localement depuis project root**
mais **échouait depuis tout autre CWD**. Cf. NCR_S6_TAG_PREMATURE (P1).

### 4.2 Risque CI

Tout runner CI invoquant le gate depuis un CWD non-standard (workflow GitHub
Actions avec `working-directory:`, scripts d'orchestration multi-package, etc.)
aurait silencieusement masqué une vraie panne d'imports.

### 4.3 Doctrine

Violation directe NASA-Grade L4 / DO-178C Level A : un gate de safety doit
être déterministe et invariant face au contexte d'exécution.

## 5. Résolution (S6.1 hotfix 2026-04-27)

Patch path resolution basé sur `import.meta.url` (emplacement réel du script) :

```ts
// Après S6.1 (CWD-INDEPENDENT) :
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const ENGINE_PATH_FS = path.join(PROJECT_ROOT, 'packages/sovereign-engine/src/engine.ts');
const ENGINE_PATH = pathToFileURL(ENGINE_PATH_FS).href;

// Pre-flight check — fail-closed si engine.ts absent
if (!fs.existsSync(ENGINE_PATH_FS)) {
  console.error(`❌ engine.ts NOT FOUND on filesystem at: ${ENGINE_PATH_FS}`);
  process.exit(1);
}
```

Logging explicite ajouté :
```
SCRIPT_PATH  : <abs path>
PROJECT_ROOT : <abs path>
ENGINE_PATH  : <abs path>
```

## 6. Verification post-fix

| Test | CWD | Résultat | Path résolu |
|------|-----|----------|-------------|
| 1 | project root | PASS (241ms) | `C:\...\packages\sovereign-engine\src\engine.ts` ✓ |
| 2 | scripts/ | PASS (242ms) | `C:\...\packages\sovereign-engine\src\engine.ts` ✓ |

Path `scripts/packages/` éliminé du gate, indépendamment du CWD.

## 7. Traçabilité

- **Hotfix commit** : `045597c4` — "S6.1: HOTFIX gate:imports path bug — CWD-independent resolution" (2026-04-29 18:20 +0200)
- **Tag correctif** : `phase-s-s6-engine-runtime-restored-r2-2026-04-27` (présent dans le repo)
- **Tag historique préservé** : `phase-s-s6-engine-runtime-restored-2026-04-27` → `aca0f393`
  (NE PAS écraser, preuve de l'état pré-hotfix)
- **Rapport** : `nexus/proof/S6_1_GATE_IMPORTS_HOTFIX/01_S6_1_REPORT.md`
- **NCRs liés** : NCR_S6_TAG_PREMATURE (P1), NCR_GATE_IMPORTS_BUNDLER_BLINDNESS (P1)

## 8. Signature

```
NCR-ID    : NCR_GATE_IMPORTS_PATH_BUG
OPENED    : 2026-04-27 (Tribunal 3-IA)
RESOLVED  : 2026-04-29 (S6.1 hotfix, fix CWD-independent, commit 045597c4)
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```

---

## 10. Closure (enrichissement Sprint S8 Vague 1, 2026-05-01)

### 10.1 Date de closure et statut final

- **Date closure réelle** : 2026-04-29 18:20 +0200 (timestamp commit `045597c4`)
- **Status final** : **RESOLVED** (inchangé)
- **Date d'enrichissement closure section** : 2026-05-01 (Sprint S8 Vague 1)

### 10.2 Décision d'autorité

- **Détecteur** : Tribunal 3-IA (Cowork + Gemini + ChatGPT) le 2026-04-27
- **Décisionnaire** : Francky (Architect)
- **Implémenteur** : Claude (autonome, sous validation Architecte)

### 10.3 Evidence empirique consolidée

| Type | Référence | Vérification |
|------|-----------|--------------|
| Commit fix | `045597c4` | `git show 045597c4` — message "S6.1: HOTFIX gate:imports path bug — CWD-independent resolution" |
| Tag correctif | `phase-s-s6-engine-runtime-restored-r2-2026-04-27` | `git tag -l "phase-s-s6-engine-runtime-restored-r2*"` — présent |
| Tag historique pré-fix | `phase-s-s6-engine-runtime-restored-2026-04-27` → `aca0f393` | Préservé pour audit |
| Rapport empirique | `nexus/proof/S6_1_GATE_IMPORTS_HOTFIX/01_S6_1_REPORT.md` | `Test-Path` = True |
| Logs avant fix | `gate-imports-BEFORE-fix-CWD-SCRIPTS.log` | Cité §2.1 |
| Logs après fix | `gate-imports-AFTER-fix-CWD-ROOT.log` + `-CWD-SCRIPTS.log` | Cité §2.2 |
| Tests post-fix | 2 CWD différents : project root + scripts/ → PASS (241ms / 242ms) | Tableau §6 |

### 10.4 Portée du fix

**INCLUS dans la closure** :
- Path resolution CWD-independent via `import.meta.url`
- Pre-flight `fs.existsSync` check
- Logging explicite SCRIPT_PATH / PROJECT_ROOT / ENGINE_PATH
- Validation empirique 2 CWDs distincts

**HORS closure (NCRs séparés)** :
- `NCR_S6_TAG_PREMATURE` (P1) — tag historique pré-hotfix posé prématurément, à traiter séparément
- `NCR_GATE_IMPORTS_BUNDLER_BLINDNESS` (P1) — bundler ne voit pas certains imports runtime, scope distinct

### 10.5 Risques restants (post-closure)

- **R1 — Couverture CWD limitée** : seulement 2 CWDs testés empiriquement (project root + `scripts/`). Un CWD exotique (UNC path Windows, dossier monté, junction) pourrait théoriquement défaillir, bien que la solution `import.meta.url` soit robuste par construction.
- **R2 — Convention non formalisée** : le rapport S6.1 §10.2 propose une convention OMEGA (interdiction `process.cwd()` pour gates de safety). Cette convention n'est pas encore intégrée à `CLAUDE.md` ni à un linter custom.
- **R3 — CI test multi-CWD non implémenté** : §10.3 du rapport S6.1 propose un job CI matrix testant 3 CWDs. Non implémenté à date du 2026-05-01.

### 10.6 Lien doctrinal

Action corrective Sprint S9+ proposée dans NCR `NCR_REGISTRY_BROKEN_FILTER` §6 : amender `CLAUDE.md` pour formaliser la convention "gates de safety = `import.meta.url` only, jamais `process.cwd()`".

### 10.7 Closure officielle

```
CLOSURE OFFICIELLE NCR_GATE_IMPORTS_PATH_BUG
============================================
Date            : 2026-04-29 (fix) / 2026-05-01 (enrichissement section)
Status final    : RESOLVED
Authority       : Francky (Architect)
Evidence anchor : commit 045597c4 + tag phase-s-s6-engine-runtime-restored-r2-2026-04-27
Scope           : path resolution CWD-independent (NCRs liés P1 hors scope)
Risks           : R1/R2/R3 (couverture CWDs, convention, CI multi-CWD) — Sprint S9+
```
