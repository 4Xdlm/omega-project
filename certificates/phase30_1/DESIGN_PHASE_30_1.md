# DESIGN — PHASE 30.1

## Objectif
Etablir les baselines de performance et creer des benchmarks pour le pipeline.
Verifier qu'aucune regression de performance n'est introduite.

## Scope
- Fichiers a creer:
  - tests/benchmarks/pipeline.bench.ts
  - tests/benchmarks/vitest.config.ts
- Fichiers a modifier: aucun
- Modules impactes: Aucune modification (benchmarks externes)

## Invariants impactes
- INV-PERF-01: Pipeline complet < 100ms pour texte standard
- INV-PERF-02: Validation Mycelium < 10ms pour texte < 10KB
- INV-PERF-03: Integration adapter < 5ms overhead
- INV-PERF-04: Determinisme preserve sous charge
- INV-PERF-05: Pas de memory leak detecte

## Metriques cibles
- Throughput: > 100 validations/seconde
- Latency P95: < 50ms
- Memory: < 50MB baseline

## Plan de tests
- Tests benchmark: ~10 tests
  - Pipeline throughput
  - Latency percentiles
  - Memory baseline
  - Concurrent load
- Commandes: npx vitest bench

## No-Go Criteria
1. Benchmarks fails
2. Performance degradation > 20%
3. Memory leak detected

## Rollback Plan
1. Supprimer tests/benchmarks/
2. Documenter dans NCR_LOG.md

## Decisions conservatrices prises
- Benchmarks uniquement (pas d'optimisation de code)
- Baselines documentes pour reference future
