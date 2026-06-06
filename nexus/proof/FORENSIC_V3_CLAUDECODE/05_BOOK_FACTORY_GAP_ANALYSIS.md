# 05 — BOOK-FACTORY GAP ANALYSIS

Écart entre ce que le design Book-Factory / R6 vise et ce qui existe en code. Ordonné par sévérité d'écart.

## Ce qui EST déjà là (ne pas reconstruire)
| Capacité | Code | Tests | Preuve |
|---|---|---|---|
| Bible mutable (world-state) | `story-state.ts` | 8 | event-sourced fold, payoff_graph seed→bloom |
| Délestage contexte ≤600 mots | `context-manager.ts` | via orchestrator | résout mur VRAM (`BOOK_FACTORY_ARCHITECTURE.md:50`) |
| Truth-gate inter-chapitre | `continuity-oracle.ts` | 8 | CHRONO/DEAD_ACTS/LEAK/REQUIREMENT/OVERDUE |
| Rails vérité/croyance + PROMOTE + JTB | `book-canon-adapter.ts` | 13 | knows=JTB, isLie=relation cross-rail |
| Primitive canon (hash-chain) | `canon-kernel` | 4 | rails+PROMOTE+canonicalize+sha256 |
| Boucle génération par chapitre | `book-orchestrator.ts` | 4 | génère 3 chap PASS gemma4:31b (`P2_LLM_GENERATION_EVIDENCE.md`) |
| Planification | `book-planner.ts` | 8 | — |
| Forge LLM réelle | `chapter-generator.ts` + Python | — | gemma4:31b via Ollama |
| Détection répétition | `scripts/metrology/bestofn_repeat_matrix.py` | — | forensic OMEGA_REPEAT_* |

## ÉCARTS (gaps) classés
### GAP-1 (CRITIQUE, câblage) — l'épistémique est hors boucle
- `book-orchestrator.ts` n'instancie **jamais** `BookCanonAdapter` (V3). Donc knows()/isLie()/LEAK épistémique **inertes en prod**. La « Bible qui ne peut oublier d'être consultée » n'est pas réalisée.
- **Effort** : câblage (le code existe), pas création.

### GAP-2 (CRITIQUE, création) — auto-recall sur mention ABSENT
- Aucun mécanisme scanne la prose pour un nom → tire le dossier entité (V6). context-manager injecte TOUS les persos vivants inconditionnellement (`context-manager.ts:18,28`), ce qui ne scale pas et n'est pas « sur mention ».
- Acté manquant par l'inventaire lui-même : `BOOK_EXISTING_MODULES_INVENTORY_v1.md:48`.
- **Effort** : création (index nom→entité + résolution alias + déclenchement).

### GAP-3 (MAJEUR, création) — Double-Bible + diff auto
- `DEC-021:115-129` (Bible-RÉELLE vs Bible-EXTRAITE + `diffBibles()→IncoherenceReport`) = PROPOSED, ZÉRO code.
- **Effort** : création (réutilise StoryState comme base).

### GAP-4 (MAJEUR, identité) — pas d'identité d'entité robuste
- Identité = hash d'une chaîne sujet ; `"maire"` ≠ `"le_maire"`, pas d'alias. Graphe perso riche = SPEC_ONLY (`CHARACTER_KNOWLEDGE_GRAPH_SPEC.md`, NON implémenté).
- **Effort** : création/extension (table alias + EntityId stable).

### GAP-5 (MOYEN, intégration) — book-factory non câblé à un entrypoint
- Package `private 0.0.1`, untracked `??`, 0 appelant externe. Tourne seulement via `generate-real-demo`.
- **Effort** : intégration (entrypoint + commit).

### GAP-6 (MOYEN, scale) — pas de tiering/decay actif
- Le substrat existe (memory_layer_nasa) mais orphelin et non exporté (V2). Pour un livre long, context-manager injectant tous les persos vivants finira par saturer.
- **Effort** : EXTEND si/quand scale l'exige (sinon différer).

### GAP-7 (MINEUR, juge) — jury mono-modèle
- Seul gemma4 calibré (EMP-19) ; jury multi-modèle non viable aujourd'hui (`DEC-021:139-148`).
- **Effort** : bloqué par calibration, pas par code.

## Priorisation (effort vs valeur)
| Gap | Type | Valeur | Effort | Recommandation |
|---|---|---|---|---|
| GAP-1 | câblage | haute | faible | **Faire d'abord** (câbler l'adapter) |
| GAP-5 | intégration | haute | faible | committer + entrypoint |
| GAP-2 | création | haute | moyen | auto-recall (le vrai « neuf ») |
| GAP-4 | identité | haute | moyen | identité+alias (prérequis GAP-2) |
| GAP-3 | création | moyenne | moyen | Double-Bible diff |
| GAP-6 | scale | conditionnelle | élevé | différer (réutiliser memory_layer si besoin) |
| GAP-7 | juge | moyenne | bloqué | dépend calibration EMP-19 |
