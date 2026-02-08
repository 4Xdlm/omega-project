/**
 * OMEGA Creation Pipeline — Unified Discomfort Gate
 * Phase C.4 — Minimum friction per scene
 */

import type {
  StyledOutput, GenesisPlan, IntentPack, C4Config,
  UnifiedGateResult, UnifiedGateViolation,
} from '../types.js';

const FRICTION_MARKERS: readonly string[] = [
  'but', 'however', 'yet', 'despite', 'although', 'though',
  'conflict', 'tension', 'struggle', 'resist', 'refuse',
  'against', 'oppose', 'challenge', 'threat', 'risk',
  'question', 'doubt', 'uncertain', 'hesitat', 'reluct',
  'fear', 'anger', 'pain', 'loss', 'dark',
  'clash', 'dilemma', 'crisis', 'danger', 'trap',
];

export function runUnifiedDiscomfortGate(
  styleOutput: StyledOutput,
  plan: GenesisPlan,
  _input: IntentPack,
  _config: C4Config,
  timestamp: string,
): UnifiedGateResult {
  const violations: UnifiedGateViolation[] = [];

  // Check friction per scene by dividing text into segments
  const sceneCount = plan.arcs.reduce((sum, arc) => sum + arc.scenes.length, 0);
  const paragraphsPerScene = sceneCount > 0
    ? Math.max(1, Math.floor(styleOutput.paragraphs.length / sceneCount))
    : styleOutput.paragraphs.length;

  let scenesWithFriction = 0;
  let totalScenes = 0;

  for (let i = 0; i < styleOutput.paragraphs.length; i += paragraphsPerScene) {
    totalScenes++;
    const sceneParagraphs = styleOutput.paragraphs.slice(i, i + paragraphsPerScene);
    const sceneText = sceneParagraphs.map((p: { text: string }) => p.text).join(' ').toLowerCase();

    let frictionFound = false;
    for (const marker of FRICTION_MARKERS) {
      if (sceneText.includes(marker)) {
        frictionFound = true;
        break;
      }
    }

    if (frictionFound) {
      scenesWithFriction++;
    } else {
      violations.push({
        gate_id: 'U_DISCOMFORT',
        invariant: 'C4-INV-06',
        location: `scene-segment-${totalScenes}`,
        message: `No friction markers found in scene segment ${totalScenes}`,
        severity: 'ERROR',
        source_phase: 'C4',
      });
    }
  }

  const frictionRatio = totalScenes > 0 ? scenesWithFriction / totalScenes : 1;

  // Require at least 50% of scenes to have friction markers
  const passed = frictionRatio >= 0.5;

  return {
    gate_id: 'U_DISCOMFORT',
    verdict: passed ? 'PASS' : 'FAIL',
    violations,
    metrics: {
      total_scenes: totalScenes,
      scenes_with_friction: scenesWithFriction,
      friction_ratio: frictionRatio,
    },
    timestamp_deterministic: timestamp,
  };
}
