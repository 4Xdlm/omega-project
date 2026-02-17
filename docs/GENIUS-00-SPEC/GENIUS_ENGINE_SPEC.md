# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA GENIUS ENGINE v1.2 — SPÉCIFICATION TECHNIQUE COMPLÈTE
#   "La Formule du Génie — Physique Mathématique de l'Écriture Extraterrestre"
#
#   Date de gel:     2026-02-17
#   Architecte:      Francky (Architecte Suprême)
#   IA Principal:    Claude Opus 4.6 (Anthropic)
#   Audit Hostile:   ChatGPT (OpenAI) + Gemini (Google)
#   Standard:        NASA-Grade L4 / DO-178C / MIL-STD
#   Consensus:       4 IA unanimes sur formule + architecture + gates
#
# ═══════════════════════════════════════════════════════════════════════════════

STATUS: SPEC ONLY — ZÉRO CODE
VERSION: 1.2.0
PARENT: OMEGA_ROADMAP_ART_v1.md
RELATION: Couche supérieure aux Sprints ART 9-20 (ne les remplace pas)
CHANGELOG v1.2.0 (final) :
  - Embedding : ajout tokenizer_version + text_normalization_version
  - NONCOMPLIANCE : cap max 1/run, au-delà penalty Honesty puis PITCH
  - D : verbiage_penalty respecte 14D/shape (pas de kill sur abstrait voulu)
  - Anti-doublon : log longueur/genre quand GENIUS-16 trigger
  - Invariants : GENIUS-29 + GENIUS-30 ajoutés (total : 30)
CHANGELOG v1.1.0 :
  - D : ajout verbiage_penalty (anti-phrases-vides)
  - S : ajout frontières SSOT semantic_shift vs I vs Honesty
  - S : ajout S_shift_balance diagnostic (sweet spot)
  - S : EMBEDDING SSOT local obligatoire (provider-agnostic)
  - Prompt : ajout Escape Hatch NONCOMPLIANCE
  - JSON : ajout embedding_model_version, diagnostics, noncompliance
  - Future : corrélation partielle documentée en v2
  - Invariants : GENIUS-26 à GENIUS-28 ajoutés

---

# PARTIE 1 — PHILOSOPHIE FONDAMENTALE

## Le Problème

Un LLM est un moteur probabiliste. Par défaut, il génère l'état le plus probable :
des phrases grammaticalement correctes mais sémantiquement lisses. L'entropie maximale.
La mort thermique de l'univers littéraire.

Le génie humain est une anomalie statistique : un état de basse entropie hautement
improbable. Un cristal complexe qui refuse de se dissoudre.

## La Solution

OMEGA n'est pas une aide à l'écriture. C'est un Démon de Maxwell.

Il se tient à la porte et interdit aux molécules "tièdes" (les mots probables) de passer.
Il force le système à rester dans un état d'excitation haute.

La contrainte extrême est la mère du génie. En bloquant les sorties faciles (clichés,
structures lâches, verbiage), la pression créative monte. Le LLM est obligé de puiser
dans les queues de distribution de son espace latent — là où vivent les formulations
que personne n'a jamais lues.

## Le Paradoxe Fondamental

Ce qui fait un texte de génie, c'est la coexistence de deux forces opposées :

- SURPRISE (S) : le lecteur ne prédit pas la suite
- INÉVITABILITÉ (I) : après lecture, ça ne pouvait pas être autrement

En physique, c'est une transition de phase — le point exact où l'eau devient glace.
C'est là, sur le fil du rasoir entre Chaos et Ordre, que la vie (et le génie) apparaît.

---

# PARTIE 2 — ARCHITECTURE 3 COUCHES + LAYER 0

## Principe de Séparation

Le texte est jugé par son CONTENU (Q_text), jamais par son AUTEUR (C_llm).
Le thermomètre ne change pas de graduation selon la marque du four.

```
OMEGA = Emotion Engine (M) × Genius Engine (G) × δ_AS

Où:
- M (Émotion) = ce qui fait RESSENTIR     → existant, inchangé
- G (Génie)   = ce qui fait ADMIRER        → NOUVEAU (cette spec)
- δ_AS        = filtre de contamination IA  → NOUVEAU (Layer 0, binaire)
- C_llm       = capacité du moteur LLM     → pilote le PROCESS, pas le score
```

## Responsabilités SSOT (qui mesure quoi)

| Couche | Responsabilité | Mesure | Ne mesure PAS |
|--------|---------------|--------|---------------|
| **M (Émotion)** | L'EFFET sur le lecteur | Tension, émotion, pacing, cohérence affective, impact | La construction technique |
| **G (Génie)** | L'OPTIMISATION LITTÉRAIRE | Densité, diversité, logique causale, résonance, voix | Ce que le lecteur ressent |
| **δ_AS (Layer 0)** | FILTRE DE CONTAMINATION | Patterns IA-smell, authenticité | Ni l'émotion ni le génie |
| **C_llm** | CAPACITÉ DU MOTEUR | Conformité, stabilité, créativité, honnêteté | Rien du texte lui-même |

**RÈGLE CARDINALE : G ne consomme AUCUN score de M. Uniquement des features bruts ou des outputs data SSOT (événements, symboles détectés, genome). Jamais de scores numériques.**

---

# PARTIE 3 — FORMULES

## Layer 0 — Authenticity Gate (Kill Switch)

```
AS = score anti-IA-smell (blacklist versionnée + détection patterns)

δ_AS = 1 si AS ≥ 85
δ_AS = 0 sinon

Si δ_AS = 0 :
  → REJECT IMMÉDIAT
  → Log : reject_reason = "AS_GATE"
  → Log : Q_text_raw = √(M×G) si CALC cheap, sinon "SKIPPED"
  → Pipeline LLM : STOP (fail-fast, économie tokens)

Évalué EN PREMIER, avant tout autre calcul coûteux.
Versioning obligatoire : AS_PATTERNS_VERSION dans chaque output.
```

## Layer 1 — Émotion (M) — Le Cœur

```
M = (ECC × RCI × SII × IFI × AAI) ^ (1/5)

Axes existants OMEGA, INCHANGÉS.
Range : [0, 100]

ECC = Emotional Coherence & Complexity
RCI = Rhythm, Cadence & Identity
SII = Style Innovation Index
IFI = Immersion Fidelity Index
AAI = Authenticity & Art Index
```

## Layer 2 — Génie (G) — Le Cerveau

```
G = (D × S × I × R × V) ^ (1/5)

Range : [0, 100]
Moyenne géométrique : si UNE dimension est faible, tout s'effondre.
Pas de compensation possible.
```

### Mapping DSIRV → Proxys mesurables (anti-doublon certifié)

#### D — Densité (Masse gravitationnelle narrative)

```
D = f(compression_proxy, sentence_utility_ratio, verbiage_penalty)

Mesure : ratio mots porteurs / mots fonctionnels + info par phrase
         + pénalité anti-verbiage
Physique : chaque mot courbe l'espace-temps autour de lui

Composantes :
  compression_proxy    = tokens porteurs / tokens total (POS-based)
  sentence_utility     = info unique par phrase (dédupliquée)
  verbiage_penalty     = malus appliqué si :
    - ratio stopwords > seuil configurable par phrase
    - répétition patterns syntaxiques (3+ consécutifs même structure)
    - segments abstraits sans ancrage sensoriel/action > seuil
  EXCEPTION : verbiage_penalty NE PÉNALISE PAS l'abstrait si le
  NarrativeShape le requiert (ex: Contemplative, insight en Q3).
  Si conflit → hiérarchie : contrat émotionnel 14D > D penalty.
  Le LLM peut déclarer NONCOMPLIANCE si nécessaire.

INTERDIT : D ne consomme pas SII.necessity_score
AUTORISÉ : D calcule sa propre "utility" depuis features bruts
           (POS tags, stopwords, redondance locale, compression)
SSOT : "D must not consume SII.necessity score;
        it computes density from raw text features only."
```

#### S — Surprise (Entropie contrôlée)

```
S = f(lexical_diversity, entropy_locale, semantic_shift, anti_clustering)

Mesure : TTR fenêtre 200 mots + entropie Shannon + embedding drift
         entre phrases + pénalité clustering sémantique
Physique : le cerveau humain adore que ses prédictions soient déjouées

Composantes :
  lexical_diversity  = TTR fenêtre glissante 200 mots
  entropy_locale     = entropie Shannon sur fenêtre tokens
  semantic_shift     = distance cosinus entre embeddings de phrases
                       consécutives (thème/image/focus)
  anti_clustering    = pénalité si N mots même champ sémantique en zone

FRONTIÈRES SSOT (anti-overlap avec I et Honesty) :
  semantic_shift = mesure la DISTANCE THÉMATIQUE entre phrases
                   (nouveauté d'idées, changement de focus)
  I              = mesure la LOGIQUE CAUSALE entre événements
                   (A implique B, setup → payoff, non-contradiction)
  Honesty        = mesure la TRICHE DE CONFORMITÉ du LLM
                   (faux "donc", symboles déclarés mais absents)
  Frontière simple : S dit "est-ce que l'idée change ?",
                     I dit "est-ce que le changement est logique ?",
                     Honesty dit "est-ce que le LLM ment ?"

EMBEDDING SSOT (provider-agnostic) :
  semantic_shift DOIT utiliser un embedding local fixe versionnné
  (modèle embarqué dans le repo ou runtime, ex: sentence-transformers).
  INTERDIT : utiliser l'API embedding du provider LLM (Claude/GPT/Gemini).
  Raison : GENIUS-25 exige "même texte = même score quel que soit le provider".

  Versioning complet (les 3 composants doivent être figés) :
    EMBEDDING_MODEL_VERSION   : ex "paraphrase-multilingual-MiniLM-L12-v2"
    EMBEDDING_TOKENIZER_VERSION : ex "sentencepiece-v0.1.99"
    TEXT_NORMALIZATION_VERSION : ex "NFKC+trim+collapse_spaces"
  Si l'un des 3 change → nouvelle version = recalibration semantic_shift.
  Les 3 versions apparaissent dans l'output JSON.

DIAGNOSTIC S_shift_balance (non-bloquant, comme SI_tension) :
  S_shift_balance = 1 - |shift_moyen - target| / range
  target = configurable par genre (défaut : 0.35)
  range  = configurable (défaut : 0.25)
  Si S_shift_balance < 0.6 → warning :
    - shift_moyen < target : "texte sémantiquement plat"
    - shift_moyen > target : "zapping d'idées, risque incohérence"

INTERDIT : S ne contient PAS metaphor_novelty (réservé à SII)
SSOT : "S measures lexical surprise and semantic unpredictability;
        metaphor scoring belongs to SII exclusively.
        semantic_shift measures thematic distance (idea novelty),
        NOT causal logic (reserved to I) nor LLM cheating (reserved to Honesty)."

Note : sans semantic_shift, S deviendrait juste du TTR —
un texte avec des synonymes variés mais sémantiquement plat scorerait haut.
```

#### I — Inévitabilité (Gravité causale)

```
I = f(causal_consistency, setup_payoff, non_contradiction)

Mesure : marqueurs causaux validés + résolutions setup + zéro contradiction
Physique : la force qui retient l'Entropie (S). Toutes les trajectoires
           convergent vers la fin prescrite.

INTERDIT : I ne consomme AUCUN score du TemporalEngine ni ECC/tension_14d
AUTORISÉ : I peut lire les événements/pivots extraits comme données brutes
SSOT : "I must not consume TemporalEngine scores;
        it may consume only extracted events/markers."

Invariant de validation : shuffle paragraphes → I doit chuter
```

#### R — Résonance (Ondes stationnaires)

```
R = f(motif_echo, thematic_depth, symbol_density)

Mesure : récurrence avec variation + couches de lecture + densité symbolique
Physique : interférence constructive. Un motif mentionné 3 fois avec
           variation a un impact non-linéaire (3², pas 3×).

INTERDIT : R ne crée pas de taxonomie de symboles (SymbolMap Oracle = SSOT)
AUTORISÉ : R score les outputs du SymbolMap Oracle existant
SSOT : "R may score motif_echo from existing SymbolMap outputs;
        it must not introduce new symbol taxonomy."
```

#### V — Voix (Signature spectrale)

```
V = f(rhythm_distribution, lexical_fingerprint, register_drift, silence_ratio)

Mesure : distribution longueurs + fingerprint lexical + cohérence registre
Physique : chaque auteur émet un spectre unique. V mesure la fidélité.
Floor dynamique : 70 (création originale) / 85 (suite auteur)

INTERDIT : V ne consomme pas le score voice_conformity de RCI
AUTORISÉ : V peut lire le voice_genome comme RÉFÉRENCE (pas comme score)
SSOT : "V computes from raw text features;
        it must not consume RCI voice_conformity score."
```

### Diagnostics non-bloquants

```
SI_tension = min(S, I) / max(S, I)
Si SI_tension < 0.7 → warning "déséquilibre surprise/inévitabilité"

S_shift_balance = 1 - |shift_moyen - target| / range
Si S_shift_balance < 0.6 → warning "shift plat" ou "zapping d'idées"

Ces diagnostics ne sont PAS des floors. Ce sont des radars.
Ils apparaissent dans l'output JSON sous "warnings".
Ils n'empêchent PAS un SEAL si les floors sont respectés.
```

## Layer 3 — Score Texte (Q_text) — Le Verdict

```
Q_text = √(M × G) × δ_AS

Propriétés :
  - Invariant : même texte = même score, toujours, quel que soit le LLM
  - Provider-agnostic : le thermomètre ne change pas selon le four
  - Fail-closed : si M ou G s'effondre, Q_text s'effondre
  - Si δ_AS = 0, Q_text = 0 (kill switch binaire)

Range : [0, 100]
```

### Vérification mathématique de cohérence

```
M=88 (floor), G=92 (floor) → Q_text = √(88×92) = √8096 = 89.98 < 93
Donc les floors seuls NE SUFFISENT PAS pour SEAL.

Pour Q_text = 93 :
  Si M = 88 → G ≥ 98.3
  Si M = 90 → G ≥ 96.1
  Si M = 92 → G ≥ 94.0
  Si M = 95 → G ≥ 91.0

Le SEAL exige l'excellence SIMULTANÉE des deux couches.
Q_text ≥ 93 reste le boss final. M_min et G_min sont des pré-filtres.
```

---

# PARTIE 4 — GATES SEAL

## SEAL_RUN (1 run)

Toutes les conditions simultanément :

```
1. δ_AS = 1                              (anti-IA non négociable)
2. Q_text ≥ 93                           (excellence globale)
3. M ≥ 88                                (émotion suffisante)
4. G ≥ 92                                (génie suffisant)
5. Floors émotion :
     ECC ≥ 88, RCI ≥ 85, SII ≥ 85, IFI ≥ 85, AAI ≥ 85
6. Floors génie :
     D ≥ 80, S ≥ 80, I ≥ 75, R ≥ 75
     V ≥ 70 (création originale) ou V ≥ 85 (suite auteur)
```

## SEAL_STABLE (certification sur N runs)

```
SEAL_STABLE si et seulement si :
  - SEAL_RUN sur ≥ 4/5 runs consécutifs
  - σ(Q_text) ≤ 3.0 sur 5 runs
  - min(Q_text) ≥ 80 sur 5 runs (aucun run catastrophique)
```

## Statuts

```
SEAL_RUN    : passe toutes conditions sur 1 run
SEAL_STABLE : ≥4/5 SEAL_RUN + variance ok
PITCH       : proche mais pas certifiable (Q_text 80-92.9, ou SEAL non stable)
REJECT      : δ_AS = 0 OU Q_text < 80 OU incohérence majeure
```

---

# PARTIE 5 — C_llm (PILOTAGE PROCESS)

## Formule

```
C_llm = (Conformité × Stabilité × Créativité × Honesty) ^ (1/4)

C_llm ∈ [0, 1]
C_llm ne touche JAMAIS Q_text, SEAL, ou REJECT.
```

## Composantes

```
Conformité = hard_constraints_pass / hard_constraints_total
  Mesuré sur 7 prompts fixes ("Core System")

Stabilité = 1 - clamp(σ(Q_text) / σ_max, 0, 1)
  Mesuré sur 5 runs du même prompt

Créativité = clamp(Novelty_moyenne / Novelty_cible, 0, 1) × (1 - Penalty_incohérence)
  Mesuré sur 3 prompts tournants

Honesty = 1 - Σ(penalties H1..H4)
  H1 = contradictions logiques internes
       (ex: "il fait nuit" puis "le soleil tape" sans pivot)
  H2 = faux liens causaux
       (marqueurs "donc/ainsi/car" sans événement déclencheur mesurable)
  H3 = show/tell violation
       (phrases abstraites > seuil quand le prompt exige show-don't-tell)
  H4 = symbol bullshit
       (symboles déclarés mais pas de motifs récurrents détectés via R)
```

## Benchmark Protocol

```
10 prompts : 7 fixes + 3 tournants

7 fixes ("Core System") :
  → Figés, garantissent absence de régression
  → Versionnés : BENCHMARK_CORE_VERSION

3 tournants :
  → Tirés du pool requêtes récentes
  → Filtrés : longueur similaire, genre similaire, seed + hash archivés
  → Pas de duplicats récents
  → Changent selon hash de la semaine
```

## Pilotage

```
C_llm > 0.85   → Mono-pass (prompt contrat direct, 1-2 passes correction)
C_llm 0.60-0.85 → Multi-pass (squelette → chair → style, 3-5 passes correction)
C_llm < 0.60   → Max-assist (micro-guidage phrase par phrase, 7+ passes)

Passes = ⌈P_base / C_llm⌉
Budget_tokens = T_base × (1 + (1 - C_llm))
```

## Q_system (tracking interne, optionnel)

```
Q_system = Q_text × C_llm

Usage : comparer OMEGA+Claude vs OMEGA+GPT vs OMEGA+Gemini
Ne décide JAMAIS d'un SEAL/REJECT.
```

---

# PARTIE 6 — MODES OPÉRATOIRES

## Mode "original" (défaut)

```
- Contraintes universelles activées (rythme, lexique, structure)
- V_floor = 70
- Voice genome = générique OMEGA
- NarrativeShape = selon ForgePacket ou défaut "ThreatReveal"
```

## Mode "continuation" (fidélité auteur)

```
- Contraintes rythme/lexique REMPLACÉES par fingerprint auteur (±10%)
  Exemple : auteur avec 60% phrases longues → on force 55-65% (pas 25-35%)
- V_floor = 85
- Voice genome = extrait du texte de référence
- NarrativeShape = aligné sur la courbe 14D de l'auteur
- Restent NON-NÉGOCIABLES :
    AS kill switch
    Logique causale (I)
    Contradictions (Honesty)
    Cohérence émotionnelle (M)
- OMEGA respecte le style, ne le "corrige" pas
```

## Mode "enhancement" (améliorer mais reconnaissable)

```
- Contraintes universelles activées
- Fingerprint auteur = guide (pas override)
- V_floor = 75 (tolérance intermédiaire)
- OMEGA améliore le style tout en gardant la voix reconnaissable
```

---

# PARTIE 7 — PROMPT CONTRACT (8 sections ordonnées)

## Principe : L'Entonnoir Thermodynamique

Les sections 0-4 bloquent les sorties faciles (les murs).
La section 7 est la tuyère : l'unique espace de liberté.
Plus les murs sont durs, plus la créativité qui passe est concentrée.

Le LLM reçoit EXPLICITEMENT :
"Tu as carte blanche UNIQUEMENT sur : images, symboles, détails sensoriels,
micro-rythmes. TOUT LE RESTE est contraint."

## Hiérarchie de résolution des conflits

```
Si deux contraintes hard entrent en conflit, résoudre dans cet ordre :
  1. Authenticité (AS) — jamais sacrifiée
  2. Contrat émotionnel 14D — l'âme prime sur la technique
  3. Structure / Inévitabilité — le squelette
  4. Rythme — la musique
  5. Lexique — la discipline
```

## Escape Hatch — Déclaration de non-conformité

```
Si le LLM ne peut pas satisfaire un hard constraint sans violer un
constraint de rang supérieur (cf. hiérarchie ci-dessus), il DOIT :

1. Appliquer la hiérarchie (sacrifier le rang inférieur)
2. Déclarer la non-conformité dans un bloc structuré :

   NONCOMPLIANCE: [section violée] | [raison en 1 ligne]

Exemple :
   NONCOMPLIANCE: RYTHME | phrase longue nécessaire pour courbe émotionnelle Q3

Pourquoi :
  - Triche silencieuse = pire qu'un écart déclaré
  - OMEGA peut ajuster la passe suivante (corriger ou tolérer)
  - Le scorer peut ignorer la pénalité sur l'axe concerné si justifié
  - Archivé pour diagnostic (pattern de non-conformité = signal de
    contrainte trop dure à recalibrer)

ANTI-ABUS :
  - Maximum 1 NONCOMPLIANCE par run
  - Au-delà de 1 → penalty Honesty (H5 = excessive_noncompliance)
  - Au-delà de 2 → verdict automatique PITCH (le LLM abuse du joker)
  - Un run avec 0 NONCOMPLIANCE est toujours préféré
```

## Sections

### [0] ANTI-PATTERN (Layer 0, kill switch)

```
- Blacklist versionnée de formulations IA-smell
- TOUTE occurrence = REJECT
- Priorité ABSOLUE sur tout le reste
- Exemples : "Il est important de noter que", "tisserande des mots",
  "dans un élan de", "une tapisserie de"
```

### [1] STRUCTURE NARRATIVE (hard)

```
- N paragraphes, distribution longueurs imposée
- Min 1 pivot/retournement par scène
- NarrativeShape paramétrable (pas template fixe) :
    ThreatReveal | SlowBurn | Spiral | StaticPressure | Contemplative
- Si NarrativeShape entre en conflit avec courbe 14D → 14D GAGNE
- Si NarrativeShape non spécifié → aligné sur courbe 14D
- Budget par quartile (universel, quel que soit le shape) :
    1 micro-événement (type selon shape)
    1 ancrage sensoriel
    1 variation rythmique
```

### [2] DISCIPLINE LEXICALE (hard)

```
- Max 3 mots même champ sémantique / 200 mots
- Zéro répétition de mot fort sur 100 mots
- TTR fenêtre glissante ≥ seuil configurable
```

### [3] RYTHME (hard, adapté en mode continuation)

```
Mode original :
  - 25-35% phrases < 10 mots
  - 15-25% phrases > 20 mots
  - Max 2 phrases même pattern syntaxique consécutives

Mode continuation :
  - Distribution REMPLACÉE par fingerprint auteur (±10%)
  - Max consécutives identiques reste actif
```

### [4] CONTRAT ÉMOTIONNEL (hard, SSOT = moteur émotion)

```
- Courbe 14D par quartile
- Émotion terminale prescrite
- Points de rupture marqués
- Le moteur émotion est et reste le SSOT de la progression interne
```

### [5] VOICE TARGET (hard si continuation, soft si original)

```
- Fingerprint rythmique cible
- Mots-signature de l'auteur
- Registre + rapport parole/silence
```

### [6] OBJECTIFS SOFT (maximiser, pas imposer)

```
- Densité sensorielle (2+ sens / paragraphe)
- Show don't tell (SDT reste ici comme instruction, PAS comme axe G)
- Impact ouverture/fermeture
- Originalité métaphorique
- Motifs symboliques : établir en Q1, résonner avec variation en Q2-Q3,
  résoudre en Q4
```

### [7] LIBERTÉ CRÉATIVE (la tuyère — l'espace de génie)

```
- Choix des images et métaphores
- Symboles et motifs
- Détails sensoriels spécifiques
- Micro-rythmes et variations
- Ce qui rend CE texte unique et impossible à reproduire

+ EXEMPLARS (2-3 passages référence, scorés 90+ par OMEGA)
  Servent d'ancrage concret, pas de modèle à copier.
  Ne génèrent AUCUN bonus score.
```

---

# PARTIE 8 — NARRATIVE SHAPES

## Principe

Les quartiles du prompt ne sont PAS un template fixe universel.
Ils sont pilotés par un NarrativeShape sélectionné.

Si conflit entre NarrativeShape et courbe 14D → courbe 14D gagne TOUJOURS.

## Shapes disponibles v1

| Shape | Q1 | Q2 | Q3 | Q4 |
|-------|----|----|----|----|
| ThreatReveal | anomalie | menace | révélation | conséquence |
| SlowBurn | malaise | accumulation | basculement | résonance |
| Spiral | fissure | doute | vertige | chute |
| StaticPressure | tension | tension | tension | rupture |
| Contemplative | observation | mémoire | insight | acceptation |

## Règle SSOT

```
Le moteur émotion (courbe 14D) reste le SSOT de la progression interne.
NarrativeShape est un GUIDE pour le prompt, pas une loi.
Si non spécifié → défaut = "aligné sur courbe 14D".
```

---

# PARTIE 9 — PROTOCOLE DE RECALIBRATION

## Floors

```
Déclencheur : CLI uniquement (omega recalibrate --genius). Jamais automatique.
Dataset : 50 derniers runs archivés (hash + prompt + output)
Règle : P10 (percentile 10) pour axes standards
         P20 (percentile 20) pour axes critiques (AS)
Versioning : FLOORS_VERSION incrémenté à chaque recalibration
```

## Floors v1 (valeurs initiales, à recalibrer après 50 runs)

```
Émotion : ECC ≥ 88, RCI ≥ 85, SII ≥ 85, IFI ≥ 85, AAI ≥ 85
Génie :   D ≥ 80, S ≥ 80, I ≥ 75, R ≥ 75
Voix :    V ≥ 70 (original) / V ≥ 85 (continuation)
AS :      ≥ 85 (non négociable, binaire)
```

---

# PARTIE 10 — INVARIANTS DE TEST

## Invariants fonctionnels (GENIUS-01 à GENIUS-15)

```
[GENIUS-01] Si AS < 85, la fonction retourne REJECT_IA_SMELL
            sans calculer M ni G.

[GENIUS-02] Si M=85 et G=100, Q_text = √(8500) = 92.2 < 93.
            Le score est rejeté pour SEAL (même si G est parfait).

[GENIUS-03] Si M=95 et G=95, Q_text = √(9025) = 95.0.
            Vérification de la moyenne géométrique fail-closed.

[GENIUS-04] Si tous les axes Génie sont à 100 mais V=65
            en mode "création originale" (floor=70), SEAL est refusé.

[GENIUS-05] Si Q_text ≥ 93 sur 1 run mais σ(Q_text) = 5.0 sur 5 runs,
            le statut bascule en PITCH (pas SEAL_STABLE).

[GENIUS-06] Q_system est retourné dans le JSON final mais ne doit
            JAMAIS influencer le booléen seal_granted.

[GENIUS-07] C_llm avec Honesty = 0.1 doit faire chuter sévèrement
            C_llm global et déclencher mode "max-assist".

[GENIUS-08] Le budget tokens alloué augmente mathématiquement
            quand C_llm passe sous 0.60.

[GENIUS-09] Si C_llm > 0.85, le pipeline exécute mono-pass.

[GENIUS-10] Si C_llm < 0.60, le pipeline force max-assist.

[GENIUS-11] La mise à jour des floors lève une erreur si elle n'est pas
            invoquée par commande CLI explicite.

[GENIUS-12] La recalibration sur un axe "standard" utilise strictement
            P10 du dataset fourni.

[GENIUS-13] Le prompt généré contient obligatoirement le bloc
            "PRIORITY ORDER (fail-closed)" avec la hiérarchie.

[GENIUS-14] Les 3 prompts tournants du benchmark C_llm changent
            dynamiquement selon le hash de la semaine. Les 7 restent fixes.

[GENIUS-15] L'output JSON correspond au schéma canonique défini
            (pas de clés manquantes ou superflues).
```

## Invariants anti-doublon (GENIUS-16 à GENIUS-20)

```
[GENIUS-16] D ne corrèle pas à >0.90 avec SII/necessity
            sur corpus 50 runs.
            Seuil relevé à 0.90 (zone conceptuellement proche).

[GENIUS-17] S ne corrèle pas à >0.85 avec SII/metaphor_novelty
            sur corpus 50 runs.

[GENIUS-18] I ne corrèle pas à >0.85 avec ECC/temporal_pacing
            sur corpus 50 runs.

[GENIUS-19] R ne corrèle pas à >0.85 avec emotion_to_imagery
            sur corpus 50 runs.

[GENIUS-20] V ne corrèle pas à >0.85 avec RCI/voice_conformity
            sur corpus 50 runs.

Si corrélation > seuil → doublon détecté → RECALIBRER les proxys.
Corrélations nulles avant 50 runs (pas assez de données).
```

## Invariants de non-triche (GENIUS-21 à GENIUS-25)

```
[GENIUS-21] Shuffle paragraphes d'un texte → I doit chuter
            (causalité détruite par permutation).

[GENIUS-22] Injection répétition champ lexical → S doit chuter
            (anti-clustering activé).

[GENIUS-23] Uniformisation longueurs de phrases → V doit chuter
            (fingerprint rythmique détruit).

[GENIUS-24] Injection pattern IA-smell → AS passe sous 85 → δ_AS = 0 → REJECT.

[GENIUS-25] Texte identique, provider différent → Q_text identique (±0.5).
            Le thermomètre est invariant.
            Dépend de EMBEDDING SSOT local (pas d'API provider).
```

## Invariants v1.1 (GENIUS-26 à GENIUS-28)

```
[GENIUS-26] S_shift_balance apparaît dans output JSON sous diagnostics.
            Si shift_moyen < 0.10 OU shift_moyen > 0.60 → warning émis.
            Le warning ne bloque PAS le SEAL.

[GENIUS-27] Si le LLM déclare NONCOMPLIANCE dans sa sortie,
            le bloc est parsé et archivé dans output JSON
            sous process.noncompliance_declarations[].
            Le scorer peut ajuster le calcul de l'axe concerné.

[GENIUS-28] L'embedding utilisé pour semantic_shift est fixe et versionné.
            Changer de modèle embedding = nouvelle EMBEDDING_MODEL_VERSION.
            Deux runs avec même texte + même embedding = même semantic_shift (±0.01).

[GENIUS-29] Si NONCOMPLIANCE count > 1 dans un run → penalty Honesty (H5).
            Si count > 2 → verdict automatique PITCH.
            Empêche l'abus du joker par un LLM paresseux.

[GENIUS-30] Quand GENIUS-16 trigger (corrélation D vs necessity > 0.90),
            le log inclut obligatoirement : word_count moyen, genre,
            scene_type des runs du corpus.
            Permet de diagnostiquer faux positifs vs vrai doublon.
```

---

# PARTIE 11 — OUTPUT JSON CANONIQUE

```json
{
  "omega_version": "3.x",
  "genius_spec_version": "1.2.0",
  "as_patterns_version": "1.0",
  "floors_version": "1.0",
  "embedding_model_version": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  "embedding_tokenizer_version": "sentencepiece-v0.1.99",
  "text_normalization_version": "NFKC+trim+collapse_spaces",
  "mode": "original|continuation|enhancement",
  "narrative_shape": "ThreatReveal",

  "layer0_gate": {
    "AS_score": 91.2,
    "AS_GATE_PASS": true,
    "reject_reason": null
  },

  "layer1_emotion": {
    "M": 92.5,
    "axes": {
      "ECC": 95.0,
      "RCI": 90.0,
      "SII": 88.0,
      "IFI": 94.0,
      "AAI": 96.0
    },
    "warnings": []
  },

  "layer2_genius": {
    "G": 93.1,
    "axes": {
      "D": 91.0,
      "S": 94.0,
      "I": 88.0,
      "R": 96.0,
      "V": 95.0
    },
    "diagnostics": {
      "SI_tension": 0.936,
      "S_shift_balance": 0.82,
      "shift_moyen": 0.33
    },
    "geometric_penalty_active": true
  },

  "layer3_verdict": {
    "Q_text": 92.8,
    "Q_text_raw": 92.8,
    "seal_run": false,
    "seal_reason": "Q_text 92.8 < 93",
    "verdict": "PITCH"
  },

  "process": {
    "C_llm": 0.82,
    "C_llm_components": {
      "conformity": 0.88,
      "stability": 0.79,
      "creativity": 0.85,
      "honesty": 0.78
    },
    "strategy": "multi-pass",
    "passes_executed": 3,
    "noncompliance_declarations": [
      "RYTHME | phrase longue nécessaire pour courbe émotionnelle Q3"
    ]
  },

  "stability": {
    "runs_total": 5,
    "seal_runs": 3,
    "q_text_stddev": 2.8,
    "q_text_min": 89.1,
    "seal_stable": false,
    "reason": "3/5 SEAL_RUN < 4 required"
  },

  "Q_system": 76.1,

  "anti_doublon_check": {
    "D_SII_necessity_corr": null,
    "S_SII_metaphor_corr": null,
    "I_ECC_temporal_corr": null,
    "R_symbol_map_corr": null,
    "V_RCI_voice_corr": null,
    "note": "Corrélations calculées après 50 runs",
    "trigger_context": {
      "avg_word_count": null,
      "genre": null,
      "scene_types": []
    }
  }
}
```

---

# PARTIE 12 — RELATION AVEC LA ROADMAP ART

## Ce que le Genius Engine NE REMPLACE PAS

```
Sprint 9  (Semantic Cortex)     → alimente M (émotion LLM-based)
Sprint 10 (Sentence Surgeon)    → correction loop (utilisée par Genius aussi)
Sprint 11 (SDT + Authenticity)  → crée AS (utilisé par Layer 0) + AAI dans M
Sprint 12 (Scoring V3.1)        → pose les 5 macro-axes + 14 axes dans M
Sprint 13 (Voice Genome)        → crée voice_conformity (RCI) + fournit genome à V
Sprint 14 (Reader Phantom)      → enrichit M (IFI)
Sprint 15 (Phonetic Engine)     → enrichit M (RCI/euphony)
Sprint 16 (Temporal Architect)  → enrichit M (ECC/temporal) + fournit events à I
```

## Ce que le Genius Engine AJOUTE (au-dessus)

```
GENIUS-00 : cette spec (DONE quand commitée)
GENIUS-01 : refonte buildSovereignPrompt → prompt contract 8 sections
GENIUS-02 : scorers DSIRV (D, S, I, R, V) — Layer 2
GENIUS-03 : C_llm calibrator + benchmark protocol
GENIUS-04 : intégration Q_text = √(M×G)×δ_AS + LIVE validation
```

## Dépendances

```
GENIUS-01 peut démarrer MAINTENANT (prompt contract, indépendant)
GENIUS-02 dépend partiellement de Sprint 11 (AS/authenticity) et Sprint 13 (V/voice)
GENIUS-03 peut démarrer après GENIUS-01 (benchmark = prompts + runs)
GENIUS-04 dépend de Sprint 12 (V3.1 scoring) + GENIUS-02
```

---

# PARTIE 13 — FUTURE ENHANCEMENTS (v2, PAS v1)

```
- MG_coupling : covariance entre pics émotionnels et pics techniques
  (quand la technique SERT l'émotion, pas juste coexiste)
- Floors calibrés sur corpus quantiles (P10/P20 réels, pas constants)
- C_llm auto-benchmark à chaque changement de provider
- Exemplar Library auto-curatée (textes SEAL archivés deviennent exemplars)
- NarrativeShape détecté automatiquement depuis le plan narratif
- Semantic_shift via embeddings dédiés plus gros (pas proxy MiniLM)
- Corrélation partielle anti-doublon :
    corr(D, necessity | longueur, genre)
    corr(S, metaphor_novelty | vocab_size)
    Élimine la variance confondante du troisième facteur.
    Remplace les seuils bruts 0.85/0.90 par une mesure statistiquement propre.
```

---

# PARTIE 14 — PLAN D'EXÉCUTION

## SPRINT GENIUS-00 — SPEC ONLY (ce document)

```
Livrable : GENIUS_ENGINE_SPEC.md + GENIUS_SSOT.json
Gate : zéro placeholder, zéro formule manquante
Status : COMPLET quand committé
```

## SPRINT GENIUS-01 — PROMPT CONTRACT (le fer de lance n°1)

```
Livrable : genius-contract-compiler.ts
Contenu :
  - Refonte buildSovereignPrompt → 8 sections ordonnées
  - Injection contraintes mesurables alignées scorer
  - NarrativeShape paramétrable
  - 10 exemplars calibrés v1
  - Mode original/continuation/enhancement
Tests : 5 runs, comparer delta Q_text avant/après sur même golden run
Dépendances : aucune (peut démarrer immédiatement)
```

## SPRINT GENIUS-02 — GENIUS METRICS (le fer de lance n°2)

```
Livrable : genius-metrics.ts (D, S, I, R, V scorers CALC)
Contenu :
  - Layer 0 : AS gatekeeper (si pas déjà dans Sprint 11)
  - 5 scorers CALC/HYBRID provider-agnostic
  - Moyenne géométrique G = (D×S×I×R×V)^(1/5)
  - SI_tension diagnostic
Tests : 479 tests existants PASS + GENIUS-01 à GENIUS-25
Dépendances : Sprint 11 (AS), Sprint 13 (voice genome pour V)
```

## SPRINT GENIUS-03 — C_LLM CALIBRATOR

```
Livrable : genius-calibrator.ts
Contenu :
  - 7 prompts fixes + 3 tournants
  - Benchmark auto par provider
  - Pilotage mono/multi/max-assist
  - Honesty proxies H1-H4
Tests : C_llm mesuré et archivé pour Claude Sonnet
Dépendances : GENIUS-01 (prompt contract nécessaire pour benchmark)
```

## SPRINT GENIUS-04 — INTÉGRATION + VALIDATION LIVE

```
Livrable : Q_text = √(M×G) × δ_AS fonctionnel end-to-end
Contenu :
  - Pipeline complet 3 couches
  - 20 runs de validation
  - Stability gate (5 runs × 4 scénarios)
  - Comparaison avant/après sur même golden run
Gate : au moins 1 SEAL_RUN sur 5 runs
Dépendances : Sprint 12 (V3.1), GENIUS-02, GENIUS-03
```

---

# SCEAU

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   OMEGA GENIUS ENGINE v1.2 — SPÉCIFICATION TECHNIQUE COMPLÈTE                 ║
║                                                                               ║
║   Status:        SPEC ONLY — ZÉRO CODE — SCELLÉE                             ║
║   Consensus:     4 IA unanimes (Claude + ChatGPT + Gemini) — 4 rounds        ║
║   Anti-doublon:  PASSÉ (5 fixes + 5 invariants corrélation)                   ║
║   Formule:       Q_text = √(M × G) × δ_AS                                    ║
║   Layer 0:       AS binaire (kill switch)                                      ║
║   Géométrique:   fail-closed natif, zéro compensation                         ║
║   C_llm:         pilote le process, jamais le score                           ║
║   Modes:         original / continuation / enhancement                        ║
║                                                                               ║
║   Autorité:      Francky (Architecte Suprême)                                 ║
║   Date:          2026-02-17                                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT — GENIUS_ENGINE_SPEC v1.2.0**
