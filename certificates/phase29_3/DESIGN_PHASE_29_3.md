# DESIGN — PHASE 29.3

## Objectif
Integration layer Mycelium -> Genome avec propagation stricte des rejets et tracabilite audit via seal_ref.

## Scope
- Fichiers crees:
  - packages/genome/src/integrations/myceliumTypes.ts
  - packages/genome/src/integrations/myceliumAdapter.ts
  - packages/genome/test/integration/myceliumAdapter.test.ts
- Fichiers modifies:
  - packages/genome/src/index.ts (exports ajoutes)
  - packages/genome/vitest.config.ts (alias mycelium)
  - packages/genome/package.json (dependance mycelium)
- Modules impactes: genome (extension), mycelium (lecture seule)

## Invariants impactes
- INV-INT-01: Mycelium module is NOT modified (FROZEN)
- INV-INT-02: All REJ-MYC-* codes propagated without loss
- INV-INT-03: Gates are fail-fast (no silent fallback)
- INV-INT-04: seal_ref always attached
- INV-INT-05: Deterministic output for same input

## Rejets/Erreurs attendus
- REJ-INT-001: Invalid request_id (empty/whitespace)
- REJ-INT-002: Invalid text (non-string)
- REJ-MYC-*: Propagation transparente des rejets Mycelium

## Plan de tests
- Tests unitaires: 0 (couvert par integration)
- Tests integration: 38
- Commandes: npm test (dans packages/genome/)

## No-Go Criteria
1. Tests < 100% PASS
2. Modification d'un module FROZEN
3. NCR bloquante non resolue

## Rollback Plan
1. git checkout HEAD -- packages/genome/src/integrations/
2. git checkout HEAD -- packages/genome/test/integration/
3. Restaurer index.ts, vitest.config.ts, package.json
4. Documenter dans NCR_LOG.md

## Decisions conservatrices prises
- Alias vitest pour resoudre mycelium (evite modification FROZEN)
- seal_ref systematique pour audit trail
- Types discrimines (ok: true/false) pour securite type
