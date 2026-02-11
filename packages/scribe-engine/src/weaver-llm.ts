/**
 * OMEGA Scribe Engine — LLM Weaver
 * Phase P.2-SCRIBE — Generates publication-quality prose via LLM
 * Extracts ALL information from plan (beats, subtext, info architecture)
 * Uses master prompt for maximum literary quality
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { GenesisPlan, Constraints, StyleGenomeInput, EmotionTarget, Scene, Beat } from '@omega/genesis-planner';
import type { SkeletonDoc, ProseDoc, ProseParagraph } from './types.js';
import type { ScribeProvider } from './providers/types.js';
import { buildMasterScenePrompt } from './providers/master-prompt.js';

/**
 * Find a scene in the plan by ID
 */
function findScene(plan: GenesisPlan, sceneId: string): { scene: Scene; arcTheme: string } | null {
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      if (scene.scene_id === sceneId) {
        return { scene, arcTheme: arc.theme };
      }
    }
  }
  return null;
}

/**
 * Get all scenes in order
 */
function getAllScenesOrdered(plan: GenesisPlan): Array<{ scene: Scene; arcTheme: string }> {
  const result: Array<{ scene: Scene; arcTheme: string }> = [];
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      result.push({ scene, arcTheme: arc.theme });
    }
  }
  return result;
}

/**
 * Extract intent metadata from plan (stored in plan fields)
 */
function extractIntentMetadata(intent: Record<string, unknown>): {
  title: string;
  premise: string;
  message: string;
  coreEmotion: string;
  canonEntries: Array<{ id: string; statement: string }>;
} {
  const intentBlock = (intent as any).intent ?? {};
  const canonBlock = (intent as any).canon ?? {};

  return {
    title: intentBlock.title ?? 'Untitled',
    premise: intentBlock.premise ?? '',
    message: intentBlock.message ?? '',
    coreEmotion: intentBlock.core_emotion ?? 'neutral',
    canonEntries: (canonBlock.entries ?? []).map((e: any) => ({
      id: e.id ?? '',
      statement: e.statement ?? '',
    })),
  };
}

/**
 * Split LLM prose text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  // Double newlines = paragraph break
  const byDouble = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  if (byDouble.length > 1) return byDouble;
  // Fallback: single newlines for dense text
  return text.split(/\n/).map(p => p.trim()).filter(p => p.length > 0);
}

function countSentences(text: string): number {
  const matches = text.match(/[.!?]+(?:\s|$)/g);
  return matches ? matches.length : (text.length > 0 ? 1 : 0);
}

/**
 * Weave prose using LLM provider with FULL information extraction
 */
export function weaveLLM(
  skeleton: SkeletonDoc,
  plan: GenesisPlan,
  constraints: Constraints,
  genome: StyleGenomeInput,
  emotion: EmotionTarget,
  provider: ScribeProvider,
  seed: string,
  intent?: Record<string, unknown>,
): ProseDoc {
  const sceneIds = skeleton.scene_order;
  const allParagraphs: ProseParagraph[] = [];
  let totalWordCount = 0;
  let totalSentenceCount = 0;
  let previousSummary = '';
  let paraIndex = 0;

  // Extract intent metadata
  const meta = intent ? extractIntentMetadata(intent) : {
    title: 'Untitled',
    premise: '',
    message: '',
    coreEmotion: 'neutral',
    canonEntries: [],
  };

  // Get all scenes in order for next-scene hints
  const allScenes = getAllScenesOrdered(plan);

  for (let i = 0; i < sceneIds.length; i++) {
    const sceneId = sceneIds[i];
    const found = findScene(plan, sceneId);
    if (!found) {
      console.warn(`  [warn] Scene ${sceneId} not found in plan, skipping`);
      continue;
    }

    const { scene, arcTheme } = found;

    // Build beat data with FULL information architecture
    const beats = scene.beats.map((beat: Beat) => ({
      action: beat.action,
      type: beat.pivot ? 'pivot' : 'action',
      isPivot: beat.pivot,
      tensionDelta: beat.tension_delta,
      subtextSlot: (scene.subtext as any)?.character_thinks ?? '__none__',
      informationRevealed: beat.information_revealed ?? [],
      informationWithheld: beat.information_withheld ?? [],
    }));

    // Build subtext layer
    const subtext = {
      characterThinks: (scene.subtext as any)?.character_thinks ?? '',
      impliedEmotion: (scene.subtext as any)?.implied_emotion ?? '',
      readerKnows: (scene.subtext as any)?.reader_knows ?? '',
      tensionType: (scene.subtext as any)?.tension_type ?? '',
    };

    // Next scene hint (for forward planting)
    let nextSceneHint = '';
    if (i < sceneIds.length - 1) {
      const nextFound = findScene(plan, sceneIds[i + 1]);
      if (nextFound) {
        nextSceneHint = `${nextFound.scene.objective} (${nextFound.scene.conflict_type} conflict)`;
      }
    }

    // Build the MASTER prompt
    const prompt = buildMasterScenePrompt({
      sceneId,
      arcTheme,
      sceneObjective: scene.objective,
      sceneConflict: scene.conflict,
      conflictType: scene.conflict_type,
      emotionTarget: scene.emotion_target,
      emotionIntensity: scene.emotion_intensity,
      sensoryAnchor: scene.sensory_anchor,
      targetWordCount: scene.target_word_count,
      beats,
      subtext,
      pov: constraints.pov ?? 'third-limited',
      tense: constraints.tense ?? 'past',
      avgSentenceLength: genome.target_avg_sentence_length ?? 15,
      burstiness: genome.target_burstiness ?? 0.7,
      lexicalRichness: genome.target_lexical_richness ?? 0.8,
      descriptionDensity: genome.target_description_density ?? 0.6,
      dialogueRatio: genome.target_dialogue_ratio ?? 0.1,
      signatureTraits: genome.signature_traits ?? [],
      bannedWords: constraints.banned_words ?? [],
      forbiddenCliches: (constraints as any).forbidden_cliches ?? [],
      canonEntries: meta.canonEntries,
      previousSceneSummary: previousSummary,
      nextSceneHint,
      isFirstScene: i === 0,
      isLastScene: i === sceneIds.length - 1,
      storyTitle: meta.title,
      storyPremise: meta.premise,
      storyMessage: meta.message,
      coreEmotion: meta.coreEmotion,
      sceneIndex: i,
      totalScenes: sceneIds.length,
    });

    // Call provider
    const response = provider.generateSceneProse(prompt, {
      sceneId,
      arcId: scene.arc_id,
      skeletonHash: skeleton.skeleton_hash,
      seed,
    });

    // Split into paragraphs
    const proseTexts = splitIntoParagraphs(response.prose);

    // Get segments for this scene (for cross-referencing)
    const sceneSegments = skeleton.segments.filter(s => s.source_scene_id === sceneId);
    const sceneSegIds = sceneSegments.map(s => s.segment_id);
    const sceneCanonRefs = [...new Set(sceneSegments.flatMap(s => [...s.canon_refs]))];
    const sceneSeedRefs = [...new Set(sceneSegments.flatMap(s => [...s.seed_refs]))];
    const sceneEmotion = scene.emotion_target;
    const sceneIntensity = scene.emotion_intensity;

    for (const text of proseTexts) {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const sentenceCount = countSentences(text);
      const wordCount = words.length;

      const paraIdSeed = `${skeleton.skeleton_id}-llm-para-${paraIndex}`;
      const paraId = `PARA-${sha256(paraIdSeed).slice(0, 12)}`;

      allParagraphs.push({
        paragraph_id: paraId,
        segment_ids: sceneSegIds,
        text,
        word_count: wordCount,
        sentence_count: sentenceCount,
        avg_sentence_length: sentenceCount > 0 ? wordCount / sentenceCount : 0,
        emotion: sceneEmotion,
        intensity: sceneIntensity,
        rhetorical_devices: [],
        sensory_anchors: [scene.sensory_anchor],
        motif_refs: sceneSeedRefs,
        canon_refs: sceneCanonRefs,
      });

      totalWordCount += wordCount;
      totalSentenceCount += sentenceCount;
      paraIndex++;
    }

    // Build summary for next scene continuity (last 2 sentences)
    const lastPara = proseTexts[proseTexts.length - 1] ?? '';
    const lastSentences = lastPara.split(/[.!?]+/).filter(s => s.trim().length > 0);
    previousSummary = lastSentences.slice(-2).join('. ').trim();
    if (previousSummary && !previousSummary.endsWith('.')) previousSummary += '.';
  }

  const proseWithoutHash = {
    skeleton_id: skeleton.skeleton_id,
    paragraphs: allParagraphs,
    total_word_count: totalWordCount,
    total_sentence_count: totalSentenceCount,
    pass_number: 0,
  };

  const proseHash = sha256(canonicalize(proseWithoutHash));
  const proseId = `PROSE-LLM-${proseHash.slice(0, 16)}`;

  return {
    prose_id: proseId,
    prose_hash: proseHash,
    skeleton_id: skeleton.skeleton_id,
    paragraphs: allParagraphs,
    total_word_count: totalWordCount,
    total_sentence_count: totalSentenceCount,
    pass_number: 0,
  };
}
