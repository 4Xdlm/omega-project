# REUSE / ADAPT / EXTEND / CREATE — TABLE FINALE CONSOLIDÉE (2 instruments + arbitrages D1-D5 proposés)

**Base** : table CC (05_REUSE_ADAPT_CREATE_DECISION_TABLE.md, 27 lignes) **+ amendements Cowork** (marqués ♦). Aide à la décision — exécution gâtée par signature Architecte D1-D5 + ratification ADR R6 R2.

## REUSE (tel quel)
| Capacité | Cible |
|---|---|
| Primitive canon (rails truth/interp + PROMOTE + hash) | `packages/canon-kernel` (SSOT décrété, 284 runtime) |
| Bible mutable world-state | `book-factory/story-state.ts` (fold event-sourced, payoff_graph) |
| Délestage contexte ≤600 mots | `book-factory/context-manager.ts` |
| Gate inter-chapitres | `book-factory/continuity-oracle.ts` |
| Régénération aveugle N1 | forge Python `scripts/metrology/forge_*.py` (actif) |
| Détection répétition (SHADOW) | `bestofn_repeat_matrix.py` + module shadow bge-m3 |

## ADAPT (câbler/réveiller, jamais muter)
| Capacité | Cible | Note |
|---|---|---|
| Épistémique knows/isLie JTB | `book-canon-adapter.ts` | **CÂBLER dans book-orchestrator** (CC V3 : jamais instancié en boucle) |
| SKEPTIC (veto vérité G6) | `gateway/profiles.ts` (FROZEN) | via ACL read-only |
| Gates qualité G1/G2/G7/G8 | `sovereign-engine/{microsurgery,oracle,temporal,silence}` | dormants → extraire |
| ♦ **Délestage/World Model** | `gateway/memory_layer_nasa` (tiering/decay/digest/hybrid/store/query/snapshot) | **D1 : ADAPT via ACL dès R2** (l'ACL importe les sous-modules non exportés sans toucher index.ts) |
| ♦ creation_layer_nasa (pattern PROPOSAL) | `gateway/src/creation/` (SEALED Ph.9 : moteur qui ne retourne QUE des propositions, n'écrit jamais) | candidat naturel du writer-loop « candidats→gates » ; à évaluer dans l'ADR R2 |
| Bus répondeurs (si dispatch requis) | `integration-nexus-dep` router/registry | dormant, testé |
| sovereign-engine (forge TS complète) | décision Architecte : câbler provider OU réserve pendant forge Python | OFF-path actuel |

## EXTEND (bâtir sur base existante)
| Capacité | Base | Amendement ♦ |
|---|---|---|
| **Identité d'entité stable** | spec CKG + canon-kernel id factory | ♦ **D3 OBLIGATOIRE : mint-once CharacterRegistry + table alias** — l'`ent_`=f(payload.name) existant N'EST PAS la solution (rename casse) ; il peut frapper l'ID initial UNE FOIS (seed unique), ensuite immuable |
| Character Knowledge Graph | spec doc-only sur rails | mensonge=relation cross-rail (calculé), V1 polar |
| R6 writer-loop | `book-orchestrator.ts` + gates | régen ciblée bounded, jamais coaching-sur-score |
| Jury (1 juge) | gemma4 via Python | EMP-19 : multi-modèle non viable (qwen3/mistral/phi4/command-r7b/llama3.1 disqualifiés) ; 2ᵉ persona = nouvel instrument à calibrer AVANT usage |
| ♦ MUSE (déblocage créatif) | `src/oracle/muse/` (assess.ts — partiellement codé, correction autoaudit) | câblage runtime à vérifier ; PAS dans R6 V1, noté pour V2 |

## CREATE (le vrai neuf — confirmé par les 2 instruments)
| Capacité | Contenu | Invariant |
|---|---|---|
| **Recall Bus** | mention d'entité (plan OU prose) → résolution alias via CharacterRegistry → RecallPack auto (état, knows, fils ouverts, dettes) injecté au generator | **entité mentionnée sans RecallPack ⇒ candidat INVALID** (« la Bible ne peut pas oublier d'être consultée ») |
| **Double-Bible** | extracteur prose→événements par PASSES (taxonomie MECE à fixer dans l'ADR, pas « 5 » figé) → Bible-EXTRAITE (même type StoryState) → `diffBibles()` : MISSING / EXTRA(=hallucination) / MUTATED / TEMPORAL / EPISTEMIC / UNCERTAIN_* | extracteur calibré EMP-19 + SKEPTIC en filet ; diff = signaux, jamais réécriture auto |
| **MapProjection + diff carte** | projection spatiale/relationnelle/seeds des 2 Bibles + comparaison graphes | dérivé de la Double-Bible |
| CharacterRegistry mint-once + alias | (cf. EXTEND D3 — frappe ID + projection alias ; classé CREATE car le composant registre n'existe pas) | pré-requis du Recall Bus |

## IGNORE / MUSEUM (jamais muter — marquage gâté GO Architecte, EMP-15)
- ❌ **N3 coaching esthétique sur score = INTERDIT** (Goodhart EMP-16, Mode C toxique, DEC-007 D4).
- MUSEUM : `gateway/canon_engine` (NCR orphan existante), canon-stores `OMEGA_PHASE18/20_*`, `src/canon` (porter les idées DISPUTED/supersession vers canon-kernel avant), decision-engine (**D2 : MUSEUM-RÉFÉRENCE**), `src/runner` (mock — ne pas confondre avec un moteur).
- Doctrine BIB_* = nomenclature de vues, PAS 4 nouveaux modules à créer.
