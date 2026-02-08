/**
 * OMEGA Scribe Engine -- Discomfort Gate
 * Every scene must contain >= 1 friction point (conflict, tension, unresolved subtext)
 */

import type { GenesisPlan } from '@omega/genesis-planner';
import type { ProseDoc, GateResult, GateViolation, SConfig } from '../types.js';

export function runDiscomfortGate(
  prose: ProseDoc,
  plan: GenesisPlan,
  config: SConfig,
  timestamp: string,
): GateResult {
  const violations: GateViolation[] = [];
  const minFriction = config.DISCOMFORT_MIN_FRICTION.value as number;

  // Group paragraphs by scene
  const sceneParaMap = new Map<string, typeof prose.paragraphs[number][]>();

  // Build scene map from plan
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      // Initialize scene entry
      if (!sceneParaMap.has(scene.scene_id)) {
        sceneParaMap.set(scene.scene_id, []);
      }
    }
  }

  // For each paragraph, find its scene via plan structure
  for (const para of prose.paragraphs) {
    // Find scene through segment references
    let sceneId = '';
    for (const arc of plan.arcs) {
      for (const scene of arc.scenes) {
        for (const _beat of scene.beats) {
          if (para.segment_ids.some((sid) => sid.length > 0)) {
            sceneId = scene.scene_id;
            break;
          }
        }
        if (sceneId) break;
      }
      if (sceneId) break;
    }

    if (sceneId) {
      const existing = sceneParaMap.get(sceneId) ?? [];
      existing.push(para);
      sceneParaMap.set(sceneId, existing);
    }
  }

  // Check each scene has friction
  let scenesChecked = 0;
  let scenesWithFriction = 0;

  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      scenesChecked++;
      let frictionCount = 0;

      // Count friction from conflict (always at least 1 if conflict is non-empty)
      if (scene.conflict && scene.conflict.length > 0) {
        frictionCount++;
      }

      // Count friction from subtext (unresolved tension)
      if (scene.subtext && scene.subtext.tension_type) {
        frictionCount++;
      }

      // Count friction from tension_delta in beats
      for (const beat of scene.beats) {
        if (beat.tension_delta === 1) {
          frictionCount++;
        }
      }

      if (frictionCount >= minFriction) {
        scenesWithFriction++;
      } else {
        violations.push({
          gate_id: 'DISCOMFORT_GATE',
          invariant: 'S-INV-06' as 'S-INV-06',
          paragraph_id: 'GLOBAL',
          message: `Scene ${scene.scene_id} has ${frictionCount} friction points, needs ${minFriction}`,
          severity: 'ERROR',
          details: `conflict: "${scene.conflict.slice(0, 50)}"`,
        });
      }
    }
  }

  const verdict = violations.length === 0 ? 'PASS' : 'FAIL';

  return {
    gate_id: 'DISCOMFORT_GATE',
    verdict,
    violations,
    metrics: {
      scenes_checked: scenesChecked,
      scenes_with_friction: scenesWithFriction,
      min_friction_required: minFriction,
    },
    timestamp_deterministic: timestamp,
  };
}
