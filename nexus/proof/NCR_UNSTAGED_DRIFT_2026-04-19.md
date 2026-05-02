# NCR_UNSTAGED_DRIFT_2026-04-19

**ID** : NCR_UNSTAGED_DRIFT_2026-04-19
**Title** : 18+ fichiers modifiés non-stagés découverts à la clôture NCR_M2 — drift worktree pré-P1-seal
**Status** : **RESOLVED** (Sprint S8 V3C 2026-05-02 — 20/20 drift files RESOLVED empiriquement, drift cleanup réalisé via phase-s-r7 sealing 2026-04-20 + 9 commits post-2026-04-19)
**Précédent** : OPEN (2026-04-19 nuit) — stale 13 jours malgré drift résolu 2026-04-20
**Severity** : MEDIUM (pas de bug fonctionnel ; intégrité chaîne traçabilité NASA-Grade L4)
**Priority** : P1 (à traiter avant prochain commit non-atomique)
**Opened** : 2026-04-19 nuit (autonome, post-clôture NCR_M2 Phase 1 A.1)
**Owner** : Claude (autonome) + Francky (décisionnaire)
**Type** : AUDIT FORENSIQUE — pas de blocage opérationnel

---

## 1. Issue

À la préparation du commit atomique de clôture `NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR.md`
(amendement Status `OPEN` → `FIX_VALIDATED_SCOPED` + ajout §10), `git status` a
révélé **20 fichiers tracked modifiés non-stagés** + 215 untracked dans le repo
`omega-project` sur la branche `phase-r-dispatcher-v33`.

Or, le commit atomique demandé par le standard NASA-Grade L4 est **single-file**
(NCR_M2 uniquement). Les 20 modifications doivent donc :

1. Soit être commitées séparément avec rationale documenté
2. Soit être identifiées comme "drift incident" et auditées

Cette NCR documente l'audit forensique des 20 fichiers pour décision Francky.

### 1.1 Contexte temporel

- **P1 seal** : commit `7e89f95f` daté **2026-04-18 15:18:12 +0200**
  ("feat(adaptive-chunker): P1 archetype gating wiring (R-D.1 ADOPT_A)")
- **HEAD actuel** : `fde1901e` daté 2026-04-19 14:19:46 +0200
  ("docs(ncr): bench P1 v3 autopsy + arbitrage 3-IA - close METHOD_DRIFT...")
- **Découverte drift** : 2026-04-19 nuit (~22:00 UTC) lors prep commit NCR_M2

### 1.2 Pourquoi maintenant et pas avant ?

Les commits intermédiaires (`9c05545a`, `3aa9d35d`, `3c80684f`, `fde1901e`)
étaient eux-mêmes **multi-file mais ciblés** sur :
- bench v3 design (scripts + launcher)
- bench v2/v3 NCRs documentation
- arbitrage 3-IA NCR amendments

Aucun de ces commits n'a touché aux fichiers prod (`engine.ts`,
`duel-engine.ts`, etc.) qui restent dans le worktree comme drift résiduel.

Le `git status` plein n'a jamais été inspecté pour ces sous-ensembles, car
chaque commit utilisait `git add <fichier-explicite>` sans `git add -A`.

---

## 2. Inventaire des 20 fichiers modifiés

### 2.1 Liste complète avec date dernière modif

| Date mod | Fichier | Catégorie |
|---|---|---|
| 2026-01-28 | `omega-bridge-win.exe` | BUILD (binaire) |
| 2026-01-28 | `releases/v1.7.0-INDUSTRIAL/OMEGA_Setup_v1.7.0-INDUSTRIAL_x64.exe` | BUILD (binaire) |
| 2026-01-28 | `releases/v1.7.0-INDUSTRIAL/OMEGA_Setup_v1.7.0-INDUSTRIAL_x64.msi` | BUILD (binaire) |
| 2026-04-10 | `omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json` | DATA (corpus features +9965 lignes) |
| 2026-04-11 | `packages/sovereign-engine/src/scoring/dispatcher/dispatcher-lang.ts` | PROD (V3.1→V3.4 wiring) |
| 2026-04-11 | `packages/sovereign-engine/tests/gates/gate-proofpack.test.ts` | TEST (rename V3_1→V3_4) |
| 2026-04-11 | `packages/sovereign-engine/tests/proofpack/generate-proofpack.test.ts` | TEST (rename V3_1→V3_4) |
| 2026-04-11 | `packages/sovereign-engine/tests/scoring/dispatcher-lang.test.ts` | TEST (rename V3_1→V3_4) |
| 2026-04-11 | `packages/sovereign-engine/tests/validation/validation-runner.test.ts` | TEST (mineur) |
| 2026-04-12 | `packages/sovereign-engine/src/types.ts` | PROD (+16 lignes types) |
| 2026-04-15 | `packages/sovereign-engine/src/assembly/best-of-n.ts` | PROD (+3 lignes) |
| 2026-04-16 | `packages/sovereign-engine/src/input/prompt-assembler-v5.ts` | PROD (+4 lignes) |
| 2026-04-17 | `packages/sovereign-engine/proofpack/phase-s-sealed/HASHES.sha256` | **VIOLATION FROZEN** |
| 2026-04-17 | `packages/sovereign-engine/src/duel/duel-engine.ts` | PROD (+47 lignes) |
| 2026-04-17 | `packages/sovereign-engine/src/engine.ts` | PROD (+35 lignes) |
| 2026-04-17 | `packages/sovereign-engine/src/generation/chunked-generator.ts` | PROD (+588 lignes) |
| 2026-04-18 | `nexus/proof/NCR_CATHEDRAL_BASELINE.md` | DOC (NCR amendement Phase 1) |
| 2026-04-19 | `.roadmap-hash.json` | META (auto-gen) |
| 2026-04-19 | `packages/sovereign-engine/CALIBRATION_SEMANTIC_CORTEX.md` | DOC (calibration) |
| 2026-04-19 | `packages/sovereign-engine/scripts/bench-p1-robustness-v3.ts` | SCRIPT (bench v3 ajustements) |

**Total** : 20 fichiers — 11 119 insertions / 130 deletions

### 2.2 Catégorisation par criticité

#### A. PROD SOURCES (7 fichiers — risque P1)
- `engine.ts` (+35 lignes) — câblage R6/R7
- `duel-engine.ts` (+47 lignes) — duel hostile selection
- `chunked-generator.ts` (+588 lignes) — **gros delta**
- `best-of-n.ts` (+3 lignes) — ajustement
- `prompt-assembler-v5.ts` (+4 lignes) — assembleur prompts
- `dispatcher-lang.ts` (+20 lignes) — V3.4 wiring
- `types.ts` (+16 lignes) — types dispatcher

**Mod dates** : 2026-04-11 à 2026-04-17 (TOUS antérieurs au P1 seal 2026-04-18)

**Hypothèse** : ces modifs faisaient partie des phases R6/R7/V1/M0b_slim V3.4 mais
ont été oubliées au stage. Les commits R6 (`feat(r6-gate)`), R7
(`feat(best-of-n)`), R7-B (`feat(cliff-shadow)`), V3.4 (`feat(coefficients-v34)`)
ont été poussés sans `git add -A`.

#### B. TESTS (4 fichiers — risque BAS)
- `gate-proofpack.test.ts` (+5 lignes) — rename string V3_1→V3_4
- `generate-proofpack.test.ts` (+5 lignes) — rename V3_1→V3_4
- `dispatcher-lang.test.ts` (+16 lignes) — tests dispatcher mis à jour V3.4
- `validation-runner.test.ts` (+2 lignes) — mineur

**Hypothèse** : suite logique au câblage V3.4 du dispatcher (cohérent §A).

#### C. FROZEN MODULE VIOLATION (1 fichier — risque HIGH)
- `packages/sovereign-engine/proofpack/phase-s-sealed/HASHES.sha256` (+2 lignes)

**Violation INV-V-01** : modification d'un module SEALED. À investiguer :
- Quelle phase a touché ce fichier ?
- Le diff montre-t-il un re-hash ou un ajout ?

#### D. BUILD ARTIFACTS (3 fichiers — risque BAS, gitignore manquant)
- `omega-bridge-win.exe` (binaire 42 MB)
- `OMEGA_Setup_v1.7.0-INDUSTRIAL_x64.exe` (3.9 MB)
- `OMEGA_Setup_v1.7.0-INDUSTRIAL_x64.msi` (5.8 MB)

**Recommandation** : ajouter `*.exe`, `*.msi` au `.gitignore` racine.

#### E. DATA / DOC (5 fichiers — risque BAS)
- `CORPUS_FEATURES_MASTER.json` (+9965 lignes) — features corpus 1334
- `NCR_CATHEDRAL_BASELINE.md` (+79 lignes) — Phase 1 H1 amendement
- `CALIBRATION_SEMANTIC_CORTEX.md` (+10 lignes)
- `bench-p1-robustness-v3.ts` (+450 lignes) — script bench v3
- `.roadmap-hash.json` (+2 lignes) — auto-gen

---

## 3. Risques

### 3.1 Risque opérationnel : NUL
Tous les fichiers PROD modifiés sont **antérieurs au P1 seal** et au bench
P1 v3. Le bench v3 (144 runs) a tourné sur ces sources. Le bench Phase 1 A.1
(15 runs) a aussi tourné sur ces sources. **Aucune régression observée**.

Conséquence : ces drifts représentent l'**état réel testé**, pas une dérive
post-seal. La menace serait un commit ultérieur qui les "découvre" et les ajoute
en pensant à un fix, alors qu'ils sont déjà du legacy.

### 3.2 Risque traçabilité : MOYEN
Le standard NASA-Grade L4 exige : `Requirement → Code → Test → Evidence → Hash`.

Pour les 7 fichiers PROD : le code est sur disque, testé, mais **pas commit**.
Donc :
- Pas de SHA256 git authoritatif
- Pas de bisect possible sur ces lignes
- Rollback impossible via `git checkout HEAD -- <file>` (perd les modifs)

**Mitigation immédiate** : générer SHA256 des 7 fichiers et les archiver.

### 3.3 Risque FROZEN : HIGH (à investiguer)
Le fichier `HASHES.sha256` est dans `proofpack/phase-s-sealed/` qui est sealed.
Une modification de ce fichier peut signifier soit :
- Un re-seal légitime (devrait être commité)
- Un re-hash post-fix invisible (violation INV-V-01)

**Action requise** : `git diff HEAD -- packages/sovereign-engine/proofpack/phase-s-sealed/HASHES.sha256`

---

## 4. Options de résolution

### 4.1 OPT_A — Commit groupé "consolidation drift" (préféré)
Créer un commit unique avec rationale clair :

```
chore(consolidation): consolidate pre-P1 unstaged drift (audit NCR_UNSTAGED_DRIFT_2026-04-19)

Stage and commit 20 files modified pre-P1-seal (2026-04-18) but missed in
sequential commits (R6/R7/V3.4 phases). All files were on disk during
P1 v3 bench (144 runs) and Phase 1 A.1 bench (15 runs) — no regression.

Files:
- 7 PROD sources (engine, duel, chunked-generator, best-of-n,
  prompt-assembler-v5, dispatcher-lang, types)
- 4 TEST files (V3_1→V3_4 renames + dispatcher tests)
- 1 FROZEN audit (HASHES.sha256 — see §3.3 audit result)
- 3 BUILD artifacts (to be gitignored next)
- 5 DATA/DOC files (corpus, calibration, NCR amendments)

Rationale: restore traceability without changing operational state.
Tests: 2411 PASS sovereign-engine (same as current).
SHA256: <generated post-stage>
```

**Pros** : restaure traçabilité, single-commit auditable
**Cons** : viole "atomic single-file" temporairement

### 4.2 OPT_B — Commits multiples par catégorie
Un commit par catégorie A/B/C/D/E.

**Pros** : respecte atomic principle
**Cons** : 5 commits intermédiaires sur la même base = log encombré

### 4.3 OPT_C — Ignore (status quo)
Laisser les fichiers en drift, ajouter au `.gitignore` les binaires.

**Pros** : zéro action
**Cons** : drift permanent, NCR_UNSTAGED_DRIFT reste OPEN éternellement

### 4.4 OPT_D — Reset hard sur HEAD (DESTRUCTIF)
`git checkout HEAD -- <files>` pour tous les drifts.

**Pros** : worktree propre
**Cons** : **PERTE TOTALE** des +11119 lignes de modifs prod testées. INTERDIT.

---

## 5. Recommandation Claude

**OPT_A** (commit groupé consolidation) avec procédure suivante :

1. **Audit Step 1** : `git diff HEAD -- proofpack/phase-s-sealed/HASHES.sha256`
   → Si re-hash légitime : valider avec Francky
   → Si modification illicite : escalade IMMEDIATE
2. **Audit Step 2** : `git diff HEAD -- src/` pour les 7 fichiers PROD
   → Confirmer cohérence avec phases R6/R7/V3.4 documentées
3. **Stage groupé** : `git add` ciblé par catégorie (A puis B puis C puis E)
4. **`.gitignore`** : ajouter `*.exe`, `*.msi`, `*.bin` à la racine
5. **Commit unique** avec message §4.1
6. **Génération evidence pack** : SHA256 + report dans `nexus/proof/CONSOLIDATION_DRIFT_2026-04-19.md`

**À NE PAS FAIRE en autonome** :
- Le commit lui-même (Francky doit valider OPT_A vs B/C)
- Toucher au fichier FROZEN sans audit explicite

---

## 6. Action requise

**Pour Francky au réveil** :

1. Lire ce NCR (5 minutes)
2. Choisir OPT_A / OPT_B / OPT_C
3. Approuver audit du fichier FROZEN (`HASHES.sha256`) — voir §3.3
4. Si OPT_A : créer launcher `run_consolidation_drift_v1.ps1` (pas exécuté en autonome)
5. Si OPT_C : ajouter ce NCR au tracker permanent + mettre à jour `.gitignore`

**Pour Claude (si Francky absent prolongé)** :
- NE PAS commiter ces fichiers en autonome
- Continuer travail sur autres NCRs (PRIO 1/2/3) sans toucher au worktree

---

## 7. Évidence collectée

### 7.1 git status filtrage tracked

```bash
$ git status --short | grep "^ M\|^M " | wc -l
20
```

### 7.2 git diff --stat HEAD

```
20 files changed, 11119 insertions(+), 130 deletions(-)
```

### 7.3 Liste verbatim avec dates

(Voir §2.1 tableau complet)

### 7.4 HEAD actuel

```
fde1901e docs(ncr): bench P1 v3 autopsy + arbitrage 3-IA - close METHOD_DRIFT
         + extend GATING + open M2 P0 + draft SCORER_BIAS
Date: 2026-04-19 14:19:46 +0200
```

### 7.5 P1 seal référence

```
7e89f95f feat(adaptive-chunker): P1 archetype gating wiring (R-D.1 ADOPT_A)
Date: 2026-04-18 15:18:12 +0200
```

---

## 8. Lien avec autres NCRs

- **NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR** : closure bloquée par drift detection
  (commit atomique impossible tant que worktree pas clean)
- **NCR_BENCH_METHOD_DRIFT** (CLOSED) : drift méthodologie bench, distinct
- **NCR_GATING_EFFECT_SIZE_UNSTABLE** : effet gating instable, indépendant

---

## 9. Status updates

- **2026-04-19 22:30** : NCR ouvert par Claude autonome lors clôture NCR_M2.
  Audit forensique complet livré. En attente décision Francky OPT_A/B/C.

---

**Owner** : Claude (autonome — investigation seulement, pas de commit)
**Décideur** : Francky
**Standard** : NASA-Grade L4 / DO-178C Level A — traçabilité chain restoration

---

## 10. S8 V3C CLASSIFICATION — 2026-05-02

### 10.1 Anchors empiriques vérifiés (canon-engine quality bar EMP-N)

| Test | Commande | Résultat |
|------|----------|----------|
| EMP-1 | `git diff HEAD --` sur les 20 fichiers §2.1 | **20/20 files NO DIFF** → drift entièrement résolu ✅ |
| EMP-2 | HASHES.sha256 line 8 (FROZEN) | `3bb2c6ff...` — V1 IMMUTABLE préservé (cf. NCR_FROZEN_BREACH §12.5 + cette NCR §C) ✅ |
| EMP-3 | `Test-Path docs/archive/drift-20260420.md` | True — drift archive externe documentée (31 fichiers) ✅ |
| EMP-4 | `git tag -l "*r7-sealed*"` | `phase-s-r7-sealed-2026-04-20` présent (drift cleanup event) ✅ |
| EMP-5 | git log --since="2026-04-19" --until="2026-04-21" | 9 commits dont `a20dcdbb` "D8+D9 — NCR cathedral verdict + gamma inert + **unstaged drift** + ADR R6" et `da6e96c0` "feat(proofpack): phase-s-r7 seal" ✅ |
| EMP-6 | git log --grep "drift" -i | Multiple commits `cleanup`, `gitignore Bloc Q`, `archive SSOT drift-20260420` traitant drift ✅ |

### 10.2 Anchor Cowork [À VÉRIFIER] — 5e evidence-gap + 7e occurrence unverified

L'instruction Vague 3C C29 mentionne :
> "Sprint S12 plan livré dans omega/outputs/OMEGA_TRIBUNAL_2026-04-26/S8_PREP_LONG_TERME_AUTONOMIE/06_SPRINT_S12_DRIFT_CLEANUP_PLAN.md [À VÉRIFIER chemin]"

Vérification empirique :

```powershell
$ Test-Path "omega/outputs/OMEGA_TRIBUNAL_2026-04-26/S8_PREP_LONG_TERME_AUTONOMIE/06_SPRINT_S12_DRIFT_CLEANUP_PLAN.md"
False

$ Get-ChildItem -Recurse -Filter "*SPRINT_S12*"
(empty)

$ Get-ChildItem -Recurse -Filter "*S8_PREP*" -Path omega/outputs/OMEGA_TRIBUNAL_2026-04-26
(empty)
```

**Verdict** :
- ❌ **5e evidence-gap** : path Cowork introuvable filesystem
- ❌ **Prediction Cowork "DEFERRED Sprint S12" INCORRECTE** : drift résolu 2026-04-20 via phase-s-r7 sealing — aucun Sprint S12 nécessaire
- ❌ **7e occurrence Cowork unverified anchors** (à ajouter `NCR_COWORK_UNVERIFIED_ANCHORS_PATTERN` commit `b9c8fec4`)

### 10.3 Decision rationale

**OPEN → RESOLVED** transition empiriquement justifiée :

1. **20/20 fichiers drift §2.1 RESOLVED** (EMP-1) — preuve binaire absolue
2. **HASHES.sha256 FROZEN violation §C** : traitée par NCR_FROZEN_BREACH_DUEL_ENGINE Option α (commit `458df9ab` Vague 2 C26 CLOSED_CONFIRMED). V1 préservé immuable + nouveau hash dans phase-s-r7
3. **Drift archive externe** documenté (drift-20260420.md → 31 fichiers Claude-Workspace)
4. **OPT_A "consolidation drift"** §4.1 effectivement réalisée via 9 commits post-2026-04-19 + sealing phase-s-r7

Cannot CLOSED_CONFIRMED : RESOLVED est plus précis (drift effectivement nettoyé, pas seulement clos)
Cannot DEFERRED : aucun Sprint S12 plan empiriquement existant + drift déjà fait
Cannot STILL_OPEN : 20/20 files RESOLVED + 9 commits + sealing event documentés

→ **RESOLVED** est doctrinalement aligné.

### 10.4 Pattern stale (3e occurrence sprint S8)

C29 = 3e cas de NCR stale détecté Sprint S8 :
1. C3 (Vague 0) : `NCR_CANON_ENGINE_JUNCTION_ORPHAN` (DOCUMENTED → RESOLVED, cleanup de facto)
2. C25 (Vague 3B) : `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED` (OPEN → RESOLVED, sealed 10 jours sans update)
3. **C29 (Vague 3C) : `NCR_UNSTAGED_DRIFT_2026-04-19` (OPEN → RESOLVED, drift résolu 13 jours sans update)**

Le pattern récurrent renforce le besoin doctrinal d'**EVIDENCE_HASH_PRECONDITION** + audit registry sync (cf. `NCR_REGISTRY_BROKEN_FILTER` commit `d46587fc` + `NCR_EVIDENCE_ARTIFACT_GAP_PATTERN` commit `3bfcdbde`).

### 10.5 Final status

**RESOLVED** (severity MEDIUM maintenue dans le header pour trace historique,
priorité P1 effectivement adressée)

### 10.6 Scope

- **INCLUS (RESOLVED)** : 20 fichiers drift §2.1 entièrement résolus + HASHES.sha256 FROZEN handled + drift archive externe
- **HORS scope** : drift résiduels actuels (7 untracked résiduels Sprint S8 V0+V1 — gateway_baseline.log + 5 phase-c logs + NCR_REGISTRY) — différents de cette NCR (post-Sprint S6)

### 10.7 Remaining risks

- **R1** — Cowork unverified anchor 7e occurrence : pattern "Sprint S12 plan" introuvable confirme dérive Cowork mémoire vs filesystem
- **R2** — Pattern stale récurrent : 3 cas Sprint S8 → besoin de check CI sync NCR header vs git state (intégrer à F1 umbrella S9+)
- **R3** — Drift archive externe Claude-Workspace : non vérifiable runtime depuis Claude Code (manifest hors-source). Si Claude-Workspace inaccessible, audit forensique complet drift-20260420 impossible.

### 10.8 Cross-references

- `NCR_FROZEN_BREACH_DUEL_ENGINE_2026-04-20` (CLOSED_CONFIRMED, Vague 2 C26 commit `458df9ab`) : a traité §C HASHES.sha256 FROZEN violation
- `NCR_DEDALE_RESET_HEALTH_NOT_ENFORCED` (RESOLVED, Vague 3B C25 commit `1ba6c46d`) : pattern stale parallèle (10 jours)
- `NCR_CANON_ENGINE_JUNCTION_ORPHAN` (RESOLVED, Vague 0 C3 commit `ced89437`) : 1er cas pattern stale Sprint S8
- `NCR_BENCH_METHOD_DRIFT` (CLOSED_CONFIRMED, Vague 2 C24 commit `87a400cb`) : bench v3 ran sur fichiers drifted (cohérence empirique préservée §3.1)
- `NCR_REGISTRY_BROKEN_FILTER` (OPEN_DIAGNOSED, Sprint S8 V1 C5 commit `d46587fc`) : registry stale ne reflète pas RESOLVED
- `NCR_EVIDENCE_ARTIFACT_GAP_PATTERN` (OPEN_DIAGNOSED, Sprint S8 V3 Étape 0 commit `3bfcdbde`) : 5e evidence-gap (Sprint S12 plan) + pattern stale → audit S9+
- `NCR_COWORK_UNVERIFIED_ANCHORS_PATTERN` (DOCUMENTED, Sprint S8 V2 C17 commit `b9c8fec4`) : 7e occurrence unverified anchor

### 10.9 Closure officielle

```
CLASSIFICATION S8 V3C — NCR_UNSTAGED_DRIFT_2026-04-19
=======================================================
Date            : 2026-05-02 (Sprint S8 V3C)
Status          : OPEN → RESOLVED (transition formelle après 13 jours stale)
Severity        : MEDIUM (inchangée, priorité P1 adressée)
Authority       : Claude Code (runtime arbiter S8 V3C) +
                  Francky + 3-IA décisions 2026-04-20 (sealing phase-s-r7)
Evidence anchor : 6/6 EMP runtime — 20/20 files NO DIFF + HASHES V1 immuable +
                  drift-20260420.md + tag phase-s-r7 + 9 commits cleanup
Critère NCR     : OPT_A consolidation drift §4.1 → effectivement réalisée
                  via phase-s-r7 sealing event (multi-commit thématique)
Anchors Cowork  : Sprint S12 plan path INTROUVABLE (5e evidence-gap, 7e
                  occurrence unverified anchors). Prediction "DEFERRED S12"
                  empiriquement INCORRECTE.
Scope           : 20 fichiers §2.1 RESOLVED + FROZEN handled + archive externe
Risks           : R1 Cowork unverified pattern, R2 stale récurrent (3e cas),
                  R3 archive externe non runtime-verifiable
```
