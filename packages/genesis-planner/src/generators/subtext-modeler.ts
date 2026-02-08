/**
 * OMEGA Genesis Planner — Subtext Modeler
 * Phase C.1 — G-INV-09: every scene models what is NOT said.
 */

import type { Scene, Canon, SubtextLayer, SubtextTensionType, GVerdict } from '../types.js';

const TENSION_TYPES: readonly SubtextTensionType[] = [
  'dramatic_irony', 'suspense', 'hidden_motive', 'unspoken_desire', 'suppressed_emotion',
];

function deriveTensionType(conflictType: string, sceneIndex: number): SubtextTensionType {
  const mapping: Record<string, SubtextTensionType> = {
    internal: 'suppressed_emotion',
    external: 'suspense',
    relational: 'unspoken_desire',
    societal: 'dramatic_irony',
    existential: 'hidden_motive',
  };
  return mapping[conflictType] ?? TENSION_TYPES[sceneIndex % TENSION_TYPES.length];
}

export function modelSubtext(
  scenes: readonly Scene[],
  canon: Canon,
): readonly Scene[] {
  return scenes.map((scene, idx) => {
    const tensionType = deriveTensionType(scene.conflict_type, idx);

    const canonRef = canon.entries.length > 0
      ? canon.entries[idx % canon.entries.length]
      : null;

    const subtext: SubtextLayer = {
      character_thinks: `Internal struggle with ${scene.conflict_type} conflict: ${scene.conflict}`,
      reader_knows: canonRef
        ? `Reader awareness of: ${canonRef.statement}`
        : `Reader sees ${scene.conflict_type} tension building`,
      tension_type: tensionType,
      implied_emotion: `Suppressed ${scene.emotion_target} beneath ${scene.conflict_type} surface`,
    };

    return { ...scene, subtext };
  });
}

export function validateSubtext(
  scenes: readonly Scene[],
): { verdict: GVerdict; coverage: number; missing: readonly string[] } {
  const missing: string[] = [];

  for (const scene of scenes) {
    if (!scene.subtext) {
      missing.push(scene.scene_id);
      continue;
    }
    if (!scene.subtext.character_thinks || scene.subtext.character_thinks.trim() === '' || scene.subtext.character_thinks === '__pending__') {
      missing.push(scene.scene_id);
      continue;
    }
    if (!scene.subtext.implied_emotion || scene.subtext.implied_emotion.trim() === '' || scene.subtext.implied_emotion === '__pending__') {
      missing.push(scene.scene_id);
      continue;
    }
    if (!TENSION_TYPES.includes(scene.subtext.tension_type)) {
      missing.push(scene.scene_id);
    }
  }

  const coverage = scenes.length > 0 ? (scenes.length - missing.length) / scenes.length : 0;

  return {
    verdict: missing.length === 0 ? 'PASS' : 'FAIL',
    coverage: Math.round(coverage * 100) / 100,
    missing,
  };
}
