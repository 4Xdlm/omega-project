# NCR_ESM_BUNDLER_VS_NODE_RUNTIME

**ID** : NCR_ESM_BUNDLER_VS_NODE_RUNTIME
**Title** : Divergence comportementale entre bundler resolution (esbuild/tsx) et Node ESM strict — packages workspace potentiellement cassés en prod
**Status** : **OPEN** (DRAFT 2026-04-27, audit S6.2)
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
STATUS    : OPEN — résolution S6.2
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
