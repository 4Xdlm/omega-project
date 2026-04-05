# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — SCAN TOTAL & CENTRALISATION
# "TOUT ASSEMBLER AVANT DE DÉCIDER"
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-23
# HEAD entrant : 0fe63d24 (tag r-calibration-complete)
# Branche      : phase-r-metrology-rebuild
# Standard     : NASA-Grade L4
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# MISSION
#
# Scanner TOUS les documents du projet des 90 derniers jours.
# Extraire TOUTES les mesures, règles, décisions, analyses, constantes.
# Centraliser dans UN SEUL document de référence.
# Zéro approximation. Zéro oubli. TOUT.
#
# Ce prompt NE MODIFIE RIEN. Il LIT et ASSEMBLE.
# Budget API : 0 appels. Tout est local.
# ═══════════════════════════════════════════════════════════════════════════════

# RÈGLES
R-01 : AUCUNE modification de code ou de données
R-02 : TOUT fichier .json ou .md contenant des mesures doit être lu
R-03 : Les fichiers > 5 MB sont résumés (clés + structure), pas copiés intégralement
R-04 : Le résultat final est UN SEUL document .md < 200 KB
R-05 : 1911 tests doivent rester PASS (rien n'est touché)

# ═══════════════════════════════════════════════════════════════════════════════
# SOURCES À SCANNER (EXHAUSTIF)
# ═══════════════════════════════════════════════════════════════════════════════

## SOURCE 1 — Données de scoring (45 fichiers JSON)
## Chemin : packages/sovereign-engine/src/scoring/data/

Lire INTÉGRALEMENT chaque fichier et extraire :
- Toutes les constantes numériques
- Tous les seuils (thresholds)
- Tous les classements (tiers, catégories)
- Toutes les corrélations
- Tous les statuts (PASS/FAIL, TRUSTED/CONFOUNDED, etc.)
- Toutes les formules

### Fichiers critiques (lire en priorité absolue) :
- GB_V1_MODEL.json → le modèle GB complet (256 KB)
- OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json → confidence_table, weight_table, scoring_formula, type_modifiers, position_modifiers, language_dependency (105 KB)
- R8_TYPOLOGICAL_CONSTANTS.json → cif, lambda par type × feature
- R8_TIPPING_POINTS.json → seuils de basculement GB
- R8_ASSEMBLY_PATTERNS.json → Loi des LEGO (trigrammes, assembly_bonus)
- GOLD_SET_PASSAGES.json → passages de référence
- R_MEASURE_TOTAL.json → toutes les mesures R-MEASURE
- JUDGE_CALIBRATION_MULTI_SIZE.json → 12 textes × 4 tailles
- DENOMINATOR_BIAS_AUDIT.json → biais de longueur
- PARTIAL_CORRELATIONS_DEEP.json → corrélations partielles
- TRUE_DIMENSIONS_AUDIT.json → PCA
- FR_VS_EN_COMPARISON.json → comparaison FR/EN
- TRANSLATION_PAIRS.json + TRANSLATION_FIDELITY.json → audit traduction
- TYPE_FEATURE_IMPORTANCE.json → importance par type
- COMPOSITION_PROFILES.json → profils par type
- TRANSITION_MATRICES.json → matrices de transition
- TYPE_COMPATIBILITY_MATRIX.json → compatibilité entre types
- MEASURE_TRUST_MATRIX.json → matrice de confiance
- MEASURE_ROLES.json → rôle de chaque mesure
- ROSETTA_VS_PHASE_P_DIAGNOSIS.json → diagnostic Phase P
- PROMPT_COMPLIANCE_AUDIT.json → conformité prompt
- ROSETTA_INTEGRATION_AUDIT.json → Rosetta branchée ?
- JUDGE_CALIBRATION_RESULTS.json → étalonnage juge 3 maîtres

### Fichiers secondaires (lire et résumer) :
- Tous les autres fichiers du répertoire

## SOURCE 2 — Métrologie empirique (R1, 25 MB)
## Chemin : omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json

Ce fichier fait 25 MB. NE PAS le copier intégralement.
Extraire UNIQUEMENT :
- Structure (clés de premier niveau)
- cv_matrix : pour les 20 features les plus importantes (f1_mean, f1a, f1b, f9a, f17, f24e, f25g, f26b, f27d, f28d, f29d, f5a, f5c, f19a, f21c, f38c, f12b, f16a, f35c, f36c), les valeurs à TOUTES les tailles de fenêtre
- derived_constants : toutes
- protocol : complet

## SOURCE 3 — Topologie narrative (R2, 7 fichiers)
## Chemin : omega-autopsie/results_r2/

Lire chaque fichier et extraire :
- OMEGA_PASSAGE_TYPES.json → profils par type (5 types × features)
- OMEGA_PREL_HEATMAP.json → heatmap features × 5 zones positionnelles
- OMEGA_POSITION_PROFILES.json → signatures par zone
- OMEGA_CHAPTER_DISTRIBUTION.json → stats chapitres par langue/siècle
- OMEGA_KEY_MOMENTS.json → résumé (nombre de moments, distribution)
- OMEGA_HOOKS_CLIFFHANGERS.json → résumé (10 MB — extraire stats globales seulement)
- OMEGA_CUT_NATURALNESS.json → résumé

## SOURCE 4 — Rosetta complète (19 fichiers + sous-répertoires)
## Chemin : omega-autopsie/results_rosetta/

Lire INTÉGRALEMENT :
- 01_definitions_llm.json → comment le LLM définit chaque style
- 03_features_llm.json → profil features LLM par style
- 04_profiles_classiques.json → profil features classiques par style
- 05_table_rosette.json → ratios LLM/Classiques (la TABLE DE ROSETTE)
- 06_interrogation_croisee.json → corrélation de langages
- 07_confusion_matrix.json → confusion LLM vs classiques
- 08_dictionnaire_omega_llm_v1.json → features alignées vs divergentes
- 09_amelioration_tests.json → tests d'amélioration
- 10_test_flaubert.json → test Flaubert

### Sous-répertoire phase2/ :
- dictionnaire_v2_calibre.json → contraintes efficaces vs ignorées

### Sous-répertoire phase3/ :
- dictionnaire_v3_llm_driven.json → instructions LLM-driven par style
- bloc_a_reverse_micro.json → reverse micro
- bloc_b_reverse_macro.json → reverse macro
- bloc_c_auto_classification.json → auto-classification LLM
- bloc_d_recomposition.json → recomposition
- bloc_e_micro_chirurgie.json → micro-chirurgie

### Sous-répertoire s0/ :
- rosetta_claude-sonnet-4-20250514_v1.json → MATRICE ROSETTA OFFICIELLE
- s01_audit_f5c.json → audit f5c
- s02_bench_pilotables.json → bench features pilotables
- s03_bench_contradictoire.json → bench contradictoire
- s04_bench_contournables.json → bench contournables
- s05_bench_micro_chirurgie.json → bench micro-chirurgie
- s06_classification_regles.json → classification SOLIDE/ILLUSION

## SOURCE 5 — Documents de référence (docs/)
## Chemin : docs/

### SESSION_SAVEs (lire TOUS ceux des 90 derniers jours) :
- SESSION_SAVE_2026-03-23_PHASE_R_COMPLETE.md
- SESSION_SAVE_2026-03-23_ERRATA_AUDIT_DEEP.md
- SESSION_SAVE_2026-03-23_R_VERIFY_FINAL.md
- SESSION_SAVE_2026-03-22_MARATHON_RCOMP.md
- SESSION_SAVE_2026-03-22_INTEGRATION_P0_P3.md
- SESSION_SAVE_2026-03-21_NUIT_PHASE_R8.md
- SESSION_SAVE_2026-03-21_NUIT_PHASE_R.md
- SESSION_SAVE_2026-03-20_MARATHON_COMPLET.md
- SESSION_SAVE_2026-03-19_MARATHON_PHASE_R.md
- SESSION_SAVE_2026-03-18_PHASE_W_INT5_FINAL.md
- SESSION_SAVE_2026-03-18_VRECAL1_TO_PHASE_R.md
- SESSION_SAVE_MASTER_DOSSIER_ROSETTA.md
- SESSION_SAVE_ROSETTA_COMPLETE.md
- SESSION_SAVE_PHASE_R8_COMPLETE.md
- SESSION_SAVE_PHASE_R_FINAL.md
- SESSION_SAVE_P0_P3_OFFICIEL.md
- SESSION_SAVE_R0.md → SESSION_SAVE_R6B.md (toute la série)
- SESSION_SAVE_GRAND_PARALLEL.md
- SESSION_SAVE_S0.md
- SESSION_SAVE_2026-02-20.md
- SESSION_SAVE_2026-02-21_INTEGRATION_DUAL_CORE.md
- SESSION_SAVE_2026-02-22.md

### Rapports techniques (lire tous) :
- OMEGA_PHYSIQUE_LITTERAIRE_v3.md
- OMEGA_REFONDATION_METROLOGIQUE_DOSSIER.md
- OMEGA_PROTOCOLE_ANALYSE_COMPLET.md
- OMEGA_PROTOCOLE_EPREUVE_ULTIME.md (Mixer 48 805 perturbations)
- OMEGA_MIXER_PROOF_DOSSIER_FINAL.md
- OMEGA_DOSSIER_REVERSE_ENGINEERING_LLM.md
- OMEGA_DOSSIER_DETECTION_TYPE.md
- OMEGA_SYNTHESE_FINALE_ROSETTA.md
- OMEGA_SYNTHESE_INTEGREE_FINALE.md
- OMEGA_AUDIT_INTEGRATION_GLOBALE.md
- OMEGA_ENCYCLOPEDIE_METROLOGIE.md
- OMEGA_PHASE_R8_TECHNICAL_REPORT.md
- OMEGA_R0_REPORT.md → OMEGA_R6_REPORT.md (toute la série)
- OMEGA_R2_REPORT.md
- OMEGA_R3_REPORT.md
- OMEGA_GRAND_PARALLEL_REPORT.md
- OMEGA_S0_CALIBRATION_REPORT.md
- OMEGA_ROSETTA_REPORT.md
- OMEGA_ROSETTA_PHASE2_REPORT.md
- OMEGA_ROSETTA_PHASE3_REPORT.md
- OMEGA_PHASE_R7_ENDURANCE_REPORT.md
- OMEGA_PHASE_R7_PRESEAL_REPORT.md
- OMEGA_R7_SCORER_FINAL_REPORT.md
- OMEGA_AUDIT_DEEP_CROISEMENTS.md

### Contrats et roadmaps :
- CONTRAT_OMEGA_SCRIBE_v1.md
- CONTRAT_TRAVAIL_OMEGA_v1.md
- OMEGA_ROADMAP_v8_0.md
- OMEGA_ROADMAP_ADDENDUM_v9_0_PHASE_R.md
- OMEGA_ROADMAP_S0_LANGUAGE_CALIBRATION.md
- OMEGA_PHASE_R_PLAN.md
- OMEGA_PHASE_R_ROADMAP_v2.md
- OMEGA_PHASE_W_INTEGRATION_ROADMAP.md

### Autres docs critiques :
- OMEGA_AUTHORITY_MODEL.md
- OMEGA_DECISIONS_LOCK_v1.md
- OMEGA_METRIQUES_v1.md
- OMEGA_DRIFT_REPORT_v1.md

## SOURCE 6 — Bench sessions (résumés)
## Chemin : packages/sovereign-engine/sessions/

Pour chaque session de bench des 7 derniers jours (les plus récentes) :
- Lire le summary.json ou unified_results.json
- Extraire : scores par scène, médiane, GB V1, V3, archétype, features top

Sessions prioritaires :
- UnifiedBench_API_2026-03-22T13-38-05_44dcd7dd (baseline)
- UnifiedBench_API_2026-03-23T18-00-01_2d996523 (Phase P)
- DualBench_API_2026-03-23T16-00-24_2d996523 (Phase P dual)
- BenchW_gate-ON_2026-03-19T17-44-48_9ea5c2fc (reference W)

# ═══════════════════════════════════════════════════════════════════════════════
# STRUCTURE DU DOCUMENT DE SORTIE
# ═══════════════════════════════════════════════════════════════════════════════

Créer : docs/OMEGA_MASTER_KNOWLEDGE_BASE.md

## STRUCTURE OBLIGATOIRE :

### PARTIE 1 — INVENTAIRE (ce qui existe)

```
TOTAL : XXX fichiers scannés
DATA JSON : XX fichiers, XX MB
DOCUMENTS : XX fichiers, XX KB
SESSIONS : XX bench sessions
```

### PARTIE 2 — LE MODÈLE GB V1 (le juge)

Extraire du GB_V1_MODEL.json :
- Architecture (nb arbres, features, profondeur)
- Features utilisées (liste complète avec importances)
- Seuils de tier (S, A, B, C, D)
- Méthode d'entraînement
- Corpus d'entraînement (taille, composition)

### PARTIE 3 — LES COEFFICIENTS PROPORTIONNELS (la physique)

De OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json :
- confidence_table : pour les 30 features clés, confiance à CHAQUE taille
- weight_table : poids LOCAL_600 et ARC_2500
- scoring_formula : α/β par taille
- disabled_below : seuils de désactivation
- never_active_features : les 29 features OFF
- type_modifiers : coefficients par type
- position_modifiers : coefficients par position (P_rel)
- language_dependency : FR/EN/ES par feature

### PARTIE 4 — LES CONSTANTES TYPOLOGIQUES (R8)

De R8_TYPOLOGICAL_CONSTANTS.json :
- cif par type × feature
- lambda par type × feature
- Classe (ABSOLUTE_SCALE, ADDITIVE, INTERACTIONAL, etc.)

### PARTIE 5 — LES TIPPING POINTS (R8)

De R8_TIPPING_POINTS.json :
- Top 10 features avec seuils, direction, delta, importance
- Co-occurrences

### PARTIE 6 — LA LOI DES LEGO (R8)

De R8_ASSEMBLY_PATTERNS.json :
- Trigrammes des maîtres (S-tier) vs commerciaux (C/D)
- Transitions à pénaliser
- Assembly bonus par tier
- Enrichissement par transition

### PARTIE 7 — LES MESURES R-MEASURE

De R_MEASURE_TOTAL.json :
- Toutes les mesures avec statuts (TRUSTED, CONFOUNDED, etc.)
- Corrélations avec GB
- Corrélations partielles (contrôle longueur)

De DENOMINATOR_BIAS_AUDIT.json :
- Biais de longueur par mesure
- Mesures survivantes vs confondues

De PARTIAL_CORRELATIONS_DEEP.json :
- Corrélations partielles FR et EN

De TRUE_DIMENSIONS_AUDIT.json :
- PCA (5 dimensions réelles)

### PARTIE 8 — LA CERTIFICATION FR vs EN

De FR_VS_EN_COMPARISON.json :
- Corrélations partielles FR vs EN par mesure
- Statuts : UNIVERSAL_CANDIDATE / LANGUAGE_MODULATED / WEAK

De TRANSLATION_PAIRS.json + TRANSLATION_FIDELITY.json :
- Paires de traduction
- Fidélité par sens (FR→EN, EN→FR)
- Anomalies identifiées

### PARTIE 9 — LA ROSETTA (reverse engineering LLM)

De TOUTE la hiérarchie results_rosetta/ :
- Table de Rosette (ratios LLM/Classiques par feature × style)
- Dictionnaire v1 (features alignées/divergentes)
- Dictionnaire v2 calibré (contraintes efficaces/ignorées/irréductibles)
- Dictionnaire v3 LLM-driven (instructions du LLM lui-même)
- Matrice officielle rosetta_v1.json
- Classification S0 (SOLIDE/ILLUSION/IRRÉDUCTIBLE)
- Confusion matrix (7/7 → INTROSPECTION)
- 6 Principes Rosetta

### PARTIE 10 — L'ÉTALONNAGE DU JUGE

De JUDGE_CALIBRATION_MULTI_SIZE.json :
- 12 textes × 4 tailles
- Tableau complet
- Effet de taille sur le GB V1
- Seuils recommandés SHORT/LONG
- Profils des maîtres (CV, f26b, f17, f9a, mean_sent_len)
- LE FAIT QUE 50 NUANCES > FLAUBERT à 500 mots

De JUDGE_CALIBRATION_RESULTS.json :
- 3 maîtres à 500 mots

### PARTIE 11 — LES TYPES DE PASSAGE

De OMEGA_PASSAGE_TYPES.json :
- 5 types × profils features complets
- Distribution par langue
- Distribution par zone positionnelle (P_rel)

De TYPE_FEATURE_IMPORTANCE.json :
- Top 10 features par type

De COMPOSITION_PROFILES.json :
- Profils par type + GB moyen par type

De TRANSITION_MATRICES.json :
- Matrice de transition entre types
- Top trigrammes

De TYPE_COMPATIBILITY_MATRIX.json :
- Compatibilité entre types adjacents

### PARTIE 12 — LES BENCH RESULTS

Pour chaque bench session récent :
- Scores par scène (V3, GB V1, tier, type)
- Médiane
- Features top par scène
- Comparaison AVANT/APRÈS Phase P

### PARTIE 13 — TOPOLOGIE NARRATIVE (R2)

Résumés des 7 analyses R2 :
- Distribution chapitres
- Profils positionnels (5 zones)
- Hooks et cliffhangers
- Moments clés
- Naturalité de coupure

### PARTIE 14 — LA PHYSIQUE DE L'ÉCRITURE (Mixer, 48 805 perturbations)

De OMEGA_MIXER_PROOF_DOSSIER_FINAL.md + OMEGA_PROTOCOLE_EPREUVE_ULTIME.md :
- 7 types de perturbation × 5 amplitudes
- Résultats : quels leviers ont un signal FORT
- Matrice de couplage
- Les 5 lois universelles identifiées
- Universalité cross-langue et cross-temporelle
- Signatures d'auteurs

### PARTIE 15 — DÉCISIONS VERROUILLÉES

De TOUS les documents contenant des DÉCISIONS :
- Toutes les décisions numérotées (D1, D2, ..., Q1-Q6, etc.)
- Statut de chaque décision (VERROUILLÉE / OUVERTE / ANNULÉE)
- Source et date

### PARTIE 16 — PROBLÈMES OUVERTS ET QUARANTAINES

De TOUS les documents :
- Éléments en QUARANTAINE
- Problèmes non résolus
- Tests non lancés
- Chantiers ouverts

### PARTIE 17 — CHRONOLOGIE COMPLÈTE

| Date | Événement | Tag/Commit |
|------|-----------|-----------|
| ... | ... | ... |

De TOUS les SESSION_SAVEs et git tags.

# ═══════════════════════════════════════════════════════════════════════════════
# LIVRABLES
# ═══════════════════════════════════════════════════════════════════════════════

| Fichier | Contenu |
|---------|---------|
| docs/OMEGA_MASTER_KNOWLEDGE_BASE.md | LE document centralisé < 200 KB |
| data/SCAN_INVENTORY.json | Inventaire de tous les fichiers scannés |

## Commit

```bash
git add -A
git commit -m "docs: OMEGA MASTER KNOWLEDGE BASE — scan total 434 files, centralized all measurements

INVENTAIRE:
  scoring/data: 45 JSON (745 KB)
  results_r1: 183 files (111 MB) — 181 œuvres × 121 features × 12 fenêtres
  results_r2: 7 JSON (12 MB) — topologie narrative
  results_rosetta: 30+ files (438 KB) — reverse engineering LLM
  docs: 144 files (1.8 MB) — SESSION_SAVEs + rapports
  bench sessions: X sessions

CENTRALISÉ: XX mesures, XX règles, XX décisions, XX constantes

1911 tests PASS"
git tag omega-knowledge-base-v1
```

# ═══════════════════════════════════════════════════════════════════════════════
# CRITÈRES DE SORTIE
# ═══════════════════════════════════════════════════════════════════════════════

- [ ] TOUS les 45 JSON de scoring/data/ lus et résumés
- [ ] Métrologie R1 (25 MB) résumée (20 features clés × 12 fenêtres)
- [ ] 7 fichiers R2 résumés
- [ ] TOUTE la hiérarchie Rosetta extraite
- [ ] TOUS les SESSION_SAVEs des 90 jours lus
- [ ] TOUS les rapports techniques lus
- [ ] TOUS les bench récents résumés
- [ ] Le document fait < 200 KB
- [ ] Chronologie complète
- [ ] Toutes les décisions verrouillées listées
- [ ] Tous les problèmes ouverts listés
- [ ] 1911 tests PASS
- [ ] Commit + tag

# ═══════════════════════════════════════════════════════════════════════════════
# BUDGET
# API : 0 appels
# Temps estimé : 15-30 min (lecture + assemblage)
# Taille sortie : < 200 KB (1 fichier .md)
# ═══════════════════════════════════════════════════════════════════════════════
