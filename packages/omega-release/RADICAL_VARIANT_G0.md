# Phase G.0 — Radical Variant

## What was built
Production hardening and release management system for OMEGA.

## Module Count
7 modules: version, changelog, release, install, selftest, policy, invariants + CLI

## Source Files
40 TypeScript source files

## Test Results
- 218 tests across 25 test files
- 0 failures
- Coverage: all source modules tested

## Invariants
10 invariants (INV-G0-01 through INV-G0-10), all verified

## Key Decisions
1. JSON-based simulated archives for deterministic build testing
2. Direct node:crypto for hashing (no canon-kernel dependency)
3. Static import verification in self-test (ESM compatible)
4. Aligned manifest hash computation between generator and verifier
5. Negative lookahead regex for version extraction from filenames

## SEALED Packages
All SEALED packages verified untouched by non-regression testing.
