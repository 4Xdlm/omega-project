# NCR_ESM_BUNDLER_VS_NODE_RUNTIME

**ID** : NCR_ESM_BUNDLER_VS_NODE_RUNTIME
**Title** : Divergence comportementale entre bundler resolution (esbuild/tsx) et Node ESM strict — packages workspace potentiellement cassés en prod
**Status** : **STILL_OPEN** (Sprint S8 Vague 2 reconfirmation 2026-05-01 — H1 EMPIRIQUEMENT CONFIRMÉE, fix non appliqué)
**Severity** : P1 — bugs latents non détectables par gates actuels
**Priority** : P1
**Opened** : 2026-04-27 (Tribunal 3-IA)
**Owner** : Francky + Claude
**Liens** : `NCR_GATE_IMPORTS_BUNDLER_BLINDNESS` (jumeau orienté gate), mission S6.2

---

## 1. Issue

Le repo OMEGA utilise plusieurs runners JS :

| Contexte | Runtime | Resolution |
|----------|---------|------------|
| Tests vitest | esbuild via vitest | bundler |
| Scripts dev `npx tsx` | esbuild via tsx | bundler |
| Production `node` | Node natif | ESM strict |
| CI (selon job) | mix tsx + node | divergent |

Les règles de résolution diffèrent significativement :

| Règle | esbuild/tsx | Node ESM strict |
|-------|-------------|-----------------|
| Import sans extension `from './foo'` | OK (infère .ts/.js) | **FAIL** (`ERR_MODULE_NOT_FOUND`) |
| Import dossier `from './foo'` (= `./foo/index.js`) | OK | **FAIL** (sans `exports` map) |
| Import `package.json#main` | OK | OK si présent |
| Import sub-path `from 'pkg/internal'` | OK | **FAIL** sauf si dans `exports` map |
| `__dirname` / `__filename` | Polyfilled par tsx | **N'EXISTE PAS** en ESM (utiliser `import.meta.url`) |

**Conséquence** : un package qui passe les tests/gates sous tsx peut crasher
en production sous Node natif.

## 2. Preuves

### 2.1 Comportement attendu Node ESM strict

```
$ node --input-type=module -e "import './pkg/index.js'"  # OK si fichier existe
$ node --input-type=module -e "import './pkg'"            # FAIL ERR_MODULE_NOT_FOUND
$ node --input-type=module -e "import './pkg/'"           # FAIL ERR_UNSUPPORTED_DIR_IMPORT
```

### 2.2 Comportement tsx tolérant

```
$ npx tsx -e "import('./pkg')"     # OK (infère)
$ npx tsx -e "import('./pkg/')"    # OK (infère index)
```

### 2.3 Périmètre repo OMEGA (à auditer S6.2)

Suspects à vérifier :
- `@omega/canon-kernel` (mentionné Tribunal — patch ESM séparé en S6.2)
- Tous packages avec `"type": "module"` dans package.json
- Tous packages avec re-exports profonds (`export * from './internal/...'`)
- Tous packages avec `dist/` mais sans `exports` map

Audit non encore réalisé (scope hors S6.1).

## 3. Cause racine

Choix de DX (Developer Experience) :
- esbuild/tsx applique bundler resolution pour vélocité dev
- Tooling moderne (vitest, tsx, jest) suit ce pattern
- Node maintient strict ESM pour conformité spec WHATWG

Aucun runner de gate actuel n'utilise Node strict pour valider les builds.

## 4. Impact

### 4.1 Production silencieusement cassée

Un package importé sous tsx en dev/CI peut crasher en prod sous Node :
- Daemons OMEGA exécutés sous `node dist/index.js`
- Workers spawned via `child_process.fork`
- Workers Node.js dans cloud functions

### 4.2 Faux verdict des gates

`gate:imports` (S6.1 fixed pour CWD, mais reste tsx-only) ne capte pas.
`vitest run` ne capte pas (esbuild).
`tsc --noEmit` capte certains cas (resolveJsonModule, etc.) mais pas tous.

### 4.3 Coût de découverte différée

Bug détecté seulement à la première invocation Node de production = coût élevé
(rollback, re-build, hotfix, perte de SLO).

## 5. Hypothèses

### 5.1 H1 — `@omega/canon-kernel` non conforme ESM Node

Le Tribunal a spécifiquement noté que canon-kernel pourrait nécessiter un
patch ESM. Hypothèse à vérifier : imports relatifs sans extension dans
`dist/canon-kernel/...`.

**Test S6.2** : `node --input-type=module -e "import '@omega/canon-kernel'"`.

### 5.2 H2 — D'autres packages affectés

Hypothèse : la convention TS dans OMEGA est `from './foo.js'` (avec
extension), mais des oublis peuvent subsister.

**Audit S6.2** : grep `from '\.\.\?/[^']*[^.js']'` dans tous `packages/*/dist`.

## 6. Options de résolution (S6.2)

### Option A — Audit + fix au cas par cas

**Description** : grep tous les imports sans extension dans `dist/`, patcher
au cas par cas. Probablement coupling avec un audit `tsconfig.json` pour
imposer extensions.

**Effort** : 2-4h selon nombre de fichiers.

### Option B — Imposer `moduleResolution: NodeNext` partout

**Description** : config TS `moduleResolution: NodeNext` exige extensions
explicites. Régénère tous les `dist/` avec imports compliants.

**Effort** : 1h config + re-build cascade.

### Option C — Tooling : `node --experimental-loader esbuild-register`

**Description** : utiliser un loader Node qui résout comme esbuild — masque
le problème mais ne le résout pas.

**Statut** : REJETÉ (masque la dette technique au lieu de la résoudre).

## 7. Recommandation

**Option B (NodeNext)** pour conformité long-terme + **Option A audit
ponctuel** pour le scope critique S6.2 (canon-kernel d'abord).

Pas d'application immédiate. Prérequis : NCR_GATE_IMPORTS_BUNDLER_BLINDNESS
résolu (Test 4 spawn node) pour avoir un détecteur automatisé.

## 8. Plan d'action

| # | Action | Owner | Sprint | Statut |
|---|--------|-------|--------|--------|
| 1 | Drafter ce NCR | Claude | S6.1 | **DONE** |
| 2 | Audit `dist/*` pour imports sans extension | Claude | S6.2 | PENDING |
| 3 | Décision Option A/B Architecte | Francky | S6.2 | PENDING |
| 4 | Patch canon-kernel ESM (si Option A) | Claude | S6.2 | PENDING |
| 5 | Migration NodeNext (si Option B) | Claude | S6.2+ | PENDING |

## 9. Traçabilité

- **NCR jumeau (gate-side)** : `NCR_GATE_IMPORTS_BUNDLER_BLINDNESS.md`
- **Mission de résolution** : S6.2 (post-S7, à cadrer par Architecte)
- **Hotfix S6.1** : `nexus/proof/S6_1_GATE_IMPORTS_HOTFIX/01_S6_1_REPORT.md`

## 10. Signature

```
NCR-ID    : NCR_ESM_BUNDLER_VS_NODE_RUNTIME
OPENED    : 2026-04-27 (Tribunal 3-IA)
STATUS    : STILL_OPEN — H1 EMPIRIQUEMENT CONFIRMÉE 2026-05-01 (Sprint S8 Vague 2)
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```

---

## 11. Reconfirmation empirique + confirmation H1 (Sprint S8 Vague 2, 2026-05-01)

### 11.1 Vérifications empiriques runtime

| Test | Commande | Résultat |
|------|----------|----------|
| EMP-1 | `Get-Content tsconfig.json` filtre moduleResolution | **`moduleResolution: "bundler"`** (racine) |
| EMP-2 | `Get-Content packages/canon-kernel/tsconfig.json` filtre moduleResolution | **`moduleResolution: "bundler"`** (canon-kernel idem) |
| EMP-3 | grep `from '\./|from '\.\./` dans `packages/canon-kernel/dist/*.js` | **Imports SANS extension détectés** : `export * from './types'`, `export * from './id'`, `export * from './hash'`, `export * from './schema'` |
| EMP-4 | `git log --all --grep "ESM|NodeNext|canon-kernel.*patch"` | **0 commit** post-S6.1 |
| EMP-5 | Recherche tests `*node-native*` ou `*esm-runtime*` | **0 fichier** trouvé |

### 11.2 Confirmation empirique H1 (§5.1)

**Hypothèse H1** : *"`@omega/canon-kernel` non conforme ESM Node — imports relatifs sans extension dans dist/canon-kernel/..."*

**Statut** : **EMPIRIQUEMENT CONFIRMÉE** par EMP-3.

L'extrait observable de `packages/canon-kernel/dist/index.js` (lecture 2026-05-01) :

```javascript
export * from './types';      // ❌ FAIL Node ESM strict
export * from './id';         // ❌ FAIL Node ESM strict
export * from './hash';       // ❌ FAIL Node ESM strict
export * from './schema';     // ❌ FAIL Node ESM strict
```

Ces imports sans extension `.js` provoquent `ERR_MODULE_NOT_FOUND` sous
`node --input-type=module`. Ils passent sous tsx/esbuild par bundler resolution.

→ **`@omega/canon-kernel` est aujourd'hui empiriquement non-importable
sous Node ESM strict.** Toute exécution prod direct via Node natif
crasherait sur le premier `import '@omega/canon-kernel'`.

### 11.3 État du plan §8

| # | Action | Statut S6.1 | Statut 2026-05-01 |
|---|--------|-------------|-------------------|
| 1 | Drafter ce NCR | DONE | DONE |
| 2 | Audit `dist/*` pour imports sans extension | PENDING | **PARTIELLEMENT FAIT** (canon-kernel échantillon EMP-3) |
| 3 | Décision Option A/B Architecte | PENDING | **PENDING (4 jours sans avancée)** |
| 4 | Patch canon-kernel ESM (Option A) | PENDING | **PENDING — H1 confirmée, patch URGENT** |
| 5 | Migration NodeNext (Option B) | PENDING | **PENDING** |

### 11.4 Critères STILL_OPEN justifiés

| Critère RESOLVED | État |
|------------------|------|
| Option A (audit + fix canon-kernel) appliquée | ❌ EMP-3 confirme imports cassés présents |
| Option B (NodeNext) appliquée | ❌ EMP-1/2 confirment "bundler" partout |
| Tests Node natif runtime ajoutés | ❌ EMP-5 aucun fichier trouvé |
| Architecte décision Option A/B tracée | ❌ EMP-4 aucun commit |
| Périmètre exhaustif audit dist/ | ❌ Seul canon-kernel échantillonné (autres 15 packages buildés non audités) |

→ Aucun critère RESOLVED satisfait. Status **STILL_OPEN**.

### 11.5 Severity reconsidérée

P1 (au header) **maintenu** mais avec note d'urgence accentuée :

> **NOUVELLE ACCENTUATION 2026-05-01** : H1 n'est plus une hypothèse,
> c'est un fait empirique. `canon-kernel` est cassé sous Node ESM strict.
> Toute migration prod vers exécution Node native (cloud functions,
> daemons sans tsx, workers Node) **crashera** au premier import.
> Le mitigant actuel est l'usage exclusif de tsx/esbuild en prod, ce qui
> est un workaround coûteux et non-doctrinal.

### 11.6 Risques restants

- **R1 — canon-kernel non-importable Node natif (CONFIRMÉ EMP-3)** :
  bug latent prêt à se déclencher dès toute migration runtime hors-tsx.
- **R2 — Périmètre des autres 15 packages BUILT non audité** : combien
  d'autres packages contiennent le même pattern ? Inconnu.
- **R3 — Décision Architecte PENDING depuis 4 jours** : §8 #3 bloque #4
  et #5.
- **R4 — `gate:imports` (jumeau NCR_GATE_IMPORTS_BUNDLER_BLINDNESS)
  toujours aveugle** : aucun outil automatisé ne détecte ces bugs
  aujourd'hui dans la CI.

### 11.7 Closure officielle

```
RECONFIRMATION EMPIRIQUE NCR_ESM_BUNDLER_VS_NODE_RUNTIME
=========================================================
Date            : 2026-05-01 (Sprint S8 Vague 2)
Status final    : STILL_OPEN — H1 EMPIRIQUEMENT CONFIRMÉE
                  (transition OPEN → STILL_OPEN avec accentuation P1)
Authority       : Claude Code (runtime arbiter Sprint S8 Vague 2)
                  + Francky décisionnaire pour §8 #3 (Option A/B)
Evidence anchor : EMP-1..EMP-5 — moduleResolution "bundler" partout,
                  4 imports sans extension détectés dans canon-kernel/dist,
                  0 commit fix post-S6.1, 0 test Node natif
Scope           : Divergence bundler vs ESM Node confirmée empiriquement,
                  canon-kernel non-importable Node natif aujourd'hui
Risks           : R1 canon-kernel bug latent CONFIRMÉ, R2 audit autres
                  packages non fait, R3 décision Architecte PENDING,
                  R4 gate:imports aveugle
Recommandation  : décision Architecte Sprint S9+ §8 #3 (Option B NodeNext
                  + Option A patch canon-kernel ponctuel) — débloquer
                  #4 et #5 simultanément vu confirmation empirique H1
Doctrine        : NCR jumeau NCR_GATE_IMPORTS_BUNDLER_BLINDNESS doit
                  être résolu en parallèle (Test 4 spawn node = détecteur
                  automatisé pour valider patch ESM)
```
