# V2.3-A P5 — Rapport de clôture (VERDICT SHADOW)
Date: 2026-05-29 · Statut: **SCELLÉ — V2.3-A STOPPÉ, propre** · Tribunal 2/2 unanime (Option A)

## 1. Objet
Clôture du sprint V2.3-A (couplage chunking adaptatif → génération, mode réécriture semi-automatique, ADR_V2_3 Option B). P5 = verdict empirique du bench A/B P4, juge final d'Option B.

## 2. Ce qui a été livré (chaîne P0→P4)
| Phase | Livrable | Commit |
|---|---|---|
| P0 | `deriveEmotionContractFromSegment` (analyse CALC, déterministe, zéro LLM) | 528e183e |
| P1 | `buildForgePacketFromSegment` (pont P0→ForgePacket, target_14d={} dormant préservé) | e37c8d04 |
| P2 | `abRouting` (naïf aligné-phrases vs scalpel, K identique) | 6e00e909 |
| P3 | `buildRewritePrompt` (injection source→prompt, mode `rewrite_v2_3`) + smoke qwen PASS | 0550ffc1 |
| P4 | bench A/B réel + métrique `REWRITE_ORACLE` (Option D) + NCR ECC/14d + 7 tests CI | 25c5b8f0 |

## 3. Bench A/B — résultats figés
- **n_pairs = 9** · 2 seeds (v23seedA/B) · sources Achebe / Hugo / Sartre · **runtime 27,2 min** · 36 proses · 0 crash.
- Métrique : **REWRITE_ORACLE** = moyenne de 7 axes {RCI, SII, IFI, AAI, emotion_coherence, interiority, impact}, **excluant `tension_14d`** (couplé au 14d dormant — sinon NaN, cf NCR_V2_3_ORACLE_ECC_14D_INCOMPATIBLE). **Δ intra-bench seulement, non comparable au composite V1 absolu (87,8) ni à Δρ V3.4.**
- **Δcomposite = +0,93** · **CI95 = [−1,04 ; +2,91]** (traverse zéro → non significatif) · mean_control 76,06 vs mean_treatment 76,99.
- Seuil pré-enregistré GO_B_CANDIDATE = +2,0 **non atteint**.

## 4. Verdict
**P4 exécution : PASS. P4 résultat scientifique : SHADOW.**

La supériorité prose globale (composite) du découpage Scalpel vs naïf **n'est pas prouvée** à ce niveau d'échantillonnage. Verdict pré-enregistré appliqué sans dérogation → **SHADOW**. Pas de GO_B (seuil non franchi), pas de REJECT (signal positif faible). Le Scalpel reste **opt-in / expérimental** ; le pipeline génératif ex-nihilo reste **inchangé** ; LAW-CHUNK-048 intact ; FORBID-PIPELINE-002/003 levés (bench exécuté), couplage non promu.

## 5. Signal exploratoire (consigné, non décisionnel)
`min_axis` : 38,85 → 44,09 (**+5,24**). Mécanisme candidat : le Scalpel **relève le plancher** (réduit l'effondrement de l'axe le plus faible) plutôt qu'il n'élève le plafond. **Hors kill-switch pré-enregistré → non décisionnel.** Détail + loi candidate `[CANDIDATE] LAW-CHUNK-MINAXIS-STAB-001` : `nexus/proof/MEASURE_V2_3_MIN_AXIS_SIGNAL_EXPLORATORY.md`.

## 6. Intégrité du protocole (pourquoi pas de GO sur min_axis)
Le kill-switch était pré-enregistré sur le `composite` à +2,0, hors zone de bruit (σ≈2). Changer le critère de victoire après coup pour sauver le couplage = violation directe de la doctrine anti-post-hoc (P3, EMP-12). La rigueur de l'arrêt EST le résultat : on a prouvé qu'on sait coupler les moteurs **et** s'arrêter quand la donnée l'exige.

## 7. Suite (NON automatique)
Futur **V2.3-B** optionnel, sur décision Architecte uniquement : re-bench `min_axis` avec co-critère **pré-enregistré**, **n ≥ 20**, seuil figé avant run, métrique inchangée. **Pas de re-bench immédiat.**

## 8. Bloc VERDICT (doctrine)
- Statut : **PASS** (sprint exécuté de bout en bout, verdict empirique propre) / résultat = **SHADOW**.
- Confiance : Haute.
- Forces : kill-switch respecté (zéro post-hoc) ; chaîne P0→P4 livrée, testée (TSC + Vitest verts), scellée origin ; bloquant NaN (ECC/14d) diagnostiqué et résolu sans toucher le canon 14d ni l'ex-nihilo ; signal min_axis correctement classé exploratoire.
- Faiblesses : (1) n=9 modeste, CI95 large (±2) — un effet réel < 2 pts resterait invisible ; (2) pairing régional imparfait (frontières divergentes par nature) ; (3) min_axis prometteur mais hors métrique de gating → non concluant en l'état.
- Risques restants : sur-interpréter le min_axis hors d'un protocole pré-enregistré.
- Action requise : aucune. V2.3-A clos. V2.3-B = futur conditionnel sur décision Architecte.
