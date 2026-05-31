# NCR-RCI-SENSOR-DEFECT: Le floor RCI 85 n'est pas justifié — capteur probablement mal calibré

**Status**: OPEN · **Severity**: HIGH · **Date**: 2026-05-31 · **Origine**: MIN_AXIS FLOOR AUDIT (commit `9f37b3aa`, `docs/audit/minaxis/`).
**Doctrine**: PROVE IT · NO RECALIBRATION WITHOUT CORPUS PROOF · NO THRESHOLD CHANGE WITHOUT BENCH.

## Issue
Le RCI (Rhythmic Control/Craft Index, poids 17 %, floor 85) est le `min_axis` bloquant le seal dans une majorité de cas, mais les preuves convergent vers un **défaut de capteur (B/C/D)**, pas un défaut de prose (A) :
- **Distribution** : 73 % des runs full-axes (37/51) sont sous le floor 85 ; distribution centrée à **82.4** → le floor 85 tombe à ~p72 de la sortie réelle du moteur. RCI seul bloqueur du seal dans 37 % des cas. (réf : `MINAXIS_FLOOR_AUDIT.md`, `MINAXIS_DISTRIBUTION.csv`).
- **Composite rapiécé (preuve code, `macro-axes.ts:computeRCI`)** : 5 sous-axes / 5 ont un historique de re-pondération défensive — rhythm scalé par confiance f(longueur) + tuné K2 ; `hook_presence` poids 0.20 + 75-neutre explicitement « to avoid dragging RCI » ; `euphony` 1.0→0.5 ; `voice_conformity` poids 0 (neutralisé) ; `signature` ≥30 %. Un capteur dont 5/5 composantes ont dû être bridées pour « éviter de tirer le score vers le bas » est un capteur instable.
- **Incohérence interne prouvée** : le repo a DÉJÀ abaissé les floors SII et MACRO_AXIS de 85→80 **avec corpus-proof** (« floor 85 = physically impossible per corpus, McCarthy/Hemingway »), mais **jamais RCI** — alors que RCI présente le même symptôme. (réf : `ART_AUDIT_REPORT.md:119` « RCI 76-82 … primary bottleneck »).
- **Floors 85/88 NON justifiés** par le corpus Phase W (413 œuvres).

## Mécanisme (pourquoi ça marche / quand ça échoue)
Le seal exige tous les axes ≥ floor. Si le floor RCI (85) est calibré au-dessus de ce que le moteur — voire la littérature publiée — peut atteindre, le seal devient mathématiquement inatteignable par le RCI, indépendamment de la qualité réelle du rythme. Le capteur « punit » alors une prose correcte.

## Options
1. **Statu quo** : garder floor 85. Risque : seal quasi inatteignable, faux rejets systémiques (effort nul, dette maintenue).
2. **Recalibration RCI sur corpus-proof** : recalculer RCI sur ~50 œuvres réelles (cf NCR lié + `MINAXIS_E_LITERARY_RECOMPUTE`) ; si la littérature publiée échoue le floor 85, baisser le floor RCI (ex. 80, aligné sur SII/MACRO) AVEC preuve corpus. **Recommandé, mais GATÉ par la preuve.**
3. **Refonte du composite RCI** : ré-architecturer les 5 sous-axes (dé-bricoler les pondérations défensives). Effort HIGH, risque, à éviter avant 2.

## Decision
**PENDING Architecte.** Pré-requis bloquant avant toute baisse de floor : `MINAXIS_E_LITERARY_RECOMPUTE` (recompute RCI sur prose réelle). **INTERDIT** : baisser le floor sans corpus-proof (doctrine NO_THRESHOLD_CHANGE_WITHOUT_BENCH). Aucun patch tant que ce NCR est OPEN.

## Verdict
- Statut : OPEN · Confiance : Haute (sur le défaut de capteur), Moyenne (sur le remède exact).
- Action requise : exécuter le recompute littéraire (NCR lié) → puis décision Architecte sur floor RCI.
