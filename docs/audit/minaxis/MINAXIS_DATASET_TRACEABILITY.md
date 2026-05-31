# OMEGA — MINAXIS DATASET TRACEABILITY (results_v4 + troves) — READ-ONLY

> 2026-05-31 · HEAD `d007c1db` · « results_v4 orphelin réel ou déjà consommé ? » + état per-axe des troves.

## 1. `omega-autopsie/results_v4/` — NON ORPHELIN, mais ≠ runtime sovereign

| Question | Réponse (preuve) |
|---|---|
| Contenu | **169 œuvres réelles** (Apollinaire→Zola : Camus, McCarthy ×4, Hemingway ×5, Woolf ×4, Modiano ×6, Ernaux ×8, Proust, Faulkner, Dostoïevski…). |
| Format | **FEATURES SEULEMENT** — JSON `meta`(work_id/author/title/word_count/text_sha) + `averages`(**107 métriques**, ex. `f22a_subordination_depth`, `f1a_rhythm_variance`) + `extracts`/`chapters`/`descriptive`. **AUCUNE prose brute** (pas de champ `text`/`prose`/`body`). |
| Producteur | `omega-autopsie/cc_step3_runner.py` (*"Produit results_v4/ avec 246 JSONs enrichis"*). |
| Consommateurs | **NON ORPHELIN** — **67 références / 28 scripts** Python omega-autopsie : `build_corpus_dictionaries`, `compute_correlation_matrix`, `compute_partial_derivatives`, `cross_language_analysis`, `intra_author_analysis`, `test_ablation`, `test_lexical_llm`, `test_nonlinearity`, `test_placebo`, `test_prediction`, `saga_analysis`, `generate_thesis_report`… → chaîne `cc_step3_runner.py → results_v4/chapters/ → 20+ runners → bench_results_v4/ → thesis`. |
| Consommé par le **runtime sovereign (TS)** ? | **NON trouvé.** Aucune référence à `results_v4` dans `packages/sovereign-engine/`, `scripts/`, `gateway/`. Les consommateurs sont **exclusivement** la suite d'analyse Python (Phase W / thesis / calibration). |

**Verdict traçabilité** : `results_v4` n'est **ni orphelin** (28 consommateurs actifs), **ni exploité par le moteur live** (recherche calibration/thesis uniquement). C'est le **socle empirique de la Phase W** (413 œuvres) qui a justifié les abaissements de floor SII/MACRO_AXIS — **mais il n'alimente pas `computeRCI`/`computeECC` directement**, et **n'a jamais servi à recalibrer RCI/ECC** (d'où l'incohérence du floor RCI 85). « jamais exploité » est **FAUX** ; « exploité pour RCI/ECC » est **FAUX aussi**.

**Conséquence pour le test décisif** : pas de prose ⇒ pas de recompute `computeRCI` direct (cf. `MINAXIS_LITERARY_CALIBRATION.md §0`). Bench `MINAXIS_E_LITERARY_RECOMPUTE` requis (réimport textes domaine public).

## 2. Troves de scoring — disponibilité per-axe (pour l'audit min_axis)

| Trove | Path | N | 5 axes ? | Usage audit |
|---|---|---|---|---|
| **m0b** | `docs/audit/metrology/m0b-runs/m0b_runs.json` | 10 (5×2) | ✅ flat ECC/RCI/SII/IFI/AAI | **inclus** |
| **BOOK_V3** | `packages/sovereign-engine/sessions/BOOK_V3_*/BOOK_RESULTS.json` | ~7 | ✅ `macro_axes.*` | **inclus** |
| **BESTOF3_VALIDATION** | `…/sessions/BESTOF3_VALIDATION/bestof3_results.json` | 24 | ✅ flat | **inclus** |
| **P311 overnight** | `nexus/proof/P311_BENCH_OVERNIGHT_Z1_RESULTS_2026-05-16.json` | 4 | ✅ flat | **inclus** |
| **MINI_V5R6(+EXT)** | `…/sessions/MINI_V5R6*/MINI_V5R6_RESULTS.json` | ~69 | ⚠️ **ECC+RCI seulement** | **partiel** (pas de min_axis 5-dim) |
| **PROD_REVELATION** | `…/sessions/PROD_REVELATION_*/RESULTS.json` | 2 | ⚠️ **ECC seul** | exclu (per-axe) |
| **BOOK_FULL (v1)** | `…/sessions/BOOK_FULL_1776*/` | ~200 ch. | ❌ `macro_axes` **tous à 0** | exclu (données nulles) |
| **ValidationPack_phase-u** | `…/sessions/ValidationPack_phase-u_real_*/runs.jsonl` | ~224 | ❌ `s_composite` seul, **verdict ERROR fréquent** | exclu (pas de per-axe) |
| **goldens (E2E)** | `golden/{e2e,h2,live-*}/run_*/S_SCORE_*.json` | ~21 | ❌ **autre jeu d'axes** (9 : interiority/tension_14d/rhythm/signature/…) | non comparable (5-macro) |

**Limite majeure de l'audit** : sur les troves nommés par la directive, **seuls ~51 runs ont les 5 macro-axes**. La revendication « min_axis = RCI sur 77 % » s'appuie probablement sur du **composite-only ou ECC/RCI-partiel** (224 phase-u sans per-axe, 73 goldens en 9-axes). **L'audit per-axe repose donc sur 51 runs full** (RCI min 63 %, ECC min 31 %) — cohérent avec la directive mais **base étroite** → renforce le besoin du bench dédié (verdict E).

**Note** : les goldens E2E (`S_SCORE_*.json`) exposent directement `rhythm` et `signature` (sous-axes RCI) — ex. rhythm=68.4, signature=100 — exploitables pour un futur audit sous-axe RCI **sans relancer le moteur** (lecture seule). Non agrégés ici (jeu d'axes hétérogène), signalé pour suite.

---
*Producteur Python (autopsie) ≠ consommateur TS (sovereign). Aucune prose dans results_v4. Cf. `MINAXIS_LITERARY_CALIBRATION.md`, `MINAXIS_DISTRIBUTION.csv`.*
