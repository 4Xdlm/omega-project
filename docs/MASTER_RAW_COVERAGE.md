# OMEGA — COUVERTURE AUDIT BRUT MULTI-ECHELLE
**Date** : 2026-03-27 | **Standard** : NASA-Grade L4 | **Mode** : CALCUL PUR — 0 API

---

## Corpus

| Metrique | Valeur |
|----------|--------|
| Fichiers texte detectes | 571 |
| Livres exploitables | 571 (100%) |
| Livres sans chapitres | 0 (traites comme 1 chapitre) |
| Livres trop courts | 0 |
| Livres en erreur | 0 |
| **Chapitres totaux** | **23 005** |
| **Fenetres totales** | **1 381 345** |
| Temps de calcul | 1098s (~18 min) |

## Fenetres par taille

| Taille | Fenetres | % du total |
|--------|----------|-----------|
| 200w | 385 665 | 27.9% |
| 500w | 266 332 | 19.3% |
| 700w | 222 270 | 16.1% |
| 1000w | 172 246 | 12.5% |
| 2000w | 83 958 | 6.1% |
| Chapitre entier | 22 902 | 1.7% |
| **Total** | **1 381 345** | |

Note : les fenetres incluent SLIDING (stride 10%) + ANCHORED (START/MIDDLE/END).

## Tiers

| Tier | Livres | Distribution |
|------|--------|-------------|
| S | 278 | 48.7% |
| A | 91 | 15.9% |
| B | 101 | 17.7% |
| C | 91 | 15.9% |
| D | 10 | 1.8% |

## Features calculees (depuis texte brut, sans NLP)

| Famille | Features | Methode |
|---------|----------|---------|
| A: Taille/Rythme | 14 | Regex sentence split + stats |
| B: Longues/Courtes/Alternance | 12 | Seuils documentes |
| C: Lexical | 2 | TTR sliding window + bigram ratio |
| D: Syntaxe (proxy) | 1 | Comptage mots subordonnants |
| E: Ponctuation | 7 | Comptage direct |
| F/G: Hooks/Cliffs | 4 | Heuristiques premiers/derniers 100 mots |
| **TOTAL CALCULEES** | **40** | |

## Features NON disponibles (19)

Marquees UNAVAILABLE — aucune approximation :
- sensory_richness, corporeal_anchoring, focalisation, attention_sustain, fatigue_management
- metaphor_novelty, anti_cliche
- f22f_literary_index, f25g_description_score, f25b_sensory_coverage
- f20d_composite_fg, f27d_modal_score, f28d_sil_score, f38c_speed_score
- f30d_ps_imp_ratio, f12b_tense_switch_rate, f19b_shannon_entropy
- tension_14d, emotion_coherence

**Raison** : Requierent NLP (spaCy POS tagging, modeles entraines) ou API LLM. spaCy incompatible avec Python 3.14. Le venv Python 3.11 a spaCy mais pas scipy/numpy necessaires pour les statistiques.

## Seuils documentes

| Parametre | Valeur | Usage |
|-----------|--------|-------|
| LONG_SENT_THRESHOLD | > 40 mots | f26b_long_sent_rate |
| SHORT_SENT_THRESHOLD | < 10 mots | n_short_sentences |
| KNIFE_THRESHOLD | <= 5 mots | f17_knife_count |
| TRANS_LONG | > 30 mots | Transitions L->C |
| TRANS_SHORT | < 10 mots | Transitions C->L |
| MIN_CHAPTER_WORDS | 200 | Chapitre valide |
| STRIDE_RATIO | 10% | Fenetres glissantes |
| MIN_STRIDE | 20 mots | Stride minimum |
| Sentence splitter | regex: `(?<=[.!?…»])\s+`, min 6 chars | Coherent avec feature_dump.py |
