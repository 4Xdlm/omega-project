# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PLAN PHASE R : REFONDATION MÉTROLOGIQUE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date        : 2026-03-18
# Version     : v1.0
# Statut      : PLAN VALIDÉ — CONVERGENCE 3/3 IAs + FRANCKY
# Standard    : NASA-Grade L4 / DO-178C Level A
# Autorité    : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# ═══════════════════════════════════════════════════════════════════════════════
# CHARTE PHASE R — RÈGLES INDISCUTABLES (copie intégrale)
# ═══════════════════════════════════════════════════════════════════════════════
#
# R-01 : CHAQUE PHASE = UNE CONVERSATION
#   Début : bilan de compréhension obligatoire, validation Francky.
#   Fin : SESSION_SAVE + rapport + message de redémarrage.
#
# R-02 : CHAQUE PHASE SE TERMINE PAR UN RAPPORT
#   SESSION_SAVE dans le repo, données chiffrées, décisions justifiées.
#
# R-03 : ZÉRO APPRÉCIATION — QUE DU CALCUL
#   Chaque constante dérivée du corpus. INTERDIT de fixer "au feeling".
#   Valeur non prouvée = marquée UNPROVEN = non utilisée.
#
# R-04 : AUCUNE LIMITE DE TAILLE D'ANALYSE
#   Œuvres analysées dans leur ENTIÈRETÉ. Chapitres réels complets.
#   Sagas = analyse multi-tomes avec moyennes.
#
# R-05 : 3 LANGUES MINIMUM — FR + EN + ES
#   Originaux uniquement. Traductions exclues du calcul des constantes.
#
# R-06 : 5 NIVEAUX D'ANALYSE
#   Phrase (10-40 mots) | Scène (300-1500) | Chapitre (réel) | Arc | Œuvre
#
# R-07 : RECONNAISSANCE DU TYPE DE TEXTE
#   Description, Dialogue, Action, Introspection, Transition.
#   Poids adaptés au type détecté.
#
# R-08 : COEFFICIENT DE CONFIANCE OBLIGATOIRE
#   Chaque score accompagné de sa confiance (0.0-1.0) dérivée du corpus.
#
# R-09 : DOCTRINE MOTEUR GELÉE
#   engine.ts, damage-gate.ts, micro-surgeon.ts, config.ts = INTOUCHABLES.
#
# R-10 : COMMIT À CHAQUE FIN DE PHASE
#   SESSION_SAVE + roadmap + résultats committés et taggés.
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# PARTIE 1 — CONTEXTE ET MOTIVATIONS

## 1.1 — Pourquoi Phase R

Le bench V-RECAL-1 (5 runs) a prouvé que :
1. Le moteur PEUT produire des SEAL (3 archétypes en un run)
2. La variance ±1.5 pts entre runs identiques est du BRUIT DE MESURE
3. 16/16 features sont instables à 300 mots (gain 1.7× à 9.6× en chapitre)
4. Certaines features CHANGENT de valeur moyenne entre échelles (+73% f25g, +95% f30d)

**Conclusion : le plafond à 91-92 n'est pas un plafond du moteur, c'est un plafond de la mesure.**

## 1.2 — La thèse fondatrice (Francky)

> "Le génie qui a écrit a senti qu'il devait couper à cet endroit.
> Nous devons suivre leur génie et en tirer des mathématiques et de la physique."

> "Chaque donnée doit sortir de calculs précis et d'analyses prouvables,
> pas de notre appréciation. Cela doit devenir une règle empirique et indiscutable."

> "Une scène de description ne sera pas analysée pareil qu'une scène d'action.
> Il faut reconnaître les écrits pour pouvoir leur adapter nos analyses."

---

# PARTIE 2 — ARCHITECTURE CIBLE

## 2.1 — Les 5 niveaux d'analyse

| Niveau | Unité | Taille | Ce qu'on y mesure |
|--------|-------|--------|-------------------|
| N1 PHRASE | Phrase individuelle | 10-40 mots | Syntaxe, euphonie, hapax, fragment |
| N2 SCÈNE | Passage continu | 300-1500 mots | Rythme, densité sensorielle, anti-cliché, hook |
| N3 CHAPITRE | Chapitre réel | 1500-35000+ mots | Arc émotionnel, intériorité, SIL, nécessité, impact |
| N4 ARC | Multi-chapitres | 15000-80000 mots | Endurance, courbe de tension, résonance |
| N5 ŒUVRE | Livre/Saga complet | 30000-1500000+ mots | Cohérence globale, signature auteur, naturalité |

## 2.2 — Le juge multi-étages (validé 3/3 unanime)

```
ÉTAGE 1 — LOCAL (N1 + N2)
  → rhythm, euphony, anti_cliche, signature, hook, TTR, fragment_rate
  → Confiance HAUTE à cette échelle
  → Si LOCAL FAIL → skip ARC (handshake)

ÉTAGE 2 — ARC (N3)
  → tension_14d, interiority, impact, necessity, SIL, modal, description
  → Confiance calculée par courbes R1
  → Adaptation au type de texte détecté

ÉTAGE 3 — MACRO (N4 + N5)
  → Endurance stylistique, cohérence, naturalité coupure, P_rel
  → Famille F31-F45 (nouvelles features de découpe)

FUSION
  → score = Σ(score_i × weight_i × confidence_i)
  → Chaque score affiche sa confiance
```

## 2.3 — Types de texte reconnus

| Type | Détection | Features prioritaires |
|------|-----------|----------------------|
| DESCRIPTION | Haute densité sensorielle, phrases longues | f25g, f24e, f29b, euphony |
| DIALOGUE | Guillemets/tirets, phrases courtes | rhythm, fragment_rate, anti_cliche |
| ACTION | Verbes d'action, fragments | f5a, f18a, rhythm, tension |
| INTROSPECTION | Modalité épistémique, SIL | f27d, f28d, f22f, interiority |
| TRANSITION | Marqueurs temporels, faible tension | f12b, f23d, necessity |

## 2.4 — Nouvelles features proposées (F31-F45 : Topologie)

| ID | Feature | Description |
|----|---------|-------------|
| F31 | Longueur chapitre | Distribution des longueurs de chapitres dans l'œuvre |
| F32 | Position relative P_rel | mots_précédents / mots_totaux |
| F33 | Ratio points/virgules | "Rythme cardiaque" — staccato vs legato |
| F34 | Densité paragraphique | ¶ par 1000 mots — vitesse de lecture |
| F35 | Hook strength | Features de tension sur 100 premiers mots du chapitre |
| F36 | Cliffhanger strength | Features de tension sur 100 derniers mots |
| F37 | Naturalité de coupure | Score "inévitable" vs "mécanique" de la frontière |
| F38 | Vitesse typographique | Combinaison ponctuation + longueur ¶ = accélération/décélération |
| F39 | Arc tensionnel du chapitre | Courbe tension sur 4 quartiles du chapitre |
| F40 | Transition inter-chapitres | Écart émotionnel entre fin chap N et début chap N+1 |
| F41-F45 | Réservés | Extension corpus (à définir en R1/R2) |

---

# PARTIE 3 — PLAN D'EXÉCUTION DÉTAILLÉ

## Phase R0 — Préparation corpus (estimé : 1-2 sessions)

### Objectifs
- Lever CHAPTER_MAX_WORDS dans full_work_analyzer
- Ajouter le corpus espagnol (domaine public Gutenberg)
- Identifier les sagas dans le corpus existant
- Produire le plan d'extraction multi-fenêtre
- Valider la liste des œuvres finales (FR + EN + ES)

### Livrables
- `full_work_analyzer_v5.py` avec limites levées
- `OMEGA_CORPUS_PHASE_R.json` — liste complète des œuvres, langues, tailles
- SESSION_SAVE R0

### Critères PASS R0
- [ ] Corpus FR : ≥ 70 œuvres originales
- [ ] Corpus EN : ≥ 50 œuvres originales
- [ ] Corpus ES : ≥ 15 œuvres originales
- [ ] Sagas identifiées avec liens inter-tomes
- [ ] CHAPTER_MAX_WORDS supprimé
- [ ] Plan d'extraction validé par Francky

## Phase R1 — Analyse multi-fenêtre complète (estimé : 3-5 sessions)

### Objectifs
- Mesurer F1-F30 sur les 5 niveaux (phrase, scène, chapitre, arc, œuvre)
- Calculer CV(feature, taille) sur tout le corpus
- Tracer les courbes de stabilisation
- Dériver window_min et window_opt par feature
- Croiser feature × taille × P_rel × type de texte

### Livrables
- `OMEGA_METROLOGIE_EMPIRIQUE_v1.json` — toutes les constantes
- Courbes de stabilisation par feature (visualisations)
- Table window_min / window_opt
- Zone de vérité par feature × P_rel
- SESSION_SAVE R1

### Critères PASS R1
- [ ] Toutes les features F1-F30 mesurées à 5 niveaux
- [ ] CV calculé pour chaque feature × niveau × langue
- [ ] window_min et window_opt dérivés empiriquement (ZÉRO appréciation)
- [ ] Courbes de stabilisation tracées
- [ ] Classification par type de texte validée
- [ ] 0 valeur UNPROVEN dans les constantes finales

## Phase R2 — Lois de la découpe (estimé : 2-3 sessions)

### Objectifs
- Analyser les chapitres réels complets du corpus
- Extraire la physique de la découpe (ponctuation, paragraphes, P_rel)
- Mesurer les hooks (100 premiers mots) et cliffhangers (100 derniers)
- Calculer les features F31-F40 sur tout le corpus
- Produire les profils-types par position dans l'œuvre

### Livrables
- `OMEGA_TOPOLOGIE_NARRATIVE_v1.json`
- Carte thermique features × P_rel
- Profils-types (début, milieu, climax, fin)
- SESSION_SAVE R2

### Critères PASS R2
- [ ] Features F31-F40 calculées sur tout le corpus
- [ ] Distribution des longueurs de chapitres par auteur/langue/époque
- [ ] P_rel × features cartographié
- [ ] Hooks et cliffhangers caractérisés empiriquement

## Phase R3 — Calcul des coefficients proportionnels (estimé : 2-3 sessions)

### Objectifs
- Dériver confidence(feature, taille, P_rel, type_texte) depuis R1+R2
- Calculer les poids effectifs par niveau d'analyse
- Définir les seuils de désactivation (confiance < 0.20)
- Produire les formules de scoring adaptatif

### Livrables
- `OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json`
- Table complète : feature × taille → weight_effective
- Formule composite par niveau
- SESSION_SAVE R3

### Critères PASS R3
- [ ] Chaque coefficient dérivé des données R1+R2 (ZÉRO appréciation)
- [ ] Seuils de désactivation documentés par feature
- [ ] Formule composite validée sur corpus de référence (backtest)
- [ ] Consultation 3 IAs validée

## Phase R4 — Reconstruction du scorer multi-étages (estimé : 3-5 sessions)

### Objectifs
- Implémenter l'architecture 3 étages + fusion dans le code TypeScript
- Intégrer les coefficients proportionnels
- Intégrer le détecteur de type de texte
- Intégrer le coefficient de confiance affiché
- Tests unitaires pour chaque étage

### Livrables
- Code scorer multi-étages
- Tests unitaires (cible : 100% coverage sur les nouvelles fonctions)
- SESSION_SAVE R4

## Phase R5 — Bench sur textes de taille réelle (estimé : 2-3 sessions)

### Objectifs
- Modifier le bench pour générer des textes de 1500-3000 mots (adaptatif)
- Augmenter les beats de 4 à 8-12
- Recalibrer les thresholds du Damage Gate pour la nouvelle taille
- Premier bench complet avec scorer multi-étages

### Livrables
- Nouveau run-benchmark-phase-r.ts
- Résultats du premier bench à taille réelle
- Comparaison avec les résultats Phase W/V-RECAL
- SESSION_SAVE R5

---

# PARTIE 4 — CALENDRIER ET DÉPENDANCES

```
R0 (Corpus)
  └→ R1 (Mesure multi-fenêtre) ← FONDATION DE TOUT
       ├→ R2 (Lois de la découpe)
       └→ R3 (Coefficients)
            └→ R4 (Scorer multi-étages)
                 └→ R5 (Bench taille réelle)
```

R1 est la phase critique. Sans R1, rien ne se construit.
R2 peut démarrer en parallèle de R1 (données indépendantes).
R3 nécessite R1 + R2 terminées.

---

*Document produit le 2026-03-18 — Standard NASA-Grade L4 / DO-178C Level A*
*Convergence : Claude + ChatGPT + Gemini + Francky*
