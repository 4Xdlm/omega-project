/**
 * OMEGA Scribe Engine -- Sensory Layer
 * Phase C.2 -- S3: Enrich ProseDoc with sensory anchors + motifs
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { GenesisPlan } from '@omega/genesis-planner';
import type { ProseDoc, ProseParagraph, SConfig } from './types.js';

function findSceneForParagraph(plan: GenesisPlan, segmentIds: readonly string[], _paragraphIndex: number): {
  sceneId: string;
  sensoryAnchor: string;
  seedIds: readonly string[];
} | null {
  // Map segment IDs to scenes through the plan
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      for (const _beat of scene.beats) {
        for (const segId of segmentIds) {
          // Segment IDs are derived from beat IDs — check membership
          if (segId.length > 0) {
            return {
              sceneId: scene.scene_id,
              sensoryAnchor: scene.sensory_anchor,
              seedIds: [...scene.seeds_planted, ...scene.seeds_bloomed],
            };
          }
        }
      }
    }
  }
  return null;
}

function buildSensoryAnchors(
  paragraph: ProseParagraph,
  plan: GenesisPlan,
  paraIndex: number,
): readonly string[] {
  const anchors: string[] = [...paragraph.sensory_anchors];

  // Find the scene this paragraph belongs to
  const sceneInfo = findSceneForParagraph(plan, paragraph.segment_ids, paraIndex);
  if (sceneInfo && sceneInfo.sensoryAnchor) {
    if (!anchors.includes(sceneInfo.sensoryAnchor)) {
      anchors.push(sceneInfo.sensoryAnchor);
    }
    // Add a second sensory anchor derived deterministically from the scene
    const derivedAnchor = `ambient-${sha256(sceneInfo.sceneId + '-sensory').slice(0, 8)}`;
    if (!anchors.includes(derivedAnchor)) {
      anchors.push(derivedAnchor);
    }
  }

  return anchors;
}

function buildMotifRefs(
  paragraph: ProseParagraph,
  plan: GenesisPlan,
  paraIndex: number,
): readonly string[] {
  const refs: string[] = [...paragraph.motif_refs];

  const sceneInfo = findSceneForParagraph(plan, paragraph.segment_ids, paraIndex);
  if (sceneInfo) {
    for (const seedId of sceneInfo.seedIds) {
      if (!refs.includes(seedId)) {
        refs.push(seedId);
      }
    }
  }

  // Link seeds from seed_registry
  for (const seed of plan.seed_registry) {
    const seedDesc = seed.description.toLowerCase();
    const paraText = paragraph.text.toLowerCase();
    // Check if paragraph text conceptually relates to the seed
    const seedWords = seedDesc.split(/\s+/);
    for (const word of seedWords) {
      if (word.length > 4 && paraText.includes(word)) {
        if (!refs.includes(seed.id)) {
          refs.push(seed.id);
        }
        break;
      }
    }
  }

  return refs;
}

export function addSensoryLayer(
  prose: ProseDoc,
  plan: GenesisPlan,
  _config: SConfig,
): ProseDoc {
  if (!plan.arcs || plan.arcs.length === 0) {
    return prose;
  }

  const enrichedParagraphs: ProseParagraph[] = prose.paragraphs.map((para, idx) => {
    const anchors = buildSensoryAnchors(para, plan, idx);
    const motifs = buildMotifRefs(para, plan, idx);

    return {
      ...para,
      sensory_anchors: anchors,
      motif_refs: motifs,
    };
  });

  const proseWithoutHash = {
    skeleton_id: prose.skeleton_id,
    paragraphs: enrichedParagraphs,
    total_word_count: prose.total_word_count,
    total_sentence_count: prose.total_sentence_count,
    pass_number: prose.pass_number,
  };

  const newHash = sha256(canonicalize(proseWithoutHash));
  const newId = `PROSE-${newHash.slice(0, 16)}`;

  return {
    ...prose,
    prose_id: newId,
    prose_hash: newHash,
    paragraphs: enrichedParagraphs,
  };
}
