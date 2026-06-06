# 03 — SUB-AGENTS / LIBRARIES / DORMANT OFFLOAD SCAN  *(cœur de mission)*

Concept Architecte : « la Bible distribuée en BIBLIOTHÈQUES multiples avec SOUS-AGENTS répondant aux appels + AGENTS DORMANTS de délestage/compression (vitesse + Bible jamais lourde) ».

**Verdict global** : la vision est **CODÉE EN PIÈCES MAIS NON ASSEMBLÉE**. Trois régions de code disjointes, construites à des époques différentes, **non câblées entre elles** :
1. Un **substrat mémoire NASA** (`gateway/.../memory_layer_nasa`) implémentant tiering hot/cold + decay + digest-compression = le « délestage/compression » littéral. **CODÉ + testé, mais ORPHAN.**
2. Une **book-factory** réalisant fonctionnellement « Bible bornée + rappel sélectif » (story-state + context-manager = RAG interne). **CODÉ + testé, mais package isolé sans appelant externe.**
3. Une **stack dispatcher/registry/router + worker-manager** = le plus proche de « sous-agents qui répondent aux appels ». **CODÉ + testé.**

Il n'existe **AUCUN** « agent dormant qui se réveille sur appel » (daemon), et **AUCUNE** fédération multi-bibliothèques. Le « délestage dormant » existe seulement comme **démotion tiering→COLD** (donnée qui refroidit), pas comme *agent* qui dort.

---

## 1. SUBSTRAT DÉLESTAGE/COMPRESSION — `memory_layer_nasa` (CODÉ, ORPHAN)

### 1a. Tiering hot/cold — `memory_tiering.ts`
- `computeTieringActions(...)` **:151-286** = le moteur de délestage. Promotion à l'accès (`COLD→WARM→HOT` :226-249) et démotion à l'âge (`HOT→WARM→COLD` :253-277) via MetaEvents append-only `TIER_CHANGED`. Rate-limited (:184), cooldown (:194), anti-loop (:164-165). `applyTieringActions` :299-327 ; `logAccess` :340-368 (signal « chaleur »).
- = exactement la soupape « hot reste rapide / cold délesté en long-terme ».
- **Callers** : `memory_hybrid.ts` consomme `getEffectiveTier` ; `splitHybridView` :113-130 sépare shortTerm(HOT/WARM) vs longTerm(COLD). Mais `computeTieringActions` lui-même : **0 caller hors `memory_tiering.test.ts`**. **Non ré-exporté par `index.ts` (V2).**
- **Statut** : **CODÉ, TEST-ONLY, ORPHAN.**

### 1b. Decay (dormance de donnée) — `memory_decay.ts`
- `projectDecayState(...)` :49-93 fold `DECAY_MARKED`/`DECAY_COMPLETED` → `ACTIVE|DECAYING|DECAYED`. `DecayManager` :104-321 (`markDecay`:127, `completeDecay`:160, `getDecayedEntries`:239). Non destructif (« entries never deleted » :7).
- = le seul truc qui ressemble à « dormant » : la donnée devient dormante mais **jamais évincée**. **Donnée dormante, pas agent dormant.**
- **Callers** : aucun hors test. Pas dans `index.ts`. **ORPHAN.**

### 1c. Compression/digest — `memory_digest.ts`
- `buildDigestPayload(...)` :165-209 collapse N entrées en un `DIGEST_CHUNK` (`payload_type=DIGEST_CHUNK` :32) via `DigestRule.apply` pure :52-62. Traçable (source id/version/hash :185-191), `verifyDigestIntegrity` :251-267.
- = « compression pour que la Bible reste légère ».
- **Callers** : aucun hors test + `memory_digest_writer.ts` (frère). Pas dans `index.ts`. **ORPHAN.**

### 1d. Façade ST/LT — `memory_hybrid.ts`
- `MemoryHybrid` :148-326 (`getGlobalHybridView`:262, `getEntriesByTier`:290). Consomme 1a. **ORPHAN.**

### 1e. Engine exporté — `memory_engine.ts`
- `MemoryEngine` :147-515 = store versionné append-only + Merkle + query-via-snapshot. **EXPORTÉ** (`index.ts:219-226). Mais **AUCUN hook tiering/decay/digest** → le memory layer *exporté* ne contient PAS le délestage/compression ; ces fichiers sont à côté, non exportés, non appelés.

> **Verdict région 1** : substrat délestage/compression/tiering/decay **PROUVÉ-CODÉ** (`memory_{tiering,decay,digest,hybrid}.ts`) avec tests complets, mais **ORPHAN / non câblé** (0 caller prod, exclu du `index.ts`). Capacité scellée que rien ne consomme.

---

## 2. BIBLE BORNÉE + RAPPEL SÉLECTIF — `packages/book-factory/` (CODÉ, isolé)

Réalisation *fonctionnelle* de « Bible + jamais lourde », construite 2026-06-05 (code le + récent).

- **2a `story-state.ts`** — :3 « the mutable 'Bible' as a PROJECTION ». `projectStoryState(events)` :72-158 (fold pur). `StoryStateLog` :161-176 (`append`/`project`/`snapshot` :168). `state_hash` via canon-kernel :156.
- **2b `context-manager.ts`** — :1-8 « Builds the BOUNDED context digest (≤ ~600 words)… so the LLM never sees the whole book (VRAM wall) ». `MAX_WORDS=600` :13. `buildContextDigest(...)` :15-39 = projette seulement la tranche pertinente (persos vivants, threads ouverts, 5 derniers events, seeds à planter/récolter), tronqué 600 mots. = exactement « délestage/jamais lourde / rappel à la demande borné ».
- **2c `book-orchestrator.ts`** — `generateBook(...)` :54-102 (boucle par chapitre : checkContinuity → buildContextDigest → chapterSpecToIntent → generator.generate → append events). Dispatcher-sur-pipelines (appelle planner, continuity-oracle, context-manager, generator). Le + proche de « sous-agents répondant aux appels », **mais ce sont des appels de fonctions, pas des agents autonomes/dormants.**
- **Tests** : story-state, book-orchestrator, continuity-oracle, book-planner, dry-run, epistemic-probe (6 fichiers).
- **Callers** : référencé **uniquement dans son propre package**. **0 caller runtime externe.**
- **Design** : `BOOK_FACTORY_ARCHITECTURE.md:50` « mémoire externe structurée injectée sélectivement = pattern « RAG interne / bible » » ; bannière :3 « CONCEPTION (doc-only) ».
- **Statut** : **PROUVÉ-CODÉ** (impl+tests), mais **DRAFT/ISOLÉ.**

---

## 3. SOUS-AGENTS RÉPONDEURS — dispatcher/registry/router/worker (CODÉ)

- **3a `integration-nexus-dep/src/router/`** : `Dispatcher.execute(request)` :135 cherche un handler par `request.type` :146 et l'invoque à la demande (timeout 30s :41,208-227) ; `OperationRegistry` register/get/has/list :76-155 (**catalogue de répondeurs**) ; `getDefaultRegistry()` lazy-init :178-183 (≈ « se réveille au 1er appel ») ; `createDefaultRouter` :208-268 pré-enregistre `ANALYZE_TEXT/VALIDATE_INPUT/BUILD_DNA` (adapters Genome/Mycelium). = « sous-agents répondant aux appels » = handlers d'opération invoqués par type. **Pas de sommeil/éviction de handlers.** Tests : 8 fichiers. **CODÉ, DORMANT.** (observability `emitEvent` = stub silencieux :27-29.)
- **3b `OMEGA_PHASE14/ipc/worker_manager.ts`** : `WorkerManager extends EventEmitter` :23 spawn child process (:13), state machine `STOPPED→…→READY/RUNNING` :60-72, `canAcceptRequests` :84-86, `isAlive` :77-79. Vrai worker/daemon. **CODÉ mais SNAPSHOT/legacy** (phase-14, v3.14.0).
- **3c `packages/performance/src/pool.ts`** : `ObjectPool<T>` :17 (acquire/release). Pooling générique d'objets, **pas** d'agents. Hors concept.
- **3d `sovereign-engine/src/dedale/reset-session.ts`** : `spawnAndProbe(...)` :388-543 spawn **détaché** `ollama serve` (`detached:true`, `unref()` :416-425) + probe `/api/tags` backoff jusqu'à READY :474-526 ; `createResetSession` :609-782 kill→respawn. = **seul mécanisme dormant→wake littéral**, mais gère le **process backend Ollama**, pas un « sous-agent de la Bible ». **CODÉ, ACTIF.**

---

## 4. BIBLIOTHÈQUES / CATALOGUES / REGISTRES (CODÉ, single pas « multiple »)
- `signal-registry/src/registry.ts:15-180` `OMEGA_SIGNAL_REGISTRY` (catalogue immuable de signaux, « not in registry → DOES NOT EXIST » :11-14). **CODÉ, ACTIF (SSOT signaux).** Une seule bibliothèque statique, pas « multiples fédérées ».
- `integration-nexus-dep/.../registry.ts` `OperationRegistry` (cf 3a).
- **NOT_FOUND** : aucune fédération « multiple libraries », namespacing `BIB_*`, ni bibliothécaire routant entre plusieurs stores. Cherché `packages/**, gateway/**, src/**, docs/**` `librarian|bibliothèque|BIB_|multiple librar` → seulement prose de design.

---

## 5. CHERCHÉ-ET-ABSENT
- **« Agent dormant qui se réveille sur appel »** : **NOT_FOUND en code.** Cherché `**/*.ts` `dormant|sleeping agent|wake.*agent|lazy.*agent|idle.*agent`. Seuls hits : data-decay (1b, donnée dormante), daemon Ollama (3d, process backend), types `Lazy` dans performance (valeurs lazy). Concept en prose seulement (`docs/research/*`, `docs/architecture/book-factory/*`).
- **Swarm / essaim / pool multi-agents** : **NOT_FOUND.** Pas de classe `swarm`/`essaim`/`agent-pool`. mycelium/mycelium-bio = code validation/morphologie, pas agents.
- **RAG / RecallPack / knowledge-pack nommé** : **NOT_FOUND par ce nom.** Le RAG-interne *fonctionnel* = `book-factory/context-manager.ts` (2b) seulement. Pas de vector store / retrieval embeddings pour chargement contexte (les embedders sovereign-engine servent au scoring, pas au rappel mémoire).

---

## TABLEAU DE SYNTHÈSE
| Concept Architecte (par fonction) | Statut | Où (path:line) |
|---|---|---|
| **Bibliothèques multiples / catalogues fédérés** | **DESIGN-ONLY / partiel** | Code : catalogues uniques `signal-registry/registry.ts:15-180`, `nexus-dep/router/registry.ts:76-155`. Fédération **ABSENTE** |
| **Sous-agents répondant aux appels** | **PROUVÉ-CODÉ** (dispatch handlers, pas agents autonomes) | `nexus-dep/dispatcher.ts:135`, `registry.ts:76-155`, `router.ts:208-268` ; worker `OMEGA_PHASE14/worker_manager.ts:23` (SNAPSHOT) |
| **Agents dormants (sommeil, wake)** | **ABSENT comme agent ; CODÉ comme donnée dormante / daemon backend** | Donnée : `memory_decay.ts:49-321` (ORPHAN). Wake-daemon : `dedale/reset-session.ts:388-543` (Ollama) |
| **Délestage (hot→cold, evict, spill)** | **PROUVÉ-CODÉ mais ORPHAN** | `memory_tiering.ts:151-286`, `memory_hybrid.ts:113-130` ; non exporté `index.ts` (V2) |
| **Compression/digest** | **PROUVÉ-CODÉ, 2 impl** | (a) ORPHAN `memory_digest.ts:165-209` ; (b) vivant `book-factory/context-manager.ts:15-39` (≤600 mots) |
| **Bible = mémoire structurée bornée** | **PROUVÉ-CODÉ, package isolé** | `book-factory/story-state.ts:72-176`, orchestré `book-orchestrator.ts:54-102` |
| **Chargement contexte à la demande (rappel sélectif)** | **PROUVÉ-CODÉ** | `book-factory/context-manager.ts:15-39` consommé `book-orchestrator.ts:78` |

**Bottom line** : substrat de délestage/compression (`memory_layer_nasa`) = entièrement bâti et testé, mais **orphelin** (0 caller, pas même exporté de son propre index.ts). « Bible bornée + rappel sélectif » = `book-factory`, bâti+testé, mais **package isolé sans câblage**. Sous-agents répondeurs = dispatcher/registry/router testé. **Pas de dormant-agent / swarm / fédération multi-bibliothèques en code.**
