# OMEGA — MINAXIS METRIC RISK REGISTER (RCI & ECC) — READ-ONLY

> 2026-05-31 · HEAD `d007c1db` · composantes fragiles des capteurs-plancher + lien Phase R. Aucune correction appliquée — chaque item = **NCR candidat**, pas patch.

## Échelle de risque
**SEV** : HIGH (fausse le verdict seal) · MED (biais mesurable) · LOW (cosmétique).
**TYPE** : PATCH (re-pondération historique = dette) · DEFECT (défaut de mesure) · LENGTH (artefact longueur) · SELF-CAL (calibré sur la sortie du moteur, pas sur la littérature).

## 1. RCI — `macro-axes.ts:383` (100 % CALC)

| # | Composante | Risque | SEV | TYPE | Preuve |
|---|---|---|---|---|---|
| R1 | `rhythm` poids `× rhythmConfidence(wordCount)` | influence rythme **réduite sur textes courts** ; min_axis instable < 1000w | HIGH | LENGTH | macro-axes.ts:417-426 ; `rhythm.ts` ; corr RCI/mots −0.35 |
| R2 | `rhythm` peak CV 0.75→**0.60** "pour K2 2200w" | capteur **calibré sur la prose du moteur**, pas sur la littérature réelle (CV réel 8-17) | HIGH | SELF-CAL | rhythm.ts:16,50-54 ; R4_FEATURE_AUDIT_REPORT.md:44 |
| R3 | `hook_presence` weight **0.20** + "**to avoid dragging RCI**" + **75 neutre** si pas de hooks | drag constant 75 sur la majorité des runs (pas de symbol map) ; poids baissé = aveu | HIGH | PATCH/DEFECT | macro-axes.ts:393-401 ; ART_AUDIT_REPORT.md:119 |
| R4 | `voice_conformity` weight **0** (`OMEGA_VOICE_WEIGHT??'0'`), score figé 70 | sous-axe **mort-vivant** (présent, sans effet) ; "factorial 2x2 no benefit" | MED | PATCH | macro-axes.ts:408-412 |
| R5 | `euphony` weight 1.0→**0.5** ; plafond ~90 (phonotactique FR) | demi-poids ; plafond structurel < 100 | MED | PATCH | macro-axes.ts (INV-EUPHONY-WEIGHT-01) ; config.ts |
| R6 | `signature` ≥30 % hit-rate pour plein score | prose LLM matche rarement les signature words → 60-80 | MED | DEFECT | ART_AUDIT_REPORT.md:130-140 |
| R7 | Anti-métronomique `-5` si Gini+syncope+compression "parfaits" | pénalité sur métriques idéales (rare mais punitif) | LOW | DEFECT | macro-axes.ts:443-460 ; config RCI_PERFECT_PENALTY |
| R8 | **Floor 85 jamais réévalué** alors que SII/MACRO_AXIS abaissés 85→80 (corpus-proof) | incohérence interne ; 73 % des runs < 85 | HIGH | DEFECT | config.ts MACRO_FLOORS vs INV-SII-FLOOR-01 |

**Bilan RCI** : 5 sous-axes / 5 patchés + floor non réévalué → **capteur composite rapiécé** ; min_axis 63 % ; sole-blocker 37 %. **Ne pas obéir sans corpus-proof.**

## 2. ECC — `macro-axes.ts:102` (HYBRID, raw 100 % LLM)

| # | Composante | Risque | SEV | TYPE | Preuve |
|---|---|---|---|---|---|
| E1 | raw = **4 sous-axes LLM** (tension_14d 3.0, emotion_coherence 2.5, interiority 2.0, impact 2.0) | non-CALC ; dépend du modèle juge ; non recalculable hors LLM | HIGH | DEFECT | macro-axes.ts:108-141 |
| E2 | `temporal_pacing` dans `sub_scores` mais **absent de `base_weights`** | sous-axe calculé mais **non pondéré** (poids 0 de facto) — trompeur en reporting | LOW | DEFECT | macro-axes.ts:116-128 |
| E3 | Bonus entropy/projection/open-loop capés **+3** | ECC "stabilisé" par bonus → **masque** la mesure brute (raw vs final) | MED | PATCH | macro-axes.ts:144-172 |
| E4 | Effondrement 93→57-67 **selon contrat assemblé** (« Le Gardien ») | `tension_14d` sensible au chemin `assembleForgePacket` vs hand-built ? non départageable | HIGH | DEFECT? | MINAXIS_FLOOR_AUDIT §3 ; m0b runs |
| E5 | `residual_verdict: FAIL` (37 % résiduel) | ECC ~63 % prédictif de la qualité réelle | MED | DEFECT | CALIBRATION_METRICS.json |
| E6 | Header `macro-axes.ts` dit "ECC 60 %, floor RCI 15 %" alors que `config` = **ecc 0.33 / rci 0.17** | **commentaires de code obsolètes** → risque de raisonnement faux (cf. hallucinations IA passées) | MED | DEFECT | macro-axes.ts:99,377 vs config.ts:416-421 |

**Bilan ECC** : capteur LLM mieux calibré que RCI mais **opaque** (raw masqué par bonus, sous-axes non loggés en M0.b) → **verdict E** jusqu'à décomposition.

## 3. Lien Phase R (dispatcher, branche `phase-r-dispatcher-v33`)

- Phase R = audit features + dispatcher de scoring. `results_phase_r/R4_FEATURE_AUDIT_REPORT.md` **a déjà documenté** le désalignement RCI↔littérature réelle (f1a 16.68 vs RCI 76-82).
- Le `baseline_m0b` (champ optionnel `MacroSScore`, shadow dispatcher — vu en recon) suggère un **dispatcher M0b** en cours : tout changement de pondération min_axis doit passer par ce dispatcher, **pas** par patch direct des `compute*`.
- **Recommandation registre** : ouvrir `NCR_RCI_SENSOR_DEFECT` (items R1-R8) + `NCR_ECC_CONTRACT_SENSOR` (E4, après bench) **avant** toute action Phase R sur les seuils.

---
*Aucun code modifié. Items = NCR candidats. Cf. `MINAXIS_FLOOR_AUDIT.md`.*
