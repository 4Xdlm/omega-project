# MEASURE_V2_3_MIN_AXIS_SIGNAL_EXPLORATORY : le Scalpel relève le plancher (min_axis), pas le plafond (composite)

**Status**: EXPLORATORY (signal observé, NON pré-enregistré, NON décisionnel)
**Sprint**: V2.3-A P4/P5 | **Date**: 2026-05-29
**Source de données**: `C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_3_P4_AB_verdict.json` + `V2_3_P4_AB_rows.jsonl` (36 proses, 9 paires, 2 seeds)
**Réfs**: ADR_V2_3 §12 (RÉSOLU/SHADOW), NCR_V2_3_ORACLE_ECC_14D_INCOMPATIBLE, design P4 §4 (kill-switch pré-enregistré sur `composite`)

## Observation (chiffres figés)
| Métrique | Contrôle (naïf) | Traitement (scalpel) | Δ |
|---|---|---|---|
| composite REWRITE_ORACLE | 76,06 | 76,99 | +0,93 (CI95 [−1,04 ; +2,91], non sig.) |
| **min_axis** (axe le plus faible) | **38,85** | **44,09** | **+5,24** |

Le verdict pré-enregistré porte sur `composite` (seuil +2,0) → **SHADOW**. Le bond `min_axis` est **hors kill-switch** : il n'a JAMAIS servi à décider, conformément à la doctrine anti-post-hoc (P3, EMP-12, 18 Règles d'Or).

## Mécanisme causal candidat (à prouver, non établi)
Hypothèse : découper un texte sur ses **fractures sémantiques réelles** (Scalpel) produit des segments cohérents en eux-mêmes ; le LLM régénère alors sans avoir à recoller des morceaux hétérogènes. À l'inverse, un découpage naïf (mots ~égaux, frontières arbitraires) place parfois une coupe au milieu d'une unité de sens → le segment force le LLM à un raccord incohérent → **effondrement local d'un sous-axe** (l'axe le plus faible chute).

Conséquence prédite : le Scalpel **n'élève pas le plafond esthétique** (composite ~inchangé, +0,93 sous le bruit) **mais relève le plancher** (min_axis +5,24) = **réduction de l'échec catastrophique** sur l'axe le plus fragile. C'est un mécanisme de *stabilité*, pas de *génie littéraire*.

## Statut décisionnel
- Signal **réel** (Δ +5,24 >> bruit σ≈2 sur cet axe) mais **exploratoire** : non pré-enregistré comme critère, n=9 modeste, pairing régional imparfait.
- **Ne promeut PAS** le couplage. N'override PAS le verdict SHADOW. « Dans le dossier, pas au volant » (ChatGPT) / « mécanisme de sécurité, pas de génie » (Gemini).

## Loi candidate (à ratifier en sprint dédié)
> **[CANDIDATE] LAW-CHUNK-MINAXIS-STAB-001** — En mode réécriture, le découpage sémantique (Scalpel `chunkAdaptive`) agit comme **stabilisateur du `min_axis`** : il relève le plancher de l'axe Oracle le plus faible (effet observé +5,24, n=9) sans élever significativement le composite. **Statut : NON validé.** Condition de ratification : bench V2.3-B dédié, `min_axis` pré-enregistré comme co-critère, **n ≥ 20**, seuil figé avant run, métrique inchangée en cours de route.

## Condition de re-test (futur V2.3-B, NON automatique)
`min_axis` co-critère pré-enregistré · n ≥ 20 · seuil défini avant run · coût qwen accepté · zéro changement de métrique en cours de route. Pas de re-bench immédiat (transformerait un résultat secondaire en cible post-hoc).

## Verdict
- Statut : EXPLORATORY — consigné, non promu.
- Action requise : aucune. Réservé à un éventuel sprint V2.3-B sur décision Architecte.
