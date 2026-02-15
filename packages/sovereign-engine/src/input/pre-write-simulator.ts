/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PRE-WRITE SIMULATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: input/pre-write-simulator.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Generates SCENE_BATTLE_PLAN before generation (0 token).
 * Predicts obstacles based on ForgePacket analysis.
 * Suggests mitigation strategies.
 *
 * ALGORITHM:
 * 1. Analyze emotion contract complexity
 * 2. Detect high-risk patterns (large ruptures, extreme valence shifts, monotony)
 * 3. Check kill list coverage
 * 4. Estimate pass count needed
 * 5. Generate battle plan with predicted obstacles + mitigations
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { ForgePacket, SceneBattlePlan, PredictedObstacle, MitigationStrategy } from '../types.js';
import { SOVEREIGN_CONFIG } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function simulateSceneBattle(packet: ForgePacket): SceneBattlePlan {
  const obstacles: PredictedObstacle[] = [];
  const mitigations: MitigationStrategy[] = [];

  // Predict emotion obstacles
  const emotionObstacles = predictEmotionObstacles(packet);
  obstacles.push(...emotionObstacles);

  // Predict tension obstacles
  const tensionObstacles = predictTensionObstacles(packet);
  obstacles.push(...tensionObstacles);

  // Predict cliché obstacles
  const clicheObstacles = predictClicheObstacles(packet);
  obstacles.push(...clicheObstacles);

  // Predict rhythm obstacles
  const rhythmObstacles = predictRhythmObstacles(packet);
  obstacles.push(...rhythmObstacles);

  // Predict signature obstacles
  const signatureObstacles = predictSignatureObstacles(packet);
  obstacles.push(...signatureObstacles);

  // Generate mitigations for each obstacle
  for (const obstacle of obstacles) {
    const mitigation = generateMitigation(obstacle, packet);
    if (mitigation) {
      mitigations.push(mitigation);
    }
  }

  // Estimate pass count
  const highSeverityCount = obstacles.filter((o) => o.severity === 'high').length;
  const estimated_pass_count = highSeverityCount >= 3 ? 2 : 1;

  const battle_plan_data = {
    scene_id: packet.scene_id,
    predicted_obstacles: obstacles,
    mitigation_strategies: mitigations,
    estimated_pass_count,
  };

  const battle_plan_hash = sha256(canonicalize(battle_plan_data));

  return {
    battle_plan_id: `BATTLE_${packet.scene_id}`,
    battle_plan_hash,
    ...battle_plan_data,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION OBSTACLE PREDICTION
// ═══════════════════════════════════════════════════════════════════════════════

function predictEmotionObstacles(packet: ForgePacket): PredictedObstacle[] {
  const obstacles: PredictedObstacle[] = [];
  const ec = packet.emotion_contract;

  // Check for large valence shifts
  const valences = ec.curve_quartiles.map((q) => q.valence);
  for (let i = 0; i < valences.length - 1; i++) {
    const delta = Math.abs(valences[i + 1] - valences[i]);
    if (delta > 0.6) {
      obstacles.push({
        obstacle_id: `emotion_shift_q${i + 1}_to_q${i + 2}`,
        type: 'emotion_deviation',
        severity: 'high',
        description: `Large valence shift (Δ=${delta.toFixed(2)}) between Q${i + 1} and Q${i + 2}`,
        probability: 0.7,
      });
    }
  }

  // Check for extreme emotions
  const maxArousal = Math.max(...ec.curve_quartiles.map((q) => q.arousal));
  if (maxArousal > 0.9) {
    obstacles.push({
      obstacle_id: 'extreme_arousal',
      type: 'emotion_deviation',
      severity: 'medium',
      description: `Extreme arousal peak (${maxArousal.toFixed(2)}) may produce overwrought prose`,
      probability: 0.5,
    });
  }

  // Check for rupture difficulty
  if (ec.rupture.exists && Math.abs(ec.rupture.delta_valence) > 0.7) {
    obstacles.push({
      obstacle_id: 'rupture_execution',
      type: 'emotion_deviation',
      severity: 'high',
      description: `Rupture with Δvalence=${ec.rupture.delta_valence.toFixed(2)} difficult to execute smoothly`,
      probability: 0.8,
    });
  }

  return obstacles;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENSION OBSTACLE PREDICTION
// ═══════════════════════════════════════════════════════════════════════════════

function predictTensionObstacles(packet: ForgePacket): PredictedObstacle[] {
  const obstacles: PredictedObstacle[] = [];
  const ec = packet.emotion_contract;

  // Check for flat tension
  const arousals = ec.curve_quartiles.map((q) => q.arousal);
  const maxArousal = Math.max(...arousals);
  const minArousal = Math.min(...arousals);
  const range = maxArousal - minArousal;

  if (range < 0.2) {
    obstacles.push({
      obstacle_id: 'flat_tension',
      type: 'tension_flatness',
      severity: 'high',
      description: `Tension range too narrow (${range.toFixed(2)}) — risk of monotony`,
      probability: 0.9,
    });
  }

  // Check for missing pic or faille
  if (ec.tension.pic_position_pct < 0.1 || ec.tension.pic_position_pct > 0.9) {
    obstacles.push({
      obstacle_id: 'pic_timing',
      type: 'tension_flatness',
      severity: 'medium',
      description: `Pic at extreme position (${(ec.tension.pic_position_pct * 100).toFixed(0)}%) — unusual structure`,
      probability: 0.4,
    });
  }

  return obstacles;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLICHÉ OBSTACLE PREDICTION
// ═══════════════════════════════════════════════════════════════════════════════

function predictClicheObstacles(packet: ForgePacket): PredictedObstacle[] {
  const obstacles: PredictedObstacle[] = [];

  // Check kill list coverage
  const totalPatterns =
    packet.kill_lists.banned_cliches.length +
    packet.kill_lists.banned_ai_patterns.length +
    packet.kill_lists.banned_filter_words.length;

  if (totalPatterns < 100) {
    obstacles.push({
      obstacle_id: 'insufficient_kill_list',
      type: 'cliche_risk',
      severity: 'medium',
      description: `Kill list has only ${totalPatterns} patterns — insufficient coverage`,
      probability: 0.6,
    });
  }

  // Check for high-emotion scenes (prone to clichés)
  const maxArousal = Math.max(...packet.emotion_contract.curve_quartiles.map((q) => q.arousal));
  if (maxArousal > 0.8) {
    obstacles.push({
      obstacle_id: 'high_emotion_cliche_risk',
      type: 'cliche_risk',
      severity: 'high',
      description: 'High-emotion scenes prone to clichés (fear, anger, surprise)',
      probability: 0.7,
    });
  }

  return obstacles;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RHYTHM OBSTACLE PREDICTION
// ═══════════════════════════════════════════════════════════════════════════════

function predictRhythmObstacles(packet: ForgePacket): PredictedObstacle[] {
  const obstacles: PredictedObstacle[] = [];

  // Check if Gini target is outside optimal range
  const giniTarget = packet.style_genome.rhythm.gini_target;
  const [giniMin, giniMax] = SOVEREIGN_CONFIG.GINI_RANGE;

  if (giniTarget < giniMin || giniTarget > giniMax) {
    obstacles.push({
      obstacle_id: 'gini_target_suboptimal',
      type: 'rhythm_monotony',
      severity: 'low',
      description: `Gini target ${giniTarget} outside optimal range [${giniMin}, ${giniMax}]`,
      probability: 0.3,
    });
  }

  // Check for high word count (harder to maintain rhythm)
  if (packet.intent.target_word_count > 1500) {
    obstacles.push({
      obstacle_id: 'long_scene_rhythm',
      type: 'rhythm_monotony',
      severity: 'medium',
      description: `Long scene (${packet.intent.target_word_count} words) — rhythm maintenance difficult`,
      probability: 0.5,
    });
  }

  return obstacles;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNATURE OBSTACLE PREDICTION
// ═══════════════════════════════════════════════════════════════════════════════

function predictSignatureObstacles(packet: ForgePacket): PredictedObstacle[] {
  const obstacles: PredictedObstacle[] = [];

  // Check signature word count
  const signatureWordCount = packet.style_genome.lexicon.signature_words.length;
  if (signatureWordCount < 10) {
    obstacles.push({
      obstacle_id: 'weak_signature',
      type: 'signature_drift',
      severity: 'medium',
      description: `Only ${signatureWordCount} signature words — weak style anchor`,
      probability: 0.6,
    });
  }

  // Check forbidden word count
  const forbiddenWordCount = packet.style_genome.lexicon.forbidden_words.length;
  if (forbiddenWordCount === 0) {
    obstacles.push({
      obstacle_id: 'no_forbidden_words',
      type: 'signature_drift',
      severity: 'low',
      description: 'No forbidden words defined — no negative constraints',
      probability: 0.3,
    });
  }

  return obstacles;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MITIGATION GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function generateMitigation(obstacle: PredictedObstacle, _packet: ForgePacket): MitigationStrategy | null {
  const strategyMap: Record<string, MitigationStrategy> = {
    emotion_deviation: {
      strategy_id: `mitigate_${obstacle.obstacle_id}`,
      targets: [obstacle.obstacle_id],
      action: 'Add micro-transitions between quartiles, increase interiority signals during shift',
      expected_effectiveness: 0.7,
    },
    tension_flatness: {
      strategy_id: `mitigate_${obstacle.obstacle_id}`,
      targets: [obstacle.obstacle_id],
      action: 'Inject micro-rupture events, add consequence lines after pic, create silence zones',
      expected_effectiveness: 0.6,
    },
    cliche_risk: {
      strategy_id: `mitigate_${obstacle.obstacle_id}`,
      targets: [obstacle.obstacle_id],
      action: 'Apply anti-cliché sweep in correction pass, replace with sensory details',
      expected_effectiveness: 0.8,
    },
    rhythm_monotony: {
      strategy_id: `mitigate_${obstacle.obstacle_id}`,
      targets: [obstacle.obstacle_id],
      action: 'Inject syncopes and compressions, vary sentence openings, tighten rhythm',
      expected_effectiveness: 0.7,
    },
    signature_drift: {
      strategy_id: `mitigate_${obstacle.obstacle_id}`,
      targets: [obstacle.obstacle_id],
      action: 'Enforce signature word injection, scan for forbidden words in correction',
      expected_effectiveness: 0.6,
    },
  };

  return strategyMap[obstacle.type] ?? null;
}
