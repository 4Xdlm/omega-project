# ═══════════════════════════════════════════════════════════════════════════════
#
#  ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗
# ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗
# ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║
# ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║
# ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║
#  ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝
#
#     CLAUDE CODE — MISSION PROMPT
#     PHASE S : SOVEREIGN STYLE ENGINE
#     "La machine qui fait pleurer les auteurs humains"
#
#     Standard: NASA-Grade L4 / DO-178C
#     Autorité: Francky (Architecte Suprême)
#
# ═══════════════════════════════════════════════════════════════════════════════

## 🎯 MISSION

Tu es Claude Code. Tu vas construire le module le plus important d'OMEGA : le **Sovereign Style Engine** — un moteur d'écriture industriel qui produit de la prose de niveau prix littéraire, mesurée, prouvée, tracée. Ce module est la vitrine d'OMEGA. Il doit être **magistral**.

Ce n'est pas un pipeline qui "passe". C'est une **forge** qui produit de la littérature sous contrainte émotionnelle 14D mesurée, avec correction chirurgicale, sélection stratégique, et rejet impitoyable de tout ce qui est médiocre.

**Seuil souverain : 92/100. Absolu. Non négociable. Si 91.9 → REJECT.**

---

## 📍 CONTEXTE REPO

```
Monorepo: C:\Users\elric\omega-project\
Package manager: npm workspaces
Language: TypeScript strict (ES2022, ESNext modules)
Test framework: Vitest
Hash: @omega/canon-kernel → canonicalize() + sha256()
```

### Packages existants à utiliser (NE PAS RÉÉCRIRE) :

| Package | Import | Fonctions clés à brancher |
|---------|--------|---------------------------|
| `@omega/canon-kernel` | `import { canonicalize, sha256 } from '@omega/canon-kernel'` | `canonicalize()`, `sha256()` |
| `@omega/genesis-planner` | `import type { GenesisPlan, Scene, Beat, ... } from '@omega/genesis-planner'` | Types du plan narratif |
| `@omega/genome` | `import { EMOTION14_ORDERED } from '@omega/genome'` | 14 émotions canoniques, `normalizeDistribution()` |
| `@omega/omega-forge` | Voir ci-dessous | **14+ fonctions 14D à brancher** |

### Fonctions @omega/omega-forge à brancher (CRITIQUES) :

```typescript
// EMOTION SPACE (physics/emotion-space.ts)
import {
  cosineSimilarity14D,    // Similarité entre vecteurs R14
  euclideanDistance14D,    // Distance entre états émotionnels
  computeValence,         // Valence ±1 depuis état 14D
  computeArousal,         // Arousal 0-1 depuis état 14D
  dominantEmotion,        // Émotion dominante d'un vecteur
  singleEmotionState,     // Vecteur 14D à partir d'un nom d'émotion
  zeroState,              // État 14D vide
  isValidState,           // Validation état 14D
  EMOTION_14_KEYS,        // Les 14 clés
  EMOTION_POLARITY,       // Polarité par émotion
} from '@omega/omega-forge';

// TRAJECTORY (physics/trajectory-analyzer.ts)
import {
  buildPrescribedTrajectory,  // État 14D cible PAR PARAGRAPHE depuis GenesisPlan
  analyzeEmotionFromText,     // État 14D depuis texte (keyword matching)
  buildActualTrajectory,      // Trajectoire réelle depuis prose
  computeDeviations,          // Déviations target vs actual
} from '@omega/omega-forge';

// OMEGA STATE
import { toOmegaState } from '@omega/omega-forge';

// QUALITY METRICS (existantes)
import { computeM8, computeM9 } from '@omega/omega-forge';  // necessity + semantic density

// TYPES
import type {
  EmotionState14D, Emotion14, OmegaState,
  ParagraphEmotionState, PrescribedState, TrajectoryDeviation,
} from '@omega/omega-forge';
```

### Types genesis-planner (existants) :

```typescript
import type {
  GenesisPlan, Arc, Scene, Beat, Seed, SubtextLayer,
  Canon, CanonEntry, Constraints, StyleGenomeInput, EmotionTarget,
  EmotionWaypoint, POV, Tense, ConflictType, SubtextTensionType,
} from '@omega/genesis-planner';
```

### Types genome (existants) :

```typescript
// ATTENTION : @omega/genome utilise Emotion14 avec 14 valeurs DIFFÉRENTES de @omega/omega-forge
// @omega/genome:  joy, sadness, anger, fear, surprise, disgust, trust, anticipation, love, guilt, shame, pride, envy, hope
// @omega/omega-forge: joy, trust, fear, surprise, sadness, disgust, anger, anticipation, love, submission, awe, disapproval, remorse, contempt
// Le module Sovereign doit gérer cette différence avec un mapping/adapter
```

---

## 🏗 STRUCTURE À CRÉER

```
packages/sovereign-engine/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                         # Public API exports
│   ├── types.ts                         # Toutes les interfaces Sovereign
│   ├── config.ts                        # Configuration souveraine (seuils, poids, tiers)
│   │
│   ├── input/                           # S0-A : FORGE PACKET
│   │   ├── forge-packet-assembler.ts    # Assemble FORGE_PACKET depuis GenesisPlan
│   │   ├── pre-write-validator.ts       # FAIL dur si incomplet + auto-fill dérivables
│   │   ├── pre-write-simulator.ts       # SCENE_BATTLE_PLAN (0 token)
│   │   ├── prompt-assembler-v2.ts       # buildSovereignPrompt() — 12 sections fixes
│   │   └── emotion-adapter.ts           # Mapping genome↔forge emotion types
│   │
│   ├── delta/                           # S0-B : DELTA REPORT
│   │   ├── delta-report.ts              # Orchestrateur delta
│   │   ├── delta-emotion.ts             # Distance 14D cible vs réel par quartile
│   │   ├── delta-tension.ts             # Pente, pic, faille, conséquence
│   │   ├── delta-style.ts              # Gini, densité, abstraction, signature
│   │   └── delta-cliche.ts             # Scan blacklist
│   │
│   ├── oracle/                          # S1 : S-ORACLE V2
│   │   ├── aesthetic-oracle.ts          # Orchestrateur 9 axes, score 0-100
│   │   ├── axes/
│   │   │   ├── interiority.ts           # Axe 1 — LLM-judge (poids ×2.0)
│   │   │   ├── tension-14d.ts           # Axe 2 — CALC (poids ×3.0) — ARME NUCLÉAIRE
│   │   │   ├── sensory-density.ts       # Axe 3 — HYBRID (poids ×1.5)
│   │   │   ├── necessity.ts             # Axe 4 — LLM-judge (poids ×1.0)
│   │   │   ├── anti-cliche.ts           # Axe 5 — CALC (poids ×1.0)
│   │   │   ├── rhythm.ts               # Axe 6 — CALC (poids ×1.0)
│   │   │   ├── signature.ts            # Axe 7 — CALC (poids ×1.0)
│   │   │   ├── impact.ts               # Axe 8 — LLM-judge (poids ×2.0)
│   │   │   └── emotion-coherence.ts    # Axe 9 — CALC (poids ×2.5)
│   │   └── s-score.ts                  # Calcul composite pondéré
│   │
│   ├── pitch/                           # S0-C : TRIPLE PITCH
│   │   ├── triple-pitch.ts             # Génère 3 plans de correction
│   │   ├── pitch-oracle.ts             # Score chaque pitch, sélectionne le meilleur
│   │   ├── patch-engine.ts             # Applique pitch sélectionné
│   │   ├── correction-catalog.ts       # 12 ops fermées, typées
│   │   └── sovereign-loop.ts           # Boucle delta→pitch→patch→rescore (max 2)
│   │
│   ├── duel/                            # S2 : DUEL ENGINE
│   │   ├── duel-engine.ts              # Multi-draft + segmentation + scoring + fusion
│   │   └── draft-modes.ts             # Prompts variantes A/B/C
│   │
│   ├── polish/                          # S2 : POLISSAGE FINAL
│   │   ├── musical-engine.ts           # Analyse + correction rythmique
│   │   ├── anti-cliche-sweep.ts        # Scan + remplacement borné
│   │   └── signature-enforcement.ts    # Distance genome + micro-corrections
│   │
│   ├── data/                            # DONNÉES VERSIONNÉES
│   │   ├── cliche-blacklist.json        # 300+ patterns FR + EN
│   │   ├── sensory-lexicon.json         # Marqueurs sensoriels par catégorie
│   │   ├── ai-patterns.json            # Patterns IA à bannir
│   │   └── filter-words.json           # Filter words (il vit, elle sentit...)
│   │
│   └── engine.ts                        # Orchestrateur principal — runSovereignForge()
│
└── tests/
    ├── input/
    │   ├── forge-packet-assembler.test.ts
    │   ├── pre-write-validator.test.ts
    │   ├── pre-write-simulator.test.ts
    │   └── prompt-assembler-v2.test.ts
    ├── delta/
    │   ├── delta-report.test.ts
    │   ├── delta-emotion.test.ts
    │   ├── delta-tension.test.ts
    │   ├── delta-style.test.ts
    │   └── delta-cliche.test.ts
    ├── oracle/
    │   ├── aesthetic-oracle.test.ts
    │   ├── axes/
    │   │   ├── tension-14d.test.ts
    │   │   ├── anti-cliche.test.ts
    │   │   ├── rhythm.test.ts
    │   │   ├── signature.test.ts
    │   │   └── emotion-coherence.test.ts
    │   └── s-score.test.ts
    ├── pitch/
    │   ├── triple-pitch.test.ts
    │   ├── pitch-oracle.test.ts
    │   ├── correction-catalog.test.ts
    │   └── sovereign-loop.test.ts
    ├── duel/
    │   └── duel-engine.test.ts
    ├── polish/
    │   ├── musical-engine.test.ts
    │   ├── anti-cliche-sweep.test.ts
    │   └── signature-enforcement.test.ts
    ├── engine.test.ts
    └── fixtures/
        ├── mock-plan.ts                # GenesisPlan complet pour tests
        ├── mock-prose.ts               # Prose de test (bonne + mauvaise)
        └── mock-style-profile.ts       # STYLE_PROFILE de test
```

---

## 📋 TYPES À DÉFINIR (src/types.ts)

### ForgePacket — Le contrat d'entrée

```typescript
export interface ForgePacket {
  readonly packet_id: string;
  readonly packet_hash: string;
  readonly scene_id: string;
  readonly run_id: string;
  readonly quality_tier: QualityTier;

  readonly intent: ForgeIntent;
  readonly emotion_contract: EmotionContract;
  readonly beats: readonly ForgeBeat[];
  readonly subtext: ForgeSubtext;
  readonly sensory: ForgeSensory;
  readonly style_genome: StyleProfile;
  readonly kill_lists: KillLists;
  readonly canon: readonly { id: string; statement: string }[];
  readonly continuity: ForgeContinuity;
  readonly seeds: ForgeSeeds;
  readonly generation: ForgeGeneration;
}

export type QualityTier = 'sovereign';  // Un seul mode. OMEGA ne fait que le top.

export interface EmotionContract {
  readonly curve_quartiles: readonly [
    EmotionQuartile, EmotionQuartile, EmotionQuartile, EmotionQuartile
  ];
  readonly intensity_range: { readonly min: number; readonly max: number };
  readonly tension: TensionTargets;
  readonly terminal_state: EmotionTerminal;
  readonly rupture: EmotionRupture;
  readonly valence_arc: ValenceArc;
}

export interface EmotionQuartile {
  readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly target_14d: Record<string, number>;  // Emotion14 → intensity
  readonly valence: number;
  readonly arousal: number;
  readonly dominant: string;
  readonly narrative_instruction: string;  // Ex: "La menace se cristallise"
}

export interface TensionTargets {
  readonly slope_target: 'ascending' | 'descending' | 'arc' | 'reverse_arc';
  readonly pic_position_pct: number;
  readonly faille_position_pct: number;
  readonly silence_zones: readonly { start_pct: number; end_pct: number }[];
}

export interface EmotionTerminal {
  readonly target_14d: Record<string, number>;
  readonly valence: number;
  readonly arousal: number;
  readonly dominant: string;
  readonly reader_state: string;  // "grief that looks forward"
}

export interface EmotionRupture {
  readonly exists: boolean;
  readonly position_pct: number;
  readonly before_dominant: string;
  readonly after_dominant: string;
  readonly delta_valence: number;
}

export interface ValenceArc {
  readonly start: number;
  readonly end: number;
  readonly direction: 'darkening' | 'brightening' | 'stable' | 'oscillating';
}

export interface StyleProfile {
  readonly version: string;
  readonly universe: string;
  readonly lexicon: {
    readonly signature_words: readonly string[];
    readonly forbidden_words: readonly string[];
    readonly abstraction_max_ratio: number;
    readonly concrete_min_ratio: number;
  };
  readonly rhythm: {
    readonly avg_sentence_length_target: number;
    readonly gini_target: number;
    readonly max_consecutive_similar: number;
    readonly min_syncopes_per_scene: number;
    readonly min_compressions_per_scene: number;
  };
  readonly tone: {
    readonly dominant_register: string;
    readonly intensity_range: readonly [number, number];
  };
  readonly imagery: {
    readonly recurrent_motifs: readonly string[];
    readonly density_target_per_100_words: number;
    readonly banned_metaphors: readonly string[];
  };
}

export interface KillLists {
  readonly banned_words: readonly string[];
  readonly banned_cliches: readonly string[];
  readonly banned_ai_patterns: readonly string[];
  readonly banned_filter_words: readonly string[];
}
```

### DeltaReport — La vérité froide

```typescript
export interface DeltaReport {
  readonly report_id: string;
  readonly report_hash: string;
  readonly scene_id: string;
  readonly timestamp: string;

  readonly emotion_delta: EmotionDelta;
  readonly tension_delta: TensionDelta;
  readonly style_delta: StyleDelta;
  readonly cliche_delta: ClicheDelta;
  readonly global_distance: number;  // 0-1 normalized
}

export interface EmotionDelta {
  readonly quartile_distances: readonly {
    readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    readonly euclidean_distance: number;
    readonly cosine_similarity: number;
    readonly valence_delta: number;
    readonly arousal_delta: number;
    readonly dominant_match: boolean;
  }[];
  readonly curve_correlation: number;  // Pearson -1 to 1
  readonly terminal_distance: number;
  readonly rupture_detected: boolean;
  readonly rupture_timing_error: number;  // 0 = perfect, 1 = totally wrong
}

export interface TensionDelta {
  readonly slope_match: number;  // 0-1
  readonly pic_present: boolean;
  readonly pic_timing_error: number;
  readonly faille_present: boolean;
  readonly faille_timing_error: number;
  readonly consequence_present: boolean;
  readonly monotony_score: number;  // 0 = monotone, 1 = varied
}

export interface StyleDelta {
  readonly gini_actual: number;
  readonly gini_target: number;
  readonly gini_delta: number;
  readonly sensory_density_actual: number;
  readonly sensory_density_target: number;
  readonly abstraction_ratio_actual: number;
  readonly abstraction_ratio_target: number;
  readonly signature_hit_rate: number;  // % mots signature trouvés
  readonly monotony_sequences: number;  // nb de 3+ phrases similaires consécutives
  readonly opening_repetition_rate: number;  // % phrases commençant par même mot
}

export interface ClicheDelta {
  readonly total_matches: number;
  readonly matches: readonly { pattern: string; location: string; category: string }[];
  readonly ai_pattern_matches: number;
  readonly filter_word_matches: number;
}
```

### SScore — Le score esthétique

```typescript
export interface SScore {
  readonly score_id: string;
  readonly score_hash: string;
  readonly scene_id: string;
  readonly seed: string;

  readonly axes: {
    readonly interiority: AxisScore;       // ×2.0
    readonly tension_14d: AxisScore;       // ×3.0 — ARME NUCLÉAIRE
    readonly sensory_density: AxisScore;   // ×1.5
    readonly necessity: AxisScore;         // ×1.0
    readonly anti_cliche: AxisScore;       // ×1.0
    readonly rhythm: AxisScore;            // ×1.0
    readonly signature: AxisScore;         // ×1.0
    readonly impact: AxisScore;            // ×2.0
    readonly emotion_coherence: AxisScore; // ×2.5
  };

  readonly composite: number;             // 0-100, pondéré
  readonly verdict: 'SEAL' | 'REJECT';    // ≥92 = SEAL
  readonly emotion_weight_pct: number;    // doit être ≥ 60%
}

export interface AxisScore {
  readonly name: string;
  readonly score: number;        // 0-100
  readonly weight: number;
  readonly method: 'CALC' | 'LLM' | 'HYBRID';
  readonly details: string;
}
```

### Pitch — Les corrections chirurgicales

```typescript
export type CorrectionOp =
  | 'inject_sensory_detail'
  | 'convert_dialogue_to_indirect'
  | 'add_micro_rupture_event'
  | 'tighten_sentence_rhythm'
  | 'replace_cliche'
  | 'increase_interiority_signal'
  | 'compress_exposition'
  | 'add_consequence_line'
  | 'shift_emotion_register'
  | 'inject_silence_zone'
  | 'sharpen_opening'
  | 'deepen_closing';

export interface PitchItem {
  readonly id: string;
  readonly zone: string;           // "Q2_paragraph_3"
  readonly op: CorrectionOp;
  readonly reason: string;
  readonly instruction: string;
  readonly expected_gain: { readonly axe: string; readonly delta: number };
}

export interface CorrectionPitch {
  readonly pitch_id: string;
  readonly strategy: 'emotional_intensification' | 'structural_rupture' | 'compression_musicality';
  readonly items: readonly PitchItem[];
  readonly total_expected_gain: number;
}

export interface PitchOracleResult {
  readonly pitches: readonly CorrectionPitch[];
  readonly selected_pitch_id: string;
  readonly selection_score: number;
  readonly selection_reason: string;
}
```

---

## 🔧 IMPLÉMENTATION DÉTAILLÉE DES MODULES CLÉS

### 1. forge-packet-assembler.ts

```
ENTRÉE: GenesisPlan + IntentPack + Constraints + StyleGenomeInput + EmotionTarget + StyleProfile + KillLists
SORTIE: ForgePacket (hashé, gelé)

ALGORITHME:
1. Pour chaque scène du plan:
   a. Appeler buildPrescribedTrajectory() depuis @omega/omega-forge
      → obtenir état 14D cible par paragraphe
   b. Regrouper les paragraphes en 4 quartiles (Q1=0-25%, Q2=25-50%, etc.)
   c. Pour chaque quartile: calculer le vecteur moyen 14D
   d. Pour chaque quartile: computeValence() et computeArousal()
   e. Pour chaque quartile: dominantEmotion()
   f. Depuis les beats et tension_delta, calculer:
      - position du pic (beat avec intensité max)
      - position de la faille (plus grande chute tension_delta)
      - zones de silence (séquences de beats à tension_delta = 0 ou -1)
   g. État terminal = dernier quartile Q4
   h. Rupture = plus grand delta de valence entre quartiles adjacents
   i. Valence arc = direction start→end
2. Assembler le ForgePacket avec toutes les données
3. Hasher avec sha256(canonicalize(packet))
4. Retourner le packet gelé
```

### 2. delta-emotion.ts

```
ENTRÉE: ForgePacket (cible) + prose text (réel)
SORTIE: EmotionDelta

ALGORITHME:
1. Découper la prose en paragraphes
2. Regrouper en 4 quartiles
3. Pour chaque quartile:
   a. analyzeEmotionFromText() sur le texte du quartile → état 14D réel
   b. euclideanDistance14D(cible, réel)
   c. cosineSimilarity14D(cible, réel)
   d. computeValence() sur réel, delta vs cible
   e. computeArousal() sur réel, delta vs cible
   f. dominantEmotion() → match vs cible dominant?
4. Corrélation de courbe: Pearson entre les 4 arousal cibles et les 4 réels
5. Terminal distance: euclideanDistance14D(terminal_cible, Q4_réel)
6. Rupture: chercher le plus grand delta valence entre quartiles adjacents
   → comparer position avec rupture.position_pct cible
```

### 3. axes/tension-14d.ts (AXE 2 — L'ARME NUCLÉAIRE, poids ×3.0)

```
ENTRÉE: prose text, ForgePacket.emotion_contract
SORTIE: AxisScore (0-100)

ALGORITHME:
1. Découper prose en 4 quartiles
2. analyzeEmotionFromText() sur chaque quartile → 4 vecteurs 14D réels
3. buildPrescribedTrajectory() → 4 vecteurs 14D cibles
4. Pour chaque quartile: cosineSimilarity14D(cible, réel)
5. Score = moyenne des 4 similarités × 100
6. Bonus: si rupture détectée au bon timing → +10
7. Penalty: si monotone (4 quartiles similaires) → -20
8. Clamp [0, 100]

MÉTHODE: CALC PUR — 100% déterministe, 0 token, reproductible
C'EST L'AXE QUI REND OMEGA UNIQUE. Aucun autre système ne mesure la conformité
émotionnelle d'un texte à une trajectoire 14D prescrite.
```

### 4. axes/rhythm.ts (AXE 6 — CALC)

```
ENTRÉE: prose text
SORTIE: AxisScore (0-100)

ALGORITHME:
1. Split en phrases (regex: /[.!?]+/)
2. Mesurer word_count par phrase
3. Gini coefficient sur les longueurs
   Gini = (Σ|xi - xj|) / (2n²μ)
4. Détecter monotonie: 3+ phrases consécutives de longueur similaire (±20%)
5. Compter syncopes: phrase ≤5 mots après phrase ≥25 mots
6. Compter compressions: phrases ≤3 mots
7. Compter respirations: phrases ≥30 mots
8. Détecter répétition ouverture: % phrases commençant par même mot
9. Score composite:
   - Gini dans [0.35, 0.55] → 40 points max (optimum à 0.45)
   - 0 séquences monotones → 20 points
   - ≥2 syncopes → 15 points
   - ≥1 compression → 10 points
   - ≥1 respiration → 5 points
   - Ouverture variée (<10% même mot) → 10 points
```

### 5. axes/anti-cliche.ts (AXE 5 — CALC)

```
ENTRÉE: prose text, KillLists
SORTIE: AxisScore (0-100)

ALGORITHME:
1. Normaliser texte (lowercase, accents normalisés)
2. Pour chaque pattern dans banned_cliches: regex search
3. Pour chaque pattern dans banned_ai_patterns: regex search
4. Pour chaque pattern dans banned_filter_words: regex search
5. Score:
   - 0 matchs → 100
   - 1-2 matchs → 80
   - 3-5 matchs → 50
   - 6+ matchs → 0
6. Retourner avec details listant chaque match trouvé
```

### 6. triple-pitch.ts

```
ENTRÉE: DeltaReport
SORTIE: 3 CorrectionPitch

ALGORITHME:
Pour chaque stratégie (A=émotionnelle, B=structurelle, C=musicale):
1. Analyser le DeltaReport
2. Identifier les axes les plus faibles
3. Pour chaque faiblesse (max 8 par pitch):
   a. Choisir une op dans le CATALOGUE FERMÉ de 12 ops
   b. Cibler la zone (quartile + paragraphe approximatif)
   c. Formuler l'instruction
   d. Estimer le gain

Pitch A se concentre sur: shift_emotion_register, increase_interiority_signal, inject_sensory_detail
Pitch B se concentre sur: add_micro_rupture_event, add_consequence_line, compress_exposition
Pitch C se concentre sur: tighten_sentence_rhythm, inject_silence_zone, sharpen_opening, deepen_closing
```

### 7. pitch-oracle.ts

```
ENTRÉE: 3 CorrectionPitch + DeltaReport
SORTIE: PitchOracleResult

ALGORITHME:
Pour chaque pitch:
  score = Σ(item.expected_gain.delta × gravity[item.expected_gain.axe])
  gravity = poids S-ORACLE de l'axe ciblé (tension=3.0, intériorité=2.0, etc.)

Sélectionner le pitch avec le score le plus élevé.
100% déterministe. Pas de LLM.
```

### 8. sovereign-loop.ts (BOUCLE PRINCIPALE)

```
ENTRÉE: prose (après hard gate), ForgePacket, max_passes=2
SORTIE: { final_prose, s_score_initial, s_score_final, pitches_applied, verdict }

ALGORITHME:
1. Calculer DELTA_REPORT
2. Calculer S_SCORE initial
3. Si score ≥ 92 → SEAL, sortir
4. Sinon:
   a. Générer TRIPLE_PITCH depuis delta
   b. PITCH_ORACLE sélectionne
   c. PATCH_ENGINE applique (appel LLM avec pitch + prose + interdits)
   d. Re-calculer DELTA + S_SCORE
   e. Si score ≥ 92 → SEAL
   f. Si passe < max_passes → reboucler
   g. Sinon → si score ≥ 60 garde meilleur draft, sinon REJECT
```

---

## 📊 DONNÉES (src/data/)

### cliche-blacklist.json — MINIMUM 300 patterns

Créer un fichier JSON avec 300+ patterns catégorisés. Inclure :

**FR** (priorité — OMEGA écrit d'abord en français) :
- Expressions figées: "un silence pesant", "le cœur battant", "le temps s'arrêta", "un frisson parcourut son échine", "le sang se glaça dans ses veines", "les larmes coulèrent", "un silence de mort", "le monde s'écroula", "son sang ne fit qu'un tour", "elle retint son souffle", "ses yeux s'écarquillèrent", "il n'en croyait pas ses yeux", "un sourire se dessina sur ses lèvres", "la peur au ventre", "le souffle coupé", "les jambes tremblantes", "le visage décomposé", "les mots lui manquaient", "la gorge serrée", "les yeux embués"...
- Métaphores usées: "un océan de larmes", "un tourbillon d'émotions", "une vague de panique", "une mer de", "un torrent de", "une pluie de", "un voile de tristesse", "les ténèbres de l'âme", "la lumière au bout du tunnel", "un gouffre s'ouvrit"...
- Patterns IA: "Dans l'air flottait", "Un frisson parcourut", "Quelque chose avait changé", "Il ne savait pas encore que", "C'est alors que", "Sans qu'il s'en rende compte", "Force est de constater", "Il faut dire que"...
- Filter words: "il sentit que", "elle remarqua que", "il vit que", "il entendit", "elle perçut", "il réalisa que", "il comprit que", "il se rendit compte"...
- Adverbes parasites: "silencieusement", "lentement", "doucement", "soudainement", "brusquement", "tranquillement", "visiblement", "apparemment", "évidemment"...

**EN** :
- "his heart pounded", "a shiver ran down", "time stood still", "blood ran cold", "tears streamed down", "silence was deafening", "breath caught in throat", "cold sweat", "the world came crashing down", "little did he know", "couldn't help but", "in that moment", "a sense of", "it was as if", "he found himself", "he began to"...
- Filter: "he saw", "she heard", "he felt", "she noticed", "he seemed to", "it appeared that", "she realized"...
- AI: "delve into", "tapestry of", "symphony of", "dance of", "testament to", "echoed through", "nestled between"...

**Catégories dans le JSON :**
```json
{
  "version": "1.0.0",
  "date": "2026-02-12",
  "total_patterns": 300,
  "categories": {
    "expressions_figees_fr": [...],
    "metaphores_usees_fr": [...],
    "patterns_ia_fr": [...],
    "filter_words_fr": [...],
    "adverbes_parasites_fr": [...],
    "ouvertures_fatiguees_fr": [...],
    "clotures_banales_fr": [...],
    "expressions_figees_en": [...],
    "metaphores_usees_en": [...],
    "patterns_ia_en": [...],
    "filter_words_en": [...],
    "adverbes_parasites_en": [...]
  }
}
```

### sensory-lexicon.json

Marqueurs sensoriels par catégorie pour scoring densité sensorielle :
- sight: couleurs, lumière, ombres, formes
- sound: bruits, musique, silence, voix
- touch: textures, températures, pressions, douleur
- smell: odeurs spécifiques (iode, diesel, cendre, métal, herbe...)
- taste: goûts (sel, cuivre, amertume, acidité...)
- proprioception: vertige, poids, gravité, équilibre
- interoception: battements cœur, estomac, poitrine, gorge

---

## 🧪 TESTS — EXIGENCES

Chaque module doit avoir des tests Vitest. Priorité aux axes CALC (100% déterministes) :

1. **tension-14d.test.ts** : Fournir un texte avec émotion montante → score élevé. Texte plat → score bas. Même texte + même seed = même score.
2. **rhythm.test.ts** : Texte avec Gini optimal → score élevé. Texte monotone → score bas.
3. **anti-cliche.test.ts** : Texte sans cliché → 100. Texte truffé → 0.
4. **signature.test.ts** : Texte conforme au genome → score élevé. Texte générique → score bas.
5. **emotion-coherence.test.ts** : Transitions smooth → score élevé. Sauts brutaux → score bas.
6. **forge-packet-assembler.test.ts** : Assembler depuis un GenesisPlan mock → vérifier tous les champs.
7. **pre-write-validator.test.ts** : Packet complet → PASS. Packet incomplet → FAIL.
8. **delta-emotion.test.ts** : Texte conforme à la cible → distance faible. Texte opposé → distance élevée.
9. **pitch-oracle.test.ts** : 3 pitches → sélectionne celui avec le meilleur score.
10. **sovereign-loop.test.ts** : Boucle max 2 passes, score croissant, verdict final.

Pour les axes LLM (1, 3, 4, 8) : fournir une interface `SovereignProvider` avec méthode mock pour les tests. En production, connecté au ScribeProvider existant.

---

## ⚙️ CONFIG (src/config.ts)

```typescript
export const SOVEREIGN_CONFIG = {
  // Seuil absolu — NON NÉGOCIABLE
  SOVEREIGN_THRESHOLD: 92,       // Composite pondéré. Si 91.9 → REJECT.
  REJECT_BELOW: 60,              // En dessous de 60 composite → REJECT même après toutes les passes
  AXIS_FLOOR: 50,                // Aucun axe individuel sous 50, même si composite ≥ 92
  // Règle: composite ≥ 92 ET tous les axes ≥ 50. Sinon REJECT.

  // Poids S-ORACLE (60% émotion)
  WEIGHTS: {
    interiority: 2.0,
    tension_14d: 3.0,
    sensory_density: 1.5,
    necessity: 1.0,
    anti_cliche: 1.0,
    rhythm: 1.0,
    signature: 1.0,
    impact: 2.0,
    emotion_coherence: 2.5,
  },

  // Boucle correction
  MAX_CORRECTION_PASSES: 2,
  MAX_PITCH_ITEMS: 8,

  // Musical
  GINI_OPTIMAL: 0.45,
  GINI_RANGE: [0.35, 0.55],
  MAX_CONSECUTIVE_SIMILAR: 3,
  SIMILAR_LENGTH_TOLERANCE: 0.20,
  OPENING_REPETITION_MAX: 0.10,

  // Anti-cliché
  CLICHE_ZERO_TOLERANCE: true,

  // Duel
  MAX_DRAFTS: 3,  // A + B + C
  DRAFT_MODES: ['tranchant_minimaliste', 'sensoriel_dense', 'experimental_signature'],
} as const;
```

---

## 🔌 INTERFACE PROVIDER (pour les axes LLM)

```typescript
export interface SovereignProvider {
  /** Score intériority of prose (0-100) */
  scoreInteriority(prose: string, context: { pov: string; character_state: string }): number;

  /** Score sensory density with LLM validation (0-100) */
  scoreSensoryDensity(prose: string, sensory_counts: Record<string, number>): number;

  /** Score sentence necessity (0-100) */
  scoreNecessity(prose: string, beat_count: number): number;

  /** Score opening + closing impact (0-100) */
  scoreImpact(opening: string, closing: string, context: { story_premise: string }): number;

  /** Apply correction pitch to prose */
  applyPatch(prose: string, pitch: CorrectionPitch, constraints: { canon: readonly string[]; beats: readonly string[] }): string;

  /** Generate draft with specific mode */
  generateDraft(prompt: string, mode: string, seed: string): string;
}
```

Pour les tests: créer un `MockSovereignProvider` qui retourne des scores fixes (ex: 75 pour tout).

---

## 🏆 PACKAGE.JSON

```json
{
  "name": "@omega/sovereign-engine",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@omega/canon-kernel": "file:../canon-kernel",
    "@omega/genesis-planner": "file:../genesis-planner",
    "@omega/genome": "file:../genome",
    "@omega/omega-forge": "file:../omega-forge"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "vitest": "^4.0.17"
  }
}
```

---

## ❌ INTERDICTIONS

- **JAMAIS** de `any` dans le code. TypeScript strict.
- **JAMAIS** de TODO/FIXME. Tout doit être complet.
- **JAMAIS** de mock dans le code de production. Les mocks sont UNIQUEMENT dans tests/fixtures/.
- **JAMAIS** de console.log en production. Utiliser des structures de données traçables.
- **JAMAIS** de valeur magique. Tout dans SOVEREIGN_CONFIG.
- **JAMAIS** d'approximation. Chaque calcul est exact et documenté.
- **JAMAIS** de dépendance externe non listée. Uniquement les @omega/* packages.

---

## ✅ CRITÈRES DE SUCCÈS

Quand tu as fini :

1. `npm run typecheck` → 0 erreur
2. `npx vitest run` → TOUS les tests passent
3. Chaque fichier a un header NASA-grade avec description
4. Chaque interface est `readonly` et immutable
5. Les 5 axes CALC sont 100% déterministes (même input = même output)
6. Le FORGE_PACKET utilise les 14 fonctions existantes de @omega/omega-forge
7. La blacklist contient 300+ patterns
8. Le catalogue d'ops contient exactement 12 opérations
9. Le seuil 92 est codé en dur dans la config
10. Les poids donnent 63.3% émotion
11. La boucle est bornée à max 2 passes
12. Chaque artefact est hashé via sha256(canonicalize(...))

---

## 🚀 ORDRE DE CONSTRUCTION

1. `types.ts` — Toutes les interfaces d'abord
2. `config.ts` — Configuration souveraine
3. `data/` — Les 4 fichiers JSON (blacklist, sensory, ai-patterns, filter-words)
4. `input/emotion-adapter.ts` — Mapping entre les 2 systèmes d'émotions
5. `input/forge-packet-assembler.ts` — Assembleur FORGE_PACKET
6. `input/pre-write-validator.ts` — Validateur pre-write
7. `input/pre-write-simulator.ts` — Simulateur battle plan
8. `input/prompt-assembler-v2.ts` — buildSovereignPrompt()
9. `delta/` — Les 4 modules delta + orchestrateur
10. `oracle/axes/` — Les 9 axes (5 CALC d'abord, puis 4 LLM)
11. `oracle/s-score.ts` — Calcul composite
12. `oracle/aesthetic-oracle.ts` — Orchestrateur
13. `pitch/correction-catalog.ts` — 12 ops
14. `pitch/triple-pitch.ts` — Générateur 3 pitches
15. `pitch/pitch-oracle.ts` — Sélecteur
16. `pitch/patch-engine.ts` — Applicateur
17. `pitch/sovereign-loop.ts` — Boucle complète
18. `duel/` — Duel engine
19. `polish/` — Musical + anti-cliché + signature
20. `engine.ts` — Orchestrateur principal runSovereignForge()
21. `index.ts` — Exports publics
22. Tests dans l'ordre

---

## 💀 PHILOSOPHIE

Ce module est la vitrine d'OMEGA. Chaque ligne de code doit refléter :

- **Le déterminisme** : même input → même output → même hash
- **L'impitoyabilité** : ≥92 ou REJECT, pas de compromis
- **L'émotion comme structure** : 14D mesuré, pas deviné
- **La traçabilité** : chaque décision documentée dans un artefact hashé
- **L'innovation** : aucun autre système ne fait ça — guidage vectoriel 14D + sélection stratégique triple pitch + catalogue fermé d'ops

**Le résultat doit faire pleurer les auteurs humains.**
**Pas par la quantité — par la précision chirurgicale de chaque phrase.**

---

GO. Construis tout. Pas de questions. Pas de compromis. Pas de TODO.
