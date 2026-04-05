# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT — R-LAB-TYPE-V2
# PHYSIQUE COMPLÈTE DE LA COMPOSITION LITTÉRAIRE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-22
# Branche      : phase-r-metrology-rebuild
# HEAD entrant : 92150558
# Standard     : NASA-Grade L4 — MÉTROLOGIE APPRISE, PAS INVENTÉE
# Autorité     : Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════
# CE QU'ON CONSTRUIT — 4 NIVEAUX DE PHYSIQUE LITTÉRAIRE
#
# NIVEAU 1 — ATOME     : chaque phrase taggée individuellement avec vérification
# NIVEAU 2 — MOLÉCULE  : les mélanges de types créent des structures émergentes
# NIVEAU 3 — RÉACTION  : la qualité interne des features DANS chaque type
#                         détermine si le mélange est banal ou magistral
# NIVEAU 4 — DYNAMIQUE : comment les features de types DIFFÉRENTS interagissent
#                         quand elles sont mélangées — addition, multiplication,
#                         atténuation, transformation, annulation
#
# Tout est DÉCOUVERT dans le corpus. Rien n'est inventé.
# Le corpus est le laboratoire. Les maîtres sont les professeurs.
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLES ABSOLUES
# ═══════════════════════════════════════════════════════════════════════════════

R-01 : NE TOUCHER NI au GB V1, NI au V3, NI aux modules de features.
R-02 : CHAQUE phrase taggée individuellement avec double vérification.
R-03 : Tout est DÉCOUVERT dans le corpus, pas inventé. Les coefficients sont APPRIS.
R-04 : La calibration sur TOUT le corpus disponible (~400 textes).
R-05 : L'interface PassageClassification reste compatible (somme = 1.0).
R-06 : 1911 tests existants doivent PASS.
R-07 : Prendre le temps nécessaire. Pas de raccourcis. Scanner TOUT.

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — LES ATOMES : TAGGING PAR PHRASE AVEC DOUBLE VÉRIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Réécrire passage-classifier.ts pour tagger CHAQUE PHRASE individuellement.
Double vérification : 1) marqueur détecté  2) contrôle de contexte/position.

## HIÉRARCHIE DE PRIORITÉ

```
DIALOGUE > ACTION > INTROSPECTION > DESCRIPTION > NARRATION (défaut)
```

## TYPE 1 — DIALOGUE

Marqueurs primaires (au moins UN) :
- Guillemets encadrant la phrase (« ... », "...", "...")
- Tiret cadratin (—) ou demi-cadratin (–) en début de phrase
- Format théâtral : NOM MAJUSCULE + ponctuation en début de ligne
- Verbe de parole + guillemets/tirets dans la même phrase

Verbes de parole (liste FERMÉE) :
```
FR: dit, disait, répondit, répondait, murmura, murmurait, cria, criait,
    demanda, demandait, ajouta, ajoutait, reprit, reprenait, déclara,
    chuchota, s'écria, s'exclama, souffla, gémit, hurla, susurra,
    articula, balbutia, grommela, marmonna, lâcha, coupa, interrompit,
    protesta, implora, supplia, ordonna
EN: said, asked, replied, whispered, shouted, exclaimed, answered,
    cried, muttered, stammered, yelled, murmured, demanded, ordered,
    snapped, hissed, growled, sighed
```

Contrôle contextuel :
- Discours INDIRECT ("il dit qu'il partirait") → si "que/qu'" suit le verbe → NARRATION
- Didascalie dans du théâtre ("il se lève") → appliquer autres règles

## TYPE 2 — ACTION

Verbes d'action physique (liste FERMÉE) :
```
FR: frappa, bondit, courut, saisit, lança, jeta, tira, poussa, sauta,
    tomba, coupa, brisa, arracha, ouvrit, ferma, marcha, s'élança,
    recula, avança, escalada, plongea, s'enfuit, se jeta, se leva,
    se dressa, s'empara, se précipita, prit, donna, porta, leva,
    baissa, tourna, retourna, monta, descendit, entra, sortit, passa,
    traversa, franchit, atteignit, quitta, souleva, empoigna, agrippa,
    trancha, perça, écrasa, renversa, projeta
    + TOUS les imparfaits : frappait, bondissait, courait, etc.
EN: walked, ran, jumped, grabbed, threw, hit, kicked, pushed, pulled,
    struck, seized, caught, fired, rode, charged, crashed, fell, rushed,
    leapt, climbed, swam, fled, turned, rose, stood, sat, entered,
    left, crossed, reached, opened, closed, broke, cut, lifted, dropped,
    lunged, slashed, stabbed, smashed, hurled
```

Contrôle de POSITION :
- Verbe d'action dans les 8 premiers mots → probablement ACTION
- Verbe d'action après le 12e mot + 2 adjectifs → probablement DESCRIPTION
- Verbe d'action dans une subordonnée (après "qui", "que", "dont") → secondaire, pas ACTION

## TYPE 3 — INTROSPECTION

Verbes mentaux :
```
FR: pensait, croyait, savait, comprenait, se demandait, imaginait,
    rêvait, se souvenait, se souvint, réfléchissait, hésitait, doutait,
    craignait, espérait, regrettait, se rappelait, méditait, songeait
EN: thought, wondered, believed, knew, understood, imagined, remembered,
    felt [émotion], realized, reflected, hesitated, doubted, feared,
    hoped, regretted, pondered, contemplated
```

Contrôle "sentait/felt" :
- Complément ABSTRAIT (peur, joie, tristesse, angoisse, culpabilité) → INTROSPECTION
- Complément PHYSIQUE (odeur, chaleur, froid, vent) → DESCRIPTION

## TYPE 4 — DESCRIPTION

Condition : (2+ adjectifs qualificatifs) OU (1+ mot sensoriel + verbe statique)

Verbes statiques : était, étaient, semblait, paraissait, s'étendait, se dressait,
régnait, flottait, planait, baignait, dominait. EN: was, were, seemed, lay, stood, hung.

Mots sensoriels : lumière, ombre, couleur, brillant, sombre, clair, lueur, reflet,
silence, murmure, odeur, parfum, froid, chaud, doux. EN: light, shadow, dark, bright,
silence, smell, scent, cold, warm.

## TYPE 5 — NARRATION (défaut)

Tout le reste. Enchaînement factuel, transitions, résumés d'événements.

## IMPLÉMENTATION

```typescript
export type SentenceType = 'dialogue' | 'action' | 'introspection' | 'description' | 'narration';

export interface SentenceTag {
  text: string;
  type: SentenceType;
  markers: string[];          // quels marqueurs ont déclenché
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PassageAnalysis {
  classification: PassageClassification;   // compatible interface existante
  sentences: SentenceTag[];
  sentence_count: number;
  composition?: CompositionProfile;         // Niveau 2
  feature_dynamics?: FeatureDynamics;       // Niveau 4
}

function classifySentence(sentence: string): SentenceTag { ... }

// L'export principal RESTE compatible
export function classifyPassage(text: string): PassageClassification {
  const sents = splitSentences(text);
  const tags = sents.map(s => classifySentence(s));
  const counts = { dialogue: 0, action: 0, description: 0, introspection: 0, narration: 0 };
  for (const t of tags) counts[t.type]++;
  const total = Math.max(tags.length, 1);
  // ... normalize, find dominant, return
}

// Export détaillé pour inspection et niveaux 2-4
export function classifyPassageDetailed(text: string): PassageAnalysis { ... }
```

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 2 — LES MOLÉCULES : COMPOSITIONS ÉMERGENTES
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Découvrir comment les types atomiques se COMBINENT pour créer des structures
narratives plus grandes. Le mélange n'est PAS la somme des parties.

## MÉTHODE

### 2.1 — Scanner le corpus ENTIER

Pour CHAQUE fichier .txt dans omega-autopsie/corpus_r/txt/ :

1. Skip les 2000 premiers mots si Gutenberg (chercher "Project Gutenberg", "START OF")
2. Tagger CHAQUE phrase (Phase 1)
3. Découper en FENÊTRES GLISSANTES de 20 phrases, pas de 10
4. Pour chaque fenêtre calculer :

```typescript
interface CompositionVector {
  pct_dialogue: number;      // % de phrases dialogue
  pct_action: number;        // % de phrases action
  pct_description: number;   // % de phrases description
  pct_introspection: number; // % de phrases introspection
  pct_narration: number;     // % de phrases narration
  transition_rate: number;   // nb changements type / nb phrases (0=monotone, 1=alternance)
  max_block_length: number;  // plus long bloc consécutif du même type
  sequence_pattern: string;  // ex: "AADNNIDDA" (premiers chars de chaque type)
  dominant_type: string;     // type le plus fréquent
}
```

### 2.2 — Clustering des compositions

Regrouper TOUTES les fenêtres de tous les romans par profil similaire.
Utiliser un K-means simple sur les 7 dimensions numériques (pct × 5 + transition_rate + max_block).

Tester K = 6, 8, 10, 12. Choisir le K qui produit des clusters interprétables.

### 2.3 — Nommer les profils émergents

Pour chaque cluster, analyser :
- Le centroïde (composition moyenne)
- Les romans dominants dans ce cluster
- La qualité GB V1 moyenne des fenêtres de ce cluster

Nommer les profils selon ce qu'ils représentent réellement.
HYPOTHÈSES à vérifier (le clustering dira la vérité) :

```
INTRIGUE         : action 30-50% + introspection 20-35% + narration 15-30%, transition HIGH
SUSPENSE         : action 40-60% + narration 20-30% + description 10-20%, transition MEDIUM
CONTEMPLATION    : description 40-60% + introspection 20-40% + action <15%, transition LOW
CONFRONTATION    : dialogue 30-50% + action 20-40%, transition HIGH
MÉDITATION       : introspection 50-70% + narration 15-30%, transition LOW
CHRONIQUE        : narration 50-70% + description 10-25%, transition LOW
SCÈNE DRAMATIQUE : dialogue 40-60% + narration 20-30% + introspection 10-20%
ACTION PURE      : action 60%+, transition HIGH
```

### 2.4 — Corréler avec GB V1

Pour chaque fenêtre de 20 phrases, scorer avec le GB V1 (computeAllGBFeatures + scoreGB).
Pour chaque profil de composition, calculer :
- GB V1 moyen + std + min + max
- % de fenêtres S-tier (>4.5), A-tier (>3.5), etc.

Cela révèle QUELS MÉLANGES produisent de l'excellence.

## LIVRABLE

```
packages/sovereign-engine/src/scoring/data/COMPOSITION_PROFILES.json
```

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 3 — LA RÉACTION : QUALITÉ INTERNE × COMPOSITION
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Pour un même profil de composition (ex: "INTRIGUE"), comprendre POURQUOI
Dostoïevski obtient un S-tier et un commercial obtient un C-tier.
La réponse est dans les FEATURES INTERNES de chaque type atomique.

## MÉTHODE

### 3.1 — Features par type atomique dans chaque fenêtre

Pour chaque fenêtre de 20 phrases déjà classée :

1. Regrouper les phrases par type
2. Pour chaque groupe, calculer les features GB V1 sur UNIQUEMENT ces phrases :

```typescript
interface TypeFeatureProfile {
  type: SentenceType;
  sentence_count: number;
  // Features clés mesurées sur les phrases de CE TYPE uniquement
  features: {
    f1_mean: number;               // longueur moyenne phrases de ce type
    f1a_rhythm_variance: number;   // variance rythme dans ce type
    f26b_long_sent_rate: number;   // phrases longues dans ce type
    f29d_ttr_score: number;        // richesse lexicale dans ce type
    f24c_contrast_delta: number;   // contraste dans ce type
    f19a_approx_entropy: number;   // entropie dans ce type
    f17_knife_count: number;       // phrases-couteaux dans ce type
    f9a_contradiction_rate: number; // adversatifs dans ce type
    f27a_epistemic_rate: number;   // épistémiques dans ce type
    f28b_irony_density: number;    // ironie dans ce type
    f35c_hook_score: number;       // accroche dans ce type
    f36c_cliff_score: number;      // suspense dans ce type
    // + toutes les features sémantiques
    f_referent_continuity: number;
    f_lexical_progression: number;
    f_tension_density: number;
    f_pov_stability: number;
    f_causal_density: number;
    f_echo_density: number;
    // ... les 42 features sur les phrases de ce type uniquement
  };
}
```

3. Stocker le tout :

```typescript
interface WindowFullProfile {
  window_id: string;
  novel: string;
  position: number;          // position dans le roman (0.0-1.0)
  composition: CompositionVector;
  quality_per_type: Record<SentenceType, TypeFeatureProfile>;
  gb_score_window: number;   // GB V1 sur la fenêtre entière (20 phrases)
}
```

### 3.2 — Corrélation features internes → qualité globale

Pour CHAQUE type atomique, pour CHAQUE feature :

```python
# Pseudo-code — implémenter en TS ou Python
for type in ['action', 'description', 'introspection', 'narration', 'dialogue']:
    for feature in ALL_42_FEATURES:
        # Collecter toutes les fenêtres qui contiennent ce type
        values = [w.quality_per_type[type].features[feature] for w in all_windows if type in w.quality_per_type]
        gb_scores = [w.gb_score_window for w in corresponding_windows]
        corr = spearman(values, gb_scores)
        if abs(corr) > 0.15:
            print(f"{type}.{feature} → GB corr = {corr:.3f}")
```

Cela produit un tableau de type :

```
TYPE          FEATURE                   CORR_GB   RANK  INTERPRETATION
action        f1a_rhythm_variance       +0.42      1    Plus le rythme varie dans l'action, meilleur le score
action        f26b_long_sent_rate       +0.38      2    Des phrases longues dans l'action = sophistication
action        f17_knife_count           +0.31      3    Des phrases-couteaux = impact
action        f29d_ttr_score            -0.28      4    TTR bas = vocabulaire brut = meilleur en action
description   f1a_rhythm_variance       +0.35      1    Variance rythme dans les descriptions = pas monotone
description   f_tension_density         +0.30      2    De la tension dans la description = pas statique
introspection f_lexical_progression     +0.40      1    La pensée progresse, ne tourne pas en rond
introspection f29d_ttr_score            -0.25      2    Vocabulaire précis, pas diversifié artificiellement
narration     f_causal_density          +0.38      1    La narration est causale, pas juste séquentielle
narration     f_referent_continuity     +0.32      2    Les références se suivent, pas d'orphelins
```

## LIVRABLE

```
packages/sovereign-engine/src/scoring/data/TYPE_FEATURE_IMPORTANCE.json
```

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 4 — LA DYNAMIQUE : INTERACTIONS ENTRE TYPES
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

C'est le cœur de la demande de l'Architecte.

Quand 2 phrases d'action (f35=28%, f31=18%) sont mélangées avec 3 phrases
de narration (f12=54%, f35=21%) dans un chapitre, QUE SE PASSE-T-IL ?

Les features s'ADDITIONNENT-elles ? Se MULTIPLIENT ? S'ANNULENT ? 
Se TRANSFORMENT en autre chose ? Certaines en ATTÉNUENT d'autres ?

On ne le sait PAS. On va le MESURER.

## MÉTHODE

### 4.1 — Mesure des features au niveau FENÊTRE vs AU NIVEAU TYPE

Pour chaque fenêtre de 20 phrases :

1. Calculer les features GB V1 sur la FENÊTRE ENTIÈRE (20 phrases mélangées)
   → C'est le score "global" : feature_window[f]

2. Calculer les features GB V1 sur CHAQUE TYPE SÉPARÉMENT
   → action_features[f], description_features[f], etc.

3. Calculer la MOYENNE PONDÉRÉE théorique :
   → predicted_additive[f] = Σ (pct_type × type_features[f])
   
   Exemple : si la fenêtre est 40% action + 60% narration :
   predicted_additive[f1a] = 0.4 × action_f1a + 0.6 × narration_f1a

4. Calculer le DELTA entre la réalité et le modèle additif :
   → delta[f] = feature_window[f] - predicted_additive[f]

Ce delta est LA MESURE DE L'INTERACTION.

- Si delta ≈ 0 → la feature est ADDITIVE (pas d'interaction)
- Si delta > 0 → les types se RENFORCENT sur cette feature (synergie)
- Si delta < 0 → les types s'ATTÉNUENT sur cette feature (annulation)
- Si |delta| est très grand → il y a une TRANSFORMATION non linéaire

### 4.2 — Construire la matrice d'interaction

Pour chaque PAIRE de types (action×narration, action×description, etc.)
et pour chaque feature :

```typescript
interface FeatureInteraction {
  type_a: SentenceType;
  type_b: SentenceType;
  feature: string;
  // Mesuré sur toutes les fenêtres qui contiennent les deux types
  mean_delta: number;            // delta moyen (synergie ou atténuation)
  std_delta: number;             // variabilité
  operator: 'ADDITIVE' | 'SYNERGY' | 'ATTENUATION' | 'TRANSFORMATION' | 'NEUTRAL';
  // Seuils de composition où l'interaction change de nature
  interaction_curve?: {
    pct_a_range: [number, number]; // ex: action entre 30% et 50%
    pct_b_range: [number, number]; // ex: narration entre 40% et 60%
    delta_in_range: number;        // delta dans cette zone
    delta_outside: number;         // delta hors de cette zone
  };
}
```

Concrètement, on collecte TOUTES les fenêtres qui contiennent à la fois action et narration.
On calcule le delta pour chaque feature.
On moyenne.

Exemple de résultat possible :

```
PAIR               FEATURE              DELTA   OPERATOR        INTERPRETATION
─────────────────────────────────────────────────────────────────────────────────
action × narration f1a_rhythm_variance  +2.4    SYNERGY         Le mélange action+narration AUGMENTE la variance
action × narration f29d_ttr_score       -0.02   ATTENUATION     Le mélange action+narration RÉDUIT le TTR
action × descript. f1a_rhythm_variance  +0.1    NEUTRAL         Pas d'interaction significative
action × descript. f_tension_density    +0.8    SYNERGY         Action+description CRÉE de la tension
action × intro.    f26b_long_sent_rate  +0.05   SYNERGY         L'introspection allonge les phrases d'action
action × intro.    f_lexical_progress.  +1.2    TRANSFORMATION  Le mélange crée une progression impossible seul
descript. × intro.  f_referent_contin.  +0.3    SYNERGY         Description+introspection renforce la continuité
descript. × intro.  f1a_rhythm_var.     -1.1    ATTENUATION     Le mélange réduit la variance (aplanit)
```

### 4.3 — Découvrir les zones de bascule

Pour chaque paire de types et chaque feature d'interaction significative :

Faire varier le % du type A de 0% à 100% (par tranches de 10%)
et mesurer comment le delta évolue :

```
action %    narration %    f1a delta    f_tension delta    GB delta
0           100            0.0          0.0                 baseline
10          90             +0.3         +0.1               +0.05
20          80             +0.8         +0.3               +0.12
30          70             +1.5         +0.6               +0.25  ← sweetspot début
40          60             +2.4         +0.9               +0.38  ← maximum
50          50             +2.1         +0.7               +0.30
60          40             +1.3         +0.3               +0.15
70          30             +0.5         -0.1               -0.10  ← bascule : trop d'action tue la tension
80          20             -0.2         -0.5               -0.35
90          10             -0.8         -0.8               -0.50
100         0              0.0          0.0                 baseline
```

Cela produit des COURBES DE RÉPONSE qui montrent :
- Le SWEETSPOT (zone où le mélange produit la meilleure synergie)
- Le POINT DE BASCULE (où le mélange cesse d'être bénéfique)
- La ZONE TOXIQUE (où le mélange dégrade)

### 4.4 — Matrice de compatibilité type × type

Synthétiser en une matrice simple :

```
              ACTION    DESCRIPT.   NARRATION   INTRO.    DIALOGUE
ACTION         —        +0.15       +0.38       +0.42     +0.20
DESCRIPTION   +0.15      —          +0.10       +0.35     -0.05
NARRATION     +0.38     +0.10        —          +0.22     +0.18
INTROSPECTION +0.42     +0.35       +0.22        —        +0.28
DIALOGUE      +0.20     -0.05       +0.18       +0.28      —
```

Valeur = synergie moyenne sur le GB V1 quand les deux types sont mélangés.
Positif = le mélange est meilleur que la somme des parties.
Négatif = le mélange dégrade.

### 4.5 — Opérateurs par feature

Pour chaque feature, déterminer son OPÉRATEUR DOMINANT dans les mélanges :

```typescript
interface FeatureOperator {
  feature: string;
  dominant_operator: 'ADDITIVE' | 'SYNERGISTIC' | 'ATTENUATING' | 'TRANSFORMATIVE';
  explanation: string;
  // Exemple concret du corpus
  example: {
    novel: string;
    window_position: number;
    types_present: Record<SentenceType, number>;
    feature_per_type: Record<SentenceType, number>;
    feature_mixed: number;
    predicted_additive: number;
    actual_delta: number;
  };
}
```

Exemples possibles (à DÉCOUVRIR, pas à inventer) :

```
f1a_rhythm_variance : SYNERGISTIC
  "Quand action et introspection sont mélangées, la variance rythmique
   est 40% SUPÉRIEURE à la moyenne pondérée. Le contraste entre les
   phrases courtes d'action et les longues d'introspection crée une
   variance que ni l'un ni l'autre ne produit seul."

f29d_ttr_score : ATTENUATING
  "Quand action et narration sont mélangées, le TTR BAISSE par rapport
   à la moyenne pondérée. Le vocabulaire d'action (répétitif, physique)
   tire vers le bas celui de la narration."

f_tension_density : TRANSFORMATIVE
  "Quand description et introspection sont mélangées à 40/60, la tension
   est 3× SUPÉRIEURE à ce que chacun produit seul. Le mélange CRÉE
   de la tension que les types isolés ne contiennent pas."

f26b_long_sent_rate : ADDITIVE
  "Les phrases longues s'additionnent simplement. Pas d'interaction."
```

## LIVRABLES PHASE 4

```
packages/sovereign-engine/src/scoring/data/FEATURE_INTERACTION_MATRIX.json
packages/sovereign-engine/src/scoring/data/COMPOSITION_RESPONSE_CURVES.json
packages/sovereign-engine/src/scoring/data/TYPE_COMPATIBILITY_MATRIX.json
```

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 5 — CALIBRATION ET PREUVES SUR 20 OEUVRES CONNUES
# ═══════════════════════════════════════════════════════════════════════════════

## OBJECTIF

Prouver que TOUT l'instrument est juste.

## 5.1 — Sanity checks classifieur (20 œuvres)

Pour chaque œuvre connue, vérifier que les distributions de types font sens.

```typescript
const SANITY_CHECKS = [
  { file: 'flaubert_bovary_14155.txt', name: 'Madame Bovary',
    checks: [
      { type: 'description', op: '>', val: 15, reason: 'Flaubert = descriptions' },
      { type: 'dialogue', op: '>', val: 5, reason: 'Bovary a des dialogues' },
      { type: 'narration', op: '>', val: 20, reason: 'Roman narratif' },
    ]},
  { file: 'dostoievski_crime_36034.txt', name: 'Crime et Châtiment',
    checks: [
      { type: 'introspection', op: '>', val: 15, reason: 'Raskolnikov' },
      { type: 'dialogue', op: '>', val: 10, reason: 'Confrontations' },
      { type: 'action', op: '>', val: 5, reason: 'Meurtre' },
    ]},
  { file: 'hugo_miserables_17489.txt', name: 'Les Misérables',
    checks: [
      { type: 'action', op: '>', val: 8, reason: 'Barricades, Waterloo' },
      { type: 'description', op: '>', val: 10, reason: 'Descriptions Hugo' },
      { type: 'narration', op: '>', val: 15, reason: 'Épopée' },
      { type: 'dialogue', op: '>', val: 8, reason: 'Dialogues' },
    ]},
  { file: 'proust_swann_2650.txt', name: 'Swann',
    checks: [
      { type: 'introspection', op: '>', val: 15, reason: 'Mémoire involontaire' },
      { type: 'description', op: '>', val: 15, reason: 'Descriptions' },
      { type: 'action', op: '<', val: 15, reason: 'Peu d action' },
    ]},
  { file: 'dumas_monte_cristo_17989.txt', name: 'Monte-Cristo',
    checks: [
      { type: 'action', op: '>', val: 8, reason: 'Aventure' },
      { type: 'dialogue', op: '>', val: 15, reason: 'Très dialogué' },
    ]},
  { file: 'pdf_blood_meridian_cormac_mccarthy.txt', name: 'Blood Meridian',
    checks: [
      { type: 'action', op: '>', val: 15, reason: 'Violence extrême' },
      { type: 'description', op: '>', val: 10, reason: 'Paysages' },
    ]},
  { file: 'letranger_french_edition_albert_camus.txt', name: 'L Étranger',
    checks: [{ type: 'narration', op: '>', val: 20, reason: 'Récit factuel' }]},
  { file: 'la_peste_french_edition_albert_camus.txt', name: 'La Peste',
    checks: [{ type: 'narration', op: '>', val: 20, reason: 'Chronique' }]},
  { file: 'kafka_proces_69327.txt', name: 'Le Procès',
    checks: [
      { type: 'introspection', op: '>', val: 10, reason: 'Angoisse K.' },
      { type: 'dialogue', op: '>', val: 10, reason: 'Interrogatoires' },
    ]},
  { file: 'stendhal_chartreuse_7524.txt', name: 'Chartreuse de Parme',
    checks: [
      { type: 'narration', op: '>', val: 20, reason: 'Récit stendhalien' },
      { type: 'action', op: '>', val: 5, reason: 'Waterloo' },
    ]},
  { file: 'zola_bete_10007.txt', name: 'La Bête Humaine',
    checks: [
      { type: 'action', op: '>', val: 8, reason: 'Accidents, meurtres' },
      { type: 'description', op: '>', val: 8, reason: 'Industriel' },
    ]},
  { file: 'notre_dame_de_paris_victor_hugo.txt', name: 'Notre-Dame',
    checks: [{ type: 'description', op: '>', val: 12, reason: 'Architecture' }]},
  { file: 'maupassant_bel_ami_3088.txt', name: 'Bel-Ami',
    checks: [
      { type: 'dialogue', op: '>', val: 12, reason: 'Conversations' },
      { type: 'narration', op: '>', val: 20, reason: 'Ascension' },
    ]},
  { file: 'balzac_illusions_13141.txt', name: 'Illusions perdues',
    checks: [
      { type: 'narration', op: '>', val: 15, reason: 'Balzac narratif' },
      { type: 'dialogue', op: '>', val: 8, reason: 'Dialogues' },
    ]},
  { file: 'pdf_the_sun_also_rises_ernest_hemingway.txt', name: 'Sun Also Rises',
    checks: [
      { type: 'dialogue', op: '>', val: 15, reason: 'Hemingway dialogues' },
      { type: 'description', op: '<', val: 25, reason: 'Style sec' },
    ]},
  { file: 'pdf_mrs_dalloway_virginia_woolf.txt', name: 'Mrs Dalloway',
    checks: [{ type: 'introspection', op: '>', val: 20, reason: 'Stream of consciousness' }]},
  { file: 'dickens_two_cities_98.txt', name: 'Two Cities',
    checks: [
      { type: 'narration', op: '>', val: 15, reason: 'Récit historique' },
      { type: 'action', op: '>', val: 5, reason: 'Révolution' },
    ]},
  { file: 'flaubert_salammbo_10884.txt', name: 'Salammbô',
    checks: [
      { type: 'description', op: '>', val: 12, reason: 'Orientalisme' },
      { type: 'action', op: '>', val: 8, reason: 'Batailles' },
    ]},
  { file: 'bronte_e_wuthering_768.txt', name: 'Wuthering Heights',
    checks: [{ type: 'dialogue', op: '>', val: 10, reason: 'Dialogues' }]},
  { file: 'flaubert_education_14285.txt', name: 'Éducation sentimentale',
    checks: [
      { type: 'description', op: '>', val: 12, reason: 'Paris' },
      { type: 'narration', op: '>', val: 15, reason: 'Narratif' },
    ]},
];
```

## 5.2 — Vérification compositions

Pour 5 œuvres clés, vérifier que les profils de composition DÉCOUVERTS font sens :

- Dostoïevski Crime : doit contenir des fenêtres "INTRIGUE" (action + introspection mélangées)
- Proust Swann : doit contenir des fenêtres "CONTEMPLATION" (description + introspection)
- McCarthy Blood Meridian : doit contenir des fenêtres "ACTION PURE"
- Hugo Misérables : doit contenir TOUS les profils (roman total)
- Maupassant Bel-Ami : doit contenir des fenêtres "SCÈNE DRAMATIQUE" (dialogue + narration)

## 5.3 — Vérification interactions

Vérifier que les interactions découvertes sont PLAUSIBLES :
- La synergie action × introspection DOIT être positive (c'est la base de l'intrigue)
- L'atténuation description × action sur le rythme DOIT exister (la description ralentit)
- La matrice de compatibilité DOIT montrer que action × introspection > action × action

## 5.4 — Bench MOCK + 8 proses LLM

- GB V1 et V3 IDENTIQUES (le classifieur ne change pas le scoring)
- Types maintenant crédibles et variés
- Compositions affichées

## 5.5 — Tests existants

```bash
npm test
# 1911 tests PASS, zéro régression
```

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 6 — RAPPORT FINAL ET LIVRABLES
# ═══════════════════════════════════════════════════════════════════════════════

## Scripts à créer

| Script | Rôle |
|--------|------|
| scripts/calibrate-full.ts | Scanner corpus entier, produire tous les JSON |
| scripts/classify-test.ts | Test classifieur sur un fichier |
| scripts/composition-explorer.ts | Explorer les profils de composition d'un roman |

## Fichiers de données à produire

| Fichier | Contenu |
|---------|---------|
| data/CLASSIFIER_CALIBRATION_V2.json | Distributions tous romans + sanity checks |
| data/COMPOSITION_PROFILES.json | Profils émergents + GB corrélation |
| data/TYPE_FEATURE_IMPORTANCE.json | Features par type corrélées au GB |
| data/FEATURE_INTERACTION_MATRIX.json | Interactions entre types par feature |
| data/COMPOSITION_RESPONSE_CURVES.json | Courbes de réponse % type → delta GB |
| data/TYPE_COMPATIBILITY_MATRIX.json | Matrice synergie type × type |

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| src/scoring/passage-classifier.ts | RÉÉCRIT — tagging par phrase |

## Tests à créer

| Test | Contenu |
|------|---------|
| tests/art/passage-classifier-v2.test.ts | Tests unitaires 5 types + détaillé |
| tests/art/composition-profiles.test.ts | Tests profils et interactions |

## Commit final

```bash
git add -A
git commit -m "feat(R-LAB-TYPE-V2): literary physics — 4 levels

LEVEL 1 (atoms): sentence-level tagging with contextual verification
LEVEL 2 (molecules): composition profiles from corpus-wide clustering
LEVEL 3 (reactions): feature quality per type correlated with GB V1
LEVEL 4 (dynamics): feature interaction matrix between types
  - Operators: ADDITIVE / SYNERGY / ATTENUATION / TRANSFORMATION
  - Response curves: % type → delta GB
  - Compatibility matrix: type × type → synergy score
  - Sweetspots and deadzones mapped

Corpus: X novels, Y sentences tagged, Z windows analyzed
Sanity checks: X/Y PASS on 20 known works
Interactions: X significant feature×type pairs discovered
1911 tests PASS, zero regressions, GB V1 unchanged"
git tag r-lab-type-v2-physics-complete
```

# ═══════════════════════════════════════════════════════════════════════════════
# CRITÈRES DE SORTIE (TOUS OBLIGATOIRES)
# ═══════════════════════════════════════════════════════════════════════════════

- [ ] Classifieur réécrit au niveau PHRASE avec double vérification
- [ ] Corpus ENTIER scanné (~400 textes, toutes phrases taggées)
- [ ] Profils de composition DÉCOUVERTS (clustering, pas inventés)
- [ ] Features par type MESURÉES et corrélées au GB V1
- [ ] MATRICE D'INTERACTION entre types calculée (10 paires × 42 features)
- [ ] OPÉRATEURS par feature identifiés (additif/synergique/atténuant/transformatif)
- [ ] COURBES DE RÉPONSE : % type → delta GB (sweetspots + bascules)
- [ ] MATRICE DE COMPATIBILITÉ type × type
- [ ] Sanity checks 20 œuvres : TOUS PASS
- [ ] Bench MOCK : GB V1 inchangé, types crédibles
- [ ] 8 proses LLM reclassées avec compositions
- [ ] 1911 tests PASS, zéro régression
- [ ] 6 fichiers JSON de données produits
- [ ] Commit + tag r-lab-type-v2-physics-complete

# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLES D'EXÉCUTION
# ═══════════════════════════════════════════════════════════════════════════════

ORDRE : Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
NE PAS sauter de phase. NE PAS inventer de résultats.

FICHIERS INTERDITS DE MODIFICATION :
- gb-inference.ts, gb-scorer.ts, text-features.ts
- depth-features.ts, semantic-depth-features.ts
- data/GB_V1_MODEL.json, engine.ts

CHEMINS :
- Corpus : omega-autopsie/corpus_r/txt/
- Classifieur : packages/sovereign-engine/src/scoring/passage-classifier.ts
- Data : packages/sovereign-engine/src/scoring/data/
- Scripts : packages/sovereign-engine/scripts/
- Tests : packages/sovereign-engine/tests/art/

SI BLOCAGE :
- Fichier illisible → SKIP et documenter
- Trop peu de fenêtres d'un profil → documenter, ne pas forcer
- Corrélation trop faible → documenter honnêtement
- Clustering difficile → tester K=6,8,10,12, documenter le choix

PRENDRE LE TEMPS NÉCESSAIRE. Ce prompt est le plus important du projet.
Scanner 400 textes prend du temps. Calculer les interactions aussi.
PAS DE RACCOURCIS. La qualité de ces données détermine tout le reste.

# ═══════════════════════════════════════════════════════════════════════════════
# FIN — LA LITTÉRATURE EST DE LA CHIMIE, PAS DE LA GÉOMÉTRIE
# ═══════════════════════════════════════════════════════════════════════════════
#
# "On ne mélange pas des atomes au hasard. On comprend la chimie."
# "Farine + eau = pâte. Farine + eau + chaleur + temps = pain."
# "Action + description ≠ 'un bloc d'action et un bloc de description'."
# "Action + description = peut-être une intrigue. Peut-être du bruit."
# "La différence est dans la qualité des ingrédients et la recette."
#
# ═══════════════════════════════════════════════════════════════════════════════
