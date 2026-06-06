# P0.6 — Epistemic Integration Probe — RAPPORT D'EVIDENCE

**Date** : 2026-06-05 · **Statut** : PASS (greffe prouvée, recontrôlée ×2) · **Standard** : NASA-Grade L4 (PROVE IT)
**But** : prouver que la **greffe** tient bout-en-bout — `book-canon-adapter` → rails `canon-kernel` → `truth-gate` → projections — sur le scénario exact craint par l'Architecte (croyance répétée vs vérité), AVANT de construire le book-planner. Premier vrai TypeScript de la Book-Factory, réduit au minimum vital.

## 1. Ce qui a été construit (additif, ZÉRO mutation)
Nouveau paquet **`packages/book-factory/`** (isolé) :
- `src/book-canon-adapter.ts` — ACL mince : écrit des transactions canon (truth/interpretation + PROMOTE) **via le vrai `truth-gate`**, et calcule les projections (`truthState`, `beliefState`, `readerState`, `rumorCarriers`, `knows`, `isLie`, `isMistake`) comme **folds purs** d'un journal append-only.
- `tests/epistemic-probe.test.ts` — 8 tests (le scénario durci).
- `package.json` + `vitest.config.ts` (alias `@omega/canon-kernel` & `@omega/truth-gate` → leur `src`) + `tsconfig.json`.
- **Aucun fichier de `canon-kernel`/`truth-gate`/`gateway` modifié.** Consommation seule.

## 2. Les garanties prouvées (toutes vertes)
| # | Garantie | Test | Mécanisme réel exercé |
|---|---|---|---|
| A | **Une croyance répétée par 3 persos ne contamine JAMAIS la vérité** | Ch2 | 3 `recordBelief` (rail interpretation) → `rumorCarriers=3` ; `truthState` reste `well` |
| B1 | **Pas de vérité sans preuve** | « no truth by repetition » | `PROMOTE` sans evidence → **DENY** (truth-gate `V-RAIL-SEPARATION`) |
| B2 | **Promotion avec preuve écrit une nouvelle vérité** | « PROMOTE not a no-op » | `promoteWithEvidence` d'une valeur neuve → ALLOW + `truthState` = la nouvelle valeur |
| C | **Mensonge = calculé, pas stocké** ; mensonge ⟺ le perso SAIT et affirme le contraire | Ch3 (erreur) + Ch4-5 (mensonge) | séparation `BELIEF`/`REVELATION` vs `ASSERTION` ; `knows` = croyance == vérité |
| D | **Toute écriture passe par le vrai truth-gate** | tous | `gate.validate(tx)` (7 validateurs, strict_mode) ; log conditionné à `ALLOW` |

Détail clé : `truthState()` **ne folde que le rail `truth`** ; le rail `interpretation` (croyances/rumeurs) est **structurellement incapable** d'y entrer (seule porte = `PROMOTE` + preuve + gate). La vérité d'un événement reste donc intacte et pilote la trame, même si tous les persos croient l'inverse.

## 3. Evidence (commandes + sorties, Windows)
- **Sonde** : `npm test` (packages/book-factory) → **8/8 PASS**, EXIT 0. **Re-exécutée ×3** (déterministe).
- **Typecheck strict** : `tsc --noEmit` (contre les `.d.ts` réels de canon-kernel + truth-gate) → **EXIT 0** (zéro erreur de type, zéro `any`).
- **Build truth-gate** : `npm run build` → **EXIT 0** (dépendance résolue + signal de non-régression).
- **Non-régression voisins** : canon-kernel **67/67**, truth-gate **217/217** (après ajout du paquet + build) → **zéro régression**. Total axe épistémique = **292 tests verts**.
- **Revue indépendante adverse** (sous-agent) : **SOUND** — aucune tautologie ; `truthState` tracé incapable d'inclure une croyance ; chaque écriture passe par le gate réel ; logique `isLie`/`knows` saine ; aucun `any`. A motivé l'ajout du test B2 (promotion à valeur neuve).

## 4. Limites honnêtes (périmètre P0.6, à lever en P1)
1. **Gate mono-transaction** : la sonde appelle `gate.validate(tx)` sans `storeSnapshot`/`previousTx` → `V-HASH-CHAIN` (continuité de chaîne) et la dérive narrative (drift=0 sans tx précédente) **ne sont pas exercés**. La sonde prouve la séparation rails/PROMOTE/projection, **pas** le chaînage de hash inter-tx. → en P1, l'orchestrateur tiendra un vrai store + snapshot et exercera la chaîne.
2. **`TEST_CALIBRATION`** utilisée (comme les tests truth-gate). En production, injecter la calibration prod (EMP-19/calibration registry). Probe-only ici.
3. **Policy via `PolicyManager`** obligatoire (fournit `blocked_patterns: []` par défaut, sinon le validateur toxicité throw → DENY). Documenté pour l'orchestrateur.
4. Projections **en mémoire** (pas encore persistées) — la persistance (snapshot/digest via l'adapter mémoire) vient en P1/P3.

## 5. Statut commit
Working tree : nouveau paquet `packages/book-factory/` (untracked) + `packages/truth-gate/dist/` (artefact de build, gitignoré). **Aucune source existante modifiée.** Le commit reste **gaté terminal** (hooks husky+lfs ne passent pas depuis Cowork) → à committer par l'Architecte / Claude Code via wrapper `commit-with-tests`.

## VERDICT
- **Statut : PASS.** **Confiance : Haute** (8/8 ×3 + tsc 0 + 292 voisins verts + revue indépendante SOUND).
- **Forces** : (1) greffe prouvée bout-en-bout sur le scénario exact de l'Architecte (anti-contamination) ; (2) additif pur, zéro mutation, zéro régression ; (3) recontrôlé ×2 (re-run + revue adverse + non-régression + typecheck) ; (4) mensonge = relation calculée (pas une donnée).
- **Faiblesses** : (1) chaînage de hash inter-tx non exercé (périmètre, → P1) ; (2) calibration de test (→ prod en P1) ; (3) projections non persistées (→ P1/P3) ; (4) extracteur prose→événement (le maillon faible réel) hors périmètre P0.6 — viendra avec le SKEPTIC en filet + EMP-19.
- **Action** : **GO P1** débloqué (`story-state` comme PROJECTION + `book-planner`, testables hors-LLM). Commit P0.6 à sceller (terminal). Prochaine barrière : P1 tests CALC verts + non-régression.
