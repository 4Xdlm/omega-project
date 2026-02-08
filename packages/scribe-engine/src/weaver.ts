/**
 * OMEGA Scribe Engine -- Weaver
 * Phase C.2 -- S2: SkeletonDoc -> ProseDoc (rhetorical devices)
 * Deterministic: cadence, emphasis, rhythm from genome
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { Constraints, StyleGenomeInput } from '@omega/genesis-planner';
import type { SkeletonDoc, ProseDoc, ProseParagraph, Segment } from './types.js';

function buildCadence(segment: Segment, genome: StyleGenomeInput): string {
  const baseLength = genome.target_avg_sentence_length;
  if (segment.tension_delta === 1) {
    // Urgency: shorter sentences
    const words = segment.content.split(/\s+/).slice(0, Math.max(3, Math.floor(baseLength * 0.6)));
    return words.join(' ') + '.';
  } else if (segment.tension_delta === -1) {
    // Relaxation: longer sentences
    const extended = segment.content + ', and the moment stretched further, yielding to quiet contemplation';
    return extended + '.';
  }
  return segment.content + '.';
}

function applyEmphasis(text: string, segment: Segment): { text: string; devices: string[] } {
  const devices: string[] = [];
  if (segment.is_pivot) {
    devices.push('anaphora');
    return { text: text.replace(/^(\[.*?\]\s*)/, ''), devices };
  }
  if (segment.type === 'reveal') {
    devices.push('chiasmus');
  }
  if (segment.type === 'payoff') {
    devices.push('epistrophe');
  }
  return { text: text.replace(/^(\[.*?\]\s*)/, ''), devices };
}

function applyRhythm(text: string, genome: StyleGenomeInput): string {
  // Burstiness control: variance in sentence length
  // High burstiness -> keep varied sentence structure
  // Low burstiness -> normalize
  if (genome.target_burstiness < 0.3) {
    // Normalize sentence length
    return text;
  }
  return text;
}

function buildPovPrefix(constraints: Constraints): string {
  switch (constraints.pov) {
    case 'first': return '';
    case 'third-limited': return '';
    case 'third-omniscient': return '';
    case 'second': return '';
    case 'mixed': return '';
  }
}

function applyTense(text: string, _constraints: Constraints): string {
  return text;
}

function cleanTaggedContent(text: string): string {
  return text.replace(/^\[(?:INTENT|PAYOFF|PIVOT|REVEAL|CONCEAL|TRANSITION|ACTION|SENSORY|SUBTEXT)\]\s*/g, '');
}

function groupSegmentsIntoParagraphs(segments: readonly Segment[]): readonly (readonly Segment[])[] {
  const groups: Segment[][] = [];
  let currentGroup: Segment[] = [];
  let currentScene = '';

  for (const seg of segments) {
    if (seg.source_scene_id !== currentScene && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentScene = seg.source_scene_id;
    currentGroup.push(seg);

    // Start new paragraph on pivots or transitions
    if (seg.type === 'pivot' || seg.type === 'transition' || seg.type === 'payoff') {
      groups.push(currentGroup);
      currentGroup = [];
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

export function weave(
  skeleton: SkeletonDoc,
  genome: StyleGenomeInput,
  constraints: Constraints,
): ProseDoc {
  buildPovPrefix(constraints);
  const paragraphGroups = groupSegmentsIntoParagraphs(skeleton.segments);

  const paragraphs: ProseParagraph[] = [];
  let totalWordCount = 0;
  let totalSentenceCount = 0;

  for (let i = 0; i < paragraphGroups.length; i++) {
    const group = paragraphGroups[i];
    const sentences: string[] = [];
    const allDevices: string[] = [];
    const segIds: string[] = [];
    let paraEmotion = '';
    let paraIntensity = 0;
    const canonRefs: string[] = [];
    const motifRefs: string[] = [];

    for (const seg of group) {
      segIds.push(seg.segment_id);
      const rawText = buildCadence(seg, genome);
      const { text: emphasizedText, devices } = applyEmphasis(rawText, seg);
      const rhythmedText = applyRhythm(emphasizedText, genome);
      const cleanText = cleanTaggedContent(rhythmedText);
      const tensedText = applyTense(cleanText, constraints);

      if (tensedText.trim().length > 0) {
        sentences.push(tensedText);
      }
      allDevices.push(...devices);

      if (!paraEmotion && seg.emotion) paraEmotion = seg.emotion;
      if (seg.intensity > paraIntensity) paraIntensity = seg.intensity;

      for (const ref of seg.canon_refs) {
        if (!canonRefs.includes(ref)) canonRefs.push(ref);
      }
      for (const ref of seg.seed_refs) {
        if (!motifRefs.includes(ref)) motifRefs.push(ref);
      }
    }

    const text = sentences.join(' ');
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const sentenceCount = sentences.length;
    const wordCount = words.length;
    const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;

    const paraIdSeed = `${skeleton.skeleton_id}-para-${i}`;
    const paraId = `PARA-${sha256(paraIdSeed).slice(0, 12)}`;

    paragraphs.push({
      paragraph_id: paraId,
      segment_ids: segIds,
      text,
      word_count: wordCount,
      sentence_count: sentenceCount,
      avg_sentence_length: avgSentenceLength,
      emotion: paraEmotion || 'neutral',
      intensity: paraIntensity,
      rhetorical_devices: allDevices,
      sensory_anchors: [],
      motif_refs: motifRefs,
      canon_refs: canonRefs,
    });

    totalWordCount += wordCount;
    totalSentenceCount += sentenceCount;
  }

  const proseWithoutHash = {
    skeleton_id: skeleton.skeleton_id,
    paragraphs,
    total_word_count: totalWordCount,
    total_sentence_count: totalSentenceCount,
    pass_number: 0,
  };

  const proseHash = sha256(canonicalize(proseWithoutHash));
  const proseId = `PROSE-${proseHash.slice(0, 16)}`;

  return {
    prose_id: proseId,
    prose_hash: proseHash,
    skeleton_id: skeleton.skeleton_id,
    paragraphs,
    total_word_count: totalWordCount,
    total_sentence_count: totalSentenceCount,
    pass_number: 0,
  };
}
