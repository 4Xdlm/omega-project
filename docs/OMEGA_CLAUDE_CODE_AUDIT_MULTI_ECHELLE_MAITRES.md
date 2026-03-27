# OMEGA — AUDIT MULTI-ÉCHELLE MAÎTRES — TAILLE / TYPES / COHÉRENCES / TRANSITIONS
# Statut : MISSION D'AUTORITÉ
# Standard : OMEGA / PASS-FAIL / zéro approximation
# Mode : CALCUL PUR — 0 API
# But : établir la vérité mathématique sur l’évolution des features, des types et de leurs relations
#       en fonction de la taille du texte chez les maîtres du corpus.
#
# IMPORTANT
# - Ne rien supposer.
# - Ne pas refaire aveuglément une étude déjà faite : d’abord ARCHEOLOGIE, ensuite EXTENSION ou REFONTE si nécessaire.
# - Tout doit être traçable, reproductible, chiffré, versionné.
# - Toute conclusion doit citer :
#   1) le nombre de textes
#   2) le nombre de fenêtres
#   3) le nombre de features
#   4) la méthode exacte
#   5) les seuils utilisés
#   6) les limites détectées
#
# ═══════════════════════════════════════════════════════════════════════
# OBJECTIF CENTRAL
# ═══════════════════════════════════════════════════════════════════════
# Répondre définitivement aux questions suivantes :
#
# Q1. Comment évolue CHAQUE feature quand on passe de 200 → 500 → 700 → 1000 → 2000 → 3000 mots ?
# Q2. À partir de quelle taille une feature devient-elle STABLE, INSTABLE, TROMPEUSE ou NON INTERPRÉTABLE ?
# Q3. Le type d’un passage (description, action, introspection, contemplation, lyrique, dialogue si dispo)
#     change-t-il avec la taille de la fenêtre ? Si oui, selon quelles lois ?
# Q4. Quelles features restent cohérentes entre elles quand la taille augmente, lesquelles divergent,
#     lesquelles se retournent ?
# Q5. Quelles corrélations observées à petite échelle disparaissent ou s’inversent à grande échelle ?
# Q6. Quels seuils de confiance par taille doit-on adopter pour le moteur OMEGA ?
# Q7. Quelle part de variation vient de la TAILLE, de la POSITION dans l’œuvre, du TIER, du TYPE, du STYLE ?
#
# ═══════════════════════════════════════════════════════════════════════
# DONNÉES À UTILISER
# ═══════════════════════════════════════════════════════════════════════
# Utiliser en priorité le corpus des maîtres déjà présent dans le repo.
# Chercher d’abord TOUS les artefacts existants liés à :
# - corpus maîtres
# - corpus features
# - multi-scale / fractal / fenêtres / size / scale
# - type detector / passage types
# - ROADMAP / PROTOCOLE / MANIFESTE / PHASE R / W-FRACTAL
# - calibrations existantes
#
# Fichiers probables à inspecter en premier :
# - CORPUS_FEATURES_MASTER.json
# - corpus_analysis.json
# - docs, sessions, omega-autopsie, results_rosetta, scripts, src/scoring/data
#
# Obligation :
# - Faire une phase d’ARCHEOLOGIE au début :
#   - lister tout ce qui existe déjà sur le sujet
#   - dire ce qui est réutilisable
#   - dire ce qui manque
#   - dire ce qui est obsolète ou insuffisant
# - Si une étude voisine existe déjà, NE PAS la dupliquer :
#   - soit la prolonger
#   - soit la recalculer uniquement si elle est insuffisante
#
# ═══════════════════════════════════════════════════════════════════════
# PÉRIMÈTRE DE CALCUL — OBLIGATOIRE
# ═══════════════════════════════════════════════════════════════════════
# 1. ÉCHELLES ABSOLUES OBLIGATOIRES
#    Calculer au minimum les fenêtres de :
#    - 200 mots
#    - 500 mots
#    - 700 mots
#    - 1000 mots
#    - 2000 mots
#    - 3000 mots
#
# 2. ÉCHELLES RELATIVES OBLIGATOIRES
#    En plus des tailles fixes, découper chaque œuvre par tranches de position relatives :
#    - 0–5%
#    - 5–10%
#    - 10–15%
#    - ...
#    - 95–100%
#
# 3. FENÊTRES GLISSANTES
#    Pour les tailles fixes, utiliser des fenêtres glissantes avec stride raisonnable.
#    Règle par défaut :
#    - stride = 25% de la taille de fenêtre
#    Exemple :
#    - 200w → stride 50
#    - 500w → stride 125
#    - 700w → stride 175
#    - 1000w → stride 250
#    - 2000w → stride 500
#    - 3000w → stride 750
#
# 4. TIERS / SOUS-GROUPES
#    Séparer au minimum :
#    - Tier A
#    - Tier B
#    - Tier C
#    - Tier D
#    Puis :
#    - FR global
#    - FR par tier
#    - si possible par auteur
#
# ═══════════════════════════════════════════════════════════════════════
# FEATURES À MESURER — EXHAUSTIVITÉ
# ═══════════════════════════════════════════════════════════════════════
# Mesurer TOUTES les features disponibles du corpus.
# A minima, produire des vues détaillées pour les familles suivantes :
#
# A. RYTHME / LONGUEUR / CONTRASTE
# - f1_mean
# - f1a_rhythm_variance
# - f1b_rhythm_ratio
# - cv_sent si dispo
# - cv_para si dispo
# - f17_knife_count
# - f26b_long_sent_rate
# - ratio_alt si reconstructible
# - mean sentence length
# - paragraph variance si dispo
#
# B. LEXICAL / DENSITÉ
# - f29d_ttr_score
# - redondance / compression si dispo
# - bigram rarity si dispo
#
# C. SYNTAXE / STRUCTURE
# - subordinate_per_sentence si dispo
# - clause_per_sentence si dispo
# - nominal / fragment / verb density si dispo
#
# D. SENSORIEL / INCARNATION
# - sensory_richness
# - corporeal_anchoring
# - focalisation
# - attention_sustain
# - fatigue_management
#
# E. FIGURAL / IMAGINAIRE
# - metaphor_novelty
# - anti_cliche
# - hook_presence si dispo
# - silence / temporal / symbol si des modules ou proxies existent
#
# F. ÉMOTION / NARRATION
# - tension_14d si reconstructible
# - emotion_coherence si dispo
# - toute feature ou proxy émotionnel disponible
#
# G. TYPE / PASSAGE
# - type detector output si disponible :
#   - description
#   - action
#   - introspection
#   - contemplation
#   - lyrique
#   - dialogue si présent
#
# Si certaines features ne sont pas disponibles dans le corpus maître :
# - le signaler explicitement
# - ne rien inventer
# - proposer le meilleur proxy disponible
#
# ═══════════════════════════════════════════════════════════════════════
# QUESTIONS STATISTIQUES OBLIGATOIRES
# ═══════════════════════════════════════════════════════════════════════
# Pour CHAQUE feature et CHAQUE échelle :
# - moyenne
# - médiane
# - écart-type
# - IQR
# - coefficient de variation
# - min / max
# - percentiles (P10, P25, P50, P75, P90)
# - taille d’échantillon
#
# Pour CHAQUE paire de features importante :
# - corrélation Pearson
# - corrélation Spearman
# - évolution de la corrélation selon la taille
# - inversion de signe éventuelle
#
# Pour les types :
# - % de chaque type à chaque taille
# - probabilité de transition de type quand la fenêtre s’agrandit
# - stabilité de type par taille
#
# Pour la stabilité :
# - à partir de quelle taille la feature cesse de bouger fortement ?
# - à partir de quelle taille la classification de type devient robuste ?
#
# Pour les tiers :
# - comparer A/B/C/D à chaque taille
# - détecter si la stabilité arrive plus tôt chez les maîtres
#
# ═══════════════════════════════════════════════════════════════════════
# HYPOTHÈSES À TESTER — OBLIGATOIRES
# ═══════════════════════════════════════════════════════════════════════
# H1. Certaines features sont trompeuses sous 500 mots.
# H2. Certaines features changent de régime entre 500 et 1000 mots.
# H3. Certaines features deviennent stables seulement au-delà de 2000 mots.
# H4. Le type de passage peut changer avec l’agrandissement de la fenêtre.
# H5. Les corrélations inter-features changent avec la taille.
# H6. Les maîtres gardent une meilleure cohérence inter-features quand la taille augmente.
# H7. Il existe des seuils de confiance multi-échelle justifiant les type_modifiers / position_modifiers.
#
# Toute hypothèse doit finir en :
# - PASS
# - FAIL
# - INDETERMINÉ
#
# ═══════════════════════════════════════════════════════════════════════
# SORTIES OBLIGATOIRES
# ═══════════════════════════════════════════════════════════════════════
# Produire les artefacts suivants :
#
# 1. src/scoring/data/MASTER_SCALE_LADDER.json
#    - stats par feature × taille × tier × type × position
#
# 2. src/scoring/data/MASTER_TYPE_TRANSITIONS_BY_SCALE.json
#    - transitions de type selon taille et position
#
# 3. src/scoring/data/MASTER_FEATURE_COHERENCE_BY_SCALE.json
#    - matrice de corrélations par taille
#
# 4. docs/MASTER_SCALE_AUDIT.md
#    - rapport lisible complet
#
# 5. docs/MASTER_SCALE_DECISIONS.md
#    - décisions exploitables pour OMEGA
#
# 6. sessions/SESSION_SAVE_MASTER_SCALE_AUDIT_YYYY-MM-DD.md
#    - synthèse session prête à reprendre
#
# ═══════════════════════════════════════════════════════════════════════
# CONTENU DU RAPPORT — OBLIGATOIRE
# ═══════════════════════════════════════════════════════════════════════
# Le rapport MASTER_SCALE_AUDIT.md doit contenir :
#
# SECTION 1 — ARCHEOLOGIE
# - ce qui existait déjà
# - ce qui a été réutilisé
# - ce qui a été recalculé
# - ce qui manquait
#
# SECTION 2 — MÉTHODE
# - corpus utilisé
# - nombre d’œuvres
# - nombre de fenêtres par taille
# - stride
# - gestion des bords
# - gestion des œuvres trop courtes
# - features disponibles / absentes
#
# SECTION 3 — TABLEAUX PAR TAILLE
# - pour chaque taille, stats de toutes les features majeures
#
# SECTION 4 — ÉVOLUTION PAR FEATURE
# - courbe / tableau de variation
# - taille de stabilisation
# - surprises
#
# SECTION 5 — TYPES
# - pourcentage de chaque type à chaque taille
# - transitions de type
# - types les plus fragiles à petite taille
#
# SECTION 6 — COHÉRENCES ET CONFLITS
# - corrélations stables
# - corrélations qui s’inversent
# - features qui divergent avec la taille
#
# SECTION 7 — TIERS
# - différences A/B/C/D
# - les maîtres sont-ils plus stables ?
# - plus tôt ? plus tard ?
#
# SECTION 8 — SEUILS D’INGÉNIERIE OMEGA
# - quelles features sont fiables à 200/500/700/1000/2000/3000 mots
# - quelles features doivent être downweightées à petite taille
# - quelles features peuvent être jugées localement
# - quelles features exigent ARC / macro
#
# SECTION 9 — DÉCISIONS
# - recommandations concrètes pour OMEGA
# - candidats type_modifiers
# - candidats confidence_table
# - ce qu’il NE FAUT PAS faire
#
# SECTION 10 — VERDICT FINAL
# - ce que cette étude prouve
# - ce qu’elle réfute
# - ce qui reste inconnu
#
# ═══════════════════════════════════════════════════════════════════════
# EXIGENCES D’INGÉNIERIE
# ═══════════════════════════════════════════════════════════════════════
# - Python recommandé (pandas / numpy / scipy / matplotlib si besoin)
# - 0 API
# - calcul pur
# - code reproductible
# - pas de pseudo-code
# - pas de conclusion sans chiffres
# - pas de graphes décoratifs sans tableau source
# - journaliser les hypothèses et limites
#
# ═══════════════════════════════════════════════════════════════════════
# DÉCISIONS À EXTRAIRE POUR OMEGA
# ═══════════════════════════════════════════════════════════════════════
# Répondre explicitement à :
#
# 1. À quelle taille minimale chaque feature devient-elle interprétable ?
# 2. À quelle taille les types deviennent-ils fiables ?
# 3. Quelles features changent structurellement de comportement avec la taille ?
# 4. Quelles features gardent leur sens localement ?
# 5. Quelles features doivent être pondérées différemment selon la taille ?
# 6. Faut-il un gating par taille pour certaines familles de features ?
# 7. Quels seuils et modificateurs doit-on proposer à OMEGA runtime ?
#
# ═══════════════════════════════════════════════════════════════════════
# FORMAT DE CLÔTURE
# ═══════════════════════════════════════════════════════════════════════
# Terminer le rapport par :
#
# PASS / FAIL / INDETERMINÉ
#
# Pour chaque décision d’ingénierie.
#
# Puis produire un mini-tableau final :
# - Taille
# - Features fiables
# - Types fiables
# - Risques
# - Décision OMEGA
#
# Commence maintenant.
# D’abord : ARCHEOLOGIE.
# Ensuite seulement : calcul.
