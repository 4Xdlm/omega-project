/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Project
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * F3: PROJECT — 2-4 scenarios max, bounded probabilities, no cinema.
 * 
 * - scenarios.length <= 4
 * - sum(probabilities) <= 1
 * - confidence <= 0.95
 * - If insufficient data: horizon_actual reduced (and justified)
 * 
 * INV-MUSE-06: Projection bounded
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionStateV2, EmotionId } from '../emotion_v2';
import type {
  ProjectInput,
  ProjectOutput,
  TrendLine,
  Scenario,
  TopologyPosition,
  NarrativeContext,
} from './types';
import { MAX_HORIZON, MAX_SCENARIOS, CONFIDENCE_CAP } from './constants';
import { createPRNG, nextFloat } from './prng';
import { hashProjectInput, generateOutputHash, sha256 } from './fingerprint';
import {
  calculateNaturalTrajectory,
  getAttractions,
  findActiveAttractors,
  getGravitationalPath,
} from './physics';

// ═══════════════════════════════════════════════════════════════════════════════
// TREND DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect trends in emotional history
 */
function detectTrends(history: EmotionStateV2[]): TrendLine[] {
  if (history.length < 3) return [];
  
  const trends: TrendLine[] = [];
  
  // Track intensity changes for dominant emotion
  const intensities = history.map(s => s.appraisal.emotions[0]?.weight ?? 0.5);
  const emotions = history.map(s => s.appraisal.emotions[0]?.id ?? 'anticipation');
  
  // Find most common emotion
  const emotionCounts = new Map<string, number>();
  for (const e of emotions) {
    emotionCounts.set(e, (emotionCounts.get(e) ?? 0) + 1);
  }
  let dominantEmotion = 'anticipation';
  let maxCount = 0;
  for (const [e, count] of emotionCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominantEmotion = e;
    }
  }
  
  // Calculate trend direction
  const recentAvg = intensities.slice(0, Math.min(3, intensities.length))
    .reduce((a, b) => a + b, 0) / Math.min(3, intensities.length);
  const olderAvg = intensities.slice(-3)
    .reduce((a, b) => a + b, 0) / Math.min(3, intensities.length);
  
  const delta = recentAvg - olderAvg;
  let direction: 'rising' | 'falling' | 'stable' | 'oscillating';
  
  if (Math.abs(delta) < 0.05) {
    direction = 'stable';
  } else if (delta > 0) {
    direction = 'rising';
  } else {
    direction = 'falling';
  }
  
  // Check for oscillation
  let oscillations = 0;
  for (let i = 1; i < intensities.length; i++) {
    const prevDelta = intensities[i] - intensities[i - 1];
    const nextDelta = i + 1 < intensities.length ? intensities[i + 1] - intensities[i] : 0;
    if (prevDelta * nextDelta < 0) oscillations++;
  }
  if (oscillations >= intensities.length / 2) {
    direction = 'oscillating';
  }
  
  // Calculate trend strength
  const strength = Math.min(1, Math.abs(delta) * 3 + 0.3);
  
  // Predict value at horizon
  const currentValue = intensities[0] ?? 0.5;
  let predictedValue: number;
  switch (direction) {
    case 'rising':
      predictedValue = Math.min(0.95, currentValue + delta * 2);
      break;
    case 'falling':
      predictedValue = Math.max(0.1, currentValue + delta * 2);
      break;
    case 'oscillating':
      predictedValue = currentValue;
      break;
    default:
      predictedValue = currentValue;
  }
  
  // Confidence band
  const confidenceBand = direction === 'stable' ? 0.1 : 0.2;
  
  trends.push({
    emotion: dominantEmotion as EmotionId,
    direction,
    strength,
    predicted_value: predictedValue,
    confidence_band: confidenceBand,
  });
  
  // Check for secondary trends (other emotions)
  const secondaryEmotions = new Set<string>();
  for (const state of history) {
    const secondary = state.appraisal.emotions[1]?.id;
    if (secondary && secondary !== dominantEmotion) {
      secondaryEmotions.add(secondary);
    }
  }
  
  // Add one secondary trend if present
  for (const emotion of secondaryEmotions) {
    const secondaryIntensities = history
      .filter(s => s.appraisal.emotions.some(e => e.id === emotion))
      .map(s => s.appraisal.emotions.find(e => e.id === emotion)?.weight ?? 0.3);
    
    if (secondaryIntensities.length >= 2) {
      const secDelta = secondaryIntensities[0] - secondaryIntensities[secondaryIntensities.length - 1];
      trends.push({
        emotion: emotion as EmotionId,
        direction: Math.abs(secDelta) < 0.05 ? 'stable' : secDelta > 0 ? 'rising' : 'falling',
        strength: 0.5,
        predicted_value: secondaryIntensities[0],
        confidence_band: 0.25,
      });
      break; // Only one secondary
    }
  }
  
  return trends;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate possible scenarios
 */
function generateScenarios(
  history: EmotionStateV2[],
  context: NarrativeContext,
  trends: TrendLine[],
  seed: number
): Scenario[] {
  const prng = createPRNG(seed);
  const scenarios: Scenario[] = [];
  
  const currentState = history[0];
  if (!currentState) return scenarios;
  
  const currentDominant = currentState.appraisal.emotions[0];
  if (!currentDominant) return scenarios;
  
  const emotionHistory = history.map(s => s.appraisal.emotions[0]?.id ?? 'anticipation') as EmotionId[];
  
  // Scenario 1: Continue current trajectory
  const mainTrend = trends[0];
  if (mainTrend) {
    scenarios.push({
      id: sha256(`scenario:continue:${mainTrend.emotion}`).substring(0, 16),
      description: `${mainTrend.emotion} continues ${mainTrend.direction} trend`,
      probability: 0.35 + nextFloat(prng) * 0.1,
      dominant_emotion: mainTrend.emotion,
      trigger_conditions: [
        'Current narrative maintains pace',
        `No major disruption to ${mainTrend.emotion}`,
      ],
      topology_position: {
        type: mainTrend.direction === 'rising' ? 'slope' : 
              mainTrend.direction === 'falling' ? 'valley' : 'pivot',
        tension: mainTrend.predicted_value,
        stability: mainTrend.direction === 'stable' ? 0.8 : 0.4,
        gradient_direction: mainTrend.direction === 'rising' ? 'up' : 
                           mainTrend.direction === 'falling' ? 'down' : 'flat',
      },
    });
  }
  
  // Scenario 2: Natural gravity resolution
  const trajectory = calculateNaturalTrajectory(currentDominant.id, currentDominant.weight);
  if (trajectory && trajectory.emotion !== mainTrend?.emotion) {
    scenarios.push({
      id: sha256(`scenario:gravity:${trajectory.emotion}`).substring(0, 16),
      description: `Gravitational pull toward ${trajectory.emotion}`,
      probability: trajectory.probability * 0.6,
      dominant_emotion: trajectory.emotion,
      trigger_conditions: [
        `${currentDominant.id} naturally resolves`,
        'Path of least resistance followed',
      ],
      topology_position: {
        type: 'valley',
        tension: 0.4,
        stability: 0.7,
        gradient_direction: 'down',
      },
    });
  }
  
  // Scenario 3: Attractor pull
  const attractors = findActiveAttractors(currentDominant.id, emotionHistory);
  if (attractors.length > 0 && attractors[0].emotion !== mainTrend?.emotion) {
    const attractor = attractors[0];
    scenarios.push({
      id: sha256(`scenario:attractor:${attractor.emotion}`).substring(0, 16),
      description: `${attractor.type} resolution to ${attractor.emotion}`,
      probability: attractor.strength * 0.5,
      dominant_emotion: attractor.emotion,
      trigger_conditions: [
        `Arc reaches ${attractor.type} point`,
        'Narrative closure initiated',
      ],
      topology_position: {
        type: attractor.type === 'climax' ? 'peak' : 'valley',
        tension: attractor.type === 'climax' ? 0.9 : 0.3,
        stability: 0.8,
        gradient_direction: 'down',
      },
    });
  }
  
  // Scenario 4: Wild card / disruption
  const attractions = getAttractions(currentDominant.id);
  const wildCardEmotion = attractions.find(a => 
    a.emotion !== mainTrend?.emotion && 
    a.emotion !== trajectory?.emotion
  );
  
  if (wildCardEmotion) {
    scenarios.push({
      id: sha256(`scenario:wildcard:${wildCardEmotion.emotion}`).substring(0, 16),
      description: `Unexpected shift to ${wildCardEmotion.emotion}`,
      probability: 0.1 + nextFloat(prng) * 0.05,
      dominant_emotion: wildCardEmotion.emotion,
      trigger_conditions: [
        'External event disrupts trajectory',
        'Character makes unexpected choice',
      ],
      topology_position: {
        type: 'pivot',
        tension: 0.6,
        stability: 0.3,
        gradient_direction: 'up',
      },
    });
  }
  
  // Limit to MAX_SCENARIOS
  const limited = scenarios.slice(0, MAX_SCENARIOS);
  
  // Normalize probabilities
  const totalProb = limited.reduce((sum, s) => sum + s.probability, 0);
  if (totalProb > 1) {
    const scale = 0.95 / totalProb;
    for (const s of limited) {
      s.probability = Math.round(s.probability * scale * 100) / 100;
    }
  }
  
  return limited;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PROJECT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Project emotional trends and scenarios
 */
export function project(input: ProjectInput): ProjectOutput {
  const startTime = Date.now();
  const inputHash = hashProjectInput(input);
  
  // Validate and adjust horizon
  let horizonActual = Math.min(input.horizon, MAX_HORIZON);
  let horizonReductionReason: string | undefined;
  
  // Need at least 3 data points for meaningful projection
  if (input.history.length < 3) {
    horizonActual = Math.min(horizonActual, 1);
    horizonReductionReason = `Insufficient history (${input.history.length}/3 minimum)`;
  }
  
  // Reduce horizon if data is sparse
  if (input.history.length < 5 && horizonActual > 3) {
    horizonActual = 3;
    horizonReductionReason = `Limited history (${input.history.length} states) reduces projection confidence`;
  }
  
  // Detect trends
  const trends = detectTrends(input.history);
  
  // Generate scenarios
  const scenarios = generateScenarios(
    input.history,
    input.context,
    trends,
    input.seed
  );
  
  // Calculate confidence
  const baseConfidence = input.history.length >= 5 ? 0.7 : 
                         input.history.length >= 3 ? 0.5 : 0.3;
  const trendBonus = trends.length > 0 ? trends[0].strength * 0.2 : 0;
  const confidence = Math.min(CONFIDENCE_CAP, baseConfidence + trendBonus);
  
  // Generate output hash
  const allIds = [
    ...trends.map(t => `trend:${t.emotion}:${t.direction}`),
    ...scenarios.map(s => s.id),
  ];
  const outputHash = generateOutputHash(allIds);
  
  return {
    trends,
    scenarios,
    confidence,
    horizon_actual: horizonActual,
    horizon_reduction_reason: horizonReductionReason,
    output_hash: outputHash,
    input_hash: inputHash,
    seed: input.seed,
    duration_ms: Date.now() - startTime,
  };
}
