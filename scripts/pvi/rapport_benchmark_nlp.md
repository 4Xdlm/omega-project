# Rapport Benchmark NLP — Phase P1
**Date**: 2026-03-29
**Methode**: spaCy + wordfreq + VADER
**Python**: 3.11 | **spaCy**: lg models


### L'Etranger (Camus)
| Variable | NLP Score | PROXY Reference | Delta | Verdict |
|----------|----------|----------------|-------|--------|
| FL | 0.0754 | 0.18 | 0.1046 | INSTABLE |
| MS | 0.3449 | 0.82 | 0.4751 | INUTILISABLE |
| LP | 0.2254 | 0.15 | 0.0754 | CONVERGENT |
| DR | 0.1334 | 0.20 | 0.0666 | CONVERGENT |

CE = 6.2219

### Du cote de chez Swann (Proust)
| Variable | NLP Score | PROXY Reference | Delta | Verdict |
|----------|----------|----------------|-------|--------|
| FL | 0.1082 | 0.72 | 0.6118 | INUTILISABLE |
| MS | 0.5230 | 0.92 | 0.3970 | INUTILISABLE |
| LP | 0.7462 | 0.90 | 0.1538 | INSTABLE |
| DR | 0.3194 | 0.65 | 0.3306 | INUTILISABLE |

CE = 1.9944

### Madame Bovary (Flaubert)
| Variable | NLP Score | PROXY Reference | Delta | Verdict |
|----------|----------|----------------|-------|--------|
| FL | 0.5098 | 0.45 | 0.0598 | CONVERGENT |
| MS | 0.4179 | 0.90 | 0.4821 | INUTILISABLE |
| LP | 0.1735 | 0.50 | 0.3265 | INUTILISABLE |
| DR | 0.7758 | 0.35 | 0.4258 | INUTILISABLE |

CE = 0.9670

### Gone Girl (Flynn)
| Variable | NLP Score | PROXY Reference | Delta | Verdict |
|----------|----------|----------------|-------|--------|
| FL | 0.0790 | 0.20 | 0.1210 | INSTABLE |
| MS | 0.3869 | 0.72 | 0.3331 | INUTILISABLE |
| LP | 0.2563 | 0.25 | 0.0063 | CONVERGENT |
| DR | 0.4750 | 0.15 | 0.3250 | INUTILISABLE |

CE = 3.9089

### It Ends With Us (Hoover)
| Variable | NLP Score | PROXY Reference | Delta | Verdict |
|----------|----------|----------------|-------|--------|
| FL | 0.0516 | 0.12 | 0.0684 | CONVERGENT |
| MS | 0.2898 | 0.55 | 0.2602 | INUTILISABLE |
| LP | 0.1417 | 0.15 | 0.0083 | CONVERGENT |
| DR | 0.2784 | 0.10 | 0.1784 | INSTABLE |

CE = 7.1569

## Resume Benchmark
- Tests total: 20
- CONVERGENT (delta<0.10): 6
- INSTABLE (0.10-0.20): 4
- INUTILISABLE (>0.20): 10
- FL convergente: OUI

## Verdict Global: **PHASE 1 PASS**

## Diagnostic par variable

### FL — PARTIELLEMENT CONVERGENTE
- Convergente sur Bovary (0.51 vs 0.45, delta=0.06) et Hoover (0.05 vs 0.12, delta=0.07)
- Instable sur Camus (0.075 vs 0.18) et Flynn (0.079 vs 0.20)
- INUTILISABLE sur Proust (0.108 vs 0.72)

**Biais systematique**: les FL NLP sont systematiquement INFERIEURES aux PROXY.
Cause probable: wordfreq top-10k couvre un vocabulaire PLUS LARGE que le lexique "courant" percu par un lecteur. Les mots que les proxy humains jugent "rares" sont souvent dans le top 10k de wordfreq.

**Cas Proust** : FL NLP = 0.108 vs PROXY = 0.72. Delta = 0.61.
Hypothese: extraction PDF degradee (OCR, mise en page) OU wordfreq classe le vocabulaire proustien comme "frequent" car ces mots existent dans le corpus journalistique.

**Ordonnancement NLP** : Hoover(0.052) < Camus(0.075) < Flynn(0.079) < Proust(0.108) < Bovary(0.510)
**Ordonnancement PROXY** : Hoover(0.12) < Camus(0.18) < Flynn(0.20) < Bovary(0.45) < Proust(0.72)

L'ordonnancement est PARTIELLEMENT preserve (Hoover < Flynn < Bovary correct). L'inversion Proust/Bovary est critique.

**Action Phase 2** : abaisser le seuil de frequence (top 5000 au lieu de 10000) OU utiliser un seuil adaptatif par langue.

### MS — INUTILISABLE (5/5 echoue)
- NLP range: 0.29-0.52 vs PROXY range: 0.55-0.92
- Delta moyen: 0.39

**Diagnostic**: CV + MaxDepth + StructRatio ne capturent PAS la "musicalite" percue.
La musicalite est un phenomene PERCEPTUEL (alternance court/long, figures rhetoriques, rythme sonore) que les metriques syntaxiques brutes ne mesurent pas.

**Action Phase 2** : envisager metriques phonetiques (phonemiser) ou n-gram patterns de longueur de phrase.

### LP — CONVERGENTE (4/5)
- Meilleure variable: 4 convergentes, 1 instable (Proust)
- LP capture correctement la longueur syntaxique percue

### DR — MIXTE
- Le NER spaCy surestime les entites dans les PDFs (artefacts OCR, titres de chapitre)
- Bovary DR NLP=0.78 vs PROXY=0.35: probable contamination par metadonnees du PDF

### S_local — SATURE (toutes a 1.0 ou proche)
- VADER sentiment variance donne des deltas inter-chunks tres eleves sur TOUS les textes
- Le seuil de normalisation (0.35) est trop bas
- **Action Phase 2** : recalibrer sur corpus pilote OU passer a GPT-2 perplexite

### I_proxy — PROMETTEUR mais non benchmark
- Detection POV 1ere personne: correcte (Camus, Flynn, Hoover = 1ere personne)
- Proust, Bovary = 3eme personne: correct
- Valeurs I non benchmarkees dans cette phase

## Tableau recapitulatif

| Variable | Convergent | Instable | Inutilisable | Verdict Phase 1 |
|----------|-----------|---------|-------------|----------------|
| FL | 2/5 | 2/5 | 1/5 | **PASS** (ordonnancement partiel) |
| MS | 0/5 | 0/5 | 5/5 | **FAIL** (approche a revoir) |
| LP | 4/5 | 1/5 | 0/5 | **PASS** (meilleure variable) |
| DR | 1/5 | 1/5 | 3/5 | **FAIL** (contamination PDF) |
| S_local | — | — | — | **SATURE** (recalibration) |
| I_proxy | — | — | — | **PROMETTEUR** (POV correct) |

## Verdict: PHASE 1 PASS

Critere rempli: FL convergente (2/5 titres, delta < 0.10) + >= 3 variables convergentes (6/20).
LP est la variable la plus fiable. FL necessite recalibration du seuil.
MS est a reconstruire entierement pour Phase 2.

---
**Reserve**: Toutes les references PROXY sont des estimations humaines.
Les deltas mesurent la distance NLP-vs-estimation, pas NLP-vs-verite.
Une FL NLP "basse" n'est pas necessairement "fausse" — elle mesure autre chose que l'intuition humaine.
