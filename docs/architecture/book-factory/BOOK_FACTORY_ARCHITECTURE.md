# OMEGA BOOK-FACTORY — Architecture cible (V1 production long-format)

**Date** : 2026-06-05 · **Statut** : CONCEPTION (doc-only, **zéro modif moteur**, aucun module FROZEN touché) · **Mandat** : Architecte + Tribunaux — basculer de la mesure (LEGION clos) à la production de romans cohérents de ~60 000 mots. Standard OMEGA : mécanisme/limites, fondé sur l'existant **vérifié** (file:line), jamais inventé.

> **Précondition non négociable (terminal Architecte)** : appliquer le patch **repeat-shadow** avant toute génération sérieuse. Sinon l'usine imprime « la fissure, la fissure » en cuir relié (forensic BESTOFN). Le Book-Factory consomme l'Oracle ; tant qu'il couronne un chapitre qui bégaie, la cohérence longue est polluée.

## 0. Le problème en une phrase
OMEGA génère aujourd'hui **une scène/chapitre de qualité** (K2+DUEL+Oracle, ~1500-4000 mots) mais **n'a aucun moyen de tenir un roman de 30 chapitres** : ni planification macro, ni mémoire d'état entre chapitres, ni gestion du contexte/VRAM. Un LLM local (gemma4:31b, ~22.9 Go résident) **ne peut pas garder 60 000 mots en mémoire de travail**. Il faut une architecture qui **borne le contexte** tout en **préservant la continuité**.

## 1. Ce qui EXISTE (vérifié) et qu'on RÉUTILISE
| Brique existante | Rôle | Réutilisation Book-Factory |
|---|---|---|
| `packages/genesis-planner/` (`Intent`, `Arc`, `Scene`, `Seed`, `Beat`, `GenesisPlan`, `seed-bloom-tracker.ts`) | Planifie arcs+scènes d'**une** œuvre, déterministe | **Planifie 1 CHAPITRE** (appelé en boucle) |
| `packages/creation-pipeline/` (`engine.ts` F0-F8, `intent-pack.ts`, `gates/unified-crossref-gate.ts`, `unified-truth-gate.ts`) | Pipeline d'**un** chapitre : Validate→Genesis→Scribe→Style→Gates→Evidence | **Unité de génération par chapitre** (inchangée) |
| `packages/sovereign-engine/` (K2 Chunked, DUEL N=7, S-Oracle V2, R6 Gate, repeat-shadow proposé) | Génère + sélectionne la prose d'un chunk/scène | **Inchangé** (moteur de prose) |
| `packages/scribe-engine/` (`weaver-llm.ts`) | Tissage LLM de la prose | Inchangé |
| `packages/mycelium/`, `packages/genome/` | Validation d'entrée + ADN de style (FROZEN/SEALED) | **Inchangés, jamais touchés** (style, pas mémoire) |
| `test-p4-continuite.ts` | PoC : injection des 200 derniers mots du chapitre N-1 | **Point de départ** de la couche continuité (à industrialiser) |

## 2. Ce qui MANQUE (les 5 modules NEUFS à construire)
Tous **nouveaux packages/modules**, en couche AU-DESSUS de l'existant (jamais de modif des FROZEN). Voir docs dédiés.
1. **`book-planner`** — décompose un `BookIntent` (60k, genre, prémisse) en **N `ChapterSpec`** (arc, tension cible, mots, graines à planter/récolter), + courbe de pacing. → `BOOK_30_CHAPTER_PLANNER_SPEC.md`
2. **`story-state`** (la « Bible du roman ») — état **MUTABLE** inter-chapitres (personnages évolutifs, lieux, chronologie, fils d'intrigue, **graphe graine→récolte cross-chapitre**) que le `Canon` statique ne fournit PAS. → `BOOK_MEMORY_STATE_DESIGN.md`
3. **`book-orchestrator`** — la **boucle** chapitre 1..N : pour chaque chapitre, assemble l'Intent depuis `book-planner` + état pertinent de `story-state`, lance `creation-pipeline`, met à jour `story-state`, passe la `continuity-gate`, assemble. + reprise sur crash (comme les benchs).
4. **`continuity-oracle`** — gate **inter-chapitres** (le chapitre N contredit-il 1..N-1 ? personnage/fait/chronologie/indice non résolu). Étend `unified-crossref-gate` à l'échelle livre.
5. **`context-manager`** — borne le contexte LLM : **jamais le livre entier**, mais (a) résumé glissant des K derniers chapitres, (b) sous-ensemble pertinent de `story-state`, (c) récupération des graines à récolter dans ce chapitre. → budget VRAM dans `BOOK_GENERATION_RISK_REGISTER.md`.

## 3. Flux de données cible (le cœur)
```
BookIntent (60k, genre, prémisse, N chapitres, ton)
      │
      ▼
[book-planner] ── BookPlan : [ChapterSpec_1 … ChapterSpec_N] + pacing_curve + seed_schedule
      │                         (chaque ChapterSpec = arc/tension/mots/seeds_to_plant/seeds_to_bloom)
      ▼
[book-orchestrator]  ◄────────────────────────── [story-state] (Bible MUTABLE, persistée JSON)
      │   pour chaque chapitre c = 1..N :                ▲
      │   1. context = [context-manager].build(c, story_state, BookPlan)   │  update après chaque chapitre
      │      = résumé K derniers chap + état pertinent + graines à récolter │
      │   2. chapterIntent = assemble(ChapterSpec_c, context)             │
      │   3. result = [creation-pipeline].run(chapterIntent)   ← K2+DUEL+Oracle(+repeat-shadow)
      │   4. [continuity-oracle].check(result, story_state) → PASS/RETRY   │
      │   5. story_state = [story-state].update(result, ChapterSpec_c) ────┘
      │   6. persist + assemble prose
      ▼
Manuscrit 60k cohérent (assemblé) + Bible finale + evidence pack
```

## 4. Principe directeur — « contexte borné, état persistant »
Le LLM ne voit JAMAIS plus de ~1 chapitre + un **digest** (résumé glissant + état pertinent ≤ quelques centaines de mots). La cohérence longue ne vient PAS d'un contexte géant (impossible en VRAM) mais d'une **mémoire externe structurée** (`story-state`) injectée sélectivement. C'est le pattern « RAG interne / bible » des pipelines de production — borné, déterministe, traçable.

## 5. Doctrine appliquée
- **Zéro modif moteur** ici : tout est **couche additive** (nouveaux packages). FROZEN (genome, sentinel) jamais touchés (V-01).
- **repeat-shadow d'abord** (terminal) : l'Oracle doit voir la répétition avant toute prod 60k (sinon défaut incrusté à l'échelle livre).
- **EMP-16** : aucune « loi » de génération (ex. cibler `sent_len`) — le rythme reste **advisory** (la master-analyse a montré : signal directionnel, pas loi ; cibler = re-Goodhart).
- **Déterminisme** : seeds fixés, evidence pack par chapitre (comme creation-pipeline F5-F8), reprise crash-safe.
- **Honnêteté plafond** : V1 ≈ +0.52 (supra-populaire, sous-maître). Les livres seront du **« très bon genre » (polar/thriller/SF)**, pas des chefs-d'œuvre. Objectif = **cohérence + lisibilité longue**, pas Goncourt.

## 6. Phasage proposé (à valider Architecte — design only ici)
- **P0 (ce doc + 4 specs)** : conception complète. ← *présent*
- **P1** : `book-planner` + `story-state` (schémas + impl + tests unitaires) — modules isolés, testables sans LLM.
- **P2** : `book-orchestrator` boucle 3 chapitres (smoke) sur 1 genre, `repeat-shadow` actif, `continuity-oracle` basique.
- **P3** : `context-manager` (résumé glissant + retrieval graines) + run 10 chapitres.
- **P4** : run 30 chapitres / 60k, evidence + bilan qualité (Deux Clés sur échantillons).
Aucun code avant GO Architecte par phase.

## VERDICT
- Statut : **ARCHITECTURE CIBLE POSÉE** (doc-only, fondée sur l'existant vérifié). Confiance : Haute sur la cartographie (file:line confirmés) ; Moyenne sur l'estimation d'effort (P1-P4 = semaines).
- Forces : réutilise genesis-planner/creation-pipeline/sovereign-engine intacts ; isole les 5 manques en modules additifs ; principe « contexte borné + état persistant » résout le mur VRAM ; doctrine (zéro moteur, repeat-shadow, EMP-16) intégrée.
- Faiblesses : (1) la continuité inter-chapitres est non triviale (le PoC P4 ne fait que 200 mots) ; (2) coût/temps 30×(K2+DUEL N=7) élevé ; (3) plafond qualité V1 ; (4) « chapitre clé/pacing » = heuristiques à valider.
- Action : validation Architecte du phasage ; **P1 (book-planner + story-state) = premier code**, testable hors-LLM. Détails dans les 4 specs jointes.
