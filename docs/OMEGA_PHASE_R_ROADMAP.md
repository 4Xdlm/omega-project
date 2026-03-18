# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — ROADMAP PHASE R : REFONDATION MÉTROLOGIQUE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Version     : v1.0
# Date        : 2026-03-18
# Statut      : ACTIVE — Phase R0 prête au lancement
# Précédent   : OMEGA_ROADMAP_v8_0 (Phases A-INFRA → V-RECAL)
# Standard    : NASA-Grade L4 / DO-178C Level A
# Autorité    : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# ═══════════════════════════════════════════════════════════════════════════════
# CHARTE PHASE R — RÈGLES INDISCUTABLES
# ═══════════════════════════════════════════════════════════════════════════════
#
# R-01 : CHAQUE PHASE = UNE CONVERSATION DISTINCTE
#   → Début : bilan de compréhension (OMEGA Supreme F4)
#   → L'IA lit les docs, présente son bilan, attend validation Francky
#   → AUCUNE ACTION avant validation du bilan
#
# R-02 : CHAQUE PHASE SE TERMINE PAR :
#   → SESSION_SAVE complet commité dans le repo
#   → Rapport avec données chiffrées et décisions justifiées
#   → Message de redémarrage précis pour la phase suivante
#   → Le SESSION_SAVE relate les points importants des discussions
#     et leurs choix finaux de décision
#
# R-03 : ZÉRO APPRÉCIATION — QUE DU CALCUL EMPIRIQUE
#   → Chaque constante = dérivée du corpus par calcul
#   → Valeur non prouvée = UNPROVEN = non utilisée dans le scoring
#   → "Ça semble bien" = INTERDIT
#
# R-04 : AUCUNE LIMITE DE TAILLE — LIVRE ENTIER
#   → Chapitres réels complets, quelle que soit la taille
#   → Sagas = analyse multi-tomes + moyennes inter-livres
#
# R-05 : 3 LANGUES — FR + EN + ES (originaux uniquement)
#
# R-06 : 5 NIVEAUX — Phrase | Scène | Chapitre | Arc | Œuvre
#
# R-07 : RECONNAISSANCE DU TYPE DE TEXTE
#   → Description ≠ Dialogue ≠ Action ≠ Introspection ≠ Transition
#
# R-08 : COEFFICIENT DE CONFIANCE SUR CHAQUE SCORE
#
# R-09 : MOTEUR GELÉ PENDANT PHASE R
#
# R-10 : COMMIT + TAG À CHAQUE FIN DE PHASE
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# ROADMAP — VUE D'ENSEMBLE

| Phase | Nom | Objectif | Critère de sortie | Dépendances |
|-------|-----|----------|-------------------|-------------|
| **R0** | Corpus | Préparer corpus FR+EN+ES, lever limites | Corpus validé, plan extraction OK | Aucune |
| **R1** | Mesure | Analyser F1-F30 à 5 niveaux sur corpus complet | CV par feature×taille, window_min/opt dérivés | R0 |
| **R2** | Découpe | Extraire la physique de la structure narrative | F31-F40, carte P_rel, profils-types | R0 |
| **R3** | Coefficients | Calculer les poids proportionnels | Formules confidence(f, taille, P_rel, type) | R1 + R2 |
| **R4** | Scorer | Implémenter le juge multi-étages | Code + tests, 3 étages + fusion | R3 |
| **R5** | Bench | Générer et scorer des textes taille réelle | Premier bench 1500-3000 mots | R4 |

---

# DÉTAIL PAR PHASE

## R0 — PRÉPARATION CORPUS

```
Statut : PRÊTE AU LANCEMENT
Conversation : Nouvelle (la prochaine)
```

**Actions :**
1. Modifier full_work_analyzer : supprimer CHAPTER_MAX_WORDS
2. Ajouter corpus espagnol (domaine public Gutenberg)
3. Identifier les sagas dans le corpus (Proust, Zola, Balzac, Tolkien, etc.)
4. Valider la liste finale des œuvres
5. Produire le plan d'extraction multi-fenêtre

**Livrables :**
- full_work_analyzer_v5.py
- OMEGA_CORPUS_PHASE_R.json
- SESSION_SAVE_R0.md

**Critères PASS :**
- FR ≥ 70 œuvres | EN ≥ 50 | ES ≥ 15
- CHAPTER_MAX_WORDS supprimé
- Sagas identifiées

**Message de redémarrage pour R1 :**
```
OMEGA SESSION — PHASE R1 (MESURE MULTI-FENÊTRE)
Dernier état : SESSION_SAVE_R0
Corpus : [nombre] œuvres / [nombre] langues
Objectif : Mesurer F1-F30 à 5 niveaux, dériver les constantes empiriques
Lire : SESSION_SAVE_R0 + OMEGA_PHASE_R_PLAN + OMEGA_PHASE_R_ROADMAP
```

---

## R1 — MESURE MULTI-FENÊTRE (PHASE CRITIQUE)

```
Statut : EN ATTENTE DE R0
```

**Actions :**
1. Construire le script d'analyse multi-fenêtre (5 niveaux × 30 features × corpus complet)
2. Exécuter sur tout le corpus FR + EN + ES
3. Calculer CV(feature, taille) et courbes de stabilisation
4. Dériver window_min et window_opt EMPIRIQUEMENT
5. Croiser feature × taille × P_rel × type de texte
6. Classifier chaque feature : LOCAL / ARC / MACRO

**Livrables :**
- OMEGA_METROLOGIE_EMPIRIQUE_v1.json
- Courbes de stabilisation (visualisations)
- Table classification features
- SESSION_SAVE_R1.md

**Critères PASS :**
- 30 features × 5 niveaux × 3 langues mesurées
- window_min et window_opt TOUS dérivés par calcul (0 UNPROVEN)
- Consultation 3 IAs validée sur les résultats

---

## R2 — LOIS DE LA DÉCOUPE

```
Statut : EN ATTENTE DE R0 (parallélisable avec R1)
```

**Actions :**
1. Parser les chapitres réels de chaque œuvre
2. Calculer F31-F40 (nouvelles features topologiques)
3. Cartographier features × P_rel (position dans l'œuvre)
4. Analyser hooks (100 premiers mots) et cliffhangers (100 derniers)
5. Extraire la distribution de ponctuation par type et position
6. Produire les profils-types par position (10%, 25%, 50%, 75%, 90%)

**Livrables :**
- OMEGA_TOPOLOGIE_NARRATIVE_v1.json
- Carte thermique features × P_rel
- SESSION_SAVE_R2.md

---

## R3 — COEFFICIENTS PROPORTIONNELS

```
Statut : EN ATTENTE DE R1 + R2
```

**Actions :**
1. Dériver confidence(feature, taille, P_rel, type_texte) depuis R1+R2
2. Calculer weight_effective = weight_nominal × confidence
3. Définir seuils de désactivation (confiance < 0.20 = feature OFF)
4. Backtester les formules sur le corpus de référence
5. Produire le scoring adaptatif par niveau

**Livrables :**
- OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json
- Formule composite par niveau
- SESSION_SAVE_R3.md

---

## R4 — RECONSTRUCTION DU SCORER

```
Statut : EN ATTENTE DE R3
```

**Actions :**
1. Implémenter 3 étages (LOCAL / ARC / MACRO) + FUSION
2. Intégrer détecteur de type de texte
3. Intégrer coefficient de confiance affiché
4. Tests unitaires complets
5. Recalibrer Damage Gate thresholds pour nouvelles tailles

**Livrables :**
- Code multi-étages dans packages/sovereign-engine/
- Tests (cible : extensions des 1791 existants)
- SESSION_SAVE_R4.md

---

## R5 — BENCH TAILLE RÉELLE

```
Statut : EN ATTENTE DE R4
```

**Actions :**
1. Nouveau bench : scènes 1500-3000 mots (adaptatif par archétype)
2. Beats étendus : 8-12 par scène
3. Scorer multi-étages actif
4. Comparaison avec résultats Phase W/V-RECAL
5. Premier cycle de validation SEAL sur textes réels

**Livrables :**
- run-benchmark-phase-r.ts
- Résultats du premier bench
- SESSION_SAVE_R5.md

---

# RÈGLES DE TRANSITION ENTRE PHASES

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   1. Chaque phase = UNE conversation                                                  ║
║   2. Début de phase = Bilan de compréhension + validation Francky                     ║
║   3. Fin de phase = SESSION_SAVE + rapport + message de redémarrage                   ║
║   4. Le SESSION_SAVE relate les discussions et choix de décision                       ║
║   5. Commit + tag dans le repo à chaque fin de phase                                  ║
║   6. Le message de redémarrage contient TOUTES les infos pour la phase suivante        ║
║   7. Aucune phase ne démarre sans que la précédente soit PASS                          ║
║   8. Les 3 IAs sont consultées à chaque fin de phase avant passage                    ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

# DIAGRAMME DE DÉPENDANCES

```
                    ┌──────┐
                    │  R0  │ Corpus
                    └──┬───┘
                 ┌─────┴─────┐
                 │           │
              ┌──┴──┐    ┌──┴──┐
              │ R1  │    │ R2  │  (parallélisables)
              └──┬──┘    └──┬──┘
                 └─────┬────┘
                    ┌──┴──┐
                    │ R3  │ Coefficients
                    └──┬──┘
                    ┌──┴──┐
                    │ R4  │ Scorer
                    └──┬──┘
                    ┌──┴──┐
                    │ R5  │ Bench
                    └─────┘
```

---

*Roadmap produite le 2026-03-18 — Standard NASA-Grade L4 / DO-178C Level A*
*Convergence : Claude + ChatGPT + Gemini + Francky*
*Prochaine action : LANCEMENT PHASE R0*
