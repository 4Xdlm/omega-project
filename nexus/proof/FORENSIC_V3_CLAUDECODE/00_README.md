# OMEGA_FORENSIC_BLUEPRINT_V3 — CLAUDE CODE INSTRUMENT

**Mission**: OMEGA_FORENSIC_BLUEPRINT_V3 — READ-ONLY ABSOLU.
**Instrument**: Claude Code (claude-opus-4-8, 1M context).
**Date**: 2026-06-06.
**HEAD**: `4f7fa2ab` (branch `phase-r-dispatcher-v33`).
**Parallel instrument (NOT read, instrument independence)**: `nexus/proof/FORENSIC_V3_COWORK/`.

## Règles appliquées
- READ-ONLY absolu. Zéro code, zéro patch, zéro modif. Écriture UNIQUEMENT dans ce dossier.
- Chaque affirmation = chemin + ligne + citation. `NOT_FOUND` déclaré explicitement avec lieux cherchés.
- Distinction systématique : code vivant / doc / spec / snapshot / draft / FROZEN / ORPHAN / MUSEUM (EMP-15).
- Recherche par FONCTION, pas seulement par nom.
- Les claims porteurs (load-bearing) ont été RE-VÉRIFIÉS par grep direct de l'instrument (EMP-02 : Claude Code = arbitre runtime). Voir `00_VERIFICATION_LOG.md`.

## Méthode
6 sous-agents forensiques en parallèle (fan-out par fonction), puis vérification directe des claims porteurs par l'instrument, puis synthèse. Aucune conclusion fondée sur mémoire seule.

## Index des livrables

| Phase | Fichier | Contenu |
|---|---|---|
| 0 | `00_AUTHORITY_REGISTER.md` | Classement des sources Bible/Canon/WorldModel/Memory/Markers |
| 0 | `00_SOURCE_PRIORITY.md` | Qui fait foi quand deux docs se contredisent |
| 0 | `00_VERIFICATION_LOG.md` | Claims porteurs re-vérifiés par l'instrument |
| 1 | `01_ROOT_TREE_CLASSIFICATION.csv` | Chaque dossier racine + package classé |
| 1 | `01_ENGINE_INVENTORY.md` | Inventaire moteur + statuts |
| 1 | `01_LINEAGE_MAP.md` | Lignée (qui descend de qui, ères) |
| 2 | `OMEGA_MODULE_DNA_REGISTRY.yaml` | ADN par module keystone |
| 2 | `02_DNA_SUMMARY.md` | Synthèse ADN lisible |
| 2 | `02_CALL_GRAPH_ACTIVE_RUNTIME.md` | Graphe d'appel runtime réel |
| 3 | `03_BIBLE_CANON_WORLD_MODEL_SCAN.md` | **CŒUR** — tous les stores de faits |
| 3 | `03_SUBAGENTS_LIBRARIES_SCAN.md` | **CŒUR** — bibliothèques/sous-agents/dormants |
| 3 | `03_ENTITY_MARKERS_SCAN.md` | **CŒUR** — marqueurs personnage à rappel auto |
| 3 | `03_MEMORY_RECALL_SCAN.md` | **CŒUR** — rappel/injection contexte borné |
| 3 | `03_CANON_TRUTH_LINEAGE.md` | **CŒUR** — lignée canons/truth-gates |
| 3 | `03_DECISIONS_6IA_ARCHEOLOGY.md` | **CŒUR** — décisions multi-IA tracées |
| 4 | `04_EXISTING_BLUEPRINT_GRAPH.md` | La machine ACTUELLE |
| 4 | `04_RUNTIME_DATAFLOW.md` | Données de bout en bout |
| 4 | `04_MODULE_DEPENDENCY_MAP.md` | Dépendances réelles |
| 4 | `04_CANON_MEMORY_PIPELINE_MAP.md` | Pipeline canon↔mémoire |
| 5 | `05_R6_EXISTING_CAPABILITY_MATRIX.md` | Capacités R6 déjà présentes |
| 5 | `05_BOOK_FACTORY_GAP_ANALYSIS.md` | Écarts Book-Factory |
| 5 | `05_REUSE_ADAPT_CREATE_DECISION_TABLE.md` | REUSE/ADAPT/EXTEND/CREATE/IGNORE/MUSEUM |

## Verdict d'une ligne (TL;DR Architecte)
La matière conçue pendant ~4000 h est **CODÉE EN PIÈCES MAIS NON ASSEMBLÉE**. Le substrat de délestage/compression (`gateway/.../memory_layer_nasa`) et au moins **8 stores de faits** existent et sont **certifiés**, mais **dormants** (zéro `packages/**` n'importe `gateway/` — vérifié). Les **marqueurs personnage à rappel automatique sur mention** sont **CONÇUS (SPEC/PROPOSED) mais NON CODÉS**. Le seul canon réellement consommé aujourd'hui par du code package est `canon-kernel` via le tout récent `book-factory` (lui-même non câblé à un entrypoint). Le runtime VIVANT 2026-06 est en réalité **Python (`scripts/metrology/*.py`) sur Ollama gemma4:31b + bge-m3**, pas les packages TS.
