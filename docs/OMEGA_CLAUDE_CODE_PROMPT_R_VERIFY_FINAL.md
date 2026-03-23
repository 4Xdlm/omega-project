# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — R-VERIFY-FINAL v2
# 4 VÉRIFICATIONS + CROISEMENTS MASSIFS — CONVERGENCE 3 IAs
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-23
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : 8faf487a (tag r-measure-total-complete)
# Standard     : NASA-Grade L4
# Autorité     : Francky (Architecte Suprême)
#
# CONVERGENCE 3 IAs :
# - Gemini : dictionnaire diachronique avec Date_Genesis, 3 simulations graphiques
# - ChatGPT : R-MEASURE-TRUST-MATRIX, 4 couches visuelles, 6 simulations,
#   classification RANKER/SENTINEL/REGIME/DORMANT, garde historique formelle
# - Claude : bootstrap + S vs D + non-linéarité + PCA + co-occurrences
#
# EXIGENCE ARCHITECTE : minimum 5 auteurs par tier et par type.
# Pas de conclusions sur 3 exemples.
# ═══════════════════════════════════════════════════════════════════════════════

# RÈGLES
R-01 : NE TOUCHER À RIEN d'existant. Tout est ADDITIF.
R-02 : Aucune mesure n'est supprimée. Toutes sont reclassées.
R-03 : Minimum 5 auteurs par groupe pour toute comparaison.
R-04 : Minimum 20 fenêtres par groupe pour toute statistique.
R-05 : 1911 tests existants doivent PASS.

# ═══════════════════════════════════════════════════════════════════════════════
# TÂCHE 1 — GARDE HISTORIQUE (R-HISTORICAL-LEXICON-GUARD)
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 — Table de datation du corpus ENTIER

Pour CHAQUE fichier du corpus, déterminer l'époque :
  CLASSICAL = publié avant 1920
  MODERN = 1920-1980
  CONTEMPORARY = après 1980
  UNKNOWN = pas d'info

Heuristique : nom de fichier → auteur → table de mapping.
Documenter le nombre de romans par époque.

## 1.2 — Recalculer M8.6, M1.4, M1.5 PAR ÉPOQUE

Pour chaque mesure lexicale, séparément par CLASSICAL/MODERN/CONTEMPORARY :
  - Corrélation Spearman avec GB V1
  - Moyenne par tier S/A/B/C/D

Produire le tableau comparatif. Si la corrélation tient uniquement chez CLASSICAL
mais pas chez CONTEMPORARY → ARTEFACT confirmé.

## 1.3 — Règle de requalification

Pour toute mesure basée sur une liste lexicale :
  CLASSICAL → score × 0.5
  MODERN → score × 0.75  
  CONTEMPORARY → score × 1.0
  UNKNOWN → score × 0.75

Recalculer corrélations GB avec scores AJUSTÉS vs BRUTS.

## 1.4 — Étiqueter

Chaque mesure lexicale reçoit : EPOCH_SAFE / EPOCH_SENSITIVE / EPOCH_CONTAMINATED

Sauver : data/EPOCH_REQUALIFICATION.json

# ═══════════════════════════════════════════════════════════════════════════════
# TÂCHE 2 — AUDIT MESURES INCERTAINES (R-MEASURE-TRUST-MATRIX)
# ═══════════════════════════════════════════════════════════════════════════════

16 mesures en zone grise (corr GB entre 0.10 et 0.30).
Pour CHAQUE mesure, 5 tests :

a) Bootstrap IC 95% (2000 itérations) — l'IC contient-il 0 ?
b) Séparation S vs D — effect size Cohen's d > 0.2 ?
c) Intra-auteur sur les 20 meilleurs — corr moyenne > 0.15 ?
d) Non-linéarité en quintiles — pattern monotone, U, ou cloche ?
e) Redondance — corr > 0.7 avec une mesure du TOP 5 ?

Statuts : TRUSTED / PROVISIONAL / QUARANTINED / LEGACY

Sauver : data/MEASURE_TRUST_MATRIX.json

# ═══════════════════════════════════════════════════════════════════════════════
# TÂCHE 3 — RÉEXAMEN DES 9 MESURES NULLES COMME SIGNAUX
# ═══════════════════════════════════════════════════════════════════════════════

9 mesures avec corr GB < 0.10. Pour CHAQUE mesure, 4 tests :

a) SIGNAL DE TRANSITION : la mesure est-elle élevée aux points où la sensation
   dominante change ? (t-test mean_at_transition vs mean_elsewhere)
b) MARQUEUR DE CLIMAX : la mesure est-elle différente dans les fenêtres top 5%
   par GB du roman ? (t-test)
c) LEAD-LAG : cross-corrélation avec GB à lag -5 à +5. Si pic à lag négatif →
   la mesure PRÉCÈDE la qualité (signal précurseur).
d) MARQUEUR DE TYPE : variance inter-type élevée ? → distingue les types de scène

Classification fonctionnelle :
  RANKER — prédit la qualité globale
  SENTINEL — signal local (transition, climax, précurseur)
  REGIME — distingue les types de scène
  DORMANT — potentiel cross-media (film, scénario)
  INVALID — décor confirmé

Sauver : data/MEASURE_ROLES.json

# ═══════════════════════════════════════════════════════════════════════════════
# TÂCHE 4 — CROISEMENTS MASSIFS (GROUPES CONSÉQUENTS)
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 — Constituer les groupes

PAR TIER : 10 romans par tier (S, A, B, C, D si possible) = 40-50 romans
PAR AUTEUR : top 10 auteurs (GB moyen le plus haut) + bottom 10
PAR TYPE : 5 auteurs principaux par type dominant
PAR ÉPOQUE : CLASSICAL / MODERN / CONTEMPORARY séparément

## 4.2 — Matrice de corrélation 38×38

Spearman entre chaque paire de mesures. Identifier clusters (>0.7),
anti-corrélations (<-0.3), orthogonales (<0.1).
Sauver : data/MEASURE_CROSS_CORRELATION.json

## 4.3 — PCA (5 composantes)

Normaliser, extraire, nommer. Corréler chaque PC avec GB.
Sauver : data/PCA_ANALYSIS.json

## 4.4 — Profils radar par TIER (10 romans par tier, 15 mesures)

Les 15 mesures du radar : malaise, vertige, ironie, compression, silence,
mélancolie, négation créatrice, show/tell, irréversibilité, richesse poly,
suggestion, contradiction, fascination, oppression, régularité rythme.
Sauver : data/TIER_RADAR_PROFILES.json

## 4.5 — Profils radar par AUTEUR (top 10 + bottom 10)

Mêmes 15 mesures. Montrer les différences ENTRE maîtres (Dostoïevski ≠ Proust).
Sauver : data/AUTHOR_RADAR_PROFILES.json

## 4.6 — Courbes temporelles (10 romans exemplaires, 2 par tier)

Pour 10 romans (2 S-tier, 2 A-tier, 2 B-tier, 2 C-tier, 2 D-tier si possible) :
Courbes fenêtre par fenêtre : malaise, ironie, compression, silence, GB.
Identifier les croisements et synchronisations.
Sauver : data/NOVEL_TEMPORAL_CURVES.json

## 4.7 — Co-occurrences (toutes paires + triplets)

Sur TOUTES les fenêtres : marquer les mesures top 20%.
Toutes les paires (225 combos) + top 20 triplets.
GB moyen et % S-tier pour chaque combo.
TOP FERTILES (GB > 4.0) et TOXIQUES (GB < 3.0).
Sauver : data/COOCCURRENCE_PATTERNS.json

## 4.8 — Signatures par TYPE DOMINANT

Profil moyen des 38 mesures par type. Sur ≥5000 fenêtres par type.
Sauver : data/TYPE_MEASURE_SIGNATURES.json

## 4.9 — Auteur contre lui-même (10 maîtres)

Pour chaque maître : quintile haut (top 20% GB) vs quintile bas (bottom 20%).
Delta par mesure. Ce qui CHANGE dans les moments forts de l'auteur.
Sauver : data/AUTHOR_SELF_COMPARISON.json

## 4.10 — Lead-lag entre mesures (10 romans)

Cross-corrélation entre les 5 mesures principales (malaise, ironie, compression,
silence, vertige) + GB, à lag -5 à +5.
Quelles mesures PRÉCÈDENT lesquelles ?
Sauver : data/LEAD_LAG_ANALYSIS.json

## 4.11 — Surface 3D (3 paires de mesures × GB)

Paires : (silence × compression), (malaise × ironie), (irréversibilité × silence).
Matrice 10×10 bins. Sweet spots (GB > 4.0) et dead zones (GB < 3.0).
Sauver : data/SURFACE_3D_ANALYSIS.json

# ═══════════════════════════════════════════════════════════════════════════════
# RAPPORT FINAL
# ═══════════════════════════════════════════════════════════════════════════════

Créer : docs/R_VERIFY_FINAL_REPORT.md

Sections : Garde historique, Audit de confiance, Reclassification fonctionnelle,
Croisements (PCA, clusters, co-occurrences, lead-lag, surfaces 3D),
Profils (tier, auteur, type), Questions ouvertes.

# ═══════════════════════════════════════════════════════════════════════════════
# COMMIT
# ═══════════════════════════════════════════════════════════════════════════════

git add -A
git commit -m "feat(R-VERIFY-FINAL): epoch guard + trust audit + signal roles + cross-analysis

TASK 1: Epoch — M8.6 CLASSICAL=X MODERN=X CONTEMPORARY=X
TASK 2: Trust — X TRUSTED, X PROVISIONAL, X QUARANTINED
TASK 3: Roles — X RANKER, X SENTINEL, X REGIME, X DORMANT, X INVALID
TASK 4: Cross — PCA PC1 corr GB=X, X clusters, X fertile combos, X toxic
Groups: 10 novels/tier, 20 authors, 5 authors/type, 3 epochs
1911 tests PASS"
git tag r-verify-final-complete

# ═══════════════════════════════════════════════════════════════════════════════
# CRITÈRES DE SORTIE (TOUS OBLIGATOIRES)
# ═══════════════════════════════════════════════════════════════════════════════

- [ ] Table datation corpus (CLASSICAL/MODERN/CONTEMPORARY)
- [ ] M8.6, M1.4, M1.5 recalculées par époque + verdict artefact
- [ ] 16 mesures incertaines × 5 tests → statut TRUSTED/PROVISIONAL/QUARANTINED
- [ ] 9 mesures nulles × 4 tests signal → rôle RANKER/SENTINEL/REGIME/DORMANT/INVALID
- [ ] Matrice 38×38 + clusters
- [ ] PCA 5 composantes + corrélations GB
- [ ] Profils radar par tier (≥10 romans par tier)
- [ ] Profils radar par auteur (top 10 + bottom 10)
- [ ] Courbes temporelles 10 romans (2 par tier)
- [ ] Co-occurrences toutes paires + top triplets
- [ ] Signatures par type (≥5000 fenêtres par type)
- [ ] Auteur contre lui-même (10 maîtres, quintiles)
- [ ] Lead-lag 5 mesures principales + GB
- [ ] Surface 3D : 3 paires, sweet spots + dead zones
- [ ] Rapport complet
- [ ] 1911 tests PASS
- [ ] Commit + tag
