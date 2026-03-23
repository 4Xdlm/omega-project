# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — AUDIT DE CROISEMENT PROFOND
# Ce que PERSONNE n'a encore vu dans les données
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date : 2026-03-23
# Auteur : Claude (Opus 4.6, IA Principal)
# Source : R_MEASURE_TOTAL.json + MEASURE_CROSS_CORRELATION.json
#          + SENSATION_ANALYSIS.json + MEASURE_TRUST_MATRIX.json
#
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# ALERTE 1 — LES 38 MESURES SONT PRESQUE TOUTES LA MÊME CHOSE
# GRAVITÉ : CRITIQUE
# ═══════════════════════════════════════════════════════════════════════════════

## Le problème

La matrice MEASURE_CROSS_CORRELATION.json montre des similarités EXTRÊMES
entre des mesures qui DEVRAIENT être indépendantes :

  M1.5 eval_adverb × M2.2 neg_creatrice  = 0.9999
  M1.4 explanation × M3.4 compression     = 0.9995
  M1.4 explanation × M2.7 silence          = 0.9994
  M1.5 eval_adverb × M2.7 silence          = 0.9996
  M1.5 eval_adverb × M3.4 compression     = 0.9995
  M2.1 suggestion × M3.1 irréversibilité = 0.9998
  M1.1 show_dont_tell × M2.7 silence      = 0.9982

278 paires ont une similarité > 0.95.

## Pourquoi c'est un problème

Des mesures à >0.999 de similarité NE SONT PAS des mesures indépendantes.
Elles mesurent la MÊME chose avec des noms différents.

Cela signifie que nos "38 mesures × 6 axes" sont en réalité ~3-5 signaux
INDÉPENDANTS déguisés sous 38 noms.

Le PCA PC1 = 0.82 n'est PAS forcément impressionnant si toutes les mesures
sont redondantes : une seule variable (ex: densité de mots rares) pourrait
piloter les 38 mesures simultanément.

## Causes possibles

1. **Sparsité identique** : les mesures comptent des mots rares qui sont
   quasi-mutuellement exclusifs avec les mots communs. Quand un texte a
   PLUS de mots rares (littérature classique), TOUTES les mesures basées
   sur des comptages de marqueurs montent ensemble.

2. **Proxy d'époque** : le corpus est dominé par 70 classiques FR.
   Ces textes ont SIMULTANÉMENT plus de malaise, plus de silence, plus
   de négation, plus de compression — pas parce que ces mesures sont
   mécaniquement liées, mais parce que le XIXe français est TOUT ça.

3. **Proxy de longueur** : les textes longs ont plus de fenêtres, plus
   de marqueurs, plus de variation — toutes les mesures montent.

4. **Niveau de granularité** : la corrélation est peut-être calculée au
   niveau ROMAN (571 points) et non FENÊTRE (382K points). Sur 571 points,
   l'effet auteur/époque domine tout.

## Ce qui doit être vérifié

→ VÉRIFIER la corrélation au niveau FENÊTRE (pas roman)
→ VÉRIFIER en contrôlant l'auteur (corrélation partielle)
→ SI les mesures restent à >0.99 intra-auteur → elles sont vraiment redondantes
→ SI elles baissent à <0.7 intra-auteur → c'est un artefact de structure corpus

# ═══════════════════════════════════════════════════════════════════════════════
# ALERTE 2 — INCOHÉRENCE ENTRE SENSATION_ANALYSIS ET R_MEASURE_TOTAL
# GRAVITÉ : SÉRIEUSE
# ═══════════════════════════════════════════════════════════════════════════════

## Le problème

Les corrélations GB des sensations ont DRASTIQUEMENT changé entre les deux runs :

  SENSATION               ORACLE_V1    MEASURE_TOTAL    DELTA
  Vertige                  +0.254       +0.451          +0.197 ← DOUBLÉ
  Mélancolie               +0.224       +0.373          +0.149 ← +66%
  Apaisement               -0.043       +0.327          +0.370 ← INVERSÉ !
  Malaise                  +0.448       +0.455          +0.007 (stable)
  Ironie                   +0.422       +0.443          +0.021 (stable)
  Oppression               +0.108       +0.138          +0.030

Le MALAISE et l'IRONIE sont stables (+0.007, +0.021) — ce sont de VRAIS signaux.
Le VERTIGE a DOUBLÉ — suspect.
L'APAISEMENT est passé de NÉGATIF à FORTEMENT POSITIF — c'est un RENVERSEMENT.

## Pourquoi c'est un problème

Si l'apaisement corrèle NÉGATIVEMENT dans l'Oracle V1 mais POSITIVEMENT dans
R-MEASURE-TOTAL, c'est que le calcul a changé entre les deux runs, ou que
le niveau d'agrégation est différent (fenêtre vs roman), ou que la correction
du classifieur (37% → 29%) a changé les données sous-jacentes.

On ne peut PAS avoir confiance dans les deux résultats simultanément.

## Ce qui doit être vérifié

→ Le vertige et l'apaisement sont-ils calculés de la MÊME façon dans les deux runs ?
→ Le niveau d'agrégation est-il le même ?
→ Les corrélations ont-elles bougé à cause de la réduction du résidu (37→29%) ?

# ═══════════════════════════════════════════════════════════════════════════════
# ALERTE 3 — LES CORRÉLATIONS MALAISE/IRONIE SONT SUSPECTES
# GRAVITÉ : MOYENNE
# ═══════════════════════════════════════════════════════════════════════════════

## Le problème

Les corrélations axe4 (avec malaise) et axe5 (avec ironie) sont ANORMALEMENT
élevées pour des mesures qui n'ont rien à voir sémantiquement avec le malaise :

  M8.6 clichés     × malaise = 0.937   ← les clichés créent du malaise ?!
  M1.4 explication  × malaise = 0.932   ← les explications créent du malaise ?!
  M3.4 compression  × malaise = 0.839   ← la compression crée du malaise ?!
  M2.7 silence      × malaise = 0.808   ← le silence crée du malaise ?
  M1.1 show_dont_tell × malaise = 0.749

Si TOUT corrèle avec le malaise à >0.7, alors le malaise n'est probablement
PAS une mesure indépendante — c'est un PROXY de la même variable latente
qui pilote toutes les mesures.

## Ce qui doit être vérifié

→ Les mesures malaise et ironie sont-elles des comptages de mots rares ?
→ Leur corrélation avec GB est-elle une tautologie (mêmes mots que le GB) ?
→ Calculer la corrélation PARTIELLE malaise × GB APRÈS contrôle des 6 autres TRUSTED

# ═══════════════════════════════════════════════════════════════════════════════
# OBSERVATIONS NON MONOTONES (SOUS-EXPLOITÉES)
# ═══════════════════════════════════════════════════════════════════════════════

Plusieurs mesures ont des profils par tier INVERSÉS — le S-tier a MOINS que le C-tier :

  M2.6 Questions sans réponse : S=0.468 < C=0.645 < B=0.552
    → Le S-tier répond PLUS à ses questions que le C-tier !
    → Contrairement à l'hypothèse "dette d'info = qualité"

  M9 Tension : S=0.132 < B=0.160 < C=0.168
    → Le S-tier a MOINS de tension que le B et C
    → La qualité n'est PAS liée à la tension — elle est liée au MALAISE

  M9 Propulsion : S=0.454 < A=0.544 < C=0.619
    → Plus c'est mauvais, plus ça pousse vite

  M9 Mystère : S=0.083 < B=0.106 < C=0.120
    → Le S-tier est MOINS mystérieux que le C

  M9.14 Pureté : S=0.412 < D=0.478
    → Le S-tier est MOINS pur en sensation — ses sensations sont MÉLANGÉES
    → La CONFUSION sensorielle corrèle avec la qualité (négatif -0.098)

  M9.16 Valence : S=-0.113 vs C=-0.441
    → Le S-tier est MOINS négatif que le C-tier
    → La grande prose n'est PAS la plus sombre — elle est nuancée

  M9.17 Arousal : S=0.859 < A=1.064 < C=1.243
    → Le S-tier est le PLUS CALME — le C-tier est le plus agité

## Déduction importante

Les mesures "nulles" en corrélation GB ont en fait un pattern INVERSÉ :
la prose médiocre (C-tier) est plus tendue, plus rapide, plus mystérieuse,
plus agitée et plus sombre que la grande prose (S-tier).

Le S-tier se caractérise par :
- Plus de malaise (+0.455) mais MOINS de tension
- Plus d'ironie (+0.443) mais MOINS de mystère
- Plus de silence (+0.384) mais MOINS de vitesse
- Plus de compression (+0.440) mais MOINS d'agitation
- Plus de MÉLANGE sensoriel (pureté -0.098)

→ Le S-tier est SUBTIL, pas INTENSE.
→ Le C-tier est INTENSE, pas SUBTIL.

# ═══════════════════════════════════════════════════════════════════════════════
# RELATIONS PROPORTIONNELLES IDENTIFIÉES
# ═══════════════════════════════════════════════════════════════════════════════

## Proportionnalités quasi-linéaires (ratio S/D constant)

  Irréversibilité : S/D = 0.0309/0.008 = 3.86×
  Négation créatrice : S/D = 0.0146/0.0037 = 3.95×
  → Ratio IDENTIQUE (~3.9×) → ces deux mesures sont PROPORTIONNELLES

  Silence : S/D = 0.0073/0.0027 = 2.70×
  Mélancolie : S/D = 0.0078/0.003 = 2.60×
  → Ratio similaire (~2.7×) → elles aussi sont proportionnelles entre elles

  Malaise : S/D = 0.0031/0.0005 = 6.20×
  Vertige : S/D = 0.0027/0.0004 = 6.75×
  → Ratio similaire (~6.5×) → malaise et vertige sont proportionnels

## Ce que ça révèle

Il y a peut-être 3 AXES réels, pas 7 :
  AXE A : Malaise + Vertige (ratio S/D ≈ 6.5×)
  AXE B : Irréversibilité + Négation (ratio S/D ≈ 3.9×)
  AXE C : Silence + Mélancolie (ratio S/D ≈ 2.7×)

La compression causale (S/D = 0.0006/0.0005 = 1.2×) a un ratio TRÈS FAIBLE.
Sa forte corrélation GB (+0.440) vient peut-être de sa corrélation avec
les AUTRES mesures (0.999 avec silence et malaise), pas de son pouvoir propre.

# ═══════════════════════════════════════════════════════════════════════════════
# CE QUE CHATGPT ET GEMINI VOIENT QUE JE N'AVAIS PAS VU
# ═══════════════════════════════════════════════════════════════════════════════

## ChatGPT propose (à intégrer) :
- R-MEASURE-TRUST-MATRIX avec 8 notes par mesure → on n'a que 5 tests actuellement
- BRIER SCORE et ECE pour la calibration du classifieur → pas encore fait
- ICC (reproductibilité) → non calculée
- VIF (Variance Inflation Factor) → critique vu les corrélations >0.99 !
- Information mutuelle → pas que Spearman (dépendances non linéaires)
- Hystérèse émotionnelle (même niveau, chemin différent) → pas mesurée
- Aftertaste (ce qui reste après la scène) → pas mesurée
- Compression causale comme ratio phrases/verbosité → pas exactement ça

## Gemini propose (à intégrer) :
- Dissonance sémantico-syntaxique (fond vs forme) → pas calculée
- Entropie des transitions focales (embeddings) → non fait (pas d'embeddings)
- Ratio d'implicature (verbes cinétiques / adverbes évaluation) → variante de M1.1
- Ancrage autonomique (réaction corporelle) → proche de M1.1 mais angle différent

# ═══════════════════════════════════════════════════════════════════════════════
# PROMPT CLAUDE CODE — R-AUDIT-DEEP
# ═══════════════════════════════════════════════════════════════════════════════
#
# Ce prompt vérifie les 3 alertes et explore les relations manquantes.
# À lancer APRÈS R-VERIFY-FINAL.
#
# HEAD entrant : 3c28fd9d (tag r-verify-final-complete)
# Branche : phase-r-metrology-rebuild
#
# ═══════════════════════════════════════════════════════════════════════════════

# RÈGLES
R-01 : NE TOUCHER À RIEN. Tout est LECTURE SEULE et ADDITIF.
R-02 : 1911 tests doivent PASS.

# ═══════════════════════════════════════════════════════════════════════════════
# VÉRIFICATION 1 — La redondance est-elle un artefact de structure ?
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 — Recalculer la matrice de corrélation au NIVEAU FENÊTRE

La matrice actuelle a peut-être été calculée au niveau roman (571 points).
Recalculer sur les 382 239 fenêtres directement :

Pour chaque paire (Mi, Mj) :
  - Collecter les valeurs Mi et Mj pour CHAQUE fenêtre (382K paires)
  - Calculer Spearman(Mi, Mj) sur ces 382K points
  - Si la corrélation reste > 0.95 → les mesures sont VRAIMENT redondantes
  - Si elle baisse en dessous de 0.7 → c'était un artefact de moyennage roman

## 1.2 — Corrélations INTRA-AUTEUR entre mesures

Pour les 20 meilleurs auteurs :
  Pour chaque auteur, sur SES fenêtres uniquement :
    Calculer Spearman(Mi, Mj) pour les 7 TRUSTED
  Moyenne des corrélations sur les 20 auteurs

Si INTRA-AUTEUR la corrélation M3.4 × M2.7 baisse de 0.999 à 0.3 →
la corrélation de 0.999 était un artefact auteur.

## 1.3 — VIF (Variance Inflation Factor)

Pour chaque mesure TRUSTED :
  Régresser Mi sur les 6 AUTRES mesures TRUSTED
  VIF = 1 / (1 - R²)
  Si VIF > 10 → la mesure est COMPLÈTEMENT redondante avec les autres

## 1.4 — Documenter combien de VRAIES dimensions indépendantes

En utilisant la PCA sur les 7 TRUSTED au niveau fenêtre :
  Combien de composantes expliquent 95% de la variance ?
  Si 1 → il n'y a qu'UNE seule mesure réelle sous 7 noms
  Si 3 → il y a 3 axes réels (comme les ratios S/D le suggèrent)
  Si 5+ → les mesures sont vraiment indépendantes

Sauver : data/REDUNDANCY_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# VÉRIFICATION 2 — Incohérence entre SENSATION_ANALYSIS et R_MEASURE_TOTAL
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 — Identifier la cause du changement

Comparer les paramètres de calcul :
  - SENSATION_ANALYSIS : niveau roman ou fenêtre ?
  - R_MEASURE_TOTAL : niveau roman ou fenêtre ?
  - Si différent → documenter et choisir le BON

## 2.2 — Recalculer les sensations au MÊME niveau

Si l'un est au niveau roman et l'autre au niveau fenêtre :
  Recalculer les deux au niveau fenêtre
  Documenter la corrélation correcte

## 2.3 — Le cas de l'apaisement

L'apaisement est passé de -0.043 à +0.327.
C'est un RENVERSEMENT de signe. Il faut savoir LEQUEL est correct.

Sauver : data/SENSATION_COHERENCE_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# VÉRIFICATION 3 — Le malaise est-il un proxy ou un signal propre ?
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 — Corrélation PARTIELLE malaise × GB

Calculer : corr(malaise, GB) en CONTRÔLANT les 6 autres TRUSTED
  Si la corrélation partielle reste > 0.2 → le malaise a un pouvoir PROPRE
  Si elle tombe à ~0 → le malaise est juste un proxy des autres mesures

## 3.2 — Même chose pour CHAQUE mesure TRUSTED

Pour CHAQUE mesure TRUSTED :
  partial_corr = corr(Mi, GB | contrôle les 6 autres TRUSTED)
  → Quelle mesure a le plus de pouvoir PROPRE après déduction des redondances ?

## 3.3 — Information mutuelle

Pour chaque mesure × GB :
  Calculer l'information mutuelle MI(Mi, GB)
  Comparer avec Spearman
  Si MI >> Spearman → il y a une relation NON LINÉAIRE qu'on a ratée

Sauver : data/PARTIAL_CORRELATION_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# VÉRIFICATION 4 — Exploiter les patterns non-monotones
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 — Pour chaque mesure LEGACY avec un profil inversé

Mesures candidates : tension, propulsion, mystère, violence, arousal, pureté, valence

Pour chaque mesure, calculer la relation QUADRATIQUE avec GB :
  GB = a × M² + b × M + c
  Si le terme quadratique est significatif → la relation est en U ou en cloche
  → une corrélation linéaire NULLE peut cacher une corrélation quadratique FORTE

## 4.2 — Test de seuil

Pour chaque mesure non-monotone :
  Diviser en quintiles
  Calculer GB moyen par quintile
  Identifier si la FORME est :
  - monotone (S > A > B > C > D)
  - en U (S et D hauts, milieu bas)
  - en cloche inversée (S et D bas, milieu haut)
  - autre

Sauver : data/NONLINEAR_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# VÉRIFICATION 5 — Les 3 axes réels (proportionnalité)
# ═══════════════════════════════════════════════════════════════════════════════

## 5.1 — Tester les 3 groupes proportionnels

Groupe A (ratio S/D ≈ 6.5×) : malaise + vertige
Groupe B (ratio S/D ≈ 3.9×) : irréversibilité + négation
Groupe C (ratio S/D ≈ 2.7×) : silence + mélancolie

Pour chaque groupe, calculer la corrélation INTRA-GROUPE au niveau fenêtre.
Si les mesures du même groupe sont quasi-parfaitement corrélées (>0.9) ET
les mesures de GROUPES DIFFÉRENTS sont moins corrélées (<0.7) → il y a
vraiment 3 axes.

Si TOUT est corrélé à >0.9 → il n'y a qu'UN seul axe.

## 5.2 — Vérifier si la compression causale est un signal propre

Le ratio S/D de la compression = 0.0006/0.0005 = 1.2× seulement.
Pourtant sa corrélation GB = +0.440 (TOP 6).

Hypothèse : la compression NE SÉPARE PAS les tiers (ratio 1.2×)
mais corrèle avec le GB à cause de sa redondance avec les AUTRES mesures
(corrélation 0.9995 avec silence, 0.9996 avec négation).

Test : calculer la corrélation PARTIELLE compression × GB en contrôlant
silence + malaise + ironie. Si elle tombe à ~0 → compression = redondante.

Sauver : data/PROPORTIONALITY_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# LIVRABLES
# ═══════════════════════════════════════════════════════════════════════════════

| Fichier | Contenu |
|---------|---------|
| data/REDUNDANCY_AUDIT.json | VIF, PCA fenêtre, corrélation intra-auteur entre mesures |
| data/SENSATION_COHERENCE_AUDIT.json | Explication de l'incohérence Oracle/MeasureTotal |
| data/PARTIAL_CORRELATION_AUDIT.json | Corrélations partielles, MI |
| data/NONLINEAR_AUDIT.json | Relations quadratiques, quintiles |
| data/PROPORTIONALITY_AUDIT.json | 3 axes réels, test compression |
| docs/R_AUDIT_DEEP_REPORT.md | Rapport complet avec verdicts |

## Commit

git add -A
git commit -m "feat(R-AUDIT-DEEP): 5 deep verifications on cross-correlations

V1: Redundancy — VIF + PCA at window level → X true dimensions
V2: Sensation coherence — Oracle vs MeasureTotal discrepancy resolved
V3: Partial correlations — each TRUSTED measure's UNIQUE power
V4: Non-linear patterns — quadratic fits on inverted measures
V5: Proportionality — 3 real axes or 1?

CRITICAL: 278 clusters at sim>0.95 may mean 38 measures = 3-5 real signals"
git tag r-audit-deep-complete

# ═══════════════════════════════════════════════════════════════════════════════
# CRITÈRES DE SORTIE
# ═══════════════════════════════════════════════════════════════════════════════

- [ ] Matrice corrélation recalculée au niveau FENÊTRE (382K points)
- [ ] Corrélation intra-auteur entre les 7 TRUSTED (20 auteurs)
- [ ] VIF pour chaque mesure TRUSTED
- [ ] PCA sur les 7 TRUSTED au niveau fenêtre → nb de dimensions réelles
- [ ] Explication de l'incohérence apaisement (-0.04 → +0.33)
- [ ] Corrélation partielle de chaque TRUSTED (contrôle les 6 autres)
- [ ] Information mutuelle × GB pour les 7 TRUSTED
- [ ] Relations quadratiques pour les 7 mesures non-monotones
- [ ] Quintiles GB pour chaque mesure LEGACY
- [ ] Test des 3 groupes proportionnels
- [ ] Corrélation partielle compression × GB (contrôle silence+malaise+ironie)
- [ ] VERDICT : combien de dimensions RÉELLES ?
- [ ] 1911 tests PASS
- [ ] Rapport complet

# ═══════════════════════════════════════════════════════════════════════════════
# FIN — "278 clusters à >0.95 = on mesure peut-être 3 choses sous 38 noms."
# ═══════════════════════════════════════════════════════════════════════════════
