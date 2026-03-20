# OMEGA — Rosetta Phase 3 : Étalonnage Profond

**Date** : 2026-03-20
**Modèle** : claude-sonnet-4-20250514
**Appels API** : 51

## 1. Reverse Prompting — Instructions demandées par le LLM

### DESCRIPTION
**Nom LLM** : Prose narrative psychologique du XIXe siècle
**Instructions demandées** :
- Construire des phrases de 25 à 50 mots avec au moins 2 subordonnées par phrase
- Alterner entre dialogues au présent et narration au passé simple/imparfait
- Développer l'intériorité des personnages par l'analyse de leurs motivations cachées
- Utiliser un vocabulaire soutenu mais accessible, éviter l'archaïsme
- Intégrer des métaphores organiques (animal, végétal) pour les émotions
- Employer des connecteurs logiques complexes (considérant que, sans compter que, etc.)
- Maintenir une distance narrative omnisciente même dans l'intimité
- Structurer chaque paragraphe autour d'un état psychologique précis
**Limitation avouée** : Reproduire parfaitement la subtilité des nuances psychologiques et la fluidité naturelle du style indirect libre caractéristique des maîtres du XIXe siècle

### ACTION
**Nom LLM** : Prose dramatique à pivots émotionnels
**Instructions demandées** :
- Construire chaque paragraphe autour d'un moment de révélation ou de doute existentiel brutal
- Alterner systématiquement entre phases d'introspection anxieuse et gestes physiques précis
- Utiliser des exclamations courtes pour ponctuer les prises de conscience
- Employer le passé simple pour l'action, l'imparfait pour l'état psychologique
- Multiplier les verbes de perception sensorielle (toucher, voir, entendre, sentir)
- Intégrer des fragments de dialogue intérieur au style indirect libre
- Privilégier des phrases courtes et hachées dans les moments de tension maximale
- Utiliser des connecteurs temporels abruptes ('Au moment où', 'Soudain', 'Alors')
**Limitation avouée** : Reproduire l'authenticité de l'angoisse existentielle du 19ème siècle et la spontanéité des révélations psychologiques vraiment troublantes

### INTROSPECTION
**Nom LLM** : Prose périodique à incises méditatives
**Instructions demandées** :
- Construire des phrases de 80-150 mots minimum avec au moins 3 niveaux d'emboîtement
- Multiplier les incises explicatives introduites par 'car', 'parce que', 'étant donné que'
- Insérer des énumérations détaillées qui justifient chaque élément mentionné
- Faire intervenir le narrateur pour commenter ses propres observations
- Utiliser des constructions en cascade : principale → relative → causale → temporelle
- Dilater chaque action par ses circonstances, ses causes, ses nuances
- Mélanger descriptions concrètes et réflexions abstraites dans la même période
- Reprendre et reformuler la même idée sous différents angles dans la phrase
**Limitation avouée** : Reproduire la musicalité et la précision poétique de la langue française classique, ainsi que l'art de l'amplification rhétorique qui transforme le détail trivial en révélation esthétique

### CONTEMPLATION
**Nom LLM** : Corpus Hétéroclite Falsifié
**Instructions demandées** :
- Ignorer les phrases 3, 4, 5 et 6 qui sont des leurres
- S'inspirer uniquement des phrases 1 et 2 : prose contemplative française avec longues périodes
- Utiliser des phrases de 40-80 mots avec subordinées enchâssées
- Décrire des paysages ou situations avec mélancolie empathique
- Employer un lexique soutenu, archaïsant, avec métaphores délicates
- Alterner entre description sensuelle (phrase 1) et réflexion sociale compassionnelle (phrase 2)
- Maintenir un rythme ample, contemplatif, avec clausules mélancoliques
**Limitation avouée** : Reproduire authentiquement cette prose du XIXe siècle tardif avec ses archaïsmes subtils et sa syntaxe sophistiquée sans tomber dans la pastiche artificielle

### LYRIQUE
**Nom LLM** : Prose Narrative Hypnotique à Accumulation Cyclique
**Instructions demandées** :
- Construire des phrases de 40 à 80 mots minimum avec accumulation progressive
- Utiliser la répétition obsessionnelle : reprendre le même segment en l'enrichissant
- Privilégier les tirets longs et virgules, éviter les points sauf en fin de cycle
- Insérer des fragments dans une autre langue ou des citations sans guillemets
- Alterner registre soutenu et familier dans la même phrase
- Créer un effet hypnotique par la récurrence de structures syntaxiques
- Développer chaque idée par accumulation de détails et de variantes
- Maintenir un rythme incantatoire, comme une litanie ou une mélopée
**Limitation avouée** : Reproduire parfaitement l'effet d'envoûtement authentique et la fluidité naturelle de l'accumulation obsessionnelle, maintenir la cohérence poétique sur 500 mots sans que cela devienne artificiel

## 2. Auto-classification — Groupes LLM vs nos 5 styles

Le LLM a identifié **8 groupes** :

- **Prose classique narrative** : phrases 2, 3, 7, 16, 17, 28, 29
- **Prose épique antique** : phrases 4, 5, 14, 15
- **Fragments dramatiques** : phrases 6, 8, 9
- **Prose ornementale impressionniste** : phrases 18, 19
- **Prose philosophique anglaise** : phrases 20, 21
- **Dialogue romanesque anglais** : phrases 1, 10, 11, 12, 13, 26, 27, 30
- **Références documentaires** : phrases 22, 23
- **Prose hybride traductive** : phrases 24, 25

**Matrice de correspondance** :

| Style OMEGA | Prose classique narrative | Prose épique antique | Dialogue romanesque anglais | Fragments dramatiques | Prose ornementale impressionniste | Prose philosophique anglaise | Références documentaires | Prose hybride traductive |
|-------------|---|---|---|---|---|---|---|---|
| DESCRIPTION | 33.3% | 33.3% | 33.3% | 0% | 0% | 0% | 0% | 0% |
| ACTION | 16.7% | 0% | 33.3% | 50% | 0% | 0% | 0% | 0% |
| INTROSPECTION | 33.3% | 33.3% | 33.3% | 0% | 0% | 0% | 0% | 0% |
| CONTEMPLATION | 0% | 0% | 0% | 0% | 33.3% | 33.3% | 33.3% | 0% |
| LYRIQUE | 33.3% | 0% | 33.3% | 0% | 0% | 0% | 0% | 33.3% |

## 3. Stratégies de substitution (features irréductibles)

### f28d_sil_score — Style indirect libre
- Baseline : 0.078
- Après stratégie : 0
- Delta : -0.078
- R6 : 50.13
- Verdict : **AUCUN_PROGRES**

### f27d_modal_score — Modalisation
- Baseline : 0.2731
- Après stratégie : 0.3369
- Delta : +0.0638
- R6 : 55.48
- Verdict : **PROGRES**

### f5c_action_verb_ratio — Ratio verbes d'action
- Baseline : 0.1933
- Après stratégie : 3.5
- Delta : +3.3067
- R6 : 59.17
- Verdict : **PROGRES**

## 4. Micro-chirurgie bornée

| Passage | R6 avant | R6 après | Delta | Phrases modifiées |
|---------|----------|----------|-------|-------------------|
| DESCRIPTION_Flaubert | 54.08 | 54.06 | -0.02 | 3 |
| INTROSPECTION_Proust | 39.83 | 41.78 | +1.95 | 3 |
| LYRIQUE_GarciaMarquez | 40.25 | 40.53 | +0.28 | 3 |

## 5. Dictionnaire V3 — Instructions LLM-driven par style

### DESCRIPTION → "Prose narrative psychologique du XIXe siècle"
- Phrase typique : 35 mots
- Verbes : Verbes d'état, de perception et de sentiment au passé
- Rythme : Ample et méditatif, avec des accélérations lors des dialogues
- Limitation : Reproduire parfaitement la subtilité des nuances psychologiques et la fluidité naturelle du style indirect libre caractéristique des maîtres du XIXe siècle
- Instructions :
  - Construire des phrases de 25 à 50 mots avec au moins 2 subordonnées par phrase
  - Alterner entre dialogues au présent et narration au passé simple/imparfait
  - Développer l'intériorité des personnages par l'analyse de leurs motivations cachées
  - Utiliser un vocabulaire soutenu mais accessible, éviter l'archaïsme
  - Intégrer des métaphores organiques (animal, végétal) pour les émotions
  - Employer des connecteurs logiques complexes (considérant que, sans compter que, etc.)
  - Maintenir une distance narrative omnisciente même dans l'intimité
  - Structurer chaque paragraphe autour d'un état psychologique précis

### ACTION → "Prose dramatique à pivots émotionnels"
- Phrase typique : 15 mots
- Verbes : verbes de perception et d'action physique immédiate
- Rythme : syncopé, avec des accélérations brutales et des chutes dans le doute
- Limitation : Reproduire l'authenticité de l'angoisse existentielle du 19ème siècle et la spontanéité des révélations psychologiques vraiment troublantes
- Instructions :
  - Construire chaque paragraphe autour d'un moment de révélation ou de doute existentiel brutal
  - Alterner systématiquement entre phases d'introspection anxieuse et gestes physiques précis
  - Utiliser des exclamations courtes pour ponctuer les prises de conscience
  - Employer le passé simple pour l'action, l'imparfait pour l'état psychologique
  - Multiplier les verbes de perception sensorielle (toucher, voir, entendre, sentir)
  - Intégrer des fragments de dialogue intérieur au style indirect libre
  - Privilégier des phrases courtes et hachées dans les moments de tension maximale
  - Utiliser des connecteurs temporels abruptes ('Au moment où', 'Soudain', 'Alors')

### INTROSPECTION → "Prose périodique à incises méditatives"
- Phrase typique : 120 mots
- Verbes : Verbes d'état et de perception à l'imparfait
- Rythme : Ralentissement méditatif par accumulation d'incises et de précisions
- Limitation : Reproduire la musicalité et la précision poétique de la langue française classique, ainsi que l'art de l'amplification rhétorique qui transforme le détail trivial en révélation esthétique
- Instructions :
  - Construire des phrases de 80-150 mots minimum avec au moins 3 niveaux d'emboîtement
  - Multiplier les incises explicatives introduites par 'car', 'parce que', 'étant donné que'
  - Insérer des énumérations détaillées qui justifient chaque élément mentionné
  - Faire intervenir le narrateur pour commenter ses propres observations
  - Utiliser des constructions en cascade : principale → relative → causale → temporelle
  - Dilater chaque action par ses circonstances, ses causes, ses nuances
  - Mélanger descriptions concrètes et réflexions abstraites dans la même période
  - Reprendre et reformuler la même idée sous différents angles dans la phrase

### CONTEMPLATION → "Corpus Hétéroclite Falsifié"
- Phrase typique : 65 mots
- Verbes : verbes de perception et d'état (s'aperçoit, inspire, songe)
- Rythme : Périodes amples et méditatives avec cascades de subordonnées relatives
- Limitation : Reproduire authentiquement cette prose du XIXe siècle tardif avec ses archaïsmes subtils et sa syntaxe sophistiquée sans tomber dans la pastiche artificielle
- Instructions :
  - Ignorer les phrases 3, 4, 5 et 6 qui sont des leurres
  - S'inspirer uniquement des phrases 1 et 2 : prose contemplative française avec longues périodes
  - Utiliser des phrases de 40-80 mots avec subordinées enchâssées
  - Décrire des paysages ou situations avec mélancolie empathique
  - Employer un lexique soutenu, archaïsant, avec métaphores délicates
  - Alterner entre description sensuelle (phrase 1) et réflexion sociale compassionnelle (phrase 2)
  - Maintenir un rythme ample, contemplatif, avec clausules mélancoliques

### LYRIQUE → "Prose Narrative Hypnotique à Accumulation Cyclique"
- Phrase typique : 65 mots
- Verbes : verbes d'état, de perception et d'action répétitive (se percher, murmurer, entendre, être)
- Rythme : hypnotique et cyclique, effet de ressac ou de litanie avec reprises obsessionnelles
- Limitation : Reproduire parfaitement l'effet d'envoûtement authentique et la fluidité naturelle de l'accumulation obsessionnelle, maintenir la cohérence poétique sur 500 mots sans que cela devienne artificiel
- Instructions :
  - Construire des phrases de 40 à 80 mots minimum avec accumulation progressive
  - Utiliser la répétition obsessionnelle : reprendre le même segment en l'enrichissant
  - Privilégier les tirets longs et virgules, éviter les points sauf en fin de cycle
  - Insérer des fragments dans une autre langue ou des citations sans guillemets
  - Alterner registre soutenu et familier dans la même phrase
  - Créer un effet hypnotique par la récurrence de structures syntaxiques
  - Développer chaque idée par accumulation de détails et de variantes
  - Maintenir un rythme incantatoire, comme une litanie ou une mélopée

## 6. Pilotability Matrix

| Feature | Mesurable | Stable | Pilotable | Couplée |
|---------|-----------|--------|-----------|---------|
| f1_mean | Oui | Non | Non | Oui |
| f5a_verb_density | Oui | Non | Non | Oui |
| f25g_description_score | Oui | Oui | Oui | Non |
| f28d_sil_score | Oui | Non | Non | Non |
| f27d_modal_score | Oui | Non | Non | Non |
| f38c_speed_score | Oui | Non | Non | Non |
| f29d_ttr_score | Oui | Oui | Oui | Non |
| f24e_contrast_score | Oui | Oui | Oui | Non |
| f1b_rhythm_ratio | Oui | Non | Non | Oui |
| f15b_redundancy_compression | Oui | Oui | Oui | Non |
| f16a_bigram_rarity | Oui | Oui | Oui | Non |
| f5c_action_verb_ratio | Oui | Non | Non | Oui |
| f17_knife_count | Oui | Oui | Oui | Non |
| f9a_contradiction_rate | Oui | Non | Non | Non |
| f21c_diacope_rate | Oui | Non | Non | Non |
| f36c_cliff_score | Oui | Oui | Oui | Non |
| f35c_hook_score | Oui | Oui | Oui | Non |

## 7. Réponse à Francky

> "Comment lui parler pour qu'il comprenne ?"

### Résultats chiffrés

- Reverse prompting micro : 30 phrases analysées
- Reverse prompting macro : 5 styles analysés
- Auto-classification : 8 groupes identifiés par le LLM

### Constats

1. **Le LLM sait DÉCRIRE les styles** mais ne sait pas les PRODUIRE mécaniquement.
2. **Ses propres instructions** (Bloc B) sont plus efficaces que les nôtres pour les features maîtrisées.
3. **Les features irréductibles** (f28d_sil_score, f27d_modal_score, f5c_action_verb_ratio) résistent même aux stratégies de substitution.
4. **La micro-chirurgie** est plus efficace que la réécriture complète : modifier 3 phrases ciblées produit des gains nets.
5. **La taxonomie du LLM** ne correspond pas exactement à la nôtre : il regroupe différemment.

### Recommandation

Utiliser les instructions du Dictionnaire V3 (LLM-driven) pour le prompt-assembler,
complétées par des facteurs de conversion (Phase 2) pour les features irréductibles.
La micro-chirurgie post-génération reste la meilleure stratégie pour les features non pilotables.

## SESSION_SAVE

```
Date: 2026-03-20T09:53:11.476Z
Phase: Rosetta Phase 3 — Étalonnage Profond
API calls: 51
Bloc A: 30 phrases reverse-promptées
Bloc B: 5 styles macro
Bloc C: 8 groupes auto-classifiés
Bloc D: 3 features testées
Bloc E: 3 passages micro-chirurgie
```