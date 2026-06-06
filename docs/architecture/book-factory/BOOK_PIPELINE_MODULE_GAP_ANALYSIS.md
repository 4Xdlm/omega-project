# BOOK-FACTORY — Analyse des écarts (existant vs à construire)

**Date** : 2026-06-05 · **Statut** : AUDIT (vérifié file:line, doc-only) · **But** : inventaire précis des modules pour la production 60k, ce qu'on RÉUTILISE intact vs ce qu'on CONSTRUIT (additif, jamais de modif FROZEN).

## Tableau EXISTE / MANQUE
| # | Capacité | État | Preuve (vérifiée) | Décision |
|---|---|---|---|---|
| 1 | Génération d'**un** chapitre (K2+DUEL+Oracle) | **EXISTE** | `creation-pipeline/src/engine.ts` (F0-F8) ; `sovereign-engine` K2/DUEL/S-Oracle ; `scribe-engine/weaver-llm.ts` | **Réutiliser intact** = unité par chapitre |
| 2 | Planif arcs+scènes d'une œuvre | **EXISTE** | `genesis-planner/src/{planner,types,generators}.ts` (`Intent`, `Arc`, `Scene`, `Beat`, `seed-bloom-tracker.ts`) | Réutiliser **par chapitre** |
| 3 | Graine→récolte **intra-plan** | **EXISTE** | `Seed.planted_in/blooms_in`, `SEED_BLOOM_MAX_DISTANCE`, `seed-bloom-tracker.ts` | Étendre à l'échelle livre (story-state) |
| 4 | Gate cohérence/cross-ref **intra-génération** | **EXISTE** | `creation-pipeline/src/gates/unified-crossref-gate.ts`, `unified-truth-gate.ts` | Étendre → `continuity-oracle` inter-chapitres |
| 5 | Continuité locale (200 derniers mots) | **PoC seulement** | `sovereign-engine/scripts/test-p4-continuite.ts` (injection last-200w, mesure drift) | Industrialiser dans `context-manager` |
| 6 | Découpe en chunks bornés | **EXISTE (partiel)** | K2 4×750w ; `token-counter.ts` ; `forge-packet-assembler.ts` | Réutiliser au niveau chunk |
| 7 | Validation d'entrée style (ADN) | **EXISTE (FROZEN)** | `mycelium/`, `genome/` (`target_avg_sentence_length`…) | **Inchangé**, jamais touché |
| **8** | **Orchestrateur livre (boucle N chapitres + assemblage)** | **MANQUE** | grep BOOK_FULL → seulement `n5_shadow_run.ts` (bench). Aucun driver prod | **CONSTRUIRE `book-orchestrator`** |
| **9** | **Planif LIVRE (BookIntent→N ChapterSpec + pacing)** | **MANQUE** | genesis-planner = œuvre unique, pas de niveau chapitre | **CONSTRUIRE `book-planner`** |
| **10** | **Mémoire d'état MUTABLE inter-chapitres (Bible)** | **MANQUE** | `Canon` est `immutable`/statique ; aucun module state/bible | **CONSTRUIRE `story-state`** |
| **11** | **Graphe graine→récolte CROSS-chapitre** | **MANQUE** | seed_registry = intra-plan | **CONSTRUIRE `payoff_graph`** (dans story-state) |
| **12** | **Gate continuité INTER-chapitres** | **MANQUE** | crossref-gate = intra-génération | **CONSTRUIRE `continuity-oracle`** |
| **13** | **Gestion contexte/VRAM long-livre (résumé glissant, retrieval)** | **MANQUE** | token-counter borne le chunk, pas le livre | **CONSTRUIRE `context-manager`** |
| **14** | **Anti-répétition vu par le sélecteur** | **PROPOSÉ** | `repeat-shadow.ts` (forensic BESTOFN) | **Appliquer en terminal** (précondition) |

## Synthèse : 5 modules neufs (+ 1 patch terminal)
- `book-planner` (#9) · `story-state` incluant `payoff_graph` (#10-11) · `book-orchestrator` (#8) · `continuity-oracle` (#12) · `context-manager` (#13).
- Précondition terminal : `repeat-shadow` (#14).
- **Tout est additif** ; aucun module existant modifié (genesis-planner, creation-pipeline, sovereign-engine **inchangés** ; FROZEN intouchés). Les nouveaux packages consomment les types existants (`Intent`, `Scene`, `Seed`, `GenesisPlan`, `ForgePacket`).

## Ordre de construction (dépendances)
1. `story-state` (schéma + update/inject CALC-only) — testable hors-LLM, **socle**.
2. `book-planner` (déterministe) — testable hors-LLM.
3. `book-orchestrator` (boucle) — câble genesis-planner + creation-pipeline + story-state.
4. `continuity-oracle` — consomme story-state.
5. `context-manager` (résumé glissant + retrieval) — optimise le contexte.
(`repeat-shadow` en parallèle, terminal.)

## VERDICT
- Statut : **GAP ANALYSIS VÉRIFIÉE**. Confiance : Haute (chaque ligne tracée au code réel).
- Forces : sépare nettement réutilisable (intact) vs neuf (additif) ; ordonne par dépendances ; zéro risque FROZEN ; réutilise un maximum (genesis-planner, gates, token-counter, genome style targets).
- Faiblesses : (1) `continuity-oracle` fiable = difficile (détection de contradiction sémantique) ; (2) effort total non trivial (5 packages) ; (3) le PoC continuité ne couvre que 200 mots — l'industrialisation est le vrai travail.
- Action : GO Architecte pour P1 = `story-state` + `book-planner` (les deux socles testables sans LLM).
