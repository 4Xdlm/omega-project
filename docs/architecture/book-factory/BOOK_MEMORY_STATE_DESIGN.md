# BOOK-FACTORY — Mémoire d'état inter-chapitres (« Bible du roman »)

**Date** : 2026-06-05 · **Statut** : CONCEPTION (doc-only, module NEUF `story-state`, zéro modif moteur) · **Problème résolu** : le chapitre 25 doit se souvenir de l'indice planté au chapitre 2, sans que le LLM garde 60 000 mots en VRAM.

## 1. Pourquoi le `Canon` existant ne suffit pas (vérifié)
`genesis-planner/src/types.ts` : `Canon` = `readonly entries[]`, chaque `CanonEntry` est `immutable: boolean`. → **Canon est STATIQUE** : les faits du monde décidés au départ. Il ne **grandit pas** : un fait découvert au chapitre 5 (un personnage ment, un lieu brûle) n'est jamais enregistré pour le chapitre 6. De plus `Seed.planted_in`/`blooms_in` + `SEED_BLOOM_MAX_DISTANCE` opèrent **dans un seul `GenesisPlan`** (une œuvre/chapitre), pas à travers le livre. → il manque un **état MUTABLE, persistant, cross-chapitre**.

## 2. `StoryState` — schéma (la Bible mutable)
Persisté en **JSON versionné par session livre** (`sessions/BOOK_<id>/story_state.json`), **snapshot après chaque chapitre** (crash-safe, traçable, sha-keyé comme les evidence packs). Sérialisable, déterministe, **aucun texte de prose** (digests seulement → bornable).

```ts
interface StoryState {
  book_id: string; version: string; chapters_done: number;
  // — entités évolutives —
  characters: Character[];        // état VIVANT (≠ Canon statique)
  places: Place[];
  timeline: TimelineEvent[];      // chronologie ordonnée
  threads: PlotThread[];          // fils d'intrigue ouverts/fermés
  payoff_graph: PayoffEdge[];     // graine→récolte CROSS-chapitre (le cœur)
  facts_learned: FactDelta[];     // ce que le lecteur/les persos savent désormais
  world_changes: WorldChange[];   // état du monde modifié (ch5 incendie → ch6 ruines)
  emotional_position: number;     // où on en est sur la trajectoire (0..1)
  last_chapter_digest: string;    // résumé ≤150 mots du chapitre N-1 (continuité locale)
  rolling_summary: string;        // résumé glissant cumulatif ≤400 mots (continuité globale)
  state_hash: string;
}
interface Character {
  id: string; name: string;
  status: 'alive'|'dead'|'unknown'; location_id?: string;
  knows: string[];               // ce que CE personnage sait (asymétrie d'information)
  relationships: {to: string; type: string; valence: number}[];
  arc_position: string;          // évolution (innocent→soupçonné→coupable…)
  open_wounds: string[];         // blessures/objectifs non résolus
  last_seen_chapter: number;
}
interface PayoffEdge {            // étend Seed à l'échelle livre
  seed_id: string; type: SeedType;   // (réutilise SeedType de genesis-planner)
  planted_chapter: number; planted_desc: string;
  bloom_target_chapter: number;  // planifié par book-planner
  status: 'planted'|'reinforced'|'bloomed'|'OVERDUE';
}
interface PlotThread { id: string; question: string; opened_chapter: number; status: 'open'|'resolved'; resolved_chapter?: number; }
```

## 3. Protocole de MISE À JOUR (après chaque chapitre)
`story-state.update(chapterResult, ChapterSpec) → StoryState'` :
1. **Extraction de deltas** (CALC d'abord + 1 passe LLM `gemma4 think:false` bornée, calibrée EMP-19) : qui est apparu/a agi, lieux, faits nouveaux, graines plantées/récoltées effectivement, changements de monde.
2. **Réconciliation** : appliquer les deltas (statut perso, threads, payoff_graph, timeline). Marquer `OVERDUE` toute graine dont `bloom_target_chapter` est dépassé sans `bloomed`.
3. **Digests** : régénérer `last_chapter_digest` (≤150 mots) et `rolling_summary` (≤400 mots, compression incrémentale — on ne ré-résume pas tout le livre, on **fusionne** ancien résumé + chapitre N).
4. **Snapshot** : écrire `story_state.json` (+ hash). Reprise crash = recharger le dernier snapshot.

> **Garde-fou EMP-19** : l'extracteur LLM (gemma4) est un instrument → profil de calibration requis (think:false, prompt_hash figé) avant usage. Sinon CALC-only en P1.

## 4. Protocole d'INJECTION (ce que le chapitre N+1 reçoit) — borne le contexte
`context-manager.build(c, story_state, BookPlan) → ContextDigest` (≤ ~600 mots, JAMAIS le livre entier) :
- `rolling_summary` (≤400) + `last_chapter_digest` (≤150) — continuité globale + locale.
- **Sous-ensemble pertinent** de l'état : seuls les `characters` présents/attendus dans `ChapterSpec_c`, les `threads` ouverts concernés, les `places` du chapitre.
- **Graines à récolter MAINTENANT** : `payoff_graph` filtré sur `bloom_target_chapter == c` → rappel explicite « l'indice X planté au ch.2 doit éclater ici » (résout le ch2→ch25).
- **Contraintes de cohérence** : faits immuables (Canon) + statuts critiques (mort = reste mort).

→ Le LLM écrit le chapitre N avec **un digest borné**, pas 25 chapitres de texte. La continuité vient de la **structure**, pas de la taille du contexte.

## 5. Comment ça résout « indice ch2 → ch25 »
1. `book-planner` planifie `PayoffEdge{seed:"lettre cachée", planted:2, bloom_target:25}` au départ.
2. Chapitre 2 : `story-state.update` confirme la graine `planted`.
3. Chapitres 3-24 : la graine dort dans `payoff_graph` (zéro coût contexte).
4. Chapitre 25 : `context-manager` la **réinjecte** (filtre `bloom_target==25`) → le générateur reçoit « fais éclater la lettre cachée du ch.2 ». `continuity-oracle` vérifie qu'elle est bien résolue (sinon `OVERDUE` → RETRY).

## 6. Persistance & coût
- JSON par session, snapshot/chapitre, **features/digests seulement** (pas de prose stockée → léger, ~10-50 Ko/livre).
- Reprise crash-safe (recharge dernier snapshot — pattern déjà éprouvé sur les benchs/omega-book-gen).
- Déterministe (seeds fixés, hash d'état).

## VERDICT
- Statut : **DESIGN MÉMOIRE D'ÉTAT LIVRÉ**. Confiance : Haute (résout le mur VRAM par état externe borné, fondé sur l'écart réel Canon-statique vs besoin mutable).
- Forces : étend proprement `Seed`/`Canon` existants ; injection bornée (≤600 mots) → pas d'explosion contexte ; payoff_graph résout les indices longue distance ; crash-safe ; CALC-first, LLM calibré EMP-19.
- Faiblesses : (1) l'extraction de deltas fiable est dure (un LLM peut rater un fait → `continuity-oracle` en filet) ; (2) compression incrémentale du résumé = perte possible d'info → tuning ; (3) asymétrie d'information (qui sait quoi) complexe à tenir.
- Action : P1 = implémenter `StoryState` + update/inject **CALC-only** (sans LLM) d'abord, tester sur les 2 BOOK_FULL existants (rejouer l'extraction), puis ajouter l'extracteur LLM calibré.
