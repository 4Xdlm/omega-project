# S9 ESM Scope Report (Phase 0 Audit)

**Date** : 2026-05-03 (Sprint S9 Étape 2 Phase 0)
**Source** : Tribunal 3 IA convergence (Gemini + ChatGPT + Cowork)
**Status** : AUDIT — pas de patch
**HEAD audit** : `4979a836` (post Sprint S9 Étape 3 doctrine sealed v3.156.0)
**Doctrine** : AUDIT BEFORE ACTION + ANCHOR_PRE_FLIGHT + RECOVERY_TEST_DOCTRINE

---

## 1. Configurations root

### 1.1 `package.json` racine

| Champ | Valeur |
|-------|--------|
| `"type"` | `"module"` ✅ ESM mode |
| `"workspaces"` | 41 packages |
| Build/test scripts | `vitest run`, `tsc --noEmit`, gates via `npx tsx` |

→ **Tous gates s'exécutent sous `npx tsx`** (esbuild bundler resolution) — confirme limitation NCR_GATE_IMPORTS_BUNDLER_BLINDNESS.

### 1.2 `tsconfig.json` racine

| Champ | Valeur |
|-------|--------|
| `target` | `ES2022` |
| `module` | `ESNext` |
| **`moduleResolution`** | **`bundler`** ⚠️ |
| `include` | `packages/plugin-sdk/src/**/*.ts` + `plugins/p.sample.neutral/**` |
| Scope | **plugin-sdk + plugins seulement** (pas le workspace global) |

### 1.3 `tsconfig.base.json` (alternative inheritance)

| Champ | Valeur |
|-------|--------|
| `target` | `ES2022` |
| `module` | `ESNext` |
| **`moduleResolution`** | **`node`** ⚠️ (différent de root!) |

### 1.4 `tsconfig.build.json`

| Champ | Valeur |
|-------|--------|
| `extends` | `./tsconfig.json` (root, bundler) |
| **`module`** override | **`NodeNext`** ✅ |
| **`moduleResolution`** override | **`NodeNext`** ✅ |
| `include` | `src/runner/**/*.ts` (limité runner) |

### 1.5 Verdict configs root

**3 fichiers root, 3 résolutions distinctes** :
- `tsconfig.json` : bundler
- `tsconfig.base.json` : node
- `tsconfig.build.json` : NodeNext (override)

→ **Chaos systémique**. Aucun "single source of truth" pour moduleResolution. Chaque package choisit indépendamment.

---

## 2. Configurations 6 packages prioritaires

| Package | `type` | tsconfig.moduleResolution | exports | dist source |
|---------|--------|---------------------------|---------|-------------|
| canon-kernel | module | **bundler** ⚠️ | sub-paths (5: `./`, `./types`, `./hash`, `./id`, `./schema`) | `dist/` |
| contracts-canon | module | **NodeNext** ✅ | simple `"."` | `dist/` |
| hardening | module | **NodeNext** ✅ | simple `"."` → **`./src/index.js`** | **`src/` direct (!)** |
| integration-nexus-dep | module | **NodeNext** ✅ | `"."` → **`./src/index.ts`** | **TypeScript source (!)** |
| omega-segment-engine | module | **NodeNext** ✅ | simple `"."` | `dist/` |
| sovereign-engine | module | **bundler** ⚠️ | simple `"."` | `dist/` |

**Findings critiques** :
- 6/6 = `"type": "module"` (ESM mode unifié)
- 4/6 packages NodeNext ✅ vs 2/6 bundler ❌ (canon-kernel + sovereign-engine = pivot packages !)
- `hardening` exports → `./src/index.js` (skip dist, src direct)
- `integration-nexus-dep` exports → `./src/index.ts` (TypeScript source brut, exige tsx)
- canon-kernel exports = 5 sub-paths (`./`, `./types`, `./hash`, `./id`, `./schema`)

---

## 3. Cartographie imports relatifs (4 packages runtime)

Scan `Get-ChildItem packages/<pkg>/src/**/*.ts | Select-String "from\s+['\"]\.\.?/[^'\"]+['\"]"` (single + double quotes).

| Package | files | total relative | **no ext** | with `.js` | json | type-only |
|---------|------:|---------------:|-----------:|-----------:|-----:|----------:|
| **canon-kernel** | 19 | 45 | **21** ❌ | 0 | 0 | 19 (42%) |
| **integration-nexus-dep** | 29 | 87 | **0** ✅ | 87 | 0 | 13 (15%) |
| **omega-segment-engine** | 11 | 26 | **9** ❌ | 16 | 0 | 2 (8%) |
| **sovereign-engine** | 239 | 708 | **4** ⚠️ | 704 | 4 | 233 (33%) |

**Verdict cartographie** :
- **canon-kernel = pire** : 47% imports sans extension (21/45)
- **omega-segment-engine = mixte** : 35% sans extension (9/26)
- **sovereign-engine = quasi-conforme** : 0.6% sans extension (4/708)
- **integration-nexus-dep = déjà conforme** extensions (87 .js, 0 sans ext)

Total imports à patcher (extension `.js`) : **34 imports** sur 4 packages (21 + 9 + 4 + 0).

---

## 4. Scripts build/test/gate

| Aspect | Méthode | Conformité ESM Node natif |
|--------|---------|---------------------------|
| Build prod (6 packages) | `tsc` | ✅ STRICT (catches TS errors) |
| Tests (6 packages) | `vitest run` | ❌ esbuild bundler resolution |
| Gates | `npx tsx scripts/...` | ❌ esbuild bundler resolution |
| `gate-imports.ts` | Sous tsx | ❌ Limitation connue (NCR_GATE_IMPORTS_BUNDLER_BLINDNESS) |
| `vitest.config.*` | **Aucun fichier trouvé** | Defaults vitest (esbuild) |
| `tsup.config.*` | **Aucun fichier** | Pas de tsup utilisé |

**Tension fondamentale** : Production build = `tsc` strict (catches NodeNext errors), mais tests + gates = bundler resolution (masque les bugs ESM Node natif). C'est exactement le pattern NCR_ESM_BUNDLER_VS_NODE_RUNTIME.

---

## 5. Probe Node native import (preuve empirique ultime)

```powershell
node -e "import('./packages/<pkg>/dist/index.js').then(m=>console.log('OK keys=',Object.keys(m).length)).catch(e=>console.error('FAIL',e.message))"
```

| Package | Probe Node native | Cause |
|---------|-------------------|-------|
| **contracts-canon** | ✅ **OK keys=51** | Importable Node natif (NodeNext + extensions correctes) |
| **hardening** | ❌ **FAIL** | Cascade : `Cannot find module orchestrator-core/src/util/clock.js` — orchestrator-core sans `"type": "module"` ! |
| **canon-kernel** | ❌ **FAIL** | `Directory import './types' not supported` (21 imports sans extension détectés Étape 0.3) |
| **sovereign-engine** | ❌ **FAIL** | Cascade : depend canon-kernel qui crashe |

**Findings critiques empiriques** :

1. **3/4 packages avec dist FAIL Node natif** confirmé empiriquement
2. **canon-kernel = root cause** : Directory import `./types` ← imports sans extension (Étape 0.3 prouvé : 21/45 sans ext)
3. **sovereign-engine FAIL via cascade canon-kernel** (importe `@omega/canon-kernel` → propage le crash)
4. **orchestrator-core découvert dans cascade** : warning `MODULE_TYPELESS_PACKAGE_JSON` — package sans `"type": "module"` ! Sub-package non audité Phase 0.

**Inventaire packages cassés Node natif (au minimum)** :
- canon-kernel (root cause Directory import)
- sovereign-engine (cascade canon-kernel)
- hardening (cascade orchestrator-core)
- orchestrator-core (no `"type": "module"`)
- integration-nexus-dep (build FAIL — 7 TS errors)
- omega-segment-engine (build FAIL — 8 TS errors)

→ **Cascade ESM cassée minimum 5-6 packages** au runtime Node natif.

---

## 6. Verdict scope refonte

### 6.1 Packages cibles refonte (priorisés)

| Priorité | Package | Action | Effort estimé |
|----------|---------|--------|---------------|
| **P0** | **canon-kernel** | Patch 21 imports + tsconfig bundler→NodeNext | ~30min |
| **P0** | **orchestrator-core** | Ajout `"type": "module"` + audit imports | ~30min (à auditer) |
| **P1** | **hardening** | Vérifier post-fix orchestrator-core (cascade) | ~10min |
| **P1** | **omega-segment-engine** | Patch 9 imports + fix duplicate identifiers + TS2834 | ~45min |
| **P1** | **sovereign-engine** | Patch 4 imports + tsconfig bundler→NodeNext + verify post-canon-kernel | ~30min |
| **P2** | **integration-nexus-dep** | Fix 7 TS errors (unused imports + missing 'envy' Emotion14) | ~30min |

**Total imports à patcher (estimation Phase 1)** : ~34 imports sur 4 packages + tsconfig changes (canon-kernel + sovereign-engine) + audit orchestrator-core.

### 6.2 Risques cascade identifiés

1. **canon-kernel patch** = unblocks sovereign-engine cascade (high impact)
2. **orchestrator-core fix** = unblocks hardening cascade (medium impact)
3. **integration-nexus-dep** = isolé (pas de cascade vs autres)
4. **omega-segment-engine** = duplicate identifiers + TS2834 = audit code mais pas cascade

### 6.3 Stratégie hybride applicable

**HYBRIDE confirmé empiriquement** :
- **Runtime production** (tsc + Node natif) : **NodeNext STRICT** obligatoire — `.js` extensions partout
- **Tooling dev** (vitest, tsx, gates) : **bundler résolution toléré** (déjà le cas, on n'y touche pas)

→ Pas de migration globale workspace. Per-package selon usage runtime.

### 6.4 Per-package classification finale

| Package | Cible classification |
|---------|---------------------|
| canon-kernel | RUNTIME → migrer NodeNext + 21 imports `.js` |
| contracts-canon | RUNTIME ✅ déjà conforme |
| hardening | DEPS RUNTIME → audit cascade post-orchestrator-core fix |
| integration-nexus-dep | TOOL/RUNTIME hybride → fix TS errors only (pas migration) |
| omega-segment-engine | RUNTIME → 9 imports + duplicate fix |
| sovereign-engine | RUNTIME → 4 imports + tsconfig bundler→NodeNext |

---

## 7. Recommandation Phase 1

### 7.1 Ordre patch suggéré (P0 d'abord)

1. **STEP 1** : Audit orchestrator-core (Phase 0bis) — vérifier `"type": "module"` + imports
2. **STEP 2** : Patch orchestrator-core (`type: module` + extensions) — débloque cascade hardening
3. **STEP 3** : Patch canon-kernel (21 imports `.js` + tsconfig NodeNext) — débloque cascade sovereign-engine
4. **STEP 4** : Probe Node natif canon-kernel + hardening + sovereign-engine (test reverse)
5. **STEP 5** : Patch sovereign-engine (4 imports + tsconfig) — finalise core pipeline
6. **STEP 6** : Patch omega-segment-engine (9 imports + duplicate fix + TS2834)
7. **STEP 7** : Fix integration-nexus-dep (7 TS errors — unused + missing 'envy')

### 7.2 Tests reverse à exécuter (RECOVERY_TEST_DOCTRINE)

Pour chaque step, post-patch :
- `npm run build --workspace=packages/<pkg>` → SUCCESS attendu
- `node -e "import('./packages/<pkg>/dist/index.js')..."` → OK keys >0 attendu
- Probe cascade descendante (packages dependents)

### 7.3 Critères PASS Phase 1

- ✅ canon-kernel + hardening + sovereign-engine + contracts-canon : 4/4 OK Node natif
- ✅ omega-segment-engine + integration-nexus-dep : 2/2 build SUCCESS
- ✅ Aucune régression test vitest existante
- ✅ gate-imports.ts continue PASS sous tsx (pas de régression tooling)

---

## 8. No-go conditions check

(7 NG identifiées Tribunal 3 IA — état actuel)

| # | No-go condition | État empirique | Verdict |
|---|-----------------|----------------|---------|
| 1 | Aucun package avec `"type": "module"` workspace | 6/6 packages prioritaires `module` ✅ | **CLEAR** |
| 2 | Aucun tsconfig avec NodeNext disponible | 4/6 packages prioritaires NodeNext ✅ | **CLEAR** |
| 3 | tsc échoue sur tous les packages | 4/6 build SUCCESS, 2/6 FAIL spécifiques | **CLEAR** |
| 4 | Imports relatifs > 50% sans extension partout | canon-kernel 47% / autres 0-35% / sovereign 0.6% | **CLEAR** (asymétrie) |
| 5 | Aucune cascade traçable | canon-kernel→sovereign-engine + orchestrator-core→hardening tracées | **CLEAR** |
| 6 | Aucun probe Node natif réussi | contracts-canon ✅ OK keys=51 | **CLEAR** (preuve faisabilité) |
| 7 | Tests vitest cassés | (Non testé Phase 0 — RECOVERY_TEST Phase 1) | **À VÉRIFIER Phase 1 STEP 0** |

→ **6/7 no-go conditions CLEAR**. NG-7 (tests vitest baseline) à vérifier en STEP 0 avant Phase 1.

---

## 9. Doctrine

**PROVE IT** — audit empirique exhaustif effectué :
- 4 root configs lus
- 6 package configs lus
- 4 imports maps cartographiés (708 + 87 + 26 + 45 = 866 imports analysés)
- 4 probes Node natif exécutés
- 6/7 no-go conditions vérifiées

**NCR OVER HEROICS** — pas de patch sans audit :
- Phase 0 = AUDIT only (CE rapport)
- Phase 1 = patches conditionnels à arbitrage Architecte
- Tests reverse définis par STEP avant exécution

**RECOVERY_TEST_DOCTRINE** — tests reverse définis :
- Per package : `npm run build` + probe Node native + cascade probe
- Critères PASS explicites §7.3

**ANCHOR_PRE_FLIGHT** — anchors empiriques vérifiés runtime :
- HEAD = `4979a836` (vérifié)
- Tag = `phase-s-s9-step3-doctrine-sealed-2026-05-02` (vérifié)
- 6 packages configs lus (paths Test-Path confirmés)
- Probes Node natif exécutés runtime (résultats live capturés)

---

## 10. Signature

```
DOCUMENT  : S9_ESM_SCOPE_REPORT.md
PHASE     : Phase 0 Audit (no patch)
HEAD      : 4979a836
TAG       : phase-s-s9-step3-doctrine-sealed-2026-05-02
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal, runtime arbiter)
TRIBUNAL  : Cowork + ChatGPT + Gemini + Claude (consensus 3-IA)
STANDARD  : NASA-Grade L4 / DO-178C Level A
NEXT      : Arbitrage Architecte → Phase 1 patches conditionnel
```
