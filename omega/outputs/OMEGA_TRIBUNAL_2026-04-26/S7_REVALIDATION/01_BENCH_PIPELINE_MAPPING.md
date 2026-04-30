# S7.1 — BENCH ↔ PIPELINE MAPPING (POST-S6)

**Date** : 2026-04-28
**Owner** : Claude Code (IA Principal)
**Branch** : `phase-r-dispatcher-v33` (clean, HEAD `2c66c15e`)
**Tag de référence** : `phase-s-s6-engine-runtime-restored-2026-04-27` → `aca0f393`
**Standard** : NASA-Grade L4 / DO-178C Level A
**Doctrine appliquée** : PROVE IT — read-only strict, aucun bench, aucun re-test, aucun fix, aucun commit.

---

## ⚠️ NCR PRÉ-AUDIT MANQUANT

Le pré-audit Cowork référencé dans le prompt :
```
OMEGA/outputs/OMEGA_TRIBUNAL_2026-04-26/S7_PREP_PROMPTS_AUTONOMIE/02_AUDIT_PRE_SPRINT_S7_MAPPING_BENCHES.md
```
**N'EXISTE PAS dans le repo.** Vérifié : `OMEGA/outputs/` contient seulement
`OMEGA_SNAPSHOTS/`. Hypothèses Cowork (5 SUSPECTS HIGH + 1 INCERTAIN) traitées
comme INFORMATIVES, non comme contraintes. Mapping conduit empiriquement à
partir des fichiers/imports/commits — pas sur foi des hypothèses Cowork.

→ **Validation des hypothèses Cowork ex-post** (cf. §VALIDATION_HYPOTHESES_COWORK).

---

## RÉSUMÉ EXÉCUTIF

| # | Décision | Pipeline | Statut | Action S7.2 |
|---|---|---|---|---|
| 1 | V1_SEAL (commit `0c3cbc48`, 2026-04-13) | TRAVERSE engine.ts | **SUSPECT_REVALIDATE** | Re-bench `bench-v-atomic-v5.ts` |
| 2 | R7 Best-of-N N=7/DUEL_RUNS=2 (commit `4336e1b8`, 2026-04-13) | TRAVERSE engine.ts | **SUSPECT_REVALIDATE** | Mêmes 4 scènes (couvert avec #1) |
| 3 | R6 Rejection Gate Mode B (ADR `DEC-20260411-003`, 2026-04-11) | UNKNOWN | **UNKNOWN** | Arbitrage Architecte |
| 4 | Cliff Gate SHADOW R7-B (commit `0c3cbc48`, 2026-04-13) | TRAVERSE engine.ts | **SUSPECT_REVALIDATE** | Couvert par re-bench #1 (même commit) |
| 5 | M2 Adaptive Deadlock (2026-04-19) | CONTOURNE engine.ts | **VALIDATED** | Aucune (économie S7.2) |
| 6 | CATHEDRAL baseline (2026-04-18) | CONTOURNE engine.ts | **VALIDATED** | Aucune (économie S7.2) |

**Décisions à re-tester en S7.2 : 3 (V1_SEAL + R7 + Cliff Gate, mutualisables sur 1 seul bench)**
**Décisions VALIDATED post-S6 : 2 (M2 + CATHEDRAL)**
**Décisions UNKNOWN à escalader : 1 (R6 Mode B — bench source absent du repo)**

---

## TABLEAU RÉCAPITULATIF DES PIPELINES TRAVERSÉS

| ID | Bench script | Imports clés | Engine.ts ? | Provider | Pipeline réel |
|---|---|---|---|---|---|
| V1_SEAL | `packages/sovereign-engine/scripts/bench-v-atomic-v5.ts` | `runSovereignForgeWithPacket` (`engine.js`), `createAnthropicProvider` | **OUI** (l.13) | Anthropic | engine.ts complet |
| R7 N=7 | `bench-v-atomic-v5.ts` (mêmes 4 scènes, env `OMEGA_DUEL_RUNS=2`) | idem | **OUI** | Anthropic | engine.ts → duel-engine.ts |
| R6 Mode B | `bench-r6-hybrid.ts` (**ABSENT** du repo, jamais committé) | n/d | UNKNOWN | n/d | UNKNOWN |
| Cliff R7-B | `bench-v-atomic-v5.ts` (mêmes 4 scènes) | idem | **OUI** | Anthropic | engine.ts:505-537 (cliff post-duel) |
| M2 Adaptive | `packages/sovereign-engine/scripts/bench-p1-robustness-v3.ts` | `planAdaptiveChunkingV2B2`, `pickPacingDirective`, `extractDispatcherFeatures`, `COEFFICIENTS_V3_4` | **NON** | Ollama HTTP direct (`callOllama` l.389) | adaptive-chunker + scoring isolé |
| CATHEDRAL | `packages/sovereign-engine/scripts/bench-ablation-directive.ts` | idem M2 | **NON** | Ollama HTTP direct (`callOllama` l.389) | adaptive-chunker + scoring isolé |

---

## FICHE DÉTAILLÉE — DÉCISION #1 — V1_SEAL

- **ID décision** : V1_SEAL (R7-B SHADOW + 3-shot interiority/impact)
- **Date / commit / tag** : 2026-04-13 / `0c3cbc48` / message "feat(sovereign-engine): R7-B micro-fixes — cliff gate shadow, 3-shot interiority/impact"
- **Bench / test utilisé** : `packages/sovereign-engine/scripts/bench-v-atomic-v5.ts` (4 scènes : contemplation, menace, revelation, confrontation)
- **Sortie observée** : `packages/sovereign-engine/sessions/MINI_V5R6_2026-04-13_1776079434882/`
  - `MINI_V5R6_RESULTS.json` (composite avg 90.07, min_axis avg 83.58, contemplation 91.74)
  - `DUEL_MATRIX.json`, `confrontation.txt`, `contemplation.txt`, `menace.txt`, `revelation.txt`
- **Commande historique** : `npx tsx scripts/bench-v-atomic-v5.ts` (cf. header script l.4)
- **Imports réels du script** (vérifiés au commit `0c3cbc48` et au HEAD) :
  ```ts
  import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
  import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
  import type { ForgePacket } from '../src/types.js';
  ```
- **Pipeline traversé** : **TRAVERSE engine.ts complet** (orchestrateur principal `runSovereignForgeWithPacket`)
- **Provider** : Anthropic (Claude Opus, via `createAnthropicProvider`)
- **Dépendances runtime confirmées** : engine.ts → duel-engine.ts → cliff gate (l.505-537) → multi-stage-scorer V3 → axes/interiority.ts (R7-B 3-shot l.27) → axes/impact.ts (R7-B 3-shot l.27)
- **Statut post-S6** : **SUSPECT_REVALIDATE**
- **Justification verbatim** :
  - Commit `0c3cbc48` modifie `packages/sovereign-engine/src/engine.ts` (+66 lignes), `oracle/axes/impact.ts` (+27/-?), `oracle/axes/interiority.ts` (+27/-?), `duel/duel-engine.ts` (+12/-?). Le bench utilisé invoque l'orchestrateur `runSovereignForgeWithPacket` (engine.ts ligne 13 du script).
  - S6 (gate:imports) confirme runtime-importable, mais ne mesure PAS la qualité prose. Composite 90.07 et min_axis 83.58 doivent être re-mesurés.

---

## FICHE DÉTAILLÉE — DÉCISION #2 — R7 BEST-OF-N (N=7, DUEL_RUNS=2)

- **ID décision** : R7 Best-of-N — étendre pool de N=4 à N=7 candidats par duel
- **Date / commit** : 2026-04-13 / `4336e1b8` / "feat(sovereign-engine): R7 Best-of-N duel — extend pool from N=4 to N=7 candidates"
- **Bench / test utilisé** : `packages/sovereign-engine/scripts/bench-v-atomic-v5.ts` (4 scènes, env `OMEGA_DUEL_RUNS=2`)
- **Sortie observée** : `packages/sovereign-engine/sessions/MINI_V5R6_2026-04-13_1776060510902/`
  - `MINI_V5R6_RESULTS.json`, `DUEL_MATRIX.json` (358 lignes), 4 prose .txt
- **Commande historique** : `OMEGA_DUEL_RUNS=2 npx tsx scripts/bench-v-atomic-v5.ts` (cf. commit message + duel-engine.ts l.43-45)
- **Imports réels du script** : identiques à #1 (TRAVERSE engine.ts via `runSovereignForgeWithPacket`)
- **Pipeline traversé** : **TRAVERSE engine.ts complet** → `duel-engine.ts` (boucle outer DUEL_RUNS, l.121-125 actuel)
- **Provider** : Anthropic
- **Dépendances runtime confirmées** : `packages/sovereign-engine/src/duel/duel-engine.ts` lignes 43-59 actuelles : `getDuelRuns()` parse `OMEGA_DUEL_RUNS`, lignes 121-125 commentaire R7. Code modifié dans le commit (+156/-63 lignes sur duel-engine.ts).
- **Statut post-S6** : **SUSPECT_REVALIDATE**
- **Justification verbatim** :
  - duel-engine.ts modifié de manière significative (commit touche 156 lignes). Le bench utilisé traverse l'orchestrateur engine.ts qui appelle duel-engine.ts.
  - Métriques : avg comp +0.5 vs P6, confrontation +5.1 comp / +10.7 min_axis, σ(comp) -85% — non re-vérifié post-S6.
  - Mutualisable avec re-bench V1_SEAL (même script, même 4 scènes, juste ajouter env `OMEGA_DUEL_RUNS=2`).

---

## FICHE DÉTAILLÉE — DÉCISION #3 — R6 REJECTION GATE MODE B

- **ID décision** : R6 Rejection Sampling Mode B (Gate Dur, threshold 4.2)
- **Date / ADR** : 2026-04-11 / `docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md`
- **Bench / test utilisé (référencé dans ADR §header)** : `bench-r6-hybrid.ts` — **ABSENT DU REPO**
- **Recherche exhaustive** :
  - `find . -name "bench-r6-hybrid*"` → 0 résultat
  - `git log --all --diff-filter=D --name-only` ne mentionne PAS de fichier `bench-r6-hybrid.ts` supprimé
  - `git log --all --pretty="..."` 2026-04-11 → aucun commit ce jour-là
- **Imports / pipeline** : INVÉRIFIABLES (script absent)
- **Provider** : Ollama Qwen 3.5:35b-a3b (référencé ADR §header, non vérifiable empiriquement)
- **Module gate présent dans repo** :
  - `packages/sovereign-engine/src/gate/r6-rejection-gate.ts` (logique cœur)
  - `packages/sovereign-engine/src/gate/r6-calc-scorer.ts`
  - `packages/sovereign-engine/src/gate/r6-pipeline-adapter.ts`
  - **Wired dans engine.ts** : `import { isR6GateEnabled, runR6GateInPipeline } from './gate/r6-pipeline-adapter.js';` (engine.ts l.86), appelé l.338.
- **Tests présents** :
  - `packages/sovereign-engine/tests/gate/r6-integration.test.ts`
  - `packages/sovereign-engine/tests/gate/r6-rejection-gate.test.ts`
- **Statut post-S6** : **UNKNOWN**
- **Justification verbatim** :
  - L'ARCHITECTURE est validée (module présent, wired, testé).
  - Le BENCH originel (10 scènes × 3 modes A/B/C, gate=4.2, score moyen Mode B = 4.600 vs A = 4.255 vs C = 3.547) ne peut être reproduit : `bench-r6-hybrid.ts` introuvable. Critère PASS S7.1 = "PREUVE de pipeline réel (chemin fichier + import vérifié)" — fichier absent → preuve impossible.
  - Note : le commit `b05851f5` (2026-04-20) "feat(src+tests): anti-loss D1+D2 — R6 gate + V3.4 coefficients + sensors V2 + runtime ollama" landed le code R6, mais 9 jours après l'ADR — bench source jamais committé.

---

## FICHE DÉTAILLÉE — DÉCISION #4 — CLIFF GATE SHADOW R7-B

- **ID décision** : Cliff Gate neutralisé en mode SHADOW (log only, no prose amputation)
- **Date / commit** : 2026-04-13 / `0c3cbc48` (MÊME COMMIT que V1_SEAL)
- **Bench / test utilisé** : `packages/sovereign-engine/scripts/bench-v-atomic-v5.ts` (mêmes 4 scènes)
- **Sortie observée** : `MINI_V5R6_RESULTS.json` (cliff_score=0.7 sur contemplation/menace/revelation, =0.5 sur confrontation, verdict=REJECT — Cliff désactivé en SHADOW comme prévu)
- **Commande historique** : `npx tsx scripts/bench-v-atomic-v5.ts`
- **Imports réels** : TRAVERSE engine.ts via `runSovereignForgeWithPacket`
- **Pipeline traversé** : **TRAVERSE engine.ts complet**, segment Cliff Gate spécifique `engine.ts:505-537` (post-duel/microsurgery)
- **Provider** : Anthropic
- **Dépendances runtime confirmées (HEAD actuel)** :
  - engine.ts l.505-537 : Cliff Gate logic intact (CLIFF_THRESHOLD=0.30, SHADOW R7-B, log-only).
  - Commentaire l.524 : "R7-B: Cliff Gate NEUTRALIZED → shadow mode only."
  - Commentaire l.525-530 : DIAGNOSTIC (2026-04-13).
- **Statut post-S6** : **SUSPECT_REVALIDATE**
- **Justification verbatim** :
  - Bench identique à V1_SEAL (#1). Cliff Gate change est un comportement engine.ts (post-duel hook). Bytes-équivalence S6 garantit module importable, MAIS les conséquences scoring/duel sont à re-mesurer (cliff_score=0.7 100% trigger sur K2 prose était la justification originale du SHADOW).
  - **Couvert intégralement par re-bench #1** (mêmes 4 scènes, même commit, même script).

---

## FICHE DÉTAILLÉE — DÉCISION #5 — M2 ADAPTIVE DEADLOCK INTERIOR

- **ID décision** : NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR (FIX_VALIDATED_SCOPED, env-gated `OMEGA_P1V3_ANTI_REPEAT`)
- **Date** : 2026-04-19 (ouvert matin, FIX validé nuit, Phase 1 A.1 STRICT)
- **Bench utilisé** : `packages/sovereign-engine/scripts/bench-p1-robustness-v3.ts` (1603 lignes, 144 runs design 6 scènes × 4 modes × 6 seeds)
- **Sortie observée** :
  - Bench v3 baseline : `bench-p1-robustness-v3-results.json` SHA256 `7DA99121..DC0FE89` (11/24 timeouts INTERIOR REPRO)
  - Bench Phase 1 A.1 fix : `bench-p1-robustness-v3-phase1-A1.json` SHA256 `C8C2E8DC..1DA42ED` (15/15 OK, 0 timeout)
- **Commande historique** : `npx tsx scripts/bench-p1-robustness-v3.ts` (cf. header l.43-46)
- **Imports réels du script** (vérifiés HEAD) :
  ```ts
  import { execSync } from 'node:child_process';
  import { createHash } from 'node:crypto';
  import {
    planAdaptiveChunkingV2B2,
    buildStaticPlan,
    pickPacingDirective,
    detectArchetype,
    type AdaptiveChunkConfig,
    ...
  } from '../src/generation/adaptive-chunker.js';
  import type { EmotionContract, EmotionQuartile } from '../src/types.js';
  import { extractDispatcherFeatures } from '../src/scoring/dispatcher/features-provenance.js';
  import { COEFFICIENTS_V3_4, type LangKey, type LangModel } from '../src/scoring/dispatcher/coefficients-v3-4.js';
  import { DISPATCHER_FEATURE_NAMES } from '../src/scoring/dispatcher/features-provenance.js';
  ```
  → **AUCUN import de `engine.js` ou `chunked-generator.js`**.
- **Pipeline traversé** : **CONTOURNE engine.ts** — bench implémente sa propre boucle générative :
  - Plan via `buildStaticPlan` / `planAdaptiveChunkingV2B2` (chunker)
  - Directive via `pickPacingDirective`
  - Génération via `callOllama()` (fonction locale l.389, requête HTTP directe à Ollama l.536-542)
  - Scoring via `extractDispatcherFeatures` (l.604) + `COEFFICIENTS_V3_4` (calcul score CALC V3.4)
- **Provider** : Ollama qwen3:32b (HTTP direct, pas via runtime/ollama-provider.ts)
- **Dépendances runtime traversées** :
  - `@omega/omega-forge` → NON
  - macro-axes → NON
  - s-oracle-v2 → NON
  - micro-surgeon → NON
  - r6 gate → NON
  - dedale → NON
  - **adaptive-chunker** → OUI
  - **scoring/dispatcher (V3.4)** → OUI
- **Statut post-S6** : **VALIDATED**
- **Justification verbatim** :
  - Bench CONTOURNE engine.ts (preuve : aucun import de engine.js, propre boucle Ollama).
  - Modules importés (`adaptive-chunker.js`, `features-provenance.js`, `coefficients-v3-4.js`) inclus dans la chain de build sovereign-engine S6 (gate:imports PASS — 244 exports).
  - Diagnostic mécanisme (H4 loop language qwen3:32b) prouvé empiriquement par fix env-gated `OMEGA_P1V3_ANTI_REPEAT={repeat_penalty:1.4, frequency_penalty:0.6, repeat_last_n:256}`.
  - Fix scellé (NCR §10) avec invariants : SHA256 baseline reproductible (test T6 garantit bytes-equivalence ANTI_REPEAT=0).
  - Aucune raison empirique de re-tester : finding indépendant de engine.ts, fix env-only.

---

## FICHE DÉTAILLÉE — DÉCISION #6 — CATHEDRAL BASELINE (NCR_CATHEDRAL_BASELINE)

- **ID décision** : NCR_CATHEDRAL_BASELINE (DIAGNOSED, H1 confirmée 81.1%)
- **Date** : 2026-04-18 (Phase 1 H1 confirmée, unanimité 3/3 IA)
- **Bench utilisé** :
  - `packages/sovereign-engine/scripts/bench-ablation-directive.ts` (24 runs, 2x2 factoriel, 2 scènes × 4 variants × 3 seeds)
  - Plus audit feature : `packages/sovereign-engine/audit-cathedral-features-v1-results.json` SHA256 `7B720C9183D41B976D10C27348A2647DE2EF7B5188E6018CE2C7EA3ADDE58941`
- **Sortie observée** :
  - `packages/sovereign-engine/bench-ablation-directive-results.json` SHA256 `F33209CD3C9A8237BDC7C14316FE26F3E7153D6D1FC1CB92CD0424004A561555`
  - `packages/sovereign-engine/bench-ablation-directive-results-report.md` SHA256 `688542027EE3D1901FD6803E152D2CD73FE72347CC5F7F512C55C1FEAF9E9A81`
  - Diagnostic : `outputs/PHASE_1_CATHEDRAL_DIAGNOSTIC_v1.md`
- **Commande historique** : `npx tsx scripts/bench-ablation-directive.ts` (cf. header l.45-48)
- **Imports réels du script** (vérifiés HEAD) :
  ```ts
  import { execSync } from 'node:child_process';
  import {
    planAdaptiveChunkingV2B2,
    buildStaticPlan,
    pickPacingDirective,
    type AdaptiveChunkConfig,
    type ChunkPlan,
    ...
  } from '../src/generation/adaptive-chunker.js';
  import type { EmotionContract, EmotionQuartile } from '../src/types.js';
  import { extractDispatcherFeatures } from '../src/scoring/dispatcher/features-provenance.js';
  import { COEFFICIENTS_V3_4, type LangKey, type LangModel } from '../src/scoring/dispatcher/coefficients-v3-4.js';
  import { DISPATCHER_FEATURE_NAMES } from '../src/scoring/dispatcher/features-provenance.js';
  ```
  → **AUCUN import de `engine.js`**. Imports identiques au bench M2 (#5).
- **Pipeline traversé** : **CONTOURNE engine.ts** — même architecture que M2 :
  - Plan via `buildStaticPlan` / `planAdaptiveChunkingV2B2`
  - Directive via `pickPacingDirective`
  - Génération via `callOllama()` (l.389, HTTP direct l.408-414)
  - Scoring via `extractDispatcherFeatures` (l.604 idem M2)
- **Provider** : Ollama qwen3:32b (HTTP direct)
- **Dépendances runtime traversées** : identiques à M2 (#5) — adaptive-chunker + scoring V3.4 uniquement.
- **Statut post-S6** : **VALIDATED**
- **Justification verbatim** :
  - Bench CONTOURNE engine.ts (preuve : pas d'import engine.js).
  - Diagnostic décisif "f33b_commas_count = 81.1% du gap" est un finding **purement scoring/CALC**, repose UNIQUEMENT sur `extractDispatcherFeatures` + `COEFFICIENTS_V3_4`. Indépendant de toute logique engine.ts/duel/cliff.
  - Coefficients V3.4 scellés : `M0B_SLIM_V34_COEFFICIENTS.json` SHA256 `e75e3bb07d8655c6e0ee1ca99b32a2a043a44cb9c1681ee3d7a3dd305fe8424c`.
  - S6 gate:imports PASS confirme modules scoring importables. Reproductibilité parfaite à 3 décimales déjà documentée (NCR §VERDICT, audit Ollama 6.77 min).
  - Aucune raison empirique de re-tester : biais de calibration scorer, pas effet pipeline.

---

## SCRIPTS HISTORIQUES TROUVÉS (référencés)

| Script | Localisation | Usage |
|---|---|---|
| `bench-v-atomic-v5.ts` | `packages/sovereign-engine/scripts/` | V1_SEAL, R7 N=7, Cliff Gate R7-B (toutes traversent engine.ts) |
| `bench-p1-robustness-v3.ts` | `packages/sovereign-engine/scripts/` | M2 Adaptive Deadlock (CONTOURNE engine.ts) |
| `bench-ablation-directive.ts` | `packages/sovereign-engine/scripts/` | CATHEDRAL baseline (CONTOURNE engine.ts) |
| `bench-r6-hybrid.ts` | **ABSENT** du repo | R6 Rejection Gate Mode B (pipeline UNKNOWN) |
| `bench-bestof3-validation.ts` | `packages/sovereign-engine/scripts/` | Référence cousine (best-of-N Anthropic, ne traverse pas engine.ts) |
| `bench-bestof3-ollama.ts` | `packages/sovereign-engine/scripts/` | Référence cousine (best-of-N Ollama, idem) |
| `r6-validate-v3.ts` | `packages/sovereign-engine/scripts/` | R6 Tribunal Académique (validation scorer Flaubert vs LLM, pure scoring, ne traverse pas engine.ts) |
| `validate-hybrid.ts` | `packages/sovereign-engine/scripts/` | BLOC 6 hybrid validation (TRAVERSE engine.ts via `runSovereignForgeWithPacket`) |
| `bench-p5-quick.ts` | `packages/sovereign-engine/scripts/` | P5 Quick (TRAVERSE engine.ts) |

---

## VALIDATION DES HYPOTHÈSES COWORK (ex-post)

| Cible | Hypothèse Cowork | Vérité empirique | Verdict Cowork |
|---|---|---|---|
| V1_SEAL | SUSPECT HIGH (TRAVERSE engine.ts probable) | TRAVERSE engine.ts (confirmé via import l.13 bench-v-atomic-v5.ts) | ✅ **CONFIRMÉ** |
| R7 Best-of-N | SUSPECT HIGH (TRAVERSE engine.ts probable) | TRAVERSE engine.ts (même bench que V1_SEAL) | ✅ **CONFIRMÉ** |
| Cliff Gate | SUSPECT HIGH (TRAVERSE engine.ts probable) | TRAVERSE engine.ts (même commit + même bench que V1_SEAL) | ✅ **CONFIRMÉ** |
| M2 Adaptive | SUSPECT HIGH (TRAVERSE engine.ts probable) | **CONTOURNE engine.ts** (bench-p1-robustness-v3.ts importe seulement adaptive-chunker + scoring) | ❌ **INVALIDÉ** — Cowork sur-estimait le risque |
| CATHEDRAL | SUSPECT HIGH (TRAVERSE engine.ts probable) | **CONTOURNE engine.ts** (bench-ablation-directive.ts idem) | ❌ **INVALIDÉ** — Cowork sur-estimait le risque |
| R6 Rejection Gate | INCERTAIN (probable INDEMNE chunked-generator) | **UNKNOWN** (bench source `bench-r6-hybrid.ts` absent du repo, impossible de vérifier path) | ⚠️ **NON VÉRIFIABLE** — hypothèse plausible mais bench manquant |

**Score Cowork : 3/6 confirmés, 2/6 invalidés (sur-estimation), 1/6 non vérifiable.**

---

## DÉCISIONS REVALIDATE (input S7.2)

3 décisions, **mutualisables sur 1 seul re-bench** :
1. **V1_SEAL** (`0c3cbc48`)
2. **R7 Best-of-N** (`4336e1b8`)
3. **Cliff Gate SHADOW R7-B** (`0c3cbc48`)

→ Bench à relancer : `packages/sovereign-engine/scripts/bench-v-atomic-v5.ts`
→ 4 scènes (contemplation, menace, revelation, confrontation)
→ Env : `OMEGA_DUEL_RUNS=2 OMEGA_CHUNKED_V4=1 OMEGA_PROMPT_V4=1`
→ Provider : Anthropic (clés `.env`)
→ Estimation duration : ~50-65 min wall-clock (4 scènes × duel × 3-shot interiority/impact, basé sur durations observées 3.4-4.3 millions ms / scène = ~58-72 min/scène avec Anthropic Sonnet … REVOIR si on bascule Ollama, prévoir 4-6h).
→ Critères de revalidation (à figer ex-ante, à valider par Architecte) :
  - composite avg ≥ 88 (R7-B 90.07 baseline, tolérance −2 pts pour drift saisonnier LLM)
  - min_axis avg ≥ 80 (R7-B 83.58)
  - σ(comp) confrontation faible (R7 réduisait −85%)
  - Cliff Gate SHADOW : 0 amputation sur les 4 scènes (cliff_score≥0.30 attendu mais log-only)

## DÉCISIONS VALIDATED (économie S7.2)

2 décisions, aucun re-test requis :
1. **M2 Adaptive Deadlock** — bench-p1-robustness-v3.ts CONTOURNE engine.ts, fix env-gated, T6 garantit bytes-equivalence baseline.
2. **CATHEDRAL baseline** — bench-ablation-directive.ts CONTOURNE engine.ts, diagnostic feature-level (f33b 81% gap), coefficients V3.4 scellés.

## DÉCISIONS INVALIDATED (NCR ouverte immédiat)

**Aucune.** Aucune cassure observée empiriquement à ce stade (S6 gate:imports PASS, modules importables, code historique préservé).

## DÉCISIONS UNKNOWN (escalade Architecte)

1. **R6 Rejection Gate Mode B** (ADR `DEC-20260411-003`)
   - **Cause** : bench source `bench-r6-hybrid.ts` absent du repo, jamais committé.
   - **Options Architecte** :
     - **A** : Reconstruire `bench-r6-hybrid.ts` à partir de l'ADR (10 scènes × 3 modes A/B/C, gate=4.2, Ollama qwen). Coût : 1-2h dev + 2-3h GPU.
     - **B** : Accepter R6 Mode B comme architecturalement validé via tests unitaires/intégration présents (`tests/gate/r6-rejection-gate.test.ts`, `tests/gate/r6-integration.test.ts`) + module wired engine.ts l.86/338. Pas de re-bench.
     - **C** : Marquer R6 Mode B comme "decision sans bench source — validity by ADR + tests only". Documenter dans NCR séparé.

---

## RECOMMANDATION S7.2

**Liste REVALIDATE = 3** → S7.2 RÉDUIT (3-4h GPU si Ollama, ~1h si Anthropic Sonnet, mais R7-B baseline était Anthropic Opus à ~58 min/scène = ~4h).

**Plan S7.2 minimal recommandé** :
1. **Re-bench unique** : `bench-v-atomic-v5.ts` 4 scènes, `OMEGA_DUEL_RUNS=2`, provider Anthropic.
   - Couvre simultanément V1_SEAL + R7 + Cliff Gate.
   - Comparer composite/min_axis vs baseline `MINI_V5R6_2026-04-13_1776079434882/MINI_V5R6_RESULTS.json`.
   - Critère PASS : ≥3/4 scènes ≥ baseline−2 pts composite.
2. **Arbitrage R6 Mode B** : Architecte choisit Option A/B/C ci-dessus.
3. **Économies confirmées** : M2 + CATHEDRAL pas de re-test (deux scripts CONTOURNES engine.ts, modules importables S6).

**Estimation totale GPU/wall-clock S7.2** :
- Anthropic Sonnet (recommandé) : ~1-2h pour bench-v-atomic-v5
- Anthropic Opus (baseline R7-B) : ~3-4h pour bench-v-atomic-v5
- + 0-3h R6 selon option (A=2-3h, B/C=0h)

**Total estimé : 1-7h selon configuration.**

---

## INVARIANTS RESPECTÉS

- ✅ Read-only strict (aucune modification code/test)
- ✅ Aucun bench long exécuté
- ✅ Aucun cleanup, aucun fix, aucun commit
- ✅ Aucun verdict définitif posé sans preuve runtime/import
- ✅ Hypothèses Cowork validées empiriquement (3 confirmées, 2 invalidées, 1 non vérifiable)
- ✅ Tag de référence S6 préservé : `phase-s-s6-engine-runtime-restored-2026-04-27` → `aca0f393`
- ✅ Working tree clean au début et à la fin de S7.1

## FICHIERS DE PREUVE CONSULTÉS

- `nexus/proof/NCR_CATHEDRAL_BASELINE.md`
- `nexus/proof/NCR_M2_ADAPTIVE_DEADLOCK_INTERIOR.md`
- `nexus/proof/BENCH_TASK31_VALIDATION_2026-04-24/verdict.md`
- `docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md`
- `packages/sovereign-engine/scripts/bench-v-atomic-v5.ts` (HEAD + commit `0c3cbc48`)
- `packages/sovereign-engine/scripts/bench-p1-robustness-v3.ts`
- `packages/sovereign-engine/scripts/bench-ablation-directive.ts`
- `packages/sovereign-engine/scripts/r6-validate-v3.ts`
- `packages/sovereign-engine/src/engine.ts` (l.86, l.338, l.505-537)
- `packages/sovereign-engine/src/duel/duel-engine.ts` (l.43-59, l.121-125)
- `packages/sovereign-engine/src/gate/r6-rejection-gate.ts`
- `packages/sovereign-engine/src/oracle/axes/interiority.ts` (l.27 R7-B 3-shot)
- `packages/sovereign-engine/src/oracle/axes/impact.ts` (l.27 R7-B 3-shot)
- `packages/sovereign-engine/sessions/MINI_V5R6_2026-04-13_1776079434882/MINI_V5R6_RESULTS.json`
- `packages/sovereign-engine/sessions/MINI_V5R6_2026-04-13_1776060510902/`

---

**Verdict S7.1 : PASS** — 6 décisions classées avec preuve fichier+import (5/6 directes, 1/6 escalade pour bench source manquant).

**Architecte : décision attendue**
- GO S7.2 réduit (3-4h GPU) sur re-bench `bench-v-atomic-v5.ts` ?
- Option arbitrage R6 (A reconstruire / B accepter via tests / C documenter UNKNOWN) ?
