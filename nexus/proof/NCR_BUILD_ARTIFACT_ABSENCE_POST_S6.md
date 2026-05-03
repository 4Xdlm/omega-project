# NCR_BUILD_ARTIFACT_ABSENCE_POST_S6

**ID** : NCR_BUILD_ARTIFACT_ABSENCE_POST_S6
**Title** : 4 packages listés BUILT en S6.P2 absents de dist/ aujourd'hui (cause non tranchée)
**Status** : **OPEN_DIAGNOSED** (split scope post-investigation S9)
**Severity** : **CAS D MIXED** — 2 packages CAS A (P3 doc only) + 2 packages CAS C (**P0_RUNTIME**)
**Runtime severity** : **CONFIRMED P0** sur 2/4 packages (integration-nexus-dep + omega-segment-engine FAIL build)
**Disposition** : **SPLIT** — 2 packages DEFERRED_S10+ doc only / 2 packages ESCALATE Sprint S9 dédié fix code
**Priority** : P0 sur 2 packages (régression code confirmée empirique)
**Opened** : 2026-05-01 (Sprint S8 Vague 2 — découverte forensics F2)
**Refined** : 2026-05-01 (Sprint S8 V3 Étape 0 — Tribunal 3 IA convergence)
**Investigated** : 2026-05-02 (Sprint S9 Étape 1 — empirical investigation Phase 1+2, CAS D verdict)
**Owner** : Francky + Claude

---

## 1. Résumé

Sprint S8 Vague 2 audit (post-classification NCR_BUILD_CASCADE_INCOMPLETE)
a découvert empiriquement que 4 packages listés comme BUILT pendant
Sprint S6.P2 (Build Cascade) sont actuellement SANS répertoire `dist/`.

## 2. Évidence empirique observée 2026-05-01

- 16/41 packages avec `dist/` présent (39%)
- 4 packages affectés :
  - `packages/contracts-canon/`
  - `packages/hardening/`
  - `packages/integration-nexus-dep/`
  - `packages/omega-segment-engine/`
- Ces 4 packages étaient revendiqués BUILT en S6.P2 documentation
- Tag `phase-s-s6-engine-runtime-restored-2026-04-27` (aca0f393) revendiquait
  cascade complète restaurée

## 3. Ce qui est PROUVÉ empiriquement

- Absence actuelle de `dist/` dans 4 packages (vérification Get-ChildItem)
- Référence S6.P2 ces 4 packages comme BUILT [À VÉRIFIER chemin doc exact]
- Cumul commits post-S6 : tags S6.1 + S7 + Sprint S8 Phase 0 + Vagues 1+2

## 4. Ce qui N'EST PAS prouvé (à investiguer)

- Cause racine de l'absence
- Caractère réversible ou non
- Impact runtime réel sur sovereign-engine (dépendances ?)
- Régression VS jamais commitée VS cleanup intentionnel

## 5. Hypothèses sur cause racine (NON tranchées)

- **H1** : `dist/` non versionné, généré pendant S6.P2 puis supprimé par cleanup ultérieur
- **H2** : Claim "BUILT" en S6.P2 trop large ou mal documentée
- **H3** : Build outputs présents en worktree/quarantaine puis perdus
- **H4** : Packages réellement non buildables aujourd'hui (régression code)
- **H5** : Packages non requis runtime, build incomplet volontaire post-S6.P2

## 6. Risques identifiés

- R1 : Runtime import futur sur ces packages → ERR_MODULE_NOT_FOUND
- R2 : CI false confidence (tag S6 revendique restauration complète)
- R3 : Tag `phase-s-s6-engine-runtime-restored-2026-04-27` potentiellement overclaimed
- R4 : Effet domino si autres packages dépendent de ces 4
- R5 : Régression silencieuse non détectée pendant 4+ jours

## 7. Tests requis pour trancher (Sprint S9+)

1. `git log --all -- "packages/<name>/dist/**"` pour chacun des 4 — vérifier traçabilité
2. Vérifier `.gitignore` pour pattern `dist/` (versionné ou non ?)
3. Lecture S6.P2 evidence pack (logs install + smoke runtime)
4. Rebuild ciblé `npm run build` sur les 4 packages — réussite ou échec ?
5. Test import runtime de chaque package depuis sovereign-engine
6. Audit dépendances cross-packages (qui importe quoi)

## 8. Décision actuelle

- **AUCUN fix dans cette vague** (Sprint S8 Vague 2)
- Investigation dédiée Sprint S9+ après Tribunal 3 IA (demain 2026-05-02)
- Statut maintenu OPEN_DIAGNOSED tant que cause racine non tranchée
- Sévérité POTENTIAL_P0 maintenue par précaution (downgrade autorisé après tests §7)

## 9. Lien Tribunal 3 IA prévu

Discussion stratégique demain :
- Sévérité réelle (P0 vs P1 vs P2 selon impact runtime confirmé)
- Action corrective (rebuild ciblé vs investigation profonde)
- Portée Sprint (urgence S9 immédiat vs S9+)

## 10. Doctrine

NCR OVER HEROICS — régression empirique capturée ouvertement, sans
panique ni minimisation. PROVE IT — observation factuelle, pas
conclusion forcée.

---

## 11. Tribunal 3 IA arbitrage (2026-05-01)

### 11.1 Convergence atteinte

Convergence Tribunal 3 IA (2026-05-01, post-capture C18) :
- **Gemini** : "P0_PROOF_INTEGRITY — preuve cassée, runtime non prouvé"
- **ChatGPT** : "Severity refined, deferred S9, capture suffit S8"
- **Cowork** : "Stratégie OPT_HYBRID — capture immédiate, investigation S9"

### 11.2 Refinement de sévérité

| Champ | Valeur initiale C18 | Valeur refinée Étape 0 | Justification |
|-------|---------------------|------------------------|---------------|
| Severity | POTENTIAL_P0 | **P0_PROOF_INTEGRITY** | Preuve CI/build empiriquement cassée (vérifiable), distincte d'un P0 brut |
| Runtime severity | (implicite POTENTIAL) | **UNKNOWN** | Impact runtime non encore mesuré (pas de bench prouvant les casses runtime) |
| Disposition | (implicite "S9+") | **DEFERRED_TO_S9** | Capture S8 = suffisante, fix nécessite sprint dédié S9 |

### 11.3 Distinction P0 vs P0_PROOF_INTEGRITY

P0 brut impliquerait : runtime production cassé, perte de fonctionnalité
critique, action immédiate.

P0_PROOF_INTEGRITY (nouvelle catégorie OMEGA) implique :
- Preuve CI ou build empiriquement cassée
- Confiance dans la documentation/scellage compromise
- Runtime peut être OK (UNKNOWN) ou KO — non discriminé
- Action : capture immédiate + investigation dédiée, **pas hotfix**

Cette distinction permet de capturer la gravité **doctrinale** (PROVE IT
violé par overclaim S6) sans déclencher un branle-bas runtime non justifié
empiriquement.

### 11.4 Action S8

**Aucun fix dans Sprint S8.**

- S8 V2 : capture C18 (déjà fait)
- S8 V3 Étape 0 : refinement sévérité (présent commit C19a)
- S8 V3 Étape 1+ : continue Vague 3 sur autres NCRs (F2 hors scope V3A-D)

### 11.5 Action S9 (déférée)

Tests §7 du présent NCR seront exécutés en Sprint S9 dédié :
1. `git log --all -- "packages/<name>/dist/**"` (4 packages)
2. `.gitignore` audit pour `dist/`
3. Lecture S6.P2 evidence pack
4. Rebuild ciblé (réussite ou échec)
5. Test import runtime depuis sovereign-engine
6. Audit dépendances cross-packages

### 11.6 Tag potentiel overclaimed (R3 reconfirmé)

Le tag `phase-s-s6-engine-runtime-restored-2026-04-27` reste **potentiellement
overclaimed**. Décision Tribunal 3 IA : ne PAS retirer ni modifier le tag
(immutabilité Phase Q), mais documenter explicitement l'overclaim post-fix
S9 dans un rider tag-side ou amendement NCR_S6_TAG_PREMATURE §11 si
confirmé.

### 11.7 Closure officielle Étape 0

```
REFINEMENT ÉTAPE 0 NCR_BUILD_ARTIFACT_ABSENCE_POST_S6
======================================================
Date            : 2026-05-01 (Sprint S8 V3 Étape 0)
Status          : OPEN_DIAGNOSED (inchangé)
Severity        : POTENTIAL_P0 → P0_PROOF_INTEGRITY (refined)
Runtime         : UNKNOWN (explicit)
Disposition     : DEFERRED_TO_S9 (explicit)
Authority       : Tribunal 3 IA convergence (Gemini + ChatGPT + Cowork)
                  + Architecte Francky
Action S8       : NONE (capture refinement only)
Action S9       : tests §7 (6 actions)
```

---

## 12. Sprint S9 Étape 1 — Investigation empirique tranchée (2026-05-02)

### 12.1 Méthodologie

Investigation Phase 1 (lecture seule) + Phase 2 (rebuild trial autorisé)
selon brief Sprint S9 Étape 1. Aucune modification code, aucun commit
de dist/ (gitignored par design).

### 12.2 Phase 1 — Traçabilité git per-package

```bash
$ git log --all --oneline -- "packages/<name>/dist/**"
$ git log --all --oneline --diff-filter=D -- "packages/<name>/dist/**"
$ git log --all --oneline --diff-filter=A -- "packages/<name>/dist/**"
```

| Package | Versionné historiquement ? | Cleanup commit |
|---------|---------------------------|----------------|
| `contracts-canon` | OUI (commit `03ace4b2` Phase 65 "Contracts Canon - unified interface contracts [CERTIFIED]") | `d54873ea` (2026-01-17 "fix(repo): stop tracking node_modules and build artifacts") |
| `hardening` | **JAMAIS** (0 commits dist/**) | n/a |
| `integration-nexus-dep` | OUI (commit `40a2c73c` Phase 66 "Wiring NEXUS DEP - orchestrator adapter integration [CERTIFIED]") | `d54873ea` (idem) |
| `omega-segment-engine` | **JAMAIS** (0 commits dist/**) | n/a |

**Observation** : commit `d54873ea` (2026-01-17) explicit cleanup
"Remove dist/ build outputs from Git index" + "Ensure .gitignore covers
node_modules/** and build dirs". Décision délibérée d'untrack dist/.

### 12.3 Phase 1.2 — `.gitignore` racine

```bash
$ Get-Content .gitignore | Select-String "dist"
21  dist/
22  **/dist/
```

→ **`.gitignore` racine ligne 21-22 EXCLUT GLOBALEMENT TOUS les `dist/`** dans le repo. Aucun `.gitignore` local par-package (héritent du racine).

### 12.4 Phase 2 — Rebuild trial empirique

Commande standard : `npm run build --workspace=packages/<name>` depuis racine.

| Package | Build | Durée | dist/ files | Erreurs |
|---------|-------|-------|-------------|---------|
| `contracts-canon` | ✅ **SUCCESS** | 2.3s | 20 | 0 |
| `hardening` | ✅ **SUCCESS** | 2.2s | 18 | 0 |
| `integration-nexus-dep` | ❌ **FAIL** | 2.4s | 116 (partial) | **7 TS errors** |
| `omega-segment-engine` | ❌ **FAIL** | 2.0s | 44 (partial) | **8 TS errors** |

**Erreurs `integration-nexus-dep`** (7) :
- `src/scheduler/scheduler.ts(16,1)` TS6133 'PipelineResult' unused
- `src/scheduler/scheduler.ts(25,3)` TS6196 'Policy' unused
- `src/scheduler/scheduler.ts(29,3)` TS6196 'DEFAULT_SCHEDULER_OPTIONS' unused
- `src/scheduler/scheduler.ts(30,3)` TS6196 'PRIORITY_VALUES' unused
- `src/translators/module.ts(49,14)` TS2741 missing 'envy' property in Emotion14 Record
- `src/translators/module.ts(89,11)` TS2741 missing 'envy' property in number Record
- `src/translators/module.ts(171,5)` TS6133 'source' unused
- `src/translators/output.ts(16,3)` TS6196 'ExecutionTrace' unused

**Erreurs `omega-segment-engine`** (8) :
- `src/stream/index.ts(181-186)` TS2300 Duplicate identifiers (GatewayConfig, GatewayPolicy, RecorderEntry, DispatchResult, GatewayError, ModuleHandler) × 6
- `src/stream/index.ts(187,8)` **TS2834 Relative import paths need explicit file extensions** (moduleResolution node16/nodenext)
- `src/stream/stream_segmenter.ts(288,20)` TS2345 SegmentMode type mismatch

### 12.5 Verdict CAS D — Mix split per-package

Per la rubrique §"PHASE 3 — DÉCISION EMPIRIQUE TRANCHÉE" du brief :

| Package | Cas | Sévérité | Disposition |
|---------|-----|----------|-------------|
| `contracts-canon` | **CAS A** (H1 confirmée, dist gitignored, rebuild OK) | DOWNGRADE → **P3** doc only | DEFERRED_S10+ |
| `hardening` | **CAS A** (H1 confirmée + jamais versionné, rebuild OK) | DOWNGRADE → **P3** doc only | DEFERRED_S10+ |
| `integration-nexus-dep` | **CAS C** (H4 confirmée, rebuild FAIL 7 errors) | ESCALATE → **P0_RUNTIME** | ESCALATE Sprint S9 dédié fix code |
| `omega-segment-engine` | **CAS C** (H4 confirmée, rebuild FAIL 8 errors dont ESM extension) | ESCALATE → **P0_RUNTIME** | ESCALATE Sprint S9 dédié fix code |

### 12.6 Hypothèses tranchées (H1-H5)

- **H1 (`dist/` non versionné, généré pendant S6.P2 puis cleanup ultérieur)** : ✅ **CONFIRMÉE** pour 2/4 packages. `.gitignore` racine ligne 21-22 + commit cleanup `d54873ea` explicit.
- **H2 (Claim "BUILT" en S6.P2 trop large ou mal documentée)** : ✅ **PARTIELLEMENT CONFIRMÉE**. Pour les 4 packages, le claim S6.P2 reflétait l'état **disque/working tree** au moment du build, pas un état persisté git. Pour les 2 packages CAS C, le claim était **probablement faux** (build ne passe pas aujourd'hui).
- **H3 (Build outputs présents en worktree/quarantaine puis perdus)** : ✅ **CONFIRMÉE** par H1 (le pattern est le même : disque transient).
- **H4 (Packages réellement non buildables aujourd'hui — régression code)** : ✅ **CONFIRMÉE** pour 2/4 packages (integration-nexus-dep + omega-segment-engine). 15 erreurs TS au total.
- **H5 (Packages non requis runtime, build incomplet volontaire post-S6.P2)** : ❌ **REFUTÉE**. Si volontaire, devrait être documenté quelque part. Aucune trace doctrinale.

### 12.7 Cross-references Sprint S9+ découvertes

L'erreur **TS2834** dans omega-segment-engine (`Relative import paths need
explicit file extensions in ECMAScript imports when '--moduleResolution'
is 'node16' or 'nodenext'`) **confirme indépendamment** la découverte de
`NCR_ESM_BUNDLER_VS_NODE_RUNTIME` (Sprint S8 Vague 2 C16 STILL_OPEN —
H1 EMPIRIQUEMENT CONFIRMÉE) :

- canon-kernel/dist contient des imports sans extension (Vague 2 C16 EMP-3)
- omega-segment-engine ne compile **pas** car son tsconfig est `node16/nodenext`
  et exige les extensions

→ **Cohérence empirique transversale** : 2 NCRs distincts révèlent la même
classe de bug ESM Node natif. Refonte coordonnée S9+ recommandée.

### 12.8 Working tree git après Phase 2

Vérification : `git status --short` post-rebuild affiche **exactement les
mêmes 7 untracked résiduels** depuis Sprint S8 Phase 0 (gateway_baseline.log
+ 5 phase-c logs + NCR_REGISTRY CSV). Aucun `dist/` n'apparaît car le
`.gitignore` les exclut globalement. Working tree git **propre et stable**.

### 12.9 Closure officielle Sprint S9 Étape 1

```
INVESTIGATION SPRINT S9 ÉTAPE 1 — NCR_BUILD_ARTIFACT_ABSENCE_POST_S6
=====================================================================
Date            : 2026-05-02 (Sprint S9 Étape 1)
Verdict         : CAS D (mixed split per-package)
- 2 packages CAS A (P3, DEFERRED_S10+)
- 2 packages CAS C (P0_RUNTIME, ESCALATE Sprint S9 dédié)
Severity revisée : P0_PROOF_INTEGRITY → CAS D mixed (split per-package)
Runtime         : CONFIRMED P0 sur 2/4 packages (integration-nexus-dep
                  + omega-segment-engine — 15 TS errors total)
Disposition     : SPLIT — doc only S10+ vs ESCALATE Sprint S9 dédié
Authority       : Claude Code (runtime arbiter Sprint S9 Étape 1) +
                  Architecte Francky pour décisions Sprint dédié S9
Hypotheses      : H1 ✅, H2 ✅ partial, H3 ✅, H4 ✅, H5 ❌
Cross-ref       : NCR_ESM_BUNDLER_VS_NODE_RUNTIME (C16) — convergence
                  empirique TS2834 dans omega-segment-engine
Action S9       : Sprint dédié 2 packages FAIL (fix code 15 TS errors)
Action S10+     : Documentation pattern dist/ gitignored canonique
                  + decision archive S6.P2 NCR §2.2 list inaccuracy
```

---

## 13. Sprint S9 Étape 2 partial closure mention (2026-05-03)

### 13.1 Avancement S9.2 partial relatif à cette NCR

Sprint S9 Étape 2 a réalisé refonte ESM stricte sur 3/6 packages
runtime (post-Phase 0bis cascade discoveries) :

| Package | S9 Étape 1 verdict | S9.2 status | Commit |
|---------|--------------------|-----------|--------|
| `contracts-canon` | CAS A (déjà OK) | ✅ Confirmé OK Phase 0 (hors scope S9.2) | — |
| `hardening` | CAS A | ⏸️ Cascade orchestrator-core fixed S9.2-A — re-test S10 | — |
| `integration-nexus-dep` | **CAS C** ESCALATE | ⏳ DEFERRED Sprint S10 | — |
| `omega-segment-engine` | **CAS C** ESCALATE | ⏳ DEFERRED Sprint S10 | — |
| `canon-kernel` (NOUVEAU scope) | (Phase 0bis cascade) | ✅ FIXED CAS B3 | `372524b9` |
| `orchestrator-core` (NOUVEAU scope) | (Phase 0bis cascade) | ✅ FIXED CAS B | `c50974c5` |
| `signal-registry` (NOUVEAU scope) | (Phase 0bis cascade) | ✅ FIXED CAS B (NG2 bypass) | `16569592` |
| `sovereign-engine` (NOUVEAU scope) | (Phase 0bis cascade) | ⏳ DEFERRED Sprint S10 | — |

### 13.2 Status NCR_BUILD_ARTIFACT_ABSENCE_POST_S6 inchangé

Cette NCR reste **OPEN_DIAGNOSED** avec disposition **CAS D MIXED split**
per §11.5. Sprint S9.2 partial closure n'altère pas la classification :

- 2 packages CAS A (contracts-canon, hardening) : DEFERRED_S10+ doc only
  - hardening cascade orchestrator-core désormais fixée — RE-TEST S10
    pour confirmer hardening passe Node native via `@omega/hardening`
- 2 packages CAS C (integration-nexus-dep, omega-segment-engine) :
  ESCALATE Sprint S10 dédié (hérite disposition de S9.2 partial)

### 13.3 Cross-references mises à jour

- `nexus/proof/S9_STEP2_PARTIAL_CLOSURE_REPORT.md` (commit ce sprint) — closure report 3/6 packages
- `nexus/proof/S10_RUNTIME_ESM_PHASE2_PLAN.md` (commit ce sprint) — plan continuation
- `NCR_ESM_BUNDLER_VS_NODE_RUNTIME` §12 — transition partielle FIX_VALIDATED_SCOPED
- `NCR_GATE_IMPORTS_BUNDLER_BLINDNESS` (cross-ref S10) — Test 4 nécessaire pour CI

### 13.4 Note doctrinale

Per RECOVERY_TEST_DOCTRINE (amendement v3.156.0 §5), aucune modification
du registry CSV `omega/outputs/NCR_REGISTRY_2026-04-29.csv` n'est faite
ce commit (le registry reste stale connu). Tout cleanup ou regen requiert
NCR + reverse test préalable.
