# BOOK-FACTORY — Spec du planificateur macro (30 chapitres)

**Date** : 2026-06-05 · **Statut** : CONCEPTION (module NEUF `book-planner`, zéro modif moteur) · **Rôle** : transformer un `BookIntent` (60k) en un plan de N chapitres, AVANT d'écrire une ligne, puis alimenter le `genesis-planner` existant **chapitre par chapitre**.

## 1. Pourquoi un étage AU-DESSUS de genesis-planner (vérifié)
`genesis-planner` prend un `Intent { target_word_count }` unique et produit arcs+scènes pour **une œuvre** (`arc-generator` : 1 arc ≤3000w, 2 si ≤10000w, 3 si plus). Pour 60 000 mots il sortirait 3 arcs — insuffisant pour structurer 30 chapitres avec pacing et indices longue distance. → il faut un **planificateur LIVRE** qui découpe en chapitres, puis appelle genesis-planner **par chapitre** (chaque `ChapterSpec` devient un `Intent` local).

## 2. Entrée : `BookIntent`
```ts
interface BookIntent {
  title: string; premise: string; genre: Genre;   // 'polar'|'thriller'|'sf'|'romance'|...
  core_question: string;          // l'énigme/promesse qui tient 60k (« qui a tué ? »)
  protagonist: CharacterBrief; cast: CharacterBrief[];
  setting: string; tone: string;
  target_word_count: number;      // ~60000
  target_chapters: number;        // ~25-35 (déduit si absent)
  pov: POV; tense: Tense;         // (réutilise types genesis-planner)
}
```

## 3. Sortie : `BookPlan`
```ts
interface BookPlan {
  book_id: string; chapters: ChapterSpec[];
  pacing_curve: number[];         // tension cible par chapitre (0..1)
  seed_schedule: PayoffEdge[];    // graines : quel chapitre plante, quel chapitre récolte
  act_structure: Act[];           // 3 actes (ou Save-the-Cat / genre template)
  plan_hash: string;
}
interface ChapterSpec {
  index: number; act: number;
  objective: string;              // ce que le chapitre accomplit dans l'intrigue
  tension_target: number;         // de pacing_curve
  target_word_count: number;      // ~2000-2500 (≈60k/N), modulé par pacing
  pov_character: string;
  seeds_to_plant: string[];       // ids
  seeds_to_bloom: string[];       // ids (récolte ici)
  threads_to_open: string[]; threads_to_advance: string[]; threads_to_close: string[];
  entering_state_requirements: string[];   // ce qui doit être vrai en entrée (cohérence)
}
```
Chaque `ChapterSpec` est ensuite **traduit en `Intent`** pour le `genesis-planner` (objective→premise, tension→emotion waypoints, seeds→Scene.seeds_planted/bloomed). Réutilisation maximale.

## 4. Algorithme du book-planner
1. **Structure d'actes** par genre (template) : ex. polar = exposition/meurtre (acte I, ~20%), enquête/fausses pistes (acte II, ~55%), révélation/résolution (acte III, ~25%). SF/thriller = variantes. Templates déterministes, paramétrables.
2. **Découpage en chapitres** : `N = target_chapters` ; `mots/chapitre ≈ 60000/N` **modulé par la courbe de pacing** (chapitres de climax plus denses/courts, respiration plus longue).
3. **Courbe de pacing** : tension montante en dents de scie vers le climax (acte III) puis chute — forme dérivée des **6 arcs de Reagan** (L9, déjà connue) ; ⚠ heuristique, pas dogme.
4. **Seed schedule (le différenciateur)** : placer les `PayoffEdge` — chaque indice majeur a un `planted_chapter` (acte I/II) et un `bloom_target_chapter` (acte II/III), avec contrainte de distance max raisonnable et au moins un `reinforced` intermédiaire (anti-oubli lecteur). C'est ce qui crée la **cohérence d'intrigue longue**.
5. **Cohérence d'entrée** : chaque chapitre déclare `entering_state_requirements` → le `continuity-oracle` les vérifie contre `story-state`.

## 5. Application du résultat LEGION (rythme) — ADVISORY uniquement
La master-analyse a montré : littéraire = phrases plus longues/modulées, mais **signal directionnel, pas loi** (OLS t=1.43). → le `book-planner` peut viser un **registre de rythme par genre** (thriller = phrases plus courtes/variées ; littéraire = plus longues) en **advisory** dans le `StyleGenomeInput` (`target_avg_sentence_length` existe déjà !), **jamais comme gate dur** (cibler `sent_len` = re-Goodhart, EMP-16). Le rythme informe le style cible, il ne le contraint pas.

## 6. Genre-templates (V1 = genre commercial, cohérent avec plafond V1≈0.52)
Polar/Thriller/SF d'abord (marché + structure forte = plus facile à tenir cohérent). Chaque template = actes + densité d'indices + courbe de tension + registre de style advisory. Extensible.

## VERDICT
- Statut : **SPEC PLANNER MACRO LIVRÉE**. Confiance : Haute sur la réutilisation genesis-planner ; Moyenne sur les templates de genre (à calibrer empiriquement).
- Forces : étage propre au-dessus de l'existant (ChapterSpec→Intent) ; seed_schedule = vraie cohérence d'intrigue ; pacing dérivé de L9 ; rythme appliqué en advisory (anti-Goodhart) ; réutilise `target_avg_sentence_length` du genome.
- Faiblesses : (1) templates de genre = heuristiques sans validation ; (2) découpage mots/chapitre rigide à assouplir ; (3) le planner LLM (générer premise/objectifs par chapitre) doit être calibré EMP-19 ; (4) « courbe de pacing optimale » non prouvée.
- Action : P1 = `book-planner` déterministe (structure d'actes + découpage + seed_schedule) testable hors-LLM ; brancher genesis-planner par chapitre en P2.
