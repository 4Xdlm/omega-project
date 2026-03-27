# OMEGA — DECISIONS MULTI-ECHELLE
**Date** : 2026-03-27
**Source** : MASTER_SCALE_AUDIT.md
**Standard** : NASA-Grade L4 / DO-178C Level A

---

## DECISIONS D'INGENIERIE

### D1. Taille minimale interpretable par feature

| Feature | Taille min | Confiance | Verdict |
|---------|-----------|-----------|---------|
| f29d_ttr_score | 30w | 0.92+ | PASS a toute taille |
| f16a_bigram_rarity | 30w | 0.97+ | PASS a toute taille |
| f24e_contrast_score | 30w | 0.90+ | PASS a toute taille |
| f36c_cliff_score | 30w | 0.82+ | PASS a toute taille |
| f1b_rhythm_ratio | 150w | 0.72+ | PASS des 200w |
| f38c_speed_score | 150w | 0.75+ | PASS des 200w |
| f35c_hook_score | 300w | 0.65 | PASS des 300w |
| f25g_description_score | 300w | 0.70 | PASS des 500w (ARC ideal) |
| f20d_composite_fg | 600w | 0.66 | PASS des 500w |
| f17_knife_count | 1000w | 0.70 | Downweight sous 700w |
| f25b_sensory_coverage | 1000w | 0.72 | Downweight sous 700w |
| f19a_approx_entropy | 1500w | 0.77 | OFF sous 1000w |

### D2. Types fiables par taille

| Taille | Types detectables | Fiabilite |
|--------|------------------|-----------|
| < 300w | DESCRIPTION, DIALOGUE | Instable (80% DESC par defaut) |
| 300-1000w | DESC, DIALOG, +rares INTRO/TRANS | Acceptable mais fragile |
| > 1000w | Tous 5 types | Fiable |

### D3. Features qui changent structurellement avec la taille

| Feature | Comportement | Consequence |
|---------|-------------|-------------|
| f1_mean | CV monte avec taille (signal inter-auteurs emerge) | Normal. Ne pas confondre avec instabilite. |
| f1a_rhythm_variance | CV > 0.80 partout, monte avec taille | Feature structurellement bruyante. Ponderer bas. |
| f26b_long_sent_rate | Bimodal a toute taille (CV > 1.0) | Discriminante malgre CV eleve. Utiliser delta S-D, pas CV. |
| f22f_literary_index | CV > 1.2 partout | Probablement mal normalise. A investiguer. |
| f28d_sil_score | CV 1.1-2.0 partout | Trop instable pour scoring. |

### D4. Features jugeables localement

Les features suivantes conservent leur sens meme sur de petits passages (200w) :
- **f29d_ttr_score** — richesse lexicale
- **f16a_bigram_rarity** — rarete bigrammes
- **f16c_lexical_surprise** — surprise lexicale
- **f24e_contrast_score** — contraste lexical
- **f36c_cliff_score** — tension fin
- **f1b_rhythm_ratio** — ratio rythmique

### D5. Features exigeant ARC / macro

| Feature | Fenetre min | Fenetre optimale |
|---------|-------------|------------------|
| f19a_approx_entropy | 1000w | 2500w |
| f25b_sensory_coverage | 700w | 2000w |
| f25g_description_score | 500w | 2000w |
| f20d_composite_fg | 500w | 2000w |

### D6. Gating par taille

| Famille | < 300w | 300-700w | 700-1500w | > 1500w |
|---------|--------|----------|-----------|---------|
| Rythme (f1_mean, f1b) | poids 0.7 | poids 1.0 | poids 1.0 | poids 1.0 |
| Couteau (f17_knife) | OFF | poids 0.5 | poids 0.8 | poids 1.0 |
| Lexical (f29d, f16a) | poids 1.0 | poids 1.0 | poids 1.0 | poids 1.0 |
| Description (f25g) | poids 0.5 | poids 0.7 | poids 0.9 | poids 1.0 |
| Sensoriel (f25b) | OFF | poids 0.5 | poids 0.8 | poids 1.0 |
| Entropie (f19a) | OFF | OFF | poids 0.5 | poids 1.0 |
| Figures (f20d) | OFF | poids 0.7 | poids 0.9 | poids 1.0 |
| Tension (f35c, f36c) | poids 0.8 | poids 1.0 | poids 1.0 | poids 1.0 |

### D7. Seuils et modificateurs pour OMEGA runtime

```json
{
  "size_gating": {
    "f17_knife_count": {"min_size": 300, "full_weight_size": 1000},
    "f25b_sensory_coverage": {"min_size": 300, "full_weight_size": 1000},
    "f19a_approx_entropy": {"min_size": 700, "full_weight_size": 1500},
    "f25g_description_score": {"min_size": 200, "full_weight_size": 1000},
    "f20d_composite_fg": {"min_size": 300, "full_weight_size": 1000}
  },
  "always_active": [
    "f29d_ttr_score", "f16a_bigram_rarity", "f16c_lexical_surprise",
    "f24e_contrast_score", "f36c_cliff_score", "f1b_rhythm_ratio"
  ],
  "never_gate_by_cv": [
    "f26b_long_sent_rate", "f1a_rhythm_variance"
  ]
}
```

---

## PASS / FAIL PAR DECISION

| Decision | Statut |
|----------|--------|
| D1. Taille min par feature | **PASS** — 12 features documentees |
| D2. Types par taille | **PASS** — 3 paliers definis |
| D3. Changements structurels | **PASS** — 5 features identifiees |
| D4. Features locales | **PASS** — 6 features confirmees |
| D5. Features ARC | **PASS** — 4 features documentees |
| D6. Gating par taille | **PASS** — Tableau complet 4 paliers x 8 familles |
| D7. Seuils runtime | **PASS** — JSON exploitable |
