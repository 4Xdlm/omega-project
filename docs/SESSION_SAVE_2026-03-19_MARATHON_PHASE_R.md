# ═══════════════════════════════════════════════════════════════════════════════
# SESSION_SAVE — MARATHON R0→R6 + BENCH LLM LANCÉ
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-19 (journée complète)
# Session ID   : MARATHON-PHASE-R-COMPLETE
# HEAD         : 9ea5c2fc (tag : phase-r6-complete)
# Branche      : phase-w-mixer
# Tests        : 1829 GREEN (202 fichiers)
# Durée session: ~14 heures
# Standard     : NASA-Grade L4 / DO-178C Level A
# Autorité     : Francky (Architecte Suprême)
# IA Principal : Claude
# Auditeurs    : ChatGPT, Gemini (consultés 2 fois dans la session)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# RÉSUMÉ EXÉCUTIF

Cette session a accompli la REFONDATION MÉTROLOGIQUE COMPLÈTE du projet OMEGA
en 7 phases (R0→R6), plus le lancement du bench LLM avec le moteur réel.

En entrée : un plafond de score à 91-92 sur des scènes de 600 mots,
avec 16/16 features instables à cette échelle.

En sortie : un scorer multi-étages TypeScript normalisé 0-100 avec
coefficients empiriques dérivés de 181 œuvres × 121 features × 3 langues,
6 profils de qualité, et 1829 tests GREEN.

---

# CHRONOLOGIE DE LA SESSION

| Heure | Phase | Action | Résultat |
|-------|-------|--------|----------|
| ~01h00 | R0 | Corpus 187 œuvres, v5.py, lever les limites | 87 FR + 60 EN + 17 ES |
| ~02h00 | R1 | Analyse multi-fenêtre 181 œuvres (2.4h de calcul) | 121 features, 81 LOCAL + 40 ARC |
| ~05h00 | R1 | Résultats récupérés après reboot PC | 169 œuvres analysées |
| ~08h00 | R2 | 7 analyses topologiques, 12 FILE_NOT_FOUND corrigés | 2002 moments, 4812 chapitres |
| ~10h00 | R3 | Coefficients proportionnels, backtest 181 œuvres | 11/12 auteurs above median |
| ~11h00 | Consultation | ChatGPT (critique hostile) + Gemini (validation) | 4 tests manquants identifiés |
| ~12h00 | R4 | Scorer TypeScript multi-étages + 6 profils | 33 nouveaux tests, 1850 GREEN |
| ~13h00 | R5 | F24-F38 portées en TS, bench MOCK | Cross-validation ±7.5% |
| ~14h00 | R6 | Normalisation 0-100, F5 en TS | Bench MOCK 56.3/100 |
| ~14h30 | Bench | Bench LLM lancé avec clé API | EN COURS |

---

# CE QUI A ÉTÉ PRODUIT

## Code

| Fichier | Lignes | Phase |
|---------|--------|-------|
| omega-autopsie/full_work_analyzer_v5.py (4 modules) | ~2600 | R0 |
| omega-autopsie/r1_multiwindow.py | 600 | R1 |
| omega-autopsie/r2_topology.py | ~400 | R2 |
| omega-autopsie/r3_coefficients.py | ~300 | R3 |
| src/scoring/types.ts | 104 | R4 |
| src/scoring/coefficients-loader.ts | 156 | R4 |
| src/scoring/passage-type-detector.ts | 90 | R4 |
| src/scoring/quality-profiles.ts | 92 | R4 |
| src/scoring/multi-stage-scorer.ts | 145 | R4 |
| src/scoring/normalizer.ts | 140 | R6 |
| src/scoring/text-features.ts | 470 | R5+R6 |
| scripts/run-benchmark-r5.ts | ~200 | R5 |
| scripts/run-benchmark-r6.ts | 175 | R6 |
| tests/art/multi-stage-scorer.test.ts | 260 | R4 |

## Données

| Fichier | Taille | Phase |
|---------|--------|-------|
| results_r1/ (170 JSON individuels) | 106 MB | R1 |
| OMEGA_METROLOGIE_EMPIRIQUE_v1.json | 25 MB | R1 |
| results_r2/ (7 JSON topologiques) | 12.5 MB | R2 |
| results_r3/ (3 JSON coefficients) | 164 KB | R3 |
| OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json | 105 KB | R3 |
| OMEGA_CORPUS_R0.json | ~50 KB | R0 |

## Documentation

| Document | Phase |
|----------|-------|
| docs/SESSION_SAVE_R0.md → R6.md (7 documents) | R0→R6 |
| docs/OMEGA_R0_REPORT.md → R6_REPORT.md (7 rapports) | R0→R6 |
| docs/OMEGA_PHASE_R_ROADMAP_v2.md | Post-R3 |
| docs/OMEGA_PHYSIQUE_LITTERAIRE_v3.md | Post-R3 |

---

# DÉCOUVERTES MAJEURES

## 1. Le plafond 91-92 est un plafond de MESURE (R1)

16/16 features sont instables à 300 mots. Gain de stabilité 1.7× à 9.6×
en passant aux chapitres réels. À 600 mots, seulement 27% des features
sont stables (CV < 0.30).

## 2. Zéro features MACRO nécessaires (R1)

Classification : 81 LOCAL + 40 ARC + 0 MACRO. Toutes les features
se stabilisent avant 10 000 mots. Le juge a 2 étages, pas 3.

## 3. Moments clés aux EXTRÉMITÉS (R2+R3)

La concentration initiale en SETUP était un artefact du binning.
Après normalisation : CLOSING 0.633 moments/chapitre > OPENING 0.597.
Les grands auteurs concentrent leurs pics en ouverture et fermeture.

## 4. Les hooks ≈ les cliffhangers (R2)

Delta < 0.08 sur toutes les features entre les 100 premiers et 100 derniers
mots de 4812 chapitres. Le vrai cliffhanger se joue dans la dernière phrase.

## 5. 55% des features sont universelles cross-langue (R1)

66/121 features ont |CV_fr - CV_en| < 0.20. Les features de haut niveau
(description, contraste, vitesse) sont universelles.

## 6. α/β = 0.43/0.57 naturellement (R3)

L'étage ARC domine le scoring car il a plus de features à haute confiance.
Ce ratio est quasi-constant pour toutes les tailles ≥ 150 mots.

## 7. Le Nouveau Roman n'est PAS homogène (R2)

Robbe-Grillet (transitions douces, 0.95) vs Simon (ruptures brutales, 5.96).
Le mouvement littéraire ne prédit pas le style de coupure.

## 8. 29 features sont du bruit pur à toute échelle (R3)

Les compteurs absolus (f12_marker_count, f16_hapax_count, etc.) ne se
normalisent jamais. Seuls les RATIOS se stabilisent. 29 features OFF.

## 9. Faulkner = frontière documentée du système (R3)

Rang 145/181. Son stream of consciousness fragmentaire n'est pas capturé
par des métriques favorisant la régularité syntaxique. Résolu par le profil
EXPÉRIMENTAL (R4).

## 10. Les chapitres raccourcissent de 24% en un siècle (R2)

3819 mots (pré-1900) → 2901 mots (post-2000). 4813 chapitres mesurés.

---

# DÉCISIONS PRISES PENDANT LA SESSION

| Décision | Justification | Phase |
|----------|---------------|-------|
| CHAPTER_MAX_WORDS supprimé | Chapitres réels complets | R0 |
| GATE_MIN_WORDS 15000 → 8000 | Nouvelles longues exploitables | R0 |
| window_min = CV < 0.30, window_opt = dérivée < 5% | Seuils de stabilisation | R1 |
| 5 positions par fenêtre par œuvre | Couvrir P_rel 0.0 → 1.0 | R1 |
| 5 zones positionnelles (pas 6) | Clusters effectifs de P_rel | R2 |
| Seuils empiriques pour types (pas k-means) | Conforme R-03 | R2 |
| confidence = max(0, min(1, 1-CV)) | Fonction de pondération retenue | R3 |
| α/β calculés (pas fixés) | Proportion features haute confiance | R3 |
| 6 profils de qualité | Directive Francky | R4 |
| Approche C (F24-F38 en TS, pas subprocess Python) | Features à haute confiance = F24-F38 | R5 |
| Approximation gaussienne pour P10/P90 | Suffisant pour R6 | R6 |

---

# TAGS SCELLÉS

| Tag | Commit | Contenu |
|-----|--------|---------|
| phase-r0-complete | cc1f83ea | Corpus 187 œuvres, v5.py |
| phase-r1-complete | 5ccaa9dd | 181 × 121 features, constantes empiriques |
| phase-r2-complete | ff7a9a1e | 7 analyses topologiques |
| phase-r3-complete | cac21aa3 | Coefficients proportionnels |
| phase-r4-complete | 1ae8a7e8 | Scorer TypeScript + 6 profils |
| phase-r5-complete | bc4794db | F24-F38 en TS, bench MOCK |
| phase-r6-complete | 9ea5c2fc | Normalisation 0-100, bench normalisé |

---

# CONSULTATIONS IAs

## ChatGPT (post-R3)

Critique hostile constructive. 4 lacunes identifiées :
1. Ablation study manquant
2. Stress test hors distribution manquant
3. Test cross-langue réel manquant
4. Rapport anti-biais esthétique manquant

Recommandation acceptée : "vérité empirique sous hypothèses corpus", pas "vérité mathématique".

## Gemini (post-R3)

Validation architecturale complète. Points saillants :
- α/β = 0.43/0.57 = "la littérature accorde une prime à l'arc"
- 0 MACRO = "on ne construit pas l'inutile"
- Faulkner = "prouve que nos capteurs fonctionnent"

---

# PROCHAINES ACTIONS

## Immédiat — Bench LLM (EN COURS)

Le bench est lancé avec la clé API Anthropic.
Quand il sera terminé, comparer :
- Scores Phase W (ECC/RCI/SII/IFI/AAI → composite)
- Scores R6 (LOCAL/ARC → composite normalisé 0-100)

## Post-bench — Calibration

1. Analyser les résultats du bench LLM
2. Calibrer les weight_overrides des 6 profils
3. Intégrer le scorer dans le pipeline (option c)
4. Lancer les 4 tests de robustesse (ChatGPT)

## Futur

- Phase S : Fork scénaristique (séries/films) — fondations réutilisables
- Phase T : Extension corpus + stress test hors distribution
- Profils : affiner les 6 profils sur des textes générés

---

# ÉTAT DE SORTIE

```
HEAD           : 9ea5c2fc
Tag            : phase-r6-complete
Branche        : phase-w-mixer
Tests          : 1829 GREEN (202 fichiers)
Bench LLM     : EN COURS (lancé par Francky)
Scorer         : 49 features TS, 21 actives @600w, normalisé 0-100
Profils        : 6 (STRATOSPHÉRIQUE → EXPÉRIMENTAL)
Confiance      : 0.632 @600w
Bench MOCK     : 56.3/100 (médiane classiques littéraires)
```

---

*Session save produit le 2026-03-19*
*Session marathon : ~14 heures, 7 phases scellées*
*Standard NASA-Grade L4 / DO-178C Level A*
*Convergence : Claude + ChatGPT + Gemini + Francky*
