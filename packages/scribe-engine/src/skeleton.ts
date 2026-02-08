/**
 * OMEGA Scribe Engine -- Skeleton Builder
 * Phase C.2 -- S1: Segments -> SkeletonDoc
 * Pure structure, zero style, zero prose.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { GenesisPlan } from '@omega/genesis-planner';
import type { Segment, SkeletonDoc } from './types.js';

export function buildSkeleton(segments: readonly Segment[], plan: GenesisPlan): SkeletonDoc {
  // Extract ordered scene IDs from plan (preserving arc->scene order)
  const sceneOrder: string[] = [];
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      if (!sceneOrder.includes(scene.scene_id)) {
        sceneOrder.push(scene.scene_id);
      }
    }
  }

  const skeletonWithoutHash = {
    plan_id: plan.plan_id,
    plan_hash: plan.plan_hash,
    segments,
    segment_count: segments.length,
    scene_order: sceneOrder,
  };

  const skeletonHash = sha256(canonicalize(skeletonWithoutHash));
  const skeletonId = `SKEL-${skeletonHash.slice(0, 16)}`;

  return {
    skeleton_id: skeletonId,
    skeleton_hash: skeletonHash,
    plan_id: plan.plan_id,
    plan_hash: plan.plan_hash,
    segments,
    segment_count: segments.length,
    scene_order: sceneOrder,
  };
}
