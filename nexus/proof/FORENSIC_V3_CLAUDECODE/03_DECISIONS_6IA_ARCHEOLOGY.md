# 03 — DÉCISIONS MULTI-IA — ARCHÉOLOGIE  *(cœur de mission)*

Remontée des décisions arrêtées (parfois panels multi-IA + Architecte) sur les 8 thèmes. Légende participants : A=Architecte (Francky), C=Claude, G=ChatGPT, Gm=Gemini. **« Tribunal »** = panel multi-IA (typiquement Gm+G convergents + arbitrage A + vérification C).

> **Note d'autorité** : aucun document lu n'atteste un **panel littéral à 6 IA** sur ces thèmes. Plus grand panel scellé vérifié = **4/4** (`DEC-20260325-001`) + synthèses 4-IA (`docs/physique-litteraire/OMEGA_PROGRAMME_VERITE_SYNTHESE_4IA_v1.md`). « Jusqu'à 6 IA » = plafond de processus. Copies `docs/archive/museum/STALE_EXPORTS/...` = **MUSEUM** ; je cite la copie vivante `sessions/` quand elle existe.

## THÈME 1 — Bibliothèques BIB_*
| # | Décision | Date | Part. | Source (path:line) | Statut | Classe |
|---|---|---|---|---|---|---|
| 1.1 | « Bible » des faits = CANON_ENGINE (append-only) | 2026-01-03 | C,A | `docs/concepts/CNC-201-CANON_ENGINE.md:11,29` ; `BOOK_EXISTING_MODULES_INVENTORY_v1.md:30` (« la Bible de Francky ») | APPLIED-IN-CODE `gateway/canon_engine.ts` mais **DORMANT** | CANON_DOCTRINE+SNAPSHOT |
| 1.2 | 4 libs **BIB_WORLD/CHARACTER/STYLE/PLOT** à statut explicite (C4) | CODEX v1.3-RC1 | G,A | `CODEX...v1-3-1.md:1384` ; `BOOK_EXISTING_MODULES_INVENTORY_v1.md:40` | DESIGN-ONLY (doctrine) | CANON_DOCTRINE |
| 1.3 | **DOUBLE BIBLE** : Bible-RÉELLE vs Bible-EXTRAITE + `diffBibles()→IncoherenceReport` (MISSING/EXTRA/MUTATED/...) | 2026-06-06 | A,C,Tribunal | `DEC-20260606-021-...:115-129` | DESIGN-ONLY (PROPOSED, réutilise StoryState) | DRAFT |
| 1.4 | Aucun nouveau canon : Book-Factory **consomme** le canon existant via adapter anti-corruption | 2026-06-05 | A(« 1000% »),Tribunal | `CANON_TRUTH_CONSOLIDATION_DECISION.md:14-16` | APPLIED-IN-CODE `book-canon-adapter.ts` | CANON_DOCTRINE |

## THÈME 2 — Sous-agents répondeurs
| # | Décision | Date | Part. | Source | Statut | Classe |
|---|---|---|---|---|---|---|
| 2.1 | SENTINEL dispose de **sous-juges** spécialisés, peut interroger snapshots/library/lois/emotion/memory | 2026-01-21 | A,C,G | `GOVERNANCE/DECISIONS/DEC-20260121-001...:29,32` | DESIGN-ONLY (Sentinel FROZEN ; dispatch non tracé en prod) | CANON_DOCTRINE (sealed) |
| 2.2 | « Faire relire par une autre personne » = **multi-lecteurs** (CALC + gemma4 + 2e persona + SKEPTIC) | 2026-06-06 | A,C,G,Gm | `DEC-20260606-021-...:139-148` | DESIGN-ONLY (PROPOSED) | DRAFT |
| — | **AUCUNE décision tracée** pour un bus runtime générique « sous-agent répondeur ». Les « sous-agents » du repo = agents de revue adversariale de Claude (QA), ex. `P1_SOCLE...md:23` | — | — | — | gap explicite | — |

## THÈME 3 — Agents dormants / délestage
| # | Décision | Date | Part. | Source | Statut | Classe |
|---|---|---|---|---|---|---|
| 3.1 | Délestage contexte = `context-manager` digest borné ≤600 mots (LLM ne voit jamais tout le livre) | 2026-06-05 | A,Tribunal | `BOOK_FACTORY_ARCHITECTURE.md:26,50` ; `BOOK_MEMORY_STATE_DESIGN.md:54-61` | APPLIED-IN-CODE `context-manager.ts` | DRAFT→APPLIED |
| 3.2 | Substrat oubli/offload = `memory_layer_nasa` (digest+tiering+decay+snapshot) réutilisé **read-only via ACL** | 2026-06-05 | Tribunal,A | `CANON_TRUTH_CONSOLIDATION_DECISION.md:43` ; `BOOK_FACTORY_ADAPTER_STRATEGY.md:36` | DESIGN-ONLY (adapter non bâti ; layer DORMANT) | CANON_DOCTRINE+SNAPSHOT |
| — | **AUCUNE décision** pour un « agent dormant de compression » autonome. Délestage = mécanisme (digest/tiering), pas agent | — | — | — | gap clarifié | — |

## THÈME 4 — Marqueurs personnage / auto-recall
| # | Décision | Date | Part. | Source | Statut | Classe |
|---|---|---|---|---|---|---|
| 4.1 | `Character.knows[]` + **Character Knowledge Graph** (vue attribuée sur rails canon-kernel, pas de nouveau canon) | 2026-06-05 | Tribunal (G+Gm : « extend Subtext = seul vrai neuf ») | `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md:4,15-28` ; `CANON_TRUTH_CONSOLIDATION_DECISION.md:45,59` | PARTIEL : `knows`=JTB codé `book-canon-adapter.ts` (13 tests) ; graphe complet DESIGN-ONLY | DRAFT→partiel |
| 4.2 | **Mention→auto-recall** (« marqueur unique derrière le nom qui appelle tout ») = **CONÇU EN DISCUSSION mais NON CODÉ** — le vrai « neuf » | ongoing | A | `BOOK_EXISTING_MODULES_INVENTORY_v1.md:48` (« Index mention→rappel … absents. À AJOUTER ») | DESIGN-ONLY / NOT-IN-CODE | DRAFT |
| 4.3 | Mécanisme existant le + proche = `ripple_engine` (propagation), mais « propagation, **pas** déclenchement-sur-citation » | 2026-01-03 | C,A | `BOOK_EXISTING_MODULES_INVENTORY_v1.md:46` ; `CNC-203-RIPPLE_ENGINE.md` | APPLIED-IN-CODE `ripple_engine.ts` mais DORMANT ; ≠ auto-recall | CANON_DOCTRINE (CNC) |

## THÈME 5 — World Model
| # | Décision | Date | Part. | Source | Statut | Classe |
|---|---|---|---|---|---|---|
| 5.1 | `memory_layer_nasa` = **« World Model »** documenté, réutiliser via ACL, jamais muter | 2026-06-05 | Tribunal,A | `CANON_TRUTH_CONSOLIDATION_DECISION.md:43` ; `BOOK_EXISTING_MODULES_INVENTORY_v1.md:36-39` | APPLIED-IN-CODE (certifié) mais **DORMANT** | SNAPSHOT (certifié) |
| 5.2 | **StoryState** mutable (« Bible du roman ») = world-state que le Canon statique ne fournit pas | 2026-06-05 | A,C | `BOOK_MEMORY_STATE_DESIGN.md:8-43` ; `P1_SOCLE...md:10` | APPLIED-IN-CODE `story-state.ts` (8 tests) | DRAFT→APPLIED |
| 5.3 | Assemblage fractal L3 nomme « Canon Lock, World Model, Bible, CDE » | 2026-03-25 | A,C,G,Gm (4/4) | `DEC-20260325-001-...:90,138` | DESIGN-ONLY (L3 non codé) | CANON_DOCTRINE (sealed) |

## THÈME 6 — Mémoire / recall / injection contexte
| # | Décision | Date | Part. | Source | Statut | Classe |
|---|---|---|---|---|---|---|
| 6.1 | Phase 10 « MEMORY & CANON » organe distinct ; QUANTUM_TRUTH_MANAGER | 2026-01-21 | A,C,G | `DEC-20260121-001...:37-46,194` | DESIGN-ONLY (substrat = memory_layer dormant) | CANON_DOCTRINE (sealed) |
| 6.2 | Principe « contexte borné, état persistant » (cohérence longue par mémoire externe injectée sélectivement) | 2026-06-05 | A,Tribunal | `BOOK_FACTORY_ARCHITECTURE.md:49-50` | APPLIED-IN-CODE (context-manager + story-state) | DRAFT→APPLIED |
| 6.3 | Protocole injection sélective : rolling_summary(≤400)+last_chapter(≤150)+subset+« seeds to bloom NOW » filtré `bloom_target_chapter==c` | 2026-06-05 | A,C | `BOOK_MEMORY_STATE_DESIGN.md:54-67` | APPLIED-IN-CODE (seed planté ch2 émergé `P2_LLM_GENERATION_EVIDENCE.md:28`) | DRAFT→APPLIED |
| 6.4 | PoC continuité = injecter 200 derniers mots du chap N-1 (`test-p4-continuite.ts`) | 2026-03-24 | C | `BOOK_FACTORY_ARCHITECTURE.md:18` ; `OMEGA_BLUEPRINT_JUGE_SCRIBE_v1.md:130` | APPLIED-IN-CODE (PoC→context-manager) | SNAPSHOT |

## THÈME 7 — Juges / relectures multi-passes
| # | Décision | Date | Part. | Source | Statut | Classe |
|---|---|---|---|---|---|---|
| 7.1 | **Double juge** GB V1 (microbench) vs Multi-Stage V2 (long-form, corrige biais OOD) + routage | 2026-03-24 | C | `OMEGA_BLUEPRINT_JUGE_SCRIBE_v1.md:16-107` | APPLIED-IN-CODE `gb-scorer.ts`/`multi-stage-scorer-v2.ts` (snapshot ; évolué vers S-Oracle V2) | SNAPSHOT |
| 7.2 | **Scribe = artiste aveugle** (génère, pas d'accès métrique) ; OMEGA = gardien vérité | 2026-03-24 | C | `OMEGA_BLUEPRINT_JUGE_SCRIBE_v1.md:112-119,168` (INV-PROMPT-01) | APPLIED-IN-CODE (invariants CONTRAT_OMEGA_SCRIBE) | SNAPSHOT |
| 7.3 | Frontière scribe(structurel)/sovereign(esthétique), moteurs DÉCOUPLÉS | 2026-05-31 | C,Gm,G;A | `DEC-20260531-007-...:42-47,106-108` | **SUPERSEDED** par DEC-009 (:6) | DRAFT (superseded) |
| 7.4 | **Boucle interdite** : un moteur qui génère→juge esthétiquement→réécrit→accepte son verdict SEUL = INTERDIT | 2026-05-31 | C,G,Gm,A | `DEC-20260531-007-...:51-55` (D4) | CANON_DOCTRINE (repris DEC-009 & 021) | DRAFT→DOCTRINE |
| 7.5 | **Moteur unique de fusion** = état final ; hybride = échafaudage transitoire | 2026-05-31 | A,Gm,G,C | `DEC-20260531-009-...:11-15,31-42` | DESIGN-ONLY (PROPOSED) | DRAFT |
| 7.6 | **Multi-lecteurs sous EMP-19** : seul gemma4 = juge LLM calibré non-biaisé ; qwen3/mistral/phi4/command-r7b/llama3.1 DISQUALIFIÉS → jury multi-modèle non viable | 2026-06-06 | A,C,Tribunal | `DEC-20260606-021-...:139-148` | DESIGN-ONLY (PROPOSED, fondé N1-N6 mesuré) | DRAFT |
| 7.7 | **Oracle 8-gates (R6)** : vetos durs G1-G6 (Format/Fidelity/Canon/Matter/SKEPTIC) + advisory G7-G8 (S-Oracle/Rhythm) ; Repeat=SHADOW | 2026-06-06 | A,C,Tribunal | `DEC-20260606-021-...:80-93` | DESIGN-ONLY (PROPOSED) | DRAFT |
| 7.8 | **THE_SKEPTIC** = contre-pouvoir vérité, réutilisé R6 G6 (réveil via ACL) | 2026-01-03 | C,A | `docs/concepts/CNC-100-THE_SKEPTIC.md` ; `DEC-...-021:89` | APPLIED-IN-CODE `gateway/profiles.ts` (FROZEN), dormant pour R6 | CANON_DOCTRINE (CNC) |
| 7.9 | Frontière **Correction vs Coaching** : N1 régen aveugle ✅ ; N2 correction factuelle nommée 🟡 (ratif 3-IA) ; N3 coaching esthétique ❌ INTERDIT (Goodhart EMP-16) | 2026-06-06 | A,C,Tribunal | `DEC-20260606-021-...:152-162` | DESIGN-ONLY (N2 pending) | DRAFT |

## THÈME 8 — Consolidation canon / truth-gate
| # | Décision | Date | Part. | Source | Statut | Classe |
|---|---|---|---|---|---|---|
| 8.1 | **canon-kernel = épine canonique UNIQUE** (rails+PROMOTE), pas de 5e canon / 6e truth-gate ; 284/284 runtime | 2026-06-05 | Tribunal(G+Gm);A(« 1000% ») | `CANON_TRUTH_CONSOLIDATION_DECISION.md:9-16,58-60` | DESIGN-ONLY (décision) + canon-kernel APPLIED-IN-CODE (rails latents « 0 appelant » :25) | CANON_DOCTRINE |
| 8.2 | Classer canons/gates rivaux (gateway canon_engine, src/canon, etc.) **MUSEUM/ORPHAN** ; marquer, jamais muter (EMP-15) | 2026-06-05 | Tribunal;A(GO pending) | `CANON_TRUTH_CONSOLIDATION_DECISION.md:22-38,51` | DESIGN-ONLY (marquage pending) | CANON_DOCTRINE |
| 8.3 | P0.5 (preuves+specs avant code) retenu vs « GO P1 now » | 2026-06-05 | Gm vs G ; A arbitre | `CANON_TRUTH_CONSOLIDATION_DECISION.md:60` | APPLIED (specs P0.5 produites) | CANON_DOCTRINE |
| 8.4 | Anti-contamination prouvée : croyance répétée par 3 persos ne contamine jamais la vérité (PROMOTE+evidence requis) | 2026-06-05 | C ; revue sub-agent SOUND | `P0_6_EPISTEMIC_INTEGRATION_PROBE_REPORT.md:16-22,41` | APPLIED-IN-CODE `book-canon-adapter.ts` (8/8 + 292 voisins) | DRAFT→APPLIED |
| 8.5 | Mensonge = **relation cross-rail calculée**, pas donnée stockée ; mensonge attribué en V1 (polar/thriller) | 2026-06-05 | Tribunal | `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md:23,60,77-78` | APPLIED-IN-CODE (isLie/knows, P0.6b) | DRAFT→APPLIED |
| 8.6 | `continuity-oracle` = truth-gate inter-chapitre composant canon_engine⊕ripple⊕truth-gate | 2026-06-05 | A,C | `BOOK_FACTORY_ARCHITECTURE.md:25` ; `P1_SOCLE...md:12` | APPLIED-IN-CODE `continuity-oracle.ts` (8 tests) | DRAFT→APPLIED |
| 8.7 | TRUTH_GATE + CANON_ENGINE indissociables (« TRUTH sans CANON = police sans code pénal ») | 2026-01-03 | C,A | `CNC-200-TRUTH_GATE.md:19,44` ; `CNC-201-CANON_ENGINE.md:19` | APPLIED-IN-CODE gateway (dormant) | CANON_DOCTRINE (CNC) |

## CONSTATS TRANSVERSAUX
1. **Deux ères de décisions** : (a) **janvier 2026** (organes gateway, DEC-20260121-001 + CNC-100/200/201/203) → APPLIED-IN-CODE mais **DORMANT** ; (b) **juin 2026** (book-factory) où les mêmes concepts sont **re-décidés ADAPT-not-rebuild** et partiellement **ré-implémentés** dans `packages/book-factory/`.
2. **Plus grand panel vérifié = 4/4** (DEC-20260325-001). Aucun document n'atteste un panel littéral à 6 IA.
3. **APPLIED-IN-CODE réel** (book-factory, tests verts P0.6b/P1/P2) : book-canon-adapter, story-state, book-planner, continuity-oracle, context-manager, book-orchestrator, chapter-generator (3 chap PASS gemma4:31b). 46 tests + 292 voisins.
4. **DESIGN-ONLY / PROPOSED** : Double-Bible+diff (DEC-021), R6 8-gates, jury multi-modèle (bloqué EMP-19), fusion moteur (DEC-009), correction N2, marquage MUSEUM des canons rivaux.
5. **Gaps explicites (aucune décision tracée)** : bus runtime « sous-agent répondeur » ; « agent dormant de compression » autonome ; **auto-recall sur mention** (acté conçu-mais-NON-codé `BOOK_EXISTING_MODULES_INVENTORY_v1.md:48`).
6. **CONTRADICTED-BY-CODE** : DEC-20260531-007 (couplage scribe/sovereign) inversé par grep (0 consommateur lib) → SUPERSEDED par DEC-009.
7. ⚠ Une écriture « Recall Bus / ADR R2 » existe dans le dossier interdit `FORENSIC_V3_COWORK/` (vu en grep, NON lu). Signalé.
