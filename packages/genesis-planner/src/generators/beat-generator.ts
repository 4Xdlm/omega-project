/**
 * OMEGA Genesis Planner — Beat Generator
 * Phase C.1 — Generates deterministic beats per scene.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { Scene, Beat, GConfig } from '../types.js';
import { resolveConfigRef } from '../config.js';

function deterministicBeatCount(sceneSeed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < sceneSeed.length; i++) {
    hash = ((hash << 5) - hash + sceneSeed.charCodeAt(i)) | 0;
  }
  const range = max - min + 1;
  return min + (Math.abs(hash) % range);
}

export function generateBeats(scene: Scene, sceneIndex: number, config: GConfig): readonly Beat[] {
  const minBeats = resolveConfigRef(config, 'CONFIG:MIN_BEATS_PER_SCENE');
  const maxBeats = resolveConfigRef(config, 'CONFIG:MAX_BEATS_PER_SCENE');

  const sceneSeed = sha256(canonicalize({ scene_id: scene.scene_id, sceneIndex }));
  const beatCount = deterministicBeatCount(sceneSeed, minBeats, maxBeats);

  const beats: Beat[] = [];

  for (let i = 0; i < beatCount; i++) {
    const beatHash = sha256(canonicalize({ scene_id: scene.scene_id, beat_index: i }));
    const beatId = `BEAT-${scene.scene_id}-${String(i + 1).padStart(3, '0')}`;

    const isLast = i === beatCount - 1;
    const isFirst = i === 0;
    const hasPivot = beatCount >= 4;
    const pivotIndex = Math.floor(beatCount * 0.6);
    const isPivot = hasPivot && i === pivotIndex;

    let tensionDelta: -1 | 0 | 1;
    if (isFirst) {
      tensionDelta = 0;
    } else if (isLast && beatCount > 2) {
      tensionDelta = 1;
    } else if (isPivot) {
      tensionDelta = 1;
    } else {
      const mod = Math.abs(beatHash.charCodeAt(0)) % 3;
      tensionDelta = mod === 0 ? 0 : mod === 1 ? 1 : -1;
    }

    const actions = [
      `Establish ${scene.conflict_type} conflict context`,
      `Escalate tension through ${scene.conflict_type} confrontation`,
      `Character responds to ${scene.conflict_type} pressure`,
      `Revelation shifts understanding of ${scene.objective}`,
      `Consequence of ${scene.conflict_type} conflict manifests`,
      `Internal reaction to ${scene.conflict_type} situation`,
      `Pivot toward resolution of scene objective`,
      `Climactic beat: ${scene.conflict_type} conflict peaks`,
    ];

    const intentions = [
      'Establish stakes and context for the reader',
      'Raise tension through escalating action',
      'Show character response to pressure',
      'Reveal new information that changes dynamics',
      'Demonstrate consequences of prior actions',
      'Deepen character through internal reaction',
      'Shift narrative toward scene resolution',
      'Deliver peak emotional impact',
    ];

    const actionIdx = i % actions.length;

    beats.push({
      beat_id: beatId,
      action: actions[actionIdx],
      intention: intentions[actionIdx],
      pivot: isPivot,
      tension_delta: tensionDelta,
      information_revealed: i === 0 || isPivot ? [`Key info for ${scene.scene_id} beat ${i + 1}`] : [],
      information_withheld: isLast || isPivot ? [`Withheld from ${scene.scene_id} beat ${i + 1}`] : [],
    });
  }

  return beats;
}
