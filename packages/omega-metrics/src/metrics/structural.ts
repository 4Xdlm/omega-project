/**
 * OMEGA Metrics — Structural Metrics (S1-S8)
 * Objective structural quality measures
 */

import type { GenesisPlan, MetricConfig, Arc, Scene } from '../types.js';

/**
 * S1 — arc_completeness (weight: 0.15)
 * Checks presence of required arc fields
 */
export function arcCompleteness(plan: GenesisPlan): number {
  if (plan.arcs.length === 0) return 0;

  let completeCount = 0;

  for (const arc of plan.arcs) {
    const hasArcId = Boolean(arc.arc_id && arc.arc_id.length > 0);
    const hasTheme = Boolean(arc.theme && arc.theme.length > 0);
    const hasProgression = Boolean(arc.progression && arc.progression.length > 0);
    const hasJustification = Boolean(arc.justification && arc.justification.length > 0);
    const hasScenes = Boolean(arc.scenes && arc.scenes.length > 0);

    if (hasArcId && hasTheme && hasProgression && hasJustification && hasScenes) {
      completeCount++;
    }
  }

  return completeCount / plan.arcs.length;
}

/**
 * S2 — scene_completeness (weight: 0.15)
 * Checks presence of required scene fields
 */
export function sceneCompleteness(plan: GenesisPlan): number {
  const allScenes: Scene[] = [];
  for (const arc of plan.arcs) {
    allScenes.push(...arc.scenes);
  }

  if (allScenes.length === 0) return 0;

  let completeCount = 0;

  for (const scene of allScenes) {
    const hasSceneId = Boolean(scene.scene_id);
    const hasArcId = Boolean(scene.arc_id);
    const hasObjective = Boolean(scene.objective && scene.objective.length > 0);
    const hasConflict = Boolean(scene.conflict && scene.conflict.length > 0);
    const hasConflictType = Boolean(scene.conflict_type);
    const hasEmotionTarget = Boolean(scene.emotion_target);
    const hasEmotionIntensity = typeof scene.emotion_intensity === 'number' &&
                                 scene.emotion_intensity >= 0 &&
                                 scene.emotion_intensity <= 1;
    const hasBeats = Boolean(scene.beats && scene.beats.length > 0);
    const hasTargetWordCount = typeof scene.target_word_count === 'number' &&
                                 scene.target_word_count > 0;
    const hasSensoryAnchor = Boolean(scene.sensory_anchor && scene.sensory_anchor.length > 0);
    const hasValidSubtext = scene.subtext &&
                             scene.subtext.character_thinks !== '__pending__' &&
                             scene.subtext.implied_emotion !== '__pending__';

    if (hasSceneId && hasArcId && hasObjective && hasConflict && hasConflictType &&
        hasEmotionTarget && hasEmotionIntensity && hasBeats && hasTargetWordCount &&
        hasSensoryAnchor && hasValidSubtext) {
      completeCount++;
    }
  }

  return completeCount / allScenes.length;
}

/**
 * S3 — beat_coverage (weight: 0.12)
 * Checks if scenes have beats within acceptable range
 */
export function beatCoverage(plan: GenesisPlan, config: MetricConfig): number {
  const allScenes: Scene[] = [];
  for (const arc of plan.arcs) {
    allScenes.push(...arc.scenes);
  }

  if (allScenes.length === 0) return 0;

  let inRangeCount = 0;

  for (const scene of allScenes) {
    const beatCount = scene.beats.length;
    if (beatCount >= config.MIN_BEATS_PER_SCENE && beatCount <= config.MAX_BEATS_PER_SCENE) {
      inRangeCount++;
    }
  }

  return inRangeCount / allScenes.length;
}

/**
 * S4 — seed_integrity (weight: 0.12)
 * Validates seed planting and blooming
 */
export function seedIntegrity(plan: GenesisPlan, config: MetricConfig): number {
  if (!plan.seed_registry || plan.seed_registry.length === 0) {
    return 0;
  }

  // Build scene index map
  const sceneIds = new Set<string>();
  const scenePositions = new Map<string, number>();
  let position = 0;

  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      sceneIds.add(scene.scene_id);
      scenePositions.set(scene.scene_id, position);
      position++;
    }
  }

  const totalScenes = sceneIds.size;
  if (totalScenes === 0) return 0;

  let validSeeds = 0;

  for (const seed of plan.seed_registry) {
    const plantedExists = sceneIds.has(seed.planted_in);
    const bloomsExists = sceneIds.has(seed.blooms_in);

    if (!plantedExists || !bloomsExists) {
      continue; // Invalid seed
    }

    const plantedPos = scenePositions.get(seed.planted_in)!;
    const bloomsPos = scenePositions.get(seed.blooms_in)!;

    // blooms_in must be AFTER planted_in
    if (bloomsPos <= plantedPos) {
      continue;
    }

    // Distance check (normalized)
    const distance = (bloomsPos - plantedPos) / totalScenes;
    if (distance > config.SEED_BLOOM_MAX_DISTANCE) {
      continue;
    }

    validSeeds++;
  }

  return validSeeds / plan.seed_registry.length;
}

/**
 * S5 — tension_monotonicity (weight: 0.12)
 * Analyzes tension curve for plateaus, drops, and trend
 */
export function tensionMonotonicity(plan: GenesisPlan, config: MetricConfig): number {
  if (!plan.tension_curve || plan.tension_curve.length === 0) {
    return 0;
  }

  const curve = plan.tension_curve;
  let conditionsMet = 0;

  // Condition 1: No plateau > MAX_TENSION_PLATEAU
  let plateauLength = 0;
  let maxPlateau = 0;

  for (let i = 1; i < curve.length; i++) {
    if (curve[i] === curve[i - 1]) {
      plateauLength++;
    } else {
      if (plateauLength > maxPlateau) maxPlateau = plateauLength;
      plateauLength = 0;
    }
  }
  if (plateauLength > maxPlateau) maxPlateau = plateauLength;

  if (maxPlateau <= config.MAX_TENSION_PLATEAU) {
    conditionsMet++;
  }

  // Condition 2: No drop > MAX_TENSION_DROP
  let maxDrop = 0;

  for (let i = 1; i < curve.length; i++) {
    const drop = curve[i - 1] - curve[i];
    if (drop > maxDrop) maxDrop = drop;
  }

  if (maxDrop <= config.MAX_TENSION_DROP) {
    conditionsMet++;
  }

  // Condition 3: Ascending trend (last > first)
  if (curve[curve.length - 1] > curve[0]) {
    conditionsMet++;
  }

  return conditionsMet / 3;
}

/**
 * S6 — conflict_diversity (weight: 0.10)
 * Counts unique conflict types
 */
export function conflictDiversity(plan: GenesisPlan, config: MetricConfig): number {
  const conflictTypes = new Set<string>();

  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      if (scene.conflict_type) {
        conflictTypes.add(scene.conflict_type.toLowerCase());
      }
    }
  }

  const uniqueCount = conflictTypes.size;
  const score = Math.min(uniqueCount / config.MIN_CONFLICT_TYPES, 1.0);

  return score;
}

/**
 * S7 — causal_depth (weight: 0.12)
 * Computes longest path in causal graph
 */
export function causalDepth(plan: GenesisPlan): number {
  const allScenes: Scene[] = [];
  for (const arc of plan.arcs) {
    allScenes.push(...arc.scenes);
  }

  if (allScenes.length === 0) return 0;

  // Build adjacency list for causal graph
  const graph = new Map<string, Set<string>>();

  // Seed causal links
  if (plan.seed_registry) {
    for (const seed of plan.seed_registry) {
      if (!graph.has(seed.planted_in)) {
        graph.set(seed.planted_in, new Set());
      }
      graph.get(seed.planted_in)!.add(seed.blooms_in);
    }
  }

  // Sequential links within arcs
  for (const arc of plan.arcs) {
    for (let i = 0; i < arc.scenes.length - 1; i++) {
      const current = arc.scenes[i].scene_id;
      const next = arc.scenes[i + 1].scene_id;

      if (!graph.has(current)) {
        graph.set(current, new Set());
      }
      graph.get(current)!.add(next);
    }
  }

  // If no links, return 0
  if (graph.size === 0) return 0;

  // Find longest path using DFS
  function dfs(node: string, visited: Set<string>): number {
    visited.add(node);

    let maxDepth = 0;
    const neighbors = graph.get(node);

    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const depth = dfs(neighbor, new Set(visited));
          if (depth > maxDepth) maxDepth = depth;
        }
      }
    }

    return maxDepth + 1;
  }

  let longestPath = 0;
  const allNodes = new Set<string>(graph.keys());

  for (const node of allNodes) {
    const pathLength = dfs(node, new Set());
    if (pathLength > longestPath) longestPath = pathLength;
  }

  return Math.min(longestPath / allScenes.length, 1.0);
}

/**
 * S8 — structural_entropy (weight: 0.12)
 * Shannon entropy of conflict type distribution
 */
export function structuralEntropy(plan: GenesisPlan): number {
  const conflictCounts = new Map<string, number>();

  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      if (scene.conflict_type) {
        const type = scene.conflict_type.toLowerCase();
        conflictCounts.set(type, (conflictCounts.get(type) || 0) + 1);
      }
    }
  }

  if (conflictCounts.size === 0) return 0;

  const totalScenes = Array.from(conflictCounts.values()).reduce((a, b) => a + b, 0);
  const validTypes = 5; // internal, external, relational, societal, existential

  if (totalScenes === 0) return 0;
  if (conflictCounts.size === 1) return 0;

  // Shannon entropy
  let entropy = 0;

  for (const count of conflictCounts.values()) {
    const p = count / totalScenes;
    entropy += -p * Math.log2(p);
  }

  // Normalize by max entropy
  const maxEntropy = Math.log2(validTypes);
  return entropy / maxEntropy;
}

/**
 * Compute all structural metrics
 */
export function computeStructuralMetrics(plan: GenesisPlan, config: MetricConfig): Record<string, number> {
  return {
    arc_completeness: arcCompleteness(plan),
    scene_completeness: sceneCompleteness(plan),
    beat_coverage: beatCoverage(plan, config),
    seed_integrity: seedIntegrity(plan, config),
    tension_monotonicity: tensionMonotonicity(plan, config),
    conflict_diversity: conflictDiversity(plan, config),
    causal_depth: causalDepth(plan),
    structural_entropy: structuralEntropy(plan),
  };
}
