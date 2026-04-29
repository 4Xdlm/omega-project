# NCR_GATE_IMPORTS_BUNDLER_BLINDNESS

**ID** : NCR_GATE_IMPORTS_BUNDLER_BLINDNESS
**Title** : `gate:imports` exécuté sous `npx tsx` (esbuild) ne détecte pas les bugs ESM Node natif (imports sans extension dans `dist/`)
**Status** : **OPEN** (DRAFT 2026-04-27, à résoudre en mission S6.2)
**Severity** : P1 — gate fonctionnellement aveugle à toute une classe de bugs runtime
**Priority** : P1
**Opened** : 2026-04-27 (Tribunal 3-IA, S6.1 préamble)
**Owner** : Francky (décide périmètre S6.2) + Claude (drafter)

---

## 1. Issue

Le gate CI `gate:imports` est invoqué sous `npx tsx` (esbuild). esbuild
applique une **bundler resolution** qui :
- Tolère les imports sans extension (`from './foo'` au lieu de `from './foo.js'`)
- Résout les imports relatifs comme TypeScript module resolution
- N'applique PAS la stricte spécification ESM Node native

En production, les modules `dist/*.js` sont chargés par **Node natif** (ESM
strict). Node ESM strict :
- EXIGE l'extension `.js` sur tous les imports relatifs
- Refuse les imports sans extension avec `ERR_MODULE_NOT_FOUND`
- Applique des règles différentes pour `package.json` exports map

**Conséquence** : un module qui importe sans extension passe le gate `tsx`
mais crash en runtime Node natif. Le gate `gate:imports` actuel **ne capte
pas cette classe de bugs**.

## 2. Preuves

### 2.1 Comportement empirique tsx vs node

Hypothèse vérifiable (à confirmer en S6.2) : tout fichier `dist/*.js` qui
contient `import { x } from './foo'` (sans `.js`) sera importable via tsx
mais échouera sous `node` :

```
# Sous tsx (passe — bundler resolution)
$ npx tsx -e "import('./packages/foo/dist/index.js')"
(no error)

# Sous node strict ESM (FAIL)
$ node --input-type=module -e "import './packages/foo/dist/index.js'"
Error [ERR_MODULE_NOT_FOUND]: Cannot find module './foo' imported from ...
```

### 2.2 Code source du gate (post-S6.1)

`scripts/gate-imports.ts` contient maintenant l'avertissement explicite :
```ts
/**
 * ⚠️ LIMITATION CONNUE — NCR_GATE_IMPORTS_BUNDLER_BLINDNESS (P1 DRAFT) :
 * Ce gate s'exécute sous `npx tsx` (esbuild = bundler resolution). Il NE PEUT
 * PAS détecter les bugs ESM Node natif (imports sans extension dans dist/).
 * Voir mission S6.2 pour Test 4 (spawn `node` strict en child_process).
 */
```

### 2.3 Convergence Tribunal

Le Tribunal 3-IA (Cowork + Gemini + ChatGPT) a explicitement mentionné cette
limitation dans le verdict S6.1, recommandant une mission S6.2 pour ajouter
un Test 4 utilisant `node` natif via `child_process.spawn`.

## 3. Hypothèses mécaniques

### 3.1 H1 — esbuild moduleResolution=bundler par défaut

esbuild applique par défaut une résolution bundler-like : extensions inférées,
fallback `index.js`, etc. Cette tolérance est intentionnelle pour DX TypeScript
mais aveugle aux contraintes ESM strict.

### 3.2 H2 — Node 18+ ESM strict ne tolère plus les `index.js` implicites

Depuis Node 16+, le mode ESM (`"type": "module"` ou `.mjs`) refuse :
- Les imports relatifs sans extension
- Le fallback automatique vers `index.js` dans un dossier
- L'absence de `exports` map dans `package.json` pour les sous-paths

Si un package du repo utilise une de ces patterns, il sera importable via tsx
mais cassé en prod.

## 4. Impact

### 4.1 Faux sens de sécurité

Le verdict "GATE IMPORTS PASS" peut masquer une production cassée. C'est le
type de bug le plus dangereux en safety-critical : faux positif sur le succès.

### 4.2 Périmètre potentiel de bugs cachés

Tous les packages du workspace OMEGA pourraient contenir cette classe de bug,
en particulier :
- `@omega/canon-kernel` (cf. NCR_ESM_BUNDLER_VS_NODE_RUNTIME P1)
- Tout package avec `dist/` généré
- Tout package avec re-exports profonds

### 4.3 CI / déploiement

Un déploiement passant le gate mais cassé à l'exécution réelle sous Node = MTBF
production dégradé silencieusement.

## 5. Options de résolution (S6.2)

### Option A — Test 4 : spawn `node` strict en child_process

**Description** : ajouter un test au gate qui spawn une instance Node native
via `child_process.spawn('node', ['-e', '...'])` et tente d'importer
`packages/sovereign-engine/dist/engine.js` (le build, pas le src).

**Effort** : 1-2h dev (gate-imports.ts).
**Bénéfice** : capture les bugs ESM Node natif.

### Option B — Imposer `node` au lieu de `tsx` pour le gate

**Description** : pré-builder TS → JS, puis exécuter le gate sous `node` natif
strict.

**Effort** : 30 min config + maintenance build du gate.
**Bénéfice** : pleine détection ESM. **Coût** : ralentit le gate (build pre-step).

### Option C — Utiliser `tsx --strict` (si disponible)

**Description** : si tsx expose un mode "strict ESM emulation", l'activer.

**Statut** : à vérifier — esbuild ne semble pas exposer un tel flag à ce jour.

## 6. Recommandation

**Option A retenue pour S6.2** — Test 4 child_process. Préserve la rapidité
du gate actuel tout en ajoutant la détection ESM Node natif sur les paths
critiques (engine.ts dist).

Pas d'application immédiate (S6.1 est un hotfix scope-limité). À planifier
en sprint S6.2 dédié.

## 7. Plan d'action

| # | Action | Owner | Sprint | Statut |
|---|--------|-------|--------|--------|
| 1 | Drafter ce NCR | Claude | S6.1 | **DONE** |
| 2 | Ajouter avertissement dans gate-imports.ts | Claude | S6.1 | **DONE** |
| 3 | Décision Architecte sur Option A/B/C | Francky | S6.2 | PENDING |
| 4 | Implémenter Test 4 (spawn node) | Claude | S6.2 | PENDING |
| 5 | Audit packages dist/ pour imports sans extension | Claude | S6.2 | PENDING |

## 8. Traçabilité

- **Hotfix S6.1** : `nexus/proof/S6_1_GATE_IMPORTS_HOTFIX/01_S6_1_REPORT.md`
- **Code annoté** : `scripts/gate-imports.ts` (header L.1-7)
- **NCR P0 résolu** : `NCR_GATE_IMPORTS_PATH_BUG.md`
- **NCR jumeau ESM** : `NCR_ESM_BUNDLER_VS_NODE_RUNTIME.md`
- **Mission future** : S6.2 (à planifier post-S7)

## 9. Signature

```
NCR-ID    : NCR_GATE_IMPORTS_BUNDLER_BLINDNESS
OPENED    : 2026-04-27 (Tribunal 3-IA)
STATUS    : OPEN — résolution S6.2
ARCHITECT : Francky
DRAFTER   : Claude (IA Principal)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
