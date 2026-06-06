# 00 — SOURCE PRIORITY (qui fait foi en cas de conflit)

## Règle générale (Golden Rule #9 + EMP-15 + EMP-02)
1. **Code vivant exécuté** (importé par un entrypoint réel) > **code certifié dormant** > **doctrine** > **snapshot daté** > **museum**.
2. **REPO = TRUTH** : si un doc contredit le code, le code gagne (#9).
3. **EMP-15** : tout `docs/archive/museum/**` est NON_SOURCE_OF_TRUTH_RUNTIME — explique le POURQUOI, jamais l'ÉTAT actuel.
4. **EMP-02** : seul Claude Code (instrument) tranche le runtime empirique. Les claims porteurs sont re-vérifiés (`00_VERIFICATION_LOG.md`).

## Conflits détectés et tranchés

### Conflit 1 — World Model : « ACTIF » (doc) vs ORPHAN (code)
- **Doc** : `docs/OMEGA_CARTE_REPO_v1.md:112` → `memory/ [ACTIF — World Model]`.
- **Code** : zéro importeur (`00_VERIFICATION_LOG.md` V1), offload non exporté (V2).
- **Tranche** : **CODE FAIT FOI → ORPHAN/dormant**. Le doc est un snapshot 2026-03-24 (HISTORICAL_SNAPSHOT). Le label « ACTIF » signifiait « certifié/présent », pas « câblé au runtime ». À ne PAS fonder une décision dessus sans recoupage.

### Conflit 2 — « la Bible » : laquelle ?
Quatre+ artefacts revendiquent le rôle de canon narratif. Priorité runtime réelle :
1. **`packages/canon-kernel`** (via `book-factory`) — SEULE primitive narrative consommée par du code package aujourd'hui → **SoT du chemin neuf**.
2. `src/canon/` — le plus riche (lignée + DISPUTED + supersession) mais confiné à `src/gates` (couche test).
3. `gateway/canon_engine` — « Bible de Francky » historique, **ORPHAN**.
4. `genesis-planner` Canon — statique, validation d'entrée seulement.
5. `OMEGA_PHASE18/20*` canon-stores — **snapshots orphelins**.
- **Tranche** : la décision doctrinale `CANON_TRUTH_CONSOLIDATION_DECISION.md:9-16` (canon-kernel = épine unique, pas de 5e canon) est **cohérente avec le code** → on la suit. Les rivaux (gateway, src/canon, phase18/20) = à marquer MUSEUM/ORPHAN (marquage en attente GO Architecte, `:51`).

### Conflit 3 — Le « vrai moteur » : TS packages vs Python scripts
- **Doctrine/cartes** décrivent un moteur TS (sovereign-engine, creation-pipeline…).
- **Runtime réel 2026-06** : `scripts/metrology/*.py` sur Ollama gemma4:31b + bge-m3 (100 % des commits récents). `sovereign-engine` est buildable mais **OFF live path** (aucun entrypoint n'injecte un provider réel). `src/runner` est **MOCK** (`pipeline.ts:167,197,234`).
- **Tranche** : **CODE/commits font foi → le moteur VIVANT est Python**. Le TS est une bibliothèque dormante. (Détail `02_CALL_GRAPH_ACTIVE_RUNTIME.md`.)

### Conflit 4 — Scribe ⟷ Sovereign couplés (DEC-007) vs découplés (grep)
- `DEC-20260531-007:13-22` supposait un couplage ; grep prouve 0 consommateur lib de sovereign → **CONTRADICTED-BY-CODE**, doc **SUPERSEDED** par `DEC-009`. → suivre DEC-009.

### Conflit 5 — Auto-recall sur mention : conçu vs codé
- `BOOK_EXISTING_MODULES_INVENTORY_v1.md:48` dit lui-même « auto-recall sur citation … absents. À AJOUTER ».
- Code : 0 hit (V6), boucle prod n'instancie pas l'adaptateur (V3).
- **Tranche** : **NON CODÉ**. Pas de conflit réel — la doctrine et le code concordent : c'est du DESIGN.

## Ordre de priorité opérationnel (à utiliser pour toute décision archi future)
```
1. Grep direct du repo HEAD (instrument)            ← arbitre final
2. packages/canon-kernel + book-factory (code neuf vivant)
3. scripts/metrology (runtime Python vivant)
4. CANON_TRUTH_CONSOLIDATION_DECISION.md (doctrine cohérente code)
5. CLAUDE.md + CODEX v1-3-3 (doctrine)
6. CNC-* / DEC sealed (doctrine historique)
7. OMEGA_CARTE_REPO / blueprints datés (snapshot)
8. docs/archive/museum/** (museum — jamais seul)
```
