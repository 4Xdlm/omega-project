// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA MYCELIUM — TEXT ANALYZER BRIDGE
// Version: 1.0.0
// Standard: NASA-Grade L4
// 
// INVARIANTS:
//   INV-BRIDGE-01: Déterminisme — même input + seed = même output
//   INV-BRIDGE-02: Alignement 14D — uniquement émotions OMEGA officielles
//   INV-BRIDGE-03: Conservation — aucune émotion perdue, aucune inventée
//   INV-BRIDGE-04: Normalisation — intensités dans [0, 1]
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';
import {
  AnalyzeResult,
  EmotionHit,
  OmegaEmotion14D,
  OMEGA_EMOTIONS_14D,
  isOmegaEmotion,
  parseAnalyzeResult
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vecteur émotionnel 14D aligné emotion_engine.ts
 * Chaque dimension = intensité [0, 1] d'une émotion OMEGA
 */
export interface EmotionVector14D {
  joy: number;
  fear: number;
  anger: number;
  sadness: number;
  surprise: number;
  disgust: number;
  trust: number;
  anticipation: number;
  love: number;
  guilt: number;
  shame: number;
  pride: number;
  hope: number;
  despair: number;
}

/**
 * Données extraites pour Mycelium Bio
 * Structure intermédiaire avant construction DNA
 */
export interface MyceliumBridgeData {
  /** Vecteur émotionnel 14D */
  emotionVector: EmotionVector14D;
  /** Émotion dominante */
  dominantEmotion: OmegaEmotion14D | null;
  /** Métriques textuelles pour branches Mycelium */
  textMetrics: {
    wordCount: number;
    charCount: number;
    lineCount: number;
    totalEmotionHits: number;
  };
  /** Mots-clés détectés par émotion */
  keywordsByEmotion: Map<OmegaEmotion14D, string[]>;
  /** Source et métadonnées */
  meta: {
    source: string;
    runId: string;
    version: string;
    deterministic: boolean;
  };
  /** Hash déterministe (excluant timestamp) */
  contentHash: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/** Vecteur 14D initialisé à zéro */
const ZERO_VECTOR_14D: EmotionVector14D = {
  joy: 0, fear: 0, anger: 0, sadness: 0,
  surprise: 0, disgust: 0, trust: 0, anticipation: 0,
  love: 0, guilt: 0, shame: 0, pride: 0,
  hope: 0, despair: 0
};

// ─────────────────────────────────────────────────────────────────────────────
// FONCTIONS UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clamp une valeur dans [min, max]
 * @invariant Toujours retourne une valeur dans les bornes
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calcule un hash SHA-256 déterministe
 * @invariant INV-BRIDGE-01: même input = même hash
 */
function deterministicHash(data: object): string {
  // Tri récursif des clés pour déterminisme
  const sortedJson = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(sortedJson, 'utf8').digest('hex');
}

/**
 * Extrait uniquement les données stables (sans timestamp/runId volatiles)
 * @invariant INV-BRIDGE-01: exclut les données volatiles du hash
 */
function extractStableData(analysis: AnalyzeResult): object {
  return {
    source: analysis.source,
    word_count: analysis.word_count,
    char_count: analysis.char_count,
    line_count: analysis.line_count,
    emotions: analysis.emotions.map(e => ({
      emotion: e.emotion,
      intensity: e.intensity,
      occurrences: e.occurrences,
      keywords: [...e.keywords].sort() // Tri pour déterminisme
    })),
    dominant_emotion: analysis.dominant_emotion,
    version: analysis.version
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING ÉMOTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mappe les émotions de l'analyse vers le vecteur 14D OMEGA
 * 
 * @invariant INV-BRIDGE-02: seules les 14 émotions officielles
 * @invariant INV-BRIDGE-03: aucune émotion inventée
 * @invariant INV-BRIDGE-04: intensités clampées [0, 1]
 */
function mapEmotionsToVector14D(emotionHits: EmotionHit[]): EmotionVector14D {
  // Clone du vecteur zéro
  const vector: EmotionVector14D = { ...ZERO_VECTOR_14D };
  
  for (const hit of emotionHits) {
    const emotionName = hit.emotion.toLowerCase();
    
    // Vérifie si c'est une émotion OMEGA valide
    if (isOmegaEmotion(emotionName)) {
      // Additionne les intensités (peut dépasser 1 si plusieurs hits)
      // Puis on normalise après
      vector[emotionName] += hit.intensity * hit.occurrences;
    }
    // SINON: on ignore silencieusement les émotions non-OMEGA
    // (pas d'invention, pas d'erreur - juste ignoré)
  }
  
  // Normalisation: clamp toutes les valeurs à [0, 1]
  for (const emotion of OMEGA_EMOTIONS_14D) {
    vector[emotion] = clamp(vector[emotion], 0, 1);
  }
  
  return vector;
}

/**
 * Extrait les mots-clés groupés par émotion OMEGA
 * @invariant INV-BRIDGE-02: seules émotions officielles
 */
function extractKeywordsByEmotion(emotionHits: EmotionHit[]): Map<OmegaEmotion14D, string[]> {
  const keywordsMap = new Map<OmegaEmotion14D, string[]>();
  
  for (const hit of emotionHits) {
    const emotionName = hit.emotion.toLowerCase();
    
    if (isOmegaEmotion(emotionName)) {
      const existing = keywordsMap.get(emotionName) || [];
      keywordsMap.set(emotionName, [...existing, ...hit.keywords]);
    }
  }
  
  return keywordsMap;
}

/**
 * Valide et normalise l'émotion dominante
 * @returns émotion OMEGA ou null si non reconnue
 */
function validateDominantEmotion(dominant: string): OmegaEmotion14D | null {
  const normalized = dominant.toLowerCase();
  return isOmegaEmotion(normalized) ? normalized : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforme un AnalyzeResult en MyceliumBridgeData
 * 
 * @param analysis - Résultat de dump_analysis (JSON)
 * @returns Données prêtes pour MyceliumDNA
 * 
 * @invariant INV-BRIDGE-01: Déterminisme total
 * @invariant INV-BRIDGE-02: Aligné 14D OMEGA
 * @invariant INV-BRIDGE-03: Conservation des émotions valides
 * @invariant INV-BRIDGE-04: Intensités normalisées [0, 1]
 * 
 * @example
 * ```typescript
 * const analysis = JSON.parse(fs.readFileSync('dump_analysis.json', 'utf8'));
 * const bridgeData = buildBridgeData(analysis);
 * // bridgeData.emotionVector contient le vecteur 14D
 * // bridgeData.contentHash est déterministe
 * ```
 */
export function buildBridgeData(analysis: AnalyzeResult): MyceliumBridgeData {
  // 1. Valider l'input (Zod)
  const validated = parseAnalyzeResult(analysis);
  
  // 2. Construire le vecteur émotionnel 14D
  const emotionVector = mapEmotionsToVector14D(validated.emotions);
  
  // 3. Extraire mots-clés par émotion
  const keywordsByEmotion = extractKeywordsByEmotion(validated.emotions);
  
  // 4. Valider l'émotion dominante
  const dominantEmotion = validateDominantEmotion(validated.dominant_emotion);
  
  // 5. Calculer le hash déterministe (sans données volatiles)
  const stableData = extractStableData(validated);
  const contentHash = deterministicHash(stableData);
  
  return {
    emotionVector,
    dominantEmotion,
    textMetrics: {
      wordCount: validated.word_count,
      charCount: validated.char_count,
      lineCount: validated.line_count,
      totalEmotionHits: validated.total_emotion_hits
    },
    keywordsByEmotion,
    meta: {
      source: validated.source,
      runId: validated.run_id,
      version: validated.version,
      deterministic: validated.analysis_meta.deterministic
    },
    contentHash
  };
}

/**
 * Vérifie si deux BridgeData sont identiques (pour tests)
 * @invariant INV-BRIDGE-01: même input → même contentHash
 */
export function areBridgeDataEqual(a: MyceliumBridgeData, b: MyceliumBridgeData): boolean {
  return a.contentHash === b.contentHash;
}

/**
 * Convertit le vecteur 14D en tableau ordonné
 * Ordre: alphabétique des émotions OMEGA
 */
export function vectorToArray(vector: EmotionVector14D): number[] {
  return OMEGA_EMOTIONS_14D.map(emotion => vector[emotion]);
}

/**
 * Calcule la magnitude du vecteur émotionnel
 * Utile pour mesurer l'intensité émotionnelle globale
 */
export function vectorMagnitude(vector: EmotionVector14D): number {
  const values = vectorToArray(vector);
  const sumSquares = values.reduce((sum, v) => sum + v * v, 0);
  return Math.sqrt(sumSquares);
}

/**
 * Trouve l'émotion dominante du vecteur
 * @returns Émotion avec la plus haute intensité
 */
export function findDominantFromVector(vector: EmotionVector14D): OmegaEmotion14D {
  let maxIntensity = -1;
  let dominant: OmegaEmotion14D = 'joy'; // Default
  
  for (const emotion of OMEGA_EMOTIONS_14D) {
    if (vector[emotion] > maxIntensity) {
      maxIntensity = vector[emotion];
      dominant = emotion;
    }
  }
  
  return dominant;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export {
  ZERO_VECTOR_14D,
  clamp,
  deterministicHash
};
