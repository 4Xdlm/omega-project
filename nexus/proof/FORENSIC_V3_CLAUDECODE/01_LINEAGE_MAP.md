# 01 — LINEAGE MAP (qui descend de qui, par ères)

Les concepts Bible/Canon/Memory ont été **ré-implémentés plusieurs fois** à des époques distinctes. Voici la généalogie, prouvée par dates de commit + citations.

## Ère 1 — Janvier 2026 : « organes » gateway (Phase 7→27)
Décision fondatrice : `GOVERNANCE/DECISIONS/DEC-20260121-001_ARCHITECTURE_ORGANES.md` (SENTINEL + sous-juges + MEMORY&CANON Phase 10). Concepts codés dans `gateway/`:
- `canon_engine.ts` (FactType append-only) ← CNC-201
- `truth_gate.ts` ← CNC-200
- `ripple_engine.ts` (propagation) ← CNC-203
- `profiles.ts` THE_SKEPTIC ← CNC-100
- `memory_layer_nasa/` (« World Model » : store/digest/snapshot/tiering/decay/hybrid) ← Phase 10
**Devenir** : tout certifié, **FROZEN (sentinel) ou ORPHAN/dormant**. Zéro `packages/**` ne les importe (V1).

## Ère 1bis — Phases 18/20/21 (prototypes racine, janvier 2026)
`OMEGA_PHASE18_MEMORY/src/canon/canon-store.ts` (« CANON = source de vérité absolue ») → `OMEGA_PHASE20_INTEGRATION/canon-store.ts` (« based on Phase 18 CANON_CORE ») → `OMEGA_PHASE20_1_MEMORY_HOOK` (persistance lifecycle) → `OMEGA_PHASE21_QUERY_ENGINE`.
**Devenir** : **snapshots orphelins** (importés seulement par leurs tests). Ancêtres conceptuels du memory_layer_nasa et de src/canon.

## Ère 2 — Mars 2026 : moteurs TS de génération/scoring
`OMEGA_CARTE_REPO_v1.md` (2026-03-24) décrit `sovereign-engine` (GB V1 + Multi-Stage V2/V3, oracle, dedale, microsurgery…) comme MOTEUR PRINCIPAL. `src/canon/` (claims+lignée, CANON_SCHEMA_SPEC v1.2) + `src/gates/` (F-pipeline truth gate) appartiennent à cette ère.
- `DEC-20260325-001-FRACTAL-ASSEMBLY-PARADIGM.md` (4/4 IA) nomme « Canon Lock, World Model, Bible, CDE » pour cohérence L3 (non codé).
**Devenir** : `sovereign-engine` reste la lib de forge la plus aboutie (commits jusqu'au 2026-06-04) mais **OFF live path**. `src/canon` confiné à `src/gates`.

## Ère 3 — Mai 2026 : consolidation & fusion (décisions)
- `DEC-20260531-007` (frontière scribe/sovereign) → **CONTRADICTED** par grep → **SUPERSEDED** par `DEC-20260531-009` (moteur unique de fusion, PROPOSED).
- `packages/canon-kernel` (2026-05-03) : ré-architecture propre du canon en **double-rail truth/interpretation + PROMOTE + evidence** (vs FactType plat de gateway).

## Ère 4 — Juin 2026 : Book-Factory (le présent)
`CANON_TRUTH_CONSOLIDATION_DECISION.md` (2026-06-05, Tribunal G+Gm + Architecte) : **canon-kernel = épine canonique unique, AUCUN nouveau canon**. Le `packages/book-factory/` (untracked, 2026-06-05) ré-implémente la Bible/World-Model **par-dessus canon-kernel**, en évitant délibérément le sous-système gateway dormant :
- `book-canon-adapter.ts` = enforce rails + épistémique (knows=JTB, isLie=relation)
- `story-state.ts` = Bible mutable comme PROJECTION (event-sourcing, payoff_graph)
- `context-manager.ts` = délestage ≤600 mots (« RAG interne / bible »)
- `continuity-oracle.ts` = truth-gate inter-chapitre
- `DEC-20260606-021` (PROPOSED) = Double-Bible + diff auto + R6 8-gates + multi-lecteurs.

## Ère 5 — Juin 2026 (parallèle) : runtime Python
Le travail VIVANT réel : `scripts/metrology/*.py` (forge + radar N5 + juge LLM) sur Ollama. Indépendant des 4 ères TS ci-dessus. C'est le moteur qui **tourne**.

## Carte de descendance (faits narratifs)
```
CNC-201 (doctrine janv) ──► gateway/canon_engine.ts (FactType)      [ORPHAN]
OMEGA_PHASE18 canon-store ──► PHASE20 canon-store ──► (abandonné)   [SNAPSHOT]
CANON_SCHEMA_SPEC v1.2 ──► src/canon (claims+lineage)               [test layer]
                              │
                              ▼  (ré-architecture double-rail)
                         packages/canon-kernel  ◄── DÉCRÉTÉ ÉPINE UNIQUE (juin)
                              │
                              ▼  (consommation via adapter)
                         book-factory/{book-canon-adapter, story-state}  [DRAFT vivant]
```
```
Phase 10 (doctrine) ──► gateway/.../memory_layer_nasa (World Model)  [ORPHAN, doc dit ACTIF]
                              │  (réutilisation proposée via ACL, non codée)
                              ▼
                         book-factory/context-manager (délestage borné)  [DRAFT vivant]
```

## Doublons confirmés (même fonction, implémentations multiples)
- **Canon narratif** : 6 implémentations (gateway/canon_engine, src/canon, canon-kernel+book-factory, genesis-planner, PHASE18, PHASE20).
- **Store mémoire/offload** : 2 (memory_layer_nasa orphelin ; book-factory context-manager+story-state vivant).
- **Worker/daemon** : OMEGA_PHASE14/worker_manager (legacy) vs integration-nexus-dep dispatcher (dormant) vs dedale/reset-session Ollama daemon (actif).
