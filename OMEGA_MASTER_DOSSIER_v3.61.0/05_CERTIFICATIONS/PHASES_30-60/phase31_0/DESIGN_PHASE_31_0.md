# DESIGN — PHASE 31.0

## Objectif
Tests de cas limites (edge cases) et tests de stress pour garantir la robustesse
du pipeline sous conditions extremes.

## Scope
- Fichiers a creer:
  - tests/stress/edgecases.test.ts
  - tests/stress/stress.test.ts
  - tests/stress/vitest.config.ts
- Fichiers a modifier: aucun
- Modules impactes: Aucune modification (tests externes)

## Invariants impactes
- INV-STRESS-01: Pipeline stable sous charge elevee (1000+ iterations)
- INV-STRESS-02: Pas de corruption de donnees sous stress
- INV-STRESS-03: Tous les edge cases rejetes correctement
- INV-STRESS-04: Pas de crash/exception non geree
- INV-STRESS-05: Determinisme maintenu sous stress

## Cas limites a tester
- Texte vide / null / undefined
- Texte de taille maximale (10MB)
- Caracteres Unicode extremes (emojis, RTL, zalgo)
- Caracteres de controle
- Injections malicieuses (XSS, SQL patterns)
- Formats binaires deguises en texte

## Plan de tests
- Tests edge cases: ~15 tests
- Tests stress: ~10 tests
- Commandes: npx vitest run

## No-Go Criteria
1. Tests < 100% PASS
2. Exception non geree
3. Memory leak sous stress
4. Corruption de donnees

## Rollback Plan
1. Supprimer tests/stress/
2. Documenter dans NCR_LOG.md

## Decisions conservatrices prises
- Tests uniquement (pas de modification de code)
- Tous les cas limites doivent etre rejetes proprement
