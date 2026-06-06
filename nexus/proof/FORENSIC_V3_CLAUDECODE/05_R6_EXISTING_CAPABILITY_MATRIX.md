# 05 — R6 EXISTING CAPABILITY MATRIX

Cadre R6 (writer-loop) défini PROPOSED dans `docs/architecture/DEC-20260606-021-SCRIBE-R6-WRITER-LOOP.md`. Pour chaque capacité du design R6, ce qui existe DÉJÀ en code, où, et son état.

## Les 8 gates de l'Oracle R6 (DEC-021:80-93)
| Gate | Rôle | Brique existante | Path | État |
|---|---|---|---|---|
| G1 Format | conformité format | validators sovereign-engine / damage-gate | `sovereign-engine/.../microsurgery/damage-gate.ts` (11 tests) | EXISTS (dormant) |
| G2 Fidelity | fidélité intent | passes sovereign-engine | sovereign-engine passes | EXISTS (dormant) |
| G3 Canon | non-contradiction canon | continuity-oracle + canon-kernel rails | `continuity-oracle.ts`, `book-canon-adapter.ts` | EXISTS (book-factory DRAFT) |
| G4 Matter | matière narrative | story-state threads/payoff | `story-state.ts` | EXISTS (DRAFT) |
| G5 (Canon/Matter combinés) | — | idem G3/G4 | — | EXISTS |
| G6 SKEPTIC | contre-pouvoir vérité (deus-ex-machina, plot armor) | THE_SKEPTIC | `gateway/src/profiles.ts` (FROZEN) | EXISTS mais **dormant**, réveil ACL requis |
| G7 S-Oracle (advisory) | qualité esthétique | S-Oracle V2 | `sovereign-engine/.../oracle/s-oracle-v2.ts` | EXISTS (dormant) |
| G8 Rhythm (advisory) | rythme | temporal/silence modules sovereign | `sovereign-engine/.../{temporal,silence}` | EXISTS (dormant) |
| Repeat=SHADOW | détection répétition | forensic répétition Python | `scripts/metrology/bestofn_repeat_matrix.py`, `docs/research/OMEGA_REPEAT_*` | EXISTS (Python, actif) |

## Capacités transverses R6
| Capacité R6 | Existe ? | Où (path:line) | État | Verdict |
|---|---|---|---|---|
| **Writer-loop (génère→juge→régénère)** | PARTIEL | book-orchestrator (génère+continuity) ; pas de régen-sur-score | `book-orchestrator.ts:54-102` | ADAPT |
| **Régénération aveugle N1** | OUI (concept prouvé) | forge Python régénère ; `DEC-021:152` N1 ✅ | actif | REUSE |
| **Correction factuelle nommée N2** | NON (pending ratif 3-IA) | `DEC-021:155` 🟡 | DESIGN | CREATE (après GO) |
| **Coaching esthétique N3** | INTERDIT | `DEC-021:160` ❌ (Goodhart EMP-16) | interdit | IGNORE |
| **Multi-lecteurs / jury** | BLOQUÉ | seul gemma4 calibré ; autres DISQUALIFIÉS EMP-19 | `DEC-021:139-148` | EXTEND (1 juge) |
| **Double-Bible + diff auto** | NON | `DEC-021:115-129` PROPOSED, « ZÉRO code » | DESIGN | CREATE |
| **Bible mutable (état persistant)** | OUI | story-state | `story-state.ts:72-176` | REUSE |
| **Délestage contexte ≤600 mots** | OUI | context-manager | `context-manager.ts:15-39` | REUSE |
| **Truth-gate inter-chapitre** | OUI | continuity-oracle | `continuity-oracle.ts:37-94` | REUSE |
| **Rails vérité/croyance + PROMOTE** | OUI | canon-kernel + adapter | `book-canon-adapter.ts:80-319` | REUSE (mais câbler) |
| **SKEPTIC comme veto** | OUI (dormant) | THE_SKEPTIC FROZEN | `gateway/profiles.ts` | ADAPT (réveil ACL) |
| **Tiering/decay/digest mémoire** | OUI (orphelin) | memory_layer_nasa | `memory_{tiering,decay,digest}.ts` | EXTEND si scale (sinon IGNORE) |
| **Auto-recall sur mention** | **NON** | inexistant (V3,V6) | absent | CREATE |
| **Détection répétition (Repeat gate)** | OUI | forensic Python | `bestofn_repeat_matrix.py` | REUSE |

## Constat R6
La majorité des 8 gates R6 **existent déjà en code** mais répartis sur trois sous-systèmes à états différents : book-factory (DRAFT vivant : G3/G4 + Bible + délestage + continuité), sovereign-engine (dormant : G1/G2/G7/G8), gateway (FROZEN/dormant : G6 SKEPTIC). Le **vrai travail neuf** R6 = (a) **câbler** book-canon-adapter dans la boucle (aujourd'hui hors-boucle, V3), (b) **réveiller** SKEPTIC via ACL, (c) **créer** la Double-Bible+diff et l'**auto-recall** (seuls éléments réellement absents).
