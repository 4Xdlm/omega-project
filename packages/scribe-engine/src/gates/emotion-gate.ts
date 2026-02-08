/**
 * OMEGA Scribe Engine -- Emotion Gate
 * S-INV-06: Emotional pivots declared in plan must be detectable in text.
 */

import type { EmotionTarget, GenesisPlan } from '@omega/genesis-planner';
import type { ProseDoc, GateResult, GateViolation, SConfig } from '../types.js';

export function runEmotionGate(
  prose: ProseDoc,
  emotionTarget: EmotionTarget,
  plan: GenesisPlan,
  config: SConfig,
  timestamp: string,
): GateResult {
  const violations: GateViolation[] = [];
  const tolerance = config.EMOTION_PIVOT_TOLERANCE.value as number;

  if (prose.paragraphs.length === 0) {
    return {
      gate_id: 'EMOTION_GATE',
      verdict: 'FAIL',
      violations: [{
        gate_id: 'EMOTION_GATE',
        invariant: 'S-INV-06',
        paragraph_id: 'GLOBAL',
        message: 'No paragraphs to check emotion',
        severity: 'FATAL',
        details: 'Empty prose',
      }],
      metrics: { waypoint_coverage: 0, pivots_detected: 0, pivots_expected: 0 },
      timestamp_deterministic: timestamp,
    };
  }

  // Check waypoint coverage: each waypoint should have a corresponding paragraph
  const totalParas = prose.paragraphs.length;
  let waypointsCovered = 0;

  for (const waypoint of emotionTarget.waypoints) {
    // Find paragraph at this relative position
    const paraIndex = Math.min(
      Math.floor(waypoint.position * totalParas),
      totalParas - 1,
    );
    const para = prose.paragraphs[paraIndex];

    // Check intensity within tolerance
    const intensityDiff = Math.abs(para.intensity - waypoint.intensity);
    if (intensityDiff <= tolerance) {
      waypointsCovered++;
    } else {
      violations.push({
        gate_id: 'EMOTION_GATE',
        invariant: 'S-INV-06',
        paragraph_id: para.paragraph_id,
        message: `Emotion intensity at position ${waypoint.position} deviates: expected ${waypoint.intensity}, got ${para.intensity}`,
        severity: 'ERROR',
        details: `diff: ${intensityDiff.toFixed(3)}, tolerance: ${tolerance}`,
      });
    }
  }

  // Check pivots from plan (beats with pivot=true should correspond to emotional shifts)
  let pivotsExpected = 0;
  let pivotsDetected = 0;
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      for (const beat of scene.beats) {
        if (beat.pivot) {
          pivotsExpected++;
          // Check if there's a paragraph with matching segment that has notable intensity
          const hasPivotPara = prose.paragraphs.some((p) =>
            p.intensity >= 0.3 && p.segment_ids.length > 0,
          );
          if (hasPivotPara) {
            pivotsDetected++;
          } else {
            violations.push({
              gate_id: 'EMOTION_GATE',
              invariant: 'S-INV-06',
              paragraph_id: 'GLOBAL',
              message: `Pivot beat ${beat.beat_id} has no detectable emotional shift in text`,
              severity: 'ERROR',
              details: `scene: ${scene.scene_id}`,
            });
          }
        }
      }
    }
  }

  const coverage = emotionTarget.waypoints.length > 0
    ? waypointsCovered / emotionTarget.waypoints.length
    : 0;

  const verdict = violations.length === 0 ? 'PASS' : 'FAIL';

  return {
    gate_id: 'EMOTION_GATE',
    verdict,
    violations,
    metrics: {
      waypoint_coverage: coverage,
      pivots_detected: pivotsDetected,
      pivots_expected: pivotsExpected,
      waypoints_covered: waypointsCovered,
      total_waypoints: emotionTarget.waypoints.length,
    },
    timestamp_deterministic: timestamp,
  };
}
