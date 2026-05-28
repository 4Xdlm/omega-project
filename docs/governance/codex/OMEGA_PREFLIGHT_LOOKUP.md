# OMEGA PREFLIGHT LOOKUP — Sas de Sécurité Obligatoire
**Version** : 1.0 SEALED | **Date** : 2026-05-28
**Status** : `ACTIVE_AFTER_SEAL`
**Doctrine** : EMP-12 CODEX_OMEGA_PREFLIGHT_MANDATORY
**Règle** : LECTURE OBLIGATOIRE AVANT TOUTE LIGNE DE CODE, MESURE, CALIBRATION OU CONCLUSION.

---

## INSTRUCTIONS D'USAGE

1. **Identifier le domaine** de l'action proposée (table ci-dessous)
2. **Lire les documents prescrits** intégralement (pas juste survol)
3. **Vérifier les INTERDICTIONS** applicables avant de commencer
4. **Produire un bloc `CONTROL_BEFORE_WRITE`** (cf `OMEGA_CODEX_CONTROL_BEFORE_WRITE.md`)
5. **Si conflit/contradiction détecté** : STOP immédiat + arbitrage Architect

**FAIL_BLOCKING** : Action sans preflight lookup = invalide.

---

## TABLE DES DOMAINES OMEGA

### 1. DOMAINE : CHUNKING ADAPTATIF (V2.1+)

**LIRE AVANT ACTION** :
- `CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md` — Pilier 1.8 (LAW-CHUNK-040/041/042) + Pilier 5 (HALLU-IA-003/004/005/006)
- `packages/sovereign-engine/src/chunking/calibration/gridSearch.ts` — framework historique 125 combos (PAS preuve validité comportementale)
- `packages/sovereign-engine/src/chunking/optimizer/boundary.ts` (lignes 134-202 critique : greedy fallback weights-blind)
- `packages/sovereign-engine/src/chunking/optimizer/cost.ts` (computeTotalCost weights linéaire)
- `outputs/NCR_V2_1_W3_INERT_BY_DESIGN_2026-05-27.md`
- `outputs/NCR_V2_1_LONG_BOOK_STALL_SCALING_2026-05-27.md` (CLOSED)
- `outputs/NCR_V2_1_WEIGHTS_SCORE_ONLY_NO_DECISION_EFFECT_2026-05-27.md` (P0_CRITICAL)
- `outputs/V2_1_4_A_VERDICT_OPTION_ALPHA_FAIL_2026-05-27.md`
- `outputs/V2_1_4_B_VERDICT_NO_STALL_REPRODUCED_2026-05-27.md`
- `outputs/V2_1_5_BULK_VERDICT_2026-05-27.md`
- `outputs/v2_1_1/v2_1_5_1_behavioral_audit.json` (preuve cosmétique 180 calls)

**INTERDICTIONS (FAIL_BLOCKING)** :
- **FORBID-CHUNK-001** : Calibrer les weights `(w1, w2, w3)` seuls sans tester `boundary_hash` AVANT bench bulk (LAW-CHUNK-040 prouvé cosmétique)
- **FORBID-CHUNK-002** : Adopter un "best combo" basé uniquement sur `cost` brut
- **FORBID-CHUNK-003** : Comparer `cost` brute cross-grids quand `sum(w)` différents (artefact mathématique HALLU-IA-005)
- **FORBID-CHUNK-004** : Abaisser `intensity_threshold` sous 0.1 (sursegmentation catastrophique LAW-CHUNK-041)
- **FORBID-CHUNK-005** : Relancer Option α (threshold tuning seul) — empiriquement morte
- **FORBID-CHUNK-006** : Invoquer complexité O(N²) pour ralentissement `chunkAdaptive()` sans preuve nouvelle post-2026-05-27 (LAW-CHUNK-042 réfute)
- **FORBID-CHUNK-007** : Refactor "optimisation perf O(N²)" sans benchmark before/after démontrant scaling factor > 1.5

**ACTIONS AUTORISÉES** :
- Maintenir `DEFAULT_ADAPTIVE_CONFIG = (0.3, 0.2, 0.1)` par défaut conservateur (cosmétique mais inoffensif)
- Bulk run 254 livres × 9 combos = 11 min Windows-side (V2.1.5 validé)
- Option A timeout/book défensive (env `OMEGA_V2_1_CHUNK_TIMEOUT_MS=60000`)
- Sprint V2.1.6+ audit vrais leviers : target_size / max_chunks / greedy threshold / window_size

**RAPPEL — gridSearch.ts** : Framework existant Sprint S12 mais JAMAIS exécuté production avant V2.1.2. **N'est PAS une preuve de validité comportementale**. À considérer comme source historique uniquement.

---

### 2. DOMAINE : SCORING LITTÉRAIRE & R-METROLOGY (V3.4)

**LIRE AVANT ACTION** :
- `CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md` — Pilier 1 (5 features canoniques) + §1.4 Registre rejets CALC
- `packages/sovereign-engine/src/scoring/dispatcher/coefficients-v3-4.ts` (⚠️ SHA256 actuel = `adbf4102...` ≠ doctrinal `e75e3bb...` — SEAL DRIFT NCR_V2.1)
- `outputs/M0B_SLIM_V34_COEFFICIENTS.json`
- `outputs/M0B_SLIM_V33_CALIBRATION.json`
- `outputs/HOLDOUT_V2.csv` (SHA256 `56636e289f3ceba921e74fcd33c60fc82f7498277f510545d552a9851843b1cf`)
- `outputs/FEATURE_MATRIX_V3.csv`
- `outputs/COMPARE_V2_V3_CORPUS_D_v1.md`
- `outputs/SENSOR_BENCH_REPORT_V2.md`
- `outputs/M0B_SLIM_V35_RETRAIN_VERDICT.md`

**INTERDICTIONS (FAIL_BLOCKING)** :
- **FORBID-SCORING-001** : Suggérer modèle unifié FR/EN. Le dispatch asymétrique (3 modèles Ridge séparés) est loi physique immuable depuis V3.1
- **FORBID-SCORING-002** : Accepter nouveau modèle si `Δρ` de validation croisée < `+0.02` par rapport à baseline `0.6138`
- **FORBID-CALC-001** : Réintégrer émotion keyword CALC (rejet 2026-04-08, Δ Spearman +0.021 < seuil +0.030)
- **FORBID-CALC-002** : Confondre CI_L37 (module rejeté) avec L37 (loi causale scellée)
- **FORBID-CALC-003** : Réintégrer Language Profiles (r négatif vs qualité, Phase R)
- **FORBID-CALC-004** : Réintégrer Genius Engine `G=(D×S×I×R×V)` (r≈0 vs Tier)
- **FORBID-CALC-005** : Réintégrer Polish (Sprint 2, NO-OP prouvé)

**ACTIONS AUTORISÉES** :
- Investigation feature CALC NOUVELLE prouvant un mécanisme NOUVEAU (PLATEAU CALC scellé)
- Audit forensic V3.4 SEAL DRIFT (Sprint V3.5+ 30 min git log)

---

### 3. DOMAINE : PERSONAS (FLAUBERT / PROUST / BESTSELLERS / PVI)

**LIRE AVANT ACTION** :
- `CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md` — Pilier 1.5 (asymétries FR/EN) + 1.6 (paradoxe sensoriel)
- `omega-project/docs/physique-litteraire/corpus-analyse/rapport_analyse_FR.md`
- `omega-project/docs/physique-litteraire/corpus-analyse/rapport_analyse_EN.md`
- `omega-project/docs/physique-litteraire/corpus-analyse/rapport_comparatif_FR_EN.md`
- `omega-project/docs/physique-litteraire/corpus-analyse/inventaire_corpus_classifie.csv`
- `omega-project/docs/physique-litteraire/corpus-analyse/pvi_corpus_FR.csv` + `pvi_corpus_EN.csv`
- `outputs/corpus-analysis/per-work/` (1698 analyses : FR/EN/DE/ES/IT × tier-S/A/B/C/D/bestseller/unclassified)
- `outputs/corpus-analysis/per-work/en/bestseller/` (42 analyses bestsellers EN)

**INTERDICTIONS (FAIL_BLOCKING)** :
- **FORBID-PVI-001** : Mélanger analyses Bestsellers (FR-A, EN-A) et Chefs-d'œuvre (FR-B, EN-B) sans appliquer filtrage par `tier`
- **FORBID-PVI-002** : Claim "discrimination FR" sans CE comme variable principale (Δ=+1.812, rang 1)
- **FORBID-PVI-003** : Refaire analyse PVI corpus existant sans démontrer corpus différent ou méthode différente

**ACTIONS AUTORISÉES** :
- Nouvelle catégorisation tier si justifiée
- Extension corpus PVI avec auteurs non couverts (Tier-A FR : Houellebecq/EL James/Beckett/Hugo/Camus/Musso couverts)

---

### 4. DOMAINE : DOCTRINE / GOUVERNANCE / SPRINT

**LIRE AVANT ACTION** :
- `omega-project/CLAUDE.md` (v3.158.0 — EMP-09/10/11 actifs)
- `omega-project/docs/governance/SPRINT_S8_DOCTRINAL_AMENDMENTS.md` (amendements 1-6)
- `omega-project/docs/governance/SPRINT_S11_DOCTRINAL_AMENDMENTS.md` (EMP-09/10)
- `omega-project/docs/governance/SPRINT_S12_DOCTRINAL_AMENDMENTS.md` (EMP-11)
- `omega-project/docs/governance/GOVERNANCE_INVARIANTS.md`
- `omega-project/docs/governance/HUMAN_OVERRIDE.md`
- `CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md` Partie II §5
- (v1.2) `OMEGA_CODEX_CONTROL_BEFORE_WRITE.md`

**INTERDICTIONS (FAIL_BLOCKING)** :
- **FORBID-DOCTRINE-001** : Modification FROZEN modules (V-01 : sentinel + genome Phase 28 SEALED)
- **FORBID-DOCTRINE-002** : Commit sans wrapper EMP-10 `commit-with-tests.ps1`
- **FORBID-DOCTRINE-003** : Seal Sprint significatif sans EMP-11 Bloc A (7 axes) + Bloc B (7 patterns)
- **FORBID-DOCTRINE-004** : Activer `noEmitOnError` ou fix mécanique massif sans EMP-09 MASK_REVEAL_AUDIT DRY-RUN 5 axes
- **FORBID-DOCTRINE-005** : Décider sur conflit Architecte vs IA (E-14 : ask Francky)

**ACTIONS AUTORISÉES** :
- Extension layers de packages SEALED (canon-kernel, genome, etc.)
- Nouvelle doctrine EMP-XX si Architect approuve
- NCR ouverture pour ambiguïté

---

### 5. DOMAINE : TYPESCRIPT / TSC / COMPILATION

**LIRE AVANT ACTION** :
- `omega-project/CLAUDE.md` (Sections E + F)
- `omega-project/docs/governance/SPRINT_S11_DOCTRINAL_AMENDMENTS.md` (EMP-09 MASK_REVEAL_AUDIT)
- `omega-project/docs/governance/SPRINT_S12_DOCTRINAL_AMENDMENTS.md` (EMP-11 PRE_SEAL_AUDIT_CHECKLIST)
- Memory `feedback_ssot_methodology` + `feedback_audit_first_rule`
- Memory `feedback_powershell_*` (5+ patterns PS5.1)

**INTERDICTIONS (FAIL_BLOCKING)** :
- **FORBID-TS-001** : Activer `noEmitOnError: true` sans audit DRY-RUN 5 axes Windows-MCP préalable (EMP-09)
- **FORBID-TS-002** : Fix mécanique massif >50 fichiers sans audit Mask-Reveal seuil `MASK_REVEAL_DELTA_THRESHOLD` (défaut 0 strict)
- **FORBID-TS-003** : `@ts-expect-error` multi-line statement (préférer `@ts-ignore` cf [[feedback_ts_expect_error_vs_ignore]])
- **FORBID-TS-004** : Edit tool multi-Edits TS sur mount omega-project Windows (NUL bytes artifact, préférer patch files)

**ACTIONS AUTORISÉES** :
- TSC strict mode avec audit préalable
- Pattern `void <import>;` documenté SSOT pour TS6133

---

### 6. DOMAINE : FRONTEND / APPS

**LIRE AVANT ACTION** :
- `omega-project/apps/omega-ui/README.md` (isolation frontend)
- `CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md` Partie I (NE PAS confondre avec backend)
- Memory `feedback_workspace_vs_repo_drift_sandbox_windows`

**INTERDICTIONS (FAIL_BLOCKING)** :
- **FORBID-FRONTEND-001** : Mélanger frontend et backend dans même PR
- **FORBID-FRONTEND-002** : Modifier omega-ui sans respect isolation NCR_OMEGA_UI_RESOLVED_BY_DESIGN

---

### 7. DOMAINE : LLM / SCRIBE / GÉNÉRATION

**LIRE AVANT ACTION** :
- `CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md` — Piliers 2 + 3 (Psychologie LLM + Hybridation)
- `omega-project/docs/CLAUDE_OBSERVABLE_LAWS.md` (15 lois L01-L15)
- `omega-project/docs/CLAUDE_BLACKBOX_ARCHAEOLOGY.md`
- `omega-project/docs/CLAUDE_BLACKBOX_LITERARY_CONSTRAINTS.md`
- `omega-project/docs/adr/DEC-20260411-003-R6-REJECTION-SAMPLING.md` (CALC=Douanier)

**INTERDICTIONS (FAIL_BLOCKING)** :
- **FORBID-LLM-001** : Feedback sémantique CALC → LLM (Bench R6 Δ-0.264, toxique)
- **FORBID-LLM-002** : Itération globale de correction (Premier tir > convergence)
- **FORBID-LLM-003** : Single-shot >800 mots sans K2 chunking (plafond d'asphyxie)
- **FORBID-LLM-004** : Donner au LLM résultats de ses propres évaluations CALC (Contrat SCRIBE/OMEGA §3.1)

---

### 8. DOMAINE : INFRASTRUCTURE / SHELL / POWERSHELL / SANDBOX

**LIRE AVANT ACTION** :
- Memory `feedback_powershell_*` (5+ patterns)
- Memory `feedback_ps51_encoding_unicode_pattern` (em-dash mojibake)
- Memory `feedback_workspace_vs_repo_drift_sandbox_windows`
- Memory `feedback_env_vars_persist_detached_ps`

**INTERDICTIONS (FAIL_BLOCKING)** :
- **FORBID-INFRA-001** : Scripts PS5.1 avec caractères Unicode (é, è, ×, —, §) — mojibake parse error
- **FORBID-INFRA-002** : `Start-Process -FilePath "npx"` (Win32-invalid `.cmd`) — utiliser `node + cli.mjs` direct
- **FORBID-INFRA-003** : Env vars `$env:VAR=...` puis `Start-Process` detached sans `-ArgumentList` injection
- **FORBID-INFRA-004** : Apply/pop/drop git stashes préservés sous protection doctrinale formelle (S6-PRE-RECOVERY contient 31794 deletions FROZEN)
- **FORBID-INFRA-005** : Bash sandbox >45s timeout (utiliser detached PowerShell Windows-side)

---

## TABLE "SI TU TRAVAILLES SUR X, LIS Y" (lookup rapide)

```
Sujet de session                          → Domaine      → Documents minimum à lire
─────────────────────────────────────────────────────────────────────────────────
"calibration chunking"                    → CHUNKING     → LAW-CHUNK-040/041/042 + gridSearch.ts + V2.1.5.1 audit
"améliorer w1/w2/w3"                       → CHUNKING     → FORBID-CHUNK-001 (cosmétique prouvé)
"O(N²) chunking lent"                      → CHUNKING     → LAW-CHUNK-042 (factor 0.95 linéaire réfute)
"nouveau modèle scoring"                   → SCORING      → FORBID-SCORING-002 (Δρ ≥ +0.02 obligatoire)
"unifier FR/EN scoring"                    → SCORING      → FORBID-SCORING-001 (dispatch immuable)
"analyser Flaubert"                        → PVI/CORPUS   → rapport_analyse_FR.md + corpus-analyse/
"bestseller analyse"                       → PVI/CORPUS   → 42 analyses corpus-analysis/per-work/en/bestseller/
"activer noEmitOnError"                    → TYPESCRIPT   → EMP-09 MASK_REVEAL_AUDIT obligatoire
"commit production"                        → DOCTRINE     → EMP-10 wrapper commit-with-tests.ps1
"seal Sprint"                              → DOCTRINE     → EMP-11 Bloc A + Bloc B (14 axes)
"feedback LLM"                             → LLM          → FORBID-LLM-001 (toxique R6 Mode C)
"script PowerShell"                        → INFRA        → ASCII strict (PS5.1 mojibake)
"créer CODEX/référence"                    → DOCTRINE     → CODEX v1.X EXISTE — amendement incrémental
"refactor module FROZEN"                   → DOCTRINE     → FORBID-DOCTRINE-001 (V-01)
"bulk corpus livres"                       → CHUNKING     → V2.1.5 méthode + Option A timeout
```

---

## RAPPEL FINAL

**Si lecture preflight a pris < 10 minutes pour un Sprint significatif → preflight insuffisant**. Le Codex et les NCRs représentent 6+ mois de R&D. Lecture rapide = redondance future garantie.

**Si trouvaille apparente "nouvelle" sans précédent dans Codex → suspicion. Re-vérifier registres FORBID-* et HALLU-IA-* avant proposer.**

---

_OMEGA PREFLIGHT LOOKUP v1.0 SEALED — 2026-05-27 — Doctrine EMP-12 — Lectorat IA (humain plus tard)_
