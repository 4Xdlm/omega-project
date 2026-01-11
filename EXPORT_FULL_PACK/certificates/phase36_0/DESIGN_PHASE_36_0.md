# DESIGN — PHASE 36.0 — RED TEAM

## Objectif

Audit interne hostile - validation de la resistance aux attaques.

## Scope

- Fichiers a creer: certificates/phase36_0/* (DESIGN, CERT, SCOPE, HASHES, FROZEN)
- Fichiers a creer: evidence/phase36_0/* (tests.log, commands.txt)
- Fichiers a creer: history/HISTORY_PHASE_36_0.md

## Red Team Verification

### Attack Vectors Tested

| Vector | Test Suite | Status |
|--------|------------|--------|
| Malformed input | edgecases.test.ts | PASS |
| Boundary values | stress.test.ts | PASS |
| Injection attempts | validation tests | PASS |
| Resource exhaustion | stress.test.ts | PASS |
| Invalid state transitions | governance.test.ts | PASS |

### Hostile Input Categories

| Category | Tests | Result |
|----------|-------|--------|
| Empty strings | Multiple | REJECTED correctly |
| Oversized input | Scale tests | HANDLED correctly |
| Special characters | Edge cases | SANITIZED correctly |
| Unicode edge cases | Validation | PASS |
| Null bytes | Genome validation | REJECTED |
| Control characters | Genome validation | REJECTED (NCR-002 documented) |

## Invariants Tested Under Attack

- All 101+ invariants hold under adversarial conditions
- Refusal system functions correctly
- Governance gates block invalid transitions

## No-Go Criteria

1. Security vulnerability discovered
2. Invariant bypass possible
3. Unhandled attack vector

## Rollback Plan

1. git checkout -- <fichiers crees>
2. Supprimer certificates/phase36_0/, evidence/phase36_0/
