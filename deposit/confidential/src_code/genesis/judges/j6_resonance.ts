// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — J6 RESONANCE (O2 Alignment & Rhythm)
// ═══════════════════════════════════════════════════════════════════════════════
// Alignement avec le profil O2 cible, analyse du rythme narratif
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  EmotionTrajectoryContract,
  GenesisConfig,
  JudgeScore,
} from '../core/types';

/**
 * Evalue la resonance d'un draft avec le contrat
 */
export function evaluateResonance(
  draft: Draft,
  contract: EmotionTrajectoryContract,
  config: GenesisConfig
): JudgeScore {
  const text = draft.text;
  const metrics: Record<string, number> = {};
  const thresholds = config.judges.resonance;

  // 1. Calculer l'alignement O2
  const o2Alignment = computeO2Alignment(text, contract);
  metrics['o2_alignment'] = o2Alignment;

  // 2. Calculer le rythme
  const rhythm = computeRhythm(text);
  metrics['rhythm'] = rhythm;
  metrics['avg_sentence_length'] = computeAvgSentenceLength(text);
  metrics['sentence_length_variance'] = computeSentenceLengthVariance(text);

  // 3. Analyser les marqueurs de respiration
  const breathingAlignment = computeBreathingAlignment(text, contract);
  metrics['breathing_alignment'] = breathingAlignment;

  // 4. Evaluer le verdict
  const rhythmInBand = rhythm >= thresholds.RHYTHM_BAND[0] && rhythm <= thresholds.RHYTHM_BAND[1];
  const pass = o2Alignment >= thresholds.MIN_O2_ALIGNMENT && rhythmInBand;

  return {
    verdict: pass ? 'PASS' : 'FAIL',
    metrics,
    threshold: {
      MIN_O2_ALIGNMENT: thresholds.MIN_O2_ALIGNMENT,
      RHYTHM_BAND_MIN: thresholds.RHYTHM_BAND[0],
      RHYTHM_BAND_MAX: thresholds.RHYTHM_BAND[1],
    },
    details: pass
      ? undefined
      : `Failed: o2_alignment=${o2Alignment.toFixed(3)} (min ${thresholds.MIN_O2_ALIGNMENT}), ` +
        `rhythm=${rhythm.toFixed(3)} (band [${thresholds.RHYTHM_BAND[0]}, ${thresholds.RHYTHM_BAND[1]}])`,
  };
}

/**
 * Calcule l'alignement O2 du texte avec le contrat
 * Basé sur l'intensité émotionnelle perçue vs cible
 */
function computeO2Alignment(text: string, contract: EmotionTrajectoryContract): number {
  // Heuristique: mesurer l'intensité du texte via des proxies
  const textIntensity = measureTextIntensity(text);

  // Calculer l'O2 cible moyen depuis les windows
  let targetO2 = 0.5; // Default
  if (contract.windows.length > 0) {
    let sum = 0;
    let weight = 0;
    for (const w of contract.windows) {
      const windowWeight = w.tEnd - w.tStart;
      sum += ((w.targetOxygen.min + w.targetOxygen.max) / 2) * windowWeight;
      weight += windowWeight;
    }
    targetO2 = weight > 0 ? sum / weight : 0.5;
  }

  // Calculer l'alignement (1 - distance normalisée)
  const distance = Math.abs(textIntensity - targetO2);
  return Math.max(0, 1 - distance);
}

/**
 * Mesure l'intensité perçue d'un texte
 * Heuristique basée sur ponctuation, longueur phrases, mots d'intensité
 */
function measureTextIntensity(text: string): number {
  let intensityScore = 0;
  let factors = 0;

  // 1. Ponctuation forte (!, ?, ...)
  const exclamations = (text.match(/!/g) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  const ellipses = (text.match(/\.\.\./g) || []).length;
  const dashes = (text.match(/—|--/g) || []).length;

  const punctuationIntensity = Math.min(1, (exclamations * 0.3 + questions * 0.2 + ellipses * 0.1 + dashes * 0.15) / 5);
  intensityScore += punctuationIntensity;
  factors++;

  // 2. Longueur des phrases (phrases courtes = plus intense)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / (sentences.length || 1);
  const lengthIntensity = Math.max(0, Math.min(1, 1 - (avgLength - 5) / 20));
  intensityScore += lengthIntensity;
  factors++;

  // 3. Mots d'intensité
  const intensityWords = [
    'suddenly', 'immediately', 'instantly', 'urgently',
    'desperate', 'frantic', 'wild', 'fierce',
    'thundering', 'crashing', 'screaming', 'exploding',
    'heart', 'blood', 'fire', 'storm',
  ];
  const textLower = text.toLowerCase();
  let intensityWordCount = 0;
  for (const word of intensityWords) {
    if (textLower.includes(word)) {
      intensityWordCount++;
    }
  }
  const wordIntensity = Math.min(1, intensityWordCount / 5);
  intensityScore += wordIntensity;
  factors++;

  return factors > 0 ? intensityScore / factors : 0.5;
}

/**
 * Calcule le score de rythme du texte
 * Basé sur la variance des longueurs de phrases normalisée
 */
function computeRhythm(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length <= 1) return 0.5; // Rythme neutre pour texte court

  // Calculer les longueurs
  const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);

  // Calculer la variance normalisée
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient de variation (normalized)
  const cv = avg > 0 ? stdDev / avg : 0;

  // Un bon rythme a une variance modérée (pas trop uniforme, pas trop chaotique)
  // CV autour de 0.3-0.5 est optimal
  // Transformer en score [0, 1]
  const optimalCV = 0.4;
  const cvDistance = Math.abs(cv - optimalCV);
  const rhythmScore = Math.max(0, Math.min(1, 1 - cvDistance));

  return rhythmScore;
}

/**
 * Calcule la longueur moyenne des phrases
 */
function computeAvgSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  const totalWords = sentences.reduce((sum, s) =>
    sum + s.split(/\s+/).filter(w => w.length > 0).length, 0
  );

  return totalWords / sentences.length;
}

/**
 * Calcule la variance des longueurs de phrases
 */
function computeSentenceLengthVariance(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length <= 1) return 0;

  const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;

  return variance;
}

/**
 * Calcule l'alignement avec les marqueurs de respiration du contrat
 */
function computeBreathingAlignment(text: string, contract: EmotionTrajectoryContract): number {
  if (contract.breathingMarkers.length === 0) return 1.0; // Pas de marqueurs = aligné par défaut

  // Heuristique simple: vérifier si le texte a des pauses/ruptures aux bons endroits
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  let matches = 0;
  for (const marker of contract.breathingMarkers) {
    const sentenceIndex = Math.floor(marker.t * sentences.length);

    if (sentenceIndex >= 0 && sentenceIndex < sentences.length) {
      const sentence = sentences[sentenceIndex];

      // Vérifier si la phrase correspond au type de marqueur
      switch (marker.type) {
        case 'PAUSE':
          // Phrase courte = pause
          if (sentence.split(/\s+/).length < 8) matches++;
          break;
        case 'CLIMAX':
          // Phrase avec ponctuation forte
          if (/[!]/.test(sentence)) matches++;
          break;
        case 'RUPTURE':
          // Phrase avec tiret ou ellipse
          if (/—|--|\.\.\./.test(sentence)) matches++;
          break;
        case 'RELEASE':
          // Phrase plus longue et calme
          if (sentence.split(/\s+/).length > 12) matches++;
          break;
        default:
          matches += 0.5; // Partial match for other types
      }
    }
  }

  return matches / contract.breathingMarkers.length;
}

export default evaluateResonance;
