# OMEGA — ARCHEOLOGIE AUDIT BRUT MULTI-ECHELLE
**Date** : 2026-03-27
**Standard** : NASA-Grade L4 / DO-178C Level A
**Mode** : CALCUL PUR — 0 API — ZERO INTERPOLATION

---

## 1. CORPUS TEXTES BRUTS TROUVES

| Repertoire | Fichiers | Taille totale | Contenu |
|-----------|----------|---------------|---------|
| omega-autopsie/corpus_r/txt/ | 571 .txt | 404 MB | Corpus principal — livres complets |
| omega-autopsie/gutenberg_cache/ | 224 .txt | 133 MB | Textes Gutenberg domaine public |
| C:/Users/elric/Downloads/livre/ | 465 .epub/.pdf | N/A | Sources originales (pas de texte brut) |
| packages/omega-p0/corpus/ | 20 .txt | ~10 KB | Exemplaires style humain/IA — NON UTILISES |

**Source primaire utilisee** : `omega-autopsie/corpus_r/txt/` (571 fichiers)

## 2. METADONNEES DE QUALITE / TIERS

| Fichier | Chemin | Oeuvres | Tiers | Format ID |
|---------|--------|---------|-------|-----------|
| CORPUS_FEATURES_MASTER.json | corpus_r/ | 571 | S:278 A:91 B:101 C:91 D:10 | filename.txt |
| CORPUS_TIERS_V3.json | corpus_r/ | 571 | idem | filename.txt |
| R4_FEATURE_AUDIT.json | results_phase_r/ | 571 (stats) | idem | par feature |
| R1 per-work files | results_r1/ | 181 | non rattache | author_Title |

**Source primaire utilisee** : CORPUS_FEATURES_MASTER.json (filename direct = nom du .txt)

## 3. SCRIPTS / RAPPORTS / JSON PREEXISTANTS

### Multi-scale / fenetre
| Artefact | Chemin | Couverture | Statut |
|----------|--------|-----------|--------|
| r1_multiwindow.py | omega-autopsie/ | 181 oeuvres, 10 tailles | REFERENCE — pas reutilise comme source |
| OMEGA_R1_REPORT.md | docs/ | CV par feature x taille | REFERENCE SEULEMENT |
| OMEGA_METROLOGIE_EMPIRIQUE_v1.json | results_r1/ | CV matrix 121 features | REFERENCE SEULEMENT |
| MASTER_SCALE_LADDER.json | src/scoring/data/ | Audit precedent INTERPOLE | **REJETE comme source** |
| MASTER_SCALE_AUDIT.md | docs/ | Rapport precedent | **REJETE** (interpolations) |

### Type detector
| Artefact | Chemin | Statut |
|----------|--------|--------|
| OMEGA_PASSAGE_TYPES.json | results_r2/ | EN QUARANTAINE — informatif seulement |
| passage-type-detector.ts | sovereign-engine/src/ | EN QUARANTAINE |

### Corpus features
| Artefact | Chemin | Statut |
|----------|--------|--------|
| CORPUS_FEATURES_MASTER.json | corpus_r/ | Tier + features a 500w — TIERS REUTILISES |
| features/ (571 JSON) | corpus_r/ | Per-work features — NON REUTILISE |
| R7_MULTISCALE_SCORER_FINAL.json | results_phase_r/ | Modele ML — NON REUTILISE |

### Calibration
| Artefact | Chemin | Statut |
|----------|--------|--------|
| GB_V1_MODEL.json | src/scoring/data/ | Modele GB 42 features — NON REUTILISE |
| OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json | results_r3/ | Confidence table — COMPARAISON SEULEMENT |

## 4. CE QUI EST REUTILISE

| Element | Source | Usage |
|---------|--------|-------|
| Textes bruts (.txt) | corpus_r/txt/ | Source PRIMAIRE de toutes les mesures |
| Tiers S/A/B/C/D | CORPUS_FEATURES_MASTER.json | Classification qualite des oeuvres |
| Langues | CORPUS_FEATURES_MASTER.json | Filtrage par langue |
| Regex chapitres | extract_chapters.py | Adapte pour detection chapitres |
| Regex features | feature_dump.py | Adapte pour calcul features |

## 5. CE QUI EST REJETE

| Element | Raison |
|---------|--------|
| MASTER_SCALE_LADDER.json | Interpolations entre tailles R1 non mandatees |
| MASTER_SCALE_AUDIT.md | Conclusions basees sur interpolations |
| MASTER_FEATURE_COHERENCE_BY_SCALE.json | Donnees R1 a tailles differentes |
| R1 cv_matrix | Tailles 30/150/300/600/1000/1500/2500 — pas 200/500/700/2000 |
| Toute valeur pre-calculee | Le mandat exige tout depuis le texte brut |

## 6. CE QUI EST INSUFFISANT

| Element | Manque |
|---------|-------|
| spaCy sur Python 3.14 | Incompatible — pas de POS tagging, pas de subordination reelle |
| Features NLP | f22f_literary_index, f25g_description_score, f25b_sensory_coverage, f20d_composite_fg, f27d_modal_score, f28d_sil_score, f38c_speed_score, f30d_ps_imp_ratio, f12b_tense_switch_rate, f19b_shannon_entropy |
| Features semantiques | sensory_richness, corporeal_anchoring, focalisation, metaphor_novelty, anti_cliche |
| Features emotionnelles | tension_14d, emotion_coherence |

**DECISION** : Ces features sont marquees UNAVAILABLE. Aucune approximation, aucun fallback.
Seules les features calculables par regex depuis le texte brut sont incluses.

## 7. CE QUI A CAUSE LES MESURES "BIZARRES" PRECEDENTES

### 7.1 Interpolation entre tailles non mesurees
Le precedent audit interpolait lineairement entre les tailles R1 (150/300/600 etc.) pour estimer les tailles mandatees (200/500/700). Cette interpolation suppose une linearite qui n'est PAS garantie — les features peuvent avoir des comportements non lineaires entre deux points.

### 7.2 Matching tier deficient
Seulement 8/181 oeuvres R1 matchees avec tiers, rendant l'analyse par tier impossible. Le matching echouait car les formats d'identifiant sont incompatibles (author_Title vs filename.txt).

### 7.3 Melange fenetres fixes et chapitres
Les donnees R1 melangent fenetres a positions fixes (P_rel 0.05-0.95) et chapitres reels dans le meme cv_matrix. Les chapitres ont des tailles variables (~2000-3000 en moyenne) qui ne correspondent a aucune taille fixe.

### 7.4 Absence de stride fin
R1 utilisait 5 positions par taille (stride ~20%). Le present audit utilise stride 10% avec fenetres glissantes, donnant 5-10x plus de mesures par chapitre.

### 7.5 Sentence splitter non documente
Le split de phrases par regex est sensible aux seuils. Le precedent audit ne documentait pas explicitement le splitter utilise.

**DECISION du present audit** : Tous les seuils sont documentes, toutes les mesures sont depuis le texte brut, zero interpolation.
