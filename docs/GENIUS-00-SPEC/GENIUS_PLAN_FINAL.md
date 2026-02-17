# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA GENIUS ENGINE — PLAN D'EXÉCUTION FINAL
#   Toutes obligations code, dépendances, et contraintes techniques
#
#   Date:          2026-02-17
#   Spec source:   GENIUS_ENGINE_SPEC v1.1.0
#   Consensus:     4 IA (Claude + ChatGPT + Gemini) — 3 rounds — 0 désaccord
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# PARTIE A — RÉSUMÉ DES DÉCISIONS SCELLÉES

## Corrections intégrées (rounds 1→3)

| # | Correction | Source | Impact code |
|---|-----------|--------|-------------|
| 1 | 5 anti-doublons DSIRV vs M | ChatGPT R1 | SSOT lines dans chaque scorer |
| 2 | NarrativeShape paramétrable, 14D = SSOT si conflit | ChatGPT + Gemini R1 | Enum dans ForgePacket |
| 3 | G_min corrigé de 85 à 92 (math impossible) | ChatGPT R1 | Constante dans gates |
| 4 | D : verbiage_penalty (phrases vides) | ChatGPT R3 | Fonction supplémentaire scorer D |
| 5 | S : semantic_shift via embedding LOCAL fixe | ChatGPT R3 | Dépendance npm sentence-transformers |
| 6 | S : frontières SSOT semantic_shift vs I vs Honesty | ChatGPT R3 | Commentaires SSOT dans code |
| 7 | S : S_shift_balance diagnostic (sweet spot) | ChatGPT R3 | Fonction diagnostic non-bloquante |
| 8 | Hiérarchie résolution conflits hard | Gemini R2 | Injecté dans prompt compiler |
| 9 | 3 modes (original/continuation/enhancement) | Claude + Gemini R2 | Mode enum + override logic |
| 10 | Escape hatch NONCOMPLIANCE | ChatGPT R3 | Parser post-LLM output |
| 11 | Corrélation 0.90 pour D vs necessity (faux positifs) | ChatGPT R2 | Constante dans tests anti-doublon |
| 12 | Corrélation partielle | ChatGPT R3 | REPORTÉ v2 (documenté) |

## Formule finale (GELÉE)

```
δ_AS = 1 si AS ≥ 85, sinon 0
M = (ECC × RCI × SII × IFI × AAI) ^ (1/5)
G = (D × S × I × R × V) ^ (1/5)
Q_text = √(M × G) × δ_AS
C_llm = (Conformité × Stabilité × Créativité × Honesty) ^ (1/4)
Q_system = Q_text × C_llm

SEAL_RUN : δ_AS=1 AND Q_text≥93 AND M≥88 AND G≥92 AND tous floors
SEAL_STABLE : ≥4/5 SEAL_RUN AND σ(Q_text)≤3.0 AND min(Q_text)≥80
```

---

# PARTIE B — SPRINT GENIUS-00 (SPEC ONLY)

## Status : PRÊT À COMMITER

### Livrables

| Fichier | Description | Status |
|---------|-------------|--------|
| `GENIUS_ENGINE_SPEC.md` | Spec mathématique complète v1.1.0 | ✅ CRÉÉ |
| `GENIUS_SSOT.json` | Config machine-readable (formules, gates, modes) | ✅ CRÉÉ |
| `GENIUS_PLAN_FINAL.md` | Ce document (plan d'exécution) | ✅ CRÉÉ |

### Gate de sortie

- [x] Zéro placeholder
- [x] Zéro formule manquante
- [x] Tous patchs rounds 1-3 intégrés
- [x] 28 invariants définis (GENIUS-01 à GENIUS-28)
- [x] Output JSON canonique défini
- [x] SSOT JSON machine-readable
- [ ] Committé dans le repo (ATTENTE VALIDATION FRANCKY)

### Commandes de commit

```powershell
# COMMANDE 1 — Copier les 3 fichiers dans le repo
# (à adapter selon emplacement final décidé par Francky)
```

---

# PARTIE C — SPRINT GENIUS-01 : PROMPT CONTRACT

## Objectif

Refondre buildSovereignPrompt pour générer un prompt structuré en 8 sections
ordonnées par priorité, avec contraintes mesurables alignées 1:1 avec le scorer.

## Dépendances

```
Aucune. Peut démarrer IMMÉDIATEMENT.
Le prompt contract ne dépend pas des scorers (il les précède).
```

## Fichiers à créer / modifier

### NOUVEAU : `genius-contract-compiler.ts`

```
Emplacement : packages/sovereign-engine/src/genius/genius-contract-compiler.ts
Responsabilité : Compiler un ForgePacket en prompt 8 sections
```

**Obligations code :**

```typescript
// INTERFACE (contrat strict)
interface GeniusContractInput {
  forgePacket: ForgePacket;        // Le plan narratif complet
  mode: 'original' | 'continuation' | 'enhancement';
  narrativeShape?: NarrativeShape; // Si non fourni, aligné sur courbe 14D
  voiceGenome?: VoiceGenome;       // Requis si mode !== 'original'
  authorFingerprint?: AuthorFingerprint; // Requis si mode === 'continuation'
  exemplars?: Exemplar[];          // 0 à 3 passages scorés 90+
  antiPatternVersion: string;      // Version de la blacklist
}

interface GeniusContractOutput {
  prompt: string;                  // Le prompt complet 8 sections
  sections: PromptSection[];       // Chaque section séparément (debug)
  mode: string;
  antiPatternVersion: string;
  priorityOrder: string[];         // La hiérarchie de résolution
  constraintsInjected: number;     // Nombre de contraintes mesurables
}

// ENUM
type NarrativeShape =
  | 'ThreatReveal'
  | 'SlowBurn'
  | 'Spiral'
  | 'StaticPressure'
  | 'Contemplative';
```

**Logique de compilation :**

```
1. [0] ANTI-PATTERN
   - Charger blacklist versionnée (fichier JSON versionné)
   - Injecter : "Les formulations suivantes sont INTERDITES : [liste]"
   - Injecter : "Toute occurrence = REJECT immédiat"

2. [1] STRUCTURE
   - Lire NarrativeShape (ou déduire depuis courbe 14D)
   - Compiler quartiles avec budgets :
     Q1: [shape.Q1_label] + 1 micro-événement + 1 ancrage sensoriel
     Q2: [shape.Q2_label] + 1 variation rythmique
     Q3: [shape.Q3_label] + 1 pivot
     Q4: [shape.Q4_label] + résolution
   - Si mode=continuation : aligner sur courbe 14D de l'auteur

3. [2] DISCIPLINE LEXICALE
   - Injecter : "Max 3 mots même champ sémantique / 200 mots"
   - Injecter : "Zéro répétition mot fort sur 100 mots"

4. [3] RYTHME
   - Si mode=original :
       "25-35% phrases < 10 mots, 15-25% phrases > 20 mots"
   - Si mode=continuation :
       Lire authorFingerprint.rhythm_distribution
       Calculer ±10% de chaque bucket
       Injecter les valeurs de L'AUTEUR, pas les universelles
   - Toujours : "Max 2 phrases même pattern syntaxique consécutives"

5. [4] CONTRAT ÉMOTIONNEL
   - Lire courbe 14D depuis ForgePacket
   - Injecter par quartile : émotion cible, intensité, points de rupture
   - Ajouter : "La courbe 14D est le SSOT. Si conflit → 14D gagne."

6. [5] VOICE TARGET
   - Si mode=original : voice genome générique OMEGA
   - Si mode=continuation : injecter fingerprint auteur complet
     (mots-signature, registre, rapport parole/silence)
   - Si mode=enhancement : injecter comme guide

7. [6] OBJECTIFS SOFT
   - "Densité sensorielle : 2+ sens / paragraphe"
   - "Show don't tell : incarner, pas décrire"
   - "Motifs : établir Q1, résonner Q2-Q3, résoudre Q4"

8. [7] LIBERTÉ CRÉATIVE
   - "Tu as carte blanche UNIQUEMENT sur : images, symboles,
     détails sensoriels, micro-rythmes."
   - Injecter exemplars si fournis
   - "TOUT LE RESTE est contraint."

9. HIÉRARCHIE (injectée après section 7)
   - "Si conflit entre contraintes, résoudre dans cet ordre :
     Authenticité > Émotion > Structure > Rythme > Lexique"

10. ESCAPE HATCH (injecté après hiérarchie)
    - "Si tu ne peux pas satisfaire une contrainte sans violer
      une contrainte de rang supérieur, déclare :
      NONCOMPLIANCE: [section] | [raison]"
```

**Mode continuation — obligation de vérification :**

```typescript
// Le compiler DOIT refuser de compiler si :
if (input.mode === 'continuation' && !input.authorFingerprint) {
  throw new Error('GENIUS-CONTRACT: mode=continuation requires authorFingerprint');
}
if (input.mode === 'continuation' && !input.voiceGenome) {
  throw new Error('GENIUS-CONTRACT: mode=continuation requires voiceGenome');
}
```

### À MODIFIER : `buildSovereignPrompt` (existant)

```
Fichier : packages/sovereign-engine/src/runtime/prompt-builder.ts (ou équivalent)
Action : remplacer l'appel direct par un appel à genius-contract-compiler
         Le compilateur produit le prompt, buildSovereignPrompt l'enveloppe
         dans le format attendu par le provider.
```

### NOUVEAU : `anti-pattern-blacklist.json`

```
Emplacement : packages/sovereign-engine/src/genius/anti-pattern-blacklist.json
Contenu : liste versionnée de formulations IA-smell
Version : AS_PATTERNS_V1
```

```json
{
  "version": "1.0",
  "patterns": [
    "Il est important de noter que",
    "tisserande des mots",
    "dans un élan de",
    "une tapisserie de",
    "symphonie de",
    "danse macabre de",
    "un souffle de"
  ],
  "regex_patterns": [
    "(?:tout|chaque)\\s+(?:fibre|cellule)\\s+de\\s+(?:son|leur)\\s+être",
    "les? mots? (?:dansai(?:en)?t|virevoltai(?:en)?t)"
  ]
}
```

### Tests GENIUS-01

```
TEST-G01-01 : Le prompt contient les 8 sections dans l'ordre [0]→[7]
TEST-G01-02 : La hiérarchie de résolution est présente (texte exact)
TEST-G01-03 : L'escape hatch NONCOMPLIANCE est injecté
TEST-G01-04 : Mode original → contraintes rythme universelles
TEST-G01-05 : Mode continuation → contraintes rythme = fingerprint auteur ±10%
TEST-G01-06 : Mode continuation sans fingerprint → throw Error
TEST-G01-07 : Mode continuation sans voiceGenome → throw Error
TEST-G01-08 : Anti-pattern blacklist versionnée et injectée
TEST-G01-09 : NarrativeShape injecté si spécifié
TEST-G01-10 : NarrativeShape absent → "aligné sur courbe 14D" injecté
TEST-G01-11 : Exemplars injectés dans section [7] si fournis
TEST-G01-12 : Invariant GENIUS-13 (priority order présent dans output)

VALIDATION LIVE (après tests unitaires) :
  5 runs avec même golden prompt, comparer delta Q_text avant/après refonte
```

---

# PARTIE D — SPRINT GENIUS-02 : GENIUS METRICS

## Objectif

Implémenter les 5 scorers DSIRV + Layer 0 AS + formule Q_text complète.

## Dépendances

```
HARD :
  - Sprint 11 ART (authenticity scorer → AS)
    Si Sprint 11 pas encore fait : implémenter AS v0 standalone
  - Sprint 13 ART (voice genome → V needs reference)
    Si Sprint 13 pas encore fait : V utilise un genome vide (V_floor=70 uniquement)
  - GENIUS-01 (prompt contract, pour les runs de test)

SOFT :
  - SymbolMap Oracle existant (pour R)
  - TemporalEngine existant (pour I, données brutes seulement)
```

## Fichiers à créer

### NOUVEAU : `genius-metrics.ts` (orchestrateur)

```
Emplacement : packages/sovereign-engine/src/genius/genius-metrics.ts
```

```typescript
// INTERFACE PRINCIPALE
interface GeniusMetricsInput {
  text: string;                    // Le texte à scorer
  mode: 'original' | 'continuation' | 'enhancement';
  voiceGenome?: VoiceGenome;       // Pour V en mode continuation
  authorFingerprint?: AuthorFingerprint;
  symbolMapOutputs?: SymbolMapOutput[]; // Pour R
  extractedEvents?: NarrativeEvent[];   // Pour I (données brutes)
  emotionScores?: EmotionLayerResult;   // M déjà calculé
}

interface GeniusMetricsOutput {
  layer0_gate: {
    AS_score: number;
    AS_GATE_PASS: boolean;
    reject_reason: string | null;
  };
  layer2_genius: {
    G: number;
    axes: { D: number; S: number; I: number; R: number; V: number };
    diagnostics: {
      SI_tension: number;
      S_shift_balance: number;
      shift_moyen: number;
    };
  };
  layer3_verdict: {
    Q_text: number;
    seal_run: boolean;
    seal_reason: string;
    verdict: 'SEAL' | 'PITCH' | 'REJECT';
  };
  warnings: string[];
}
```

**Obligation : fail-fast Layer 0**

```typescript
// OBLIGATION CODE : AS évalué EN PREMIER
export function computeGeniusMetrics(input: GeniusMetricsInput): GeniusMetricsOutput {
  // ÉTAPE 1 : Layer 0 — AS kill switch
  const AS = computeAS(input.text);
  if (AS < 85) {
    return {
      layer0_gate: { AS_score: AS, AS_GATE_PASS: false, reject_reason: 'AS_GATE' },
      layer2_genius: { G: 0, axes: { D: 0, S: 0, I: 0, R: 0, V: 0 },
                       diagnostics: { SI_tension: 0, S_shift_balance: 0, shift_moyen: 0 } },
      layer3_verdict: { Q_text: 0, seal_run: false, seal_reason: 'AS_GATE', verdict: 'REJECT' },
      warnings: ['REJECT: AS gate failed']
    };
    // NE PAS calculer M ni G — économie tokens
  }

  // ÉTAPE 2 : Calculer D, S, I, R, V
  const D = computeDensity(input.text);
  const S = computeSurprise(input.text);  // utilise embedding local
  const I = computeInevitability(input.text, input.extractedEvents);
  const R = computeResonance(input.text, input.symbolMapOutputs);
  const V = computeVoice(input.text, input.mode, input.voiceGenome);

  // ÉTAPE 3 : G = moyenne géométrique
  const G = Math.pow(D * S * I * R * V, 1/5);

  // ÉTAPE 4 : Q_text
  const M = input.emotionScores.M;
  const Q_text = Math.sqrt(M * G);  // δ_AS = 1 ici (on a passé le gate)

  // ÉTAPE 5 : SEAL check
  // ... (vérifier tous les floors)
}
```

### NOUVEAU : `density-scorer.ts` (axe D)

```
Emplacement : packages/sovereign-engine/src/genius/scorers/density-scorer.ts
```

**Obligations code :**

```typescript
// INTERDIT : import de SII.necessity ou de son score
// Le linter DOIT vérifier que density-scorer.ts n'importe RIEN de SII

interface DensityInput {
  text: string;
  sentences: string[];     // phrases segmentées
  posTagged: PosToken[];   // tokens avec POS tags
}

interface DensityOutput {
  score: number;           // 0-100
  compression_proxy: number;
  sentence_utility: number;
  verbiage_penalty: number;
  details: {
    content_word_ratio: number;      // mots porteurs / total
    stopword_ratio_per_sentence: number[];
    syntactic_repeat_count: number;  // patterns consécutifs identiques
    abstract_segment_count: number;  // segments sans sensoriel/action
  };
}

// CALCUL
// compression_proxy = content_words / total_words (POS-based)
//   content_words = NOUN, VERB, ADJ, ADV (hors auxiliaires et modaux)
//   Fenêtre : phrase par phrase

// sentence_utility = 1 - (duplicated_info / total_info)
//   Mesure via n-grams : si 2 phrases partagent >60% de leurs n-grams → pénalité

// verbiage_penalty = Σ(penalties) clampé [0, max_penalty]
//   Trigger 1 : stopword_ratio > 0.65 par phrase → pénalité proportionnelle
//   Trigger 2 : 3+ phrases consécutives même structure syntaxique → pénalité
//   Trigger 3 : segment >30 mots sans verbe d'action ni mot sensoriel → pénalité
```

### NOUVEAU : `surprise-scorer.ts` (axe S)

```
Emplacement : packages/sovereign-engine/src/genius/scorers/surprise-scorer.ts
```

**Obligations code :**

```typescript
// INTERDIT : import de SII.metaphor_novelty
// OBLIGATOIRE : embedding local fixe (pas API provider)

import { EmbeddingModel } from '../embeddings/local-embedding-model';

interface SurpriseInput {
  text: string;
  sentences: string[];
  tokens: string[];
  embeddingModel: EmbeddingModel;  // SSOT : modèle local versionné
}

interface SurpriseOutput {
  score: number;              // 0-100
  lexical_diversity: number;  // TTR fenêtre 200
  entropy_locale: number;     // Shannon entropy
  semantic_shift: number;     // embedding drift moyen
  anti_clustering: number;    // pénalité champs sémantiques
  diagnostics: {
    shift_moyen: number;      // valeur brute du drift
    S_shift_balance: number;  // sweet spot diagnostic
    shift_warning: string | null;
  };
}

// CALCUL lexical_diversity
// TTR = types / tokens sur fenêtre glissante de 200 tokens
// Score = moyenne des TTR de toutes les fenêtres × 100

// CALCUL entropy_locale
// H = -Σ(p(w) × log2(p(w))) sur fenêtre de 200 tokens
// Normalisé par log2(vocabulary_size) pour obtenir [0, 1]

// CALCUL semantic_shift
// Pour chaque paire de phrases consécutives (s_i, s_i+1) :
//   shift_i = 1 - cosine_similarity(embed(s_i), embed(s_i+1))
// shift_moyen = mean(shift_i)
// EMBEDDING : modèle LOCAL fixe, JAMAIS l'API du provider LLM
// Modèle par défaut : sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

// CALCUL anti_clustering
// Pour chaque fenêtre de 200 mots :
//   Compter les mots du même champ sémantique (via WordNet/synonymes)
//   Si > 3 mots même champ → pénalité proportionnelle

// DIAGNOSTIC S_shift_balance
// target = 0.35 (configurable)
// range = 0.25 (configurable)
// balance = 1 - |shift_moyen - target| / range
// Si balance < 0.6 :
//   shift_moyen < target → warning "texte sémantiquement plat"
//   shift_moyen > target → warning "zapping d'idées"
```

### NOUVEAU : `inevitability-scorer.ts` (axe I)

```
Emplacement : packages/sovereign-engine/src/genius/scorers/inevitability-scorer.ts
```

**Obligations code :**

```typescript
// INTERDIT : import de TemporalEngine.scores ou ECC.tension_14d
// AUTORISÉ : import de extractedEvents/markers (données brutes)

interface InevitabilityInput {
  text: string;
  sentences: string[];
  extractedEvents?: NarrativeEvent[];  // données brutes du TemporalEngine
  extractedMarkers?: string[];         // pivots détectés
}

interface InevitabilityOutput {
  score: number;              // 0-100
  causal_consistency: number;
  setup_payoff: number;
  non_contradiction: number;
  details: {
    causal_markers_found: number;     // "donc", "car", "ainsi", "parce que"
    causal_markers_validated: number; // avec événement antérieur
    setups_detected: number;
    setups_resolved: number;
    contradictions_found: string[];
  };
}

// CALCUL causal_consistency (PROXY v1)
// 1. Détecter marqueurs causaux : "donc", "ainsi", "car", "parce que",
//    "c'est pourquoi", "de ce fait", "en conséquence"
// 2. Pour chaque marqueur : vérifier qu'un ÉVÉNEMENT (verbe d'action)
//    existe dans les 3 phrases précédentes
// 3. Ratio = markers_validated / markers_found
// Si 0 marqueurs → score neutre (pas de pénalité)

// CALCUL setup_payoff (PROXY v1)
// 1. Détecter les "setups" : questions posées, tensions ouvertes,
//    personnages introduits, éléments descriptifs détaillés
// 2. Chercher les "payoffs" : résolutions, réponses, retours sur ces éléments
// 3. Ratio = setups_resolved / setups_detected

// CALCUL non_contradiction
// 1. Extraire assertions factuelles (état des personnages, lieu, temps, météo)
// 2. Vérifier cohérence : si "nuit" déclarée, pas de "soleil" sans transition
// 3. Score = 100 - (contradictions * penalty_per_contradiction)

// VALIDATION : shuffle paragraphes → I doit chuter (GENIUS-21)
// Le shuffle casse les liens causaux mais pas le vocabulaire
```

### NOUVEAU : `resonance-scorer.ts` (axe R)

```
Emplacement : packages/sovereign-engine/src/genius/scorers/resonance-scorer.ts
```

**Obligations code :**

```typescript
// INTERDIT : créer une nouvelle taxonomie de symboles
// OBLIGATOIRE : consommer les outputs du SymbolMap Oracle existant

interface ResonanceInput {
  text: string;
  symbolMapOutputs: SymbolMapOutput[];  // SSOT des symboles détectés
}

interface ResonanceOutput {
  score: number;              // 0-100
  motif_echo: number;         // récurrence avec variation
  thematic_depth: number;     // couches de lecture
  symbol_density: number;     // symboles / 1000 mots
  details: {
    motifs_detected: { motif: string; occurrences: number; variation_score: number }[];
    unique_themes: number;
    symbols_per_1000: number;
  };
}

// CALCUL motif_echo
// Pour chaque motif dans symbolMapOutputs :
//   Compter les occurrences dans le texte
//   Mesurer la VARIATION entre occurrences (contexte différent ?)
//   Score = Σ(occurrences² × variation_ratio) — non-linéaire
// Plus un motif revient AVEC variation, plus le score monte en puissance

// CALCUL thematic_depth
// Nombre de thèmes distincts identifiés par le SymbolMap Oracle
// Pénalisé si thèmes superficiels (1 seule mention)

// CALCUL symbol_density
// symbols_count / (word_count / 1000)
// Normalisé par genre (poésie > thriller > rapport)
```

### NOUVEAU : `voice-scorer.ts` (axe V)

```
Emplacement : packages/sovereign-engine/src/genius/scorers/voice-scorer.ts
```

**Obligations code :**

```typescript
// INTERDIT : import de RCI.voice_conformity_score
// AUTORISÉ : import de voice_genome comme RÉFÉRENCE

interface VoiceInput {
  text: string;
  sentences: string[];
  mode: 'original' | 'continuation' | 'enhancement';
  voiceGenome?: VoiceGenome;  // Référence seulement
}

interface VoiceOutput {
  score: number;              // 0-100
  rhythm_distribution: number;
  lexical_fingerprint: number;
  register_drift: number;
  silence_ratio: number;
  floor_applied: number;     // 70, 75, ou 85 selon mode
}

// CALCUL rhythm_distribution
// Buckets de longueur : <5 mots, 5-10, 10-15, 15-20, 20-25, >25
// Distribution mesurée vs distribution cible
//   Mode original : cible = distribution "littérature de référence"
//   Mode continuation : cible = distribution de l'auteur (±10%)
// Score = 100 × (1 - distance_chi2(mesuré, cible))

// CALCUL lexical_fingerprint
// Top 100 mots les plus fréquents (hors stopwords)
// Distance cosinus entre fingerprint mesuré et fingerprint cible
// Mode original : cible = corpus littéraire FR générique
// Mode continuation : cible = fingerprint de l'auteur

// CALCUL register_drift
// Classifier le registre de chaque phrase (formel/courant/familier)
// Mesurer la cohérence : drift = variance du registre
// Score élevé = registre cohérent (peu de sauts)

// CALCUL silence_ratio
// Ratio dialogues / narration / pauses (phrases courtes isolées)
// Comparé à la cible du mode

// FLOOR DYNAMIQUE
// original → V ≥ 70 pour SEAL
// continuation → V ≥ 85 pour SEAL
// enhancement → V ≥ 75 pour SEAL
```

### NOUVEAU : `local-embedding-model.ts`

```
Emplacement : packages/sovereign-engine/src/genius/embeddings/local-embedding-model.ts
Responsabilité : Embedding local fixe pour semantic_shift (provider-agnostic)
```

**Obligations code :**

```typescript
// CE MODULE EST LE SSOT DES EMBEDDINGS POUR LE GENIUS ENGINE
// Il ne doit JAMAIS appeler une API provider (Claude, GPT, Gemini)
// Le modèle est fixe et versionné

interface EmbeddingModel {
  readonly modelId: string;       // ex: "paraphrase-multilingual-MiniLM-L12-v2"
  readonly version: string;       // ex: "1.0"
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  cosineSimilarity(a: number[], b: number[]): number;
}

// OPTION A : sentence-transformers via ONNX runtime (JS natif)
// OPTION B : TF.js avec modèle converti
// OPTION C : Appel HTTP à un micro-service local fixe (port configuré)
//
// Le choix sera fait en Sprint GENIUS-02 selon les contraintes runtime.
// INVARIANT : le même texte + le même modèle = le même embedding (±0.001)
```

### NOUVEAU : `as-gatekeeper.ts` (Layer 0)

```
Emplacement : packages/sovereign-engine/src/genius/as-gatekeeper.ts
```

**Obligations code :**

```typescript
// Layer 0 — évalué EN PREMIER, avant M et G
// Si Sprint 11 ART (authenticity) existe déjà, ce module l'enveloppe
// Si Sprint 11 pas encore fait, ce module fournit une v0 standalone

interface ASGateResult {
  AS_score: number;
  AS_GATE_PASS: boolean;
  reject_reason: string | null;
  patterns_version: string;
  patterns_matched: string[];  // pour debug
}

// CALCUL AS (v0, CALC pur)
// 1. Charger anti-pattern-blacklist.json (versionné)
// 2. Pour chaque pattern (string exact + regex) :
//    Compter les occurrences dans le texte
// 3. AS = 100 - (occurrences × penalty_per_match)
//    penalty_per_match configurable (défaut : 5 points)
// 4. Si AS < 85 → AS_GATE_PASS = false
//
// NOTE : quand Sprint 11 ART fournira un authenticity scorer plus
// sophistiqué, ce module le consommera et gardera sa propre logique
// en fallback.
```

### Tests GENIUS-02

```
TESTS UNITAIRES PAR SCORER :

D :
  TEST-G02-D01 : Texte dense (zéro filler) → D > 90
  TEST-G02-D02 : Texte verbeux (80% stopwords) → D < 50
  TEST-G02-D03 : 3+ phrases même structure → verbiage_penalty activé
  TEST-G02-D04 : D n'importe RIEN de SII (lint check)

S :
  TEST-G02-S01 : Texte avec vocabulaire riche + idées variées → S > 85
  TEST-G02-S02 : Texte avec synonymes mais même idée répétée → S < 70
          (preuve que semantic_shift fonctionne)
  TEST-G02-S03 : Injection cluster lexical → S chute (GENIUS-22)
  TEST-G02-S04 : S_shift_balance hors zone → warning émis
  TEST-G02-S05 : Même texte, 2 runs → semantic_shift identique (±0.01) (GENIUS-28)
  TEST-G02-S06 : S n'importe RIEN de SII.metaphor_novelty (lint check)
  TEST-G02-S07 : S n'utilise AUCUNE API embedding provider (lint check)

I :
  TEST-G02-I01 : Texte causal cohérent → I > 80
  TEST-G02-I02 : Shuffle paragraphes → I chute (GENIUS-21)
  TEST-G02-I03 : "Donc" sans événement précédent → causal_consistency baisse
  TEST-G02-I04 : Contradiction (nuit → soleil sans transition) → non_contradiction baisse
  TEST-G02-I05 : I n'importe RIEN de TemporalEngine.scores (lint check)

R :
  TEST-G02-R01 : Texte avec motifs récurrents variés → R > 80
  TEST-G02-R02 : Texte sans motif → R < 50
  TEST-G02-R03 : R ne crée pas de nouvelle taxonomie (lint check)

V :
  TEST-G02-V01 : Texte avec rythme varié, registre cohérent → V > 80
  TEST-G02-V02 : Uniformisation longueurs → V chute (GENIUS-23)
  TEST-G02-V03 : Mode continuation + V < 85 → SEAL refusé (GENIUS-04)
  TEST-G02-V04 : V n'importe RIEN de RCI.voice_conformity (lint check)

AS :
  TEST-G02-AS01 : Texte propre → AS > 85 → gate PASS
  TEST-G02-AS02 : Injection "tisserande des mots" → AS chute → REJECT (GENIUS-24)
  TEST-G02-AS03 : Si AS < 85, M et G ne sont PAS calculés (GENIUS-01)

INTÉGRATION :
  TEST-G02-INT01 : M=85, G=100 → Q_text = 92.2 < 93 → pas SEAL (GENIUS-02)
  TEST-G02-INT02 : M=95, G=95 → Q_text = 95.0 (GENIUS-03)
  TEST-G02-INT03 : G parfait mais V=65 en original → SEAL refusé (GENIUS-04)
  TEST-G02-INT04 : Q_text identique ±0.5 avec provider différent (GENIUS-25)
  TEST-G02-INT05 : Output JSON conforme au schéma canonique (GENIUS-15)

NON-RÉGRESSION :
  TEST-G02-NR01 : Les 479 tests existants passent toujours
  TEST-G02-NR02 : Les gates existants passent toujours

LINT CHECKS ANTI-DOUBLON (exécutés à chaque CI) :
  LINT-G01 : density-scorer.ts ne contient aucun import de SII
  LINT-G02 : surprise-scorer.ts ne contient aucun import de SII.metaphor
  LINT-G03 : surprise-scorer.ts ne contient aucun appel API provider embedding
  LINT-G04 : inevitability-scorer.ts ne contient aucun import de TemporalEngine.scores
  LINT-G05 : resonance-scorer.ts ne crée pas de SymbolTaxonomy
  LINT-G06 : voice-scorer.ts ne contient aucun import de RCI.voice_conformity
```

---

# PARTIE E — SPRINT GENIUS-03 : C_LLM CALIBRATOR

## Objectif

Mesurer la capacité du LLM courant et piloter le nombre de passes.

## Dépendances

```
GENIUS-01 (prompt contract — nécessaire pour les benchmark prompts)
```

## Fichiers à créer

### NOUVEAU : `genius-calibrator.ts`

```
Emplacement : packages/sovereign-engine/src/genius/genius-calibrator.ts
```

**Obligations code :**

```typescript
interface CalibrationResult {
  C_llm: number;                      // [0, 1]
  components: {
    conformity: number;
    stability: number;
    creativity: number;
    honesty: number;
  };
  strategy: 'mono-pass' | 'multi-pass' | 'max-assist';
  passes_recommended: number;
  budget_tokens: number;
  benchmark_version: string;
  provider_id: string;
}

// CALCUL Conformity
// Exécuter les 7 prompts fixes du Core System
// Pour chaque prompt : compter les hard constraints respectées
// Conformity = total_respected / total_constraints

// CALCUL Stability
// Exécuter 5 runs du même prompt (un des 7 fixes)
// σ_max = 15 (configurable)
// Stability = 1 - clamp(σ(Q_text) / σ_max, 0, 1)

// CALCUL Creativity
// Exécuter les 3 prompts tournants
// Mesurer novelty via S (Surprise) sur chaque run
// Creativity = clamp(S_moyen / S_cible, 0, 1) × (1 - incohérence_penalty)

// CALCUL Honesty
// Sur les 10 prompts :
// H1 : contradictions logiques détectées (via I scorer)
// H2 : marqueurs causaux sans événement (via I scorer)
// H3 : show/tell violations (ratio abstrait/sensoriel)
// H4 : symboles déclarés dans le prompt mais non détectés dans output (via R)
// Honesty = 1 - Σ(H_penalties) clampé [0, 1]

// PILOTAGE
// if (C_llm > 0.85)  → mono-pass, passes=1-2, budget=T_base
// if (C_llm 0.60-0.85) → multi-pass, passes=3-5, budget=T_base×1.5
// if (C_llm < 0.60) → max-assist, passes=7+, budget=T_base×2
//
// Formule exacte :
//   passes = ceil(P_base / C_llm)
//   budget = T_base × (1 + (1 - C_llm))
```

### NOUVEAU : `benchmark-core-prompts.json`

```
Emplacement : packages/sovereign-engine/src/genius/benchmark/core-prompts.json
Contenu : 7 prompts fixes (versionnés, gelés)
Version : BENCHMARK_CORE_V1
```

### NOUVEAU : `benchmark-rotating-pool.json`

```
Emplacement : packages/sovereign-engine/src/genius/benchmark/rotating-pool.json
Contenu : Pool de prompts (30+) d'où sont tirés les 3 tournants
Sélection : hash de la semaine + filtre longueur/genre similaires
```

### NOUVEAU : `noncompliance-parser.ts`

```
Emplacement : packages/sovereign-engine/src/genius/noncompliance-parser.ts
Responsabilité : Parser les blocs NONCOMPLIANCE dans l'output LLM
```

```typescript
interface NoncomplianceDeclaration {
  section: string;    // ex: "RYTHME"
  reason: string;     // ex: "phrase longue nécessaire pour courbe émotionnelle Q3"
  raw: string;        // la ligne brute
}

// Parse la sortie LLM pour trouver les lignes :
// NONCOMPLIANCE: [section] | [raison]
// Retourne un tableau de déclarations
// Les déclarations sont archivées dans output JSON
```

### Tests GENIUS-03

```
TEST-G03-01 : C_llm calculé sur 10 prompts (7 fixes + 3 tournants)
TEST-G03-02 : C_llm > 0.85 → strategy = "mono-pass" (GENIUS-09)
TEST-G03-03 : C_llm < 0.60 → strategy = "max-assist" (GENIUS-10)
TEST-G03-04 : Honesty = 0.1 → C_llm chute sévèrement (GENIUS-07)
TEST-G03-05 : Budget tokens augmente quand C_llm < 0.60 (GENIUS-08)
TEST-G03-06 : Prompts tournants changent d'une semaine à l'autre (GENIUS-14)
TEST-G03-07 : Q_system calculé mais ne touche pas seal_granted (GENIUS-06)
TEST-G03-08 : NONCOMPLIANCE parsé correctement (GENIUS-27)
```

---

# PARTIE F — SPRINT GENIUS-04 : INTÉGRATION LIVE

## Objectif

Pipeline complet end-to-end. Validation sur 20 runs. Premier SEAL visé.

## Dépendances

```
TOUTES :
  - Sprint 12 ART (Scoring V3.1 complet)
  - GENIUS-01 (prompt contract)
  - GENIUS-02 (metrics DSIRV)
  - GENIUS-03 (C_llm calibrator)
```

## Modifications au pipeline existant

```
1. sovereign-engine run flow :
   a. Lire ForgePacket
   b. Compiler prompt via genius-contract-compiler (GENIUS-01)
   c. Déterminer strategy via genius-calibrator (GENIUS-03)
   d. Exécuter LLM (1 à N passes selon C_llm)
   e. Parser NONCOMPLIANCE dans output
   f. Scorer : AS gate → M (existant) → G (GENIUS-02) → Q_text
   g. Émettre output JSON canonique

2. Output JSON : structure de GENIUS_ENGINE_SPEC Partie 11

3. Stability assessment :
   - Exécuter 5 runs
   - Calculer σ(Q_text), min(Q_text), count(SEAL_RUN)
   - Verdict SEAL_STABLE si ≥4/5 + σ ≤ 3.0 + min ≥ 80
```

## Scénarios de validation (4 × 5 runs = 20 runs)

```
Scénario A : Scène de tension (thriller) — mode original — ThreatReveal
Scénario B : Scène contemplative (littéraire) — mode original — Contemplative
Scénario C : Suite d'auteur (Camus) — mode continuation — SlowBurn
Scénario D : Amélioration de texte amateur — mode enhancement — Spiral
```

### Tests GENIUS-04

```
TEST-G04-01 : Pipeline exécute AS → M → G → Q_text dans cet ordre
TEST-G04-02 : Si AS gate REJECT → M et G non calculés (économie tokens)
TEST-G04-03 : Output JSON conforme au schéma canonique (GENIUS-15)
TEST-G04-04 : Q_system présent mais ne touche pas seal_granted (GENIUS-06)
TEST-G04-05 : Au moins 1 SEAL_RUN sur 5 runs (GATE FINALE)
TEST-G04-06 : Anti-doublon check : corrélations à null (< 50 runs)
TEST-G04-07 : Noncompliance declarations archivées
TEST-G04-08 : embedding_model_version présent dans output JSON
TEST-G04-09 : Mode continuation : V_floor = 85 appliqué
TEST-G04-10 : Comparaison avant/après sur golden runs archivés
```

---

# PARTIE G — STRUCTURE DES FICHIERS FINALE

```
packages/sovereign-engine/src/genius/
├── genius-contract-compiler.ts      ← GENIUS-01 (prompt)
├── genius-metrics.ts                ← GENIUS-02 (orchestrateur)
├── genius-calibrator.ts             ← GENIUS-03 (C_llm)
├── as-gatekeeper.ts                 ← GENIUS-02 (Layer 0)
├── noncompliance-parser.ts          ← GENIUS-03
├── anti-pattern-blacklist.json      ← GENIUS-01
├── scorers/
│   ├── density-scorer.ts            ← GENIUS-02 (D)
│   ├── surprise-scorer.ts           ← GENIUS-02 (S)
│   ├── inevitability-scorer.ts      ← GENIUS-02 (I)
│   ├── resonance-scorer.ts          ← GENIUS-02 (R)
│   └── voice-scorer.ts              ← GENIUS-02 (V)
├── embeddings/
│   └── local-embedding-model.ts     ← GENIUS-02 (SSOT embedding)
├── benchmark/
│   ├── core-prompts.json            ← GENIUS-03
│   └── rotating-pool.json           ← GENIUS-03
└── __tests__/
    ├── density-scorer.test.ts
    ├── surprise-scorer.test.ts
    ├── inevitability-scorer.test.ts
    ├── resonance-scorer.test.ts
    ├── voice-scorer.test.ts
    ├── as-gatekeeper.test.ts
    ├── genius-metrics.test.ts
    ├── genius-contract.test.ts
    ├── genius-calibrator.test.ts
    ├── anti-doublon-lint.test.ts     ← LINT checks CI
    └── integration.test.ts
```

---

# PARTIE H — CHRONOLOGIE ET PARALLÉLISME

```
SEMAINE 1 :
  ✅ GENIUS-00 : commiter spec + SSOT + plan (cette session)
  🔧 GENIUS-01 : démarrer prompt contract (indépendant)

SEMAINE 2-3 :
  🔧 GENIUS-01 : finaliser + tests
  🔧 ART Sprint 9-10-11 : parallèle (briques M)

SEMAINE 3-4 :
  🔧 GENIUS-02 : démarrer metrics (AS v0 standalone si Sprint 11 pas fini)
  🔧 GENIUS-03 : démarrer calibrator (dépend GENIUS-01 fini)

SEMAINE 4-5 :
  🔧 GENIUS-02 : finaliser (dépend Sprint 13 pour V complet)
  🔧 ART Sprint 12 : scoring V3.1

SEMAINE 5-6 :
  🔧 GENIUS-04 : intégration + 20 runs validation
  🎯 GATE : premier SEAL_RUN démontré
```

---

# PARTIE I — DÉPENDANCES NPM NOUVELLES

```
Embedding local pour semantic_shift :
  OPTION A : @xenova/transformers (ONNX Runtime JS)
    → sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
    → Poids téléchargés une fois, versionnés
    → 100% local, zéro API call

  OPTION B : onnxruntime-node
    → Plus léger, mais moins de modèles pré-packagés
    → Nécessite conversion manuelle du modèle

  OPTION C : Micro-service Python local (flask/fastapi)
    → Plus simple à développer
    → Mais ajoute une dépendance runtime externe

  RECOMMANDATION : Option A (@xenova/transformers)
    → JS natif, pas de dépendance externe
    → Modèle versionné dans le repo (ou téléchargé au premier run)
    → Compatible avec GENIUS-25 (provider-agnostic) et GENIUS-28 (déterminisme)

POS Tagging pour D :
  OPTION A : compromise (npm) — POS tagger JS léger pour français
  OPTION B : spaCy via child_process (Python)
  OPTION C : TreeTagger via CLI

  RECOMMANDATION : Option A (compromise) ou custom regex-based v1
    → Suffisant pour ratio content_words / stopwords
    → Pas besoin de précision absolue en v1
```

---

**FIN DU PLAN FINAL — GENIUS ENGINE**
**28 invariants • 5 scorers • 1 formule • 0 ambiguïté**
