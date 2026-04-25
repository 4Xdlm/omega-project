# BENCH ANAPHORE GATE β — BENCH_ANAPHORE_BETA_20260425

**Date** : 2026-04-25T11:34:11.791Z
**Runs** : 72 (12 scènes × 2 modes × 3 seeds)
**Modèle** : qwen3:32b
**Durée** : 101 min
**Threshold** : 10%
**Parent** : commit 9859659d (engine.ts WIP Anaphore Gate scellé shadow default)

## Stats par classe

| Classe | Mean opening_rep | Std | CV | Exceeded | Total |
|---|---|---|---|---|---|
| Adversarial | 0.2973 | 0.1258 | 0.423 | 36 | 36 |
| Canonical | 0.2723 | 0.0855 | 0.314 | 24 | 24 |
| Borderline | 0.3888 | 0.1079 | 0.278 | 12 | 12 |

## Stats par scène

| Scene | Class | Mean opening_rep | CV inter-seeds | Exceeded | Runs |
|---|---|---|---|---|---|
| ANA01 | adversarial | 0.4905 | 0.192 | 6 | 6 |
| ANA02 | adversarial | 0.2039 | 0.277 | 6 | 6 |
| ANA03 | adversarial | 0.2669 | 0.419 | 6 | 6 |
| ANA04 | adversarial | 0.2122 | 0.231 | 6 | 6 |
| ANA05 | adversarial | 0.2309 | 0.197 | 6 | 6 |
| ANA06 | adversarial | 0.3793 | 0.150 | 6 | 6 |
| CAN01 | canonical | 0.2437 | 0.185 | 6 | 6 |
| CAN02 | canonical | 0.3377 | 0.355 | 6 | 6 |
| CAN03 | canonical | 0.2182 | 0.297 | 6 | 6 |
| CAN04 | canonical | 0.2897 | 0.191 | 6 | 6 |
| BRD01 | borderline | 0.4394 | 0.118 | 6 | 6 |
| BRD02 | borderline | 0.3383 | 0.383 | 6 | 6 |

## Gate verdicts (multi-critère)

| ID | Critère | Observé | Seuil | PASS |
|---|---|---|---|---|
| B1 | Discrimination adv vs canon | Δmean = 0.0250 (adv=0.2973 - canon=0.2723) | ≥ 0.05 | ❌ |
| B2 | Borderline placement | border=0.3888 (canon=0.2723 | adv=0.2973) | mean(canon) < mean(border) < mean(adv) | ❌ |
| B3 | Faux positifs canon | 24/24 EXCEEDED | ≤ 1/24 | ❌ |
| B4 | CV inter-seeds par famille | adv=0.423 canon=0.314 border=0.278 | ≤ 0.3 chaque famille | ❌ |
| B5 | NO-OP runtime mode shadow | 36/36 paires divergentes | = 0 | ❌ |

## VERDICT GLOBAL : REJECT

**0/5 critères PASS**

→ REJECT métrique : abandonner ou recalibrer seuil/feature
