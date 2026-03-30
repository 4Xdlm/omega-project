# Phase P5 — Fiabilite Inter-Annotateurs Omega / I / U

**Standard** : OMEGA NASA-Grade L4 / DO-178C Level A
**Date** : 2026-03-30

---

## Objectif

Mesurer la reproductibilite des 3 variables humaines du modele PVI :
- **Omega** : resolution narrative (la fin declenche-t-elle la recommandation ?)
- **I** : identifiabilite du protagoniste (le lecteur se projette-t-il ?)
- **U** : unicite du protagoniste (est-il distinct de tout personnage connu ?)

Ces variables sont les seules du modele MINIMAL qui ne sont pas calculees par NLP.
Leur fiabilite conditionne la validite du PVI entier.

---

## Corpus P5 — 20 titres

| Categorie | N | FR | EN | Critere de selection |
|-----------|---|----|----|---------------------|
| Bestseller | 5 | 2 | 3 | PASS fort, proba > 0.75 |
| Niche | 5 | 3 | 2 | FAIL net, proba < 0.35 |
| Borderline | 5 | 3 | 2 | BORDERLINE, proba 0.45-0.65 |
| Adversarial | 5 | 2 | 3 | Fins ouvertes, narration experimentale |
| **Total** | **20** | **10** | **10** | |

Fichier : `p5_corpus_20_titres.csv`

### Cas adversariaux (justification)

| Titre | Defi pour l'annotateur |
|-------|----------------------|
| Triste tigre (Sinno) | Autofiction trauma — protagoniste = auteure, distanciation extreme |
| La Modification (Butor) | Narration 2e personne — qui est "vous" ? Fin ouverte |
| Lolita (Nabokov) | Narrateur non fiable, moralement complexe — I et U subjectifs |
| The Turn of the Screw (James) | Fin ambigue celebre — Omega impossible a trancher |
| Heart of Darkness (Conrad) | Narration enchassee — protagoniste = Marlow ou Kurtz ? |

---

## Protocole d'annotation

### Sous-composantes

**Omega (resolution)** — score 0.0 a 1.0 par sous-composante :
- `R_t` (0.35) : Resolution de la tension principale
- `C_a` (0.30) : Coherence avec l'arc du protagoniste
- `S_f` (0.15) : Surprise (element non telephone)
- `C_e` (0.20) : Cloture emotionnelle

**I (identification)** — score 0.0 a 1.0 :
- `P_p` (0.30) : Presence physique du protagoniste
- `D_i` (0.25) : Desir identifiable (objectif clair)
- `V_p` (0.25) : Voix propre (style reconnaissable)
- `L_e` (0.20) : Lien emotionnel (le lecteur s'attache)

**U (unicite)** — score 0.0 a 1.0 :
- `D_s` (0.30) : Distinction de stereotypes
- `M_t` (0.25) : Memoire a long terme (on s'en souvient 6 mois apres)
- `N_c` (0.20) : Nommable en une phrase
- `P_r` (0.25) : Paradoxe interne (contradictions qui enrichissent)

### Formules

```
Omega = 0.35 * R_t + 0.30 * C_a + 0.15 * S_f + 0.20 * C_e
I     = 0.30 * P_p + 0.25 * D_i + 0.25 * V_p + 0.20 * L_e
U     = 0.30 * D_s + 0.25 * M_t + 0.20 * N_c + 0.25 * P_r
```

### Instructions annotateur

1. Lire le titre entier (pas de resume)
2. Annoter les 12 sous-composantes (4+4+4) en 0.00-1.00
3. Ajouter une justification par variable (1-2 phrases)
4. Indiquer le niveau de confiance (faible/moyenne/forte)
5. Ne pas consulter les scores PVI existants avant annotation
6. Session T0 : premiere passe / Session T1 : re-annotation 2+ semaines apres

### Format JSONL

Fichier `p5_annotation_template.jsonl` — une ligne JSON par titre.

---

## Analyse (pvi_p5_reliability.py)

### Usage

```bash
# Inter-annotateurs (A vs B)
py -3.11 pvi_p5_reliability.py --a annotations_A.jsonl --b annotations_B.jsonl

# Test-retest (T0 vs T1, meme annotateur)
py -3.11 pvi_p5_reliability.py --a T0.jsonl --b T1.jsonl --mode test-retest

# Multi-annotateurs avec ICC
py -3.11 pvi_p5_reliability.py --a a1.jsonl --b a2.jsonl --multi a3.jsonl a4.jsonl --icc
```

### Metriques calculees

| Metrique | Description |
|----------|-------------|
| Delta moyen / median / std | Ecart absolu entre annotateurs |
| % Delta <= 0.05 / <= 0.10 / > 0.15 | Distribution des ecarts |
| Pearson | Correlation lineaire T0 vs T1 |
| Spearman | Correlation de rang |
| ICC(3,1) | Intraclass (si > 2 annotateurs) |
| Stabilite verdict | % titres gardant PASS/BORDER/FAIL apres swap Omega/I |
| Cas divergents | Liste des Delta > 0.15 avec sous-composante causale |
| Heatmap | Delta moyen par sous-composante |

### Seuils de decision

| Grade | Delta moyen | Pearson | Action |
|-------|-------------|---------|--------|
| **EXCELLENT** | <= 0.05 | >= 0.90 | Variable fiable, aucune action |
| **ACCEPTABLE** | <= 0.10 | >= 0.75 | Variable utilisable, surveiller |
| **CRITIQUE** | > 0.15 | < 0.70 | Variable non fiable — recalibrer les sous-composantes |

### Sorties

- `rapport_p5_{mode}_{date}.md` — rapport markdown complet
- `rapport_p5_{mode}_{date}.json` — donnees machine-readable

---

## Fichiers

| Fichier | Description |
|---------|-------------|
| `p5_corpus_20_titres.csv` | 20 titres selectionnes avec scores NLP de reference |
| `p5_annotation_template.jsonl` | Gabarit vierge (20 entrees) |
| `p5_annotation_T0.jsonl` | Copie de travail pour session T0 (a remplir) |
| `pvi_p5_reliability.py` | Script d'analyse |
| `README_P5.md` | Ce fichier |

---

## Workflow

```
1. Distribuer p5_annotation_template.jsonl a chaque annotateur
2. Annotateur remplit les 12 sous-composantes + justifications
3. Collecter les fichiers completes (renommer: p5_ann_francky_T0.jsonl, etc.)
4. Lancer pvi_p5_reliability.py --a fichier1 --b fichier2
5. Analyser le rapport : quelles variables sont fiables ?
6. Si CRITIQUE : ajuster les definitions des sous-composantes et re-annoter
7. Session T1 : re-annoter 2+ semaines apres pour test-retest
```

---

**Standard : OMEGA NASA-Grade L4 / DO-178C Level A**
