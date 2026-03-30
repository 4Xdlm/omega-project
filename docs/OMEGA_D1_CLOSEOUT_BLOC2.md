# OMEGA — RAPPORT D1 CLOSEOUT — BLOC 2 SHADOW JUDGES
## Standard : NASA-Grade L4 / DO-178C Level A
## Date : 2026-03-30 | HEAD : e939181f

## VERDICTS PAR COMPOSANT

| Composant | r(composite) | Verdict D1 | Cause |
|-----------|-------------|------------|-------|
| DUAL_COMBINED | 0.94 | PASS SHADOW | r≥0.60 — ARC=LOCAL window 1 (miroir). Intégration décisionnelle DIFFÉRÉE. |
| CI_L37 corpus | ~0 | REJETÉ | Sature 100. BB-C01 sub=constante ~0.099. Zéro variance. |
| CI_L37 omega | ~0 | REJETÉ | Même cause. Bande trop étroite. |
| PROFILE_FR | -0.218 | REJETÉ | Anti-corrélé. Features FR humaines ≠ régime RLHF. |
| PROFILE_EN_MIN | faible | REJETÉ | Informatif seulement. |
| PROFILE_EN_MAX | faible | REJETÉ | Idem. |

## CLIFF GATE

- cliff moyen 32 runs : ~0.40
- Runs cliff < 0.30 : 0/32 (0%)
- Micro-API insuffisante → guillotine déterministe (e939181f)

## JUSTIFICATION CAUSALE

CI_L37 : L37 prouvée sur corpus humain (881 œuvres). BB-C01 montre sub Sonnet ≈ 0.099 constante. Variable de commande = constante régime → non discriminant intra-OMEGA.

PROFILES : Poids dérivés corpus humain. Régime RLHF ≠ prose humaine. Calque direct inopérant.

DUAL : À window=1 ARC=LOCAL → r≈1.0 mécanique. Valeur réelle en multi-briques.

## MODULES DORMANTS

- src/scoring/ci-l37.ts — dormant, REJETÉ D1
- src/scoring/language-profiles.ts — dormant, REJETÉ D1
- src/scoring/dual-scale.ts — ACTIF monitoring

## ACTIONS COMMIT e939181f

1. CI_L37 et PROFILES retirés imports + pipeline engine.ts
2. Cliff gate : micro-API → guillotine déterministe
3. DUAL_SCALE conservé monitoring [SHADOW]
4. Documentation explicite dans engine.ts

## ÉTAT FINAL BLOC 2 : CLOSÉ

Tests : 2022 PASS | HEAD : e939181f
