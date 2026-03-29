# OMEGA PVI Module — Bestseller Predictor

Module autonome de prediction du potentiel de ventes intrinseques d'un texte litteraire.

**Modele**: MINIMAL v2 (4 variables: FL, I, Omega, T)
**AUC validation**: 0.9728 (42 titres hors echantillon)
**Precision post-2022**: 95% (19/20 titres)
**Statut**: Phase P4 COMPLETE

---

## Installation

```bash
# Python 3.11 requis (spaCy incompatible avec 3.14)
py -3.11 -m pip install spacy wordfreq vaderSentiment textblob ebooklib pdfplumber scikit-learn
py -3.11 -m spacy download fr_core_news_lg
py -3.11 -m spacy download en_core_web_lg
```

## Usage basique

```bash
# Analyser un roman francais
py -3.11 scripts/pvi/pvi_module_autonome.py --input mon_roman.epub --lang fr

# Analyser un roman anglais
py -3.11 scripts/pvi/pvi_module_autonome.py --input novel.epub --lang en
```

## Usage assiste (recommande)

Le mode assiste pose 5 questions pour estimer Omega (resolution) et U (unicite).
C'est le mode le plus precis.

```bash
py -3.11 scripts/pvi/pvi_module_autonome.py --input roman.epub --lang fr --assisted
```

Questions posees:
- Q1: La tension principale est-elle resolue a la fin ?
- Q2: Resolution coherente avec l'arc du protagoniste ?
- Q3: Element non telephone dans la resolution ?
- Q4: Fermeture emotionnelle possible ?
- Q5: Protagoniste describable en 10 mots uniques ?

Repondre: o (oui), n (non), p (partiel)

## Interpretation du rapport

### Phases PVI
| PVI | Phase | Signification |
|-----|-------|---------------|
| < 0.30 | Phase 1 | Mort organique — aucun potentiel detecte |
| 0.30-0.70 | Phase 2 | Niche viable — public restreint |
| 0.70-1.50 | Phase 3 | Succes solide — potentiel commercial |
| 1.50-3.00 | Phase 4 | Best-seller organique |
| > 3.00 | Phase 5 | Phenomene |

### Verdicts
| Probabilite | Verdict | Action |
|-------------|---------|--------|
| >= 65% | PASS | Potentiel bestseller detecte — optimiser les goulots |
| 50-65% | BORDERLINE | Signal ambigu — mode assiste recommande |
| < 50% | FAIL | Pas de potentiel bestseller intrinseque |

### Goulots critiques
| Goulot | Seuil | Impact |
|--------|-------|--------|
| GOULOT-I | I < 0.55 | Protagoniste non identifiable — R et W s'effondrent |
| GOULOT-Omega | Omega < 0.45 | Fin insatisfaisante — recommandation nulle |
| GOULOT-FL | FL > 0.65 | Vocabulaire hermetique — abandon lecteur |
| GOULOT-R | R < 0.50 | Lecteur n'atteint pas la fin |
| GOULOT-W | W < 0.50 | Transmissibilite nulle |
| GOULOT-ARC | N_rev < 2 | Arc trop lineaire |

### Zone OMEGA
Combinaison prose haute + bestseller (espace historiquement vide):
- FL <= 0.25, MS >= 0.85, Omega >= 0.72, I >= 0.65, T >= 0.75, N_rev >= 2
- Seuls titres historiques: Hemingway (Old Man), Fitzgerald (Gatsby)

## Sorties

Le module produit 2 fichiers dans le meme dossier que l'input:
- `rapport_pvi_[titre]_[date].md` — rapport lisible
- `rapport_pvi_[titre]_[date].json` — donnees brutes programmatiques

## Coefficients culturels

Le modele utilise des coefficients differents pour FR et EN:

| Variable | Poids FR | Poids EN | Interpretation |
|----------|---------|---------|----------------|
| Omega | +2.67 | +3.25 | EN penalise plus les fins ouvertes |
| I | +2.04 | +2.66 | I plus critique en EN |
| FL | -0.80 | **-3.11** | FL 3.9x plus penalisant en EN |
| T | +0.77 | +1.04 | — |

## Limites documentees

1. **Variables proxy** : I, S, A sont estimees par VADER sentiment (precision limitee)
2. **Omega en mode auto** : utilise un defaut profile (commercial/litteraire/mixte), pas l'analyse du texte
3. **U par defaut** : fixe a 0.65 en mode auto — mode assiste recommande
4. **MS v2** : 3/5 convergent — Flaubert et Hoover sous/sur-estimes
5. **Corpus calibration** : 218 titres A+B — suffisant mais pas exhaustif
6. **PDF extraction** : qualite variable selon le fichier source

## Lois validees

| Loi | Statut | Evidence |
|-----|--------|---------|
| LP5 (Paradoxe Maslej) | **CONFIRMEE** | MS x (1-FL) bestsellers > chefs d'oeuvre (FR + EN) |
| Ratio A/B ~5x | **CONFIRME** | FR=4.51x, EN=4.07x, Pilote=5.65x |
| FL EN-specifique | **CONFIRMEE** | FL 3.9x plus penalisant en EN qu'en FR |
| Omega = levier #1 | **CONFIRME** | Coefficient +4.10 (plus fort du modele) |
| LP1 (CE -> ventes) | Inter-groupe seul | CE separe A/B mais ne classe pas intra-groupe |
| Zone OMEGA | 2 titres EN trouves | Hemingway + Fitzgerald |

## Arborescence scripts/pvi/

```
scripts/pvi/
  pvi_module_autonome.py     Module principal CLI
  pvi_nlp_scorer.py          Extracteur NLP (FL, MS, LP, DR, S, A, I)
  pvi_calibration.py         Calibration P2 (LogReg, split, CV)
  pvi_validation_p3.py       Validation hors echantillon P3
  correct_corpus_fl.py       Correction FL NLP corpus
  benchmark_fl_ms_v2.py      Benchmark FL 3 seuils + MS v2
  coefficients_v2.json       Coefficients universels (GELE)
  coefficients_v2_FR.json    Coefficients culturels FR
  coefficients_v2_EN.json    Coefficients culturels EN
  test_set_gele.csv          42 titres test (GELE)
  requirements_pvi.txt       Dependances Python
```
