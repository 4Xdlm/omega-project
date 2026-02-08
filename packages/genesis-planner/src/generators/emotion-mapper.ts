/**
 * OMEGA Genesis Planner — Emotion Mapper
 * Phase C.1 — G-INV-06: 100% emotion coverage.
 */

import type { Scene, EmotionTarget, EmotionWaypoint, GConfig, GVerdict } from '../types.js';
import { resolveConfigRef } from '../config.js';

export function mapEmotions(
  scenes: readonly Scene[],
  emotionTarget: EmotionTarget,
): readonly EmotionWaypoint[] {
  const trajectory: EmotionWaypoint[] = [];
  const wps = emotionTarget.waypoints;

  for (let i = 0; i < scenes.length; i++) {
    const position = scenes.length > 1 ? i / (scenes.length - 1) : 0.5;

    let emotion = emotionTarget.arc_emotion;
    let intensity = 0.5;

    if (wps.length >= 2) {
      if (position <= wps[0].position) {
        emotion = wps[0].emotion;
        intensity = wps[0].intensity;
      } else if (position >= wps[wps.length - 1].position) {
        emotion = wps[wps.length - 1].emotion;
        intensity = wps[wps.length - 1].intensity;
      } else {
        for (let w = 0; w < wps.length - 1; w++) {
          if (position >= wps[w].position && position <= wps[w + 1].position) {
            const range = wps[w + 1].position - wps[w].position;
            const t = range > 0 ? (position - wps[w].position) / range : 0;
            const closerIdx = t < 0.5 ? w : w + 1;
            emotion = wps[closerIdx].emotion;
            intensity = wps[w].intensity + t * (wps[w + 1].intensity - wps[w].intensity);
            break;
          }
        }
      }
    }

    trajectory.push({
      position: Math.round(position * 1000) / 1000,
      emotion,
      intensity: Math.round(intensity * 100) / 100,
    });
  }

  return trajectory;
}

export function validateEmotionCoverage(
  trajectory: readonly EmotionWaypoint[],
  sceneCount: number,
  config: GConfig,
): { verdict: GVerdict; coveragePercent: number } {
  const threshold = resolveConfigRef(config, 'CONFIG:EMOTION_COVERAGE_THRESHOLD');
  const coveragePercent = sceneCount > 0 ? trajectory.length / sceneCount : 0;

  return {
    verdict: coveragePercent >= threshold ? 'PASS' : 'FAIL',
    coveragePercent: Math.round(coveragePercent * 100) / 100,
  };
}
