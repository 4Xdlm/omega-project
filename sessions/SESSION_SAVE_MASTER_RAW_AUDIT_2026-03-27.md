# SESSION SAVE — AUDIT BRUT MULTI-ECHELLE
**Date** : 2026-03-27
**Branche** : phase-r-metrology-rebuild

## Travail effectue

Audit multi-echelle recalcule integralement depuis le texte brut.
Zero interpolation, zero reutilisation de valeurs pre-calculees comme source.

### Metriques de production

| Metrique | Valeur |
|----------|--------|
| Livres analyses | 571 / 571 |
| Chapitres extraits | 23 005 |
| Fenetres mesurees | 1 381 345 |
| Features calculees | 40 (+ 19 UNAVAILABLE) |
| Tailles | 200, 500, 700, 1000, 2000, chapitre entier |
| Temps de calcul | 1098s (~18 min) |
| Taille CSV brut | 238 MB |

### Resultats cles

1. **6 features fiables des 200 mots** : f29d_ttr, f16a_bigram, cv_sent, f19a_entropy, f35c_hook, f36c_cliff
2. **4 features structurellement instables** : f26b, ratio_alt, f1a_rhythm_variance, knife_rate
3. **1 inversion de correlation** : ttr vs bigram (+0.15 a 200w, -0.49 a 2000w)
4. **f17 = 0.012 * size** (compteur lineaire parfait, R2=1.000)
5. **Les maitres (S) : mean_sent=22.1 vs C=12.6** (+76%)
6. **6 equations R2>0.80** pour OMEGA runtime

### Fichiers produits

**Data (src/scoring/data/):**
- MASTER_CORPUS_INVENTORY.json
- MASTER_CHAPTER_MANIFEST.csv
- MASTER_RAW_WINDOWS.csv (948K lignes, 238 MB)
- MASTER_RAW_SUMMARY_BY_SIZE.csv
- MASTER_RAW_SUMMARY_BY_TIER.csv
- MASTER_RAW_CORRELATIONS_BY_SIZE.json
- MASTER_RAW_COVERAGE.json
- MASTER_RAW_SIZE_GATING.json

**Rapports (docs/):**
- MASTER_RAW_ARCHAEOLOGY.md
- MASTER_RAW_COVERAGE.md
- MASTER_RAW_EQUATIONS.md
- MASTER_RAW_DECISIONS.md
- MASTER_RAW_AUDIT.md

**Script:**
- scripts/audit_raw_brut.py
