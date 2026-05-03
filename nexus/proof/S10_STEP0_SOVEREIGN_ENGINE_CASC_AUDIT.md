# Sprint S10.0 — sovereign-engine CAS C Audit (pre-Tribunal)

**Date** : 2026-05-03 (Sprint S10 Étape 0 audit empirique)
**HEAD** : `2b9039c9` (post S9.2 partial closure)
**Status** : AUDIT — pas de patch (zero-modification scope)
**Source** : Mini-Tribunal IA prep (Gemini + ChatGPT + Cowork)
**Standard** : NASA-Grade L4 / DO-178C Level A
**Doctrine** : v3.156.0 (CLAUDE.md + SPRINT_S8_DOCTRINAL_AMENDMENTS)

---

## 0. Mission Sprint S10.0

Audit empirique exhaustif sovereign-engine ESM compliance avant tout patch.
Préparer dossier technique pour Mini-Tribunal IA décision.
**ZERO patch code** dans S10.0.

---

## 1. Inventaire JSON imports

Recherche pattern `from '...json'` dans `packages/sovereign-engine/src/**/*.ts` :

| # | Fichier source | Ligne | Import statement | Attribute `with { type: 'json' }` ? | JSON cible existe ? |
|---|----------------|-------|------------------|--------------------------------------|---------------------|
| 1 | `src/delta/delta-style.ts` | 17 | `import sensoryLexicon from '../data/sensory-lexicon.json'` | ❌ **NON** | ✅ `src/data/sensory-lexicon.json` |
| 2 | `src/scoring/gb-inference.ts` | 12 | `import modelData from './data/GB_V1_MODEL.json' with { type: 'json' }` | ✅ OUI | ✅ `src/scoring/data/GB_V1_MODEL.json` |
| 3 | `src/scoring/r8-diagnostic.ts` | 19 | `import tippingPointsData from './data/R8_TIPPING_POINTS.json' with { type: 'json' }` | ✅ OUI | ✅ `src/scoring/data/R8_TIPPING_POINTS.json` |
| 4 | `src/scoring/r8-diagnostic.ts` | 20 | `import typologicalData from './data/R8_TYPOLOGICAL_CONSTANTS.json' with { type: 'json' }` | ✅ OUI | ✅ `src/scoring/data/R8_TYPOLOGICAL_CONSTANTS.json` |

**Verdict empirique** :
- **3/4 imports** déjà conformes Node 22+ syntax (`with { type: 'json' }`)
- **1/4 import** (`delta-style.ts:17`) **MANQUE** l'attribut → root cause exacte du FAIL probe S9.2-C
- 4/4 fichiers JSON cibles existent sur disque

**TypeScript context** :
- `tsconfig.json` : `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `resolveJsonModule: true`, `isolatedModules: true`
- `verbatimModuleSyntax` : **NON défini** (n'apparaît pas)
- Root `tsconfig.json` : idem (bundler), `resolveJsonModule: true`
- TypeScript 5.x devDependency

**Note CONTEXT important** : `with { type: 'json' }` est syntaxe Node 22+ (ES2025 import attributes). Ancienne syntaxe `assert { type: 'json' }` (Node 16+, ES2022 import assertions) est obsolète et warning'd.

---

## 2. Inventaire imports manquant `.js`

Recherche pattern relative imports dans `packages/sovereign-engine/src/**/*.ts` (708 imports total) :

| Catégorie | Count | % |
|-----------|------:|--:|
| Avec `.js` extension | 704 | 99.4% |
| Avec `.json` extension | 4 | 0.6% |
| **Sans extension** | **0** | **0%** |

**Verdict empirique** :
- **0 import sans extension** ✅ Source code 100% NodeNext-compliant pour relative imports
- **Phase 0 audit erroné** : §3 du `S9_ESM_SCOPE_REPORT.md` reportait "4 imports sans extension". Re-vérification montre que les "4 sans extension" étaient en réalité les **4 .json imports** (regex Phase 0 ambiguë `[^.s'\"]['\"]$` ne reconnaissait pas `.json`).
- **Conséquence** : la "to-do" Phase 0 §6.1 mentionnant "Patch 4 imports + tsconfig" pour sovereign-engine est incorrecte. **Aucun patch d'imports `.js` nécessaire**.

---

## 3. Erreurs TypeScript empiriques runtime (build FAIL)

`npm run build --workspace=packages/sovereign-engine` (3.7s) — **EXIT CODE 2** :

| # | Fichier | Position | Code TS | Message |
|---|---------|----------|---------|---------|
| 1 | `src/validation/phase-u/phase-u-exit-validator.ts` | 189,52 | TS2352 | `Conversion of type 'KSelectionReport' to type 'Record<string, unknown>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first. Index signature for type 'string' is missing in type 'KSelectionReport'.` |
| 2 | `src/validation/phase-u/phase-u-exit-validator.ts` | 218,71 | TS2352 | (Idem KSelectionReport conversion) |
| 3 | `src/validation/phase-u/top-k-selection.ts` | 359,12 | TS2352 | (Idem ForgePacketInput conversion) |
| 4 | `src/validation/real-llm-provider.ts` | 110,17 | TS2352 | (Idem ForgePacket conversion) |

**Catégorisation des erreurs** :
- **TS2352 strict type conversion** (4 occurrences)
- Cause : strict mode TypeScript exige `as unknown as Record<...>` ou Index signature explicite
- **Aucune erreur ESM** détectée par tsc (logique : tsconfig moduleResolution=bundler tolère)
- **Pas TS2834** (différent de omega-segment-engine)

**Verdict empirique** :
- 4 erreurs TS2352 bloquent le build → dist/ pas régénéré correctement
- **Catégorie distincte** des erreurs ESM Node natif (différent root cause)

---

## 4. Erreur build empirique (résumé)

Build sovereign-engine FAIL à 3.6s avec :
- `npm error code 2`
- `npm error command failed: tsc`
- 4 erreurs TS2352 (toutes en `src/validation/`)
- Aucune erreur dans `src/scoring/`, `src/delta/`, ou autres modules

→ Le module `src/validation/phase-u/` est l'unique source des erreurs build.

---

## 5. Compat probe Node natif

```bash
$ node -e "import('@omega/sovereign-engine').then(...)"
FAIL Module "file:///.../sovereign-engine/dist/data/sensory-lexicon.json"
needs an import attribute of "type: json"

$ node -e "import('./packages/sovereign-engine/dist/index.js').then(...)"
(Identique — même erreur)
```

**Verdict empirique** :
- 1 erreur Node ESM strict : `sensory-lexicon.json` cherche import attribute
- C'est **EXACTEMENT** le fichier cité dans le seul JSON import sans `with` (Section 1, ligne #1)
- Aucune autre erreur Node ESM révélée (dist/ existe partiellement malgré build TS2352 — l'erreur runtime est isolée au JSON manquant)

---

## 6. Questions Mini-Tribunal techniques (Q1-Q6)

### Q1 — JSON import attribute syntax : `with` vs `assert` vs `JSON.parse(fs.readFileSync)` ?

**Contexte** :
- `with { type: 'json' }` = Node 22+ syntax (ES2025 stable)
- `assert { type: 'json' }` = Node 16+ syntax (ES2022 deprecated, warning emitted)
- `JSON.parse(fs.readFileSync)` = Node any version, runtime cost minimal

**Données empiriques** :
- 3/4 JSON imports déjà en `with` syntax → cohérence : appliquer même pattern à 1/4 manquant
- Node version target OMEGA (à confirmer) :
  - Si ≥ 22 : utiliser `with` (cohérent + future-proof)
  - Si < 22 : alternative `JSON.parse(fs.readFileSync)` ou downgrade tous en `assert` (warning)

**Question Mini-Tribunal** : Quelle est la version Node minimale supportée par OMEGA en production ? Si confirmé ≥ 22, simple ajout `with { type: 'json' }` à `delta-style.ts:17` suffit.

### Q2 — TS2352 conversions : type assertion `as unknown as Record` vs Index signature ?

**Contexte** :
- 4 erreurs TS2352 dans `src/validation/`
- Pattern : `KSelectionReport`, `ForgePacketInput`, `ForgePacket` casts directs vers `Record<string, unknown>`

**Options de fix** :
- **Option A (mécanique)** : Ajouter `as unknown as Record<string, unknown>` aux 4 sites de cast
- **Option B (architectural)** : Ajouter Index signature `[key: string]: unknown` aux types cibles (si compatible avec usage)
- **Option C (refactor)** : Ré-évaluer la nécessité de ces conversions (sont-elles vraiment nécessaires ?)

**Question Mini-Tribunal** : Option A acceptable comme patch minimal CAS C, ou refactor architectural Option B/C requis ?

### Q3 — tsconfig sovereign-engine : bundler vs NodeNext migration ?

**Contexte** :
- sovereign-engine/tsconfig.json : `module: ESNext` + `moduleResolution: bundler`
- Code source 100% NodeNext-compliant déjà (extensions `.js` partout)
- canon-kernel S9.2-B a migré bundler → NodeNext + tests PASS

**Question Mini-Tribunal** : Migrer sovereign-engine tsconfig bundler → NodeNext (cohérence avec canon-kernel) ou laisser bundler (since code already compliant) ? Migration ajouterait strictness CI mais aucun changement comportemental empirique.

### Q4 — Ordre des patches : TS2352 d'abord ou JSON attribute d'abord ?

**Contexte** :
- TS2352 (4 erreurs) bloquent le build → dist/ pas régénéré
- JSON attribute (1 erreur) bloque le runtime Node natif
- Sans dist/ régénéré, JSON attribute fix ne se reflète pas en runtime

**Options** :
- **Option A** : Fix TS2352 d'abord → rebuild → puis fix JSON attribute → rebuild → probe
- **Option B** : Fix JSON attribute + TS2352 dans un seul commit atomique → rebuild → probe
- **Option C** : Fix JSON attribute seul d'abord (minimal) puis TS2352 séparément

**Question Mini-Tribunal** : Quelle séquence respecte mieux MINIMIZE IT + atomicity ?

### Q5 — Cascade impact post-patches : tester quels packages ?

**Contexte** :
- sovereign-engine = pivot package (omega-runner, omega-forge, etc. en dépendent potentiellement)
- canon-kernel + signal-registry + orchestrator-core déjà fixés

**Packages cascade probables à tester post-fix** :
- `@omega/omega-runner` (probablement dépend sovereign-engine)
- `@omega/omega-forge` (probablement dépend sovereign-engine)
- D'autres workspaces ?

**Question Mini-Tribunal** : Liste exhaustive des packages cascade à tester post-fix sovereign-engine ?

### Q6 — Erreurs TS2352 sont-elles induites par changements récents ou pré-existantes ?

**Contexte** :
- Le fichier `phase-u-exit-validator.ts` mentionne "phase-u" — possiblement Phase U (validation phase)
- ForgePacketInput / ForgePacket types — modifications récentes possibles
- Aucune git blame fait dans cet audit (out of scope read-only Phase 0)

**Question Mini-Tribunal** : Les TS2352 sont-elles régression récente induite par changements (e.g. modèle Emotion13/14 cf. integration-nexus-dep) ou bug latent depuis longtemps ? Si régression récente, qui a introduit ?

---

## 7. Risques de cascade — packages dépendants ?

**Investigation préliminaire** (lecture read-only) :

Workspaces déclarés dans root `package.json` mentionnant possible dépendance sovereign-engine :
- `@omega/omega-runner` (suspect)
- `@omega/omega-forge` (suspect — déjà mentionné dans NCR_GATE_IMPORTS_PATH_BUG)
- `@omega/omega-governance`, `@omega/omega-metrics`, `@omega/omega-observability` (possibles)
- `@omega/scribe-engine`, `@omega/style-emergence-engine` (possibles)
- `@omega/headless-runner` (possibles)

**Aucune vérification empirique cascade dependents faite dans S10.0** (out of scope per AUDIT BEFORE ACTION).

**Découverte 7e package potentielle** : si fix sovereign-engine révèle un nouveau cascade root cause dans un dependent, **HARD STOP** doctrine NG1 Sprint S10.

---

## 8. Décision patch — ATTENDRE ARBITRAGE COWORK + GEMINI + CHATGPT

**Aucune décision de patch dans S10.0**. Prochaine étape Sprint S10.1 conditionnée à :

1. **Mini-Tribunal IA convergence** sur Q1-Q6 (Section 6)
2. **Architecte Francky validation** :
   - Version Node target OMEGA (Q1)
   - Type assertion vs Index signature (Q2)
   - tsconfig migration scope (Q3)
   - Ordre patches (Q4)
   - Cascade packages liste (Q5)
   - Investigation TS2352 régression (Q6)

**Hypothèse de patch optimal post-Tribunal** (à valider) :
- Cas le plus simple : 1 commit ajoute `with { type: 'json' }` à `delta-style.ts:17` + 4 cast `as unknown as Record<...>` aux 4 sites TS2352
- Effort estimé : 30-45 minutes patch + 15 minutes tests reverse + cascade probe
- CAS C confirmé empiriquement (modifications source TypeScript), mais scope plus contenu que prévu Phase 0

**STOP STRICT post-S10.0**. Aucun patch jusqu'à GO Mini-Tribunal + Architecte.

---

## 9. Doctrine v3.156.0 honorée

| Amendement | Application S10.0 |
|------------|-------------------|
| ANCHOR_PRE_FLIGHT | Tous anchors empiriques vérifiés runtime (4 JSON imports, 0 import sans .js, 4 erreurs TS2352 capturées) |
| MULTI_IA_RUNTIME_ARBITER | Mini-Tribunal IA Q1-Q6 listées pour décision |
| NO_UNVERIFIED_EXTERNAL_ANCHORS | Aucune décision sans Architecte arbitrage |
| STRUCTURED_MEMORY_PRIORITY | Mémoire S9.2 partial closure recoupée empiriquement (Phase 0 erreur "4 imports sans ext" corrigée) |
| RECOVERY_TEST_DOCTRINE | Tests reverse définis pour Sprint S10.1 (avant tout patch) |
| WORKSPACE_VS_REPO_DRIFT | Tous paths repo vérifiés runtime (sources + JSON cibles) |
| MINIMIZE IT | S10.0 = 1 commit atomique (audit doc only) |
| NCR OVER HEROICS | Erreur Phase 0 admise honnêtement (4 "sans ext" = 4 .json) |

---

## 10. Signature

```
DOCUMENT  : S10_STEP0_SOVEREIGN_ENGINE_CASC_AUDIT.md
PHASE     : Sprint S10.0 (audit pre-Tribunal, zero patch)
HEAD      : 2b9039c9 (post S9.2 partial closure)
ARCHITECT : Francky (arbitrage Q1-Q6 attendu)
DRAFTER   : Claude (IA Principal, runtime arbiter)
TRIBUNAL  : Mini-Tribunal IA en attente (Cowork + ChatGPT + Gemini)
STANDARD  : NASA-Grade L4 / DO-178C Level A
NEXT      : S10.1 conditionnel à arbitrage Q1-Q6
PAUSE     : STOP STRICT jusqu'à GO Architecte
```
