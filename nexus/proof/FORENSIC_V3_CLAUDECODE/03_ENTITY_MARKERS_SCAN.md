# 03 — ENTITY MARKERS SCAN  *(cœur de mission)*

Concept Architecte : « chaque mention d'un nom porte un MARQUEUR UNIQUE qui rappelle AUTOMATIQUEMENT tout ce qui concerne l'entité — la Bible ne peut pas oublier d'être consultée. »

## VERDICTS (en tête)
1. **Système d'identité d'entité stable** : **PARTIEL / FAIBLE-OUI.** Identité = hash déterministe d'une **chaîne sujet**, pas un UUID porté par chaque mention. Pas de table d'alias.
2. **Auto-recall sur mention** : **NOT_FOUND en code** (vérifié V3, V6). « La Bible ne peut pas oublier d'être consultée » = **NON réalisé** : dans la boucle réelle l'adaptateur épistémique n'est même jamais construit.
3. **Documenté/décidé** : SPEC `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md` (doc-only) + PROPOSED `DEC-20260606-021` (Double-Bible/diff) + inventaire qui dit lui-même « auto-recall absent, À AJOUTER ».

---

## A.1 `BookCanonAdapter` — ledger épistémique clé `actor` + `subject.predicate`
- **Path** : `packages/book-factory/src/book-canon-adapter.ts:80-319`.
- **Identité** : `private entityId(subject)` → `createDeterministicId('ent', SEED, NAMESPACE, {name: subject})` :112-114. Chaque chaîne sujet → un `EntityId` canon-kernel déterministe. Entrées clé `` `${subject}.${predicate}` `` :72,133.
- **Fonction** : ledger de croyances double-rail. `knows(actor,subject,predicate)` = test JTB :242-247 ; `isLie`/`isBluff`/`isMistake`/`dramaticIrony` = relations cross-rail :285-318.
- **Identité stable ?** PARTIEL. Hash d'une **chaîne sujet**, pas UUID par mention. Pas de table d'alias (`"maire"` ≠ `"le_maire"`).
- **Auto-recall-sur-mention ?** **NON.** Rien ne scanne la prose pour un nom afin de tirer le dossier. Rappel = appel programmatique explicite `adapter.knows(...)`. Grep `mention|appears|includes|match|prose.*name` dans `book-factory/src` → **No matches**.
- **Callers** : `continuity-oracle.ts:65-71` (LEAK, seulement si `adapter` passé) + `dry-run.ts:34-87` (bench). **PAS** dans `book-orchestrator.ts` (vérifié V3 : grep `BookCanonAdapter|adapter|knows|reveals` → No matches). → dans la boucle réelle, ledger **jamais câblé**.
- **Tests** : `epistemic-probe.test.ts` (+ continuity-oracle). **Statut** : **BENCH_ONLY / PARTIELLEMENT-ORPHAN.**

## A.2 `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md` — design « la Bible ne peut oublier »
- **Path** : `docs/architecture/book-factory/CHARACTER_KNOWLEDGE_GRAPH_SPEC.md:1-95`.
- **Littéral** : :3 « **Statut : SPEC DESIGN (doc-only, ZÉRO code)** » ; :32 « Schéma (design illustratif, NON implémenté) » ; :94 « design seulement. Implémentation P1 après GO Architecte ».
- **Fonction spécifiée** : `CharacterKnowledgeGraph` persistant par perso (`character_id = EntityId canon-kernel`, `KnowledgeEdge`, `reader_knowledge`, `learned_in_chapter`, `evidence_refs`). :83 = le + proche d'« auto-recall sur mention » : « le claim planté ch2 reste sur le rail … `context-manager` le réinjecte à la récolte » — mais c'est **réinjection par chapitre dirigée par le plan**, pas déclenchée par mention.
- **Code vs spec** : types `EpistemicStatus/KnowledgeEdge/CharacterKnowledgeGraph` **NON implémentés**. Les rails sous-jacents (truth/interpretation, PROMOTE, knows) **SONT** implémentés dans book-canon-adapter. La couche graphe par-dessus = **SPEC_ONLY**.

## A.3 `story-state.ts` — la « Bible » structurelle (projection)
- **Path** : `packages/book-factory/src/story-state.ts:41-176`.
- **Identité** : `Character.id` (string), via events `CHARACTER_INTRODUCE` :53,95. `touch(id,…)` clé une Map par `id` :82-90. Stable par-`id`, mais **aucun marqueur porté par les mentions textuelles**, pas d'alias, pas d'UUID par mention.
- **Auto-recall-sur-mention ?** **NON.** État construit depuis events planifiés, pas depuis un scan de prose. `payoff_graph` :34-37,124-131 = mécanisme indice ch2→ch25 (seed→bloom).
- **Callers** : `book-orchestrator.ts:13,60,69,85`, continuity-oracle, dry-run. **CÂBLÉ** dans la boucle book-factory.
- **Statut** : ACTIVE dans la boucle bench/démo book-factory (package `private`, `0.0.1`).

## A.4 `mycelium-bio` gematria/merkle — PAS un système de marqueurs
- **Path** : `gematria.ts:28` (`computeGematria` A=1..Z=26), `merkle.ts` (`computeMerkleRoot`), `dna_builder.ts`, `index.ts:144-184`.
- **Fonction** : empreinte ADN émotionnelle d'un **livre entier** (Plutchik, L-system, merkle sur nœuds émotionnels). Gematria = poids numérique de mots pour épaisseur de branche.
- **Marqueurs d'entité / auto-recall ?** **NON.** Pas d'identité par perso, pas de rappel sur mention. **FROZEN/SEALED** (cert v1.0.0). Hors concept.

## CHERCHÉ-ET-NOT_FOUND (grep repo, insensible casse)
`auto-recall/auto_recall/autoRecall` (V6), `remontée`, `lore-coding/lore_cod/loreCod`, `entity_registry/entityRegistry`, `character_registry/characterRegistry`, `alias resolution`, `mention…trigger` → **0 hit code** (seulement prose doc/corpus). Pas de « K2 lore-coding L3 » en code ; K2 apparaît seulement dans `DEC-...-021` comme « K2 chunking » (segmentation, :37/51), sans rapport avec le lore.

---

## SYNTHÈSE
- **Identité stable** : la seule réalité = `EntityId` déterministe d'une chaîne sujet (`book-canon-adapter.ts:112-114`) + `Character.id` stable dans story-state. **Ni marqueur-par-mention, ni UUID-par-mention, ni résolution d'alias.** Le graphe perso riche = SPEC_ONLY.
- **Auto-recall sur mention** : **inexistant en code.** Le + proche est **dirigé par plan/état** (context-manager :18,28 injecte *tous* les persos vivants inconditionnellement ; continuity-oracle :64-71 appelle `adapter.knows()` mais seulement si adapter fourni — et la boucle prod n'en fournit aucun).
- **Où c'est conçu** : `CHARACTER_KNOWLEDGE_GRAPH_SPEC.md` (SPEC) ; `DEC-20260606-021-SCRIBE-R6-WRITER-LOOP.md` §5 :115-135 (Bible-RÉELLE vs Bible-EXTRAITE + diff `MapProjection`, « ZÉRO code avant GO ») ; `BOOK_EXISTING_MODULES_INVENTORY_v1.md:48` (« Index mention→rappel (auto-recall sur citation) … absents. À AJOUTER »).
- ⚠ Une écriture plus poussée « Recall Bus / RecallPack / ADR R2 » apparaît comme **nom de fichier** dans `FORENSIC_V3_COWORK/` (vu en grep, **NON lu** — indépendance). Signalé à l'Architecte ; non utilisé comme preuve ici.

**Net** : « marqueur unique par mention avec rappel automatique » = **CONÇU (SPEC/PROPOSED), NON CODÉ.** Le substrat NASA qui pourrait le porter (memory_layer_nasa) est **orphelin**.
