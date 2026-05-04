# Sprint S10.2.0 — N3 Forensique `judge-cache.js`

**Date** : 2026-05-04
**Sprint** : S10.2.0 (audit-only, pre-tribunal)
**Standard** : NASA-Grade L4 / DO-178C Level A
**Doctrine** : v3.156.0 (AUDIT BEFORE ACTION + ANCHOR_PRE_FLIGHT + NO_UNVERIFIED_EXTERNAL_ANCHORS)
**HEAD entrée** : `bde1c343` (post-S10.1 partial closure)
**Branch** : `phase-r-dispatcher-v33`
**Auteur** : Claude (IA Principal, runtime arbiter)
**Statut** : RAPPORT EMPIRIQUE — ZÉRO patch code, ZÉRO push, attente Mini-Tribunal

---

## 1. Étape 0 — Préflight (lecture seule)

### 1.1 Anchor empirique `greatness-judge.ts:27`

```
File path  : packages/sovereign-engine/src/validation/phase-u/greatness-judge.ts
Line 27    : import type { JudgeCache, JudgeResult } from '../../judge-cache.js';
```

Résolution attendue selon ESM Node strict :
- Base directory : `packages/sovereign-engine/src/validation/phase-u/`
- `../../` (2 levels up) = `packages/sovereign-engine/src/`
- Chemin résolu attendu : `packages/sovereign-engine/src/judge-cache.js`

### 1.2 Arborescence `validation/phase-u/` (Glob)

```
packages/sovereign-engine/src/validation/phase-u/greatness-judge.ts
packages/sovereign-engine/src/validation/phase-u/polish-engine.ts
packages/sovereign-engine/src/validation/phase-u/phase-u-exit-validator.ts
packages/sovereign-engine/src/validation/phase-u/top-k-selection.ts
```

Note : sous-dossier `phase-u/benchmark/` également présent (cf. §3).

### 1.3 Arborescence `validation/` (Glob)

```
packages/sovereign-engine/src/validation/judge-cache.ts          ← FICHIER PRÉSENT
packages/sovereign-engine/src/validation/validation-types.ts
packages/sovereign-engine/src/validation/mock-llm-provider.ts
packages/sovereign-engine/src/validation/validation-runner.ts
packages/sovereign-engine/src/validation/damage-gate.ts
packages/sovereign-engine/src/validation/prose-directive-builder.ts
packages/sovereign-engine/src/validation/real-llm-provider.ts
```

**Constat empirique préflight** : `judge-cache.ts` existe à
`packages/sovereign-engine/src/validation/judge-cache.ts`, **PAS** au chemin
résolu attendu `packages/sovereign-engine/src/judge-cache.js`.

### 1.4 Cross-ref `S10_STEP2_PLAN_DRAFT.md`

§3.2 (N3) anticipait 4 hypothèses :
- supprimé recently → restaurer
- jamais existé → créer
- renommé → corriger import path
- module obsolète → supprimer import

Hypothèse complémentaire H5 (typo path) non listée en draft.

### 1.5 Cross-ref `NCR_ESM_BUNDLER_VS_NODE_RUNTIME`

Pertinence : §11.2 (H1 confirmée) montre que sous tsx/esbuild, imports
sans extension fonctionnent par bundler resolution. Sous Node ESM strict,
ils échouent. **Inférence** : un import à chemin relatif erroné peut être
resté silencieux historiquement (esbuild/tsx tolérant) et n'apparaît
qu'aujourd'hui en TS2307 sous tsc strict (post-S10.1 NodeNext-style
résolution).

---

## 2. Étape 1 — Audit existence (Test-Path)

| Chemin candidat | Existe ? | Notes |
|-----------------|----------|-------|
| `packages/sovereign-engine/src/validation/judge-cache.ts` | **OUI** | Fichier présent, contenu lisible (60 premières lignes lues — header + interface `JudgeResult` + class `JudgeCache`) |
| `packages/sovereign-engine/src/validation/judge-cache.js` | NON | Pas d'artefact compilé tracké dans src/ |
| `packages/sovereign-engine/src/validation/phase-u/judge-cache.ts` | NON | Pas dans phase-u/ |
| `packages/sovereign-engine/src/judge-cache.ts` | NON | **Chemin résolu attendu de l'import line 27 — n'existe pas** |
| `packages/sovereign-engine/src/judge-cache.js` | NON | Idem |

### 2.1 Contenu `validation/judge-cache.ts` (extrait)

```typescript
// Module: validation/judge-cache.ts (header)
// Version: 1.0.0
// Standard: NASA-Grade L4 / DO-178C Level A
// SHA256-keyed cache for LLM judge results.

export interface JudgeResult {
  readonly score: number;
  readonly reason: string;
}

export class JudgeCache {
  private readonly store: Map<string, JudgeResult>;
  // ...
}
```

Le fichier exporte exactement `JudgeCache` et `JudgeResult` — symboles
référencés par l'import erroné de `greatness-judge.ts:27`.

**Verdict Étape 1** : fichier cible **EXISTE** mais **PAS** au chemin
auquel l'import résout. Il s'agit d'un import à chemin relatif erroné,
**pas** d'un fichier manquant.

---

## 3. Étape 2 — Forensique git

### 3.1 Historique global `judge-cache.*`

```
$ git log --all --oneline -- "**/judge-cache.*"

50c92150 docs: SESSION_SAVE 2026-03-15 — V-PARTITION complete + Scribe Orchestre plan
75f2eebf docs: SESSION_SAVE 2026-03-15 — V-PARTITION complete + Scribe Orchestre plan
fb9a771d [PHASE-T][W5b] E1 multi-prompt runner — 3 étages plan+scenes+checksum
3895f496 [PHASE-T][W1] LOT1-04 REJETÉ — LOT1-01/02/03 ADOPTÉS — SEAL 40.0%
d1987226 feat(validation): Phase S — 300 runs complets [PHASE-S-FINAL]
dbb7260a feat(oracle): tension_14d judge harness calibré L4
4947df6e feat(assembler): ProseDirectiveBuilder 14D→directives narratives
4248f613 feat(oracle): densite_sensorielle LLM-judge
4e2e5c44 feat(oracle): S-ORACLE V2 LLM-judges réels [interiorite+impact+necessite] +
         judge-cache SHA256 + goldens 14D recalibrés [INV-VAL-01..07]
```

### 3.2 Filtres D / R / A (deletions / renames / additions)

```
$ git log --all --diff-filter=D --oneline -- "**/judge-cache.*"
(0 résultats)

$ git log --all --diff-filter=R --oneline -- "**/judge-cache.*"
(0 résultats)

$ git log --all --diff-filter=A --oneline -- "**/judge-cache.*"
4248f613 feat(oracle): densite_sensorielle LLM-judge ...
4e2e5c44 feat(oracle): S-ORACLE V2 LLM-judges réels ... + judge-cache SHA256 ...
```

**Constat** : zéro suppression, zéro rename. Le fichier a été créé une
seule fois (commit `4e2e5c44`) et n'a jamais bougé.

### 3.3 Timeline `--follow` du fichier qui importe

```
$ git log --follow --oneline packages/sovereign-engine/src/validation/phase-u/greatness-judge.ts
6af2a7ec fix(phase-u): U-ROSETTE-03 — resilience judge + prompt align + Polish Engine v1
472a4d42 feat(judge): U-W2 GreatnessJudge v1 — 4 axes ponderes, SelectionTrace, INV-GJ-01..06
```

Le fichier `greatness-judge.ts` a été créé `2026-03-03` (`472a4d42`),
soit **après** `judge-cache.ts` créé `2026-03-?` (`4e2e5c44`).

### 3.4 git blame des 3 sites suspects + 1 site de contrôle

```
$ git blame -L 27,27 .../phase-u/greatness-judge.ts
472a4d421 (4Xdlm 2026-03-03 18:34:11 +0100 27)
  import type { JudgeCache, JudgeResult } from '../../judge-cache.js';
  ↑ broken path (2 levels up)

$ git blame -L 40,40 .../phase-u/top-k-selection.ts
87db4dc94 (4Xdlm 2026-03-03 18:40:34 +0100 40)
  import type { JudgeCache } from '../judge-cache.js';
  ↑ correct path (1 level up) — MÊME AUTEUR, 6 minutes plus tard

$ git blame -L 35,35 .../phase-u/benchmark/run-dual-benchmark.ts
3281bf9cd (4Xdlm 2026-03-03 19:31:54 +0100 35)
  import type { JudgeCache } from '../../../judge-cache.js';
  ↑ broken path (3 levels up — devrait être 2)

$ git blame -L 37,37 .../tests/validation/run-dual-benchmark.test.ts
3281bf9cd (4Xdlm 2026-03-03 19:31:54 +0100 37)
  import type { JudgeCache } from '../../src/judge-cache';
  ↑ broken path (manque segment validation/)
```

**Constat empirique critique** :
- 3 sites ont des chemins relatifs erronés introduits le **2026-03-03** par
  l'auteur `4Xdlm <elrick9@gmail.com>` (Francky).
- Le 4ème site dans le **même répertoire** que le site #1 a un chemin
  **correct**, écrit par le **même auteur 6 minutes plus tard**.
- Conclusion empirique : **typo originel par mauvais comptage de niveaux**,
  pas de régression, pas de cleanup destructif, pas de rename.

---

## 4. Étape 3 — Audit cross-package (tous les usages `judge-cache`)

| # | Fichier | Ligne | Import path | Statut |
|---|---------|-------|-------------|--------|
| 1 | `src/validation/phase-u/greatness-judge.ts` | 27 | `'../../judge-cache.js'` | **BROKEN** (2 niveaux, devrait être 1) |
| 2 | `src/validation/phase-u/top-k-selection.ts` | 40 | `'../judge-cache.js'` | OK (1 niveau) |
| 3 | `src/validation/phase-u/benchmark/run-dual-benchmark.ts` | 35 | `'../../../judge-cache.js'` | **BROKEN** (3 niveaux, devrait être 2) |
| 4 | `src/oracle/llm-judge.ts` | 22 | `'../validation/judge-cache.js'` | OK |
| 5 | `tests/validation/judge-cache.test.ts` | 16 | `'../../src/validation/judge-cache.js'` | OK |
| 6 | `tests/validation/run-dual-benchmark.test.ts` | 37 | `'../../src/judge-cache'` | **BROKEN** (manque `validation/`) |
| 7 | `tests/validation/greatness-judge.test.ts` | 27 | `'../../src/validation/judge-cache'` | OK |
| 8 | `tests/oracle/llm-judge.test.ts` | 19 | `'../../src/validation/judge-cache.js'` | OK |
| 9 | `tests/oracle/tension-judge-harness.test.ts` | 24 | `'../../src/validation/judge-cache.js'` | OK |
| 10 | `scripts/run-benchmark-phase-u.ts` | 25 | `'../src/validation/judge-cache.js'` | OK |
| 11 | `scripts/resume-benchmark-topk.ts` | 35 | `'../src/validation/judge-cache.js'` | OK |
| 12 | `scripts/run-validation.ts` | 24 | `'../src/validation/judge-cache.js'` | OK |
| 13 | `src/oracle/llm-judge.ts` | 15 | (commentaire `judge-cache.ts`) | N/A |
| 14 | `scripts/gate-imports.ts` | (n/a) | match string `judge-cache` | N/A |

**Total** : 12 imports actifs. **9 OK**, **3 BROKEN**.

Aucun import n'est cassé hors-package (`packages/genome`, `packages/canon-kernel`,
`packages/orchestrator-core`, etc. ne référencent pas `judge-cache`).

---

## 5. Hypothèses H1–H5 — Verdict empirique

| # | Hypothèse | Verdict empirique |
|---|-----------|-------------------|
| **H1** | Fichier supprimé par accident (Phase U / cleanup S6 / autre) | **REJETÉE** — `git log --diff-filter=D` retourne 0 commits. Le fichier n'a jamais été supprimé. |
| **H2** | Fichier renommé (vers quoi ?) | **REJETÉE** — `git log --diff-filter=R` retourne 0 commits. Aucun rename. |
| **H3** | Fichier jamais créé (référence orpheline) | **REJETÉE** — `git log --diff-filter=A` montre création unique en commit `4e2e5c44`. Le fichier existe et exporte exactement `JudgeCache` + `JudgeResult`. |
| **H4** | Fichier dans `.gitignore` mais existant disque | **REJETÉE** — Le fichier est tracké dans git (visible en blame, en log --follow, en diff). Pas dans `.gitignore`. |
| **H5** | Autre — chemin relatif erroné dans l'import (typo originel) | **CONFIRMÉE EMPIRIQUEMENT** — 3 sites ont des chemins avec un niveau `../` de trop, introduits le 2026-03-03 par le même auteur. Site contrôle dans le même répertoire, écrit 6min plus tard, utilise le chemin correct. |

### 5.1 Verdict consolidé

L'erreur TS2307 reportée comme `Cannot find module '../../judge-cache.js'`
**n'est pas** un fichier manquant. Le fichier `judge-cache.ts` existe, est
tracké, et est correctement importé par 9 autres consommateurs.

L'erreur est un **typo originel de chemin relatif** introduit lors de la
création initiale de 3 fichiers (greatness-judge.ts, run-dual-benchmark.ts,
run-dual-benchmark.test.ts) le 2026-03-03 par auteur 4Xdlm (Francky).

### 5.2 Pourquoi l'erreur n'apparaît qu'aujourd'hui (S10.1) ?

Hypothèse forte (à valider Mini-Tribunal) : sous tsx/esbuild bundler
resolution (cf. `NCR_ESM_BUNDLER_VS_NODE_RUNTIME` §11), les chemins
relatifs erronés peuvent avoir été silencieusement résolus par fallback
heuristique, OU les builds n'ont jamais réellement traversé ces fichiers
historiquement (couverture build partielle, tests vitest skip).

Post-S10.1, le passage en `moduleResolution: NodeNext` strict (cf. NCR
§12 closure partielle) expose ces typos comme TS2307.

---

## 6. Mini-Tribunal IA — 3 questions pour S10.2.1

### Q1 — Stratégie de fix (3 sites)

**Contexte** : 3 imports brisés, tous corrigeables par un changement
minimal de chemin relatif. Aucun nécessite création/suppression de
fichier.

**Options** :
- **Option α (atomique)** : 1 commit unique fixant les 3 sites
  `fix(sovereign-engine): correct judge-cache import paths (3 sites N3)`
  — appliquer doctrine MINIMIZE IT au plus haut niveau (1 PR cohérente).
- **Option β (per-site)** : 3 commits séparés, 1 par site
  — granularité maximale, traçabilité par site.
- **Option γ (par-pair logique)** : 2 commits — un pour le pair production
  (greatness-judge.ts + run-dual-benchmark.ts) et un pour le test
  (run-dual-benchmark.test.ts).

**Question** : Quelle option respecte le mieux MINIMIZE IT + atomicité +
RECOVERY_TEST_DOCTRINE (rebuild + probe entre commits) ?

### Q2 — Pourquoi les builds passaient historiquement ?

**Contexte** : Les 3 typos datent du 2026-03-03 (~2 mois avant S10.1).
Aucun TS2307 n'a été remonté entre 2026-03-03 et S10.1 build.

**Hypothèses non encore vérifiées empiriquement** :
- H-W1 : esbuild/tsx résolvait par bundler heuristique (cf. NCR ESM
  §11.2 H1 confirmée)
- H-W2 : tsc baseline jamais exécuté sur sovereign-engine avant S10.1
  (path skip dans tsconfig ? exclude pattern ?)
- H-W3 : runtime path mapping (alias `@omega/...`) court-circuitait la
  résolution relative

**Question** : Faut-il investiguer cette dette de gate (ouvrir NCR jumeau
`NCR_GATE_TYPO_RELATIVE_IMPORTS`) en parallèle de S10.2.1, ou différer
post-cascade complète ?

### Q3 — Gate préventif post-fix

**Contexte** : 3 typos co-existants pendant 2 mois sans détection
automatisée constituent une faille de gate cohérente avec NCR
`NCR_GATE_IMPORTS_BUNDLER_BLINDNESS`.

**Options de gate** :
- **Option I** : Étendre `gate:imports` avec validation tsc strict
  (`tsc --noEmit --moduleResolution=NodeNext`) sur tous les packages
  concernés.
- **Option II** : Probe Node natif `node --input-type=module -e "import
  '@omega/sovereign-engine'"` ajoutée au pipeline CI (validation runtime).
- **Option III** : Linter ESLint `import/no-unresolved` activé strict
  (purement statique).
- **Option IV** : DEFERRED — ne pas ajouter de gate maintenant, traiter
  comme NCR séparé Sprint S11+.

**Question** : Quelle option (ou combinaison) est doctrinalement
conforme + budget-réaliste pour S10.2 ?

---

## 7. Pas de décision patch — Stop Gate S10.2.0

Conformément au prompt S10.2.0 :
- ZÉRO patch code appliqué
- ZÉRO push effectué
- ZÉRO modification dans `greatness-judge.ts`, `run-dual-benchmark.ts`,
  `run-dual-benchmark.test.ts`
- ZÉRO modification autres fichiers

Attente Mini-Tribunal IA (Cowork + Gemini + ChatGPT + Claude) pour
arbitrage Q1/Q2/Q3 avant exécution S10.2.1.

---

## 8. Annexes empiriques

### 8.1 Commits référencés (forensique)

| Commit | Date | Description | Pertinence |
|--------|------|-------------|------------|
| `4e2e5c44` | ~2026-03 | feat(oracle): S-ORACLE V2 + judge-cache SHA256 | Création initiale `validation/judge-cache.ts` |
| `472a4d42` | 2026-03-03 18:34 | feat(judge): U-W2 GreatnessJudge v1 | Introduction typo site #1 (greatness-judge.ts:27) |
| `87db4dc9` | 2026-03-03 18:40 | (top-k-selection.ts création) | Site contrôle correct (mêmes auteur, +6min) |
| `3281bf9c` | 2026-03-03 19:31 | (run-dual-benchmark + test création) | Introduction typos sites #2 et #3 |
| `bde1c343` | 2026-05-03 | docs(s10): close partial CAS C sovereign-engine | HEAD entrée S10.2.0 |

### 8.2 Auteur unique des typos

`4Xdlm <elrick9@gmail.com>` (= Francky) — auteur des 3 sites brisés ET
du site contrôle correct dans le même paquet (top-k-selection.ts).
Empirically supports H5 typo theory : un humain peut compter
correctement les niveaux dans un fichier et incorrectement dans un
autre, le même jour.

### 8.3 Inventaire patches potentiels (chiffrage)

| Site | Patch (1 ligne) | Avant | Après |
|------|-----------------|-------|-------|
| `phase-u/greatness-judge.ts:27` | path `../../` → `../` | `from '../../judge-cache.js'` | `from '../judge-cache.js'` |
| `phase-u/benchmark/run-dual-benchmark.ts:35` | path `../../../` → `../../` | `from '../../../judge-cache.js'` | `from '../../judge-cache.js'` |
| `tests/validation/run-dual-benchmark.test.ts:37` | path ajouter `validation/` | `from '../../src/judge-cache'` | `from '../../src/validation/judge-cache'` |

Total : **3 lignes modifiées sur 3 fichiers**. Aucune création, aucune
suppression, aucun renommage.

---

## 9. Signature

```
DOCUMENT     : S10_STEP2_0_JUDGE_CACHE_FORENSIC_AUDIT.md
SPRINT       : S10.2.0 (audit-only, pre-tribunal)
STATUS       : RAPPORT EMPIRIQUE — STOP GATE attente Mini-Tribunal
HEAD entrée  : bde1c343 (post-S10.1 partial closure)
HEAD sortie  : (à fixer après commit atomique de ce rapport)
HYPOTHÈSES   : H1/H2/H3/H4 REJETÉES — H5 (typo path) EMPIRIQUEMENT CONFIRMÉE
SITES        : 3 (greatness-judge.ts:27, run-dual-benchmark.ts:35,
                 run-dual-benchmark.test.ts:37)
AUTEUR TYPO  : 4Xdlm <elrick9@gmail.com> (commits 472a4d42, 3281bf9c)
TRIBUNAL     : Cowork + Gemini + ChatGPT + Claude (Q1/Q2/Q3 ci-dessus)
ARBITRE      : Francky (Architecte) — décision finale Option α/β/γ + gate
DRAFTER      : Claude (IA Principal, runtime arbiter)
DOCTRINE     : v3.156.0 (AUDIT BEFORE ACTION + ANCHOR_PRE_FLIGHT honored)
STANDARD     : NASA-Grade L4 / DO-178C Level A
```
