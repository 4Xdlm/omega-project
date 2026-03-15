# OMEGA — RETRO-ENGINEERING COGNITIF LLM — RAPPORT R-FINAL

Date : 2026-03-15T14:45:00.130Z
Textes analysés : 6 (Famille A+B) + 2 (Famille C)

## 1. Corpus analysé

| ID | Mots | Famille |
|----|------|---------|
| A1_camus_etranger_climax | 300 | A/B |
| A2_duras_amant_apex | 300 | A/B |
| A3_proust_swann_apex | 300 | A/B |
| A4_camus_peste_climax | 300 | A/B |
| B1_omega_best_1 | 597 | A/B |
| B2_omega_best_2 | 674 | A/B |
| C1_omega_weak_1 | 624 | C |
| C2_omega_weak_2 | 746 | C |

## 2. Matrice de convergence

### Q1 — Format préféré
| Format | Votes | % |
|--------|-------|---|
| (c) paragraphes narratifs | 3 | 50% |
| (b) blocs XML/JSON | 1 | 17% |
| (e) mix | 1 | 17% |
| (a) liste à puces hiérarchisée | 1 | 17% |

### Q2 — Ordre d'ingestion optimal
| Élément | Fréquence top 3 |
|---------|-----------------|
| Style et registre littéraire | 2/6 |
| Perspective narrative (première personne, voix du protagoniste) | 1/6 |
| Contexte situationnel (procès, accusé face au procureur) | 1/6 |
| Registre de langue et style (littéraire français, phrases complexes) | 1/6 |
| Structure syntaxique (phrases longues, répétitions, énumérations) | 1/6 |
| Perspective narrative (mémoire fragmentée, voix adulte évoquant l'enfance) | 1/6 |
| Registre de langue et tonalité (littéraire soutenu, mélancolique) | 1/6 |
| Structure syntaxique complexe | 1/6 |
| Perspective narrative introspective | 1/6 |
| Contexte narratif et point de vue | 1/6 |

### Q3 — Seuil de saturation
- Moyenne : 8.3 contraintes simultanées max
- Min : 6 | Max : 12

Ce qui casse en premier :
- A1_camus_etranger_climax : "La cohérence psychologique du personnage si trop de contraintes stylistiques sont ajoutées"
- A2_duras_amant_apex : "La fluidité des transitions entre les souvenirs et la naturalité du flux de conscience"
- A3_proust_swann_apex : "La naturalité du flux de conscience et l'élégance des transitions entre les évocations"
- A4_camus_peste_climax : "La cohérence du rythme et de la musicalité des phrases sous la pression de trop de contraintes techniques simultanées"
- B1_omega_best_1 : "La fluidité narrative - trop de contraintes techniques feraient perdre l'organicité des dialogues et des gestes"
- B2_omega_best_2 : "La fluidité du style et la justesse psychologique des personnages"

### Q4 — Top contraintes (les plus citées)
| Contrainte | Fréquence |
|------------|-----------|
| Narration à la première personne avec voix détachée et analytique | 1 |
| Contexte de procès avec discours du procureur rapporté | 1 |
| Style littéraire français classique avec phrases longues et nuancées | 1 |
| Psychologie de personnage incapable de regret authentique | 1 |
| Alternance entre discours rapporté et introspection | 1 |
| Phrases très longues avec énumérations et répétitions d'éléments | 1 |
| Répétition obsessionnelle de mots-clés (aucune, photographies, ma mère) | 1 |
| Mélange temporel entre passé colonial et présent de l'écriture | 1 |
| Accumulation de détails concrets dans un flux associatif | 1 |
| Tonalité de nostalgie douloureuse et de perte | 1 |
| Phrases longues avec incises multiples et ponctuation complexe | 1 |
| Évocation sensorielle précise et synesthésique | 1 |
| Perspective introspective à la première personne | 1 |
| Métaphores architecturales et spatiales élaborées | 1 |
| Registre littéraire soutenu avec archaïsmes choisis | 1 |

### Q5 — Contraintes nuisibles
| Type | Source | Pourquoi |
|------|--------|----------|
| Spécification d'émotions explicites | A1_camus_etranger_climax | Contredirait le détachement émotionnel caractéristique du personnage |
| Demande de dialogue direct | A1_camus_etranger_climax | Briserait la structure de monologue intérieur et de discours rapporté |
| Ton dramatique ou pathétique | A1_camus_etranger_climax | Opposerait à la froideur analytique du narrateur |
| Demander un style 'simple et accessible' | A2_duras_amant_apex | Détruirait la complexité syntaxique nécessaire |
| Imposer une structure chronologique claire | A2_duras_amant_apex | Contraire au flux mémoriel associatif |
| Éviter les répétitions | A2_duras_amant_apex | Éliminerait un procédé stylistique central |
| Contraintes de longueur strictes | A3_proust_swann_apex | Briseraient le flux naturel de la pensée proustienne qui suit sa logique interne |
| Simplification syntaxique | A3_proust_swann_apex | Détruirait la complexité caractéristique qui mime les méandres de la conscience |
| Objectivité narrative | A3_proust_swann_apex | Éliminerait la subjectivité essentielle qui donne sa couleur unique au texte |
| Demander d'imiter exactement le style de Camus | A4_camus_peste_climax | Pourrait créer une contrainte de plagiat plutôt qu'une inspiration stylistique |
| Spécifier trop de détails contextuels sur La Peste | A4_camus_peste_climax | Risquerait de reproduire l'œuvre plutôt que de s'en inspirer |
| Imposer des références littérales aux personnages | A4_camus_peste_climax | Limiterait la créativité et pousserait vers la copie |
| Demander explicitement du suspense ou de la tension | B1_omega_best_1 | Produirait des effets forcés - la tension naît de l'implicite et des détails subtils |
| Spécifier des émotions directes | B1_omega_best_1 | Détruirait la sophistication du texte qui fonctionne par suggestion et métaphore |
| Imposer une longueur de paragraphe fixe | B1_omega_best_1 | La variation rythmique entre fragments courts et développements longs est cruciale |
| Spécification excessive de métaphores particulières | B2_omega_best_2 | Rigidifierait l'écriture et nuirait à l'organicité du style |
| Contraintes de longueur trop précises par paragraphe | B2_omega_best_2 | Compromettrait le rythme naturel et la respiration du texte |
| Imposition d'un dénouement explicite | B2_omega_best_2 | Détruirait la subtilité et l'ouverture caractéristiques de cette esthétique |

### Q6 — Implicite vs Explicite
**Doit être explicite :**
- Style littéraire français (2x)
- Perspective première personne (1x)
- Contexte judiciaire (1x)
- Structure syntaxique longue (1x)
- Répétitions lexicales (1x)
- Perspective mémorielle (1x)
- Registre littéraire (1x)
- Structure syntaxique complexe (1x)
- Registre sensoriel (1x)
- Perspective introspective (1x)

**Doit rester implicite :**
- Issue de la confrontation (2x)
- Références à L'Étranger (1x)
- Identité précise du crime (1x)
- Jugement moral sur le personnage (1x)
- Émotion spécifique (1x)
- Références biographiques précises (1x)
- Jugements sur les personnages (1x)
- Mélancolie sous-jacente (1x)
- Nostalgie temporelle (1x)
- Angoisse existentielle (1x)

### Q7 — Exemplar vs Rules
| Préférence | Votes |
|------------|-------|
| both | 6 |
Taille idéale exemplar : 138 mots (moyenne)

### Q8 — Prompts idéaux (extraits)
#### A1_camus_etranger_climax
```
Écris un passage narratif à la première personne où un accusé assiste à son procès. Le narrateur a une voix détachée et analytique, incapable de regret authentique. Il écoute le procureur l'accuser tout en réfléchissant à son incapacité à ressentir des émotions conventionnelles. Style littéraire français classique avec phrases longues et nuancées. Alterne entre le discours du procureur rapporté au style indirect et les réflexions introspectives du narrateur. Le procureur évoque l'absence d'âme chez l'accusé et sa relation avec sa mère. Ton froid mais non hostile, avec une incompréhension mutuelle entre l'accusé et la justice. Le narrateur voudrait expliquer sa nature mais ne peut pas s'exprimer dans ce contexte.
```
Tokens estimés : 145

#### A2_duras_amant_apex
```
Écris un texte en prose littéraire française dans le style de la mémoire involontaire. Utilise des phrases très longues avec énumérations détaillées et répétitions obsessionnelles de mots-clés. Adopte la perspective d'une narratrice adulte évoquant son enfance coloniale avec nostalgie douloureuse. Mélange les temporalités par associations d'idées. Accumule les détails sensoriels concrets (objets, lieux, lumières) dans un flux continu. Répète certains mots comme des leitmotivs (aucune, photographies, ma mère). Maintiens un registre littéraire soutenu. Évoque les thèmes de l'exil, de la famille dysfonctionnelle, des souvenirs fragmentés. Crée un rythme hypnotique par la longueur des phrases et les reprises. Laisse les émotions émerger des détails plutôt que de les nommer directement.
```
Tokens estimés : 145

#### A3_proust_swann_apex
```
Écris dans le style de Proust : phrases longues avec incises multiples séparées par des points-virgules et des tirets. Perspective introspective première personne évoquant des souvenirs de chambres. Entrelace sensations précises (odeurs, couleurs, sons, textures) avec métaphores architecturales. Registre littéraire soutenu, vocabulaire recherché. Syntaxe complexe avec subordinées enchâssées. Évoque l'adaptation progressive à un environnement initialement hostile. Rythme méditatif, pensée qui se déploie organiquement. Personnification des objets (pendule, glace, rideaux). Contraste entre malaise initial et accoutumance finale.
```
Tokens estimés : 95

#### A4_camus_peste_climax
```
Écris un passage littéraire français de style classique. STRUCTURE: Alternance entre descriptions sensorielles détaillées et réflexions philosophiques. Point de vue d'un observateur contemplant une scène depuis une position élevée. STYLE: Phrases longues avec syntaxe élaborée, subordonnées multiples, rythme contemplatif. Registre soutenu mêlant mélancolie et acceptation. PROGRESSION: Commencer par une observation extérieure, développer l'atmosphère sensorielle (ciel, sons, air), puis évoluer vers une réflexion sur la nature humaine et l'acte de témoignage. TONALITÉ: Méditative, avec une dimension de bilan et de conclusion. Intégrer des éléments sensoriels précis (visuels, auditifs, tactiles) dans un cadre urbain nocturne.
```
Tokens estimés : 145

#### B1_omega_best_1
```
Écris une scène de tension conjugale domestique (800 mots). STRUCTURE: Alterne paragraphes développés et mots isolés en fragments (ex: 'Fini.' 'Jamais.'). STYLE: Métaphores géologiques/organiques pour les émotions ('ossature mentale', 'érosion conjugale'). NARRATION: Focalisation interne sur le mari, accès limité aux pensées de l'épouse. TENSION: Implicite, par objets symboliques et gestes révélateurs. REGISTRE: Littéraire soutenu, vocabulaire précis. CADRE: Huis clos cuisine, hiver, fin de journée. PROGRESSION: Montée dramatique vers révélation suggérée sans résolution explicite.
```
Tokens estimés : 95

#### B2_omega_best_2
```
Écris une scène de confrontation conjugale dans une cuisine, style littéraire français contemporain. STRUCTURE: • Tension sous-jacente (soupçon d'infidélité) révélée progressivement • Alternance dialogue minimal/introspection/description sensorielle • Pas de résolution explicite TECHNIQUE: • Focalisation sur Pierre principalement • Ancrage spatial précis (Lyon, janvier, détails domestiques) • Réalisme psychologique des réactions • Registre soutenu sans préciosité ATMOSPHÈRE: • Froideur croissante, distance qui s'installe • Sons d'ambiance (radiateur, circulation) • Gestuelle révélatrice des émotions • Métaphores organiques discrètes DIALOGUE: • Sous-texte fort, non-dits • Répliques courtes et chargées • Progression vers l'évitement de la confrontation directe
```
Tokens estimés : 145

## 3. DIFF : V3 actuel vs LLM idéal

### Sections du prompt V3 actuel
Total : 17 sections

- `v3_attention_contract`
- `narrative_hook`
- `mission`
- `v3_level1_laws`
- `v3_level2_trajectory`
- `v3_level3_decor`
- `style_genome`
- `kill_lists`
- `canon`
- `continuity`
- `seeds`
- `generation`
- `corporeal_anchoring`
- `metaphor_pregeneration`
- `v3_recency_reminder`
- `voice_compliance`
- `final_checklist`

### Analyse croisée Q4 (essentielles) × Q5 (nuisibles) × sections V3

*(Cette section sera enrichie manuellement après lecture des résultats Q4/Q5)*

### Instructions jugées NUISIBLES par le LLM
- Spécification d'émotions explicites
- Demande de dialogue direct
- Ton dramatique ou pathétique
- Demander un style 'simple et accessible'
- Imposer une structure chronologique claire
- Éviter les répétitions
- Contraintes de longueur strictes
- Simplification syntaxique
- Objectivité narrative
- Demander d'imiter exactement le style de Camus
- Spécifier trop de détails contextuels sur La Peste
- Imposer des références littérales aux personnages
- Demander explicitement du suspense ou de la tension
- Spécifier des émotions directes
- Imposer une longueur de paragraphe fixe
- Spécification excessive de métaphores particulières
- Contraintes de longueur trop précises par paragraphe
- Imposition d'un dénouement explicite

### Taille du prompt V3
- Caractères : 61901
- Tokens estimés : 15476

### Taille du prompt idéal LLM
- Tokens moyen demandé : 128
- Ratio V3/idéal : 120.9x

## 4. DIFF : Templates E1/E3 vs LLM idéal

### REF_E1_template.json
- Taille : 1263 chars
- Clés : template_id, template_version, template_hash, type, label, description, target_shapes, annotations, instructions, dominant_rule, expected_axes_gain

### REF_E3_template.json
- Taille : 1141 chars
- Clés : template_id, template_version, template_hash, type, label, description, target_shapes, annotations, instructions, dominant_rule, expected_axes_gain

*(Comparaison manuelle avec Q8 prompts idéaux recommandée)*

## 5. Analyse des contre-exemples (Famille C)

### Défauts les plus cités
- Cohérence narrative - le texte accumule les métaphores sans progression dramatique claire (1x)
- Équilibre stylistique - surcharge métaphorique qui noie l'émotion authentique (1x)
- Clarté de l'enjeu - la tension reste floue, diluée dans un style trop orné (1x)
- Naturel des dialogues - les échanges sonnent artificiels, trop littéraires (1x)
- Cohérence narrative - le texte oscille entre styles sans logique claire (1x)
- Équilibre entre description et action - trop de métaphores tuent l'émotion (1x)
- Authenticité des dialogues - les personnages parlent comme des concepts (1x)
- Progression dramatique claire - la tension se dilue dans les ornements stylistiques (1x)
- Ancrage émotionnel du lecteur - l'excès de poésie crée une distance (1x)

### Diagnostic contraintes
- C1_omega_weak_1 : too_many — Le texte souffre d'un excès de contraintes stylistiques : métaphores obligatoires, recherche systématique de l'effet, phrases courtes artificielles. Ces contraintes multiples créent un style surchargé qui nuit à l'authenticité émotionnelle.
- C2_omega_weak_2 : too_many — Le texte souffre d'un excès de contraintes stylistiques : métaphores forcées, fragments poétiques, images en italique, recherche systématique de l'effet littéraire. Ces contraintes multiples nuisent à la fluidité narrative et à l'authenticité émotionnelle.

### Instructions manquantes identifiées
- **Métaphores incohérentes (minéralisation, cristallisation, ossification)** → Choisir UN seul champ métaphorique et s'y tenir tout au long du texte *(C1_omega_weak_1)*
- **Phrases fragmentaires sans justification ('Du sang.', 'Rien.', 'Impossible.')** → Éviter les phrases d'un mot sauf si elles servent un effet dramatique précis et justifié *(C1_omega_weak_1)*
- **Accumulation d'adjectifs recherchés qui alourdissent** → Privilégier la simplicité : maximum un adjectif qualificatif par nom, éviter les néologismes *(C1_omega_weak_1)*
- **Dialogue artificiel et peu naturel** → Écrire les dialogues comme des gens ordinaires parlent vraiment, tester à voix haute *(C1_omega_weak_1)*
- **Métaphores en italique artificielles** → Intégrez les images poétiques naturellement dans la prose sans marquage typographique *(C2_omega_weak_2)*
- **Fragments isolés sans fonction narrative** → Chaque phrase doit faire avancer l'action ou révéler du caractère *(C2_omega_weak_2)*
- **Surcharge descriptive au détriment de l'émotion** → Limitez-vous à 2-3 détails sensoriels par paragraphe, privilégiez l'impact émotionnel *(C2_omega_weak_2)*
- **Dialogue artificiel et conceptuel** → Écrivez des répliques que des gens ordinaires prononceraient vraiment *(C2_omega_weak_2)*
- **Incohérence tonale** → Maintenez un registre constant adapté à la situation dramatique *(C2_omega_weak_2)*

## 6. RECOMMANDATIONS

### R-Q1 : Restructurer le prompt ?
*(À remplir après analyse des résultats Q1/Q2)*

### R-Q2 : Ajouter des exemplars ?
*(À remplir après analyse Q7)*

### R-Q3 : Changer l'ordre des sections ?
*(À remplir après analyse Q2)*

### R-Q4 : Réduire la densité de contraintes ?
*(À remplir après analyse Q3)*

### R-Q5 : Le compilateur V3 est-il aligné ?
*(À remplir après diff V3/idéal)*

## 7. PROMPT IDÉAL SYNTHÉTIQUE

*(Fusion des Q8 les plus convergents — voir section Q8 ci-dessus)*

Le prompt de référence sera construit à partir des éléments convergents
identifiés dans les Q8 de chaque texte analysé.
