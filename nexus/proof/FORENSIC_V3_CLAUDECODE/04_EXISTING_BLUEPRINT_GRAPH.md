# 04 — EXISTING BLUEPRINT GRAPH (la machine ACTUELLE, pas rêvée)

## Vue d'ensemble : 4 îlots non connectés
```
┌─────────────────────────────────────────────────────────────────────┐
│ ÎLOT 1 — RUNTIME VIVANT (Python/Ollama)        [CE QUI TOURNE]        │
│   scripts/metrology/*.py ──► Ollama gemma4:31b (forge) + bge-m3 (emb) │
│   forge_*.py / n5_radar_*.py / n2_judge_hunt.py / calibration_check.py│
│   sorties: docs/research/, omega-autopsie/results_rosetta/           │
└─────────────────────────────────────────────────────────────────────┘
        ╎ (aucun import TS ⇄ Python ; ponts = fichiers JSON)
┌─────────────────────────────────────────────────────────────────────┐
│ ÎLOT 2 — CLI ÉMOTION TS                          [CE QUI TOURNE]      │
│   bin/omega-pipe.mjs ─► gateway/cli-runner ─► analyze.ts ─► Plutchik  │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ ÎLOT 3 — BOOK-FACTORY (Bible légère)            [DRAFT, démo only]    │
│   generate-real-demo ─► book-orchestrator ─► {continuity-oracle,      │
│      context-manager(≤600w), story-state, chapter-generator(Ollama)} │
│   socle: canon-kernel (+ book-canon-adapter, NON câblé dans la boucle)│
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ ÎLOT 4 — MASSE DORMANTE/CERTIFIÉE               [DÉBRANCHÉ]           │
│   sovereign-engine(forge TS), gateway/{canon_engine, truth_gate,     │
│   ripple, memory_layer_nasa=WorldModel}, src/{canon,gates,runner MOCK}│
│   creation-pipeline, scribe-engine, genesis-planner, integration-    │
│   nexus-dep(dispatcher/registry), decision-engine(orphan), genome    │
└─────────────────────────────────────────────────────────────────────┘
```

## Ce que la machine FAIT réellement aujourd'hui
1. **Génère de la prose** : Python `forge_*.py` → Ollama gemma4:31b (longueur imposée, forge chirurgicale, atelier N6, forge sémantique N7, régen Rosetta). PAS via sovereign-engine.
2. **Score/juge** : Python `n5_radar_reference.py` (radar LOAO vs bge-m3), `n2_judge_hunt.py` (juge LLM gemma4). Gate amont EMP-19 `calibration_check.py`.
3. **Analyse émotionnelle** : `omega analyze` (TS, déterministe Plutchik).
4. **Démo génération de livre bornée** : book-factory (Bible légère + digest ≤600 mots + continuité), grade démo, untracked.

## Ce que la machine NE FAIT PAS (malgré le code présent)
- N'utilise PAS le World Model (`memory_layer_nasa` orphelin).
- N'utilise PAS canon_engine/truth_gate/ripple gateway (orphelins).
- N'utilise PAS sovereign-engine pour générer (provider non câblé).
- N'a AUCUN rappel sur mention / marqueur d'entité (inexistant).
- N'assemble PAS la Bible + délestage + forge en un flux unique.

## Frontières prouvées (grep)
- `packages/**` n'importe **jamais** `gateway/` (V1) → îlot 4 gateway totalement isolé des packages.
- `book-orchestrator.ts` n'instancie **jamais** `BookCanonAdapter` (V3) → l'épistémique reste hors boucle.
- `src/runner/pipeline.ts` = mock (:167,197,234) → l'« orchestrateur générique » ne génère rien.
