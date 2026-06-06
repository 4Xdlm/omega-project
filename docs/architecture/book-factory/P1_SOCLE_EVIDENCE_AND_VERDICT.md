# Book-Factory — Socle CALC (P0.6b → P1.D) — EVIDENCE & VERDICT

**Date** : 2026-06-05 · **Statut** : SOCLE SCELLÉ (CALC, hors-LLM) · **Standard** : NASA-Grade L4 · **Régime** : 100 % déterministe, additif, noyau intouché, commit gaté terminal.
**Mandat** : « go a fond, même rigueur (code → tsc → tests → non-régression → gate) ».

## 1. Ce qui a été construit (paquet `packages/book-factory/`, additif)
| Module | Rôle |
|---|---|
| `src/book-canon-adapter.ts` | ACL épistémique sur canon-kernel + truth-gate ; `knows`=JTB, révélation+preuve, reader séparé, promote source-lié ; projections truth/belief/rumor/lie/bluff/mistake |
| `src/story-state.ts` | la **Bible** comme **fold pur** d'un journal d'événements (event sourcing) : characters/places/threads/**payoff_graph cross-chapitre**/timeline ; déterministe (state_hash), crash-safe |
| `src/book-planner.ts` | `BookIntent` → `BookPlan` déterministe : actes, **courbe de pacing** (montée→climax→chute), **seed_schedule** (plant→reinforce→bloom), `ChapterSpec`, plan_hash + `renderSkeleton` |
| `src/continuity-oracle.ts` | gate **inter-chapitres** : CHRONO, DEAD_ACTS/REVIVE, LEAK (asymétrie), REQUIREMENT (bloom d'une graine plantée), OVERDUE |
| `src/dry-run.ts` | boucle bout-en-bout planner→story-state→oracle sur 30 chapitres synthétiques |
| `src/book-planner-demo.ts` | génère le squelette console (→ `SAMPLE_THRILLER_SKELETON.txt`) |

## 2. Preuves (Windows, reproductibles)
- **Tests book-factory : 42/42** (épistémique 13 + Bible 8 + planner 8 + oracle 8 + dry-run 5), EXIT 0, **re-runs déterministes**.
- **Typecheck strict** : `tsc --noEmit` (src+tests) = **EXIT 0**, zéro `any`.
- **Non-régression** : canon-kernel **67/67**, truth-gate **217/217**. → **Total 326 verts, zéro régression.**
- **Démo** : squelette d'un thriller 30 chapitres généré (3 actes, tension 1.00 au ch.26, 60 000 mots exacts, lettre plantée ch.2 → éclate ch.24).
- **Dry-run 30 chapitres** prouve : (A) tous les chapitres passent le gate ; (B) la graine du ch.2 **éclate** (payoff), aucune graine OVERDUE ; (C) une **rumeur portée par 3 personnages** laisse la vérité intacte (`coupable=garcia`, pas `le_maire`) ; (D) une **contradiction injectée est attrapée** (RETRY) ; (E) **déterministe** (state_hash stable).

## 3. Revues adverses (sous-agent indépendant) — toutes SOUND
- **P0.6 / P0.6b** (logique épistémique) : SOUND — grille 64 cas, `knows` Gettier-safe, zéro faux-mensonge, zéro contamination.
- **P1.C / P1.D** (oracle + dry-run) : **SOUND** — le reviewer a **injecté 4 fautes dans la boucle** (mort-qui-agit, plant manquant, révélation prématurée, chrono cassée) → chacune bascule le run en RETRY au bon chapitre ⇒ `allPassed=true` est **significatif**, pas vacuous. Anti-contamination réelle (séparation des rails). Payoff réel (SEED_BLOOM appliqué → fold). Déterminisme : 50 runs → 1 seul hash.

## 4. Bornes connues (à charge de l'orchestrateur P2 — notées par la revue)
1. `continuity-oracle` : **LEAK** ne s'exécute que si `adapter` fourni ; **REQUIREMENT** que si `spec` fourni. → l'orchestrateur réel **doit toujours fournir les deux** (sinon ces gates restent silencieux).
2. `RELATIONSHIP` ne vérifie que `from` mort (pas `to`).
3. Sémantique **OVERDUE** = « doit éclater au plus tard au chapitre *après* la cible ».
4. `dist/` est l'artefact de la démo (build P1.B) ; rebâtir avant tout consommateur de `dist`.
Aucune n'est un défaut de justesse ; ce sont des contrats d'intégration pour P2.

## 5. Bornes de périmètre (hors socle CALC — phase P2)
- **Génération LLM** (prose) non incluse : ce socle est 100 % CALC/déterministe. P2 = brancher la génération (creation-pipeline K2/DUEL/Oracle) chapitre par chapitre via `ChapterSpec→Intent`.
- **Extracteur prose→événement** (le vrai maillon faible) = P2, avec le SKEPTIC en filet + calibration EMP-19.
- Gate épistémique encore **mono-transaction** (chaîne de hash inter-tx non exercée) — à activer avec un vrai store en P2.

## VERDICT
- **Statut : PASS — SOCLE BOOK-FACTORY CALC SCELLÉ.** Confiance : Haute (326 tests, tsc 0, 3 revues adverses SOUND, déterminisme prouvé).
- **Forces** : (1) la matrice épistémique Gettier-safe (savoir/croire/mentir/bluffer) prouvée ; (2) la Bible en event-sourcing rejouable ; (3) le planificateur produit une ossature 30 chapitres cohérente avec payoff longue-distance ; (4) le gate inter-chapitres attrape contradiction/fuite/OVERDUE ; (5) tout additif, zéro mutation, zéro régression ; (6) 100 % déterministe, sans coût LLM.
- **Faiblesses** : (1) génération LLM + extracteur prose→événement hors socle (P2, vrai risque) ; (2) gate mono-tx (chaîne non exercée) ; (3) templates de genre = heuristiques à calibrer ; (4) l'orchestrateur doit honorer les contrats §4.
- **Action** : **commit du socle** (terminal Architecte, hooks). Puis **P2** = génération LLM chapitre par chapitre (ChapterSpec→Intent→creation-pipeline) + extracteur calibré + SKEPTIC. ZÉRO génération LLM tant que P2 non cadré/validé.
