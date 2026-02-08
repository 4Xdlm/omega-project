/**
 * OMEGA Scribe Engine -- Segmenter
 * Phase C.2 -- GenesisPlan -> atomic Segment[]
 * Deterministic: same plan -> same segments -> same IDs
 */

import { sha256 } from '@omega/canon-kernel';
import type { GenesisPlan, Scene, Beat } from '@omega/genesis-planner';
import type { Segment, SegmentType } from './types.js';

function deriveSegmentType(
  beat: Beat,
  beatIndex: number,
  totalBeatsInScene: number,
  isFirstScene: boolean,
  isLastBeatOfLastSceneInArc: boolean,
): SegmentType {
  if (beatIndex === 0 && isFirstScene) {
    return 'intent';
  }
  if (isLastBeatOfLastSceneInArc) {
    return 'payoff';
  }
  if (beat.pivot) {
    return 'pivot';
  }
  if (beat.information_revealed.length > 0) {
    return 'reveal';
  }
  if (beat.information_withheld.length > 0) {
    return 'conceal';
  }
  if (beatIndex === totalBeatsInScene - 1) {
    return 'transition';
  }
  return 'action';
}

function buildSegmentContent(beat: Beat, scene: Scene, segType: SegmentType): string {
  switch (segType) {
    case 'intent':
      return `[INTENT] ${scene.objective} — ${beat.action}`;
    case 'payoff':
      return `[PAYOFF] ${beat.action} — ${beat.intention}`;
    case 'pivot':
      return `[PIVOT] ${beat.action} — intention: ${beat.intention}`;
    case 'reveal':
      return `[REVEAL] ${beat.action} — reveals: ${beat.information_revealed.join(', ')}`;
    case 'conceal':
      return `[CONCEAL] ${beat.action} — withholds: ${beat.information_withheld.join(', ')}`;
    case 'transition':
      return `[TRANSITION] ${beat.action}`;
    case 'sensory':
      return `[SENSORY] ${scene.sensory_anchor}`;
    case 'subtext':
      return `[SUBTEXT] ${scene.subtext.character_thinks}`;
    default:
      return `[ACTION] ${beat.action} — ${beat.intention}`;
  }
}

function getCanonRefs(scene: Scene, beat: Beat): readonly string[] {
  const refs: string[] = [];
  for (const constraint of scene.constraints) {
    if (constraint.startsWith('CANON-') || constraint.startsWith('C-CANON-')) {
      refs.push(constraint);
    }
  }
  for (const revealed of beat.information_revealed) {
    const match = revealed.match(/(?:CANON-\d+|C-CANON-\d+)/);
    if (match) refs.push(match[0]);
  }
  return refs;
}

function getSeedRefs(scene: Scene, beat: Beat): readonly string[] {
  const refs: string[] = [];
  if (beat.pivot) {
    for (const seedId of scene.seeds_bloomed) {
      refs.push(seedId);
    }
  }
  for (const seedId of scene.seeds_planted) {
    if (!refs.includes(seedId)) refs.push(seedId);
  }
  return refs;
}

export function segmentPlan(plan: GenesisPlan): readonly Segment[] {
  if (!plan.arcs || plan.arcs.length === 0) {
    return [];
  }

  const segments: Segment[] = [];
  let globalSegIndex = 0;

  for (let arcIdx = 0; arcIdx < plan.arcs.length; arcIdx++) {
    const arc = plan.arcs[arcIdx];
    for (let sceneIdx = 0; sceneIdx < arc.scenes.length; sceneIdx++) {
      const scene = arc.scenes[sceneIdx];
      const isFirstScene = sceneIdx === 0;
      const isLastScene = sceneIdx === arc.scenes.length - 1;

      for (let beatIdx = 0; beatIdx < scene.beats.length; beatIdx++) {
        const beat = scene.beats[beatIdx];
        const isLastBeatOfLastSceneInArc = isLastScene && beatIdx === scene.beats.length - 1;

        const segType = deriveSegmentType(
          beat, beatIdx, scene.beats.length,
          isFirstScene, isLastBeatOfLastSceneInArc,
        );

        const segIdSeed = `${plan.plan_id}-${arc.arc_id}-${scene.scene_id}-${beat.beat_id}-${globalSegIndex}`;
        const segId = `SEG-${sha256(segIdSeed).slice(0, 12)}`;

        const segment: Segment = {
          segment_id: segId,
          type: segType,
          source_beat_id: beat.beat_id,
          source_scene_id: scene.scene_id,
          source_arc_id: arc.arc_id,
          content: buildSegmentContent(beat, scene, segType),
          role: `${segType} segment for beat ${beat.beat_id} in scene ${scene.scene_id}`,
          canon_refs: getCanonRefs(scene, beat),
          seed_refs: getSeedRefs(scene, beat),
          emotion: scene.emotion_target,
          intensity: scene.emotion_intensity,
          tension_delta: beat.tension_delta,
          is_pivot: beat.pivot,
          subtext_slot: scene.subtext.character_thinks,
        };

        segments.push(segment);
        globalSegIndex++;
      }

      // Add transition segment between scenes (not after last scene in arc)
      if (!isLastScene) {
        const transId = `SEG-T-${sha256(`${plan.plan_id}-trans-${arc.arc_id}-${scene.scene_id}-${globalSegIndex}`).slice(0, 12)}`;
        const nextScene = arc.scenes[sceneIdx + 1];
        segments.push({
          segment_id: transId,
          type: 'transition',
          source_beat_id: scene.beats[scene.beats.length - 1].beat_id,
          source_scene_id: scene.scene_id,
          source_arc_id: arc.arc_id,
          content: `[TRANSITION] From ${scene.scene_id} to ${nextScene.scene_id}`,
          role: `transition from scene ${scene.scene_id} to ${nextScene.scene_id}`,
          canon_refs: [],
          seed_refs: [],
          emotion: scene.emotion_target,
          intensity: scene.emotion_intensity,
          tension_delta: 0,
          is_pivot: false,
          subtext_slot: '',
        });
        globalSegIndex++;
      }
    }
  }

  return segments;
}
