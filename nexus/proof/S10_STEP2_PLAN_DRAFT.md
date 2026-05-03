# Sprint S10.2 Plan DRAFT

**Date drafted** : 2026-05-03 (Sprint S10.1 partial closure)
**Status** : DRAFT (en attente arbitrage Architecte avant exécution)
**Source** : Mini-Tribunal IA + Architecte Francky
**Standard** : NASA-Grade L4 / DO-178C Level A
**Doctrine** : v3.156.0
**Prerequisites** : Sprint S10.1 partial closure (4 commits, 5 TS2352 sites + JSON fixed, tag `phase-s-s10-step1-sovereign-engine-cas-c-partial-2026-05-03`)

---

## 1. Mission Sprint S10.2

Compléter la refonte CAS C sovereign-engine en traitant les 3 errors résiduelles N1+N3+N4 révélées par cascade tsc post-S10.1, plus traiter le drift vitest CALIBRATION.

---

## 2. Scope

### 2.1 Errors résiduelles à traiter (3 packages d'errors distincts)

| # | Site | Type | Pattern | Cas estimé |
|---|------|------|---------|------------|
| **N1** | `run-dual-benchmark.ts:426` | TS2352 | readonly AxisScore[] → mutable {name, score}[] | CAS C audit |
| **N3** | `greatness-judge.ts:27` | TS2307 | Cannot find module `'../../judge-cache.js'` | Forensic + decision |
| **N4** | `run-dual-benchmark.ts:415` | TS2345 | SymbolMap undefined vs null | CAS C type fix |

### 2.2 NCR DRAFT à créer

- `NCR_VITEST_CALIBRATION_NONDETERMINISTIC_DRIFT` — drift `CALIBRATION_SEMANTIC_CORTEX.md` post-vitest

### 2.3 Hors scope S10.2

- Vitest sovereign-engine bench dédié (Sprint séparé) — hang investigation
- Refonte architecturale Option B/C (NCR_VALIDATION_TYPE_ASSERTIONS_DEBT) — Sprint S11+
- omega-segment-engine + integration-nexus-dep — Sprint S11+

---

## 3. Scope per-error détaillé

### 3.1 N1 — `run-dual-benchmark.ts:426` TS2352 readonly AxisScore

**Pattern** :
```typescript
// run-dual-benchmark.ts:388, 392, 396, 426 (4 sites identifiés post-build)
... as { name: string; score: number; }[]  // TS2352 — readonly violation
```

**Note** : N1 a en fait **4 sites** (388, 392, 396, 426) révélés post-S10.1-C build, pas seulement 426 mentionné initialement.

**Audit empirique requis** :
- Lire `run-dual-benchmark.ts` lignes 380-430 pour comprendre contexte
- Identifier type AxisScore et pourquoi readonly variance échoue
- Mini-Tribunal IA dédié sur stratégie fix :
  - Option A : `as unknown as {name, score}[]` (cast forcé, perd readonly)
  - Option B : Spread `[...readonlyArray]` (copie mutable)
  - Option C : Refactor pour accepter readonly type partout

**Estimation** : 2-3h (audit + Mini-Tribunal + patch + tests)

### 3.2 N3 — `greatness-judge.ts:27` TS2307 missing module

**Pattern** :
```typescript
// greatness-judge.ts:27
import { ... } from '../../judge-cache.js';  // FILE DOES NOT EXIST
```

**Forensic empirique requis** :
```bash
# Étapes investigation
git log --follow --all -- packages/sovereign-engine/src/judge-cache.ts
git log --follow --all -- packages/sovereign-engine/src/judge-cache.js
git log --diff-filter=D --name-only -- "**/judge-cache*"
git log --all --oneline --grep "judge-cache"
grep -r "judge-cache" packages/sovereign-engine/ --include="*.ts"
```

**Décisions possibles** :
- Si fichier supprimé recently → restaurer depuis git history
- Si fichier jamais existé → identifier ce qui devrait y être (audit imports usage)
- Si fichier renommé → corriger import path
- Si module obsolète → supprimer l'import et refactor greatness-judge.ts

**Estimation** : 2-4h (selon résultat forensique)

### 3.3 N4 — `run-dual-benchmark.ts:415` TS2345 SymbolMap

**Pattern** :
```typescript
// run-dual-benchmark.ts:415
... // Argument SymbolMap | undefined not assignable to SymbolMap | null
```

**Audit empirique requis** :
- Lire `run-dual-benchmark.ts:410-420` pour contexte
- Identifier type SymbolMap (probable import depuis types.ts ou autre)
- Stratégie fix probable :
  - Convert `undefined` → `null` à la source (simple fix)
  - Accept both : modifier signature target pour accepter `undefined`
  - Refactor : utiliser une seule convention (null OU undefined)

**Estimation** : 1-2h (probable patch simple)

### 3.4 Drift vitest — NCR_VITEST_CALIBRATION_NONDETERMINISTIC_DRIFT

**Observation S10.1-B** :
- vitest run modifie `CALIBRATION_SEMANTIC_CORTEX.md` (calibration scores +1.0 non-déterministe)
- Drift reverted manuellement S10.1

**Investigation** :
- Identifier source non-déterminisme (random seed manquant ? timing ? cache ?)
- Décision : ne pas tracker le fichier (.gitignore) OU rendre déterministe OU séparer report tests vs report committé

**Estimation** : 1-2h (investigation + NCR)

---

## 4. No-go conditions Sprint S10.2

| # | Condition | Action si déclenché |
|---|-----------|---------------------|
| **NG1** | Découverte 7e package non listé dans scope | HARD STOP, Mini-Tribunal pour décision |
| **NG2** | judge-cache.js implique architecture refactor majeure | DEFERRED Sprint dédié |
| **NG3** | N1 fix nécessite refactor type AxisScore globale | DEFERRED Sprint dédié |
| **NG4** | Vitest drift NCR révèle issue plus large (test infrastructure) | Sprint dédié séparé |
| **NG5** | Decision Architecte non disponible pour N3 (créer / restaurer / supprimer) | Skip N3, traiter N1+N4 |
| **NG6** | Build sovereign-engine FAIL sur ENCORE de nouvelles errors post-fix N1+N3+N4 | Cascade peeling continue, Mini-Tribunal arbitrage |

---

## 5. Protocole de preuve (per error)

Pour chaque error N1, N3, N4 :

### 5.1 Phase A — Audit empirique (lecture seule)

1. Read fichier source contexte (10-20 lignes autour de l'erreur)
2. Identifier types impliqués (lire types.ts si nécessaire)
3. git blame pour timeline + auteur + commit origine
4. Probe baseline : `npm run build --workspace=packages/sovereign-engine` (capturer error exacte)

### 5.2 Phase B — Mini-Tribunal IA (si nécessaire)

Pour N1 et N3 (cas complexes) :
- Q1 : Cause racine (régression vs latent vs intentionnel) ?
- Q2 : Fix strategy (Option A scoped vs B refactor vs C delete) ?
- Q3 : Impact cascade (autres consommateurs affectés ?)
- Q4 : Tests requirements post-fix ?

### 5.3 Phase C — Patch + tests reverse

1. Apply patch (atomic per error, MINIMIZE IT)
2. Rebuild : `npm run build --workspace=packages/sovereign-engine` → SUCCESS attendu
3. Probe Node native : `node -e "import('@omega/sovereign-engine')..."` → OK keys=56 attendu (no regression)
4. gate:imports : `npm run gate:imports` → PASS attendu (no regression)

### 5.4 Phase D — Commit atomique

1 error = 1 commit atomique (si possible).

Stage strict obligatoire.

---

## 6. Ordre proposé Sprint S10.2

### 6.1 Recommandation : N4 → N1 → N3

**Rationale** :
1. **N4 (SymbolMap)** : probable patch simple, débloque rapidement
2. **N1 (readonly AxisScore)** : Mini-Tribunal IA dédié, scope identifiable
3. **N3 (judge-cache.js)** : forensique inconnue, possiblement scope creep, à traiter en dernier (ou DEFERRED si trop complexe)

### 6.2 Critères PASS S10.2 global

- ✅ Build sovereign-engine SUCCESS
- ✅ Probe Node native OK keys=56 (no regression)
- ✅ gate:imports PASS
- ✅ NCR_VITEST_CALIBRATION_NONDETERMINISTIC_DRIFT créé (DRAFT minimum)

### 6.3 Critères PARTIAL PASS

- ⚠️ 2/3 errors fixées + 1 DEFERRED (e.g. N3 forensique trop lourde) → acceptable
- ⚠️ N1+N4 fixés + N3 DEFERRED Sprint dédié → acceptable

### 6.4 Critères FAIL → ROLLBACK

- ❌ Probe Node native régression (keys ≠ 56)
- ❌ gate:imports régression (PASS → FAIL)
- ❌ Cascade nouvelle cassure (autre package broken)

---

## 7. Doctrine application

| Amendement v3.156.0 | Application Sprint S10.2 |
|---------------------|--------------------------|
| ANCHOR_PRE_FLIGHT | Tous anchors empiriques vérifiés runtime, [À VÉRIFIER] markers obligatoires |
| MULTI_IA_RUNTIME_ARBITER | Mini-Tribunal IA dédié pour N1 et N3 (cas complexes) |
| NO_UNVERIFIED_EXTERNAL_ANCHORS | Probe Node native + gate:imports + tests reverse pre-commit |
| STRUCTURED_MEMORY_PRIORITY | Mémoire S10.1 partial closure guide S10.2 |
| RECOVERY_TEST_DOCTRINE | Probes équivalentes vitest (vitest skip acceptable) |
| WORKSPACE_VS_REPO_DRIFT | Drift CALIBRATION à traiter (NCR DRAFT créé) |
| MINIMIZE IT | 1 error = 1 commit (3 commits + 1 NCR commit max) |
| NCR OVER HEROICS | N3 forensic deferred si trop lourde |

---

## 8. Risques anticipés

- **R-S10.2-1** — N3 forensique : si judge-cache.js a été supprimé delibérément, restauration peut casser autre chose. Si oublié, pourquoi ? Possible scope creep.
- **R-S10.2-2** — Cascade peeling continue : fix N1+N3+N4 peut révéler N5+N6+... (pattern S10.1-B → S10.1-C montre cascade post-batch). Doctrine NG6.
- **R-S10.2-3** — Vitest hang persistant : si vitest sovereign-engine reste hang en S10.2, RECOVERY_TEST_DOCTRINE substituée par probes (acceptable per S10.1 partial).
- **R-S10.2-4** — N1 type AxisScore refactor : si readonly variance fix nécessite modifier le type AxisScore, impact cascade sur consommateurs (NCR_VALIDATION_TYPE_ASSERTIONS_DEBT pattern parallèle).

---

## 9. Estimations effort

| Phase | Description | Estimation effort |
|-------|-------------|-------------------|
| N4 (SymbolMap) | audit + patch simple + tests | 1-2h |
| N1 (readonly AxisScore) | audit + Mini-Tribunal + patch + tests | 2-3h |
| N3 (judge-cache.js) | forensique git + decision Architecte + patch | 2-4h |
| Vitest drift NCR | investigation + NCR DRAFT | 1-2h |
| **Total** | | **6-11h Sprint S10.2** |

---

## 10. Cross-references

- `nexus/proof/S10_STEP0_SOVEREIGN_ENGINE_CASC_AUDIT.md` — Phase 0 audit
- `nexus/proof/S10_STEP1_SOVEREIGN_ENGINE_CASC_PARTIAL_REPORT.md` — closure S10.1 partial
- `nexus/proof/NCR_VALIDATION_TYPE_ASSERTIONS_DEBT.md` — 5 sites OPEN_DOCUMENTED
- `NCR_ESM_BUNDLER_VS_NODE_RUNTIME` §12 — partial FIX_VALIDATED_SCOPED

---

## 11. Signature

```
DOCUMENT  : S10_STEP2_PLAN_DRAFT.md
STATUS    : DRAFT (en attente arbitrage Architecte)
PHASE     : Sprint S10.2 plan (continuation S10.1 partial)
HEAD      : 46959558 (post S10.1-C)
TAG       : phase-s-s10-step1-sovereign-engine-cas-c-partial-2026-05-03 (à créer post-validation)
ARCHITECT : Francky (décision N3 forensique + ordre exécution)
DRAFTER   : Claude (IA Principal, runtime arbiter)
TRIBUNAL  : Cowork + ChatGPT + Gemini + Claude (Mini-Tribunal pour N1/N3)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
