// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA MYCELIUM — BRIDGE TESTS (L4 NASA-Grade)
// Version: 1.0.0
// 
// INVARIANTS TESTÉS:
//   INV-BRIDGE-01: Déterminisme — même input + seed = même output
//   INV-BRIDGE-02: Alignement 14D — uniquement émotions OMEGA officielles
//   INV-BRIDGE-03: Conservation — aucune émotion perdue, aucune inventée
//   INV-BRIDGE-04: Normalisation — intensités dans [0, 1]
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildBridgeData,
  areBridgeDataEqual,
  vectorToArray,
  vectorMagnitude,
  findDominantFromVector,
  ZERO_VECTOR_14D,
  clamp,
  deterministicHash,
  EmotionVector14D,
  MyceliumBridgeData
} from '../src/bridge/text_analyzer_bridge';
import {
  AnalyzeResult,
  OMEGA_EMOTIONS_14D,
  isOmegaEmotion,
  parseAnalyzeResult
} from '../src/bridge/types';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ANALYSIS: AnalyzeResult = {
  run_id: "2026-01-02_19-56-30",
  timestamp: "2026-01-02T18:56:30.060637900+00:00",
  duration_ms: 0,
  source: "C:\\Users\\elric\\omega-project\\test_input.txt",
  word_count: 47,
  char_count: 284,
  line_count: 4,
  total_emotion_hits: 4,
  emotions: [
    {
      emotion: "fear",
      intensity: 0.5,
      occurrences: 2,
      keywords: ["peur", "terreur"],
      keyword_counts: [
        { word: "peur", count: 1 },
        { word: "terreur", count: 1 }
      ]
    },
    {
      emotion: "joy",
      intensity: 0.5,
      occurrences: 2,
      keywords: ["heureuse", "joie"],
      keyword_counts: [
        { word: "heureuse", count: 1 },
        { word: "joie", count: 1 }
      ]
    }
  ],
  dominant_emotion: "fear",
  version: "0.8.0-HYBRID",
  segmentation: null,
  segments: null,
  analysis_meta: {
    mode: "deterministic",
    provider: null,
    ai_calls: 0,
    deterministic: true,
    fallback_used: false
  }
};

const ANALYSIS_WITH_UNKNOWN_EMOTION: AnalyzeResult = {
  ...VALID_ANALYSIS,
  emotions: [
    ...VALID_ANALYSIS.emotions,
    {
      emotion: "unknown_emotion",  // Émotion non-OMEGA
      intensity: 0.8,
      occurrences: 1,
      keywords: ["fake"],
      keyword_counts: [{ word: "fake", count: 1 }]
    }
  ]
};

const ANALYSIS_HIGH_INTENSITY: AnalyzeResult = {
  ...VALID_ANALYSIS,
  emotions: [
    {
      emotion: "anger",
      intensity: 0.9,
      occurrences: 10,  // 0.9 * 10 = 9.0 (doit être clampé à 1.0)
      keywords: ["rage", "colère"],
      keyword_counts: [
        { word: "rage", count: 5 },
        { word: "colère", count: 5 }
      ]
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — INV-BRIDGE-01: Déterminisme
// ─────────────────────────────────────────────────────────────────────────────

describe('INV-BRIDGE-01: Déterminisme', () => {
  it('même input → même contentHash (10 runs)', () => {
    const results: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const bridge = buildBridgeData(VALID_ANALYSIS);
      results.push(bridge.contentHash);
    }
    
    // Tous les hash doivent être identiques
    const firstHash = results[0];
    expect(results.every(h => h === firstHash)).toBe(true);
  });

  it('areBridgeDataEqual retourne true pour mêmes inputs', () => {
    const bridge1 = buildBridgeData(VALID_ANALYSIS);
    const bridge2 = buildBridgeData(VALID_ANALYSIS);
    
    expect(areBridgeDataEqual(bridge1, bridge2)).toBe(true);
  });

  it('timestamp différent → même contentHash (volatile ignoré)', () => {
    const analysis1 = { ...VALID_ANALYSIS };
    const analysis2 = { 
      ...VALID_ANALYSIS, 
      timestamp: "2026-01-03T00:00:00.000000000+00:00",
      run_id: "different-run-id"
    };
    
    const bridge1 = buildBridgeData(analysis1);
    const bridge2 = buildBridgeData(analysis2);
    
    // Hash doit être identique car timestamp/run_id sont volatiles
    expect(bridge1.contentHash).toBe(bridge2.contentHash);
  });

  it('contenu différent → hash différent', () => {
    const analysis2 = { 
      ...VALID_ANALYSIS, 
      word_count: 100  // Changement de contenu
    };
    
    const bridge1 = buildBridgeData(VALID_ANALYSIS);
    const bridge2 = buildBridgeData(analysis2);
    
    expect(bridge1.contentHash).not.toBe(bridge2.contentHash);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — INV-BRIDGE-02: Alignement 14D
// ─────────────────────────────────────────────────────────────────────────────

describe('INV-BRIDGE-02: Alignement 14D', () => {
  it('vecteur contient exactement 14 dimensions', () => {
    const bridge = buildBridgeData(VALID_ANALYSIS);
    const dimensions = Object.keys(bridge.emotionVector);
    
    expect(dimensions.length).toBe(14);
  });

  it('toutes les émotions sont OMEGA officielles', () => {
    const bridge = buildBridgeData(VALID_ANALYSIS);
    const dimensions = Object.keys(bridge.emotionVector);
    
    for (const dim of dimensions) {
      expect(isOmegaEmotion(dim)).toBe(true);
    }
  });

  it('vectorToArray retourne 14 valeurs', () => {
    const bridge = buildBridgeData(VALID_ANALYSIS);
    const array = vectorToArray(bridge.emotionVector);
    
    expect(array.length).toBe(14);
  });

  it('émotion inconnue ignorée silencieusement', () => {
    const bridge = buildBridgeData(ANALYSIS_WITH_UNKNOWN_EMOTION);
    
    // Pas de dimension "unknown_emotion"
    expect('unknown_emotion' in bridge.emotionVector).toBe(false);
    
    // Toujours 14 dimensions
    expect(Object.keys(bridge.emotionVector).length).toBe(14);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — INV-BRIDGE-03: Conservation
// ─────────────────────────────────────────────────────────────────────────────

describe('INV-BRIDGE-03: Conservation', () => {
  it('émotions valides conservées dans le vecteur', () => {
    const bridge = buildBridgeData(VALID_ANALYSIS);
    
    // fear et joy doivent avoir des valeurs > 0
    expect(bridge.emotionVector.fear).toBeGreaterThan(0);
    expect(bridge.emotionVector.joy).toBeGreaterThan(0);
  });

  it('dominant_emotion conservé si valide', () => {
    const bridge = buildBridgeData(VALID_ANALYSIS);
    
    expect(bridge.dominantEmotion).toBe('fear');
  });

  it('keywords conservés par émotion', () => {
    const bridge = buildBridgeData(VALID_ANALYSIS);
    
    const fearKeywords = bridge.keywordsByEmotion.get('fear');
    expect(fearKeywords).toBeDefined();
    expect(fearKeywords).toContain('peur');
    expect(fearKeywords).toContain('terreur');
  });

  it('textMetrics conservés intacts', () => {
    const bridge = buildBridgeData(VALID_ANALYSIS);
    
    expect(bridge.textMetrics.wordCount).toBe(47);
    expect(bridge.textMetrics.charCount).toBe(284);
    expect(bridge.textMetrics.lineCount).toBe(4);
    expect(bridge.textMetrics.totalEmotionHits).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — INV-BRIDGE-04: Normalisation
// ─────────────────────────────────────────────────────────────────────────────

describe('INV-BRIDGE-04: Normalisation', () => {
  it('toutes les intensités dans [0, 1]', () => {
    const bridge = buildBridgeData(VALID_ANALYSIS);
    const values = vectorToArray(bridge.emotionVector);
    
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('intensité cumulative clampée à 1.0', () => {
    // anger: 0.9 * 10 occurrences = 9.0 → doit être 1.0
    const bridge = buildBridgeData(ANALYSIS_HIGH_INTENSITY);
    
    expect(bridge.emotionVector.anger).toBe(1.0);
  });

  it('clamp fonctionne correctement', () => {
    expect(clamp(-0.5, 0, 1)).toBe(0);
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

describe('Utilitaires Bridge', () => {
  it('vectorMagnitude calcule correctement', () => {
    const vector: EmotionVector14D = { ...ZERO_VECTOR_14D, joy: 1, fear: 1 };
    const magnitude = vectorMagnitude(vector);
    
    // sqrt(1² + 1²) = sqrt(2) ≈ 1.414
    expect(magnitude).toBeCloseTo(Math.sqrt(2), 5);
  });

  it('findDominantFromVector trouve le max', () => {
    const vector: EmotionVector14D = { 
      ...ZERO_VECTOR_14D, 
      joy: 0.3, 
      anger: 0.9, 
      fear: 0.1 
    };
    
    expect(findDominantFromVector(vector)).toBe('anger');
  });

  it('deterministicHash est stable', () => {
    const obj = { a: 1, b: 2 };
    const hash1 = deterministicHash(obj);
    const hash2 = deterministicHash(obj);
    
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 = 64 hex chars
  });

  it('parseAnalyzeResult valide le schéma', () => {
    expect(() => parseAnalyzeResult(VALID_ANALYSIS)).not.toThrow();
  });

  it('parseAnalyzeResult rejette les données invalides', () => {
    const invalid = { ...VALID_ANALYSIS, word_count: "not a number" };
    expect(() => parseAnalyzeResult(invalid)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  it('analyse sans émotions → vecteur zéro', () => {
    const emptyAnalysis: AnalyzeResult = {
      ...VALID_ANALYSIS,
      emotions: [],
      total_emotion_hits: 0,
      dominant_emotion: ""
    };
    
    const bridge = buildBridgeData(emptyAnalysis);
    const values = vectorToArray(bridge.emotionVector);
    
    // Toutes les valeurs doivent être 0
    expect(values.every(v => v === 0)).toBe(true);
  });

  it('dominant_emotion invalide → null', () => {
    const analysis: AnalyzeResult = {
      ...VALID_ANALYSIS,
      dominant_emotion: "not_an_emotion"
    };
    
    const bridge = buildBridgeData(analysis);
    expect(bridge.dominantEmotion).toBeNull();
  });
});
