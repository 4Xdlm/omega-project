# JUDGE DRIFT — ECC THEN/NOW (WS-B0c)

**Date** : 2026-06-01 (run Architecte, terminal Windows, Ollama qwen3:32b, temp 0, k=3).
**Mode** : bench, READ-ONLY. 0 patch, 0 recalibration, 0 floor change.
**Outil** : `scripts/metrology/wsb0c-ecc-then-now.ts`. Données : `JUDGE_DRIFT_ECC_THEN_NOW.csv` + `judge_drift_ecc_then_now_summary.json`.

## Question

Le juge LLM (ECC) mesure-t-il aujourd'hui comme à l'époque du calibrage ? Re-score des 7 passages ALTERNANCE 2026-03-26 (ECC historique enregistré) avec `computeECC` actuel.

## Résultats

| Passage | type | hist_ECC | now_ECC (k=3) | std | Δ | t14d now | verdict |
|---|---|---|---|---|---|---|---|
| A_baseline | menace | 95.2 | 97.66 | **0** | +2.49 | 93.74 | stable |
| B_exemplar | menace | 93.5 | 89.34 | **0** | −4.13 | 90.07 | biased_shift |
| C_sysprompt | menace | 91.7 | 92.77 | **0** | +1.07 | 88.26 | stable |
| D_antimono | menace | 83.3 | 93.93 | **0** | **+10.59** | 91.79 | biased_shift |
| E_skeleton | menace | 87.6 | 93.62 | **0** | +6.01 | 93.63 | biased_shift |
| F_mask | menace | 94.4 | 92.28 | **0** | −2.12 | 93.39 | stable |
| C_sysprompt | revelation | 92.8 | 89.26 | **0** | −3.51 | 85.17 | biased_shift |

**Global** : mean Δ **+1.49**, median **+1.07**, MAE 4.27, RMSE 5.2, std_delta 4.99, min −4.13, max +10.59. %|Δ|>2 = 86 %, >5 = 29 %, >10 = 14 %. Verdicts : 3 stable / 4 biased_shift / **0 unstable_variance**.

## Verdict (2 conclusions séparées)

### ✅ 1. Le juge LLM est REPRODUCTIBLE (preuve à 100 %)
`now_ECC_std = 0` sur **7/7** passages (k=3, temp 0) ; les multishots interiority/impact sont quasi tous stdev 0.0 (un seul impact à 1.9, absorbé). **À température 0, le juge ECC est déterministe : re-scorer donne le même résultat.** C'est la vérité mathématique reproductible recherchée : **0 variance LLM**. `unstable_variance = 0/7`.

### ⚠️ 2. La dérive then/now n'est PAS isolable (evidence-gap, comme prévu)
- Tendance centrale **stable** : mean +1.49 / median +1.07 → en moyenne, l'ECC d'aujourd'hui ≈ l'historique (léger biais positif).
- MAIS dispersion réelle : 4/7 `biased_shift`, jusqu'à **D_antimono +10.59** et E +6.01. Comme `std=0`, **cette dispersion n'est PAS du bruit LLM** → c'est le **confound de contrat** annoncé : j'ai utilisé un contrat scène-**type** uniforme (menace=arc fear ; revelation=surprise/awe→sadness), alors que le contrat ALTERNANCE **original n'est pas sauvegardé**.
- Donc Δ confond **dérive-juge** + **écart-contrat (type vs original)**. Le k=3 isole la variance (≈0) ; il ne sépare PAS dérive-juge et écart-contrat. **Sans le contrat d'époque, on ne peut PAS prouver à 100 % une (non-)dérive du juge.**

Indice corroborant : D_antimono avait le plus bas hist_ECC (83.3) et bondit à 93.9 avec MON contrat fear uniforme → c'est un effet de **match de contrat**, pas une preuve de dérive de formule. Le profil « mean≈0 + forte dispersion » est la signature d'une sensibilité au contrat, pas d'une dérive systématique.

## Conséquences

1. **Détermination/reproductibilité ECC : PROUVÉE** (temp 0, std 0). Bonne nouvelle pour la dépendance M4/DEC-009 (le juge ne « bouge » pas d'un run à l'autre).
2. **Dérive then/now ECC : INCONCLUSIVE** — bloquée par le même trou que partout dans WS-B : le **contrat/packet d'entrée de l'époque n'est pas sauvegardé** (cf. RCI packet WS-B1, holdout ρ). Troisième occurrence du même evidence-gap.
3. **Ne pas surinterpréter** les +10.59 / +6.01 comme « le juge est devenu laxiste » : c'est très probablement l'écart entre mon contrat-type et le contrat original. Conforme au principe : *un score n'est comparable que si le contrat d'entrée est identique* (règle INVALID_PACKET, DEC-013).

## VERDICT
- Statut : PASS (test exécuté, juge reproductible prouvé ; dérive inconclusive par evidence-gap).
- Confiance : Haute sur la reproductibilité (std 0, 7/7) ; Basse sur la dérive (contrat original manquant).
- Forces : prouve la déterminisme du juge LLM (0 variance) ; central stable (+1.49) ; honnête sur le confound contrat (ne le maquille pas en dérive).
- Faiblesses : (1) contrat ALTERNANCE original non sauvegardé → dérive-juge non isolable ; (2) contrat scène-type = approximation → 4/7 biased_shift attribuables au match-contrat ; (3) 7 passages seulement.
- Risques restants : conclure « juge dérivé » serait faux (confond contrat) ; conclure « juge identique » serait non prouvé. Le seul fait dur : **juge reproductible**.
- Action requise : pour une preuve de dérive à 100 %, retrouver/reconstruire les contrats ALTERNANCE originaux (evidence-gap à tracer, NE PAS bricoler). En l'état : le juge ECC est **utilisable car reproductible** ; la dérive reste OPEN. M4/DEC-009 : reproductibilité OK, mais rester gelé tant que le contrat d'entrée n'est pas garanti complet (DEC-013).
