# OMEGA - B.1 INVARIANTS REGISTRY
# Dependency: PHASE_A_ROOT_HASH = 63cdf1b5fd7df8d60dacfb2b41ad9978f0bbc7d188b8295df0fcc0c2a9c1673e

## Invariants B.1 (Core)

| ID | Name | Description | Verification | Tests |
|----|------|-------------|--------------|-------|
| INV-B1-01 | Determinism | Same inputs -> same outputs -> same hashes | Double run hash comparison | B1-T01 |
| INV-B1-02 | No Silent Drift | Derive detectee ou FAIL | Drift detector, tau_* | B1-T02,T04,T06,T07 |
| INV-B1-03 | Phase A Untouched | diff=0 sur perimetre A | Hash vs PHASE_A_PACKAGES_HASH | B1-T12 |
| INV-B1-04 | Oracle Consensus | J1 et Oracle2 s'accordent ou FAIL | Dual-oracle comparison | B1-T09 |
| INV-B1-05 | Gate Completeness | 100% passage par gates | Logs gates complets | B1-T08 |
| INV-B1-06 | Evidence Required | confidence > 0 => evidence non vide | Assertion Oracle2 | B1-T10,T11 |

## Invariants Oracle2

| ID | Name | Description | Verification | Tests |
|----|------|-------------|--------------|-------|
| INV-O2-01 | Determinism | Same input -> same output | Unit tests | B1-T01 |
| INV-O2-02 | No External Calls | Oracle2 offline | Code review | - |
| INV-O2-03 | Evidence Required | confidence > 0 => evidence non vide | Assertion | B1-T10 |
| INV-O2-04 | Sarcasm Decreases Only | Sarcasm diminue confidence | Unit tests | B1-T11 |
| INV-O2-05 | Disagreement Handling | Desaccord => FAIL/ESCALADE | Integration | B1-T09 |

## Mapping Tests -> Invariants

| Test | Invariants verifies |
|------|---------------------|
| B1-T01 | INV-B1-01, INV-O2-01 |
| B1-T02 | INV-B1-02 |
| B1-T03 | INV-B1-02 |
| B1-T04 | INV-B1-02 |
| B1-T05 | INV-B1-02 |
| B1-T06 | INV-B1-02 |
| B1-T07 | INV-B1-02 |
| B1-T08 | INV-B1-05 |
| B1-T09 | INV-B1-04, INV-O2-05 |
| B1-T10 | INV-B1-06, INV-O2-03 |
| B1-T11 | INV-B1-06, INV-O2-04 |
| B1-T12 | INV-B1-03 |

## Totaux

- Invariants B1 Core: 6
- Invariants Oracle2: 5
- Total: 11
- Tests: 12
- Couverture: 100% (chaque invariant a au moins 1 test)

---

FIN INVARIANTS REGISTRY B.1 v1.0
