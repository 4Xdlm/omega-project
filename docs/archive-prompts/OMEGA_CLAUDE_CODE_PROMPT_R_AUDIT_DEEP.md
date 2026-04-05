# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — R-AUDIT-DEEP
# L'ÉPREUVE DE VÉRITÉ — CONVERGENCE 3 IAs
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-23
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : 3c28fd9d (tag r-verify-final-complete)
# Standard     : NASA-Grade L4
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXTE CRITIQUE
#
# L'audit croisé des données R-MEASURE-TOTAL a révélé que 278 paires de
# mesures ont une similarité > 0.95. Cela signifie que nos "38 mesures
# indépendantes" sont peut-être 3 à 5 signaux réels sous 38 noms.
#
# Les 3 IAs (Claude, ChatGPT, Gemini) convergent sur 5 vérifications
# qui peuvent TOUT changer. Si les mesures sont redondantes, le PCA à 0.82
# est mécaniquement garanti et ne prouve rien. Si l'apaisement est inversé,
# une de nos conclusions est fausse. Si la compression causale est un proxy,
# le TOP 6 perd un pilier.
#
# CE PROMPT NE PRODUIT AUCUNE NOUVELLE MESURE. Il VÉRIFIE les existantes.
# ═══════════════════════════════════════════════════════════════════════════════

# RÈGLES
R-01 : NE TOUCHER À RIEN. Tout est LECTURE SEULE et ADDITIF.
R-02 : 1911 tests doivent PASS.
R-03 : Les résultats NÉGATIFS sont AUSSI importants que les positifs.
R-04 : Si une conclusion précédente est INVALIDÉE, le documenter sans fard.

# ═══════════════════════════════════════════════════════════════════════════════
# V1 — LE BIAIS DU DÉNOMINATEUR (Gemini)
# ═══════════════════════════════════════════════════════════════════════════════
#
# HYPOTHÈSE MORTELLE : Toutes les mesures M1-M4 divisent un comptage de
# marqueurs par le nombre de phrases (ou mots) de la fenêtre. Si les fenêtres
# ont des tailles très variables ET que les marqueurs sont rares (sparse),
# alors TOUTES les mesures corrèlent avec 1/longueur_phrase_moyenne.
# → Nos 38 mesures ne mesurent qu'UNE chose : la densité brute du texte.

## V1.1 — Calculer la corrélation de chaque mesure avec la longueur

Pour CHAQUE fenêtre de 20 phrases :
  avg_sentence_length = nombre total de mots / 20
  
Pour CHAQUE mesure (les 38) :
  corr_with_length = Spearman(mesure, avg_sentence_length) sur les 382K fenêtres

Tableau de sortie :
```
MESURE                      CORR_LENGTH   CORR_GB    DIAGNOSTIC
M9_malaise                  +0.xx         +0.455     SI corr_length > 0.5 → CONTAMINÉ
M3.4_compression_causale    +0.xx         +0.440     ...
M2.7_silence                +0.xx         +0.384     ...
...
```

## V1.2 — Corrélation PARTIELLE avec GB en contrôlant la longueur

Pour chaque mesure TRUSTED :
  partial_corr = corr(mesure, GB | contrôle avg_sentence_length)
  Si partial_corr ≈ 0 et corr_gb > 0.3 → la mesure est un PROXY de longueur
  Si partial_corr reste > 0.2 → la mesure a un signal PROPRE au-delà de la longueur

## V1.3 — Vérifier si les corrélations inter-mesures disparaissent

Recalculer les corrélations entre les 10 premières mesures (M1.1 à M3.4)
en RÉSIDUALISANT la longueur :
  mesure_residualized = résidu de la régression mesure ~ avg_sentence_length
  corr_residualized(Mi, Mj)
  
Si les corrélations tombent de 0.999 à < 0.5 → TOUT était piloté par la longueur

Sauver : data/DENOMINATOR_BIAS_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# V2 — NIVEAU D'AGRÉGATION (ChatGPT)
# ═══════════════════════════════════════════════════════════════════════════════
#
# La matrice de corrélation a peut-être été calculée au niveau ROMAN (571 points)
# alors qu'elle devrait l'être au niveau FENÊTRE (382K points).
# Au niveau roman, l'effet auteur/époque/longueur écrase les signaux locaux.

## V2.1 — Recalculer la matrice 38×38 au niveau FENÊTRE

Pour chaque paire (Mi, Mj) sur les 382 239 fenêtres :
  corr_window = Spearman(Mi_fenêtre, Mj_fenêtre)

Comparer avec les corrélations actuelles (niveau roman ?).
Documenter les DELTAS.

## V2.2 — Recalculer les corrélations GB au niveau FENÊTRE

Pour chaque mesure :
  corr_gb_window = Spearman(mesure_fenêtre, GB_fenêtre)
  
Comparer avec les corrélations du R_MEASURE_TOTAL.
Si les chiffres sont DIFFÉRENTS → le R_MEASURE_TOTAL était au mauvais niveau.

## V2.3 — Documenter le niveau d'agrégation de CHAQUE run précédent

Examiner les scripts existants et déterminer :
  SENSATION_ANALYSIS.json → calculé au niveau roman ou fenêtre ?
  R_MEASURE_TOTAL.json → calculé au niveau roman ou fenêtre ?
  
Documenter explicitement pour résoudre l'incohérence de l'apaisement.

Sauver : data/AGGREGATION_LEVEL_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# V3 — REDONDANCE RÉELLE (Convergence 3 IAs)
# ═══════════════════════════════════════════════════════════════════════════════

## V3.1 — VIF (Variance Inflation Factor) pour les 11 TRUSTED

Pour chaque mesure TRUSTED :
  Régresser Mi sur les 10 AUTRES mesures TRUSTED
  R² = coefficient de détermination
  VIF = 1 / (1 - R²)
  
Interprétation :
  VIF < 5 → acceptable
  VIF 5-10 → redondance modérée
  VIF > 10 → COMPLÈTEMENT redondante (contribue 0 info nouvelle)

## V3.2 — PCA sur les 11 TRUSTED au niveau FENÊTRE

Normaliser les 11 mesures TRUSTED (z-score) sur les 382K fenêtres.
PCA :
  Combien de composantes pour 90% de variance ?
  Combien pour 95% ?
  Si 1 composante = 90% → il n'y a qu'UN signal sous 11 noms
  Si 3 composantes = 90% → il y a 3 vrais axes
  Si 5+ → les mesures sont vraiment indépendantes

## V3.3 — Corrélations INTRA-AUTEUR entre mesures

Pour les 20 meilleurs auteurs (par GB moyen) :
  Pour chaque auteur, sur SES fenêtres uniquement :
    Calculer Spearman(Mi, Mj) pour les 11 TRUSTED
  Moyenne des corrélations sur les 20 auteurs

Si INTRA-AUTEUR les corrélations restent à >0.95 → redondance réelle
Si elles baissent à <0.7 → artefact de structure corpus

Sauver : data/REDUNDANCY_DEEP_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# V4 — POUVOIR PROPRE DE CHAQUE MESURE (Convergence 3 IAs)
# ═══════════════════════════════════════════════════════════════════════════════

## V4.1 — Corrélations PARTIELLES mesure × GB

Pour CHAQUE mesure TRUSTED :
  partial_corr = corr(Mi, GB | contrôle les 10 autres TRUSTED)
  
La mesure qui garde la plus haute corrélation partielle = celle qui a
le plus de POUVOIR PROPRE, indépendamment des autres.

Si une mesure à corr_gb = +0.44 tombe à partial_corr ≈ 0 → REDONDANTE
Si elle reste à partial_corr > 0.15 → signal propre CONFIRMÉ

## V4.2 — Test spécifique : Compression causale

Corrélation partielle : corr(compression, GB | silence + malaise + ironie)
  Si tombe à ~0 → compression = proxy (comme le soupçonnent les 3 IAs)
  Si reste > 0.1 → la compression a un pouvoir propre (peut-être le "rythme cardiaque" de Gemini)

## V4.3 — Test spécifique : Apaisement

Corrélation partielle : corr(apaisement, GB | malaise + ironie + silence)
  Si tombe à ~0 → l'apaisement est redondant avec les autres
  Si reste positif → l'apaisement est un vrai signal DISTINCT (ChatGPT + Gemini avaient raison)

## V4.4 — Test spécifique : Show Don't Tell

Corrélation partielle : corr(SDT, GB | silence + négation + suggestion)
  Si tombe à ~0 → SDT est un proxy de la famille omission/retenue
  Si reste > 0.1 → SDT a un pouvoir propre (l'incarnation physique vs l'abstraction)

Sauver : data/PARTIAL_CORRELATIONS_DEEP.json

# ═══════════════════════════════════════════════════════════════════════════════
# V5 — L'INCOHÉRENCE APAISEMENT (Alerte 2)
# ═══════════════════════════════════════════════════════════════════════════════

## V5.1 — Vérifier si SENSATION_ANALYSIS et R_MEASURE_TOTAL
##         sont au même niveau d'agrégation

Examiner les scripts/code source :
  Le calcul de SENSATION_ANALYSIS.json → au niveau roman ou fenêtre ?
  Le calcul de R_MEASURE_TOTAL.json → au niveau roman ou fenêtre ?

## V5.2 — Recalculer l'apaisement aux DEUX niveaux

  corr_apaisement_GB_niveau_roman = Spearman(mean(apaisement par roman), mean(GB par roman))
  corr_apaisement_GB_niveau_fenetre = Spearman(apaisement_fenêtre, GB_fenêtre)

Documenter les deux et EXPLIQUER la différence.

## V5.3 — Classer les sensations en ROBUSTES vs FRAGILES (ChatGPT)

Pour chaque sensation :
  delta = |corr_oracle_v1 - corr_measure_total|
  
  Si delta < 0.05 → ROBUSTE (stable entre runs)
  Si delta > 0.15 → FRAGILE (sensible au protocole)

Attendu :
  ROBUSTE : malaise (+0.007), ironie (+0.021)
  FRAGILE : vertige (+0.197), apaisement (+0.370)

Sauver : data/SENSATION_STABILITY_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# V6 — ANTI-MARQUEURS DE SURJEU (ChatGPT)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Les mesures "nulles" ou inversées (tension, propulsion, mystère, arousal,
# violence, pureté, valence) ne sont pas juste "inutiles". Elles sont peut-être
# des MARQUEURS NÉGATIFS DE PROSE DÉMONSTRATIVE : plus c'est haut, plus
# le texte "surjoue" et moins il est bon.

## V6.1 — Tester la corrélation NÉGATIVE

Pour chaque mesure LEGACY avec un profil inversé (S < C) :
  corr_negative = Spearman(mesure, GB) — on l'a déjà, mais vérifier le SIGNE
  
  Si corr < -0.05 de façon significative → c'est un ANTI-MARQUEUR
  Le score GB BAISSE quand la mesure MONTE → la prose qui surjoue est pénalisée

## V6.2 — Créer un indice composé de SURJEU

```typescript
// surjeu_index = (tension + propulsion + violence + arousal) / 4
// Normaliser en z-score
// corr(surjeu_index, GB) → si fortement négatif, c'est le contraire exact de la qualité
```

## V6.3 — La loi DENSITÉ vs INTENSITÉ (ChatGPT)

```typescript
// density_score = (malaise + ironie + compression + silence) / 4 (les 4 TRUSTED principaux)
// intensity_score = (tension + propulsion + violence + arousal) / 4 (les inversés)
//
// ratio = density_score / (intensity_score + epsilon)
// corr(ratio, GB) → si très élevé, c'est LA formule du S-tier
```

Sauver : data/OVERACTING_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# V7 — RELATIONS NON LINÉAIRES (Convergence 3 IAs)
# ═══════════════════════════════════════════════════════════════════════════════

## V7.1 — Test quadratique pour les 11 mesures LEGACY

Pour chaque mesure LEGACY :
  Diviser en 10 déciles
  Pour chaque décile : calculer GB moyen
  Tracer le profil : est-il monotone ? En U ? En cloche ?
  
  Fit quadratique : GB = a×M² + b×M + c
  Si |a| significatif et R²_quad > R²_lin → relation NON LINÉAIRE

## V7.2 — Test de seuil pour les mesures non-monotones

Pour les mesures où S < B ou S < C :
  Identifier le point de bascule : à partir de quelle valeur la qualité BAISSE ?
  C'est le seuil de SURJEU : au-dessus, la prose est démonstrative

Sauver : data/NONLINEAR_PATTERNS.json

# ═══════════════════════════════════════════════════════════════════════════════
# V8 — COMBIEN DE DIMENSIONS RÉELLES ? (LA QUESTION FINALE)
# ═══════════════════════════════════════════════════════════════════════════════

## V8.1 — PCA sur les 38 mesures au niveau FENÊTRE

Normaliser les 38 mesures en z-score sur les 382K fenêtres.
PCA complète :
  Variance expliquée par PC1, PC2, PC3, PC4, PC5
  Loadings de chaque PC
  Corrélation de chaque PC avec GB

## V8.2 — Interprétation des composantes

Pour chaque PC significative :
  Quelles mesures chargent le plus ?
  Quel nom interprétatif ?
  
Hypothèses à tester :
  PC1 = "qualité littéraire" (malaise + ironie + silence + compression)
  PC2 = "intensité narrative" (propulsion + violence + tension + arousal)
  PC3 = "intériorité" (vertige + mélancolie + recueillement)
  PC4 = "type de scène" (dialogue vs description)

## V8.3 — Tester les 3+1 axes proportionnels

Axe A (Dérangement, ratio S/D ≈ 6.5×) : malaise + vertige
Axe B (Action irréversible, ratio S/D ≈ 3.9×) : irréversibilité + négation
Axe C (Non-dit, ratio S/D ≈ 2.7×) : silence + mélancolie
Axe D (Distanciation, ChatGPT) : ironie + contradiction ?

Corrélation INTRA-GROUPE vs INTER-GROUPE au niveau fenêtre :
  Si intra > 0.8 et inter < 0.5 → les axes sont RÉELS et distincts
  Si tout > 0.8 → un seul axe

Sauver : data/TRUE_DIMENSIONS_AUDIT.json

# ═══════════════════════════════════════════════════════════════════════════════
# RAPPORT FINAL
# ═══════════════════════════════════════════════════════════════════════════════

Créer : docs/R_AUDIT_DEEP_REPORT.md

Structure OBLIGATOIRE :

## 1. VERDICT SUR LE DÉNOMINATEUR
  La longueur des phrases pilote-t-elle les 38 mesures ?
  OUI / NON / PARTIELLEMENT — avec les chiffres

## 2. VERDICT SUR L'AGRÉGATION
  R_MEASURE_TOTAL était au niveau roman ou fenêtre ?
  Les corrélations changent-elles ?

## 3. VERDICT SUR LA REDONDANCE
  VIF de chaque TRUSTED
  Nb de dimensions réelles (PCA fenêtre)
  Les mesures INTRA-AUTEUR sont-elles encore corrélées à >0.95 ?

## 4. VERDICT SUR LE POUVOIR PROPRE
  Corrélation partielle de chaque TRUSTED (contrôle les 10 autres)
  Quelle mesure est la PLUS indépendante ?
  Compression causale = proxy ou signal propre ?
  Apaisement = proxy ou signal distinct ?

## 5. VERDICT SUR L'APAISEMENT
  Pourquoi le flip -0.043 → +0.327 ?
  Quel calcul est le BON ?
  Classification ROBUSTE vs FRAGILE des sensations

## 6. VERDICT SUR LE SURJEU
  Le surjeu_index corrèle-t-il négativement avec GB ?
  Le ratio densité/intensité est-il une formule puissante ?
  Les mesures LEGACY sont-elles des anti-marqueurs ?

## 7. VERDICT SUR LA NON-LINÉARITÉ
  Quelles mesures LEGACY ont des relations quadratiques cachées ?
  Quels sont les seuils de surjeu ?

## 8. VERDICT FINAL : COMBIEN DE DIMENSIONS ?
  PCA 38 mesures × 382K fenêtres
  Nb de PC pour 90% et 95% de variance
  Les 3+1 axes proportionnels sont-ils confirmés ?

## 9. CE QUI RESTE VRAI APRÈS CET AUDIT
  Quelles conclusions précédentes SURVIVENT ?

## 10. CE QUI EST INVALIDÉ
  Quelles conclusions précédentes TOMBENT ?

# ═══════════════════════════════════════════════════════════════════════════════
# LIVRABLES
# ═══════════════════════════════════════════════════════════════════════════════

| Fichier | Contenu |
|---------|---------|
| data/DENOMINATOR_BIAS_AUDIT.json | Corrélation de chaque mesure avec la longueur |
| data/AGGREGATION_LEVEL_AUDIT.json | Niveau de chaque run + corrélations recalculées |
| data/REDUNDANCY_DEEP_AUDIT.json | VIF + PCA fenêtre + intra-auteur entre mesures |
| data/PARTIAL_CORRELATIONS_DEEP.json | Pouvoir propre de chaque TRUSTED |
| data/SENSATION_STABILITY_AUDIT.json | ROBUSTE vs FRAGILE |
| data/OVERACTING_AUDIT.json | Surjeu index + ratio densité/intensité |
| data/NONLINEAR_PATTERNS.json | Relations quadratiques + seuils de surjeu |
| data/TRUE_DIMENSIONS_AUDIT.json | PCA 38 mesures + axes proportionnels |
| docs/R_AUDIT_DEEP_REPORT.md | 10 verdicts |

# ═══════════════════════════════════════════════════════════════════════════════
# COMMIT
# ═══════════════════════════════════════════════════════════════════════════════

git add -A
git commit -m "feat(R-AUDIT-DEEP): 8 verifications — denominator bias, aggregation,
redundancy, partial correlations, sensation stability, overacting index,
non-linear patterns, true dimensionality

V1: Denominator — corr(measures, sentence_length) = X
V2: Aggregation — level confirmed: [roman/fenêtre]
V3: Redundancy — VIF shows X measures with VIF>10, PCA needs X dims for 90%
V4: Partial corr — [measure] has highest unique power at +X.XX
V5: Sensations — [X] robust, [Y] fragile
V6: Overacting — surjeu_index × GB = X.XX, density/intensity ratio × GB = X.XX
V7: Non-linear — X measures with significant quadratic fits
V8: Dimensions — PCA: X components for 90% variance

VERDICT: [X] true independent dimensions out of 38 measures"
git tag r-audit-deep-complete

# ═══════════════════════════════════════════════════════════════════════════════
# CRITÈRES DE SORTIE (TOUS OBLIGATOIRES)
# ═══════════════════════════════════════════════════════════════════════════════

- [ ] Corrélation de chaque mesure avec avg_sentence_length (382K fenêtres)
- [ ] Corrélation partielle mesure × GB en contrôlant la longueur
- [ ] Corrélation inter-mesures RÉSIDUALISANT la longueur
- [ ] Niveau d'agrégation de SENSATION_ANALYSIS et R_MEASURE_TOTAL identifié
- [ ] Corrélations GB recalculées au même niveau si différent
- [ ] VIF pour les 11 TRUSTED
- [ ] PCA 11 TRUSTED au niveau fenêtre → nb composantes pour 90%
- [ ] Corrélation inter-mesures INTRA-AUTEUR (20 meilleurs)
- [ ] Corrélation partielle de chaque TRUSTED (contrôle les 10 autres)
- [ ] Tests spécifiques : compression, apaisement, SDT
- [ ] Classification sensations ROBUSTE vs FRAGILE
- [ ] Surjeu index × GB
- [ ] Ratio densité/intensité × GB
- [ ] Relations quadratiques pour 11 mesures LEGACY (déciles + fit)
- [ ] PCA 38 mesures au niveau fenêtre → nb composantes pour 90%
- [ ] Test axes proportionnels (intra-groupe vs inter-groupe)
- [ ] 10 verdicts dans le rapport
- [ ] 1911 tests PASS
- [ ] Commit + tag

# ═══════════════════════════════════════════════════════════════════════════════
# FIN
# "Si 278 paires sont à >0.95, on ne mesure peut-être que 3 choses sous 38 noms."
# "Si toutes les mesures divisent par nb_phrases, on mesure peut-être 1/longueur."
# "Si l'apaisement s'est inversé, quelque chose a cassé entre deux runs."
# "Si le C-tier surjoue et le S-tier retient, la formule est densité/intensité."
# "Ce prompt ne crée rien de nouveau. Il vérifie que ce qu'on a est VRAI."
# ═══════════════════════════════════════════════════════════════════════════════
