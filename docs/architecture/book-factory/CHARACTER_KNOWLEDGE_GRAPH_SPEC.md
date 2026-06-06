# CHARACTER KNOWLEDGE GRAPH — Spec (le seul vrai neuf de la couche épistémique)

**Date** : 2026-06-05 · **Statut** : SPEC DESIGN (doc-only, ZÉRO code) · **Standard** : NASA-Grade L4
**Rôle** : étendre l'asymétrie d'information **par-scène** existante (`genesis-planner` Subtext) vers un **graphe de connaissance PERSISTANT par personnage à l'échelle du livre**. C'est la **seule** brique réellement neuve de la couche épistémique (tout le reste = ADAPT/réveil, cf `CANON_TRUTH_CONSOLIDATION_DECISION.md`).

---

## 1. Pourquoi neuf (et pourquoi mince)
**Existe déjà (WIRED)** : `genesis-planner/src/types.ts:91-106` — `SubtextLayer { character_thinks, reader_knows, tension_type, implied_emotion }` + `Beat { information_revealed[], information_withheld[] }` + `SubtextTensionType = dramatic_irony|hidden_motive|…`. **Limite** : par-scène, strings, non cumulé.
**Manque** : « qui sait quoi, depuis quel chapitre, et est-ce vrai ? » **persistant** sur 30 chapitres. Sans ça : pas d'ironie dramatique longue, pas de mensonge tenu, pas de révélation maîtrisée (cœur du polar/thriller).
**Mince car** : ce n'est **pas** un nouveau canon — c'est une **vue attribuée** au-dessus des **rails canon-kernel existants** (réutilisation, pas réinvention).

---

## 2. Le principe clé : réutiliser les rails (zéro nouveau canon)
La couche épistémique se mappe **directement** sur l'existant prouvé (284/284 tests verts) :

| Notion narrative | Mécanisme OMEGA existant réutilisé |
|---|---|
| **Fait objectif** (ce qui est vrai) | Claim sur le **rail `truth`** (`canon-kernel`) |
| **Croyance d'un personnage** | Claim sur le **rail `interpretation`**, `actor = character_id` |
| **Promotion croyance→fait** (révélation prouvée) | opération **`PROMOTE`** (gardée par evidence, `v-rail-separation`) |
| **Mensonge** | personnage `actor=C` affirme claim X sur `interpretation` **ALORS QUE** le rail `truth` tient ¬X → détectable par comparaison cross-rail (pas de nouveau type de stockage) |
| **Asymétrie / ironie dramatique** | `reader_knowledge ⊇ character_knowledge` sur un claim donné |
| **Provenance / certitude** | `LineageSource` (USER_INPUT/INFERENCE) + `confidence` (`src/canon`, concept réutilisé) |
| **Preuve d'un savoir** | `EvidenceRef` (`canon-kernel`) — où/quand le perso l'a appris |

→ **Le mensonge n'est pas une donnée à inventer : c'est une RELATION calculable** entre le rail interpretation (ce que C affirme/croit) et le rail truth (ce qui est). La machinerie est déjà là.

---

## 3. Schéma (design illustratif, NON implémenté)
```ts
// VUE attribuée au-dessus des rails canon-kernel — PAS un nouveau store canonique.
type EpistemicStatus = 'knows' | 'believes' | 'lies_about' | 'unknown';   // V1
// (V2 ajoutera 'dreams' / 'hallucinates')

interface CharacterKnowledgeGraph {
  book_id: string; version: string; as_of_chapter: number;
  characters: CharacterKnowledge[];
  reader_knowledge: KnowledgeEdge[];   // ce que le LECTEUR sait (pour l'ironie dramatique)
  state_hash: string;                  // déterminisme (réutilise canon-kernel hash)
}

interface CharacterKnowledge {
  character_id: string;                // = EntityId canon-kernel
  edges: KnowledgeEdge[];
}

interface KnowledgeEdge {
  claim_ref: string;                   // → claim canon-kernel (rail truth = la vérité objective)
  status: EpistemicStatus;             // knows | believes | lies_about | unknown
  believed_value?: unknown;            // ce que le perso TIENT pour vrai (peut ≠ vérité)
  truth_value?: unknown;               // valeur sur le rail truth (la réalité)
  learned_in_chapter?: number;         // quand il l'a appris (ou commencé à croire/mentir)
  evidence_refs: string[];             // EvidenceRef : comment il le sait (asymétrie justifiée)
  confidence: number;                  // 0..1
}
```
**Invariant central (mensonge)** : `status === 'lies_about'` ⇔ `believed_value` annoncé par le perso ≠ `truth_value` du rail truth, **et** le perso connaît (ou devrait connaître) la vérité. Calculé, pas déclaré arbitrairement.
**Invariant asymétrie** : un perso ne peut révéler/agir sur un claim que si `KnowledgeEdge` existe avec `evidence_refs` non vide (sinon le narrateur « fuit » — cf risque R8).

---

## 4. Protocole de mise à jour (par chapitre)
`update(graph, chapterResult, ChapterSpec) → graph'` :
1. **Extraction des deltas épistémiques** (CALC d'abord ; 1 passe LLM `gemma4 think:false` calibrée **EMP-19** en renfort) : qui a appris quoi, qui a menti, qui a révélé.
2. **Réconciliation rails** : nouveaux faits établis → claim rail `truth` ; croyances/mensonges → claim rail `interpretation` (`actor=character`) ; révélation prouvée → `PROMOTE`.
3. **Recalcul des mensonges** : comparer interpretation(actor=C) vs truth → marquer `lies_about`.
4. **Snapshot** : `character_knowledge.json` (digests/refs only, pas de prose) — réutilise le pattern `gateway/memory_layer_nasa` via l'adapter (cf `BOOK_FACTORY_ADAPTER_STRATEGY.md`).

> Garde-fou **EMP-19** : l'extracteur LLM est un instrument → profil de calibration requis avant usage ; sinon CALC-only.

---

## 5. Périmètre V1 vs V2 (arbitrage Tribunal)
- **V1 (polar/thriller commercial)** : `knows` / `believes` / `lies_about` / `unknown`. **Le mensonge attribué est BLOQUANT** (un polar sans mensonge n'existe pas — ChatGPT/Gemini convergent).
- **V2 (axe littéraire)** : `dreams` / `hallucinates` (plan onirique / narrateur non fiable / perception altérée). **Reporté** pour ne pas surcharger V1.

---

## 6. Ce que ça résout
- **« indice ch2 → ch25 »** : le claim planté ch2 reste sur le rail (truth/interpretation) ; le graphe sait qui le connaît ; `context-manager` le réinjecte à la récolte.
- **« qui ment »** : relation cross-rail calculée, pas devinée.
- **ironie dramatique tenue** : `reader_knowledge` vs `character.edges` sur 30 chapitres.

---

## VERDICT
- **Statut : SPEC LIVRÉE.** **Confiance : Haute** sur le mapping aux rails (prouvé runtime) ; **Moyenne** sur l'extraction LLM (dépend de la calibration EMP-19).
- **Forces** : (1) réutilise les rails truth/interpretation + PROMOTE + EvidenceRef (zéro nouveau canon) ; (2) le mensonge devient **calculable** (cross-rail), pas une donnée arbitraire ; (3) périmètre V1 net (lie inclus, rêve reporté) ; (4) snapshot via adapter (pas de store neuf).
- **Faiblesses** : (1) l'extraction fiable des deltas épistémiques par LLM est **le vrai risque** (un fait raté = mensonge fantôme ou révélation manquée) → CALC-first + continuity-oracle en filet ; (2) « devrait connaître la vérité » (pour qualifier un mensonge) = heuristique à border ; (3) coût mémoire/contexte du graphe sur 30 chap à mesurer ; (4) attribution multi-personnages (A croit que B croit que…) non couverte en V1 (récursion épistémique = hors périmètre).
- **Risques restants** : sur-attribution de mensonges (faux positifs) si le rail truth est incomplet ; dépend de la qualité du noyau canon-kernel réveillé.
- **Action** : design seulement. Implémentation P1 **après** GO Architecte (canon-kernel noyau + périmètre V1). Tests CALC-only d'abord, LLM calibré ensuite.
