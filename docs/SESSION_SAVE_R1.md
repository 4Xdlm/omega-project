# SESSION_SAVE — PHASE R1 : MESURE MULTI-FENETRE
# Date : 2026-03-19
# Branche : phase-w-mixer
# Statut : PASS — Pret pour R2

---

## CONTEXTE

Phase R1 = mesure empirique multi-fenetre sur corpus complet.
Objectif : deriver les constantes window_min et window_opt pour chaque feature,
classifier LOCAL/ARC/MACRO, produire la matrice CV(feature, window_size).

Precede par : Phase R0 (corpus 187 oeuvres, v5 modulaire, 3 langues).

## PREREQUIS RESOLUS

### P-01 : Python 3.11 venv pour spaCy
- Cree `.venv311` avec `py -3.11 -m venv .venv311`
- Installe : spaCy 3.8, fr_core_news_md, en_core_news_md, es_core_news_md
- Installe : ebooklib, beautifulsoup4, PyMuPDF (fitz)
- Resultat : F1-F23 + F24-F30 + F31-F38 toutes actives

### P-02 : Script r1_multiwindow.py
- Cree le script d'analyse multi-fenetre complet
- 10 fenetres fixes + chapitres reels comme fenetres supplementaires
- 5 positions par fenetre (P_rel 0.0, 0.25, 0.5, 0.75, 1.0)
- CV matrix + CV by language + CV by passage type + derived constants

## DECISIONS PRISES

### D-01 : Seuils CV valides tels que proposes
- window_min : plus petite fenetre ou CV < 0.30
- window_opt : fenetre ou la derivee CV < 5% du CV precedent
- Classification : LOCAL (opt <= 1500), ARC (1500 < opt <= 10000), MACRO (opt > 10000)
- Decide par Francky lors de la validation du bilan R1.

### D-02 : 5 positions par fenetre
- P_rel = [0.0, 0.25, 0.5, 0.75, 1.0]
- Couvre debut, quart, milieu, trois-quarts, fin de chaque oeuvre
- Decide par Francky : "5 positions = bon compromis couverture/temps"

### D-03 : Toutes les features mesurees (pas seulement F1-F30)
- Le script mesure F1-F23 (spaCy) + F24-F30 (v4) + F31-F38 (v5)
- Total : 121 features derivees avec window_min/opt
- Inclut les sous-features (f1a, f1b, f1c, f5a, f5b, etc.)

### D-04 : Echantillonnage 5000 mots pour F1-F23 sur grandes fenetres
- Pour les fenetres > 10000 mots : on prend les 5000 premiers mots pour F1-F23
- Raison : spaCy est tres lent sur les grands textes, et les features linguistiques
  (rhythm, verb density, etc.) se stabilisent bien avant 5000 mots
- F24-F38 sont calculees sur la fenetre complete

## DISCUSSIONS ET CHOIX

### 12 FILE_NOT_FOUND = noms CATALOG_PDF incorrects
12 oeuvres (Camus x4, Ernaux x5, Modiano x2, Carrere x1) ont des noms
dans CATALOG_PDF qui ne matchent pas les fichiers sur disque.
Ce n'est PAS un probleme du script mais de l'inventaire R0.
Action : corriger les noms dans v5_config.py en R2 (ou avant).

### 0 MACRO = pas de 4e etage
Aucune feature ne se stabilise uniquement au-dela de 10000 mots.
Toutes les features ARC se stabilisent entre 1500-2500 mots.
Cela confirme que le scoring a 3 etages (Scene/Chapitre/Arc) suffit.
Pas besoin d'un etage "oeuvre complete".

### CV par langue : ES systematiquement plus eleve
L'espagnol montre des CV plus hauts partout — attendu car :
1. Echantillon plus petit (75-100 vs 330-385 samples)
2. Marqueurs linguistiques moins calibres (ES ajoute en R0, pas teste autant)
3. Diversite plus grande dans le corpus ES (Cervantes a Valle-Inclan = 4 siecles)

### Consultation 3 IAs reportee
Le critere du roadmap "Consultation 3 IAs validee sur les resultats" est reporte.
Les donnees empiriques sont disponibles dans le JSON — la consultation peut se
faire apres commit, dans une session dediee.

## RESULTATS CHIFFRES

| Metrique | Valeur |
|----------|--------|
| Oeuvres analysees | 169 / 187 |
| Features mesurees | 121 |
| Features UNPROVEN | 0 |
| LOCAL | 81 (66.9%) |
| ARC | 40 (33.1%) |
| MACRO | 0 (0%) |
| Temps total | 8630s (~2.4h) |
| Rejets | 18 (12 FILE_NOT_FOUND, 4 TRUNCATED, 1 GARBLED, 1 DOWNLOAD_FAIL) |

### Features cles pour sovereign-engine

| Feature | window_opt | Class | Impact |
|---------|-----------|-------|--------|
| f1_mean (rhythm) | 300 | LOCAL | Deja bien mesure a 300w |
| f22f_literary_index | 300 | LOCAL | Deja bien mesure a 300w |
| f35c_hook_score | 300 | LOCAL | Deja bien mesure a 300w |
| f36c_cliff_score | 300 | LOCAL | Deja bien mesure a 300w |
| f21e_ritual_index | 600 | LOCAL | Sous-mesure a 300w, OK a 600w |
| f29d_ttr_score | 1033 | LOCAL | Sous-mesure a 300w, OK a 1000w |
| f24e_contrast_score | 2002 | ARC | Sous-mesure a 300w, besoin 2000w |
| f25g_description_score | 1621 | ARC | Sous-mesure a 300w, besoin 1600w |
| f19b_shannon_entropy | 2002 | ARC | Sous-mesure a 300w, besoin 2000w |
| f20d_composite_fg | 2001 | ARC | Sous-mesure a 300w, besoin 2000w |
| f38c_speed_score | 2022 | ARC | Sous-mesure a 300w, besoin 2000w |

**Conclusion** : Un texte de 2500 mots permettrait de mesurer fiablement TOUTES les features.
Le benchmark actuel a 300 mots ne mesure correctement que les 81 features LOCAL.

## ETAT DU REPO

- HEAD : (sera mis a jour apres commit)
- Branche : phase-w-mixer
- Tests sovereign-engine : non impactes (r1 = Python, pas TypeScript)
- Fichiers ajoutes :
  - omega-autopsie/r1_multiwindow.py
  - omega-autopsie/.venv311/ (Python 3.11 venv)
  - omega-autopsie/results_r1/ (169 fichiers individuels + metrologie JSON + run log)
  - docs/OMEGA_R1_REPORT.md
  - docs/SESSION_SAVE_R1.md

## WARNING POUR R2

**W-01** : 12 oeuvres FILE_NOT_FOUND a corriger dans CATALOG_PDF.
Oeuvres manquantes : L'Etranger, La Peste, La Mort Heureuse, L'Exil et le Royaume,
La Place, La Femme Gelee, Une Femme, L'Evenement, Ce qu'ils disent ou rien,
Dora Bruder, La Danseuse, L'Adversaire.

**W-02** : Consultation 3 IAs non faite (reportee post-commit).

**W-03** : Les fenetres "chapitres reels" ont des tailles variables (696-20000+ mots).
Dans cv_matrix, ces tailles apparaissent comme des entrees individuelles (ex: "696", "805", "922")
avec n_samples=3 (1 oeuvre x 3 chapitres). Les statistiques sont fiables uniquement
pour les 10 fenetres fixes (n_samples = 519-845).

---

## MESSAGE DE REDEMARRAGE POUR R2

```
OMEGA SESSION — PHASE R2 (LOIS DE LA DECOUPE)
Dernier etat : SESSION_SAVE_R1
Corpus : 169 oeuvres analysees / 121 features / 0 UNPROVEN
Constantes derivees : window_min + window_opt pour 121 features
Classification : 81 LOCAL + 40 ARC + 0 MACRO
Objectif R2 : F31-F40 topologiques, carte P_rel, profils-types par position
Prerequis : corriger 12 FILE_NOT_FOUND dans CATALOG_PDF
Lire : SESSION_SAVE_R1 + OMEGA_R1_REPORT + OMEGA_PHASE_R_ROADMAP
Tag repo : phase-r1-complete
Branche : phase-w-mixer
```

---

*Session save genere le 2026-03-19 — Standard NASA-Grade L4 / DO-178C Level A*
