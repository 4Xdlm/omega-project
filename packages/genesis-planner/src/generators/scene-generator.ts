/**
 * OMEGA Genesis Planner — Scene Generator
 * Phase C.1 — Generates deterministic scenes per arc.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  Arc, Canon, Constraints, EmotionTarget, Scene,
  ConflictType, SubtextLayer,
} from '../types.js';

const CONFLICT_TYPES: readonly ConflictType[] = ['internal', 'external', 'relational', 'societal', 'existential'];

const EMPTY_SUBTEXT: SubtextLayer = {
  character_thinks: '__pending__',
  reader_knows: '__pending__',
  tension_type: 'suspense',
  implied_emotion: '__pending__',
};

function deterministicIndex(seed: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % max;
}

function interpolateEmotion(
  emotionTarget: EmotionTarget,
  position: number,
): { emotion: string; intensity: number } {
  const wps = emotionTarget.waypoints;
  if (wps.length === 0) return { emotion: emotionTarget.arc_emotion, intensity: 0.5 };

  if (position <= wps[0].position) return { emotion: wps[0].emotion, intensity: wps[0].intensity };
  if (position >= wps[wps.length - 1].position) return { emotion: wps[wps.length - 1].emotion, intensity: wps[wps.length - 1].intensity };

  for (let i = 0; i < wps.length - 1; i++) {
    if (position >= wps[i].position && position <= wps[i + 1].position) {
      const range = wps[i + 1].position - wps[i].position;
      const t = range > 0 ? (position - wps[i].position) / range : 0;
      const closerIdx = t < 0.5 ? i : i + 1;
      const intensity = wps[i].intensity + t * (wps[i + 1].intensity - wps[i].intensity);
      return { emotion: wps[closerIdx].emotion, intensity };
    }
  }

  return { emotion: wps[wps.length - 1].emotion, intensity: wps[wps.length - 1].intensity };
}

export function generateScenes(
  arc: Arc,
  arcIndex: number,
  totalArcs: number,
  canon: Canon,
  constraints: Constraints,
  emotionTarget: EmotionTarget,
): readonly Scene[] {
  const arcSeed = sha256(canonicalize({ arc_id: arc.arc_id, arcIndex, totalArcs }));
  const totalScenesRange = constraints.max_scenes - constraints.min_scenes + 1;
  const totalScenes = constraints.min_scenes + deterministicIndex(arcSeed, totalScenesRange);
  const scenesPerArc = Math.max(1, Math.floor(totalScenes / totalArcs));
  const extraScenes = arcIndex < (totalScenes % totalArcs) ? 1 : 0;
  const sceneCount = scenesPerArc + extraScenes;

  const scenes: Scene[] = [];

  for (let i = 0; i < sceneCount; i++) {
    const sceneHash = sha256(canonicalize({ arc_id: arc.arc_id, scene_index: i }));
    const sceneId = `SCN-${String(arcIndex + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}-${sceneHash.slice(0, 6)}`;

    const globalPosition = totalArcs > 1
      ? (arcIndex + (i / Math.max(1, sceneCount - 1))) / totalArcs
      : sceneCount > 1
        ? i / (sceneCount - 1)
        : 0.5;
    const clampedPosition = Math.min(1, Math.max(0, globalPosition));

    const emo = interpolateEmotion(emotionTarget, clampedPosition);
    const conflictIdx = deterministicIndex(sceneHash, CONFLICT_TYPES.length);
    const conflictType = CONFLICT_TYPES[conflictIdx];

    const canonRef = canon.entries.length > 0
      ? canon.entries[deterministicIndex(sceneHash + 'canon', canon.entries.length)]
      : null;

    const conflictDescriptions: Record<ConflictType, string> = {
      internal: `Character faces inner conflict about ${arc.theme}`,
      external: `Character confronts external obstacle related to ${arc.theme}`,
      relational: `Interpersonal tension arises from ${arc.theme}`,
      societal: `Societal pressure challenges character regarding ${arc.theme}`,
      existential: `Existential crisis forces reckoning with ${arc.theme}`,
    };

    const wordBudget = Math.max(100, Math.round(5000 / Math.max(1, sceneCount)));

    scenes.push({
      scene_id: sceneId,
      arc_id: arc.arc_id,
      objective: `Advance ${arc.theme} — stage ${i + 1}/${sceneCount}`,
      conflict: conflictDescriptions[conflictType],
      conflict_type: conflictType,
      emotion_target: emo.emotion,
      emotion_intensity: Math.round(emo.intensity * 100) / 100,
      seeds_planted: [],
      seeds_bloomed: [],
      subtext: EMPTY_SUBTEXT,
      sensory_anchor: canonRef ? `Anchored to: ${canonRef.statement}` : `Sensory anchor for ${arc.theme} scene ${i + 1}`,
      constraints: constraints.banned_words.length > 0 ? [`Banned words: ${constraints.banned_words.join(', ')}`] : [],
      beats: [],
      target_word_count: wordBudget,
      justification: `Scene ${i + 1} of arc "${arc.theme}": ${conflictType} conflict advances narrative toward ${emotionTarget.resolution_emotion}`,
    });
  }

  return scenes;
}
