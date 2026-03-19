# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — AUDIT D'INTÉGRATION GLOBALE
# Matrice de doublons : Existant OMEGA vs Nouveau R6/Rosetta
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date     : 2026-03-19
# Auteur   : Claude (IA Principal) — scan du repo complet
# Pour     : ChatGPT + Gemini + Francky
# ═══════════════════════════════════════════════════════════════════════════════

---

# RÉSUMÉ DE L'AUDIT

Le repo OMEGA contient **50+ packages**. 5 d'entre eux ont des fonctions
qui CHEVAUCHENT ce que le module R6/Rosetta veut faire.

Le risque principal : le package `style-emergence-engine` (Phase C.3)
fait DÉJÀ de l'analyse stylistique avec cadence, lexical, syntactic,
density, genre detection, IA detection, et banalité. Il a son propre
pipeline E0→E6 avec profiling et déviation par rapport au genome.

---

# MATRICE COMPLÈTE : FONCTION PAR FONCTION

## A. ANALYSE RYTHMIQUE / CADENCE

| Fonction | Module existant | Module R6 | Verdict |
|----------|----------------|-----------|---------|
| Longueur moyenne de phrase (f1_mean) | `style-emergence-engine/cadence-analyzer.ts` → avg_sentence_length | `scoring/text-features.ts` → computeF1Basic() | **DOUBLON CONFIRMÉ** |
| Écart-type longueur phrases | `cadence-analyzer.ts` → sentence_length_stddev | `text-features.ts` → f1_stdev | **DOUBLON CONFIRMÉ** |
| Coefficient de variation (CV) | `cadence-analyzer.ts` → coefficient_of_variation | `text-features.ts` → f1a_rhythm_variance | **DOUBLON CONFIRMÉ** |
| Ratio phrases courtes/longues | `cadence-analyzer.ts` → short_ratio / long_ratio | `text-features.ts` → (pas directement) | Partiel |
| Score de rythme composite | `sovereign-engine/oracle/axes/rhythm.ts` → scoreRhythm() | `text-features.ts` → f1_mean + f1a + f1b | **DOUBLON PARTIEL** |

### Lequel est meilleur ?

| Critère | style-emergence-engine | R6 text-features | sovereign-engine rhythm |
|---------|----------------------|-------------------|------------------------|
| Calibration corpus | ❌ Non calibré sur corpus | ✅ Calibré R1 (181 œuvres) | ⚠️ Calibré Phase W (bench 600w) |
| Confiance empirique | ❌ Inconnue | ✅ CV mesuré, confiance 0.512 @600w | ⚠️ Pas de CV empirique |
| Richesse de l'analyse | ✅ CV + short/long ratio | ⚠️ mean + stdev + variance | ✅ CV + range + monotony + opening + breathing |
| Français natif | ❌ EN seulement (COMMON_WORDS en anglais) | ✅ FR + EN + ES | ✅ FR calibré |

**VERDICT : Le rhythm de sovereign-engine est le plus riche. Le text-features R6 est le mieux calibré. Le cadence-analyzer de style-emergence-engine est redondant et inférieur aux deux.**

**DÉCISION : Réutiliser text-features R6 (calibré) + interfacer avec sovereign-engine rhythm pour les métriques supplémentaires (monotony, opening, breathing). NE PAS utiliser style-emergence-engine/cadence-analyzer.**

---

## B. ANALYSE LEXICALE / TTR

| Fonction | Module existant | Module R6 | Verdict |
|----------|----------------|-----------|---------|
| Type-Token Ratio (TTR) | `style-emergence-engine/lexical-analyzer.ts` → ttr | `scoring/text-features.ts` → f29a_ttr_global, f29b_ttr_window | **DOUBLON CONFIRMÉ** |
| Hapax ratio | `lexical-analyzer.ts` → hapax_ratio | `text-features.ts` → f24a_hapax_unique | **DOUBLON CONFIRMÉ** |
| Richesse lexicale composite | `lexical-analyzer.ts` → rare_word_ratio | `text-features.ts` → f16a_bigram_rarity, f16c_lexical_surprise | **DOUBLON PARTIEL** |

### Lequel est meilleur ?

| Critère | style-emergence-engine | R6 text-features |
|---------|----------------------|-------------------|
| Calibration corpus | ❌ | ✅ Confiance 0.941 (f29b), 0.971 (f16a) |
| TTR windowed (robuste aux longueurs) | ❌ TTR global seulement | ✅ TTR windowed 100w |
| Stopwords FR | ❌ EN seulement | ✅ FR + EN + ES |
| Bigram rarity | ❌ | ✅ f16a_bigram_rarity |

**VERDICT : R6 text-features est supérieur sur tous les axes. Le lexical-analyzer de style-emergence-engine est redondant et monolingue anglais.**

**DÉCISION : Réutiliser text-features R6. NE PAS utiliser style-emergence-engine/lexical-analyzer.**

---

## C. ANALYSE SYNTAXIQUE

| Fonction | Module existant | Module R6 | Verdict |
|----------|----------------|-----------|---------|
| Classification phrases (SVO, fragment, question...) | `style-emergence-engine/syntactic-analyzer.ts` → 9 types | `text-features.ts` → f26c_period_score (partiel) | **PAS DE DOUBLON complet** |
| Diversité syntaxique | `syntactic-analyzer.ts` → structure_diversity | ❌ Pas dans R6 | **UNIQUE à style-emergence** |
| Subordination depth | ❌ (style-emergence ne le fait pas) | `text-features.ts` → f22a_subordination_depth (OFF car confiance 0) | Aucun n'est bon |

### Lequel est meilleur ?

| Critère | style-emergence-engine | R6 text-features |
|---------|----------------------|-------------------|
| Classification syntaxique | ✅ 9 structures | ❌ Absent |
| Calibration | ❌ | N/A |
| Langue | ❌ EN only (imperative verbs, subordinate markers EN) | ✅ FR + EN |

**VERDICT : L'analyseur syntaxique de style-emergence est UNIQUE (classification en 9 structures) mais EN-only. Il n'y a pas de doublon car R6 ne fait pas cette analyse.**

**DÉCISION : CONSERVER style-emergence-engine/syntactic-analyzer comme candidat d'extension future (multilingue). Pas de conflit avec R6.**

---

## D. ANALYSE DE DENSITÉ / TYPE DE PASSAGE

| Fonction | Module existant | Module R6 | Verdict |
|----------|----------------|-----------|---------|
| Ratio dialogue | `style-emergence-engine/density-analyzer.ts` → dialogue_ratio | `scoring/passage-type-detector.ts` → computeDialogueMarkerRatio() | **DOUBLON CONFIRMÉ** |
| Densité description | `density-analyzer.ts` → description_density | `text-features.ts` → f25g_description_score | **DOUBLON CONFIRMÉ** |
| Densité action | `density-analyzer.ts` → action_density | `passage-type-detector.ts` → ACTION detection | **DOUBLON PARTIEL** |
| Densité introspection | `density-analyzer.ts` → introspection_density | `passage-type-detector.ts` → INTROSPECTION detection | **DOUBLON PARTIEL** |

### Lequel est meilleur ?

| Critère | style-emergence-engine | R6 |
|---------|----------------------|-----|
| Input requis | ProseParagraph (structuré avec sensory_anchors, rhetorical_devices) | Texte brut (string) |
| Dialogue detection | Guillemets anglais "" seulement | Guillemets FR «» + tirets — + EN "" |
| Calibration | ❌ Pas calibré corpus | ✅ Calibré R2 (181 œuvres, 9141 fenêtres) |
| Typologie probabiliste | ❌ Ratios bruts | ⚠️ Binaire mais en route vers probabiliste |

**VERDICT : Le density-analyzer nécessite des ProseParagraph structurés (dépendance au Scribe) tandis que R6 travaille sur du texte brut. R6 est plus universel et calibré. Mais style-emergence a l'avantage de la granularité par paragraphe.**

**DÉCISION : R6 passage-type-detector comme base du PROFILEUR. Réutiliser les concepts de density-analyzer (granularité par paragraphe) comme extension future.**

---

## E. DÉTECTION DE GENRE

| Fonction | Module existant | Module R6 | Verdict |
|----------|----------------|-----------|---------|
| Détection de genre littéraire | `style-emergence-engine/genre-detector.ts` → genre_scores | ❌ Absent dans R6 | **UNIQUE à style-emergence** |

**VERDICT : Pas de doublon. Le genre-detector est différent du type-detector (genre = thriller/SF/romance vs type = action/description/introspection). Potentiellement utile pour les profils utilisateur.**

**DÉCISION : CONSERVER comme candidat d'extension (Phase S profils).**

---

## F. DÉVIATION PAR RAPPORT AU GENOME

| Fonction | Module existant | Module R6 | Verdict |
|----------|----------------|-----------|---------|
| Écart style_genome visé vs produit | `style-emergence-engine/style-profiler.ts` → GenomeDeviation | Concept du PROFILEUR (alignment_score) | **MÊME CONCEPT, IMPLÉMENTATIONS DIFFÉRENTES** |
| Cibles : sentence_length, burstiness, TTR, dialogue_ratio, description_density | `style-profiler.ts` | Le PROFILEUR comparera la composition produite vs l'archétype visé | **CHEVAUCHEMENT FONCTIONNEL** |

### Lequel est meilleur ?

| Critère | style-emergence-engine | R6 PROFILEUR (futur) |
|---------|----------------------|-----------------------|
| Cibles disponibles | 5 métriques (burstiness, TTR, sentence_length, dialogue, description) | 49 features × composition probabiliste |
| Calibration | ❌ Pas calibré corpus | ✅ Calibré R1-R3 |
| Input | Nécessite StyleGenomeInput (genesis-planner) | Réutilise ForgePacket.style_genome existant |
| Sortie | GenomeDeviation (scalaire) | ProseProfile (vecteur probabiliste + alignment) |

**VERDICT : Le style-profiler de style-emergence fait déjà une mesure de déviation, MAIS avec seulement 5 métriques non calibrées. Le PROFILEUR R6 sera beaucoup plus riche (49 features, calibré, probabiliste). Cependant, le CONCEPT est le même : comparer l'intention et la production.**

**DÉCISION : Le PROFILEUR REMPLACE le style-profiler de style-emergence. Mais le PROFILEUR doit lire le style_genome du ForgePacket pour ses cibles (réutilisation de l'intention existante, pas redéfinition).**

---

## G. MOTEUR ÉMOTIONNEL (PAS DE DOUBLON)

| Fonction | Module existant | Module R6 | Verdict |
|----------|----------------|-----------|---------|
| Tension 14D | `sovereign-engine/oracle/axes/tension-14d.ts` | ❌ Absent dans R6 | **PAS DE DOUBLON** |
| Emotion coherence | `sovereign-engine/oracle/axes/emotion-coherence.ts` | ❌ | **PAS DE DOUBLON** |
| Interiority (LLM judge) | `sovereign-engine/oracle/axes/interiority.ts` | ❌ | **PAS DE DOUBLON** |
| Impact (LLM judge) | `sovereign-engine/oracle/llm-judge.ts` | ❌ | **PAS DE DOUBLON** |
| Damage Gate | `sovereign-engine/damage-gate.ts` | ❌ | **PAS DE DOUBLON** |

**VERDICT : Le moteur émotionnel OMEGA est INTACT et SANS DOUBLON avec R6. Le R6 mesure le style, OMEGA mesure l'émotion. Deux plans différents, exactement comme Francky l'exige.**

---

# MATRICE DE DÉCISION FINALE (ChatGPT format A/B/C)

| Fonction | Source existante | Catégorie | Décision |
|----------|-----------------|-----------|----------|
| Calibration stylistique corpus | omega-autopsie | **A** (réutiliser) | Source de vérité pour baselines |
| ADN style/émotion | packages/genome | **A** (réutiliser) | extractEmotionAxis, StyleAxis, etc. |
| Validation input | packages/mycelium | **A** (réutiliser) | Guardian d'entrée |
| Archétype de scène | sovereign-engine/engine.ts | **A** (réutiliser) | deriveArchetypeFromPacket() |
| Style genome (cibles) | ForgePacket.style_genome | **A** (réutiliser) | Cibles pour le PROFILEUR |
| Rythme/cadence | sovereign-engine/rhythm.ts | **A** (réutiliser) | Plus riche que les alternatives |
| Features F24-F38 | scoring/text-features.ts (R6) | **B** (extension) | Calibré R1, à étendre |
| Détection type passage | scoring/passage-type-detector.ts (R6) | **B** (extension) → **C** (nouveau PROFILEUR) | Remplacer par probabiliste |
| Templates de mesure adaptés | scoring/multi-stage-scorer.ts (R6) | **B** (extension) | Ajouter composition |
| Désalignement visé/produit | NOUVEAU | **C** (créer) | N'existe nulle part |
| Dictionnaire OMEGA ↔ LLM | NOUVEAU | **C** (créer) | N'existe nulle part |
| Matrice confusion sémantique | NOUVEAU | **C** (créer) | ChatGPT l'a demandé |
| Profileur probabiliste | NOUVEAU (remplace style-profiler) | **C** (créer) | Supérieur à style-emergence |

## Modules à NE PAS utiliser (inférieurs aux alternatives R6)

| Module | Raison | Remplacé par |
|--------|--------|-------------|
| `style-emergence-engine/cadence-analyzer.ts` | Non calibré, EN-only | `text-features.ts` R6 + `rhythm.ts` sovereign |
| `style-emergence-engine/lexical-analyzer.ts` | Non calibré, EN-only, TTR non-windowed | `text-features.ts` R6 (f29b, f16a) |
| `style-emergence-engine/density-analyzer.ts` | Non calibré, nécessite ProseParagraph structuré | `passage-type-detector.ts` R6 |
| `style-emergence-engine/style-profiler.ts` | 5 métriques non calibrées | PROFILEUR R6 (49 features calibrées) |

## Modules à CONSERVER (uniques, pas de doublon)

| Module | Raison | Usage futur |
|--------|--------|-------------|
| `style-emergence-engine/syntactic-analyzer.ts` | Classification 9 structures (unique) | Extension multilingue future |
| `style-emergence-engine/genre-detector.ts` | Genre littéraire (thriller/SF/romance) | Profils utilisateur Phase S |
| `style-emergence-engine/ia-detector.ts` | Détection prose IA | Garde-fou qualité |
| `style-emergence-engine/banality-detector.ts` | Anti-banalité / anti-cliché | Complémentaire à f17_knife |
| `emotion-gate/*` | Moteur émotionnel | INTACT, pas touché |
| `genome/*` | ADN extraction | INTACT, réutilisé |
| `mycelium/*` | Validation input | INTACT, réutilisé |

---

*Audit produit le 2026-03-19 — Standard NASA-Grade L4 / DO-178C Level A*
*Scan : 50+ packages, 5 packages analysés en profondeur*
*"Ne faisons pas disparaître le moteur émotionnel" — Francky*
