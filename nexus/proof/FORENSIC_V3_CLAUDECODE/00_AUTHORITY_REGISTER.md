# 00 — AUTHORITY REGISTER

Classement des sources qui parlent de **Bible / Canon / World Model / Memory / Recall / Markers**.
Classes : `CANON_RUNTIME` (code vivant qui fait foi) · `CANON_DOCTRINE` (doctrine en vigueur) · `HISTORICAL_SNAPSHOT` (vrai à une date) · `DRAFT` (proposé, non ratifié) · `ORPHAN` (codé/écrit mais sans consommateur) · `CONTRADICTED` (contredit par le code) · `MUSEUM` (EMP-15, NON_SOURCE_OF_TRUTH_RUNTIME) · `UNKNOWN`.

## A. Sources CODE (par fonction « stocke/projette des faits »)

| Source (path) | Fonction | Classe | Preuve |
|---|---|---|---|
| `packages/canon-kernel/src/` | Primitive canon double-rail (truth/interpretation) + PROMOTE + hash-chain | **CANON_RUNTIME** (primitive vivante, seule consommée par du code package) | `index.ts:9-19` ; consommé par `book-factory/src/book-canon-adapter.ts:25-38` & `story-state.ts:17` |
| `packages/book-factory/src/book-canon-adapter.ts` | Enforce les rails + épistémique L1-L6 (knows=JTB, isLie comme relation) | **CANON_RUNTIME (BENCH/DRAFT)** — package non câblé à un entrypoint, untracked `??` | `book-canon-adapter.ts:80-319` ; 13 tests epistemic-probe |
| `packages/book-factory/src/story-state.ts` | « Bible » mutable = PROJECTION (event-sourcing), payoff_graph | **CANON_RUNTIME (BENCH/DRAFT)** | `story-state.ts:1-15,72-176` ; 8 tests |
| `src/canon/` (canon-api, lineage, predicate-catalog) | Store de claims + lignée hash-chain + DISPUTED/supersession | **CANON_RUNTIME (couche test/`src/gates` only)** | `canon-api.ts:125,243,266-278` ; 12 fichiers `tests/canon/*` |
| `gateway/src/gates/canon_engine.ts` | « Bible de Francky » FactType append-only + conflit par table d'antonymes | **ORPHAN** (certifié, dormant) | 407 l. ; `simpleHash` à remplacer `canon_engine.ts:161-171` ; 0 importeur prod (V1) ; `NCR_CANON_ENGINE_JUNCTION_ORPHAN.md` |
| `gateway/src/memory/memory_layer_nasa/` | « World Model » : store+engine+digest+snapshot+tiering+decay+hybrid+query | **ORPHAN** (doc dit ACTIF, code dit ORPHAN — CONTRADICTED) | 38 fichiers ; 0 importeur (V1) ; offload non exporté (V2) ; cert `MEMORY_LAYER_CERTIFICATION.md` |
| `packages/genesis-planner/` Canon | Canon d'entrée STATIQUE immuable (validation, pas store) | **CANON_RUNTIME (statique)** | `canon-validator.ts:9,11` |
| `packages/contracts-canon/` | Canon de GOUVERNANCE (contrats d'interface), PAS narratif | **CANON_RUNTIME (gouvernance)** | `index.ts:5` « source of truth for interface contracts » |
| `OMEGA_PHASE18_MEMORY/src/canon/canon-store.ts` | Store canon Phase-18 (snapshots/diffs/merkle) | **HISTORICAL_SNAPSHOT / ORPHAN** | `canon-store.ts:6` ; importé seulement par ses tests |
| `OMEGA_PHASE20_INTEGRATION/src/canon-store.ts` + `memory-service.ts` | Store canon simplifié « based on Phase 18 » | **HISTORICAL_SNAPSHOT / ORPHAN** | `canon-store.ts:1-7` |
| `OMEGA_PHASE20_1_MEMORY_HOOK/` | Hook persistance start/shutdown | **HISTORICAL_SNAPSHOT / ORPHAN** | `memory-hook.ts` ; tests only |
| `gateway/src/gates/ripple_engine.ts` | Propagation de conséquences (projette des faits, ne stocke pas) | **ORPHAN** (même sous-système gateway dormant) | propagation ≠ déclenchement-sur-citation |
| `gateway/src/profiles.ts` (THE_SKEPTIC) | Contre-pouvoir vérité (deus-ex-machina, plot armor) | **FROZEN** (Phase 27), réutilisable R6 G6 | `CNC-100-THE_SKEPTIC.md` |
| `packages/mycelium-bio/` gematria/merkle | Empreinte ADN émotionnelle par LIVRE (≠ marqueur d'entité) | **FROZEN/SEALED** | `gematria.ts:28`, `merkle.ts` ; cert v1.0.0 |

## B. Sources DOCTRINE / DÉCISION

| Source (path) | Sujet | Classe | Note |
|---|---|---|---|
| `CLAUDE.md` v3.163.0 | Doctrine OMEGA + 18 EMP | **CANON_DOCTRINE** (seul canon doctrinal avec CODEX + Trame 2000) | autorité supreme doctrine |
| `docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-3-3.md` | Lois LLM ; C4 = BIB_* | **CANON_DOCTRINE** | `:1384` C4 BIB_* (statut, pas code) |
| `docs/architecture/book-factory/CANON_TRUTH_CONSOLIDATION_DECISION.md` | canon-kernel = épine unique, pas de 5e canon | **CANON_DOCTRINE** (décision Tribunal G+Gm + Architecte) | `:9-16,58-60` |
| `docs/architecture/DEC-20260606-021-SCRIBE-R6-WRITER-LOOP.md` | Double-Bible + diff + R6 8-gates + multi-lecteurs | **DRAFT (PROPOSED)** | `:3` « ZÉRO code avant ce GO » |
| `docs/architecture/book-factory/BOOK_EXISTING_MODULES_INVENTORY_v1.md` | Inventaire existant côté book-factory | **CANON_DOCTRINE (inventaire)** | dit explicitement auto-recall « absent. À AJOUTER » `:48` |
| `docs/architecture/book-factory/CHARACTER_KNOWLEDGE_GRAPH_SPEC.md` | Graphe de connaissance perso | **DRAFT/SPEC_ONLY** | `:3` « SPEC DESIGN (doc-only, ZÉRO code) » |
| `GOVERNANCE/DECISIONS/DEC-20260121-001_ARCHITECTURE_ORGANES.md` | Sentinel + sous-juges + MEMORY&CANON Phase 10 | **CANON_DOCTRINE (sealed)** mais organes dormants | `:29,32,37-46` |
| `docs/concepts/CNC-100/200/201/203` | SKEPTIC / TRUTH_GATE / CANON_ENGINE / RIPPLE | **CANON_DOCTRINE (CNC)** ; impl gateway dormante | — |
| `docs/OMEGA_CARTE_REPO_v1.md` | Carte repo 2026-03-24 | **HISTORICAL_SNAPSHOT** ; `:112` CONTRADICTED (World Model « ACTIF » vs ORPHAN) | daté |
| `DEC-20260531-007-SCRIBE-SOVEREIGN-BOUNDARY.md` | Frontière scribe/sovereign | **CONTRADICTED** (prémisse couplage inversée par grep) → **SUPERSEDED** par DEC-009 | `:6,13-22` |
| `DEC-20260531-009-CANONICAL-NARRATIVE-ENGINE-FUSION.md` | Moteur unique de fusion | **DRAFT (PROPOSED)** | ratification pending |
| `DEC-20260325-001-FRACTAL-ASSEMBLY-PARADIGM.md` | Assemblage fractal L3 (nomme World Model/Bible/CDE) | **CANON_DOCTRINE (sealed 4/4)** ; L3 non codé | `:90,138` |
| `docs/archive/museum/**` (STALE_EXPORTS, sessions) | Sessions/decisions historiques | **MUSEUM** (EMP-15, non-source-of-truth-runtime) | miroirs des copies vivantes `sessions/` |

## C. Note d'autorité (panels multi-IA)
Aucun document lu n'atteste d'un **panel littéral à 6 IA** sur ces thèmes. Le plus grand panel scellé vérifié = **4/4** (Architecte + Claude + ChatGPT + Gemini, `DEC-20260325-001`) et les synthèses **4-IA** (`docs/physique-litteraire/OMEGA_PROGRAMME_VERITE_SYNTHESE_4IA_v1.md`). Le « Tribunal » de juin = Gemini + ChatGPT (convergents) + arbitrage Architecte + vérification Claude. « Jusqu'à 6 IA » = plafond de processus, non matérialisé dans les enregistrements de décision lus. (Détail : `03_DECISIONS_6IA_ARCHEOLOGY.md`.)
