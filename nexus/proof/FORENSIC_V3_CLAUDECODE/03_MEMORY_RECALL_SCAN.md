# 03 — MEMORY / RECALL SCAN  *(cœur de mission)*

Tout mécanisme de rappel/injection de contexte borné + qui l'appelle. Rappel : aucun ne déclenche sur mention de nom (voir `03_ENTITY_MARKERS_SCAN.md`) ; tous sont **dirigés par plan/état**.

## B.1 `context-manager.ts` — digest borné ≤600 mots (CÂBLÉ)
- **Path** : `packages/book-factory/src/context-manager.ts:15-39`.
- **Littéral** : :18,28 injecte **tous** les persos vivants : `state.characters.filter(c => c.status !== 'dead')` → `Personnages présents (vivants) : ${alive.join(', ')}`.
- **Fonction** : projection déterministe non-LLM de `StoryState` + `ChapterSpec` → digest ≤600 mots (persos vivants/morts, threads ouverts, 5 derniers events, seeds à planter/récolter). C'est l'injecteur borné qui résout le mur VRAM.
- **Auto-recall-sur-mention ?** **NON — PREUVE** : il déverse *chaque* perso vivant inconditionnellement (:18,28), il ne s'indexe PAS sur les noms présents dans la prose. Rappel dirigé plan/état.
- **Callers** : `book-orchestrator.ts:16,78` (`buildContextDigest(current, spec, plan, book)`). **CÂBLÉ** (boucle démo).
- **Tests** : via `book-orchestrator.test.ts` (pas de test dédié). **Statut** : ACTIVE (boucle book-factory, grade bench/démo).

## B.2 `continuity-oracle.ts` — gate inter-chapitre (dont garde LEAK/recall)
- **Path** : `packages/book-factory/src/continuity-oracle.ts:37-94`.
- **Fonction** : gate PASS/RETRY : CHRONO, DEAD_ACTS, LEAK, REQUIREMENT, OVERDUE. LEAK :64-71 appelle `adapter.knows(...)` — seul endroit où le rappel nourrit une décision — **mais seulement si `adapter` fourni**.
- **Callers** : `book-orchestrator.ts:71` appelle `checkContinuity(current, delta, spec)` — **sans argument adapter**, donc LEAK inerte en prod. `dry-run.ts:66` l'appelle **avec** l'adapter. **CÂBLÉ (oracle)** / **BENCH_ONLY (branche épistémique).**
- **Tests** : `continuity-oracle.test.ts`.

## B.3 `book-orchestrator.ts` — la vraie boucle de génération
- **Path** : `packages/book-factory/src/book-orchestrator.ts:54-102`.
- **Fonction** : par chapitre : delta planifié → `checkContinuity` → sur PASS digest → `chapterSpecToIntent` → generator (Ollama gemma4:31b ou déterministe) → append events → `previousTail = prose.slice(-180)` :86 (continuité locale).
- **Rappel câblé ?** Seulement `buildContextDigest` (état→digest) + tail 180 chars. **PAS de `BookCanonAdapter`** (V3). Donc la boucle prod a injection-contexte bornée mais **aucun rappel JTB/connaissance, aucun déclenchement sur mention.**
- **Callers** : `generate-real-demo.ts:12,47`. **Statut** : ACTIVE (démo/bench). Package `private 0.0.1`.

## B.4 `gateway/.../memory_layer_nasa/*` — store mémoire NASA (ORPHAN)
- **Paths** : `memory_query.ts` (`QueryEngine` pur, INV-MEM-02/08/10, requête par `key`/`version` :35-62, **pas de rappel par nom**), `memory_digest_writer.ts:44-115` (`writeDigest`/`createAndWriteDigest`, source forcée `"RIPPLE_ENGINE"`), `memory_snapshot.ts:48` (`SnapshotManager` par `snapshot_id`), `index.ts:1-227` (API publique).
- **Fonction** : store append-only hash-chain snapshot-able + requêtes déterministes + digests. Récupération générique key/version — **aucune sémantique entité, aucun trigger mention.**
- **Callers** : grep `memory_layer_nasa|memory_query|memory_digest_writer|writeDigest|SnapshotManager` → matches **seulement dans le package + docs**. `gateway.ts`/`orchestrator.ts` ne l'importent pas. → **0 CALLER RUNTIME (V1).** Note : `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md:70` + `BOOK_FACTORY_ADAPTER_STRATEGY.md` *proposent* de réutiliser ce pattern via un adapter, mais **aucun tel adapter n'existe en code**.
- **Tests** : extensifs in-package. **Statut** : **ORPHAN** (cert `MEMORY_LAYER_CERTIFICATION.md`, non câblé).

## B.5 `packages/search/`
- Non importé par book-factory ni par les chemins mémoire ci-dessus ; aucun rappel par mention. Pas un mécanisme de rappel perso. (Aucun hit le liant au rappel d'entité.)

---

## Carte rappel (qui injecte quoi, câblé ?)
| Mécanisme | Type de rappel | Déclencheur | Câblé ? | Statut |
|---|---|---|---|---|
| `context-manager.buildContextDigest` | digest borné ≤600 mots | **plan + état** (tous persos vivants) | OUI (book-orchestrator) | DRAFT vivant |
| `book-orchestrator previousTail` | 180 derniers chars | séquentiel | OUI | DRAFT vivant |
| `continuity-oracle LEAK + adapter.knows` | rappel épistémique | appel explicite | seulement dry-run | BENCH_ONLY |
| `memory_layer_nasa query/digest/snapshot` | key/version | requête programmatique | NON (V1) | ORPHAN |
| auto-recall sur mention | — | mention de nom | **n'existe pas** (V3,V6) | NOT_FOUND |

**Net** : la réalité câblée = **injecteur de contexte borné dirigé plan/état** (context-manager + story-state + continuity-oracle) dans un orchestrateur démo, + un **ledger épistémique JTB bench-only** (book-canon-adapter). Le rappel par mention et le store NASA capable de le porter sont respectivement **inexistant** et **orphelin**.
