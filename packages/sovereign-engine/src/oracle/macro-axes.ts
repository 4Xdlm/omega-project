/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — MACRO AXES v3
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/macro-axes.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Consolidation 9 axes → 4 macro-axes:
 * - ECC: Emotional Control Core (60%, floor 88)
 * - RCI: Rhythmic Control Index (15%, floor 85)
 * - SII: Signature Integrity Index (15%, floor 85)
 * - IFI: Immersion Force Index (10%, floor 85)
 *
 * Avec anti-gaming cap (+3) et ScoreReasons (top3/top3)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { analyzeEmotionFromText } from '@omega/omega-forge';
import type { ForgePacket, AxisScore, SovereignProvider } from '../types.js';
import { SOVEREIGN_CONFIG } from '../config.js';

// Import des axes existants (sous-composants)
import { scoreTension14D } from './axes/tension-14d.js';
import { scoreEmotionCoherence } from './axes/emotion-coherence.js';
import { scoreInteriority } from './axes/interiority.js';
import { scoreImpact } from './axes/impact.js';
import { scoreRhythm } from './axes/rhythm.js';
import { scoreSignature } from './axes/signature.js';
import { scoreAntiCliche } from './axes/anti-cliche.js';
import { scoreNecessity } from './axes/necessity.js';
import { scoreSensoryDensity } from './axes/sensory-density.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — MACRO AXES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MacroAxisScore {
  readonly name: string;
  readonly score: number; // 0–100
  readonly weight: number; // Poids dans composite
  readonly method: 'CALC' | 'HYBRID';
  readonly sub_scores: readonly AxisScore[]; // Sous-composants pour audit
  readonly bonuses: readonly BonusMalus[]; // Bonus/malus appliqués
  readonly reasons: ScoreReasons; // TOP 3 contributeurs + pénalités
}

export interface BonusMalus {
  readonly type: 'entropy' | 'projection' | 'open_loop' | 'anti_metronomic';
  readonly value: number;
  readonly triggered: boolean;
  readonly detail: string;
}

export interface ScoreReasons {
  readonly top_contributors: readonly string[]; // Top 3 choses qui ont AUGMENTÉ le score
  readonly top_penalties: readonly string[]; // Top 3 choses qui ont DIMINUÉ le score
}

export interface MacroAxesScores {
  readonly ecc: MacroAxisScore; // Emotional Control Core — 60%
  readonly rci: MacroAxisScore; // Rhythmic Control Index — 15%
  readonly sii: MacroAxisScore; // Signature Integrity Index — 15%
  readonly ifi: MacroAxisScore; // Immersion Force Index — 10%
}

// ═══════════════════════════════════════════════════════════════════════════════
// ECC — EMOTIONAL CONTROL CORE (60%, floor 88)
// ═══════════════════════════════════════════════════════════════════════════════

export async function computeECC(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<MacroAxisScore> {
  // 1. Appeler les 4 sous-composants
  const tension_14d = scoreTension14D(packet, prose);
  const emotion_coherence = scoreEmotionCoherence(packet, prose);
  const interiority = await scoreInteriority(packet, prose, provider);
  const impact = await scoreImpact(packet, prose, provider);

  const sub_scores = [tension_14d, emotion_coherence, interiority, impact];

  // 2. Calculer le score brut avec poids internes
  const raw =
    (tension_14d.score * 3.0 +
      emotion_coherence.score * 2.5 +
      interiority.score * 2.0 +
      impact.score * 2.0) /
    9.5;

  // 3. Calculer les bonus/malus (TOUS 100% CALC)
  const bonuses: BonusMalus[] = [];
  let total_bonus = 0;

  // a) ENTROPY bonus
  const entropy_bonus = computeEntropyBonus(prose, packet);
  bonuses.push(entropy_bonus);
  if (entropy_bonus.triggered) {
    total_bonus += entropy_bonus.value;
  }

  // b) PROJECTION bonus
  const projection_bonus = computeProjectionBonus(interiority.score, packet);
  bonuses.push(projection_bonus);
  if (projection_bonus.triggered) {
    total_bonus += projection_bonus.value;
  }

  // c) OPEN_LOOP bonus
  const openloop_bonus = computeOpenLoopBonus(prose, packet);
  bonuses.push(openloop_bonus);
  if (openloop_bonus.triggered) {
    total_bonus += openloop_bonus.value;
  }

  // 4. ANTI-GAMING CAP: total bonus ≤ +3 net
  total_bonus = Math.min(total_bonus, SOVEREIGN_CONFIG.ECC_MAX_TOTAL_BONUS);

  // 5. Score final
  const score_final = Math.max(0, Math.min(100, raw + total_bonus));

  // 6. Construire ScoreReasons
  const reasons = buildECCReasons(sub_scores, bonuses);

  return {
    name: 'ecc',
    score: score_final,
    weight: SOVEREIGN_CONFIG.MACRO_WEIGHTS.ecc,
    method: 'HYBRID',
    sub_scores,
    bonuses,
    reasons,
  };
}

function computeEntropyBonus(prose: string, packet: ForgePacket): BonusMalus {
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length < 2) {
    return {
      type: 'entropy',
      value: 0,
      triggered: false,
      detail: 'Too few paragraphs to measure entropy',
    };
  }

  const arousals = paragraphs.map((p) => {
    const emotion = analyzeEmotionFromText(p, packet.language);
    // Arousal approximé par la somme des émotions à haute activation
    const high_activation = (emotion.fear || 0) + (emotion.anger || 0) + (emotion.joy || 0) + (emotion.surprise || 0);
    const low_activation = (emotion.sadness || 0) + (emotion.trust || 0) + (emotion.disgust || 0);
    return high_activation / (high_activation + low_activation + 0.001);
  });

  const mean = arousals.reduce((a, b) => a + b, 0) / arousals.length;
  const variance = arousals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arousals.length;
  const stddev = Math.sqrt(variance);

  if (stddev > SOVEREIGN_CONFIG.ECC_ENTROPY_STDDEV_THRESHOLD) {
    return {
      type: 'entropy',
      value: SOVEREIGN_CONFIG.ECC_ENTROPY_BONUS,
      triggered: true,
      detail: `Entropy stddev=${stddev.toFixed(3)}, bonus applied`,
    };
  }

  if (stddev === 0) {
    return {
      type: 'entropy',
      value: SOVEREIGN_CONFIG.ECC_ENTROPY_MALUS,
      triggered: true,
      detail: 'Zero entropy, predictable',
    };
  }

  return {
    type: 'entropy',
    value: 0,
    triggered: false,
    detail: `Entropy stddev=${stddev.toFixed(3)}, no bonus`,
  };
}

function computeProjectionBonus(interiority_score: number, packet: ForgePacket): BonusMalus {
  const terminal_dominant = packet.emotion_contract.terminal_state.dominant;
  const projection_emotions = ['sadness', 'fear', 'guilt', 'remorse'];

  if (interiority_score > 70 && projection_emotions.includes(terminal_dominant)) {
    return {
      type: 'projection',
      value: SOVEREIGN_CONFIG.ECC_PROJECTION_BONUS,
      triggered: true,
      detail: `Interiority ${interiority_score}, dominant ${terminal_dominant}`,
    };
  }

  return {
    type: 'projection',
    value: 0,
    triggered: false,
    detail: 'Projection conditions not met',
  };
}

function computeOpenLoopBonus(prose: string, packet: ForgePacket): BonusMalus {
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length < 3) {
    return {
      type: 'open_loop',
      value: 0,
      triggered: false,
      detail: 'Too few paragraphs',
    };
  }

  // Analyser les 2 derniers paragraphes
  const lastParagraphs = paragraphs.slice(-2);
  const lastEmotions = lastParagraphs.map((p) => analyzeEmotionFromText(p, packet.language));

  const avgArousal =
    lastEmotions.reduce((sum, e) => {
      const high = (e.fear || 0) + (e.anger || 0) + (e.joy || 0) + (e.surprise || 0);
      const low = (e.sadness || 0) + (e.trust || 0) + (e.disgust || 0);
      return sum + high / (high + low + 0.001);
    }, 0) / lastEmotions.length;

  if (avgArousal > 0.5) {
    return {
      type: 'open_loop',
      value: SOVEREIGN_CONFIG.ECC_OPENLOOP_BONUS,
      triggered: true,
      detail: `Last paragraphs arousal=${avgArousal.toFixed(2)}, tension unresolved`,
    };
  }

  return {
    type: 'open_loop',
    value: 0,
    triggered: false,
    detail: `Last paragraphs arousal=${avgArousal.toFixed(2)}, resolved`,
  };
}

function buildECCReasons(sub_scores: readonly AxisScore[], bonuses: readonly BonusMalus[]): ScoreReasons {
  // Top 3 contributeurs: sous-composants avec les plus hauts scores
  const sorted = [...sub_scores].sort((a, b) => b.score - a.score);
  const top_contributors = sorted.slice(0, 3).map((s) => `${s.name}=${s.score.toFixed(1)}`);

  // Top 3 pénalités: sous-composants avec les plus bas scores + bonus négatifs
  const penalties: string[] = [];
  const low_scores = [...sub_scores].sort((a, b) => a.score - b.score);
  penalties.push(...low_scores.slice(0, 2).map((s) => `${s.name}=${s.score.toFixed(1)}`));

  const negative_bonuses = bonuses.filter((b) => b.triggered && b.value < 0);
  penalties.push(...negative_bonuses.map((b) => `${b.type}=${b.value}`));

  return {
    top_contributors,
    top_penalties: penalties.slice(0, 3),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RCI — RHYTHMIC CONTROL INDEX (15%, floor 85)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-RCI-HOOKS-01: RCI includes hook verification weight ≥0.15
 */
export function computeRCI(packet: ForgePacket, prose: string): MacroAxisScore {
  // 1. Sous-composants
  const rhythm = scoreRhythm(packet, prose);
  const signature = scoreSignature(packet, prose);

  // 2. NEW: Symbol Map hook verification
  const hookScore = computeHookPresence(prose, packet);
  const hook_presence: AxisScore = {
    name: 'hook_presence',
    score: hookScore,
    weight: 0.20,
    method: 'CALC',
    details: `Symbol map hooks verified`,
  };

  const sub_scores = [rhythm, signature, hook_presence];

  // 3. Fusionner avec poids internes (NEW: rhythm×0.45 + signature×0.35 + hooks×0.20)
  const rci_raw = rhythm.score * 0.45 + signature.score * 0.35 + hookScore * 0.20;

  // 4. GARDE-FOU anti-métronomique
  const bonuses: BonusMalus[] = [];
  let penalty = 0;

  const details = rhythm.details || '';
  const giniMatch = details.match(/Gini=([0-9.]+)/);
  const syncopesMatch = details.match(/syncopes=(\d+)/);
  const compressionsMatch = details.match(/compressions=(\d+)/);

  if (giniMatch && syncopesMatch && compressionsMatch) {
    const gini = parseFloat(giniMatch[1]);
    const syncopes = parseInt(syncopesMatch[1], 10);
    const compressions = parseInt(compressionsMatch[1], 10);

    const giniPerfect = Math.abs(gini - SOVEREIGN_CONFIG.GINI_OPTIMAL) < 0.01;
    const syncopesPerfect = syncopes === SOVEREIGN_CONFIG.MIN_SYNCOPES_PER_SCENE;
    const compressionsPerfect = compressions === SOVEREIGN_CONFIG.MIN_COMPRESSIONS_PER_SCENE;

    if (giniPerfect && syncopesPerfect && compressionsPerfect) {
      penalty = SOVEREIGN_CONFIG.RCI_PERFECT_PENALTY;
      bonuses.push({
        type: 'anti_metronomic',
        value: penalty,
        triggered: true,
        detail: 'Too perfect metrics, artificial',
      });
    }
  }

  // 5. Score final
  const score_final = Math.max(0, Math.min(100, rci_raw + penalty));

  // 6. ScoreReasons
  const reasons = buildRCIReasons(sub_scores, bonuses);

  return {
    name: 'rci',
    score: score_final,
    weight: SOVEREIGN_CONFIG.MACRO_WEIGHTS.rci,
    method: 'CALC',
    sub_scores,
    bonuses,
    reasons,
  };
}

/**
 * Normalize text for hook matching: strip diacritics, lowercase.
 * "fibres mnésiques" → "fibres mnesiques"
 */
function normalizeHookText(text: string): string {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Compute hook presence score from Symbol Map recurrent motifs.
 * Uses token-based matching: compound hooks ("fibres mnésiques") are split
 * into tokens, each token checked for presence in prose via startsWith/exact.
 * This handles conjugation, plural, and partial presence.
 *
 * Returns:
 * - weighted average of hook scores × 100
 * - 75 (neutral) if no hooks defined
 */
function computeHookPresence(prose: string, packet: ForgePacket): number {
  const signatureWords = packet.style_genome.lexicon.signature_words;
  const motifs = packet.style_genome.imagery.recurrent_motifs;

  // Merge all hooks, dedupe (normalized)
  const allHooksRaw = [...new Set([
    ...signatureWords.map(w => w.toLowerCase()),
    ...motifs.map(m => m.toLowerCase()),
  ])];

  if (allHooksRaw.length === 0) {
    return 75; // Neutral, no penalty
  }

  // Normalize prose: strip diacritics, tokenize
  const normalizedProse = normalizeHookText(prose);
  const proseTokens = normalizedProse.split(/[^a-z]+/).filter(t => t.length > 2);

  let totalScore = 0;

  for (const hook of allHooksRaw) {
    const normalizedHook = normalizeHookText(hook);
    const hookTokens = normalizedHook.split(/[^a-z]+/).filter(t => t.length > 2);

    if (hookTokens.length === 0) {
      totalScore += 1; // Empty hook = free pass
      continue;
    }

    // Check each hook token: exact match OR prose token startsWith hook token (stem match)
    let tokensFound = 0;
    for (const ht of hookTokens) {
      const found = proseTokens.some(pt => pt === ht || pt.startsWith(ht) || ht.startsWith(pt));
      if (found) tokensFound++;
    }

    // Score for this hook = ratio of tokens found
    totalScore += tokensFound / hookTokens.length;
  }

  return (totalScore / allHooksRaw.length) * 100;
}

function buildRCIReasons(sub_scores: readonly AxisScore[], bonuses: readonly BonusMalus[]): ScoreReasons {
  const sorted = [...sub_scores].sort((a, b) => b.score - a.score);
  const top_contributors = sorted.map((s) => `${s.name}=${s.score.toFixed(1)}`);

  const penalties: string[] = [];
  const low_scores = [...sub_scores].sort((a, b) => a.score - b.score);
  penalties.push(...low_scores.slice(0, 1).map((s) => `${s.name}=${s.score.toFixed(1)}`));

  const negative_bonuses = bonuses.filter((b) => b.triggered && b.value < 0);
  penalties.push(...negative_bonuses.map((b) => `${b.type}=${b.value}`));

  return {
    top_contributors,
    top_penalties: penalties,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SII — SIGNATURE INTEGRITY INDEX (15%, floor 85)
// ═══════════════════════════════════════════════════════════════════════════════

export async function computeSII(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<MacroAxisScore> {
  // 1. Sous-composants
  const anti_cliche = scoreAntiCliche(packet, prose);
  const necessity = await scoreNecessity(packet, prose, provider);
  const sensory_density = await scoreSensoryDensity(packet, prose, provider);

  const sub_scores = [anti_cliche, necessity, sensory_density];

  // 2. Score pondéré (necessity = most stable signal, sensory overlap with IFI reduced)
  const sii_raw = anti_cliche.score * 0.35 + necessity.score * 0.45 + sensory_density.score * 0.20;

  // 3. Score final (pas de bonus/malus)
  const score_final = Math.max(0, Math.min(100, sii_raw));

  // 4. ScoreReasons
  const reasons = buildSIIReasons(sub_scores);

  return {
    name: 'sii',
    score: score_final,
    weight: SOVEREIGN_CONFIG.MACRO_WEIGHTS.sii,
    method: 'HYBRID',
    sub_scores,
    bonuses: [],
    reasons,
  };
}

function buildSIIReasons(sub_scores: readonly AxisScore[]): ScoreReasons {
  const sorted = [...sub_scores].sort((a, b) => b.score - a.score);
  const top_contributors = sorted.slice(0, 3).map((s) => `${s.name}=${s.score.toFixed(1)}`);

  const low_scores = [...sub_scores].sort((a, b) => a.score - b.score);
  const top_penalties = low_scores.slice(0, 2).map((s) => `${s.name}=${s.score.toFixed(1)}`);

  return {
    top_contributors,
    top_penalties,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IFI — IMMERSION FORCE INDEX (10%, floor 85)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-IFI-DISTRIB-01: IFI includes quartile distribution bonus.
 * New weight blend: sensory_richness×0.30 + corporeal_anchoring×0.35 + focalisation×0.35 + distribution_bonus
 */
export async function computeIFI(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<MacroAxisScore> {
  // 1. sensory_richness (CALC)
  const sensory_richness = computeSensoryRichness(prose);

  // 2. corporeal_anchoring (CALC)
  const corporeal_anchoring = computeCorporealAnchoring(prose);

  // 3. focalisation (LLM via provider.scoreSensoryDensity)
  // On réutilise scoreSensoryDensity existant
  const sensory_axis = await scoreSensoryDensity(packet, prose, provider);
  const focalisation = sensory_axis.score;

  // Sub-scores fictifs pour audit
  const sub_scores: AxisScore[] = [
    {
      name: 'sensory_richness',
      score: sensory_richness,
      weight: 0.30,
      method: 'CALC',
      details: `Categories present`,
    },
    {
      name: 'corporeal_anchoring',
      score: corporeal_anchoring,
      weight: 0.35,
      method: 'CALC',
      details: `Corporeal markers`,
    },
    {
      name: 'focalisation',
      score: focalisation,
      weight: 0.35,
      method: 'HYBRID',
      details: sensory_axis.details,
    },
  ];

  // 4. Score pondéré (NEW: 0.30 + 0.35 + 0.35, focalisation reduced from 0.40)
  const ifi_raw = sensory_richness * 0.30 + corporeal_anchoring * 0.35 + focalisation * 0.35;

  // 5. NEW: Distribution bonus (quartile coverage)
  const distributionBonus = computeDistributionBonus(prose);
  const bonuses: BonusMalus[] = [distributionBonus];

  let total_bonus = 0;
  if (distributionBonus.triggered) {
    total_bonus += distributionBonus.value;
  }

  // 6. Score final (capped at 100)
  const score_final = Math.max(0, Math.min(100, ifi_raw + total_bonus));

  // 7. ScoreReasons
  const reasons = buildIFIReasons(sub_scores);

  return {
    name: 'ifi',
    score: score_final,
    weight: SOVEREIGN_CONFIG.MACRO_WEIGHTS.ifi,
    method: 'HYBRID',
    sub_scores,
    bonuses,
    reasons,
  };
}

/**
 * Compute distribution bonus: check that all 4 quartiles have corporeal markers.
 * Split prose into 4 quartiles by paragraphs, check each for corporeal presence.
 *
 * Returns:
 * - All 4 quartiles covered → +10 bonus
 * - 3/4 quartiles → +5
 * - ≤2 quartiles → 0
 */
function computeDistributionBonus(prose: string): BonusMalus {
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  if (paragraphs.length < 4) {
    // Not enough paragraphs to split into 4 quartiles
    return {
      type: 'entropy', // Reuse entropy type for distribution
      value: 0,
      triggered: false,
      detail: 'Too few paragraphs for quartile analysis',
    };
  }

  // Split paragraphs into 4 quartiles
  const quartileSize = Math.ceil(paragraphs.length / 4);
  const quartiles: string[][] = [
    paragraphs.slice(0, quartileSize),
    paragraphs.slice(quartileSize, quartileSize * 2),
    paragraphs.slice(quartileSize * 2, quartileSize * 3),
    paragraphs.slice(quartileSize * 3),
  ];

  let covered = 0;

  for (const quartile of quartiles) {
    const quartileText = quartile.join('\n').toLowerCase();
    const hasMarker = SOVEREIGN_CONFIG.CORPOREAL_MARKERS.some((marker) =>
      quartileText.includes(marker),
    );
    if (hasMarker) {
      covered++;
    }
  }

  if (covered === 4) {
    return {
      type: 'entropy', // Reuse entropy type
      value: 10,
      triggered: true,
      detail: 'All 4 quartiles have corporeal markers',
    };
  } else if (covered === 3) {
    return {
      type: 'entropy',
      value: 5,
      triggered: true,
      detail: '3/4 quartiles have corporeal markers',
    };
  } else {
    return {
      type: 'entropy',
      value: 0,
      triggered: false,
      detail: `Only ${covered}/4 quartiles have corporeal markers`,
    };
  }
}

function computeSensoryRichness(prose: string): number {
  const categories = ['sight', 'sound', 'touch', 'smell', 'temperature'];
  const markers: Record<string, string[]> = {
    sight: [
      // FR PREMIUM — pas de marqueurs EN
      'voir', 'regard', 'yeux', 'lumière', 'ombre', 'couleur', 'forme',
      'éclat', 'reflet', 'lueur', 'scintillement', 'obscurité', 'clarté',
      'horizon', 'silhouette', 'contour', 'teinte', 'pénombre',
    ],
    sound: [
      // FR PREMIUM
      'entendre', 'bruit', 'voix', 'silence', 'écho', 'murmure',
      'grondement', 'sifflement', 'crissement', 'bourdonnement',
      'résonance', 'fracas', 'clapotis', 'bruissement', 'tintement',
    ],
    touch: [
      // FR PREMIUM
      'toucher', 'peau', 'contact', 'texture', 'caresser', 'frôler',
      'effleurer', 'rugosité', 'douceur', 'pression', 'grain',
      'surface', 'palper', 'saisir', 'empoigner', 'serrer',
    ],
    smell: [
      // FR PREMIUM
      'odeur', 'parfum', 'sentir', 'puanteur', 'arôme',
      'fragrance', 'effluve', 'relent', 'exhalaison', 'encens',
      'musc', 'résine', 'moisi', 'âcre', 'épicé',
    ],
    temperature: [
      // FR PREMIUM
      'chaud', 'froid', 'tiède', 'glacé', 'brûlant', 'frais', 'chaleur',
      'geler', 'fièvre', 'moiteur', 'fraîcheur', 'canicule',
      'givre', 'vapeur', 'torride', 'mordant',
    ],
  };

  const lowerProse = prose.toLowerCase();
  let presentCategories = 0;

  for (const category of categories) {
    const hasCategory = markers[category].some((marker) => lowerProse.includes(marker));
    if (hasCategory) {
      presentCategories++;
    }
  }

  return (presentCategories / categories.length) * 100;
}

function computeCorporealAnchoring(prose: string): number {
  const lowerProse = prose.toLowerCase();

  let count = 0;
  for (const marker of SOVEREIGN_CONFIG.CORPOREAL_MARKERS) {
    // Substring matching: "breath" matches "breathing", "finger" matches "fingers"
    if (lowerProse.includes(marker)) {
      count++;
    }
  }

  const ratio = Math.min(count / SOVEREIGN_CONFIG.CORPOREAL_TARGET, 1.0);
  return ratio * 100;
}

function buildIFIReasons(sub_scores: readonly AxisScore[]): ScoreReasons {
  const sorted = [...sub_scores].sort((a, b) => b.score - a.score);
  const top_contributors = sorted.map((s) => `${s.name}=${s.score.toFixed(1)}`);

  const low_scores = [...sub_scores].sort((a, b) => a.score - b.score);
  const top_penalties = low_scores.map((s) => `${s.name}=${s.score.toFixed(1)}`);

  return {
    top_contributors,
    top_penalties,
  };
}
