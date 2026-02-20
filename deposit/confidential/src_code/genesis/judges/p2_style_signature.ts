// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — P2 STYLE-SIGNATURE (Pareto Score)
// ═══════════════════════════════════════════════════════════════════════════════
// Score non-bloquant: cadence et temperature lexicale (pour tri Pareto)
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  GenesisConfig,
} from '../core/types';

/**
 * Calcule le score STYLE-SIGNATURE (non-bloquant, pour Pareto)
 */
export function evaluateStyleSignature(
  draft: Draft,
  config: GenesisConfig
): number {
  const text = draft.text;
  const thresholds = config.judges.pareto.styleSignature;

  // 1. Score de cadence
  const cadence = computeCadence(text);
  const targetCadence = (thresholds.TARGET_CADENCE_RANGE[0] + thresholds.TARGET_CADENCE_RANGE[1]) / 2;
  const cadenceDistance = Math.abs(cadence - targetCadence);
  const cadenceScore = Math.max(0, 1 - cadenceDistance * 2);

  // 2. Score de temperature lexicale
  const lexicalTemp = computeLexicalTemperature(text);
  const tempDistance = Math.abs(lexicalTemp - thresholds.TARGET_LEXICAL_TEMP);
  const tempScore = Math.max(0, 1 - tempDistance * 2);

  // Combinaison: moyenne ponderee
  const combinedScore = cadenceScore * 0.5 + tempScore * 0.5;

  return combinedScore;
}

/**
 * Calcule la cadence du texte
 * Basee sur le pattern de longueurs de phrases (variation rythmique)
 */
function computeCadence(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length <= 2) return 0.5; // Neutre pour texte court

  // Calculer les longueurs
  const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);

  // Analyser les patterns de variation
  let risingCount = 0;
  let fallingCount = 0;
  let steadyCount = 0;

  for (let i = 1; i < lengths.length; i++) {
    const diff = lengths[i] - lengths[i - 1];
    if (diff > 2) risingCount++;
    else if (diff < -2) fallingCount++;
    else steadyCount++;
  }

  const total = lengths.length - 1;
  if (total === 0) return 0.5;

  // Une bonne cadence a un equilibre entre variation et stabilite
  const variationRatio = (risingCount + fallingCount) / total;
  const balanceRatio = Math.min(risingCount, fallingCount) / Math.max(risingCount, fallingCount, 1);

  // Score combine: variation moderee + balance
  const cadence = variationRatio * 0.5 + balanceRatio * 0.5;

  return cadence;
}

/**
 * Calcule la temperature lexicale
 * Basee sur la densite de mots abstraits vs concrets
 */
function computeLexicalTemperature(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0.5;

  // Mots "chauds" (emotionnels, abstraits)
  const hotWords = new Set([
    'love', 'hate', 'fear', 'hope', 'dream', 'desire', 'passion',
    'soul', 'heart', 'spirit', 'eternal', 'infinite', 'destiny',
    'believe', 'feel', 'think', 'imagine', 'wonder', 'wish',
    'beautiful', 'terrible', 'amazing', 'horrible', 'wonderful',
  ]);

  // Mots "froids" (concrets, factuels)
  const coldWords = new Set([
    'said', 'walked', 'sat', 'stood', 'looked', 'took', 'put',
    'table', 'chair', 'door', 'window', 'floor', 'wall', 'room',
    'hand', 'face', 'eye', 'head', 'body', 'foot', 'arm',
    'one', 'two', 'three', 'first', 'last', 'next', 'then',
  ]);

  let hotCount = 0;
  let coldCount = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (hotWords.has(cleanWord)) hotCount++;
    if (coldWords.has(cleanWord)) coldCount++;
  }

  // Temperature = ratio hot / (hot + cold)
  const total = hotCount + coldCount;
  if (total === 0) return 0.5; // Neutre

  const temperature = hotCount / total;

  return temperature;
}

/**
 * Analyse supplementaire: patterns stylistiques
 */
export function analyzeStylePatterns(text: string): {
  dialogueRatio: number;
  descriptionRatio: number;
  actionRatio: number;
} {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) {
    return { dialogueRatio: 0, descriptionRatio: 0, actionRatio: 0 };
  }

  let dialogueCount = 0;
  let descriptionCount = 0;
  let actionCount = 0;

  for (const sentence of sentences) {
    // Dialogue: contient des guillemets
    if (/["']/.test(sentence)) {
      dialogueCount++;
    }
    // Description: contient des adjectifs sensoriels ou descriptifs
    else if (/\b(was|were|is|are|seemed|appeared|looked|felt)\b/i.test(sentence)) {
      descriptionCount++;
    }
    // Action: contient des verbes d'action
    else if (/\b(ran|jumped|grabbed|threw|hit|kicked|pushed|pulled)\b/i.test(sentence)) {
      actionCount++;
    }
  }

  const total = sentences.length;
  return {
    dialogueRatio: dialogueCount / total,
    descriptionRatio: descriptionCount / total,
    actionRatio: actionCount / total,
  };
}

export default evaluateStyleSignature;
