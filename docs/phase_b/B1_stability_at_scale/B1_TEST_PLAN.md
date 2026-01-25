# OMEGA - B.1 TEST PLAN (Stability at Scale)
# Dependency: PHASE_A_ROOT_HASH = 63cdf1b5fd7df8d60dacfb2b41ad9978f0bbc7d188b8295df0fcc0c2a9c1673e

## Objectif

Prouver la stabilite sur sequences longues + multi-SSX + derive lente.

## Matrice Tests

### Tests Determinisme/Structure

| ID | But | Entrees | Oracles | Invariant |
|----|-----|---------|---------|-----------|
| B1-T01 | Determinism Double Run | SSX fixe, seed fixe | hash(run1) == hash(run2) | INV-B1-01 |
| B1-T02 | Long Sequence Growth | SSX, N croissant | metrics stables, no drift | INV-B1-02 |
| B1-T03 | Multi-SSX Batch | K SSX distincts | coherence cross-SSX | INV-B1-02 |
| B1-T04 | Slow Drift Injection | derive progressive | detection drift | INV-B1-02 |
| B1-T05 | SDI Stability Under Stress | charge elevee | SDI monotonic | INV-B1-02 |

### Tests Axe EMOTION/TRUTH

| ID | But | Entrees | Oracles | Invariant |
|----|-----|---------|---------|-----------|
| B1-T06 | Emotion Drift (long-run) | texte long | E_delta(t) <= tau_em pour tout t | INV-B1-02 |
| B1-T07 | Emotion Consistency (multi-SSX) | K SSX, meme cible | distribution(E_delta) stable | INV-B1-02 |
| B1-T08 | Truth Gate No-Silent-Contradiction | contraintes contradictoires | blocage explicite TRUTH_GATE | INV-B1-05 |
| B1-T09 | Dual-Oracle Emotion | texte quelconque | J1 ~= Oracle2, sinon FAIL | INV-B1-04 |

### Tests Adversariaux Oracle2 (obligatoires)

| ID | But | Entrees | Oracles | Invariant |
|----|-----|---------|---------|-----------|
| B1-T10 | Negation Flip | "pas content" vs "content" | inversion detectee | INV-B1-06 |
| B1-T11 | Sarcasm Downscale | marqueurs sarcasme | confidence baisse (jamais hausse) | INV-B1-06 |
| B1-T12 | Lexicon Poisoning Guard | lexique modifie | hash change => run FAIL | INV-B1-03 |

## Oracles (automatiques)

- Hash equality: run1 vs run2
- Drift detector: thresholds = symboles tau_*
- Gate compliance: logs complets, 100% passage

## Verdict Global

| Condition | Resultat |
|-----------|----------|
| Tous tests PASS | PASS |
| Un test FAIL | FAIL |
| Preuve manquante | FAIL |
| Derive silencieuse | FAIL |
| Hash manifest incomplet | FAIL |

---

FIN TEST PLAN B.1 v1.0
