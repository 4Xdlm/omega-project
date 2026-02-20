/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Assess
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * F2: ASSESS — Find MEASURABLE risks, not opinions.
 * 
 * Risk types (closed list v1):
 * - repetition_loop: Same dominant emotions too long
 * - emotional_flatline: Variance too low
 * - arc_incoherence: Mismatch emotion ↔ declared arc
 * - tone_drift: Tone drifting from style_profile
 * - stakes_mismatch: Announced stakes ≠ felt tension
 * - character_agency_loss: Character passive too long
 * - overheat: Max tension too early, exhaustion risk
 * 
 * INV-MUSE-05: Every RiskFlag has concrete remediation
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionStateV2, EmotionId } from '../emotion_v2';
import type {
  AssessInput,
  AssessOutput,
  RiskFlag,
  Evidence,
  NarrativeArc,
  StyleProfile,
} from './types';
import { RISK_TYPES, MAX_HISTORY, CONFIDENCE_CAP } from './constants';
import type { RiskType } from './constants';
import { hashAssessInput, generateOutputHash, sha256 } from './fingerprint';

// ═══════════════════════════════════════════════════════════════════════════════
// RISK DETECTORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect repetition loop
 * Same dominant emotion for too many consecutive states
 */
function detectRepetitionLoop(
  current: EmotionStateV2,
  history: EmotionStateV2[]
): RiskFlag | null {
  if (history.length < 3) return null;
  
  const currentDominant = current.appraisal.emotions[0]?.id;
  if (!currentDominant) return null;
  
  // Count consecutive same dominant
  let consecutiveCount = 1;
  for (const state of history) {
    const dominant = state.appraisal.emotions[0]?.id;
    if (dominant === currentDominant) {
      consecutiveCount++;
    } else {
      break;
    }
  }
  
  // Threshold: 4+ consecutive = risk
  if (consecutiveCount < 4) return null;
  
  const severity = consecutiveCount >= 6 ? 'high' : 
                   consecutiveCount >= 5 ? 'medium' : 'low';
  
  return {
    id: sha256(`repetition_loop:${currentDominant}:${consecutiveCount}`).substring(0, 16),
    type: RISK_TYPES.REPETITION_LOOP,
    severity,
    description: `${currentDominant} has been dominant for ${consecutiveCount} consecutive states`,
    evidence: [{
      metric: 'consecutive_dominant_count',
      value: consecutiveCount,
      expected: '≤ 3',
      deviation: `+${consecutiveCount - 3} over threshold`,
    }],
    impact: 'Reader emotional fatigue; scene feels stagnant',
    remediation: `Introduce contrast emotion or escalate/resolve ${currentDominant}`,
    priority: severity === 'high' ? 1 : severity === 'medium' ? 2 : 3,
    confidence: Math.min(CONFIDENCE_CAP, 0.7 + consecutiveCount * 0.05),
  };
}

/**
 * Detect emotional flatline
 * Variance in emotional intensity too low
 */
function detectEmotionalFlatline(
  current: EmotionStateV2,
  history: EmotionStateV2[]
): RiskFlag | null {
  if (history.length < 4) return null;
  
  // Calculate intensity variance
  const intensities = [
    current.appraisal.emotions[0]?.weight ?? 0.5,
    ...history.slice(0, 5).map(s => s.appraisal.emotions[0]?.weight ?? 0.5),
  ];
  
  const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const variance = intensities.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intensities.length;
  
  // Threshold: variance < 0.02 = flatline
  if (variance >= 0.02) return null;
  
  const severity = variance < 0.005 ? 'high' : variance < 0.01 ? 'medium' : 'low';
  
  return {
    id: sha256(`emotional_flatline:${variance.toFixed(4)}`).substring(0, 16),
    type: RISK_TYPES.EMOTIONAL_FLATLINE,
    severity,
    description: `Emotional intensity variance is ${(variance * 100).toFixed(2)}% (too flat)`,
    evidence: [{
      metric: 'intensity_variance',
      value: variance.toFixed(4),
      expected: '≥ 0.02',
      deviation: `${((0.02 - variance) / 0.02 * 100).toFixed(0)}% below threshold`,
    }],
    impact: 'Scene lacks emotional dynamism; feels monotonous',
    remediation: 'Introduce intensity spike (positive or negative) or emotional contrast',
    priority: severity === 'high' ? 1 : 2,
    confidence: Math.min(CONFIDENCE_CAP, 0.75),
  };
}

/**
 * Detect arc incoherence
 * Current emotion doesn't match arc expectations
 */
function detectArcIncoherence(
  current: EmotionStateV2,
  arc: NarrativeArc
): RiskFlag | null {
  const currentDominant = current.appraisal.emotions[0];
  if (!currentDominant) return null;
  
  // Check if on track for target emotion
  const distanceToTarget = arc.progress > 0.7 
    ? (currentDominant.id === arc.target_emotion ? 0 : 1)
    : 0.5; // Early arc = more flexible
  
  // Check tension alignment
  const currentTension = current.dynamics?.volatility ?? 0.5;
  const tensionDelta = Math.abs(currentTension - arc.expected_tension);
  
  // Threshold: significant mismatch
  if (distanceToTarget < 0.5 && tensionDelta < 0.3) return null;
  
  const severity = (distanceToTarget === 1 && arc.progress > 0.8) ? 'high' :
                   tensionDelta > 0.4 ? 'medium' : 'low';
  
  return {
    id: sha256(`arc_incoherence:${arc.id}:${currentDominant.id}`).substring(0, 16),
    type: RISK_TYPES.ARC_INCOHERENCE,
    severity,
    description: `Current ${currentDominant.id} doesn't align with ${arc.type} arc targeting ${arc.target_emotion}`,
    evidence: [
      {
        metric: 'arc_progress',
        value: (arc.progress * 100).toFixed(0) + '%',
        expected: `Emotion trending toward ${arc.target_emotion}`,
        deviation: `Currently at ${currentDominant.id}`,
      },
      {
        metric: 'tension_alignment',
        value: currentTension.toFixed(2),
        expected: arc.expected_tension.toFixed(2),
        deviation: `Δ${tensionDelta.toFixed(2)}`,
      },
    ],
    impact: 'Arc feels disjointed; payoff may not land',
    remediation: `Steer toward ${arc.target_emotion} via appropriate transition`,
    priority: severity === 'high' ? 1 : 2,
    confidence: Math.min(CONFIDENCE_CAP, 0.7),
  };
}

/**
 * Detect tone drift
 * Current tone drifting from style profile
 */
function detectToneDrift(
  current: EmotionStateV2,
  history: EmotionStateV2[],
  styleProfile: StyleProfile
): RiskFlag | null {
  const currentDominant = current.appraisal.emotions[0];
  if (!currentDominant) return null;
  
  // Map emotions to tone
  const darkEmotions = ['fear', 'anger', 'sadness', 'shame', 'guilt', 'disgust'];
  const lightEmotions = ['joy', 'trust', 'love', 'pride', 'relief'];
  
  const isDark = darkEmotions.includes(currentDominant.id);
  const isLight = lightEmotions.includes(currentDominant.id);
  
  // Check drift
  let driftDetected = false;
  let driftType = '';
  
  if (styleProfile.tone === 'dark' && isLight && currentDominant.weight > 0.7) {
    driftDetected = true;
    driftType = 'too light for dark tone';
  } else if (styleProfile.tone === 'light' && isDark && currentDominant.weight > 0.7) {
    driftDetected = true;
    driftType = 'too dark for light tone';
  }
  
  if (!driftDetected) return null;
  
  return {
    id: sha256(`tone_drift:${styleProfile.tone}:${currentDominant.id}`).substring(0, 16),
    type: RISK_TYPES.TONE_DRIFT,
    severity: 'medium',
    description: `Emotional tone drifting: ${driftType}`,
    evidence: [{
      metric: 'tone_alignment',
      value: currentDominant.id,
      expected: `Emotions consistent with ${styleProfile.tone} tone`,
      deviation: driftType,
    }],
    impact: 'Tonal inconsistency breaks reader immersion',
    remediation: `Moderate ${currentDominant.id} intensity or transition to tone-appropriate emotion`,
    priority: 2,
    confidence: Math.min(CONFIDENCE_CAP, 0.65),
  };
}

/**
 * Detect stakes mismatch
 * Declared stakes don't match emotional tension
 */
function detectStakesMismatch(
  current: EmotionStateV2,
  arc: NarrativeArc
): RiskFlag | null {
  const currentTension = current.dynamics?.volatility ?? 0.5;
  
  // Map stakes to expected tension
  const expectedTension: Record<string, number> = {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
    critical: 0.85,
  };
  
  const expected = expectedTension[arc.stakes] ?? 0.5;
  const mismatch = Math.abs(currentTension - expected);
  
  // Threshold: significant mismatch
  if (mismatch < 0.25) return null;
  
  const isTooLow = currentTension < expected;
  const severity = mismatch > 0.4 ? 'high' : 'medium';
  
  return {
    id: sha256(`stakes_mismatch:${arc.stakes}:${currentTension.toFixed(2)}`).substring(0, 16),
    type: RISK_TYPES.STAKES_MISMATCH,
    severity,
    description: `${arc.stakes} stakes declared but tension is ${isTooLow ? 'too low' : 'too high'}`,
    evidence: [{
      metric: 'tension_level',
      value: (currentTension * 100).toFixed(0) + '%',
      expected: (expected * 100).toFixed(0) + `% for ${arc.stakes} stakes`,
      deviation: `${isTooLow ? '-' : '+'}${(mismatch * 100).toFixed(0)}%`,
    }],
    impact: isTooLow 
      ? 'Stakes feel hollow; reader doesn\'t feel urgency'
      : 'Tension exhausts reader before climax',
    remediation: isTooLow
      ? 'Escalate through threat, deadline, or consequence'
      : 'Provide breathing room; save peak for climax',
    priority: severity === 'high' ? 1 : 2,
    confidence: Math.min(CONFIDENCE_CAP, 0.7),
  };
}

/**
 * Detect character agency loss
 * Character has been passive too long
 */
function detectCharacterAgencyLoss(
  current: EmotionStateV2,
  history: EmotionStateV2[]
): RiskFlag | null {
  // This would normally check character states in context
  // Simplified: check if narrative_role shows passive pattern
  const role = current.narrative_role;
  if (!role) return null;
  
  if (role.intentionality !== 'passive') return null;
  
  // Check history for consecutive passive
  let passiveCount = 1;
  for (const state of history.slice(0, 5)) {
    if (state.narrative_role?.intentionality === 'passive') {
      passiveCount++;
    } else {
      break;
    }
  }
  
  if (passiveCount < 3) return null;
  
  return {
    id: sha256(`agency_loss:${passiveCount}`).substring(0, 16),
    type: RISK_TYPES.CHARACTER_AGENCY_LOSS,
    severity: passiveCount >= 5 ? 'high' : 'medium',
    description: `Protagonist has been passive for ${passiveCount} beats`,
    evidence: [{
      metric: 'passive_beats',
      value: passiveCount,
      expected: '≤ 2',
      deviation: `+${passiveCount - 2} over threshold`,
    }],
    impact: 'Reader loses engagement; protagonist feels weak',
    remediation: 'Give protagonist a decision, action, or revelation',
    priority: 1,
    confidence: Math.min(CONFIDENCE_CAP, 0.75),
  };
}

/**
 * Detect overheat
 * Maximum tension too early, exhaustion risk
 */
function detectOverheat(
  current: EmotionStateV2,
  arc: NarrativeArc
): RiskFlag | null {
  const currentTension = current.dynamics?.volatility ?? 0.5;
  
  // Overheat: high tension early in arc
  if (currentTension < 0.8 || arc.progress > 0.7) return null;
  
  return {
    id: sha256(`overheat:${arc.progress.toFixed(2)}:${currentTension.toFixed(2)}`).substring(0, 16),
    type: RISK_TYPES.OVERHEAT,
    severity: arc.progress < 0.4 ? 'high' : 'medium',
    description: `Tension at ${(currentTension * 100).toFixed(0)}% but arc only ${(arc.progress * 100).toFixed(0)}% complete`,
    evidence: [
      {
        metric: 'current_tension',
        value: (currentTension * 100).toFixed(0) + '%',
        expected: `< 70% at ${(arc.progress * 100).toFixed(0)}% arc progress`,
        deviation: 'Peaked too early',
      },
    ],
    impact: 'Nowhere to escalate; climax will feel flat',
    remediation: 'Introduce relief beat or redirect tension to different emotion',
    priority: 1,
    confidence: Math.min(CONFIDENCE_CAP, 0.8),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ASSESS FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assess emotional state for narrative risks
 */
export function assess(input: AssessInput): AssessOutput {
  const startTime = Date.now();
  const inputHash = hashAssessInput(input);
  
  // Limit history
  const history = input.history.slice(0, MAX_HISTORY);
  
  // Run all detectors
  const risks: RiskFlag[] = [];
  
  const repetition = detectRepetitionLoop(input.current, history);
  if (repetition) risks.push(repetition);
  
  const flatline = detectEmotionalFlatline(input.current, history);
  if (flatline) risks.push(flatline);
  
  const arcIncoherence = detectArcIncoherence(input.current, input.arc);
  if (arcIncoherence) risks.push(arcIncoherence);
  
  const toneDrift = detectToneDrift(input.current, history, input.style_profile);
  if (toneDrift) risks.push(toneDrift);
  
  const stakesMismatch = detectStakesMismatch(input.current, input.arc);
  if (stakesMismatch) risks.push(stakesMismatch);
  
  const agencyLoss = detectCharacterAgencyLoss(input.current, history);
  if (agencyLoss) risks.push(agencyLoss);
  
  const overheat = detectOverheat(input.current, input.arc);
  if (overheat) risks.push(overheat);
  
  // Sort by priority
  risks.sort((a, b) => a.priority - b.priority);
  
  // Calculate health score
  const healthScore = calculateHealthScore(risks);
  
  // Generate output hash
  const outputHash = generateOutputHash(risks.map(r => r.id));
  
  return {
    risks,
    health_score: healthScore,
    output_hash: outputHash,
    input_hash: inputHash,
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Calculate overall health score (0 = critical, 1 = healthy)
 */
function calculateHealthScore(risks: RiskFlag[]): number {
  if (risks.length === 0) return 1;
  
  // Weighted penalty by severity
  const penalties: Record<string, number> = {
    critical: 0.4,
    high: 0.25,
    medium: 0.15,
    low: 0.05,
  };
  
  let totalPenalty = 0;
  for (const risk of risks) {
    totalPenalty += penalties[risk.severity] ?? 0.1;
  }
  
  return Math.max(0, 1 - totalPenalty);
}
