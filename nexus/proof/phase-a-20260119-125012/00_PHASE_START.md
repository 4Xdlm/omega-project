# PHASE A — DÉMARRAGE

**Date**: 2026-01-19T12:50:12+00:00
**Commit baseline**: 1afed35 (docs-scan-v2.0)
**Objectif**: Atlas + Raw + Proof + Tooling + CI + Docs
**Ambition**: MAXIMUM
**Durée estimée**: 15-20h

## Index Proof Pack

- 00: Ce fichier (démarrage + index)
- 01: RUN_COMMANDS.txt (toutes commandes exécutées)
- 02: RUN_OUTPUT.txt (tous outputs)
- 03: TEST_REPORTS.txt (résultats tests)
- 04: DIFF_SUMMARY.md (git diff --stat)
- 05: HASHES_SHA256.txt (hashes tous fichiers)
- 06: CHECKPOINT_*.md (checkpoints par phase)
- 07: FROZEN_PROOF_*.txt (vérif FROZEN modules)
- 08: WORKSPACE_INTEGRATION.md
- 09: ARCHITECTURE_NOTES.md
- 10: API_REFERENCE.md
- 11: SESSION_SAVE_PHASE_A_FINAL.md
- 12: COMPLETION_REPORT.md

## Baseline

- Package manager: npm
- Workspaces: false
- Node version: v24.12.0
- Tests baseline: 1532/1532 PASS
- Typecheck baseline: PENDING (no script, will use tsc --noEmit)

## Scope

### Modules à implémenter
- **Atlas**: Query engine + Indexing + Subscriptions + Ledger integration
- **Raw**: File backend + SQLite (sql.js) + Encryption + Compression + TTL + Backup
- **Proof**: Snapshot/Verify improvements

### Intégrations
- Ledger → Atlas projections
- Raw → Atlas persistence
- Proof → manifest/verify

### Outillage
- Root scripts (test/typecheck/lint)
- Workspace integration

### CI
- GitHub Actions workflow (phase-a.yml)

### Docs
- README modules
- ADR (4 minimum)
- Architecture + API

## Invariants

- FROZEN modules: genome, mycelium, sentinel (UNTOUCHABLE)
- Déterminisme total (clock/rng injection)
- Tests ≥95% coverage
- TypeScript strict, 0 any en prod
- Errors typées par domaine
- Proof pack format strict
- SQL backend: sql.js ONLY (pure JS)
- Tests: bornés (max 10k), pas de contraintes temps
- FROZEN checkpoints après chaque phase

## NASA LOCK Activé

- Périmètre strict: nexus/{atlas,raw,proof-utils}, docs/
- SQLite: sql.js pure JS
- Tests: max 10k items, pas de timing assertions
- FROZEN: checkpoint après chaque phase
- ADR: obligatoire pour toute décision non prévue
- Rollback: si échec, reset hard au dernier checkpoint

## Exclusions Explicites

- ❌ Modification modules FROZEN
- ❌ Refactor global
- ❌ Reformat global
- ❌ Rename massif
- ❌ Breaking changes API existante (sauf nécessité + ADR)
- ❌ Dépendances natives (compilation)

## Existing State Analysis

### nexus/atlas
- STUB module with basic types
- Types: AtlasView, AtlasQuery, AtlasResult

### nexus/raw
- STUB module with basic types
- Types: RawEntry, StorageOptions, StorageResult

### nexus/proof-utils
- Partially implemented
- buildManifest() with timestamp injection
- verifyManifest() functional
- Types: ManifestEntry, Manifest, VerificationResult

## Extension Statement

This phase extends scan v2.0 (commit 1afed35) with new modules Atlas and Raw.
It does NOT modify the certified baseline state.
