# 05 — REUSE / ADAPT / EXTEND / CREATE / IGNORE / MUSEUM — DECISION TABLE

Chaque capacité du design (Bible Mesh, Recall Bus, Entity Markers, Double-Bible, extracteur par passes, R6 loop, juges multiples, délestage) classée avec preuve. **Ce tableau est une AIDE À LA DÉCISION, pas une décision** : l'arbitrage final revient à l'Architecte (EMP-14, autorité). Aucune action n'est prise (READ-ONLY).

Légende : **REUSE** = utiliser tel quel · **ADAPT** = câbler/ajuster code existant · **EXTEND** = bâtir sur une base existante · **CREATE** = écrire du neuf · **IGNORE** = ne pas (interdit/inutile) · **MUSEUM** = archiver (EMP-15, jamais muter).

| # | Capacité | Verdict | Cible (path) | Preuve / justification |
|---|---|---|---|---|
| 1 | Primitive canon (rails truth/interpretation + PROMOTE + hash) | **REUSE** | `packages/canon-kernel` | SoT décrété + cohérent code (`CANON_TRUTH_CONSOLIDATION_DECISION.md:9-16`) ; consommé par book-factory |
| 2 | Bible mutable / world-state | **REUSE** | `book-factory/story-state.ts` | event-sourced fold, 8 tests, payoff_graph |
| 3 | Délestage contexte ≤600 mots | **REUSE** | `book-factory/context-manager.ts` | résout VRAM, câblé orchestrator |
| 4 | Truth-gate inter-chapitre | **REUSE** | `book-factory/continuity-oracle.ts` | 8 tests, 5 checks |
| 5 | Épistémique (knows=JTB, lie=relation) | **ADAPT** | `book-factory/book-canon-adapter.ts` | codé+13 tests MAIS **hors boucle** (V3) → câbler dans book-orchestrator |
| 6 | Régénération aveugle (N1) | **REUSE** | forge Python `scripts/metrology/forge_*.py` | actif ; `DEC-021:152` ✅ |
| 7 | Détection répétition (Repeat/SHADOW) | **REUSE** | `scripts/metrology/bestofn_repeat_matrix.py` | forensic OMEGA_REPEAT_* actif |
| 8 | SKEPTIC (veto vérité G6) | **ADAPT** | `gateway/src/profiles.ts` (FROZEN) | dormant ; réveil via ACL read-only (ne pas muter, EMP-15) |
| 9 | Gates qualité (Format/Fidelity/S-Oracle/Rhythm G1/G2/G7/G8) | **ADAPT** | `sovereign-engine/{microsurgery,oracle,temporal,silence}` | codés, dormants → extraire/câbler |
| 10 | **Entity Markers (auto-recall sur mention)** | **CREATE** | (n'existe pas) | V3,V6 NOT_FOUND ; acté manquant `BOOK_EXISTING_MODULES_INVENTORY_v1.md:48` |
| 11 | Identité d'entité stable + alias | **EXTEND** | base `book-canon-adapter.entityId:112-114` + spec `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md` | hash de chaîne sujet seulement ; pas d'alias → étendre |
| 12 | Character Knowledge Graph (vue attribuée) | **EXTEND** | spec doc-only sur rails canon-kernel | `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md:3` « ZÉRO code » ; rails déjà là |
| 13 | **Double-Bible (RÉELLE vs EXTRAITE) + diff** | **CREATE** | base StoryState | `DEC-021:115-129` PROPOSED, ZÉRO code |
| 14 | Extracteur par passes (Bible-EXTRAITE) | **CREATE** | — | composant de la Double-Bible ; non codé |
| 15 | R6 writer-loop (génère→juge→régénère) | **EXTEND** | `book-orchestrator.ts` + gates ci-dessus | boucle existe sans régen-sur-score |
| 16 | Multi-lecteurs / jury | **EXTEND (1 juge)** | gemma4 via Python | jury multi-modèle bloqué EMP-19 (`DEC-021:139-148`) |
| 17 | Tiering hot/cold + decay + digest mémoire | **EXTEND-si-scale / sinon IGNORE-pour-l'instant** | `gateway/.../memory_{tiering,decay,digest}.ts` | codé+testé mais ORPHAN+non exporté (V1,V2) ; utile seulement si livres longs saturent |
| 18 | World Model (store NASA complet) | **MUSEUM ou ADAPT-via-ACL** | `gateway/.../memory_layer_nasa` | certifié mais ORPHAN ; doc dit ACTIF=CONTRADICTED ; décision ACL read-only `CANON_TRUTH_CONSOLIDATION_DECISION.md:43` |
| 19 | Bus « sous-agents répondeurs » | **ADAPT-si-besoin** | `integration-nexus-dep/router` (dispatcher/registry) | codé+testé, dormant ; base si dispatch runtime requis |
| 20 | Canon gateway (canon_engine FactType) | **MUSEUM** | `gateway/src/gates/canon_engine.ts` | ORPHAN, NCR existante ; remplacé par canon-kernel (EMP-15, jamais muter) |
| 21 | Canon src/canon (claims+lignée riche) | **EXTEND-vers-canon-kernel ou MUSEUM** | `src/canon/` | modèle le + riche (DISPUTED+supersession) mais confiné src/gates ; porter les idées vers canon-kernel |
| 22 | Canon-stores PHASE18/20 | **MUSEUM** | `OMEGA_PHASE18/20*` | snapshots orphelins, ancêtres |
| 23 | decision-engine | **MUSEUM/IGNORE** | `packages/decision-engine` | ORPHAN total (0 importeur) |
| 24 | Runner générique mock | **IGNORE** | `src/runner/pipeline.ts` | mock (echo, TruthGate PASS) ; ne pas confondre avec moteur |
| 25 | sovereign-engine (forge complète) | **ADAPT (décision Architecte)** | `packages/sovereign-engine` | lib aboutie OFF-path ; soit câbler provider, soit rester en réserve pendant que Python forge |
| 26 | Coaching esthétique sur score (N3) | **IGNORE (INTERDIT)** | — | `DEC-021:160` ❌ Goodhart EMP-16 ; boucle interdite DEC-007 D4 |
| 27 | BIB_WORLD/CHARACTER/STYLE/PLOT | **CREATE-si-retenu / sinon doctrine** | doctrine seulement | SPEC_ONLY (V4) ; les substrats existent éclatés (World Model, story-state, scoring, payoff_graph) |

## Lecture stratégique (sans décider à la place de l'Architecte)
- **L'essentiel est déjà là** : 9 capacités en REUSE/ADAPT (canon-kernel, story-state, context-manager, continuity-oracle, adapter, SKEPTIC, gates sovereign, forge Python, répétition).
- **Le vrai neuf à CREATE** = (10) auto-recall sur mention, (13/14) Double-Bible+diff+extracteur. Tout le reste est câblage, réveil, ou extension.
- **Pièges à éviter** : (18) ne pas croire le World Model « ACTIF » (il est orphelin) ; (24) ne pas prendre le runner mock pour un moteur ; (20/22/23) marquer MUSEUM les canons rivaux sans les muter (EMP-15) — marquage en attente GO Architecte (`CANON_TRUTH_CONSOLIDATION_DECISION.md:51`).
- **Conflit doctrine** : la Book-Factory/ADR R6 récentes ignoraient effectivement une partie de la matière codée (World Model orphelin, gates sovereign dormants, SKEPTIC, src/canon riche) — ce forensic les remet sur la table avec preuves.
