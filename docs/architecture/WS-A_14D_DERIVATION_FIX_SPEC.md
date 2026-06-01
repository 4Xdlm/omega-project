# WS-A — Spec d'implémentation : fix dérivation 14D unifiée (companion DEC-010)

**Status** : SPEC PRÊTE-À-IMPLÉMENTER · **Date** : 2026-05-31 · **Doctrine** : NO CODE BEFORE ADR (DEC-010 RATIFIED §7+§13) · TEST IT · FREEZE IT · MINIMIZE IT.
**⚠️ Blocage d'exécution** : l'implémentation est CODE MOTEUR sur engine V1 SCELLÉ (2056 tests). La validation EXIGE la suite vitest. **Vitest ne démarre pas dans le shell Cowork Desktop Commander** (`Vitest._setServer` échoue). → le code + la validation doivent se faire en **env gaté** (terminal Architecte / Claude Code). Cette spec est complète ; seul le commit de code moteur est différé (anti-catastrophe sur engine scellé).

## 1. Cause (T0 confirmée, DEC-010 §13)
`buildScenePrescribedTrajectoryLocal` (`packages/sovereign-engine/src/input/forge-packet-assembler.ts:217-266`) : une scène capte les waypoints de `plan.emotion_trajectory` dont `position ∈ [sceneStartPct, sceneEndPct]`. L'arc « Le Gardien » a 7 waypoints / 7 scènes → **~1 waypoint par scène**. Scène-0 [0, 0.143] capte 1 seul waypoint (trust@0) → `buildScenePrescribedTrajectory` reçoit 1 waypoint → trajectoire **PLATE trust:1.0 sur Q1-Q4**. (Le fallback 2-identical n'est même pas atteint — c'est le cas 1-waypoint.)

## 2. Fix (minimal, au niveau sélection de waypoints)
Dans `buildScenePrescribedTrajectoryLocal`, derrière flag `OMEGA_EMOTION_DERIV_V2` (défaut false) :
- Calculer `sceneWaypoints` (in-range) comme aujourd'hui.
- **SI `sceneWaypoints.length < 2`** : construire un set ENCADRANT = `[dernier waypoint avant sceneStartPct] + sceneWaypoints + [premier waypoint après sceneEndPct]` (clampés aux bornes de l'arc), dédupliqués par position, garantissant **≥2 waypoints distincts** couvrant la scène → `buildScenePrescribedTrajectory` interpole une micro-trajectoire VARIÉE.
  - Ex. scène-0 : trust@0 + anticipation@0.167 → micro-arc trust→anticipation sur Q1-Q4 (dominant Q1≈trust, dérive vers anticipation Q3-Q4). Le dominant d'arc est préservé ; la variation §7 est obtenue.
- **Supprimer** le fallback flat-2-waypoint-identiques (remplacé par l'encadrement + une dérivation intensité si vraiment 0 waypoint d'arc).
- **Unification (DEC-010 §7)** : `deriveEmotionContractFromSegment` (chemin V2.3-A, `chunking/deriveEmotionContract.ts:182,299`, défaut `{}`) doit appeler LA MÊME dérivation (ou produire un 14D peuplé via omega-forge), jamais `{}`. Une seule fonction partagée.

## 3. Tests-first (TDD, DEC-010 §8) — à écrire AVANT le code
1. `assembleForgePacket(Le Gardien, scene0)` → `curve_quartiles` : distance cosine Q1↔Q4 ≥ 0.15 (variation), dominant Q1 ≈ trust (arc préservé). [actuellement : flat trust:1.0 → FAIL attendu en rouge]
2. Aucun quartile avec `target_14d` one-hot constant sur les 4.
3. `deriveEmotionContractFromSegment` ne produit jamais `target_14d={}` (peuplé, somme 1.0).
4. Anti-divergence : V2.3-A et assembleForgePacket appellent la même fonction de dérivation.
5. Re-bench ECC : contrat dérivé sur prose appropriée ≈ contrat hand-built (ECC remonte vers ~92).
6. Non-régression : `npx vitest run` sovereign-engine = 2056 PASS (0 régression) + déterminisme (hash stable).

## 4. Validation requise (env gaté)
- `vitest run` full sovereign-engine (2056 tests) PASS — **bloquant, non exécutable en shell DC**.
- Re-bench ECC (T2) : ECC FORGE ≈ HAND post-fix.
- Gate EMP-10 `commit-with-tests.ps1` (A_CODE : TSC + vitest).
- Flag off par défaut + double-run (DEC-010 §9 rollback).

## 5. Non-goals (rappel)
NE PAS forcer fear sur les scènes (scène-0 trust = correct par arc) · NE PAS toucher capteur ECC ni RCI · NE PAS modifier genome SEALED · garder le dominant d'arc, ajouter SEULEMENT la variation quartile.

## VERDICT
- Statut : SPEC COMPLÈTE, prête. Cause prouvée (T0), fix minimal localisé (caller, ~10-15 lignes + unification V2.3-A), tests définis, rollback par flag.
- **Action différée (anti-catastrophe)** : le code moteur + la validation vitest = env gaté (vitest inopérant en shell Cowork DC ; ne pas pousser de dérivation moteur non validée sur engine V1 scellé). Dès qu'un env à vitest est dispo → implémenter §2, écrire §3, valider §4, commit gaté.
