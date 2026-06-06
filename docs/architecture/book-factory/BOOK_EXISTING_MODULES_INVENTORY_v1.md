# BOOK-FACTORY — Inventaire EXHAUSTIF de l'existant + Tableau croisé anti-doublon

**Date** : 2026-06-05 · **Statut** : INVENTAIRE VÉRIFIÉ (file:line, doc-only, ZÉRO code) · **Standard** : NASA-Grade L4
**Mandat (Architecte)** : *avant tout design/code, faire le bilan de ce qui existe déjà ; pour chaque module Book-Factory, vérifier l'équivalent existant ; tableau croisé proposé vs existant vs action.*
**Corrige** : `BOOK_PIPELINE_MODULE_GAP_ANALYSIS.md` (2026-06-05) qui concluait à tort « MANQUE → CONSTRUIRE » pour 3 modules dont le substrat **existe déjà** (sous-système `gateway/`, non scanné car non importé par `packages/`).

---

## 0. Verdict en une phrase
**L'Architecte avait raison.** Un sous-système complet (`gateway/` = `omega-gateway-universel`, Phases 7–10, certifié NASA-Grade, compile clean au 2026-05-26) contient **déjà** une Bible/Canon mutable, un moteur de propagation (Ripple), et une couche Mémoire documentée comme **« World Model »**. Il n'est **pas câblé** dans le pipeline de production courant (`creation-pipeline`/`sovereign-engine`) — d'où l'angle mort. Sur les 5 modules Book-Factory proposés : **3 = ADAPTER** (le substrat existe, dormant) · **2 = CRÉER** (mais alignés sur une décision déjà scellée + réutilisant l'existant). **1 concept cité (matrice quantum croyances/rêves/mensonges/faits) = NON CONFIRMÉ en code** — incertitude explicitée §4.

---

## 1. Méthode (ce qui a été lu/vérifié)
- **IRM** : `docs/irm/02,05,07,10,11` (atlas modules/features/pipelines/exports).
- **Blueprints** : `nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json`.
- **Codex** : `CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-3.x` (4 bibliothèques BIB_WORLD/CHARACTER/STYLE/PLOT).
- **Décisions scellées** : `DEC-20260531-009` (Canonical Narrative Engine Fusion) ; **`DEC-20260325-001` (Paradigme d'Assemblage Fractal, SCELLÉ 4/4)**.
- **Schéma** : `CANON_SCHEMA_SPEC_v1.2` (+ son implémentation `src/canon/`).
- **Code (vérifié file:line + git)** : `gateway/src/gates/*`, `gateway/src/memory/memory_layer_nasa/*`, `packages/{canon-kernel,contracts-canon,truth-gate,genesis-planner,creation-pipeline,sovereign-engine}`.
- **Preuve de statut** : `git log` par fichier + recherche d'imports cross-package.

---

## 2. Inventaire de l'existant pertinent (par capacité)

### 2.A — Bible / Canon (enregistre faits, personnages, monde) — **EXISTE, ×4 implémentations**
| Module | Chemin (vérifié) | Ce qu'il fait | Statut réel |
|---|---|---|---|
| **CANON_ENGINE** | `gateway/src/gates/canon_engine.ts` (Phase 7B, v1.0.0, **30 tests** `gateway/tests/canon_engine.test.ts`, CNC-201) | Source de vérité MUTABLE par **append-only** : `CanonFact{ type, subject, predicate, object?, establishedAt(chapitre!), confidence(0-1) }` ; `FactType = CHARACTER|LOCATION|EVENT|RULE|RELATIONSHIP|STATE` ; Merkle stable ; conflit = exception explicite (INV-CANON-01..05). **= la « Bible » de Francky.** | Certifié, **NON câblé** au prod path |
| **canon (spec impl.)** | `src/canon/{canon-api,guard,lineage,predicate-catalog,query,semantic-equals,segment-*}.ts` (CANON_SCHEMA_SPEC v1.2) | Claims `subject/predicate/value` + `lineage{source,confidence}` + `status ACTIVE/SUPERSEDED/DISPUTED` + Guard contradictions (`semanticEquals`). | Construit (spec→code) |
| **canon-kernel** | `packages/canon-kernel/src/` | « Universal Truth Engine » : canonicalize + sha256 + schema (primitive déterministe bas-niveau). | LIVE (utilitaire) |
| **contracts-canon** | `packages/contracts-canon/src/` | Canon des **contrats d'interface/invariants** (gouvernance) — ⚠ PAS des faits narratifs. | LIVE (gouvernance) |
| genesis-planner `Canon` | `packages/genesis-planner/src/types.ts:30,37` | `readonly entries[]`, `immutable:boolean` → **STATIQUE** (ne grandit pas). | LIVE — mais inadapté à l'état évolutif |

### 2.B — World Model / Mémoire d'état évolutive — **EXISTE (gateway), dormant**
| Module | Chemin | Rôle | Statut |
|---|---|---|---|
| **MEMORY_LAYER_NASA** | `gateway/src/memory/memory_layer_nasa/` : `memory_store` (append-only, hash-chain, mutex), `memory_engine` (Store+Index+Query), **`memory_digest_writer`/`memory_digest`** (digests), **`memory_snapshot`** (isolation), **`memory_tiering`/`memory_decay`** (pertinence/oubli), `memory_hybrid` (Phases 8–10D, INV-MEM-01..08) | **Documenté « [ACTIF — World Model] »** (`OMEGA_CARTE_REPO_v1.md:112`) et « Fondation World Model » (`OMEGA_ROADMAP_v8_0.md:38`). Versionné, déterministe, snapshot crash-safe. | Certifié, **NON câblé** |
| Codex `BIB_WORLD` | `CODEX_…v1-3-1.md:1384` | World/Character/Style/Plot libraries (statut PRÉSENTE/PARTIELLE/PRÉVUE). | Doctrine |
| Roadmap `V-WORLD-1/2`, `V-CANON-1` | `OMEGA_ROADMAP_SYNTHESE_v1.md:115` | Intégration World Model / Canon engine. | **Planifié, non intégré** |

### 2.C — Marqueurs personnage / propagation / rappel — **PARTIEL**
| Module | Chemin | Rôle | Statut |
|---|---|---|---|
| **RIPPLE_ENGINE** | `gateway/src/gates/ripple_engine.ts` (Phase 7D, v1.0.0, tests `gateway/tests/ripple_engine.test.ts`) | Propage les **conséquences** d'un événement (ripples) avec atténuation (0.3/niveau), anti-cycle (depth 10), **ne peut contredire le canon** ; écrit des digests en mémoire via `memory_digest_writer`. **≈ « remontée auto » de Francky** (propagation, pas déclenchement-sur-citation). | Certifié, **NON câblé** |
| CanonFact `CHARACTER` | `gateway/src/gates/types.ts:73` | Faits personnage tracés par chapitre + confiance. | idem |
| **Manque** | — | **Index mention→rappel** (auto-recall sur citation) + **`Character.knows[]`** (asymétrie d'info) = absents. | À AJOUTER |

### 2.D — Génération d'un chapitre / planification d'une œuvre — **EXISTE (prod courant)**
| Capacité | Chemin | Décision |
|---|---|---|
| Forge 1 brique/chapitre (K2+DUEL+Oracle+MicroSurgery) | `packages/creation-pipeline/src/engine.ts` (F0-F8, scellé 2026-02-08, 318 tests) ; `sovereign-engine` ; `scribe-engine/weaver-llm.ts` | Réutiliser intact |
| Planif arcs+scènes d'**une** œuvre | `genesis-planner/src/{planner,types,generators}.ts` (`Intent/Arc/Scene/Seed/Beat`, `seed-bloom-tracker`) | Réutiliser **par chapitre** |
| Segmentation | `packages/omega-segment-engine` | Réutiliser |
| Scellement brique (immuabilité) | ProofPack + SHA-256 | Réutiliser |

### 2.E — Paradigme d'assemblage livre — **DÉJÀ SCELLÉ (doctrine), non encore codé**
- **`DEC-20260325-001` Assemblage Fractal — SCELLÉ unanimité 4/4.** 4 niveaux : **brique** (forge atomique, sceller si composite≥92 & min_axis≥85) → **ciment** (linker transitions) → **chapitre** (assemblage) → **livre** (méta-assemblage). Niveau 3 cite explicitement comme **outils existants** : *« Canon Lock, World Model, Bible, CDE »* → c'est-à-dire le sous-système `gateway/` ci-dessus.
- Spec linker : `docs/OMEGA_CLAUDE_CODE_STEP7_LINKER.md`. **Code `src/assembly/linker.ts` = NON construit** (vérifié : pas de `src/assembly`). Sprints V-CEMENT/V-CHAPTER = ❌ pas faits.
- ⇒ **Le book-orchestrator que je proposais EST l'assembleur fractal déjà décidé par Francky.** Ne pas réinventer le paradigme : l'implémenter.

---

## 3. TABLEAU CROISÉ — proposé vs existant vs action (le livrable)

| # | Module Book-Factory proposé | Équivalent existant (vérifié) | Réalité | **ACTION** |
|---|---|---|---|---|
| 1 | **story-state** (Bible mutable : characters/places/timeline/threads + `payoff_graph`) | `gateway/canon_engine.ts` (CanonFact CHARACTER/LOCATION/EVENT/RULE/RELATIONSHIP/STATE + `establishedAt`=chapitre + confidence, append-only, 30 tests) **+** `gateway/memory_layer_nasa/*` (store versionné + digest + decay + tiering + snapshot = « World Model ») **+** `src/canon/*` (claims+lineage+DISPUTED+guard). *(genesis-planner Canon = immuable, inadapté.)* | La Bible mutable **EXISTE** (certifiée), mais **dormante/non câblée**. Seuls **`payoff_graph` cross-chapitre** et **`Character.knows[]`** (asymétrie) sont réellement absents. | **ADAPTER** — câbler/bridger `canon_engine` + `memory_layer` comme substrat d'état ; n'ajouter QUE payoff_graph + asymétrie. *(≠ créer)* |
| 2 | **book-planner** (BookIntent 60k → N `ChapterSpec` + pacing + seed_schedule) | `genesis-planner` (œuvre unique, Canon immuable) ; pacing = arcs de Reagan (L9) ; paradigme = `DEC-20260325-001`. Pas de planificateur **macro** 60k→chapitres. | Étage macro **absent** ; per-chapitre + pacing **réutilisables**. | **CRÉER** (couche mince) — `ChapterSpec→Intent` vers genesis-planner + pacing L9. Neuf, sur substrat existant. |
| 3 | **book-orchestrator** (boucle 1..N : assemble→pipeline→update→continuity, crash-safe) | **`DEC-20260325-001` Assemblage Fractal (SCELLÉ 4/4)** + `DEC-009` (BookOrchestrator conçu) + `OMEGA_CLAUDE_CODE_STEP7_LINKER.md`. Brique = `creation-pipeline` ; scellement = ProofPack. `src/assembly/linker.ts` = **non construit**. | La boucle/assembleur = **non codée** (spécifiée + scellée). Forge-brique + scellement **existent**. | **CRÉER — STRICTEMENT aligné au DEC-20260325-001** (brique/ciment/chapitre/livre + STEP7_LINKER). Réutiliser creation-pipeline. *Ne pas réinventer le paradigme.* |
| 4 | **continuity-oracle** (gate inter-chapitres : contradiction perso/fait/chrono + indice OVERDUE) | `gateway/canon_engine` conflit (INV-CANON-05) + `ripple_engine` (propagation, anti-contradiction canon) + `packages/truth-gate/*` (validators drift/contradiction + `verdict-ledger`) + `creation-pipeline/gates/unified-{crossref,truth}-gate` (intra-gen). | Primitives de détection de contradiction **existent** (canon+ripple+truth-gate), au niveau brique/intra. Composition **inter-chapitre** + OVERDUE + chrono = à ajouter. | **ADAPTER** — composer canon_engine⊕ripple⊕truth-gate en gate inter-chapitre ; ajouter OVERDUE/chrono. Réutilisation forte. |
| 5 | **context-manager** (digest ≤600 mots : rolling_summary + état pertinent + graines → borne VRAM) | `gateway/memory_layer_nasa/memory_digest_writer.ts` + `memory_digest.ts` (DIGEST) + `memory_snapshot` (isolation) + `memory_tiering`/`memory_decay` (pertinence) + `sovereign-engine/.../token-counter.ts`. | La machinerie digest+tiering+snapshot (contexte borné) **EXISTE** (gateway). Budgets + filtre payoff = à configurer. | **ADAPTER** — réutiliser memory_layer digest/tiering/snapshot ; configurer budget + injection filtrée. Réutilisation forte. |
| + | **repeat-shadow** (anti-répétition vu du sélecteur) | `repeat-shadow.ts` (forensic BESTOFN, vérifié tsc+runtime) | Patch terminal advisory prêt. | **APPLIQUER en terminal** (précondition S1, inchangé). |

**Bilan d'action** : **ADAPTER ×3 (story-state, continuity-oracle, context-manager)** · **CRÉER ×2 (book-planner, book-orchestrator) — alignés DEC scellé + réutilisant l'existant**. Gain anti-doublon : on évite de re-coder tout le sous-système `gateway/` (World-Model/Canon/Memory/Ripple, Phases 7–10, certifié).

---

## 4. Le seul concept NON CONFIRMÉ — matrice quantum (croyances/rêves/mensonges/faits)
**Honnêteté (doctrine : jamais inventer).** Recherche exhaustive (code+docs, FR+EN : *quantum, croyance, mensonge, rêve, belief, lie, dream, épistémique, superposition, unreliable narrator*) :
- **Aucun module dédié** séparant *ce qui est vrai / cru / menti / rêvé*. Le seul « quantum » du code = **« Quantum Suture »**, une métaphore de polish (`sovereign-engine/src/polish/paragraph-patch.ts`), sans rapport épistémique.
- **Substrat candidat existant** (mais pas la matrice elle-même) : `CanonFact.confidence(0-1)` + `src/canon` `status:DISPUTED` + `lineage.source/confidence` + Guard contradictions. `FactType` est **ontologique** (character/location/event/rule/relationship/state), **pas épistémique** (fact/belief/lie/dream).
- **Conclusion** : soit ce module est **documenté/intentionnel uniquement** (non codé), soit il porte un autre nom non rencontré. **Je ne l'affirme ni ne le nie** → il me faut un **pointeur de l'Architecte** (où l'as-tu vu : doc ? roadmap ? autre session ?) avant toute conclusion. Non bloquant pour P1 (story-state/book-planner) ; à trancher avant de modéliser l'asymétrie d'information (R8).

---

## 5. Décision à valider (STOP — aucun code avant GO)
Le substrat `gateway/` est **certifié mais NON câblé** au pipeline courant, et **construit à une autre époque** (Phases 7–10, janv. 2026) que `sovereign-engine`/`creation-pipeline` (févr. 2026+). Deux voies — **choix Architecte** :

- **Option ADAPT (recommandée)** : **câbler/bridger** les modules `gateway/` (canon_engine, memory_layer, ripple) dans la couche Book-Factory. Réutilise du code certifié, moins de greenfield. *Risque* : réconciliation d'interfaces + dérive d'époque + **vérifier le statut FROZEN** (`gateway/sentinel/` est FROZEN Phase 27 ; `gateway/src/gates` & `/memory` = statut à confirmer avec toi avant de toucher/importer).
- **Option FRESH-CONSUME** : nouveaux modules minces dans l'écosystème `packages/` courant qui **réimplémentent les concepts** (schémas CanonFact/MemoryEntry) sans importer `gateway/`. Plus propre côté intégration, mais **re-code partiel** ⇒ risque de doublon que tu veux éviter.

**Recommandation** : Option ADAPT, **après** que tu confirmes (a) le statut gel de `gateway/src/{gates,memory}`, (b) le pointeur « matrice quantum », (c) que book-orchestrator suit bien `DEC-20260325-001`. Tant que non validé → **zéro code**.

---

## VERDICT
- **Statut** : **PASS** (inventaire exhaustif livré + tableau croisé + incertitude explicitée). **Confiance : Haute** sur l'existant vérifié file:line/git ; **Moyenne** sur le concept quantum (non trouvé).
- **Forces** : (1) corrige une erreur réelle (3 « MANQUE » → ADAPTER, sous-système `gateway/` retrouvé) ; (2) chaque ligne tracée au code/commit ; (3) aligne le book-orchestrator sur une décision **déjà scellée** (anti-réinvention) ; (4) sépare honnêtement réutilisable / à ajouter / non confirmé.
- **Faiblesses** : (1) statut **FROZEN/wirable** de `gateway/src/{gates,memory}` non tranché → conditionne ADAPT vs FRESH ; (2) la **matrice quantum** reste non localisée (dépend d'un pointeur Architecte) ; (3) effort réel d'ADAPT (réconciliation d'interfaces gateway↔packages) **non chiffré** — peut être non trivial vu la dérive d'époque ; (4) `payoff_graph` cross-chapitre + asymétrie d'info restent **réellement neufs** (cœur du risque R3).
- **Risques restants** : câbler un sous-système dormant peut réintroduire des incompatibilités de types (era-drift) ; sous-estimer l'ADAPT = re-tomber dans du CREATE déguisé.
- **Action requise** : **validation humaine (Architecte)** sur les 3 points du §5 avant tout P1. Aucune modification moteur. Aucun code.
