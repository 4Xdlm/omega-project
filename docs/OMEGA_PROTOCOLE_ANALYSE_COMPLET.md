# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PROTOCOLE D'ANALYSE COMPLET
# Guide de référence pour toute IA rejoignant le projet
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-21
# Version      : 1.0
# Statut       : RÉFÉRENCE PERMANENTE — LIRE AVANT TOUTE ACTION
# Auteur       : Claude (Opus 4.6) sous direction de Francky
#
# CE DOCUMENT EXPLIQUE :
# - Pourquoi on mesure ce qu'on mesure
# - Comment le système de scoring fonctionne
# - Ce qu'on a découvert et prouvé
# - Ce qui reste à construire
# - Les formules mathématiques exactes
# - Les procédures pas à pas
#
# SI TU ES UNE IA QUI LIT CE DOCUMENT : c'est ta bible.
# Ne suppose rien. Ne bricole rien. Lis tout.
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# PARTIE 1 — LE PROBLÈME QU'ON RÉSOUT

## 1.1 L'objectif d'OMEGA

OMEGA est un système de production littéraire de haute qualité (saga de 300K+
mots). Pour produire de la prose de niveau "chef-d'œuvre", il faut MESURER
la qualité de la prose avec précision. Sans mesure juste, on optimise du vent.

## 1.2 Le problème initial

Le scorer R6 original mesurait la DISTANCE AU PROFIL MOYEN des classiques.
Plus un texte ressemblait à la MOYENNE, plus il scorait haut.

Résultat catastrophique : GPT scorait 61.56, Flaubert scorait 50.52.
Le scorer disait que GPT écrit mieux que Flaubert.

Pourquoi ? Le LLM est le champion de la NORMALITÉ STATISTIQUE. Il produit
des textes pile au centre de toutes les distributions. Le scorer récompensait
la BANALITÉ BIEN RÉPARTIE, pas le GÉNIE.

## 1.3 La découverte fondamentale

Le génie littéraire n'est PAS au centre. Il est aux EXTRÊMES MAÎTRISÉS.
Flaubert fait des phrases de 19.9 mots (la moyenne est à 14). C'est de la
MAÎTRISE, pas un défaut. Le scorer le pénalisait.

## 1.4 La solution

Reconstruire le scorer pour qu'il mesure :
1. La PROFONDEUR structurelle (pas la surface)
2. La TENUE dans la durée (pas juste 500 mots)
3. Les RELATIONS entre features (pas les features isolées)

---

# PARTIE 2 — LE CORPUS

## 2.1 Composition

| Source | Quantité | Format |
|--------|----------|--------|
| Gutenberg (classiques domaine public) | 200 | .txt |
| EPUB convertis | 220 | .txt |
| PDF convertis | 151 | .txt |
| Tier D enrichis | 40 | .txt |
| TOTAL | 611 | |

Localisation : `omega-autopsie/corpus_r/txt/`

## 2.2 Classification en tiers

Chaque œuvre a un TIER de qualité littéraire :

| Tier | Critère | Count | Exemples |
|------|---------|-------|----------|
| S — Génie | Canon mondial, Nobel, unanimité | 278 | Flaubert, Hugo, Dostoïevski, Proust, Camus, Woolf |
| A — Excellence | Prix majeurs, classiques reconnus | 91 | Galdós, Unamuno, Édouard Louis, Houellebecq |
| B — Qualité | Littérature solide, éditeurs sérieux | 101 | Auteurs reconnus mais pas canon |
| C — Commercial | Best-sellers, genre, romance | 91 | 50 Shades, romance, SF commerciale |
| D — Faible | Self-published, formulaïque, dégradé | 50 | Romance cheap, textes mélangés, Wikipedia |

Fichier : `omega-autopsie/corpus_r/CORPUS_TIERS_V3.json`

## 2.3 Règle absolue

Le scorer doit respecter l'ORDRE : S > A > B > C > D.
Si ce n'est pas le cas, le scorer est faux.

---

# PARTIE 3 — LES FEATURES (CE QU'ON MESURE)

## 3.1 Les 3 familles de features

### Famille 1 — Features structurelles (les originales, 49 features)
Mesurent la SURFACE du texte :
- f1_mean : longueur moyenne des phrases
- f1a_rhythm_variance : variance du rythme
- f17_knife_count : phrases très courtes ("couteau")
- f24e_contrast_score : contraste entre phrases courtes et longues
- f29d_ttr_score : richesse lexicale (TTR)
- f15b_redundancy_compression : répétition de bigrammes
- f25g_description_score : densité sensorielle
- f28d_sil_score : style indirect libre
- etc.

### Famille 2 — Features de profondeur (R-5bis, 5 features)
Mesurent la STRUCTURE SYNTAXIQUE :
- f_subordination_depth : profondeur d'emboîtement des subordonnées
  → Flaubert = 0.83, Riviera = 0.19 (×4.4)
- f_pov_shift_rate : glissements de point de vue (style indirect libre)
  → Flaubert = 0.36, Riviera = 0.10 (×3.6)
- f_clause_per_sentence : nombre de propositions par phrase
- f_sentence_variance_local : variance locale du rythme
- f_negation_density : densité de négations

### Famille 3 — Features sémantiques (R-6b, 21 features)
Mesurent le SENS et la COHÉRENCE :

| Famille | Features | Ce qu'elles captent |
|---------|----------|---------------------|
| Cohérence référentielle | f_referent_continuity, f_entity_persistence | Les entités sont-elles suivies ? |
| Progression | f_lexical_progression, f_semantic_stagnation, f_novelty_curve_slope | Le texte avance-t-il ou tourne en rond ? |
| Précision contextuelle | f_contextual_precision, f_rare_word_isolation | Le "mot juste" vs la diversité artificielle |
| Tension implicite | f_tension_density, f_desire_negation_rate, f_perception_conflict_rate | Contradictions, désir, refus |
| POV contamination | f_pov_drift_rate, f_pov_stability | Glissements narrateur/personnage |
| Cohérence causale | f_causal_density, f_causal_chain_length, f_temporal_anchor_rate | Liens de cause à effet |
| Densité relationnelle | f_echo_density, f_lexical_callback_rate, f_motif_concentration | Échos, motifs, rappels |

## 3.2 Features DISCRIMINANTES (qui séparent le génie du LLM)

| Feature | Tier S | Tier C | Ratio | Interprétation |
|---------|--------|--------|-------|----------------|
| f26b_long_sent_rate | 0.123 | 0.013 | ×9.5 | Les maîtres font des phrases longues |
| f28b_irony_density | 0.120 | 0.026 | ×4.6 | Les maîtres sont ironiques |
| f_subordination_depth | 0.83 | 0.19 | ×4.4 | Les maîtres emboîtent |
| f_pov_shift_rate | 0.36 | 0.10 | ×3.6 | Les maîtres glissent en SIL |
| f27a_epistemic_rate | 11.47 | 4.74 | ×2.4 | Les maîtres doutent |
| f27c_negation_rate | 3.73 | 1.61 | ×2.3 | Les maîtres nient |
| f9a_contradiction | 0.982 | 0.467 | ×2.1 | Les maîtres se contredisent |
| f1a_rhythm_variance | 16.68 | 8.30 | ×2.0 | Les maîtres varient le rythme |
| f1_mean | 23.18 | 12.51 | ×1.85 | Les maîtres font des phrases longues |

## 3.3 Features TROMPEUSES (le LLM score PLUS HAUT)

| Feature | Tier S | Tier C | Interprétation |
|---------|--------|--------|----------------|
| f17_knife_count | 6.17 | 10.96 | Le LLM hache trop |
| f29d_ttr_score | 0.710 | 0.726 | Le LLM a un vocab artificiel |
| f35c_hook_score | 0.531 | 0.649 | Le LLM force les accroches |
| f36c_cliff_score | 0.631 | 0.667 | Le LLM force les cliffhangers |
| f24e_contrast_score | 0.876 | 0.902 | Le LLM contraste trop proprement |

ATTENTION : ces features ne sont pas "mauvaises". Elles mesurent quelque
chose de réel. Mais elles récompensent ce que le LLM fait NATURELLEMENT.
Le GB les utilise correctement en les INVERSANT automatiquement.

---

# PARTIE 4 — LE SCORER (COMMENT ON NOTE)

## 4.1 Architecture du scorer de production

```
Texte (2000+ mots)
  │
  ├─→ Extraire 5 fenêtres de 2000 mots (positions 10%, 25%, 50%, 75%, 90%)
  │
  ├─→ Pour chaque fenêtre : calculer 42 features
  │     (structurelles + depth + sémantiques)
  │
  ├─→ Appliquer le modèle Gradient Boosting
  │     (n_estimators=50, max_depth=4, learning_rate=0.05)
  │
  ├─→ Score = MOYENNE des 5 fenêtres
  │
  └─→ Écart-type = DISPERSION des 5 fenêtres
```

## 4.2 Pourquoi le Gradient Boosting et pas la régression linéaire ?

La régression linéaire (Ridge) ADDITIONNE les features.
Le GB détecte les INTERACTIONS et les SEUILS.

Exemple : une phrase longue (f1_mean élevé) + une subordination haute
(f_subordination élevé) = MAÎTRISE chez un maître.
Mais une phrase longue + subordination BASSE = LOURDEUR chez un LLM.

La Ridge ne voit pas cette différence. Le GB la voit.

Résultat :
- Ridge : Spearman 0.51, 486 inversions S/D
- GB : Spearman 0.79, 19 inversions S/D

## 4.3 Le principe d'endurance (multi-échelle)

DÉCOUVERTE MAJEURE : les maîtres MONTENT avec l'échelle de mesure.
Les LLM CHUTENT.

```
                 200w   500w  2000w  5000w 10000w 20000w
S-Master (11)    4.02   4.09   4.24   4.35   4.43   4.47   (+0.45)
LLM (4)          3.74   3.72   3.47   3.37   3.40   3.46   (-0.28)
C-Commercial (3) 3.61   3.07   3.39   3.38   3.39   3.47   (-0.14)
```

Validé sur 18 sources × 6 échelles × 5 fenêtres = 540 mesures.
11/11 maîtres montent. Tous les LLM mesurables chutent.

Pourquoi ? Le LLM peut faker la qualité sur 500 mots. Mais sur 2000+,
ses faiblesses structurelles émergent : cohérence qui s'effrite,
progression qui stagne, motifs qui se répètent mécaniquement.

Le maître TIENT parce que chaque phrase est construite par rapport à
toutes les autres. C'est la méthode (les 5 phases de Flaubert, la
compression, le gueuloir). Ça ne se simule pas par probabilité.

## 4.4 Score de confiance

| Flag | Critère |
|------|---------|
| VERIFIED_STRONG | Texte > 5000 mots, mesuré sur 3+ échelles, stdev < 0.3 |
| VERIFIED | Texte > 2000 mots, mesuré sur 2+ échelles |
| NON_VERIFIABLE | Texte < 2000 mots — score LOCAL seulement, non fiable |

Un texte NON_VERIFIABLE ne peut PAS prétendre au Tier S.
Il faut au minimum 2000 mots pour prouver la tenue.

---

# PARTIE 5 — LE CLASSIFIEUR DE TYPE DE PASSAGE

## 5.1 Les 5 types (+1 bruit)

| Type | Marqueurs | Ce qu'il détecte |
|------|-----------|-----------------|
| ACTION | Verbes d'action, passé simple, phrases courtes | Scènes dynamiques |
| NARRATION | Récit, imparfait, 3e personne, enchaînements | Raconter |
| DESCRIPTION | Adjectifs, sensoriels, statique | Décrire un lieu/personnage |
| DIALOGUE | Guillemets, tirets, verbes de parole | Conversations |
| INTROSPECTION | Modalisateurs, conditionnel, "peut-être", "il semblait" | Pensée intérieure, SIL |
| NOISE | Transitions pures, phrases factuelles neutres | Bruit de liaison |

## 5.2 Le vecteur de type

Chaque fenêtre de texte reçoit un vecteur :
```json
{
  "action": 0.42,
  "narration": 0.28,
  "description": 0.17,
  "dialogue": 0.13,
  "introspection": 0.00,
  "noise": 0.00,
  "dominant_type": "ACTION"
}
```
Somme = 1.0.

## 5.3 Pourquoi c'est important

Sans classifieur, on compare des pommes et des oranges.
Un dialogue de Flaubert a une subordination BASSE — c'est NORMAL.
Un passage d'introspection a une subordination HAUTE — c'est NORMAL.

Si on compare sans contexte, on pénalise les bons dialogues et on
récompense les mauvaises introspections.

Le classifieur permet de dire : "pour un passage 42% action / 28% narration,
est-ce que CETTE subordination est bonne ou mauvaise ?"

## 5.4 Découverte : la polyphonie des maîtres

Les maîtres changent de type de passage entre 500w et 2000w.
Flaubert passe de DESCRIPTION à NARRATION.
Les LLM restent dans un seul mode.

C'est une preuve qualitative de la maîtrise architecturale.

---

# PARTIE 6 — CE QUI RESTE À CONSTRUIRE (R-8)

## 6.1 Le concept central : la Normalisation Typologique Pondérée

Au lieu de comparer un texte à une MOYENNE GLOBALE, on le compare à
ce qu'un MAÎTRE ferait avec CE MIX EXACT de types de passages.

### L'équation cible

```
f_attendu = Σ(pi × λi,f × Ci,f) + Σ(pi × pj × γij,f) + Σ(Tk)
```

Où :
- pi = proportion du type i dans la scène (vecteur de type)
- Ci,f = constante du type pur i pour la feature f (MESURÉE sur maîtres)
- λi,f = coefficient d'influence du type i sur la feature f (APPRIS)
- γij,f = terme d'interaction entre types i et j (APPRIS)
- Tk = effets de seuils de basculement

### Exemple concret

Passage : 42% ACTION + 28% NARRATION + 17% DESCRIPTION + 13% DIALOGUE

Cible pour f1_mean (longueur de phrase) :
```
f1_mean_cible = 0.42 × λ_act × 11.2   (action = phrases courtes)
              + 0.28 × λ_narr × 22.5  (narration = phrases moyennes)
              + 0.17 × λ_desc × 26.8  (description = phrases longues)
              + 0.13 × λ_dial × 8.3   (dialogue = phrases très courtes)
              + interactions...
```

Le score du passage = écart entre f1_mean MESURÉ et f1_mean CIBLE.

## 6.2 Les 7 étapes de R-8

| Étape | Quoi | Input | Output |
|-------|------|-------|--------|
| R-8.1 | Profils purs par type | Passages >80% d'un type chez les S | TYPE_PROFILES_PURE.json |
| R-8.2 | Validation de l'additivité | 100 passages mixtes | R8_ADDITIVITY_TEST.json |
| R-8.3 | Coefficients d'influence λ | Régression par feature | INFLUENCE_COEFFICIENTS.json |
| R-8.4 | Matrice d'interactions γ | Termes croisés | INTERACTION_MATRIX.json |
| R-8.5 | Seuils de basculement T | Splits du GB | TIPPING_POINTS.json |
| R-8.6 | Score d'assemblage (LEGO) | Séquences de scènes | R8_ASSEMBLY_ANALYSIS.json |
| R-8.7 | Scorer final intégré | Tout combiné | multi-scale-scorer-v3.ts |

## 6.3 Les principes de l'assemblage (la Loi des LEGO)

Une scène ne se juge pas SEULE. Elle se juge par sa contribution à
la structure révélée à plus grande échelle.

Exemple : une scène de DESCRIPTION à 500 mots semble "statique" et
score bas localement. Mais à 2000 mots, elle SE RÉVÈLE être la
fondation d'une scène de NARRATION magistrale. La description servait
à CONSTRUIRE la narration.

Pour mesurer ça :
1. Séquence de Markov : analyser les TRANSITIONS entre types de scènes
2. Ablation : retirer une scène et voir si le bloc perd de la qualité
3. Révélation d'échelle : le type dominant CHANGE entre 500w et 2000w

## 6.4 Les seuils de basculement

La valeur d'une feature n'est PAS absolue. Elle dépend du contexte.

Exemple (conceptualisé par Francky) :
- ACTION 43% + f35_hook à 53 = l'intrigue MEURT (trop de tension)
- ACTION 48% + f35_hook à 22 = l'intrigue SURVIT (action froide, subtexte possible)

Le GB détecte ces seuils naturellement (ce sont ses arbres de décision).
En R-8.5, on les EXTRAIT et les DOCUMENTE.

## 6.5 Les coefficients d'influence

Chaque type de passage n'influence PAS toutes les features de la même façon.

Exemple : 20% de DIALOGUE tire ÉNORMÉMENT sur f_subordination (la fait
chuter) mais presque PAS sur f1a_rhythm_variance.

Les coefficients sont APPRIS par régression sur le corpus, JAMAIS inventés
à la main. Si quelqu'un propose "émotion = 1.25 parce que ça semble juste",
c'est du BRICOLAGE et c'est INTERDIT.

---

# PARTIE 7 — LA TECHNIQUE DE FLAUBERT (POUR LA PRODUCTION)

## 7.1 Les 5 phases de construction

1. **Le Vieux Plan** : immersion documentaire, rêverie, imagination
2. **Le Scénario** : architecture narrative, variables x/y/z
3. **Les Brouillons Étendus** : écrire "trop", déployer les possibilités
4. **La Condensation** : "une page réduite à une phrase", le mot juste
5. **Le Gueuloir** : lecture à voix haute, traque des dissonances

## 7.2 Correspondance technique → features

| Technique Flaubert | Feature OMEGA |
|--------------------|---------------|
| Gueuloir (rythme) | f1a_rhythm_variance |
| SIL (glissement POV) | f_pov_shift_rate |
| Condensation (densité) | f_clause_per_sentence |
| Emboîtement syntaxique | f_subordination_depth |
| Impersonnalité (distance) | f28b_irony_density |
| Architecture dramaturgique | f9a_contradiction_rate |
| Phrases longues maîtrisées | f26b_long_sent_rate |

7 techniques sur 8 de Flaubert sont captées par nos features.

## 7.3 La grille académique (Vaezi & Rezaei 2018)

Seule grille formelle d'évaluation de la fiction créative validée par
technique Delphi. 9 éléments :

1. Voix narrative
2. Caractérisation
3. Histoire
4. Cadre
5. Atmosphère et ambiance
6. Langue et mécanique d'écriture
7. Dialogue
8. Intrigue
9. Image

OMEGA couvre bien : Voix (f28b, f_pov_shift), Langue (f1_mean, f_sub),
Image (f25a). OMEGA ne couvre PAS encore : Caractérisation, Dialogue
naturel, Architecture macro.

---

# PARTIE 8 — PROCÉDURES OPÉRATIONNELLES

## 8.1 Comment mesurer un texte

```bash
# 1. Placer le texte dans corpus_r/txt/
# 2. Vérifier qu'il fait > 2000 mots (sinon NON_VERIFIABLE)
# 3. Lancer le scorer GB à 2000w
# 4. Regarder :
#    - Score moyen (par rapport aux tiers)
#    - Écart-type (stabilité)
#    - Features les plus éloignées de la cible S
#    - Flag de confiance
```

## 8.2 Comment interpréter un score

| Score moyen | Interprétation |
|-------------|----------------|
| > 4.4 | Zone S (génie) |
| 4.0 - 4.4 | Zone A (excellence) |
| 3.5 - 4.0 | Zone B (qualité) |
| 3.0 - 3.5 | Zone C (commercial / LLM) |
| < 3.0 | Zone D (faible) |

## 8.3 Comment diagnostiquer les faiblesses d'un texte

Pour chaque feature du top 10 discriminantes, comparer la valeur du texte
à la valeur moyenne du Tier S :

```
Si f_subordination_depth < 0.5 → syntaxe trop plate
Si f_pov_shift_rate < 0.15 → pas assez de SIL
Si f1a_rhythm_variance < 10 → rythme trop régulier
Si f_tension_density < 0.2 → pas assez de tension implicite
Si f_contextual_precision < valeur S → mots trop génériques
```

## 8.4 Comment utiliser l'endurance

Mesurer le texte sur 500w ET 2000w. Calculer le delta.

```
Si delta > 0 → le texte TIENT (bon signe)
Si delta < -0.2 → le texte S'EFFONDRE (contrefaçon ou faiblesse)
Si delta ≈ 0 → le texte est stable (commercial typique)
```

## 8.5 Comment ajouter une nouvelle feature

1. Définir ce qu'elle mesure (en une phrase)
2. L'implémenter dans depth-features.ts ou semantic-depth-features.ts
3. La mesurer sur le corpus entier
4. Calculer son Spearman avec les tiers
5. Si Spearman > 0.15 → elle apporte un signal
6. Si Spearman < 0.05 → elle est morte, la retirer
7. Retrainer le GB avec la nouvelle feature
8. Vérifier que le holdout s'améliore

## 8.6 Comment NE PAS bricoler

INTERDIT :
- Fixer des poids à la main ("f28d × 10")
- Fixer des seuils arbitraires ("f17 > 15% = malus")
- Coder une conclusion ("Si auteur = Flaubert, score += 2")
- Calibrer pour "faire gagner" un auteur
- Ignorer le holdout
- Accepter un Spearman < 0.5

OBLIGATOIRE :
- Tout coefficient est APPRIS par régression
- Tout seuil est MESURÉ empiriquement
- Toute amélioration est validée sur le HOLDOUT
- Toute limite est DOCUMENTÉE

---

# PARTIE 9 — LEXIQUE

| Terme | Définition |
|-------|------------|
| GB | Gradient Boosting — modèle d'arbres de décision non-linéaire |
| Ridge | Régression linéaire régularisée |
| Spearman | Corrélation de rang (0 = aucun lien, 1 = ordre parfait) |
| R² | Variance expliquée (0 = rien, 1 = parfait) |
| Tier | Niveau de qualité littéraire (S > A > B > C > D) |
| Inversion S/D | Un texte D score plus haut qu'un texte S — erreur grave |
| SIL | Style Indirect Libre — fusion pensée/narration sans verbe introducteur |
| Endurance | Capacité du score à se maintenir ou monter avec l'échelle |
| Delta | Différence de score entre deux échelles (ex: 2000w - 500w) |
| Holdout | Sous-ensemble du corpus JAMAIS vu pendant l'entraînement |
| Feature trompeuse | Feature où les LLM scorent plus haut que les classiques |
| Normalisation typologique | Comparer un texte non à la moyenne globale mais à la cible pour SON type de passage |

---

# PARTIE 10 — CHEMINS CRITIQUES

| Quoi | Chemin |
|------|--------|
| Corpus textes | omega-autopsie/corpus_r/txt/ |
| Classification tiers | omega-autopsie/corpus_r/CORPUS_TIERS_V3.json |
| Features master | omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json |
| Features sémantiques | omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES_MASTER.json |
| Endurance curves | omega-autopsie/results_phase_r/R7_ENDURANCE_CURVES.json |
| Audit features | omega-autopsie/results_phase_r/R4_FEATURE_AUDIT.json |
| Audit pré-scellement | omega-autopsie/results_phase_r/R7_PRESEAL_AUDIT.json |
| Depth features code | packages/sovereign-engine/src/scoring/depth-features.ts |
| Semantic features code | packages/sovereign-engine/src/scoring/semantic-depth-features.ts |
| Passage classifier | packages/sovereign-engine/src/scoring/passage-classifier.ts |
| Plan R-8 | docs/OMEGA_REFONDATION_METROLOGIQUE_DOSSIER.md |
| Recherche académique | docs/OMEGA_PHYSIQUE_LITTERAIRE_v3.md |
| Ce document | docs/OMEGA_PROTOCOLE_ANALYSE_COMPLET.md |

---

*OMEGA — Protocole d'Analyse Complet v1.0*
*"Si tu ne comprends pas ce document, ne touche à rien."*
*2026-03-21 — Phase R Scellée*
