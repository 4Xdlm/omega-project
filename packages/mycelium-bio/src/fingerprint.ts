// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — FINGERPRINT v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Empreinte unique du livre (Fragrances de l'Âme)
// Permet la classification et comparaison émotionnelle entre livres
// ═══════════════════════════════════════════════════════════════════════════════

import {
  EmotionType,
  IntensityRecord14,
  MyceliumFingerprint,
  MyceliumNode,
  SimilarityResult,
  EMOTION_TYPES,
  EMOTION_COUNT
} from "./types.js";
import { computeOxygenHistogram, computeOxygenStats, computeBreathingStats } from "./bio_engine.js";
import { computeHueHistogram } from "./morpho_engine.js";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

// ─────────────────────────────────────────────────────────────────────────────
// DISTRIBUTION ÉMOTIONNELLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule la distribution émotionnelle moyenne sur tous les nœuds
 * 
 * @param nodes - Nœuds du Mycélium
 * @returns Distribution normalisée (Σ = 1)
 */
export function computeEmotionDistribution(nodes: readonly MyceliumNode[]): IntensityRecord14 {
  const sums: Record<EmotionType, number> = {} as Record<EmotionType, number>;
  for (const type of EMOTION_TYPES) {
    sums[type] = 0;
  }

  // Somme des intensités par émotion
  for (const node of nodes) {
    if (node.kind === "sentence" || node.kind === "paragraph") {
      for (const type of EMOTION_TYPES) {
        sums[type] += node.emotionField.normalizedIntensities[type] ?? 0;
      }
    }
  }

  // Normalisation
  let total = 0;
  for (const type of EMOTION_TYPES) {
    total += sums[type];
  }

  if (total < 1e-9) {
    // Distribution uniforme
    const uniform = 1 / EMOTION_COUNT;
    for (const type of EMOTION_TYPES) {
      sums[type] = uniform;
    }
  } else {
    for (const type of EMOTION_TYPES) {
      sums[type] /= total;
    }
  }

  return sums as IntensityRecord14;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD FINGERPRINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit l'empreinte unique (fingerprint) d'un Mycélium
 */
export function buildFingerprint(nodes: readonly MyceliumNode[]): MyceliumFingerprint {
  // Extraire données des nœuds phrases
  const sentenceNodes = nodes.filter(n => n.kind === "sentence");

  const oxygenValues = sentenceNodes.map(n => n.oxygen);
  const hueValues = sentenceNodes.map(n => n.color.h);

  // Deltas pour respiration
  const oxygenDeltas: number[] = [];
  const conservationDeltas: number[] = [];

  for (let i = 1; i < sentenceNodes.length; i++) {
    oxygenDeltas.push(sentenceNodes[i].oxygen - sentenceNodes[i - 1].oxygen);
    conservationDeltas.push(sentenceNodes[i].emotionField.conservationDelta);
  }

  // Distribution émotionnelle
  const emotionDistribution = computeEmotionDistribution(nodes);

  // Histogrammes
  const oxygenHistogram = computeOxygenHistogram(oxygenValues);
  const hueHistogram = computeHueHistogram(hueValues);

  // Stats O₂
  const oxygenStats = computeOxygenStats(oxygenValues);

  // Stats respiration
  const breathingStats = computeBreathingStats(oxygenDeltas, conservationDeltas);

  // Comptage markers
  let fruitCount = 0;
  let scarCount = 0;
  for (const node of sentenceNodes) {
    for (const marker of node.markers) {
      if (marker.type === "MUSHROOM" || marker.type === "BLOOM") {
        fruitCount++;
      } else if (marker.type === "SCAR") {
        scarCount++;
      }
    }
  }

  return {
    emotionDistribution,
    oxygenHistogram,
    hueHistogram,
    stats: {
      avgOxygen: oxygenStats.avg,
      maxOxygen: oxygenStats.max,
      minOxygen: oxygenStats.min,
      hypoxiaEvents: oxygenStats.hypoxiaEvents,
      hyperoxiaEvents: oxygenStats.hyperoxiaEvents,
      climaxEvents: oxygenStats.climaxEvents,
      fruitCount,
      scarCount
    },
    breathing: {
      avgInhaleExhaleRatio: breathingStats.avgInhaleExhaleRatio,
      rhythmVariance: breathingStats.rhythmVariance,
      avgConservationDelta: breathingStats.avgConservationDelta
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMILARITÉ (Fragrances de l'Âme)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule la similarité cosinus entre deux vecteurs
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator < 1e-9) {
    return 0;
  }

  return clamp(dotProduct / denominator, 0, 1);
}

/**
 * Convertit un IntensityRecord14 en array pour similarité
 */
function intensityRecordToArray(record: IntensityRecord14): number[] {
  return EMOTION_TYPES.map(t => record[t] ?? 0);
}

/**
 * Calcule la similarité entre deux fingerprints
 * 
 * Pondération:
 * - 50% Distribution émotionnelle
 * - 30% Histogramme O₂
 * - 20% Histogramme Hue
 */
export function computeSimilarity(
  fp1: MyceliumFingerprint,
  fp2: MyceliumFingerprint
): SimilarityResult {
  // 1. Similarité distribution émotionnelle
  const emotionVec1 = intensityRecordToArray(fp1.emotionDistribution);
  const emotionVec2 = intensityRecordToArray(fp2.emotionDistribution);
  const emotionSimilarity = cosineSimilarity(emotionVec1, emotionVec2);

  // 2. Similarité histogramme O₂
  const oxygenSimilarity = cosineSimilarity(
    fp1.oxygenHistogram as number[],
    fp2.oxygenHistogram as number[]
  );

  // 3. Similarité histogramme Hue
  const hueSimilarity = cosineSimilarity(
    fp1.hueHistogram as number[],
    fp2.hueHistogram as number[]
  );

  // Score pondéré
  const score = 
    0.50 * emotionSimilarity +
    0.30 * oxygenSimilarity +
    0.20 * hueSimilarity;

  // Classification fragrance
  const fragrance = classifyFragrance(fp1);

  return {
    score: clamp(score, 0, 1),
    components: {
      emotionSimilarity,
      oxygenSimilarity,
      hueSimilarity
    },
    fragrance
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICATION FRAGRANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Noms des fragrances par combinaison émotionnelle
 */
const FRAGRANCE_NAMES: Record<string, string> = {
  // Combinaisons principales
  "joy_love": "Romantique Lumineux",
  "joy_hope": "Optimiste Radiant",
  "joy_trust": "Feel-Good Chaleureux",
  "sadness_despair": "Mélancolique Profond",
  "sadness_fear": "Thriller Sombre",
  "fear_anger": "Action Tendu",
  "anger_disgust": "Revenge Dark",
  "surprise_anticipation": "Page-Turner",
  "trust_hope": "Inspirationnel",
  "fear_surprise": "Suspense Haletant",
  "love_sadness": "Romance Tragique",
  "pride_anger": "Épique Héroïque",
  
  // Singles dominants
  "joy": "Joyeux",
  "sadness": "Mélancolique",
  "fear": "Anxiogène",
  "anger": "Intense",
  "surprise": "Surprenant",
  "disgust": "Dérangeant",
  "trust": "Apaisant",
  "anticipation": "Captivant",
  "love": "Romantique",
  "guilt": "Introspectif",
  "shame": "Tourmenté",
  "pride": "Épique",
  "hope": "Optimiste",
  "despair": "Sombre"
};

/**
 * Récupère les 2 émotions dominantes
 */
export function getTopEmotions(
  distribution: IntensityRecord14,
  count: number = 2
): EmotionType[] {
  const sorted = EMOTION_TYPES
    .map(t => ({ type: t, value: distribution[t] ?? 0 }))
    .sort((a, b) => b.value - a.value);

  return sorted.slice(0, count).map(e => e.type);
}

/**
 * Classifie un livre par sa fragrance émotionnelle
 */
export function classifyFragrance(fp: MyceliumFingerprint): string {
  const topEmotions = getTopEmotions(fp.emotionDistribution, 2);
  
  // Déterminer le rythme
  const rhythm = fp.stats.avgOxygen > 0.6 ? "Intense" : "Contemplatif";

  // Chercher une combinaison nommée
  const combo1 = `${topEmotions[0]}_${topEmotions[1]}`;
  const combo2 = `${topEmotions[1]}_${topEmotions[0]}`;

  let emotionName = FRAGRANCE_NAMES[combo1] 
    || FRAGRANCE_NAMES[combo2]
    || FRAGRANCE_NAMES[topEmotions[0]]
    || "Complexe";

  return `${rhythm} · ${emotionName}`;
}

/**
 * Génère une description textuelle de la fragrance
 */
export function describeFragrance(fp: MyceliumFingerprint): string {
  const topEmotions = getTopEmotions(fp.emotionDistribution, 3);
  const classification = classifyFragrance(fp);

  const lines: string[] = [];
  lines.push(`🍄 Fragrance: ${classification}`);
  lines.push(`📊 Émotions dominantes: ${topEmotions.join(", ")}`);
  lines.push(`💨 O₂ moyen: ${(fp.stats.avgOxygen * 100).toFixed(1)}%`);
  lines.push(`🎭 Climax: ${fp.stats.climaxEvents}`);
  lines.push(`🍄 Champignons: ${fp.stats.fruitCount}`);
  lines.push(`💔 Cicatrices: ${fp.stats.scarCount}`);

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// RECHERCHE DE LIVRES SIMILAIRES
// ─────────────────────────────────────────────────────────────────────────────

export interface SimilarBook {
  id: string;
  title: string;
  similarity: SimilarityResult;
}

/**
 * Trouve les livres les plus similaires dans une bibliothèque
 * 
 * @param targetFp - Fingerprint du livre cible
 * @param library - Bibliothèque de fingerprints {id, title, fingerprint}
 * @param limit - Nombre max de résultats
 * @returns Liste triée par similarité décroissante
 */
export function findSimilarBooks(
  targetFp: MyceliumFingerprint,
  library: Array<{ id: string; title: string; fingerprint: MyceliumFingerprint }>,
  limit: number = 10
): SimilarBook[] {
  const results: SimilarBook[] = [];

  for (const book of library) {
    const similarity = computeSimilarity(targetFp, book.fingerprint);
    results.push({
      id: book.id,
      title: book.title,
      similarity
    });
  }

  // Tri par score décroissant
  results.sort((a, b) => b.similarity.score - a.similarity.score);

  return results.slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS INLINE
// ─────────────────────────────────────────────────────────────────────────────

export function selfTest(): boolean {
  // Test cosine similarity
  const sim1 = cosineSimilarity([1, 0, 0], [1, 0, 0]);
  if (Math.abs(sim1 - 1) > 0.01) {
    console.error("FAIL: Identical vectors should have similarity 1:", sim1);
    return false;
  }

  const sim2 = cosineSimilarity([1, 0, 0], [0, 1, 0]);
  if (Math.abs(sim2) > 0.01) {
    console.error("FAIL: Orthogonal vectors should have similarity 0:", sim2);
    return false;
  }

  // Test symétrie
  const vecA = [0.3, 0.5, 0.2];
  const vecB = [0.4, 0.4, 0.2];
  const simAB = cosineSimilarity(vecA, vecB);
  const simBA = cosineSimilarity(vecB, vecA);
  if (Math.abs(simAB - simBA) > 1e-9) {
    console.error("FAIL: Similarity should be symmetric");
    return false;
  }

  // Test top emotions
  const dist: Record<EmotionType, number> = {} as Record<EmotionType, number>;
  for (const t of EMOTION_TYPES) dist[t] = 0.05;
  dist.joy = 0.4;
  dist.sadness = 0.2;

  const top = getTopEmotions(dist as IntensityRecord14, 2);
  if (top[0] !== "joy" || top[1] !== "sadness") {
    console.error("FAIL: Top emotions incorrect:", top);
    return false;
  }

  // Test fragrance classification
  const mockFp: MyceliumFingerprint = {
    emotionDistribution: dist as IntensityRecord14,
    oxygenHistogram: new Array(20).fill(0.05),
    hueHistogram: new Array(24).fill(1/24),
    stats: {
      avgOxygen: 0.65,
      maxOxygen: 0.95,
      minOxygen: 0.15,
      hypoxiaEvents: 2,
      hyperoxiaEvents: 1,
      climaxEvents: 3,
      fruitCount: 5,
      scarCount: 2
    },
    breathing: {
      avgInhaleExhaleRatio: 1.2,
      rhythmVariance: 0.05,
      avgConservationDelta: 0.03
    }
  };

  const fragrance = classifyFragrance(mockFp);
  if (!fragrance || fragrance.length === 0) {
    console.error("FAIL: Fragrance classification failed");
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  computeEmotionDistribution,
  buildFingerprint,
  cosineSimilarity,
  computeSimilarity,
  getTopEmotions,
  classifyFragrance,
  describeFragrance,
  findSimilarBooks,
  FRAGRANCE_NAMES,
  selfTest
};
