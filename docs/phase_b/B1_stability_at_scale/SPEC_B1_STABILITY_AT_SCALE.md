# OMEGA - SPEC B.1: Stability at Scale
# Status: SPECIFIED (non execute)
# Phase: B.1
# Dependency: PHASE_A_ROOT_HASH = 63cdf1b5fd7df8d60dacfb2b41ad9978f0bbc7d188b8295df0fcc0c2a9c1673e

## 0) Scope Lock

- Cette spec NE MODIFIE PAS A.5 (interdit)
- Aucun appel A.6 (CPP) (interdit)
- Objectif: prouver la stabilite longue (derive lente, SDI stable, Emotion stable, SSX stable)

## 1) Entrees

- Corpus / SSX: hors A.6 (obligatoire)
- Seeds deterministes (obligatoire)
- Config: tau, N, T_* = symboles (pas de magic numbers)

## 2) Sorties (artefacts)

- B1_RUN_REPORT.md (resultats + verdict)
- B1_METRICS.json (M1..M12 subset utilise)
- B1_FAILURES/ (cas minimaux reproductibles)
- B1_HASH_MANIFEST.txt (hash chain)

## 3) Invariants (numerotes)

### INV-B1-01: Determinism
Same inputs -> same outputs -> same hashes.
Verification: double run, hash comparison.

### INV-B1-02: No Silent Drift
Derive detectee ou FAIL. Aucune derive silencieuse toleree.
Verification: drift detector avec seuils symboliques.

### INV-B1-03: Phase A Untouched
Preuve: diff=0 sur perimetre A (254 fichiers).
Verification: hash comparison vs PHASE_A_PACKAGES_HASH.txt.

### INV-B1-04: Oracle Consensus
J1 et Oracle2 doivent s'accorder ou FAIL/ESCALADE.
Verification: dual-oracle comparison sur chaque run.

### INV-B1-05: Gate Completeness
Toute execution passe par TRUTH_GATE et EMOTION_GATE.
Verification: logs gates non vides, compliance 100%.

### INV-B1-06: Evidence Required
Si confidence > 0, evidence non vide.
Verification: assertion sur chaque resultat Oracle2.

## 4) Tests (a executer)

- B1-T01: Determinism Double Run
- B1-T02: Long Sequence Growth
- B1-T03: Multi-SSX Batch
- B1-T04: Slow Drift Injection
- B1-T05: SDI Stability Under Stress
- B1-T06: Emotion Drift (long-run)
- B1-T07: Emotion Consistency (multi-SSX)
- B1-T08: Truth Gate No-Silent-Contradiction
- B1-T09: Dual-Oracle Emotion
- B1-T10: Negation Flip (adversarial)
- B1-T11: Sarcasm Downscale (adversarial)
- B1-T12: Lexicon Poisoning Guard

## 5) Criteres de sortie

PASS si et seulement si:
- Tous tests PASS
- Zero derive silencieuse
- Preuves/hashes complets
- Rapport auditable par tiers

## 6) Axe prioritaire B.1

Axe = EMOTION/TRUTH

### Oracles (sans nombres magiques)

- tau_em : seuil derive emotionnelle (configurable)
- tau_truth : seuil tolerance contradiction (par defaut 0, sinon symbole)
- Regle: si contradiction detectee => TRUTH_GATE doit bloquer (sinon FAIL)

### Mesures minimales (subset metrics)

- M1 Contradiction_Rate
- M2 Canon_Compliance (ou TruthGate_Blocking_Rate si CANON non present)
- M5 Memory_Integrity (stabilite temporelle)
- E_delta = emotionalDistance(e_ref, e_t) (defini par judge)

## 7) Variante Radicale: Dual-Oracle

Innovation forcee: 2 estimateurs emotion independants.
- J1: existant (EmotionV2 complet)
- Oracle2: Lexicon + VAD (independant, attaquable)
Si desaccord => FAIL/ESCALADE.
Reduit le risque "monoculture de juge".

---

FIN SPEC B.1 v1.0
