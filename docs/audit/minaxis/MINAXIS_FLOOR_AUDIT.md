# OMEGA — MIN_AXIS FLOOR AUDIT (RCI & ECC) — SENSOR-FIRST

> **Framework**: OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · **Mode**: READ-ONLY STRICT (0 patch, 0 recalibration, 0 threshold change)
> **Date**: 2026-05-31 · **HEAD**: `d007c1db` · **Author**: Claude Code
> **Question centrale**: le seal échoue car min_axis bas, et le min_axis SE DÉPLACE (RCI sur troves, ECC sur « Le Gardien »). Pour chaque axe-plancher : **texte faible OU capteur mal calibré / fragile / trop sévère / length-dépendant ?**
> **Doctrine**: prouver que le capteur mérite obéissance AVANT de faire monter un axe. Aucune baisse de seuil sans corpus-proof.

---

## 0. VERDICT SYNTHÈSE

| Axe-plancher | Verdict | Action induite (PAS appliquée — READ-ONLY) |
|---|---|---|
| **RCI** (floor 85) | **B (défaut métrique) + C (floor trop sévère) + D (artefact longueur)** | `NCR_RCI_SENSOR_DEFECT` → recalibration **uniquement** avec corpus-proof (déjà partiellement existant, Phase W). **Ne PAS faire monter RCI par injection de signal.** |
| **ECC** (floor 88) | **E (données insuffisantes) + hypothèse forte : pivot lié au CHEMIN de construction du contrat émotionnel** (assembleForgePacket vs hand-built), pas défaut capteur universel | Bench ECC dédié (sous-axes tension_14d/emotion_coherence par run + même scène contrat-assemblé vs contrat-bench). **Ne PAS toucher floor ECC.** Si confirmé texte faible → travailler prompt/génération (pas le seuil). |

**Le min_axis n'est pas un seul phénomène.** Sur l'échantillon **51 runs full-5-axes** : **RCI est le min_axis 63 %** (32/51), **ECC 31 %** (16/51, ≈ tous « Le Gardien »). Deux régimes distincts → deux verdicts distincts.

---

## 1. Faits mesurés (dataset `MINAXIS_DISTRIBUTION.csv`, 120 runs / 51 full-5-axes)

Sources : m0b (sovereign+scribe), BOOK_V3, BESTOF3_VALIDATION, P311_overnight, MINI_V5R6 (partiel ECC/RCI). *(Limite : peu de troves contiennent les 5 axes — voir `MINAXIS_DATASET_TRACEABILITY.md`. La revendication « 224 phase-u » est composite-only, sans per-axe.)*

| Métrique | RCI | ECC |
|---|---|---|
| Distribution (n=118) mean / median | **82.6 / 82.4** | **85.5 / 87.5** |
| p10 / p25 / p75 / p90 | 78.4 / 79.6 / 85.6 / 87.6 | 73.2 / 82.5 / 91.3 / 92.9 |
| min / max | 70.9 / 91.6 | 57.3 / 94.2 |
| **% sous le floor** | **RCI<85 : 37/51 = 73 %** | **ECC<88 : 26/51 = 51 %** |
| Fréquence min_axis (full) | **32/51 (63 %)** | 16/51 (31 %) |
| Corrélation longueur (Pearson, full) | **−0.348** | −0.182 |

**Lecture clé** : la distribution RCI est **centrée à 82.4**, le floor 85 tombe à **~p72** → le capteur produit naturellement < 85 pour ~3 runs sur 4. **19/51 (37 %)** runs ont **RCI seul axe sous-floor** (ECC/SII/IFI/AAI ≥85) → RCI bloque seul le seal dans 37 % des cas.

Length (full, Pearson) : **IFI +0.61** (gonflé par la longueur), **AAI −0.55**, **RCI −0.35**, ECC −0.18. → dépendance longueur **axe-spécifique** réelle (hypothèse D).

---

## 2. RCI — anatomie + verdict **B + C + D**

`computeRCI` (`packages/sovereign-engine/src/oracle/macro-axes.ts:383`, méthode **100 % CALC**). Sous-axes & poids effectifs :

| Sous-axe | Poids | État (preuve code) | Drapeau |
|---|---|---|---|
| `rhythm` | 1.0 **× rhythmConfidence(wordCount)** | INV-RCI-CONF-01 : poids **scalé par la longueur** ; peak CV recalibré 0.75→0.60 **pour la prose K2** (pas pour la littérature réelle) — `rhythm.ts:16,54` | **D + auto-calibration** |
| `signature` | 1.0 | ≥30 % hit-rate signature words requis pour plein score ; prose LLM matche rarement | **B** |
| `hook_presence` | **0.20** | "lower weight **to avoid dragging RCI**" ; retourne **75 neutre** si pas de hooks (cas fréquent) | **B (patch + drag constant)** |
| `euphony` | **0.5** | INV-EUPHONY-WEIGHT-01 : poids 1.0→**0.5** ; plafond ~90 (phonotactique FR) | **B (rapiécé)** |
| `voice_conformity` | **0** | `OMEGA_VOICE_WEIGHT ?? '0'` → **neutralisé** (score figé 70, "factorial 2x2 no benefit") | **B (mort-vivant)** |

**Historique de re-pondération = SIGNATURE DE FRAGILITÉ** : 5 sous-axes sur 5 ont été patchés (rhythm length-scaled+K2-tuned, signature dur, hook de-weighté + neutre 75, euphony halvé, voice neutralisé). Le repo lui-même conclut : *« RCI = 76-82 (consistently < 85 floor) … the primary bottleneck »* (`ART_AUDIT_REPORT.md:119`).

**Floor trop sévère (C)** : preuve **déjà actée dans le repo** — `config.ts` : `SII` floor **85→80** *« floor of 85 to BRUTAL scenes = physically impossible per corpus »* [INV-SII-FLOOR-01] ; `MACRO_AXIS_FLOOR` **85→80** *« McCarthy, Hemingway »*. **La même logique corpus n'a jamais été appliquée à RCI** (resté 85) → incohérence interne. La distribution RCI (centrée 82, floor à p72) confirme : **mathématiquement, RCI 85 est au-dessus de ce que le capteur produit.**

**Artefact longueur (D)** : `rhythmConfidence(wordCount)` scale explicitement le poids rhythm sur les textes courts ; lois d'échelle Phase Master `cv_sent(size)=0.0259·ln(size)+0.5355` (R²=0.999) ; bench repo *« Révélation@1000 : 550w → RCI/SII effondrés »*. RCI−longueur = −0.35.

➡️ **RCI ne mérite PAS d'être obéi tel quel.** Verdict **B+C+D**. Action : `NCR_RCI_SENSOR_DEFECT` ; toute recalibration exige corpus-proof formel (cf. `MINAXIS_LITERARY_CALIBRATION.md`). **Aucun patch, aucune baisse de floor dans cette session.**

---

## 3. ECC — anatomie + verdict **E (+ pivot contrat-dépendant)**

`computeECC` (`macro-axes.ts:102`, méthode **HYBRID**) : raw = **100 % sous-axes LLM** — tension_14d (3.0), emotion_coherence (2.5), interiority (2.0), impact (2.0) / 9.5 ; + bonus CALC capés +3 ; temporal_pacing présent mais **non pondéré** dans raw. → **ECC non recalculable sans LLM.**

**Le pivot RCI→ECC suit le CHEMIN DE CONSTRUCTION DU CONTRAT, pas le moteur :**

| Régime | ECC | min_axis | Contrat émotionnel |
|---|---|---|---|
| Troves (BESTOF3/P311/BOOK_V3 : contemplation/menace/révélation/confrontation) | **~93** (top5 ECC = 93-94) | **RCI** | hand-built bench (dominant14D poids 0.50, propre) |
| M0.b « Le Gardien » (5 sov + 5 scribe) | **57-71** (bottom5 ECC = tous Le Gardien) | **ECC** | `assembleForgePacket` dérivé du Golden (CF6 : 14D peuplé, arc fear/horror) |

**Les DEUX moteurs (sovereign + scribe) s'effondrent en ECC sur la MÊME scène** → le facteur commun est **la scène/le contrat**, pas l'architecture. Deux explications non départageables avec les données actuelles :
- **(A) texte réellement faible** sur une cible émotionnelle dure (fear/horror) — plausible (impact LLM tombé à 45 sur un run, `m0b_full_N5.log`).
- **(B/E) artefact du contrat assemblé** : la trajectoire 14D dérivée par `assembleForgePacket` (vs hand-built) est plus exigeante / mal-appariée pour `tension_14d` → le capteur voit un écart de contrat.

**Le dataset M0.b ne contient PAS la décomposition sous-axes ECC** (tension_14d / emotion_coherence par run) → **impossible de trancher A vs B/E maintenant.** ECC capteur est par ailleurs « mieux calibré » que RCI (median 87.5, bonus-stabilisé) mais `CALIBRATION_METRICS.json` : `residual_verdict: FAIL` (37 % résiduel) → prédictivité ~63 %.

➡️ **Verdict ECC = E (données insuffisantes)**, hypothèse forte testable : **pivot contrat-dépendant**. Action : bench ECC dédié (logger tension_14d/emotion_coherence/interiority/impact par run ; comparer MÊME scène contrat-assemblé vs contrat-bench). **Ne PAS toucher le floor ECC.** Si A confirmé → prompt/génération. Si B/E confirmé → `NCR_ECC_CONTRACT_SENSOR`.

---

## 4. Réponse à la question centrale

- **RCI comme min_axis (régime troves)** → **CAPTEUR mal calibré** (B+C+D). Le texte n'est pas « faible en rythme » ; le capteur sous-produit structurellement et le floor 85 n'est pas justifié (le repo l'a déjà prouvé pour SII/MACRO_AXIS, jamais pour RCI). **NE PAS faire monter RCI.**
- **ECC comme min_axis (régime « Le Gardien »)** → **indéterminé (E)** ; l'effondrement suit le chemin de construction du contrat émotionnel, sur les deux moteurs. **Bench dédié requis** avant tout verdict A/B. **NE PAS toucher ECC.**

**Aucune modification de code, de poids ou de seuil n'a été faite.** Corrections évidentes → NCR, pas patch (cf. `MINAXIS_METRIC_RISK_REGISTER.md`).

---
*Compagnons : `MINAXIS_LITERARY_CALIBRATION.md` (real-lit vs floors), `MINAXIS_DISTRIBUTION.csv` (+`minaxis_summary.json`), `MINAXIS_CASES_TOP_BOTTOM.md`, `MINAXIS_METRIC_RISK_REGISTER.md`, `MINAXIS_DATASET_TRACEABILITY.md`. Repro : `npx tsx scripts/metrology/minaxis-aggregate.ts`.*
