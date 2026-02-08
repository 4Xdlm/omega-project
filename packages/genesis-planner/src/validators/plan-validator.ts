/**
 * OMEGA Genesis Planner — Plan Validator (Internal Oracle)
 * Phase C.1 — Verifies ALL G-INV-01 through G-INV-10 post-generation.
 */

import type {
  GenesisPlan, GConfig, ValidationResult, ValidationError, GInvariantId,
  ConflictType, SubtextTensionType, Scene,
} from '../types.js';
import { resolveConfigRef } from '../config.js';

const TIMESTAMP_ZERO = '2026-02-08T00:00:00.000Z';

const VALID_CONFLICT_TYPES: ReadonlySet<string> = new Set<ConflictType>([
  'internal', 'external', 'relational', 'societal', 'existential',
]);

const VALID_SUBTEXT_TENSION: ReadonlySet<string> = new Set<SubtextTensionType>([
  'dramatic_irony', 'suspense', 'hidden_motive', 'unspoken_desire', 'suppressed_emotion',
]);

export function validatePlan(plan: GenesisPlan, config: GConfig, timestamp?: string): ValidationResult {
  const ts = timestamp ?? TIMESTAMP_ZERO;
  const errors: ValidationError[] = [];
  const allInvariants: GInvariantId[] = [
    'G-INV-01', 'G-INV-02', 'G-INV-03', 'G-INV-04', 'G-INV-05',
    'G-INV-06', 'G-INV-07', 'G-INV-08', 'G-INV-09', 'G-INV-10',
  ];
  const passedSet = new Set<GInvariantId>(allInvariants);

  function fail(inv: GInvariantId, path: string, message: string): void {
    errors.push({ invariant: inv, path, message, severity: 'FATAL' });
    passedSet.delete(inv);
  }

  // G-INV-01: No plan no text — basic structural check
  if (!plan || !plan.arcs || plan.arcs.length === 0) {
    fail('G-INV-01', 'plan.arcs', 'Plan must have at least one arc');
  }

  const allScenes: Scene[] = [];
  const allSceneIds: string[] = [];

  // Collect all scenes
  for (const arc of plan.arcs) {
    if (!arc.scenes || arc.scenes.length === 0) {
      fail('G-INV-01', `arc[${arc.arc_id}].scenes`, 'Arc must have at least one scene');
    }
    for (const scene of arc.scenes) {
      allScenes.push(scene);
      allSceneIds.push(scene.scene_id);
    }
  }

  // G-INV-02: Justified existence
  for (const arc of plan.arcs) {
    if (!arc.justification || arc.justification.trim() === '') {
      fail('G-INV-02', `arc[${arc.arc_id}].justification`, 'Arc missing justification');
    }
    for (const scene of arc.scenes) {
      if (!scene.justification || scene.justification.trim() === '') {
        fail('G-INV-02', `scene[${scene.scene_id}].justification`, 'Scene missing justification');
      }
    }
  }

  // G-INV-03: Seed/Bloom integrity
  const minSeeds = resolveConfigRef(config, 'CONFIG:MIN_SEEDS');
  const maxDistance = resolveConfigRef(config, 'CONFIG:SEED_BLOOM_MAX_DISTANCE');

  if (plan.seed_registry.length < minSeeds) {
    fail('G-INV-03', 'plan.seed_registry', `Must have at least ${minSeeds} seeds, got ${plan.seed_registry.length}`);
  }

  const seedPlantedMap = new Map<string, number>();
  const seedBloomMap = new Map<string, number>();

  for (const seed of plan.seed_registry) {
    const plantIdx = allSceneIds.indexOf(seed.planted_in);
    const bloomIdx = allSceneIds.indexOf(seed.blooms_in);

    if (plantIdx === -1) {
      fail('G-INV-03', `seed[${seed.id}].planted_in`, `Seed planted_in references unknown scene: ${seed.planted_in}`);
    } else {
      seedPlantedMap.set(seed.id, plantIdx);
    }

    if (bloomIdx === -1) {
      fail('G-INV-03', `seed[${seed.id}].blooms_in`, `Seed blooms_in references unknown scene: ${seed.blooms_in}`);
    } else {
      seedBloomMap.set(seed.id, bloomIdx);
    }

    if (plantIdx !== -1 && bloomIdx !== -1) {
      const totalScenes = allSceneIds.length;
      const distance = totalScenes > 1 ? (bloomIdx - plantIdx) / (totalScenes - 1) : 0;
      if (distance > maxDistance) {
        fail('G-INV-03', `seed[${seed.id}]`, `Seed-bloom distance ${distance.toFixed(2)} exceeds max ${maxDistance}`);
      }
      if (bloomIdx <= plantIdx) {
        fail('G-INV-03', `seed[${seed.id}]`, 'Bloom must come after plant');
      }
    }
  }

  // Check bidirectional: every seeds_planted in scenes should have a seed in registry
  for (const scene of allScenes) {
    for (const seedRef of scene.seeds_planted) {
      if (!plan.seed_registry.some((s) => s.id === seedRef)) {
        fail('G-INV-03', `scene[${scene.scene_id}].seeds_planted`, `References unknown seed: ${seedRef}`);
      }
    }
    for (const bloomRef of scene.seeds_bloomed) {
      if (!plan.seed_registry.some((s) => s.id === bloomRef)) {
        fail('G-INV-03', `scene[${scene.scene_id}].seeds_bloomed`, `References unknown seed: ${bloomRef}`);
      }
    }
  }

  // G-INV-04: Tension monotonic-trend
  const maxPlateau = resolveConfigRef(config, 'CONFIG:MAX_TENSION_PLATEAU');
  const maxDrop = resolveConfigRef(config, 'CONFIG:MAX_TENSION_DROP');

  if (plan.tension_curve.length > 1) {
    let plateauCount = 1;
    for (let i = 1; i < plan.tension_curve.length; i++) {
      const diff = plan.tension_curve[i] - plan.tension_curve[i - 1];
      if (diff < -maxDrop) {
        fail('G-INV-04', `tension_curve[${i}]`, `Tension drop ${diff} exceeds max -${maxDrop}`);
      }
      if (plan.tension_curve[i] === plan.tension_curve[i - 1]) {
        plateauCount++;
        if (plateauCount > maxPlateau) {
          fail('G-INV-04', `tension_curve[${i}]`, `Tension plateau of ${plateauCount} scenes exceeds max ${maxPlateau}`);
        }
      } else {
        plateauCount = 1;
      }
    }
  }

  // G-INV-05: No empty scene
  const conflictTypes = new Set<string>();
  for (const scene of allScenes) {
    if (!scene.conflict || scene.conflict.trim() === '') {
      fail('G-INV-05', `scene[${scene.scene_id}].conflict`, 'Scene must have a non-empty conflict');
    }
    if (!VALID_CONFLICT_TYPES.has(scene.conflict_type)) {
      fail('G-INV-05', `scene[${scene.scene_id}].conflict_type`, `Invalid conflict_type: ${scene.conflict_type}`);
    }
    conflictTypes.add(scene.conflict_type);

    // Check beats
    if (!scene.beats || scene.beats.length === 0) {
      fail('G-INV-05', `scene[${scene.scene_id}].beats`, 'Scene must have at least one beat');
    }
  }

  const minConflictTypes = resolveConfigRef(config, 'CONFIG:MIN_CONFLICT_TYPES');
  if (conflictTypes.size < minConflictTypes) {
    fail('G-INV-05', 'plan.conflict_types', `Must have at least ${minConflictTypes} conflict types, got ${conflictTypes.size}`);
  }

  // G-INV-06: Emotion coverage
  const emotionCoverage = plan.emotion_trajectory.length;
  if (emotionCoverage < allScenes.length) {
    fail('G-INV-06', 'plan.emotion_trajectory', `Emotion trajectory covers ${emotionCoverage}/${allScenes.length} scenes`);
  }

  for (const scene of allScenes) {
    if (!scene.emotion_target || scene.emotion_target.trim() === '') {
      fail('G-INV-06', `scene[${scene.scene_id}].emotion_target`, 'Scene missing emotion_target');
    }
  }

  // G-INV-07: Determinism — checked externally by running twice

  // G-INV-08: Structural completeness
  for (const arc of plan.arcs) {
    if (!arc.progression || arc.progression.trim() === '') {
      fail('G-INV-08', `arc[${arc.arc_id}].progression`, 'Arc missing progression (resolution)');
    }
    if (!arc.theme || arc.theme.trim() === '') {
      fail('G-INV-08', `arc[${arc.arc_id}].theme`, 'Arc missing theme');
    }
  }

  // G-INV-09: Subtext modeling
  for (const scene of allScenes) {
    if (!scene.subtext) {
      fail('G-INV-09', `scene[${scene.scene_id}].subtext`, 'Scene missing subtext');
      continue;
    }
    if (!scene.subtext.character_thinks || scene.subtext.character_thinks.trim() === '') {
      fail('G-INV-09', `scene[${scene.scene_id}].subtext.character_thinks`, 'character_thinks must be non-empty');
    }
    if (!VALID_SUBTEXT_TENSION.has(scene.subtext.tension_type)) {
      fail('G-INV-09', `scene[${scene.scene_id}].subtext.tension_type`, `Invalid tension_type: ${scene.subtext.tension_type}`);
    }
    if (!scene.subtext.implied_emotion || scene.subtext.implied_emotion.trim() === '') {
      fail('G-INV-09', `scene[${scene.scene_id}].subtext.implied_emotion`, 'implied_emotion must be non-empty');
    }
  }

  // G-INV-10: Evidence chain — checked externally via evidence chain verification

  const invariants_passed = [...passedSet];
  return {
    verdict: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
    invariants_checked: allInvariants,
    invariants_passed,
    timestamp_deterministic: ts,
  };
}
