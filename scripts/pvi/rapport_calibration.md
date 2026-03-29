# Rapport Calibration Phase P2

**Date**: 2026-03-29
**Corpus**: 218 titres (A+B), split 80/20
**Train**: 176 | **Test (gele)**: 42

## Modele 1: MINIMAL (4 variables)

### MINIMAL — LogisticRegression
- AUC-ROC (5-fold CV): **0.9802** (std=0.0138)
- Accuracy (train): 0.9318
- F1 (train): 0.9318
- Confusion matrix: TN=82 FP=8 FN=4 TP=82
- Intercept: -4.4221
- Coefficients:
  - Omega: +4.1034
  - I: +3.0344
  - FL: -2.5362
  - T: +1.2259

## Modele 2: INTERMEDIAIRE (6 variables)

### INTERMEDIAIRE — LogisticRegression
- AUC-ROC (5-fold CV): **0.9541** (std=0.0289)
- Accuracy (train): 0.8920
- F1 (train): 0.8927
- Confusion matrix: TN=78 FP=12 FN=7 TP=79
- Intercept: -6.2725
- Coefficients:
  - Omega: +2.9733
  - I: +2.5597
  - FL: -2.5001
  - S: +1.7983
  - N_rev: +0.9612
  - T: +0.4892

### INTERMEDIAIRE — GradientBoosting
- AUC-ROC (5-fold CV): **0.9562** (std=0.0262)
- Accuracy (train): 1.0000
- Feature importances:
  - Omega: 0.7539
  - FL: 0.1484
  - T: 0.0412
  - I: 0.0321
  - S: 0.0189
  - N_rev: 0.0055

## Modele 3: COMPLET (8 + interactions)

### COMPLET — LogisticRegression
- AUC-ROC (5-fold CV): **0.9753** (std=0.0233)
- Accuracy (train): 0.9205
- F1 (train): 0.9176
- Confusion matrix: TN=84 FP=6 FN=8 TP=78
- Intercept: -3.5036
- Coefficients:
  - MS: -2.8249
  - Omega: +2.3674
  - I: +1.8589
  - FL: -1.7434
  - S: +1.6608
  - I_T: +1.5662
  - FL_1_Omega: -1.3887
  - N_rev: +0.9153
  - U: -0.5911
  - T: +0.4357

### COMPLET — GradientBoosting
- AUC-ROC (5-fold CV): **0.9922** (std=0.0114)
- Accuracy (train): 1.0000
- Feature importances:
  - FL_1_Omega: 0.7154
  - MS: 0.1379
  - Omega: 0.0492
  - S: 0.0435
  - I_T: 0.0358
  - FL: 0.0105
  - I: 0.0055
  - U: 0.0015
  - T: 0.0006
  - N_rev: 0.0000

## Decision adoption modele

| Modele | AUC-ROC CV |
|--------|----------|
| MINIMAL (4v) | **0.9802** |
| INTERMEDIAIRE (6v) | **0.9541** |
| COMPLET (8v+2int) | **0.9753** |

**Modele adopte: MINIMAL**
Raison: AUC=0.9802, regle de parcimonie appliquee.

## Hypotheses H1-H3

### H1 — U poids double (0.8 -> 1.6)
- AUC PVI_base: 0.9739
- AUC PVI_H1 (U=1.6): 0.9724
- Delta: -0.0016
- Verdict: REJETER

### H2 — Arc_rev(N>=4) = 1.35
- AUC PVI_base: 0.9739
- AUC PVI_H2: 0.9744
- Delta: +0.0005
- Verdict: REJETER

### H3 — PVI_v2 avec penalite FL*(1-Omega)
- AUC PVI_base: 0.9739
- AUC PVI_H3: 0.9739
- Delta: +0.0000
- Verdict: REJETER

## Seuils culturels FR vs EN

### FR (N=62)
- Coefficients:
  - Omega: +2.3561
  - I: +1.7401
  - FL: -0.9754
  - T: +0.6271

### EN (N=114)
- Coefficients:
  - Omega: +2.9825
  - FL: -2.6723
  - I: +2.3872
  - T: +0.8973

## Verdict

**P2 PASS** (AUC=0.9802, seuil=0.78)

Modele MINIMAL gele dans coefficients_v2.json.
Test set gele dans test_set_gele.csv (42 titres).
NE PLUS MODIFIER jusqu'a Phase P3.
