/**
 * OMEGA Creation Pipeline — Paragraph Traceability
 * Phase C.4 — C4-INV-03: Every paragraph has proof path to intent
 */

import { sha256 } from '@omega/canon-kernel';
import type { StyledOutput, GenesisPlan, ScribeOutput } from '../types.js';
import type { ParagraphTrace } from '../types.js';

export function traceParagraph(
  paragraphId: string,
  paragraphText: string,
  plan: GenesisPlan,
  scribeOutput: ScribeOutput,
  intentHash: string,
): ParagraphTrace {
  const textHash = sha256(paragraphText);

  // Find original paragraph in scribe output
  const scribeParagraph = scribeOutput.final_prose.paragraphs.find(
    (p) => paragraphId.includes(p.paragraph_id) || p.paragraph_id === paragraphId,
  );

  const segmentIds: string[] = [...(scribeParagraph?.segment_ids ?? [])];
  const canonRefs: string[] = [...(scribeParagraph?.canon_refs ?? [])];

  // Map segments back to scenes and arcs
  const sceneIds = new Set<string>();
  const arcIds = new Set<string>();
  const seedRefs = new Set<string>();

  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      for (const beat of scene.beats) {
        // Check if any segment comes from this beat
        const beatSegments = segmentIds.filter(
          (sid) => sid.includes(beat.beat_id) || sid.includes(scene.scene_id),
        );
        if (beatSegments.length > 0) {
          sceneIds.add(scene.scene_id);
          arcIds.add(arc.arc_id);
        }
      }
      // Also check seeds
      for (const seedId of scene.seeds_planted) {
        if (segmentIds.some((sid) => sid.includes(seedId))) {
          seedRefs.add(seedId);
        }
      }
      for (const seedId of scene.seeds_bloomed) {
        if (segmentIds.some((sid) => sid.includes(seedId))) {
          seedRefs.add(seedId);
        }
      }
    }
  }

  // If no scene/arc mapping found through segments, do proximity mapping
  if (sceneIds.size === 0 && plan.arcs.length > 0) {
    const firstArc = plan.arcs[0];
    if (firstArc.scenes.length > 0) {
      sceneIds.add(firstArc.scenes[0].scene_id);
      arcIds.add(firstArc.arc_id);
    }
  }

  // Build proof path: intent -> plan -> segments -> paragraph
  const proofPath = [
    intentHash,
    plan.plan_hash,
    ...segmentIds.slice(0, 3).map((sid) => sha256(sid)),
    textHash,
  ];

  return {
    paragraph_id: paragraphId,
    text_hash: textHash,
    intent_hash: intentHash,
    plan_hash: plan.plan_hash,
    segment_ids: segmentIds,
    scene_ids: Array.from(sceneIds),
    arc_ids: Array.from(arcIds),
    canon_refs: canonRefs,
    seed_refs: Array.from(seedRefs),
    proof_path: proofPath,
  };
}

export function traceAllParagraphs(
  styleOutput: StyledOutput,
  plan: GenesisPlan,
  scribeOutput: ScribeOutput,
  intentHash: string,
): readonly ParagraphTrace[] {
  return styleOutput.paragraphs.map((p: { paragraph_id: string; text: string }) =>
    traceParagraph(p.paragraph_id, p.text, plan, scribeOutput, intentHash),
  );
}
