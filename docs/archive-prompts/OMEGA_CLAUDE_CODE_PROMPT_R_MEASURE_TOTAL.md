# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — R-MEASURE-TOTAL
# CAMPAGNE DE MESURE TOTALE — L'ENCYCLOPÉDIE DE LA PHYSIQUE LITTÉRAIRE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-22
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : tag r-fix-3-complete (APRÈS exécution de R-FIX-3)
# Standard     : NASA-Grade L4 — TOUT MESURER, TRIER PAR LA VÉRITÉ
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# PHILOSOPHIE
#
# On ne trie PAS par intuition. On ne sélectionne PAS par envie.
# On MESURE TOUT. Des millions de données. Chaque idée des 3 IAs.
# Puis on laisse les MATHÉMATIQUES dire ce qui tranche et ce qui est du bruit.
#
# Pour CHAQUE mesure : corrélation GB, corrélation intra-auteur, par tier,
# par type dominant, par langue, par époque. Si une mesure ne corrèle avec
# RIEN → elle est du décor. Si elle corrèle avec TOUT → elle est redondante.
# Si elle corrèle UNIQUEMENT avec le tier S → c'est de l'or.
#
# 571 romans. 4 millions de phrases. 400 000 fenêtres.
# ~50 mesures × 6 axes de corrélation × 571 romans = des millions de points.
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# PRÉREQUIS
# ═══════════════════════════════════════════════════════════════════════════════

CE PROMPT NE S'EXÉCUTE QU'APRÈS R-FIX-3 (résidu < 20%, Hurst local calculé,
corrélations partielles faites). Si R-FIX-3 n'est pas terminé → STOP.

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLES
# ═══════════════════════════════════════════════════════════════════════════════

R-01 : NE TOUCHER À RIEN d'existant. Tout est ADDITIF.
R-02 : Chaque mesure calculée sur le corpus ENTIER (571 romans).
R-03 : Chaque mesure corrélée sur 6 AXES (voir ci-dessous).
R-04 : Les résultats NÉGATIFS sont AUSSI importants. Documenter ce qui ne marche PAS.
R-05 : 1911 tests existants doivent PASS.
R-06 : Pas de raccourcis. Si ça prend 1 heure, ça prend 1 heure.

# ═══════════════════════════════════════════════════════════════════════════════
# LES 6 AXES DE CORRÉLATION (pour CHAQUE mesure)
# ═══════════════════════════════════════════════════════════════════════════════

Pour CHAQUE mesure M calculée sur chaque fenêtre de 20 phrases :

```
AXE 1 : Spearman(M, GB_V1)           → corrélation GLOBALE avec la qualité
AXE 2 : Spearman_intra_auteur(M, GB) → corrélation INTRA-AUTEUR (moyenne des corr par auteur)
AXE 3 : mean(M) par tier S/A/B/C/D   → profil par TIER
AXE 4 : Spearman(M, sensation_malaise) → lien avec le MALAISE (le marqueur #1)
AXE 5 : Spearman(M, sensation_ironie)  → lien avec l'IRONIE (le marqueur #2)
AXE 6 : mean(M) par type dominant     → variation selon le TYPE de passage
```

Pour les mesures au niveau ROMAN (pas fenêtre) : AXE 3 seulement.

# ═══════════════════════════════════════════════════════════════════════════════
# FAMILLE 1 — IMPLICATURE (dire vs suggérer)
# ═══════════════════════════════════════════════════════════════════════════════

## M1.1 — Show Don't Tell Index (ratio concret/abstrait dans l'émotion)

```typescript
// TELL_WORDS : triste, tristesse, heureux, bonheur, joie, colère, fureur,
//   furieux, peur, terreur, terrifié, angoisse, honte, culpabilité, amour,
//   haine, jalousie, dégoût, mépris, désespoir, ému, émotion, sentiment,
//   ressenti, éprouvait, ressentait, inquiet, nerveux, anxieux, effrayé
//   EN: sad, sadness, happy, happiness, joy, anger, fear, terror, anguish,
//   shame, guilt, love, hatred, jealousy, disgust, contempt, despair,
//   emotion, feeling, worried, nervous, anxious, frightened
//
// SHOW_WORDS : tremblait, frissonna, sueur, pâlit, rougit, gorge serrée,
//   souffle coupé, haleta, poings serrés, mâchoire crispée, nausée,
//   vertige, chancela, genoux, palpitation, déglutit, sursauta, se figea,
//   se raidit, se crispa, baissa les yeux, serra
//   EN: trembled, shivered, sweat, pale, flushed, throat, gasped, fist,
//   jaw, stomach, nausea, staggered, flinched, froze, stiffened, clenched
//
// M1.1 = show_count / (show_count + tell_count + 1)
```

## M1.2 — Ratio d'Implicature (verbes cinétiques vs évaluation)

```typescript
// KINETIC_VERBS : verbes d'action physique (même liste que le classifieur)
// EVALUATION_ADVERBS : profondément, terriblement, incroyablement, 
//   absolument, totalement, vraiment, extrêmement, parfaitement
//   EN: deeply, terribly, incredibly, absolutely, totally, really, extremely
// EMOTION_ADJECTIVES : même liste que TELL_WORDS
//
// M1.2 = kinetic_count / (eval_adverb_count + emotion_adj_count + 1)
```

## M1.3 — Indice de Retenue

```typescript
// Pour chaque phrase à contenu émotionnel (au moins 1 marqueur de sensation) :
//   count_explicit = TELL_WORDS dans la phrase
//   count_implicit = SHOW_WORDS + silence_markers + negation_markers
//   restraint = 1 - (count_explicit / (count_explicit + count_implicit + 1))
//
// M1.3 = mean(restraint) sur la fenêtre
```

## M1.4 — Densité d'Explication Narrative

```typescript
// EXPLANATION_PATTERNS :
//   "il sentit que", "elle comprit que", "il réalisa que", "c'était parce que",
//   "la raison était", "cela signifiait que", "il sut alors que"
//   EN: "he felt that", "she realized that", "it was because", "the reason was",
//   "this meant that", "he knew then that"
//
// M1.4 = count(EXPLANATION_PATTERNS) / sentence_count
// Plus c'est HAUT, plus le texte sur-explique (LLM typique)
```

## M1.5 — Densité d'Adverbes Évaluatifs

```typescript
// M1.5 = count(EVALUATION_ADVERBS) / word_count
// Le LLM saupoudre des "profondément", "terriblement", "incroyablement"
// Le maître n'en met presque jamais
```

# ═══════════════════════════════════════════════════════════════════════════════
# FAMILLE 2 — IMAGE RÉMANENTE (suggestion psychologique)
# ═══════════════════════════════════════════════════════════════════════════════

## M2.1 — Indice de Suggestion (le concept de Francky)

```typescript
// SUGGESTION_MARKERS :
//   "quelque chose", "une forme", "une ombre", "on aurait dit",
//   "comme un", "comme si", "une sorte de", "il semblait que"
//   EN: "something", "a shape", "a shadow", "as if", "like a",
//   "some kind of", "it seemed"
//
// M2.1 = count(SUGGESTION_MARKERS) / sentence_count
```

## M2.2 — Négation Créatrice (absence qui crée la présence)

```typescript
// CREATIVE_NEGATION :
//   "ne dit rien", "ne bougea pas", "personne ne", "rien ne",
//   "aucun bruit", "pas un mot", "sans un regard", "il ne pleura pas"
//   EN: "said nothing", "didn't move", "no one", "nothing", "not a sound",
//   "not a word", "without a glance", "he didn't cry"
//
// M2.2 = count(CREATIVE_NEGATION) / sentence_count
// La négation crée l'image de ce qui AURAIT PU arriver
```

## M2.3 — Détail Concret Chargé (objet qui code une émotion)

```typescript
// Phrases avec ≥ 1 objet concret (CONCRETE_WORDS) ET 0 mot émotionnel (TELL_WORDS)
// ET dans un contexte chargé (la fenêtre a une sensation > 0.3)
//
// M2.3 = count(concrete_sans_emotion) / sentence_count
// Le maître décrit un objet, le lecteur projette l'émotion
```

## M2.4 — Décalage Registre/Contenu

```typescript
// Pour chaque phrase :
//   content_valence = score sentiment (positif/négatif du contenu)
//   register_formality = longueur moyenne des mots + subordination
// 
// Si content = très négatif (violence, mort) ET register = très formel/calme → décalage
// Si content = très positif ET register = froid/clinique → décalage
//
// M2.4 = abs(content_valence - register_formality_normalized)
// Kafka score HAUT (ton clinique sur absurdité). LLM score BAS (ton aligné au contenu).
```

## M2.5 — Phrases Écourtées (suspension, inachèvement)

```typescript
// Phrases finissant par "...", "…", "—" (pas "." ni "!" ni "?")
// M2.5 = count(écourtées) / sentence_count
```

## M2.6 — Questions sans Réponse

```typescript
// Pour chaque phrase interrogative (finit par ?) :
//   chercher dans les 5 phrases suivantes un connecteur résolutif
//   ("parce que", "car", "c'est que", "la réponse", "because", "the answer")
//   Si aucun → question non résolue
//
// M2.6 = count(unresolved_questions) / question_count
```

## M2.7 — Silence Narratif

```typescript
// SILENCE_MARKERS :
//   "silence", "se tut", "ne dit rien", "un long moment",
//   "immobile", "figé", "rien ne bougeait", "le temps s'arrêta"
//   EN: "silence", "fell silent", "said nothing", "a long moment",
//   "motionless", "frozen", "nothing moved", "time stopped"
//
// M2.7 = count(SILENCE_MARKERS) / sentence_count
```

## M2.8 — Indice de Rémanence COMPOSITE

```typescript
// M2.8 = (M2.1 + M2.2 + M2.3 + M2.5 + M2.6 + M2.7) / 6
// - M2.4 (décalage registre) est gardé séparé car il mesure autre chose
// Cet indice composite capture la PROJECTION psychologique
```

# ═══════════════════════════════════════════════════════════════════════════════
# FAMILLE 3 — IRRÉVERSIBILITÉ ET DETTE
# ═══════════════════════════════════════════════════════════════════════════════

## M3.1 — Irréversibilité (changements d'état jamais annulés)

```typescript
// Pour chaque fenêtre :
//   1. Identifier les CHANGEMENTS D'ÉTAT :
//      - verbe d'accomplissement (obtint, mourut, quitta, perdit, trouva, etc.)
//      - verbe de destruction (brisa, détruisit, tua, anéantit)
//      - verbe de transformation (devint, se transforma, changea)
//   2. Vérifier dans les 10 phrases suivantes si le changement est ANNULÉ
//      (retour au même état, réparation, résurrection)
//   3. irreversible_count = changements jamais annulés
//   
// M3.1 = irreversible_count / sentence_count
```

## M3.2 — Dette d'Information (éléments non résolus)

```typescript
// Pour chaque fenêtre :
//   unresolved_questions = M2.6 (déjà calculé)
//   delayed_referents = pronoms sans antécédent clair dans les 3 phrases précédentes
//   open_causal_chains = "car" ou "parce que" sans suite logique fermée
//   unresolved_contradictions = assertion A puis assertion non-A sans résolution
//
// M3.2 = (unresolved_questions + delayed_referents + open_causal_chains) / sentence_count
```

## M3.3 — Arc de Tension (distance setup → payoff)

```typescript
// SETUP_MARKERS : ?, "soudain", "tout à coup", "alors", "mais", négation forte
// PAYOFF_MARKERS : "enfin", "donc", "ainsi", "c'est pourquoi", reprise référent
//
// Pour chaque setup en position N :
//   K = position du premier payoff après N (max 20)
//   Si aucun payoff → K = Infinity (setup non résolu)
//
// M3.3a = mean(K) pour les setups résolus (patience narrative)
// M3.3b = count(K=Infinity) / count(setups) (ratio de setups non résolus)
```

## M3.4 — Compression Causale

```typescript
// STATE_CHANGE_VERBS : obtint, quitta, mourut, devint, perdit, gagna, trouva, apprit
// CAUSAL_LINKS : car, donc, parce que, si bien que, c'est pourquoi, because, therefore
// WORDS_IN_WINDOW : nb total de mots
//
// M3.4 = (state_change_count × causal_link_count) / words_in_window
// Narration qui AVANCE = haute compression. Narration qui MEUBLE = basse.
```

## M3.5 — Densité Utile

```typescript
// Pour chaque phrase, déterminer si elle MODIFIE quelque chose :
//   - Changement d'état (M3.1)
//   - Information nouvelle (mot rare non vu dans les 5 phrases précédentes)
//   - Progression causale (connecteur causal)
//   - Changement de sensation (shift > 0.1 par rapport à la phrase précédente)
//   
//   Si aucun de ces 4 → phrase INERTE
//
// M3.5 = 1 - (inert_count / sentence_count)
```

# ═══════════════════════════════════════════════════════════════════════════════
# FAMILLE 4 — DISSONANCE ET CONTRADICTION
# ═══════════════════════════════════════════════════════════════════════════════

## M4.1 — Dissonance Structure/Sensation

```typescript
// structure_vector = [pct_dialogue, pct_action, pct_description, pct_introspection, pct_narration]
// sensation_vector = [tension, oppression, vertige, fascination, ..., recueillement]
// (normaliser les deux en vecteurs unitaires)
//
// M4.1 = 1 - cosine_similarity(structure_vector, sensation_expected_for_type)
//
// sensation_expected_for_type :
//   action dominant → on s'attend à propulsion/violence
//   description dominant → on s'attend à apaisement/fascination
//   introspection dominant → on s'attend à recueillement/vertige
//   dialogue dominant → on s'attend à tension
//   narration dominant → on s'attend à neutre
//
// Si la sensation RÉELLE est différente de l'attendue → dissonance fertile
```

## M4.2 — Dissonance Sémantico-Syntaxique (Gemini)

```typescript
// Pour chaque phrase :
//   content_valence = somme des valences des mots (positif/négatif)
//   rhythmic_smoothness = 1 / (1 + variance des longueurs de mots dans la phrase)
//
// M4.2 = abs(content_valence_normalized - rhythmic_smoothness)
// Contenu atroce + rythme doux = dissonance (Kafka, McCarthy berceuse de l'horreur)
// Contenu joyeux + rythme haché = dissonance inverse
```

## M4.3 — Contradiction Locale (assertion + contre-assertion)

```typescript
// ADVERSATIFS : mais, cependant, pourtant, néanmoins, toutefois, or, 
//   malgré, en dépit de, bien que, but, however, yet, nevertheless, despite
//
// M4.3 = count(ADVERSATIFS) / sentence_count
// Pas nouveau (c'est f9a_contradiction_rate du GB) mais on le CORRÈLE avec les 6 axes
```

## M4.4 — Menace sans Événement

```typescript
// MENACE_IMPLICITE :
//   - mot de danger SANS verbe d'action dans la même phrase
//     ("couteau", "ombre", "pas", "bruit" sans "frappa", "courut", etc.)
//   - verbe de perception + complément menaçant sans suite
//     ("il entendit un bruit", "elle vit une forme")
//   - conditionnel menaçant ("il aurait pu", "rien ne l'empêchait de")
//
// DANGER_WORDS : couteau, arme, sang, ombre, bruit, pas, silhouette, 
//   inconnu, étranger, nuit, knife, weapon, blood, shadow, noise, 
//   footstep, figure, stranger, darkness
//
// M4.4 = count(danger_sans_action) / sentence_count
```

# ═══════════════════════════════════════════════════════════════════════════════
# FAMILLE 5 — TRAJECTOIRE ET DYNAMIQUE
# ═══════════════════════════════════════════════════════════════════════════════

## M5.1 — Saut Sémantique (distance lexicale phrase à phrase)

```typescript
// Pour chaque paire (P_n, P_{n+1}) :
//   content_n = mots de contenu (>4 lettres, pas stop words)
//   content_n1 = mots de contenu de la phrase suivante
//   overlap = |intersection| / |union|
//   distance = 1 - overlap
//
// M5.1a = mean(distance) — saut moyen
// M5.1b = std(distance) — variance des sauts
// M5.1c = max(distance) — plus grand saut
```

## M5.2 — Taux de Switch Typologique

```typescript
// M5.2 = count(type_i ≠ type_{i+1}) / (n-1)
```

## M5.3 — Dwell Time par Type

```typescript
// Pour chaque type : longueur moyenne des runs consécutifs
// M5.3_dialogue, M5.3_action, M5.3_description, M5.3_introspection, M5.3_narration
```

## M5.4 — Accélération des Blocs

```typescript
// block_lengths = [longueur du 1er bloc, 2e bloc, 3e bloc, ...]
// M5.4 = pente de la régression linéaire sur block_lengths
// Négatif = blocs qui raccourcissent = tension montante
// Positif = blocs qui s'allongent = relâchement
```

## M5.5 — Transition Méritée (earned shift)

```typescript
// Pour chaque point où la sensation dominante change :
//   causal_density_before = count(connecteurs causaux) dans les 5 phrases avant
//   tension_gradient_before = pente de la sensation "tension" dans les 5 phrases avant
//
// M5.5 = mean(causal_density_before × tension_gradient_before) sur tous les shifts
// Haut = transitions préparées. Bas = transitions gratuites (LLM typique).
```

## M5.6 — Friction de Transition (ChatGPT)

```typescript
// Pour chaque paire (phrase_i, phrase_{i+1}) :
//   d_type = distance entre vecteurs de type
//   d_rhythm = abs(len(phrase_i) - len(phrase_{i+1})) / max(len_i, len_{i+1})
//   d_semantic = saut sémantique (M5.1)
//
// friction = d_type + d_rhythm + d_semantic
// M5.6a = mean(friction)
// M5.6b = std(friction)
// M5.6c = max(friction)
```

## M5.7 — Courbure de Trajectoire

```typescript
// Chaque sous-fenêtre de 5 phrases = point dans R⁵ (les 5 types)
// La trajectoire = courbe dans cet espace
// M5.7a = longueur totale de la trajectoire
// M5.7b = tortiosité = longueur / distance(début, fin)
// M5.7c = angle moyen entre segments consécutifs
```

## M5.8 — Trigrams de Transition

```typescript
// Encoder la séquence : D=dialogue, A=action, E=description, I=introspection, N=narration
// Top 10 trigrams pour chaque tier S/A/B/C/D
// M5.8 = document les patterns, pas un score unique
```

## M5.9 — Entropie de Bigrams

```typescript
// Calculer la distribution des bigrams (DN, ND, NA, AN, etc.)
// M5.9 = entropie de Shannon de cette distribution
// Haut = transitions variées. Bas = transitions répétitives.
```

# ═══════════════════════════════════════════════════════════════════════════════
# FAMILLE 6 — SIGNAL ET RYTHME
# ═══════════════════════════════════════════════════════════════════════════════

## M6.1 — Hurst Local Variance (déjà calculé dans R-FIX-3)

```typescript
// M6.1 = H_std (écart-type du Hurst calculé sur fenêtres de 50 phrases)
```

## M6.2 — Hurst Drops (chutes brutales de structure)

```typescript
// M6.2 = count(H_{i+1} - H_i < -0.05) / n_windows_hurst
```

## M6.3 — Rugosité Phonologique

```typescript
// HARD_CONSONANTS = /[ktpqgdb]/gi
// SOFT_CONSONANTS = /[lmnsfvjz]/gi
// M6.3 = count(hard) / (count(hard) + count(soft))
```

## M6.4 — Autocorrélation Lag 1-5

```typescript
// Série des longueurs de phrases [L1, L2, ...]
// M6.4_lag1 = corr(L_t, L_{t+1})
// M6.4_lag2 = corr(L_t, L_{t+2})
// ... jusqu'à lag 5
```

## M6.5 — Régularité Rythmique (coefficient de variation)

```typescript
// M6.5 = std(longueurs_phrases) / mean(longueurs_phrases)
// Haut = rythme très variable. Bas = rythme régulier.
```

# ═══════════════════════════════════════════════════════════════════════════════
# FAMILLE 7 — POLYPHONIE ET VOIX
# ═══════════════════════════════════════════════════════════════════════════════

## M7.1 — Indice de Polyphonie (distance entre locuteurs)

```typescript
// Pour chaque roman avec > 10% dialogue :
//   extraire les segments de dialogue
//   regrouper par locuteur (alternance ou attribution)
//   pour chaque paire de locuteurs :
//     calculer features (f1_mean, f29d_ttr, subordination) par locuteur
//     distance = 1 - cosine_similarity(features_A, features_B)
//
// M7.1 = mean(distance) sur toutes les paires
// Haut = voix distinctes (maître). Bas = ventriloque (LLM).
```

## M7.2 — TTR Dialogue vs TTR Narration

```typescript
// Séparer le texte en blocs dialogue vs blocs non-dialogue
// M7.2 = TTR_dialogue / TTR_narration
// Si ≈ 1 → même vocabulaire partout (LLM ventriloque)
// Si ≠ 1 → vocabulaire différent selon le mode (maître)
```

## M7.3 — Longueur Moyenne des Répliques

```typescript
// M7.3 = mean(longueur en mots des segments entre tirets/guillemets)
// Le maître varie la longueur des répliques. Le LLM les uniformise.
// M7.3b = std(longueur_répliques) — la variance est plus intéressante que la moyenne
```

# ═══════════════════════════════════════════════════════════════════════════════
# FAMILLE 8 — SURFACE ET ARTISANAT
# ═══════════════════════════════════════════════════════════════════════════════

## M8.1 — Spécificité Lexicale

```typescript
// Construire un dictionnaire IDF sur le corpus entier :
//   IDF(mot) = -log(nb_romans_contenant_mot / nb_romans_total)
// Pour chaque fenêtre :
//   M8.1a = mean(IDF des mots de contenu) — spécificité moyenne
//   M8.1b = std(IDF des mots de contenu) — VARIANCE de spécificité
// Le maître va aux extrêmes (mots très rares + mots très communs)
// Le LLM reste au milieu
```

## M8.2 — Gradient Concret/Abstrait

```typescript
// CONCRETE_WORDS : main, porte, table, pierre, sang, eau, terre, visage...
// ABSTRACT_WORDS : âme, esprit, pensée, vérité, destin, liberté, temps, mort...
// Pour chaque phrase : concreteness = concrete / (concrete + abstract + 1)
// M8.2a = pente (gradient) de la série de concreteness sur la fenêtre
// M8.2b = std de la série (oscillation)
```

## M8.3 — Première vs Dernière Phrase

```typescript
// Calculer les 42 features GB sur la PREMIÈRE phrase de la fenêtre
// Calculer les 42 features GB sur la DERNIÈRE phrase
// M8.3a = GB(première) — qualité du hook
// M8.3b = GB(dernière) — qualité de l'aftertaste
// M8.3c = GB(dernière) - GB(première) — arc (positif = crescendo)
```

## M8.4 — Anti-Pattern (absence comme signature)

```typescript
// Pour chaque fenêtre, identifier le type dominant puis mesurer
// les marqueurs HABITUELLEMENT associés qui sont ABSENTS :
//
// M8.4a = action_dominant AND short_sentence_rate < 0.2 → action lente
// M8.4b = dialogue_dominant AND speech_verb_count < 2 → dialogue pur
// M8.4c = description_dominant AND adjective_rate < 0.03 → description sobre
// M8.4d = introspection_dominant AND first_person < 3 → introspection distanciée
// M8.4e = violence_words > 3 AND sensory_words < 2 → violence sèche
//
// M8.4 = count(antipatterns_detected) / 5
```

## M8.5 — Richesse Intra-Phrase

```typescript
// Pour chaque phrase :
//   active_dimensions = count(types avec score > 0.1 dans le profileur probabiliste)
// M8.5a = mean(active_dimensions) — richesse moyenne
// M8.5b = count(active_dimensions >= 3) / sentence_count — taux poly-type
```

## M8.6 — Densité de Clichés

```typescript
// CLICHES : "cœur brisé", "larmes de joie", "sang glacé", "souffle coupé",
//   "un lourd silence", "le temps s'arrêta", "son sang ne fit qu'un tour",
//   "broken heart", "tears of joy", "heavy silence", "time stood still"
//
// M8.6 = count(CLICHES) / sentence_count
// Le LLM SURPOPULE les clichés. Le maître les évite ou les subvertit.
```

# ═══════════════════════════════════════════════════════════════════════════════
# FAMILLE 9 — SENSATION (déjà calculée, enrichir)
# ═══════════════════════════════════════════════════════════════════════════════

## M9.1-M9.12 — Les 12 sensations (déjà dans SENSATION_ANALYSIS.json)

Reprendre les 12 scores existants et les intégrer dans la matrice de corrélation.

## M9.13 — Aftertaste (sensation des 3 dernières phrases)

```typescript
// M9.13 = vecteur de sensation calculé UNIQUEMENT sur les 3 dernières phrases de la fenêtre
// Le dominant de l'aftertaste est-il le même que celui de la fenêtre entière ?
// M9.13_shift = distance(sensation_fenêtre, sensation_3_dernières)
```

## M9.14 — Pureté de Sensation

```typescript
// M9.14 = 1 - entropie_normalisée(sensation_vector)
// 0 = sensation brouillée. 1 = sensation pure et nette.
```

## M9.15 — Shift de Sensation (1ère moitié vs 2e moitié)

```typescript
// sensation_half1 = sensations sur les phrases 1-10
// sensation_half2 = sensations sur les phrases 11-20
// M9.15 = distance(sensation_half1, sensation_half2)
// Haut = la scène ÉVOLUE. Bas = la scène est STATIQUE.
```

## M9.16 — Valence

```typescript
// M9.16 = (apaisement + fascination + recueillement) - (violence + oppression + malaise)
```

## M9.17 — Arousal

```typescript
// M9.17 = (tension + propulsion + violence) - (apaisement + recueillement + mélancolie)
```

# ═══════════════════════════════════════════════════════════════════════════════
# EXÉCUTION — LA MACHINE DE MESURE
# ═══════════════════════════════════════════════════════════════════════════════

## Script principal

Créer : scripts/r-measure-total.ts

Ce script DOIT :

1. Pour CHAQUE fichier .txt du corpus :
   a. Lire et préparer le texte (skip Gutenberg)
   b. Découper en fenêtres de 20 phrases
   c. Pour CHAQUE fenêtre, calculer les ~55 mesures (M1.1 à M9.17)
   d. Calculer le GB V1 de la fenêtre
   e. Calculer les sensations de la fenêtre
   f. Stocker TOUT dans un tableau

2. Après le scan complet :
   a. Pour CHAQUE mesure, calculer les 6 AXES de corrélation
   b. Produire la MATRICE COMPLÈTE

## Format de sortie

```json
{
  "date": "2026-03-22",
  "corpus_size": 571,
  "total_windows": 400000,
  "measures": {
    "M1.1_show_dont_tell": {
      "global_mean": 0.xxx,
      "global_std": 0.xxx,
      "axe1_corr_gb": 0.xxx,
      "axe2_corr_intra_author": 0.xxx,
      "axe3_by_tier": { "S": 0.xxx, "A": 0.xxx, "B": 0.xxx, "C": 0.xxx, "D": 0.xxx },
      "axe4_corr_malaise": 0.xxx,
      "axe5_corr_ironie": 0.xxx,
      "axe6_by_type": { "dialogue": 0.xxx, "action": 0.xxx, ... }
    },
    // ... pour chaque mesure
  },
  "rankings": {
    "by_gb_correlation": ["M2.4_decalage", "M1.1_show_dont_tell", ...],
    "by_intra_author": [...],
    "by_tier_separation": [...],
    "by_malaise_correlation": [...],
    "by_ironie_correlation": [...]
  }
}
```

## Le TABLEAU FINAL (le trésor)

```
═══════════════════════════════════════════════════════════════════════════════
  R-MEASURE-TOTAL — MATRICE COMPLÈTE DES 55 MESURES × 6 AXES
═══════════════════════════════════════════════════════════════════════════════
  MESURE                        GB     INTRA  S_MEAN D_MEAN  MALAISE  IRONIE
  ──────────────────────────────────────────────────────────────────────────
  M1.1 Show Don't Tell         +0.xx  +0.xx  0.xx   0.xx    +0.xx    +0.xx
  M1.2 Ratio Implicature       +0.xx  +0.xx  0.xx   0.xx    +0.xx    +0.xx
  M1.3 Retenue                 +0.xx  +0.xx  0.xx   0.xx    +0.xx    +0.xx
  ...
  M9.17 Arousal                +0.xx  +0.xx  0.xx   0.xx    +0.xx    +0.xx
═══════════════════════════════════════════════════════════════════════════════

  TOP 10 par corrélation GB :        [classement]
  TOP 10 par corrélation INTRA-AUTEUR : [classement]
  TOP 10 par séparation S vs D :     [classement]
  
  REDONDANCES (corr > 0.8 entre mesures) : [paires]
  MESURES NULLES (corr < 0.05 sur TOUS les axes) : [liste]
═══════════════════════════════════════════════════════════════════════════════
```

## Livrables

| Fichier | Contenu |
|---------|---------|
| data/R_MEASURE_TOTAL.json | Les 55 mesures × 6 axes (le trésor) |
| data/R_MEASURE_RANKINGS.json | Classements par axe |
| data/R_MEASURE_REDUNDANCIES.json | Paires de mesures corrélées > 0.8 |
| data/R_MEASURE_NULLS.json | Mesures qui ne corrèlent avec rien |
| docs/R_MEASURE_TOTAL_REPORT.md | Rapport complet avec verdicts |

## Commit

```bash
git add -A
git commit -m "feat(R-MEASURE-TOTAL): 55 measures × 6 axes × 571 novels

9 families: Implicature, Remanence, Irreversibility, Dissonance,
Trajectory, Signal, Polyphony, Surface, Sensation
~55 measures computed on ~400K windows
Each measure correlated on 6 axes (GB, intra-author, tier, malaise, ironie, type)

TOP by GB: [list top 5]
TOP by intra-author: [list top 5]
TOP by S-vs-D separation: [list top 5]
NULL measures (no correlation): [count]
REDUNDANT pairs (>0.8): [count]

1911 tests PASS, 0 regressions"
git tag r-measure-total-complete
```

## CRITÈRES DE SORTIE (TOUS OBLIGATOIRES)

- [ ] ~55 mesures calculées sur le corpus entier
- [ ] 6 axes de corrélation pour chaque mesure
- [ ] Classements par axe (GB, intra-auteur, tier, malaise, ironie)
- [ ] Redondances identifiées (paires > 0.8)
- [ ] Mesures nulles identifiées (toutes corr < 0.05)
- [ ] Les 8 proses LLM mesurées avec les 55 mesures
- [ ] Rapport R_MEASURE_TOTAL_REPORT.md
- [ ] 1911 tests PASS
- [ ] Commit + tag r-measure-total-complete

# ═══════════════════════════════════════════════════════════════════════════════
# FIN — "On ne trie pas par envie. On trie par la vérité."
# ═══════════════════════════════════════════════════════════════════════════════
#
# 55 mesures. 6 axes. 571 romans. 400 000 fenêtres. Des millions de points.
# Chaque mesure sera jugée par les MATHÉMATIQUES, pas par l'intuition.
# Ce qui corrèle RESTERA. Ce qui ne corrèle pas DISPARAÎTRA.
# C'est la sélection naturelle des métriques.
#
# ═══════════════════════════════════════════════════════════════════════════════
