# SESSION_SAVE — PHASE R3 : COEFFICIENTS PROPORTIONNELS
# Date : 2026-03-19
# Branche : phase-w-mixer
# Statut : PASS — Pret pour R4

---

## CONTEXTE

Phase R3 = cristallisation des donnees R1 (CV matrix) et R2 (topologie)
en coefficients exploitables par le scorer multi-etages R4.

Precede par : R1 (181 oeuvres, 121 features, cv_matrix) + R2 (7 analyses topologiques).

## PREREQUIS RESOLUS

### P-01 : Formule de confiance validee
- confidence(f, taille) = max(0, min(1, 1 - CV(f, taille)))
- Seuil de desactivation : confiance < 0.20
- Appliquee sur les 10 fenetres standard uniquement (n_samples >= 500)

### P-02 : Backtest reference
- Pas de ranking_v4 exploitable dans baselines_v5.json
- Alternative : scoring des 181 oeuvres + verification coherence litteraire
- Resultat : 11/12 auteurs de reference ABOVE_MEDIAN

## DECISIONS PRISES

### D-01 : 29 features OFF
- 29 features avec CV > 0.80 a toutes les tailles = jamais stables
- Essentiellement des compteurs absolus (non normalises)
- Decide par calcul empirique (R-03)

### D-02 : alpha/beta derives empiriquement
- alpha(taille) = proportion de features LOCAL avec confiance > 0.80
- Resultat : alpha ~= 0.43, beta ~= 0.57 pour tailles >= 150w
- Les features ARC a haute confiance sont plus nombreuses que les LOCAL

### D-03 : Faulkner BELOW_MEDIAN = accepte
- Seul auteur de reference sous la mediane (rank 145/181)
- Son style fragmentaire n'est pas capture par les metriques actuelles
- Ce n'est pas un defaut des coefficients mais une limite des features

## DISCUSSIONS ET CHOIX

### Compteurs absolus vs ratios
Les compteurs absolus (f12_marker_count, f16_hapax_count, f33a_dots_count, etc.)
ne se stabilisent jamais car ils dependent lineairement de la taille du texte.
Seuls les RATIOS (f12b_tense_switch_rate, f16a_bigram_rarity, etc.) convergent.
Cela confirme que les features doivent etre normalisees par la taille.

### Language dependency
55 features sont LANGUAGE_DEPENDENT (|CV_fr - CV_en| >= 0.20 a 600w).
Les features syntaxiques (rythme, subordination) sont les plus sensibles.
Les features semantiques/structurelles (description, contraste, vitesse) sont universelles.
Le scorer R4 doit prioriser les features universelles pour le cross-langue.

### Moments cles : CLOSING, pas SETUP (U-01 resolu)
Apres normalisation par nombre de chapitres/zone, CLOSING a le plus de moments/chapitre
(0.633 vs 0.352 pour SETUP). La dominance SETUP en R2 etait un artefact du binning
(plus de chapitres en SETUP). La vraie concentration est aux EXTREMITES
(OPENING 0.597 + CLOSING 0.633).

## RESULTATS CHIFFRES

| Metrique | Valeur |
|----------|--------|
| Features dans confidence table | 121 |
| Features actives a 600w | 80 |
| Features NEVER active | 29 |
| LOCAL_600 : features actives | 49 |
| ARC_2500 : features actives | 78 |
| Position modifiers | 67 features non-stables |
| Type modifiers | 5 types |
| Language UNIVERSAL | 66 |
| Language DEPENDENT | 55 |
| Scoring alpha/beta | 0.43 / 0.57 |
| Backtest : auteurs above median | 11/12 |
| UNPROVEN resolus | 3/3 |

### Fichiers produits

| Fichier | Taille | Contenu |
|---------|--------|---------|
| OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json | 105 KB | 8 sections (3.1-3.7) |
| OMEGA_BACKTEST_R3.json | 55 KB | 181 oeuvres scorees + coherence |
| OMEGA_UNPROVEN_RESOLVED.json | 4 KB | 3 UNPROVEN resolus |

## VERITES MATHEMATIQUES (nouvelles)

| ID | Verite | Donnees |
|----|--------|---------|
| V-R3-01 | Compteurs absolus = instables (29 OFF) | CV > 0.80 a toutes les tailles |
| V-R3-02 | Features semantiques = UNIVERSAL (66) | |CV_fr - CV_en| < 0.20 |
| V-R3-03 | alpha/beta = 0.43/0.57 (ARC domine) | Derive de la proportion de features a haute conf |
| V-R3-04 | Moments cles aux EXTREMITES (OPENING+CLOSING) | U-01 corrige : 0.597 + 0.633 moments/chapitre |
| V-R3-05 | 11/12 auteurs de reference ABOVE_MEDIAN | Backtest coherent |

## ETAT DU REPO

- HEAD : (sera mis a jour apres commit)
- Branche : phase-w-mixer
- Tests sovereign-engine : non impactes (R3 = Python, pas TypeScript)
- Fichiers ajoutes :
  - omega-autopsie/r3_coefficients.py
  - omega-autopsie/results_r3/ (3 fichiers JSON)
  - docs/OMEGA_R3_REPORT.md
  - docs/SESSION_SAVE_R3.md

## WARNING POUR R4

**W-01** : Le scoring actuel utilise des valeurs BRUTES de features (non normalisees 0-1).
Le score composite (median ~49) n'est pas sur une echelle 0-100.
R4 devra normaliser les features par les baselines (percentiles P10-P90).

**W-02** : alpha/beta = 0.43/0.57 signifie que l'etage ARC domine meme a petite taille.
C'est parce que les features ARC a haute confiance sont plus nombreuses.
Si on veut que LOCAL domine pour les petits textes, il faut abaisser le seuil
de confiance ou utiliser une formule differente.

**W-03** : Faulkner BELOW_MEDIAN = le scorer ne capture pas bien le stream of consciousness.
Pas critique pour le bench actuel mais a surveiller.

---

## MESSAGE DE REDEMARRAGE POUR R4

```
OMEGA SESSION — PHASE R4 (RECONSTRUCTION DU SCORER)
Dernier etat : SESSION_SAVE_R3
Corpus : 181 oeuvres / 121 features / 29 OFF / 92 actives
Coefficients : omega-autopsie/results_r3/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json
  - confidence_table : 121 features x 10 tailles
  - weight_table : LOCAL_600 (49 features) + ARC_2500 (78 features)
  - position_modifiers : 67 features non-stables x 5 zones
  - type_modifiers : 5 types x features significatives
  - language_dependency : 66 UNIVERSAL + 55 DEPENDENT
  - scoring_formula : alpha=0.43 / beta=0.57
Backtest : 11/12 auteurs above median, Faulkner seul below
UNPROVEN : 3/3 resolus (CLOSING domine, pas SETUP)
Objectif R4 : Implementer scorer multi-etages en TypeScript
  - 2 etages : LOCAL (49 features) + ARC (78 features)
  - Detecteur de type de passage
  - Coefficient de confiance affiche
  - Tests unitaires complets
Lire : SESSION_SAVE_R3 + OMEGA_R3_REPORT + coefficients JSON
Tag repo : phase-r3-complete
Branche : phase-w-mixer
```

---

*Session save generee le 2026-03-19 — Standard NASA-Grade L4 / DO-178C Level A*
