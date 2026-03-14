# OMEGA — MÉTRIQUES COMPLÈTES DU PROJET
## Radiographie technique — 2026-03-14

**Standard** : NASA-Grade L4 / DO-178C
**Autorité** : Francky (Architecte Suprême)
**Source** : Scan live du repo `C:\Users\elric\omega-project`

---

## 1 — REPO GLOBAL (hors node_modules / dist / __pycache__)

| Métrique | Valeur |
|----------|--------|
| Fichiers TypeScript (.ts) | **2 953** |
| Fichiers Python (.py) | **7 688** |
| Fichiers JSON | **2 829** |
| Fichiers Markdown (.md) | **1 452** |
| **Lignes TypeScript** | **636 117** |
| **Lignes Python** | **2 805 711** |
| Taille TypeScript | 21,48 MB |
| Taille Python | 95,57 MB |
| Taille totale repo (hors node_modules/dist) | ~350+ MB |

---

## 2 — SOVEREIGN-ENGINE — Code source (src/)

| Métrique | Valeur |
|----------|--------|
| Fichiers .ts dans src/ | **173** |
| **Lignes de code src/** | **33 944** |
| Taille src/ | 1 393 KB (~1,36 MB) |
| Dossiers (modules) | **34** |
| Fichiers de test | **182** |
| Lignes de test | **25 965** |

---

## 3 — SOVEREIGN-ENGINE — Exports et fonctions

| Type | Count |
|------|-------|
| `export function` | **277** |
| `export class` | **24** |
| `export interface` | **296** |
| `export type` | **59** |
| `export const` | **102** |
| **Total exports publics** | **758** |
| Toutes fonctions (dont internes) | **~645** |

---

## 4 — SOVEREIGN-ENGINE — Tests

| Métrique | Valeur |
|----------|--------|
| Fichiers de test (.test.ts) | **182** |
| Lignes de test | **25 965** |
| Suites (describe) | **273** |
| **Cas de test (it/test)** | **1 567** |
| Tests en exécution (current) | **1 564 PASS** |
| Failures | **0** |

---

## 5 — SOVEREIGN-ENGINE — Détail par module (src/)

| Module | Fichiers | Lignes | Taille | Exports |
|--------|----------|--------|--------|---------|
| `oracle/` | 34 | 4 443 | 174 KB | 48 |
| `validation/` | 15 | 4 762 | 202 KB | 43 |
| `genius/` | 13 | 3 459 | 143 KB | 38 |
| `input/` | 7 | 3 026 | 125 KB | 15 |
| `semantic/` | 8 | 1 085 | 38 KB | 12 |
| `proofpack/` | 7 | 1 158 | 57 KB | 6 |
| `pitch/` | 6 | 1 107 | 42 KB | 14 |
| `polish/` | 6 | 1 094 | 41 KB | 9 |
| `cde/` | 6 | 903 | 35 KB | 9 |
| `runtime/` | 6 | 902 | 34 KB | 10 |
| `delta/` | 7 | 754 | 28 KB | 7 |
| `metaphor/` | 3 | 853 | 46 KB | 4 |
| `voice/` | 2 | 749 | 31 KB | 7 |
| `phonetic/` | 2 | 686 | 26 KB | 2 |
| `calibration/` | 5 | 893 | 33 KB | 19 |
| `temporal/` | 3 | 624 | 24 KB | 5 |
| `symbol/` | 4 | 679 | 25 KB | 3 |
| `silence/` | 2 | 505 | 22 KB | 3 |
| `phantom/` | 2 | 456 | 16 KB | 4 |
| `filter/` | 2 | 472 | 24 KB | 2 |
| `benchmark/` | 4 | 938 | 43 KB | 4 |
| `authenticity/` | 3 | 551 | 26 KB | 3 |
| `constraints/` | 4 | 488 | 20 KB | 3 |
| `core/` | 2 | 315 | 14 KB | 9 |
| `pipeline/` | 1 | 219 | 10 KB | 2 |
| `prescriptions/` | 3 | 162 | 5 KB | 4 |
| `quality/` | 1 | 221 | 8 KB | 1 |
| `prose-directive/` | 4 | 328 | 12 KB | 4 |
| `exemplar/` | 1 | 172 | 7 KB | 1 |
| `duel/` | 2 | 173 | 7 KB | 3 |
| `compat/` | 2 | 149 | 5 KB | 2 |
| `gates/` | 1 | 92 | 4 KB | 1 |
| `utils/` | 1 | 29 | 1 KB | 3 |
| **Fichiers racine** | **4** | **1 497** | **67 KB** | — |
| (engine.ts 209L / types.ts 543L / index.ts 219L / config.ts 526L) | | | | |

---

## 6 — MONOREPO — Tous packages (hors sovereign-engine)

| Package | Fichiers .ts | Lignes |
|---------|-------------|--------|
| `sovereign-engine` | **398** | **66 849** |
| `integration-nexus-dep` | 45 | 13 228 |
| `scribe-engine` | 78 | 10 882 |
| `search` | 24 | 10 388 |
| `omega-p0` | 26 | 8 910 |
| `omega-governance` | 106 | 8 540 |
| `omega-forge` | 65 | 8 238 |
| `decision-engine` | 55 | 9 531 |
| `emotion-gate` | 37 | 7 319 |
| `creation-pipeline` | 63 | 6 077 |
| `truth-gate` | 36 | 6 189 |
| `oracle` (package) | 15 | 5 278 |
| `genesis-planner` | 52 | 5 073 |
| `sentinel-judge` | 17 | 4 365 |
| `style-emergence-engine` | 45 | 4 363 |
| `orchestrator-core` | 25 | 4 209 |
| `omega-runner` | 45 | 4 004 |
| `headless-runner` | 16 | 3 937 |
| `omega-release` | 69 | 4 303 |
| `hardening` | 14 | 3 735 |
| `genome` | 19 | 3 646 |
| `omega-segment-engine` | 15 | 3 643 |
| `omega-metrics` | 24 | 3 273 |
| `performance` | 14 | 3 206 |
| `phase-q` | 24 | 3 356 |
| `plugin-gateway` | 13 | 3 056 |
| `contracts-canon` | 10 | 2 550 |
| `mycelium-bio` | 13 | 5 125 |
| `omega-aggregate-dna` | 8 | 1 914 |
| `canon-kernel` | 24 | 1 988 |
| `gold-internal` | 10 | 2 163 |
| `mycelium` | 15 | 2 285 |
| `proof-pack` | 9 | 2 023 |
| `omega-observability` | 6 | 1 809 |
| `gold-cli` | 10 | 1 483 |
| `omega-bridge-ta-mycelium` | 7 | 1 009 |
| `signal-registry` | 8 | 791 |
| `plugin-sdk` | 9 | 837 |
| `gold-master` | 7 | 947 |
| `gold-suite` | 7 | 917 |
| `mod-narrative` | 2 | 229 |
| `sbom` | 1 | 393 |
| `trust-version` | 1 | 453 |
| `schemas` | 1 | 317 |
| **TOTAL MONOREPO** | **~2 200** | **~270 000** |

---

## 7 — PIPELINE SOVEREIGN-ENGINE (engine.ts)

| Étape | Type | Appels LLM |
|-------|------|-----------|
| assembleForgePacket() | CALC | 0 |
| generateSymbolMap() | LLM | 1 |
| buildSovereignPrompt() | CALC | 0 |
| generateDraft() ×2 | LLM | 2 |
| duelEngine.selectBest() | LLM | 1 |
| polishRhythm() | LLM | 1 |
| sweepCliches() | LLM | 1 |
| enforceSignature() | LLM | 1 |
| judgeAestheticV3() | LLM | 1 |
| buildQualityReport() | CALC | 0 |
| proofpackGenerate() | CALC | 0 |
| **Total appels LLM (happy path)** | | **~8** |
| **Étapes totales** | | **16** |

---

## 8 — PYTHON — omega-autopsie

| Métrique | Valeur |
|----------|--------|
| Scripts principaux | 15 |
| Versions analyzer | v1 → v4 |
| Features mesurées (F1-F30) | **30** |
| Œuvres analysées (v3) | 98/99 |
| Œuvres visées (v4) | 150+ |
| Lignes Python (scripts) | ~15 000 |
| Fonctions Python (approx) | ~200 |

---

## 9 — INVARIANTS (cumulés toutes phases)

| Bloc | Invariants |
|------|-----------|
| Sentinel | 101 |
| Governance D→J | 70+ |
| Mycelium | 21 |
| Genome | 14 |
| Phase S | 14 |
| Phase U (EU + TK + PE + SEAL + SR) | ~32 |
| Phase V CDE (CDE + PROTO + CHAIN) | 16 |
| BUILD A (phases 0 → M) | ~50 |
| **TOTAL ESTIMÉ** | **~320+** |

---

## 10 — TESTS CUMULÉS (toutes phases)

| Bloc | Tests | Status |
|------|-------|--------|
| BUILD A (11 phases) | ~971 | 🔒 SEALED |
| Industrial Hardening | 1 133 | 🔒 SEALED |
| Governance B | 877+ | 🔒 SEALED |
| Trust v1.0 | 4 791 | 🔒 SEALED |
| Plugin System | 230 | ✅ PROVEN |
| Phase Q + PR L5 | 339 | 🔒 SEALED |
| Phase S | ~800 | 🔒 SEALED |
| Phase U (U-ROSETTE-01→18) | 1 520 | 🔒 SEALED |
| Phase V (V-INIT + V-PROTO) | +44 | ✅ VALIDE |
| **TOTAL ACTUEL** | **1 564 PASS** | **0 failures** |

---

## 11 — TAGS GIT (branch phase-u-transcendence)

| Série | Tags | Count |
|-------|------|-------|
| Phase U | u-rosette-01 → u-rosette-18 | 18 |
| Phase V | v-init, v-proto | 2 |
| **Total tags de sprint** | | **20** |

---

## 12 — AXES DE SCORING (sovereign-engine)

| Macro-axe | Poids | Sous-axes principaux |
|-----------|-------|---------------------|
| ECC (Emotional Coherence & Complexity) | 33% | tension_14d, emotion_coherence, interiority, impact |
| AAI (Authenticity & Art Index) | 25% | banality, authenticity, voice_conformity, show_dont_tell |
| RCI (Rhythm, Cadence & Identity) | 17% | rhythm, signature, hook_presence, euphony_basic, voice_conformity |
| SII (Style Innovation Index) | 15% | anti_cliche, necessity, metaphor_novelty |
| IFI (Immersion Fidelity Index) | 10% | sensory_density, temporal_pacing |
| **Total axes individuels** | | **18** |

---

## 13 — CERTIFICATION PHASE U (résultats bench final)

| Métrique | Valeur |
|----------|--------|
| Runs totaux | 60 (30 one-shot + 30 top-K) |
| Meilleur one-shot | **92.51** (OS26) |
| Meilleur top-K | **92.91** (TK0) |
| SEAL_ATOMIC (≥93.0 + min_axis≥85) | 0/60 = 0% |
| SAGA_READY (≥92.0 + min_axis≥85) | ≥5/60 ≈ 8% |
| Coût bench complet | ~150€ |

---

*Scan effectué le 2026-03-14 — Source de vérité : repo live*
*Standard : NASA-Grade L4 / DO-178C*
*Autorité : Francky (Architecte Suprême)*
