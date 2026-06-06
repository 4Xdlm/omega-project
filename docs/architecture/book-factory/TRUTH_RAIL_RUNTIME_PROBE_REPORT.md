# TRUTH RAIL — Rapport de PROBE RUNTIME (preuve empirique, pas types)

**Date** : 2026-06-05 · **Statut** : PREUVE RUNTIME LIVRÉE · **Standard** : NASA-Grade L4 (PROVE IT)
**But** : lever le seul doute restant de la matrice V2 — « les rails truth/interpretation + PROMEUVRE sont-ils FONCTIONNELS au runtime, ou seulement typés/latents ? ». Exigence Architecte : *« on ne démarre que quand on est 1000% sûr ; le moindre doute sur la vérité on contrôle ».*

## 1. Contexte du doute
La matrice V2 a établi (par types) que la couche épistémique « quantum » existe sous forme de **rails `truth`/`interpretation` + opération `PROMOTE`** (`canon-kernel`) et que sa promotion croyance→fait exige une preuve (`truth-gate` V-RAIL-SEPARATION). Mais V2 l'a classée **LIVE-LATENT** : typée + testée, jamais invoquée en prod. Doute résiduel signalé dans le VERDICT V2 : *« runtime non éprouvé (types vs comportement) ; LATENT à confirmer par test appelant »*. Ce rapport résout ce doute **empiriquement**.

## 2. Méthode (WINDOWS FIRST, evidence commands)
- Repo : `C:\Users\elric\omega-project`, branche `phase-r-dispatcher-v33`, HEAD `4f7fa2ab`, **en phase avec origin** (aucun commit Architecte parallèle), arbre propre hormis livrables doc untracked. node v24.12.0 / npm 11.6.2.
- Exécution réelle des suites de tests existantes via `npm test` (`vitest run`) Windows-side. Aucun code écrit, aucune mutation.
- Recherche exhaustive d'appelants (sandbox grep, repo entier).

## 3. Résultats — PREUVE QUE ÇA MARCHE

### 3.1 `@omega/truth-gate` — **217/217 PASS** (durée 402 ms, EXIT=0)
```
✓ tests/drift-detector.test.ts      (13)   ✓ tests/policy-manager.test.ts   (28)
✓ tests/toxicity-detector.test.ts   (15)   ✓ tests/truth-gate.test.ts       (23)
✓ tests/narrative-analyzer.test.ts  (15)   ✓ tests/verdict-ledger.test.ts   (31)
✓ tests/verdict-factory.test.ts     (24)   ✓ tests/validators.test.ts       (42)
✓ tests/determinism.test.ts          (8)   ✓ tests/integration.test.ts      (18)
Test Files 10 passed (10) · Tests 217 passed (217)
```
**Tests épistémiques clés (vérifiés verts)** :
- `integration.test.ts:267` — *« should validate interpretation rail transactions »* → une tx sur le rail **interpretation** est acceptée. ✅
- `integration.test.ts:273` — *« should deny PROMOTE on interpretation rail »* → PROMEUVRE ne peut PAS s'exécuter hors du rail truth. ✅
- `validators.test.ts:262` — *« should ALLOW valid interpretation rail transaction »*. ✅
- `validators.test.ts` (42) — couvre V-RAIL-SEPARATION (PROMOTE exige ≥1 `evidence_ref`, sinon `rail_violation`), V-HASH-CHAIN (chaînes séparées truth/interpretation head), V-CANON-SCHEMA (rail ∈ {truth,interpretation}). ✅
- `narrative-analyzer.test.ts` (15) + `drift-detector.test.ts` (13) + `toxicity-detector.test.ts` (15) — détection de dérive/contradiction narrative. ✅

### 3.2 `@omega/canon-kernel` — **67/67 PASS** (durée 185 ms, EXIT=0)
```
✓ tests/canonicalize.test.ts (24)  ✓ tests/chain.test.ts  (17)
✓ tests/id.test.ts           (15)  ✓ tests/txview.test.ts (11)
Test Files 4 passed (4) · Tests 67 passed (67)
```
`txview.test.ts` couvre `HashableTxView` (rail inclus dans le hash, timestamp exclu → déterminisme) ; `chain.test.ts` la chaîne de hash. Le noyau (rails + ops `PROMOTE` + hash déterministe) est **vert**.

→ **CONCLUSION 3 : la machinerie fait/croyance + promotion-gardée-par-preuve FONCTIONNE au runtime.** Le « cerveau épistémique » n'est pas pourri ; il est sain et certifié par tests.

## 4. Résultats — PREUVE QUE C'EST LATENT (non câblé)
Recherche exhaustive d'appelant (repo entier, hors node_modules/dist/.venv, hors src propre de canon-kernel & truth-gate, hors tests, hors deposit) :
```
grep -rnE "createCanonTx|'PROMOTE'|RailType|rail:'truth'|'interpretation'|createTruthGate|new TruthGate"
```
→ **Aucun appelant de production.** Seuls hits : `gateway/src/gates/truth_gate.ts` (un truth-gate **gateway distinct**, lui-même dormant) qui s'auto-exporte. Le pipeline de génération courant (`creation-pipeline`, `sovereign-engine`, `scribe-engine`) **ne construit jamais** de transaction à rail ni n'appelle `PROMOTE`. `canon-kernel` est importé partout mais **uniquement pour `canonicalize`/`sha256`** (utilitaires de hash), jamais pour la machinerie transactionnelle/épistémique.

→ **CONCLUSION 4 : LATENT confirmé empiriquement.** Construit + testé (284 tests verts) + **non câblé**.

## 5. Verdict
- **Statut : PASS.** **Confiance : Haute** (preuve = exécution réelle, 284/284 tests verts, EXIT=0, + grep exhaustif d'appelant).
- **Doute V2 résolu** : les rails truth/interpretation + PROMOTE + evidence-gating sont **fonctionnels au runtime**, pas seulement typés. La colonne vertébrale candidate (`canon-kernel`) est **saine**.
- **Forces** : preuve empirique reproductible (commande + sortie + exit code) ; couvre exactement les 3 cas épistémiques (rail interpretation OK / PROMOTE mauvais-rail refusé / evidence requise) ; LATENT prouvé par absence d'appelant.
- **Faiblesses** : (1) les tests prouvent le **contrat** (rail/PROMOTE/evidence), pas la **performance** ni le passage à l'échelle livre ; (2) je n'ai pas exécuté `gateway` ni `src/canon` (les canons concurrents) — leur santé runtime reste non mesurée (mais ils sont destinés à ORPHAN/ADAPT, pas à devenir le noyau) ; (3) « réveiller » (câbler) le rail créera de nouveaux chemins non couverts → exigera de nouveaux tests d'intégration.
- **Risques restants** : câbler le rail peut révéler des bugs dormants d'intégration (précédent : bug PROMOTE latent déjà corrigé S11.Z dans `v-rail-separation.ts:54-57`). À couvrir par tests AVANT toute prod.
- **Action** : la consolidation peut désigner `canon-kernel` comme noyau **avec preuve**. Voir `CANON_TRUTH_CONSOLIDATION_DECISION.md`. ZÉRO code Book-Factory tant que P0.5 non finalisé.
```
