# DESIGN — PHASE 30.0

## Objectif
Tests end-to-end du pipeline complet: Mycelium -> Genome Integration -> Genome Analysis.
Verifier que la chaine de confiance fonctionne de bout en bout.

## Scope
- Fichiers a creer:
  - tests/e2e/pipeline.test.ts (tests E2E)
  - tests/e2e/fixtures/ (donnees de test)
- Fichiers a modifier:
  - package.json racine (si workspace test script)
- Modules impactes: Aucune modification (tests externes uniquement)

## Invariants impactes
- INV-E2E-01: Pipeline Mycelium->Genome produit resultat deterministe
- INV-E2E-02: Rejets Mycelium propagent correctement jusqu'a sortie finale
- INV-E2E-03: seal_ref present dans toute la chaine
- INV-E2E-04: Pas de modification des modules FROZEN (Mycelium, Sentinel)
- INV-E2E-05: Pas de modification du module SEALED (Genome core)

## Rejets/Erreurs attendus
- Propagation correcte de tous les REJ-MYC-* a travers le pipeline
- Propagation correcte de tous les REJ-INT-* (gates integration)

## Plan de tests
- Tests E2E: ~20 tests
  - Happy path pipeline complet
  - Rejection propagation E2E
  - Determinism verification
  - Performance baseline
- Commandes: npm test (depuis racine ou tests/e2e/)

## No-Go Criteria
1. Tests < 100% PASS
2. Modification d'un module FROZEN/SEALED
3. Pipeline non deterministe
4. seal_ref absent dans resultats

## Rollback Plan
1. Supprimer tests/e2e/
2. Restaurer package.json si modifie
3. Documenter dans NCR_LOG.md

## Decisions conservatrices prises
- Tests uniquement (pas de modification de code existant)
- Fixtures statiques pour determinisme
- Aucune dependance externe nouvelle
