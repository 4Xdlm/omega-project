/**
 * OMEGA Style Emergence Engine -- Density Analyzer
 * Phase C.3 -- Content density ratios
 */

import type { ProseParagraph } from '../types.js';
import type { DensityProfile } from '../types.js';

function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function countDialogueWords(text: string): number {
  const matches = text.match(/"[^"]*"/g) || [];
  let total = 0;
  for (const m of matches) {
    total += wordCount(m);
  }
  return total;
}

export function analyzeDensity(paragraphs: readonly ProseParagraph[]): DensityProfile {
  if (paragraphs.length === 0) {
    return {
      description_density: 0,
      dialogue_ratio: 0,
      sensory_density: 0,
      action_density: 0,
      introspection_density: 0,
    };
  }

  let totalWords = 0;
  let totalDialogueWords = 0;
  let totalSensoryAnchors = 0;
  let descriptionParagraphs = 0;
  let actionParagraphs = 0;
  let introspectionParagraphs = 0;

  for (const para of paragraphs) {
    const wc = wordCount(para.text);
    totalWords += wc;
    totalDialogueWords += countDialogueWords(para.text);
    totalSensoryAnchors += para.sensory_anchors.length;

    if (para.sensory_anchors.length > 0) {
      descriptionParagraphs++;
    }

    const hasAction = para.rhetorical_devices.some((d) =>
      d === 'action' || d === 'movement' || d === 'tension',
    );
    if (hasAction || para.emotion === 'anger' || para.emotion === 'fear') {
      actionParagraphs++;
    }

    const hasIntrospection = para.rhetorical_devices.some((d) =>
      d === 'introspection' || d === 'reflection' || d === 'internal',
    );
    if (hasIntrospection || para.emotion === 'sadness' || para.emotion === 'trust') {
      introspectionParagraphs++;
    }
  }

  return {
    description_density: descriptionParagraphs / paragraphs.length,
    dialogue_ratio: totalWords > 0 ? totalDialogueWords / totalWords : 0,
    sensory_density: totalSensoryAnchors / paragraphs.length,
    action_density: actionParagraphs / paragraphs.length,
    introspection_density: introspectionParagraphs / paragraphs.length,
  };
}
