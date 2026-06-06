# 03 — BIBLE / CANON / WORLD MODEL SCAN  *(cœur de mission)*

**Verdict** : la conviction de l'Architecte est confirmée ET dépassée. Il y a **au moins 8 mécanismes de stockage/projection de faits** dans le code (pas 4), + les BIB_* qui sont **doctrine pure (zéro code)**. Trois familles, plusieurs ères. Le seul canon narratif **réellement consommé par du code package aujourd'hui** est `canon-kernel` via le tout récent `book-factory` ; tout `gateway/` est certifié-dormant (ORPHAN — vérifié V1).

## Tableau de tête
| Ère | Mécanisme | Famille | Statut |
|---|---|---|---|
| Phase 7 (gateway) | `gateway/src/gates/canon_engine.ts` | Canon narratif (FactType) | certifié, **ORPHAN** |
| Phase 10 (gateway) | `gateway/.../memory_layer_nasa/` | World Model / mémoire | certifié, **ORPHAN** (doc dit ACTIF) |
| Phase E/F (src) | `src/canon/` + `src/gates/` | Canon claims+lignée + truth-gate | **LIVE** (couche test) |
| Phase 18/20 (racine) | `OMEGA_PHASE18/20*` | canon-store + memory-service | **SNAPSHOT/ORPHAN** |
| Packages (LIVE) | `packages/canon-kernel/` | Primitive double-rail + PROMOTE | **LIVE** |
| Packages (LIVE) | `packages/genesis-planner` Canon | Canon statique immuable | **LIVE mais statique** |
| Packages (LIVE) | `packages/contracts-canon/` | Canon de GOUVERNANCE (≠ narratif) | **LIVE** |
| Packages (NEW) | `packages/book-factory/` | Bible mutable = projection + épistémique | **DRAFT non câblé** |

---

## 1. `packages/canon-kernel/` — double-rail truth/interpretation + PROMOTE
- **Path** : barrel `src/index.ts:9-19` ; `RailType='truth'|'interpretation'` `types/transactions.ts:10` ; `OpType` incl. `'PROMOTE'` (« Interpretation → Truth rail ») `operations.ts:9-18` ; `createCanonTx` transactions.ts:40 ; `createCanonOp` operations.ts:32 ; `canonicalize` canonicalize.ts:27 ; `sha256` sha256.ts:13 ; `GENESIS_HASH` chain.ts:32.
- **Fonction réelle** : primitive **données/typage** déterministe pour un canon double-rail. NE fold PAS d'état et N'enforce PAS PROMOTE lui-même — l'enforcement vit dans le consommateur (`book-canon-adapter`) + `@omega/truth-gate`.
- **Callers** : `@omega/canon-kernel` importé par `book-factory/src/book-canon-adapter.ts:25-38` & `story-state.ts:17`. PAS par sovereign-engine/creation-pipeline/scribe.
- **Tests** : `tests/{canonicalize,chain,id,txview}.test.ts` (4).
- **Statut** : **ACTIVE_RUNTIME** (primitive). SoT du chemin neuf. Ré-architecture propre de `gateway/canon_engine` (rails+evidence vs FactType plat).

## 2. `gateway/src/gates/canon_engine.ts` — FactType (« Bible de Francky »)
- **Path** : 407 l. Types `gateway/src/gates/types.ts:72-110`. `FactType = CHARACTER|LOCATION|EVENT|RULE|RELATIONSHIP|STATE` (types.ts:72-78). `CanonFact{id,type,subject,predicate,object?,establishedAt(chapter),confidence,proofHash}` (types.ts:80-99).
- **Fonction** : Bible mutable **append-only**. `create/addFact/hasFact/findBySubject/findByType/checkConflict/computeHash/verify/lock`. Conflit = **table d'antonymes hardcodée** (`vivant/mort`, `ami/ennemi`…) canon_engine.ts:351-360. Hash = `simpleHash` non-crypto « à remplacer par SHA256 en production » canon_engine.ts:161-171. Invariants INV-CANON-01..05.
- **Callers** : SEULEMENT `gates/index.ts:9-10` (barrel) + `tests/canon_engine.test.ts`. **0 caller prod** → `nexus/proof/NCR_CANON_ENGINE_JUNCTION_ORPHAN.md` (NCR existante).
- **Statut** : **ORPHAN** (certifié, dormant ; ~30 tests CNC-201).

## 3. `src/canon/` — claims + lignée (CANON_SCHEMA_SPEC v1.2)
- **Path** : 14 fichiers. `DefaultCanonAPI.createClaim` Guard→Write→Receipt (canon-api.ts:125, INV-E-PIPELINE-01) ; `hashCanonical` :243 ; supersession :266-278. `CanonClaim{subject,predicate,value,version,lineage,evidence,status,prevHash,hash}` ; `ClaimStatus=ACTIVE/SUPERSEDED/DISPUTED`. Catalogue de prédicats **fermé/versionné/hashé** predicate-catalog.ts:5-13,63. Lignée hash-chain `verifyLineageChain` index.ts:108-121.
- **Callers** : `src/gates/fact-classifier.ts:15` (`validatePredicate`) ; tests/canon/* (12) + tests/gates/*. Copie dupliquée `deposit/confidential/src_code/canon/`.
- **Statut** : **LIVE (spec-impl, couche test)** — le modèle le plus riche (lignée + DISPUTED + supersession) mais confiné à `src/gates`.

### Bonus — `src/gates/` (F-pipeline truth gate, PAS un store)
`fact-extractor`(F2)→`fact-classifier`(F3, `FACT_STRICT/DERIVED/NON_FACTUAL`)→`canon-matcher`(F4)→`verdict-engine`(F5)→`proof-manifest`(F6)→`quarantine`(F7). Surface de fact-checking distincte du `FactType` gateway. **LIVE (couche validation).**

## 4. `packages/genesis-planner/` — Canon STATIQUE
- **Path** : `Canon` type `src/types.ts` ; `validateCanon` `src/validators/canon-validator.ts:11` (G-INV-01 « no plan without validated inputs ») ; catégories `character|world|event|rule|relationship` :9.
- **Fonction** : canon d'**entrée immuable** pour planifier UNE œuvre. Valide, ne stocke pas de mutations. **LIVE mais statique.**

## 5. `gateway/src/memory/memory_layer_nasa/` — « [ACTIF — World Model] »
- **Path** : 38 fichiers. Doc vérifié : `docs/OMEGA_CARTE_REPO_v1.md:112` = `memory/ [ACTIF — World Model]`.
- **Fonction réelle** : store mémoire **append-only versionné + moteur de requête** = hybride de tous les verbes : **store** (memory_store, hash-chain, mutex) + **engine** (memory_engine `MemoryEngine = Store+Index+QueryEngine`, « aucune mutation cachée », :21-25 ; `EngineRecord` provenance+previous_hash :59-65 ; INV-MEM-01..08) + **digest** (memory_digest + memory_digest_writer) + **snapshot** (crash-safe) + **tiering/decay** (memory_tiering hot/warm/cold, memory_decay) + **hybrid** + **query/index/hash** (sha256+Merkle). C'est un vrai substrat World-Model.
- **Callers** : `memory_layer_nasa|MemoryEngine` ne matche que 4 fichiers, tous internes. **0 caller externe (V1).** Offload (tiering/decay/digest/hybrid) **non exporté par index.ts (V2).**
- **Statut** : **ORPHAN/dormant.** ⚠ **doc dit ACTIF, code dit ORPHAN** (CONTRADICTED — `00_SOURCE_PRIORITY.md` conflit 1). Cert `MEMORY_LAYER_CERTIFICATION.md`, ~14 tests.

## 6. BIB_WORLD / BIB_CHARACTER / BIB_STYLE / BIB_PLOT
- **Trouvé UNIQUEMENT en doc** : `docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-3-3.md:1384` (+ v1-3, v1-3-1) + `BOOK_EXISTING_MODULES_INVENTORY_v1.md:17,40`.
- **Citation littérale (Codex C4, :1384)** : `C4 4 bibliothèques BIB_WORLD/CHARACTER/STYLE/PLOT statut explicite (PRÉSENTE/PARTIELLE/PRÉVUE/SIMULÉE)`.
- **Fonction/statut** : amendement **C4** (ChatGPT/Plan Max v3). C'est une **exigence de documentation** (chaque BIB_ doit porter un label de statut), **PAS un module**. Le Codex n'**assigne** pas de statut concret.
- **Implémenté ?** : **NON. Zéro `.ts/.js/.py`** (vérifié V4 — seule occurrence = la ligne Codex). Aucun symbole/fichier/store `BIB_*`.
- **Statut** : **SPEC_ONLY / doctrine** pour les 4. Substrats les plus proches : BIB_WORLD/CHARACTER ≈ World Model gateway + canon (dormant) ; BIB_STYLE ≈ scoring/scribe ; BIB_PLOT ≈ payoff_graph de story-state. Aucun n'est un store nommé BIB_.

## 7. Autres stores trouvés (hors liste initiale)
- **7a `packages/contracts-canon/`** — Canon de **GOUVERNANCE** (`index.ts:5` « source of truth for interface contracts » : InvariantContract, ModuleContract, ContractRegistry). **PAS narratif.** **LIVE.** (À ne pas confondre — partage le mot « canon ».)
- **7b `packages/book-factory/`** — la **nouvelle Bible mutable (projection) + couche épistémique** :
  - `book-canon-adapter.ts` = le vrai enforcer rails+PROMOTE (épistémique L1-L6 : knows=JTB `knows()`, isLie/isBluff/dramaticIrony comme relations) :80-319.
  - `story-state.ts` = Bible mutable **PROJECTION** (event-sourcing) « truth = append-only event log, StoryState = PURE FOLD » :1-15 ; Characters/Places/Threads/`payoff_graph`(planted/reinforced/bloomed/OVERDUE)/timeline ; `state_hash` déterministe.
  - **46 tests**. Câblé : interne seulement (orchestrator, context-manager, dry-run, demo). **Non câblé à sovereign/creation.** **DRAFT (untracked `??`).**
- **7c `OMEGA_PHASE18_MEMORY/src/canon/canon-store.ts`** — « CANON = source de vérité absolue » :6 ; Fact/FactType/FactSource/FactStatus/Confidence/Conflict + snapshots/diffs/audit/Merkle. Callers = ses tests. **SNAPSHOT/ORPHAN.**
- **7d `OMEGA_PHASE20_INTEGRATION/src/canon-store.ts` + `memory-service.ts`** — « based on Phase 18 CANON_CORE » :1-7. **SNAPSHOT/ORPHAN.**
- **7e `OMEGA_PHASE20_1_MEMORY_HOOK/`** — hook persistance start/shutdown. **SNAPSHOT/ORPHAN.**
- **7f `gateway/src/gates/ripple_engine.ts`** — projecteur de faits (propagation conséquences, « ne peut contredire le canon », écrit digests). **ORPHAN.**

## Carte source-de-vérité vs projection
**Canons narratifs (≥4 confirmés)** : (1) gateway/canon_engine ORPHAN ; (2) src/canon LIVE-test ; (3) canon-kernel+book-factory **LIVE (SoT chemin neuf)** ; (4) genesis-planner statique ; (5) PHASE18 ORPHAN ; (6) PHASE20 ORPHAN.
**World Model (1)** : memory_layer_nasa — doc ACTIF / code ORPHAN.
**Gouvernance** : contracts-canon (≠ narratif).
**BIB_*** : SPEC_ONLY.

**Qui fait foi maintenant** : seul `canon-kernel` (via book-factory) est consommé par du code package. Tout gateway + PHASE18/20 = certifié-dormant (V1 + NCR existante). La décision `CANON_TRUTH_CONSOLIDATION_DECISION.md:9-16` (canon-kernel = épine unique) est **cohérente avec le code**.

## NOT_FOUND honnêtes
- Aucune classe `WorldModel`, `StoryBible`, ni symbole `BIB_*` (cherché tous `.ts` : `world.?model|story.?bible|ground.?truth|canonical.?fact|fact.?store` → matches = stores déjà couverts, contracts-canon gouvernance, ou pipeline fact-checking).
- « Matrice quantique croyance/mensonge/rêve » signalée non confirmée par l'inventaire lui-même (§4 NON CONFIRMÉ) — non re-cherchée ici (hors 7 cibles).
