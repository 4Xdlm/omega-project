# Sprint S10 Runtime ESM Phase 2 Plan

**Date drafted** : 2026-05-03 (Sprint S9 Étape 2 partial closure)
**Status** : DRAFT (en attente arbitrage Architecte avant exécution)
**Source** : Mini-Tribunal 3 IA (Gemini + ChatGPT + Cowork) + Architecte Francky
**Standard** : NASA-Grade L4 / DO-178C Level A
**Doctrine** : v3.156.0 (CLAUDE.md + SPRINT_S8_DOCTRINAL_AMENDMENTS)
**Prerequisites** : Sprint S9.2 partial closure (3/6 packages fixés, tag `phase-s-s9-step2-3packages-esm-fixed-2026-05-02`)

---

## 1. Mission Sprint S10

Compléter la refonte ESM stricte des 3 packages runtime restants
post-S9.2 partial closure. Approche **CAS C/D plus complexe** que
S9.2 (qui était CAS B/B3 mécaniques).

---

## 2. Scope

### 2.1 Packages cibles (3)

| Package | Severity | Cas estimé | Sous-bugs identifiés |
|---------|----------|------------|---------------------|
| **sovereign-engine** | P0_RUNTIME | CAS C | (1) JSON imports sans `with { type: 'json' }` (Node ≥ 22) (2) 4 imports sans `.js` (3) tsconfig bundler→NodeNext |
| **omega-segment-engine** | P0_RUNTIME | CAS C | (1) 6 duplicate identifiers `src/stream/index.ts:181-186` (2) TS2834 `src/stream/index.ts:187` (3) TS2345 SegmentMode mismatch `stream_segmenter.ts:288` |
| **integration-nexus-dep** | P0_RUNTIME | CAS C/D | (1) 4 unused declarations `scheduler.ts` (2) 2 missing 'envy' Emotion14 `module.ts:49,89` (3) 1 unused 'source' (4) 1 unused 'ExecutionTrace' |

### 2.2 Hors scope S10

- 7e package (HARD STOP doctrine sauf CAS B + Umbrella NCR validation Mini-Tribunal)
- Migration globale workspace NodeNext (HYBRIDE STRICT maintenu)
- Refactor majeur sovereign-engine (refonte architecturale = sprint dédié)
- Famille CALC bias (4 NCRs liés, refonte coordonnée séparée)
- omega-runner / omega-forge audit (cascade sovereign-engine, à re-tester post-S10)

---

## 3. No-go conditions Sprint S10

| # | Condition | Action si déclenché |
|---|-----------|---------------------|
| **NG1** | Découverte 7e package non listé dans scope | HARD STOP, NCR émergent, Mini-Tribunal pour décision |
| **NG2** | Tests baseline package cible FAIL pré-patch | STOP, investigation NCR, fix bug existant en priorité |
| **NG3** | Refactor architectural majeur nécessaire (>50 fichiers ou refonte modèle) | STOP, Sprint dédié séparé |
| **NG4** | Cascade régression cross-package post-patch (test failures induits) | ROLLBACK + STOP + NCR |
| **NG5** | Decision Architecte non disponible pour Emotion13 vs Emotion14 (integration-nexus-dep) | Skip integration-nexus-dep, traiter sovereign + omega-segment uniquement |
| **NG6** | JSON imports `with` syntax non supporté par environnement runtime cible (Node < 22) | Alternative pattern (read file + JSON.parse), pas de blocage |
| **NG7** | Working tree pollué (>15 untracked / non documentés) | Cleanup ou documentation NCR avant patch |

---

## 4. Protocole de preuve (per package)

Pour chaque package cible, suivre rigoureusement :

### 4.1 Phase A — Audit empirique (lecture seule)

1. Read package.json (type, main, types, exports, dependencies)
2. Read tsconfig.json (moduleResolution, module, extends)
3. Cartographier imports relatifs (single + double quotes, type-only, JSON)
4. Identifier dépendances internes @omega/* (cascade dependencies)
5. Probe baseline pre-patch :
   - `npm run build --workspace=packages/<pkg>` → expected SUCCESS or FAIL with specific errors
   - `node -e "import('@omega/<pkg>')..."` → expected FAIL with specific Node ESM error
   - `npm test --workspace=packages/<pkg>` → expected baseline tests count

### 4.2 Phase B — Décision empirique

Selon résultats Phase A, choisir cas :
- **CAS B** (config-only) : patch package.json uniquement, MINIMIZE IT
- **CAS C** (TS source modifications) : patch imports + types + tsconfig
- **CAS D** (decision domain) : Architecte décision avant patch (e.g. Emotion13 vs Emotion14)

Si CAS détecté hors prévision (e.g. CAS A déjà OK ou CAS D nécessitant Architecte) : STOP et rapport.

### 4.3 Phase C — Patch + tests reverse

Si CAS B/C/D autorisé :
1. Apply patch (atomic per file, MINIMIZE IT)
2. Rebuild : `npm run build --workspace=packages/<pkg>` → SUCCESS attendu
3. Probe Node native via package alias : `node -e "import('@omega/<pkg>')..."` → OK keys=N attendu
4. Probe Node native via dist direct (sanity) : OK keys=N attendu
5. Tests reverse : `npm test --workspace=packages/<pkg>` → baseline preserved (0 régression)

### 4.4 Phase D — Probe cascade

Post-patch chaque package :
- Probe sovereign-engine (pivot) : `node -e "import('@omega/sovereign-engine')..."`
- Si nouveau root cause révélé → cascade peeling continue
- Documenter découverte dans NCR émergent ou commit message

### 4.5 Phase E — Commit atomique

1 sous-phase = 1-2 commits atomiques (séparation tsconfig vs source si applicable).

Stage strict obligatoire (`git add` ciblé, jamais `-A`).

---

## 5. Ordre proposé Sprint S10

### 5.1 Recommandation : sovereign-engine en PREMIER

**Rationale** :
1. sovereign-engine = pivot package (les autres en dépendent)
2. JSON imports = nouveau root cause non encore résolu = priorité empirique
3. Cascade vers omega-runner/omega-forge dépend de sovereign-engine fixé
4. CAS C suspecté mais pattern relativement contenu (4 imports + JSON + tsconfig)

### 5.2 Ordre proposé

1. **STEP S10-A** : sovereign-engine
   - Audit JSON imports complet (combien, paths, options)
   - Décision Architecte : `with { type: 'json' }` vs `JSON.parse(fs.readFileSync)` selon Node target
   - Patch + rebuild + probe + tests
   - Cascade probe omega-runner + omega-forge (post-fix)

2. **STEP S10-B** : omega-segment-engine
   - Audit duplicate identifiers (peut être `export *` collision avec named exports)
   - Audit TS2834 + SegmentMode mismatch
   - Patch + rebuild + probe + tests
   - Cascade probe sovereign-engine si dépendance

3. **STEP S10-C** : integration-nexus-dep
   - **DÉCISION ARCHITECTE PRÉ-PATCH OBLIGATOIRE** : Emotion13 vs Emotion14 model
   - Si Emotion14 canonique + 'envy' valide → ajouter mapping
   - Si Emotion13 canonique → 'envy' à retirer (refactor source)
   - Audit unused declarations (cleanup mécanique)
   - Patch + rebuild + probe + tests

### 5.3 Ordre alternatif possible (à débat Mini-Tribunal)

**TS errors d'abord** (omega-segment + integration-nexus-dep) puis sovereign-engine :
- Plus rapide (TS errors mécaniques) avant cas C complexe
- Risque : sovereign-engine reste broken plus longtemps (impact prod)
- Avantage : si TS errors révèlent pattern transversal, on apprend avant sovereign

**Décision** : Architecte tranche.

---

## 6. Critères PASS/FAIL Sprint S10

### 6.1 Critères PASS global

- ✅ 3/3 packages cibles ESM Node native importable
- ✅ 0 régression tests existants
- ✅ Sovereign-engine cascade neutralisée (probe omega-runner ou similar OK)
- ✅ NCR_ESM_BUNDLER_VS_NODE_RUNTIME complète FIX_VALIDATED (sortir STILL_OPEN partial)
- ✅ Test 4 (NCR_GATE_IMPORTS_BUNDLER_BLINDNESS) implémenté pour validation CI future

### 6.2 Critères PARTIAL PASS (acceptable si NG-driven)

- ⚠️ 2/3 packages fixés + 1 DEFERRED (e.g. integration-nexus-dep CAS D non décidé) → acceptable si Architecte trace décision
- ⚠️ sovereign-engine fixé + 1-2 autres DEFERRED → acceptable si pivot débloqué

### 6.3 Critères FAIL → ROLLBACK

- ❌ Tests régression (>1 test cassé induit par patch)
- ❌ Cascade nouvelle cassure (autre package broken par patch S10)
- ❌ Build régression sur package précédemment OK (canon-kernel, orchestrator-core, signal-registry)

---

## 7. Doctrine application

| Amendement v3.156.0 | Application Sprint S10 |
|---------------------|------------------------|
| ANCHOR_PRE_FLIGHT | Tous anchors empiriques vérifiés runtime, [À VÉRIFIER] markers obligatoires |
| MULTI_IA_RUNTIME_ARBITER | Mini-Tribunal pour décision NG (e.g. NG5 Emotion13/14) |
| NO_UNVERIFIED_EXTERNAL_ANCHORS | Probe Node native + tests reverse pre-commit OBLIGATOIRES |
| STRUCTURED_MEMORY_PRIORITY | Mémoire S9.2 partial closure guide S10 (recoupage repo obligatoire) |
| RECOVERY_TEST_DOCTRINE | Tests reverse définis par STEP avant patch |
| WORKSPACE_VS_REPO_DRIFT | Aucun path Cowork sans `[SANDBOX]`/`[REPO]` markers |

---

## 8. Risques anticipés Sprint S10

- **R-S10-1** — JSON imports Node < 22 : si target runtime ne supporte pas `with { type: 'json' }`, alternative pattern requise
- **R-S10-2** — Emotion13 vs Emotion14 decision : Architecte non disponible = blocking integration-nexus-dep
- **R-S10-3** — Cascade nouvelle découverte : 7e/8e package potentiel (HARD STOP NG1 ou Umbrella NCR)
- **R-S10-4** — Sovereign-engine refactor scope creep : si CAS C plus large que prévu, scope split en multiple sprints
- **R-S10-5** — Test 4 (NCR_GATE_IMPORTS_BUNDLER_BLINDNESS) implémentation peut révéler bugs additionnels via CI strict

---

## 9. Estimations effort

| STEP | Package | Estimation effort |
|------|---------|-------------------|
| S10-A | sovereign-engine | 1-2h (audit JSON 30min + patch + rebuild + tests + cascade) |
| S10-B | omega-segment-engine | 1-2h (8 TS errors mécaniques + audit duplicate identifiers) |
| S10-C | integration-nexus-dep | 1-3h (selon decision Emotion13/14 Architecte) |
| S10-D | Test 4 implémentation gate:imports | 1-2h (child_process spawn node + integration CI) |
| **Total** | | **4-9h Sprint S10** |

---

## 10. Cross-references

- `nexus/proof/S9_STEP2_PARTIAL_CLOSURE_REPORT.md` — closure report S9.2 partial
- `nexus/proof/S9_ESM_SCOPE_REPORT.md` — Phase 0 audit (commit `37c437c3`)
- `NCR_ESM_BUNDLER_VS_NODE_RUNTIME` §12 — partial FIX_VALIDATED_SCOPED
- `NCR_GATE_IMPORTS_BUNDLER_BLINDNESS` §11 — Test 4 priorité S10
- `NCR_BUILD_ARTIFACT_ABSENCE_POST_S6` §13 — S9.2 partial mention
- `CLAUDE.md` v3.156.0 Section H — doctrine v3.156.0 active

---

## 11. Signature

```
DOCUMENT  : S10_RUNTIME_ESM_PHASE2_PLAN.md
STATUS    : DRAFT (en attente arbitrage Architecte)
PHASE     : Sprint S10 plan (continuation S9.2 partial)
HEAD      : 16569592 (post S9.2-C signal-registry)
TAG       : phase-s-s9-step2-3packages-esm-fixed-2026-05-02
ARCHITECT : Francky (décision Emotion13/14 + ordre + go-ahead)
DRAFTER   : Claude (IA Principal, runtime arbiter)
TRIBUNAL  : Cowork + ChatGPT + Gemini + Claude (Mini-Tribunal pour NG)
STANDARD  : NASA-Grade L4 / DO-178C Level A
```
