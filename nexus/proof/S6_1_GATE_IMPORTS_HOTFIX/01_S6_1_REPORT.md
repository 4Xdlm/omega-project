# S6.1 — GATE:IMPORTS PATH BUG HOTFIX REPORT

**Sprint** : S6.1 (hotfix scoped P0)
**Date** : 2026-04-27 / 2026-04-29 (exécution)
**Branche** : `phase-r-dispatcher-v33`
**Architect** : Francky
**Drafter** : Claude (IA Principal)
**Standard** : NASA-Grade L4 / DO-178C Level A
**Source verdict** : Tribunal 3-IA (Cowork + Gemini + ChatGPT) 2026-04-27

---

## 1. Résumé exécutif

Le sprint S6 a été scellé prématurément : `gate:imports` passait localement
depuis project root mais **échouait depuis tout autre CWD**. Le Tribunal 3-IA
a démontré empiriquement le bug `process.cwd()` dans `scripts/gate-imports.ts`.
S6.1 est un hotfix scoped P0 qui :
1. Corrige le path resolution via `import.meta.url` (CWD-independent)
2. Ajoute un pre-flight check `fs.existsSync` fail-closed
3. Logge explicitement `SCRIPT_PATH`, `PROJECT_ROOT`, `ENGINE_PATH`
4. Documente la cécité bundler vs Node ESM (NCR_GATE_IMPORTS_BUNDLER_BLINDNESS)
5. Préserve le tag historique S6 INTACT (preuve archéologique)
6. Ajoute un tag correctif `r2` sur le commit hotfix

**Verdict S6.1** : **PASS** ✅

## 2. Diff exact appliqué

### 2.1 Fichier modifié

`scripts/gate-imports.ts` (UNIQUEMENT — strict scope S6.1)

### 2.2 Changements

#### Avant (BUGGY)
```ts
// Path résolu depuis project root (gate-imports.ts lives in scripts/, but invoked via
// `npm run gate:imports` so process.cwd() = project root)
import { pathToFileURL } from 'node:url';
import * as path from 'node:path';
const ENGINE_PATH = pathToFileURL(
  path.resolve(process.cwd(), 'packages/sovereign-engine/src/engine.ts'),
).href;
```

#### Après (CWD-INDEPENDENT)
```ts
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';

// S6.1 HOTFIX — Path resolution CWD-independent (NCR_GATE_IMPORTS_PATH_BUG P0)
// Base sur l'emplacement réel du script via import.meta.url, pas process.cwd().
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const ENGINE_PATH_FS = path.join(PROJECT_ROOT, 'packages/sovereign-engine/src/engine.ts');
const ENGINE_PATH = pathToFileURL(ENGINE_PATH_FS).href;
```

#### Avertissement bundler ajouté en tête
```ts
/**
 * ⚠️ LIMITATION CONNUE — NCR_GATE_IMPORTS_BUNDLER_BLINDNESS (P1 DRAFT) :
 * Ce gate s'exécute sous `npx tsx` (esbuild = bundler resolution). Il NE PEUT
 * PAS détecter les bugs ESM Node natif (imports sans extension dans dist/).
 * Voir mission S6.2 pour Test 4 (spawn `node` strict en child_process).
 * Source : OMEGA TRIBUNAL S6.1 hotfix 2026-04-27
 */
```

#### Pre-flight check ajouté
```ts
if (!fs.existsSync(ENGINE_PATH_FS)) {
  console.error(`❌ engine.ts NOT FOUND on filesystem at: ${ENGINE_PATH_FS}`);
  console.error(`   PROJECT_ROOT may be incorrect. Verify scripts/ location relative to project root.`);
  console.error(`   See: NCR_GATE_IMPORTS_PATH_BUG (S6.1)`);
  process.exit(1);
}
```

#### Logging explicite ajouté
```ts
console.log(`SCRIPT_PATH  : ${SCRIPT_PATH}`);
console.log(`PROJECT_ROOT : ${PROJECT_ROOT}`);
console.log(`ENGINE_PATH  : ${ENGINE_PATH_FS}`);
```

## 3. Reproduction empirique du bug (pré-fix)

### 3.1 Test depuis project root → PASS (faux sentiment de sécurité)

```
$ cd /c/Users/elric/omega-project && npm run gate:imports
[...]
--- Test 2 : engine.ts loadable ---
✅ engine.ts : 3 exports
✅ GATE IMPORTS PASS : pipeline souverain importable runtime (421ms)
```

### 3.2 Test depuis scripts/ → FAIL empirique

```
$ cd scripts && npx tsx gate-imports.ts
[...]
--- Test 2 : engine.ts loadable ---
❌ engine.ts : FAIL — Cannot find module
   'C:\Users\elric\omega-project\scripts\packages\sovereign-engine\src\engine.ts'
   imported from 'C:\Users\elric\omega-project\scripts\gate-imports.ts'

🚨 GATE IMPORTS FAIL : 1 critical issues detected (120ms)
```

Path résolu `scripts/packages/...` confirme le bug `process.cwd()`.

Logs archivés :
- `gate-imports-BEFORE-fix.log` (CWD=project root, PASS)
- `gate-imports-BEFORE-fix-CWD-SCRIPTS.log` (CWD=scripts/, FAIL)

## 4. Validation post-fix

### 4.1 Test depuis project root → PASS

```
$ cd /c/Users/elric/omega-project && npm run gate:imports
═══ GATE IMPORTS — pipeline souverain runtime check ═══
Date: 2026-04-29T16:13:57.487Z
SCRIPT_PATH  : C:\Users\elric\omega-project\scripts\gate-imports.ts
PROJECT_ROOT : C:\Users\elric\omega-project
ENGINE_PATH  : C:\Users\elric\omega-project\packages\sovereign-engine\src\engine.ts

--- Test 1 : 6 critical packages ---
✅ @omega/omega-forge : 88 exports
✅ @omega/canon-kernel : 67 exports
✅ @omega/genesis-planner : 33 exports
✅ @omega/genome : 36 exports
✅ @omega/phonetic-stack : 14 exports
✅ @omega/signal-registry : 6 exports

--- Test 2 : engine.ts loadable ---
✅ engine.ts : 3 exports

--- Test 3 : 3 critical functions exported ---
✅ engine.runSovereignForge : function
✅ engine.runSovereignForgeBestOfN : function
✅ engine.runSovereignForgeWithPacket : function

✅ GATE IMPORTS PASS : pipeline souverain importable runtime (241ms)
```

### 4.2 Test depuis scripts/ (cas qui échouait pré-fix) → PASS

```
$ cd scripts && npx tsx gate-imports.ts
[...]
SCRIPT_PATH  : C:\Users\elric\omega-project\scripts\gate-imports.ts
PROJECT_ROOT : C:\Users\elric\omega-project
ENGINE_PATH  : C:\Users\elric\omega-project\packages\sovereign-engine\src\engine.ts

--- Test 2 : engine.ts loadable ---
✅ engine.ts : 3 exports

✅ GATE IMPORTS PASS : pipeline souverain importable runtime (242ms)
```

**Path `scripts/packages/...` éliminé** ✓
**Test 2 PASS dans les 2 CWDs** ✓
**Logging explicite des paths résolus** ✓

Logs archivés :
- `gate-imports-AFTER-fix-CWD-ROOT.log` (PASS)
- `gate-imports-AFTER-fix-CWD-SCRIPTS.log` (PASS, bug fixed)

## 5. NCRs gravés en DRAFT formel

| # | NCR | Sévérité | Statut | Fichier |
|---|-----|----------|--------|---------|
| 1 | NCR_GATE_IMPORTS_PATH_BUG | P0 | RESOLVED par S6.1 | `nexus/proof/NCR_GATE_IMPORTS_PATH_BUG.md` |
| 2 | NCR_S6_TAG_PREMATURE | P1 | DOCUMENTED | `nexus/proof/NCR_S6_TAG_PREMATURE.md` |
| 3 | NCR_GATE_IMPORTS_BUNDLER_BLINDNESS | P1 | OPEN (S6.2) | `nexus/proof/NCR_GATE_IMPORTS_BUNDLER_BLINDNESS.md` |
| 4 | NCR_ESM_BUNDLER_VS_NODE_RUNTIME | P1 | OPEN (S6.2) | `nexus/proof/NCR_ESM_BUNDLER_VS_NODE_RUNTIME.md` |
| 5 | NCR_BUILD_CASCADE_INCOMPLETE | P2 | OPEN (S6.2+) | `nexus/proof/NCR_BUILD_CASCADE_INCOMPLETE.md` |
| 6 | NCR_CANON_ENGINE_JUNCTION_ORPHAN | P3 | DOCUMENTED (auto-cleanup) | `nexus/proof/NCR_CANON_ENGINE_JUNCTION_ORPHAN.md` |

Total : **6 NCRs** créés selon doctrine.

## 6. Stratégie de tag

### 6.1 Tag historique (PRÉSERVÉ)

```
phase-s-s6-engine-runtime-restored-2026-04-27 → aca0f393
```

État : **état pré-hotfix**, gate CWD-dépendant. Conservé comme **preuve
archéologique** pour audits futurs. Doctrine "REPO = TRUTH" : ne pas réécrire
l'histoire git.

### 6.2 Tag correctif (NOUVEAU)

```
phase-s-s6-engine-runtime-restored-r2-2026-04-27 → <commit hotfix S6.1>
```

État : **état post-hotfix**, gate CWD-indépendant + 6 NCRs gravés. Représente
le scellage S6 corrigé, doctrine NASA-Grade L4 respectée.

Doctrine respectée : **PAS de --force, PAS de delete tag ancien**.

## 7. Scope respecté

### 7.1 Modifications appliquées

- ✅ `scripts/gate-imports.ts` (path resolution + pre-flight + logging + header NCR)
- ✅ 6 fichiers NCR DRAFT en `nexus/proof/NCR_*.md`
- ✅ Rapport S6.1 en `nexus/proof/S6_1_GATE_IMPORTS_HOTFIX/01_S6_1_REPORT.md`

### 7.2 Modifications EXCLUES (hors scope S6.1)

- ❌ Pas de patch `canon-kernel` ESM (mission S6.2 séparée)
- ❌ Pas de Test 4 spawn node child_process (mission S6.2 séparée)
- ❌ Pas de réécriture du tag historique
- ❌ Pas de modif `package-lock.json` (drift binary unrelated, laissé tel quel)
- ❌ Pas de modif sur autres scripts ou tsconfig
- ❌ Pas de S7 work (bench S7.2 en background non touché)

## 8. Critère PASS S6.1

| Critère | Statut |
|---------|--------|
| `gate:imports` Test 2 PASS depuis project root | ✅ |
| `gate:imports` Test 2 PASS depuis scripts/ | ✅ |
| Log affiche `PROJECT_ROOT` et `ENGINE_PATH` corrects | ✅ |
| Path résolu NE contient PAS `scripts/packages` | ✅ |
| 6 NCRs gravés en `nexus/proof/` | ✅ |
| Tag historique préservé intact | ✅ |
| Tag correctif `r2` à créer | (post-rapport) |
| Avertissement NCR bundler blindness en tête script | ✅ |

## 9. Commande exacte de validation finale

```bash
# Depuis project root
cd /c/Users/elric/omega-project && npm run gate:imports
# Attendu : PASS, paths corrects affichés

# Depuis scripts/ (cas qui échouait pré-fix)
cd /c/Users/elric/omega-project/scripts && npx tsx gate-imports.ts
# Attendu : PASS, paths corrects affichés
```

## 10. Recommandation post-S6.1

### 10.1 Sprint S6.2 (à cadrer par Architecte)

- Test 4 spawn `node` natif (résolution NCR_GATE_IMPORTS_BUNDLER_BLINDNESS)
- Audit `dist/*` pour imports sans extension (NCR_ESM_BUNDLER_VS_NODE_RUNTIME)
- Patch canon-kernel ESM si nécessaire
- Build cascade complet 41/41 (NCR_BUILD_CASCADE_INCOMPLETE)
- Cleanup `canon-engine` orphelin (NCR_CANON_ENGINE_JUNCTION_ORPHAN)

### 10.2 Convention OMEGA proposée (à valider Architecte)

> **Convention** : tout script de gate de safety DOIT utiliser
> `import.meta.url` + `path.dirname` pour calculer son project root.
> `process.cwd()` est INTERDIT pour les paths de gates.

### 10.3 CI test multi-CWD

> Ajouter un job CI matrix qui exécute `gate:imports` depuis 3 CWDs
> distincts (project root, scripts/, packages/sovereign-engine/) pour
> régression-test du fix S6.1.

## 11. Traçabilité finale

- **Hotfix script** : `scripts/gate-imports.ts` (unique fichier source modifié)
- **Logs preuve** : `gate-imports-BEFORE-fix*.log`, `gate-imports-AFTER-fix*.log`
- **NCRs DRAFT** : 6 fichiers `nexus/proof/NCR_*.md` créés
- **Rapport** : `nexus/proof/S6_1_GATE_IMPORTS_HOTFIX/01_S6_1_REPORT.md`
- **Tag préservé** : `phase-s-s6-engine-runtime-restored-2026-04-27` → `aca0f393`
- **Tag correctif** : `phase-s-s6-engine-runtime-restored-r2-2026-04-27` (post-commit)
- **Tribunal source** : Cowork + Gemini + ChatGPT (consensus 3-IA 2026-04-27)

## 12. Signature

```
SPRINT    : S6.1 (hotfix scoped)
OPENED    : 2026-04-27 (Tribunal 3-IA)
RESOLVED  : 2026-04-29 (validation empirique 2-CWD PASS)
ARCHITECT : Francky (autorité finale)
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```

---

**Verdict S6.1 : PASS** ✅

Conditions satisfaites : gate `Test 2` empiriquement CWD-independent, paths
explicites loggés, 6 NCRs gravés selon doctrine, tag historique préservé,
scope S6.1 respecté sans débordement vers S6.2.
